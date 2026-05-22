# TraceFix

Autonomous root-cause investigation engineer built on [gitclaw](https://github.com/open-gitagent/gitagent).
Given a stack trace + GitHub repo, it bisects history, validates hypotheses, and opens a minimal-patch PR.

## Structure

- `agent/` — gitclaw agent (SOUL.md, RULES.md, 9 custom tools + shell scripts, memory/)
- `runner/` — Node.js bridge: gitclaw `query()` SDK → NDJSON stdout
- `backend/` — FastAPI: sessions, WebSocket streaming, escalation handler
- `frontend/` — Next.js 15: landing page + 3-panel live investigation view

## Running

```bash
# One-time setup
cp .env.example .env          # add ANTHROPIC_API_KEY
cd runner && npm install && cd ..
cd backend && pip install -r requirements.txt && cd ..
cd frontend && npm install && cd ..
chmod +x agent/tools/scripts/*.sh agent/hooks/post_tool_use.sh

# Start
cd backend && uvicorn main:app --reload --port 8000   # terminal 1
cd frontend && npm run dev                            # terminal 2
```

Open http://localhost:3000

## Key Files

| File | Purpose |
|---|---|
| `agent/agent.yaml` | gitclaw spec: model, tools list |
| `agent/RULES.md` | investigation rules (memory-first, confidence threshold, blast radius gate) |
| `agent/memory/past_investigations.md` | persistent memory — appended after every session |
| `agent/tools/scripts/*.sh` | shell implementations of all 9 investigation tools |
| `runner/index.ts` | SDK bridge — streams gitclaw events as NDJSON |
| `backend/stream_parser.py` | maps gitclaw events → typed frontend events |
| `backend/escalation_handler.py` | asyncio.Event pause/resume for human review |
| `frontend/hooks/useAgentStream.ts` | WebSocket → typed AgentEvent state |

## Conventions

- Tool scripts: read JSON from stdin, write JSON to stdout
- Backend runs from `backend/` dir (bare module imports); start with `uvicorn main:app`
- Agent memory format: `## Session <id> — <date>` blocks in `past_investigations.md`
- gitclaw model string: `"provider:model-id"` (e.g. `"anthropic:claude-sonnet-4-6"`)
- Never commit `.env`; keep `.env.example` updated
- Escalation threshold: confidence < 70 triggers `request_human_review`
- Patch minimality limit: ≤5 files, ≤20 lines — enforced in `generate_minimal_patch.sh`
