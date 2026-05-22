import asyncio
import json
import os
import uuid
from pathlib import Path

from session_manager import session_manager
from escalation_handler import escalation_handler
from stream_parser import parse_event

RUNNER_DIR = Path(__file__).parent.parent / "runner"


def build_investigation_prompt(repo_url: str, error_text: str, github_token: str) -> str:
    return f"""You are investigating a bug report. Here is the full context:

GitHub Repository: {repo_url}
GitHub Token: {github_token}

Error / Stack Trace:
{error_text}

Begin the investigation now. Follow RULES.md exactly:
1. Start with recall_past_investigations
2. Then trace_dependency_chain
3. Clone the repo to /tmp/tracefix-{{}}
4. Form a written hypothesis with confidence score
5. Run investigate_regression
6. Run analyze_commit_intelligence on the first bad commit
7. Run validate_root_cause — if confidence < 70, call request_human_review
8. Run estimate_blast_radius
9. Run generate_minimal_patch
10. Run analyze_regression_risk
11. Create a GitHub PR using the cli tool with the patch and full investigation report
12. Update memory/past_investigations.md with what you learned
"""


async def run_agent(
    session_id: str,
    repo_url: str,
    error_text: str,
    github_token: str,
) -> None:
    prompt = build_investigation_prompt(repo_url, error_text, github_token)
    env = {
        **os.environ,
        "TRACEFIX_PROMPT": prompt,
        "TRACEFIX_SESSION_ID": session_id,
        "GITHUB_TOKEN": github_token,
        "TRACEFIX_BACKEND_URL": os.environ.get("TRACEFIX_BACKEND_URL", "http://localhost:8000"),
    }

    session_manager.update(session_id, status="running")

    try:
        proc = await asyncio.create_subprocess_exec(
            "npx", "tsx", "index.ts",
            cwd=str(RUNNER_DIR),
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            limit=10 * 1024 * 1024,  # 10 MB buffer (default 64 KB is too small)
        )

        stderr_lines = []

        # Read stdout (NDJSON events) and stderr (PROGRESS lines) concurrently
        async def read_stdout():
            assert proc.stdout
            async for raw_line in proc.stdout:
                line = raw_line.decode().strip()
                if not line:
                    continue

                # Check if this is an escalation result from request_human_review
                if '"request_human_review"' in line or '"escalation"' in line:
                    event = parse_event(line)
                    if event and event.get("type") == "escalation":
                        # Register escalation and broadcast to frontend
                        escalation_handler.register(session_id, event)
                        await session_manager.broadcast(session_id, event)
                        continue

                event = parse_event(line)
                if event:
                    await session_manager.broadcast(session_id, event)
                    if event.get("type") == "complete":
                        session_manager.update(session_id, status="complete")

        async def read_stderr():
            assert proc.stderr
            async for raw_line in proc.stderr:
                line = raw_line.decode().strip()
                if line.startswith("PROGRESS:"):
                    try:
                        payload = json.loads(line[len("PROGRESS:"):])
                        event = {"type": "step", **payload}
                        await session_manager.broadcast(session_id, event)
                    except Exception:
                        pass
                else:
                    # Capture non-PROGRESS stderr for error reporting
                    stderr_lines.append(line)

        await asyncio.gather(read_stdout(), read_stderr())
        await proc.wait()

        if proc.returncode != 0:
            session_manager.update(session_id, status="error")
            # Include last few stderr lines in error message for diagnostics
            detail = "\n".join(stderr_lines[-20:]) if stderr_lines else "(no stderr captured)"
            await session_manager.broadcast(
                session_id, {
                    "type": "error",
                    "message": f"Agent exited with code {proc.returncode}",
                    "detail": detail,
                }
            )
        else:
            session_manager.update(session_id, status="complete")

    except Exception as e:
        session_manager.update(session_id, status="error")
        await session_manager.broadcast(session_id, {"type": "error", "message": str(e)})
