import asyncio
import json
import os
import uuid
from pathlib import Path

from session_manager import session_manager
from escalation_handler import escalation_handler
from stream_parser import parse_event

RUNNER_DIR = Path(__file__).parent.parent / "runner"

TOOL_TO_STEP = {
    "triage_classifier":           ("triage",                 "Classifying error type..."),
    "recall_past_investigations":  ("memory_recall",          "Searching past investigations..."),
    "trace_dependency_chain":      ("dependency_chain",       "Tracing dependency chain..."),
    "validate_root_cause":         ("hypothesis_validation",  "Validating root-cause hypothesis..."),
    "analyze_commit_intelligence": ("commit_intelligence",    "Analyzing commit intelligence..."),
    "estimate_blast_radius":       ("blast_radius",           "Estimating blast radius..."),
    "generate_minimal_patch":      ("patch_ready",            "Generating minimal patch..."),
    "analyze_regression_risk":     ("regression_risk",        "Analyzing regression risk..."),
}


def build_investigation_prompt(repo_url: str, error_text: str, github_token: str) -> str:
    return f"""You are investigating a bug report in a Git repository.

CRITICAL: Your investigation MUST follow this exact sequence:

PHASE 1: ERROR CLASSIFICATION (MANDATORY - DO THIS FIRST)
==============================================================
Call triage_classifier with:
  - error_text: the full error message
  - stack_trace: the full stack trace from the error

The triage_classifier will return:
  - is_regression: boolean (true = regression in git history, false = configuration/null/setup error)
  - category: one of (regression, null_dereference_construction, configuration_error, ambiguous)
  - confidence: 0-100
  - reason: explanation of the classification

CRITICAL: You MUST call triage_classifier before doing anything else.
Then inspect the result and proceed to PHASE 2 or PHASE 3 based on the is_regression flag.


PHASE 2: NON-REGRESSION INVESTIGATION (if triage_classifier.is_regression == false)
====================================================================================
This error is NOT a regression from a recent commit. Instead:
1. Analyze the call site where the error occurs
2. Consider: null dereference at construction? Missing config? Missing environment variable?
3. Create a diagnosis using the triage_classifier result
4. Call request_human_review with your diagnosis (no bisecting needed)
5. Stop - do not call analyze_commit_intelligence or generate_minimal_patch for non-regressions


PHASE 3: REGRESSION INVESTIGATION (if triage_classifier.is_regression == true)
================================================================================
This is a regression from a commit. Proceed with:
1. Recall past investigations — search memory for similar errors
2. Trace dependency chain to identify candidate culprits
3. Clone the repo to /tmp/tracefix-{{}} for analysis
4. Form a written hypothesis with confidence score
5. Run investigate_regression to bisect and find the first bad commit
6. Run analyze_commit_intelligence on that commit
7. Run validate_root_cause — if confidence < 70, call request_human_review
8. Run estimate_blast_radius to assess impact
9. Run generate_minimal_patch with the fix
10. Run analyze_regression_risk before creating PR
11. Create a GitHub PR with the patch and investigation report
12. Update memory/past_investigations.md with what you learned


STARTING CONDITIONS:
====================
GitHub Repository: {repo_url}
GitHub Token: {github_token}

Error / Stack Trace:
{error_text}


NOW: Call triage_classifier immediately with the error_text and stack_trace above.
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
                    # Emit a step event when a tool_call is received
                    if event.get("type") == "tool_call":
                        tool_name = event.get("tool", "")
                        if tool_name in TOOL_TO_STEP:
                            step_name, summary = TOOL_TO_STEP[tool_name]
                            await session_manager.broadcast(session_id, {
                                "type": "step",
                                "step": step_name,
                                "summary": summary,
                            })

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
            await session_manager.broadcast(session_id, {"type": "complete"})

    except Exception as e:
        session_manager.update(session_id, status="error")
        await session_manager.broadcast(session_id, {"type": "error", "message": str(e)})
