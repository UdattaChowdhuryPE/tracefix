# TraceFix

An autonomous root-cause investigation engineer for software regressions. Given a stack trace and a GitHub repository, TraceFix bisects git history, validates root causes with confidence scoring, escalates to humans when uncertain, generates a minimal surgical patch, and opens a PR with a complete investigation report — all streaming live to a 3-panel web UI. Built with gitclaw, FastAPI, and Next.js.

## Features

- **Autonomous git bisect**: Traces stack frames through the codebase, discovers the introducing commit without manual navigation
- **Confidence-gated escalation**: Scores confidence in root causes; pauses for human review if below 70% threshold
- **Minimal patches**: Generates surgical fixes touching only ≤5 files and ≤20 lines directly implicated by the root cause
- **Live streaming**: Investigation progress streams over WebSocket in real-time; 3-panel UI shows triage, hypothesis, and patch side-by-side
- **Persistent memory**: Records every investigation in `agent/memory/past_investigations.md`; recalls similar cases before starting new bisects
- **Human-in-the-loop escalation**: Pauses investigation at low-confidence gates; frontend can approve, reject, or guide the agent toward a different hypothesis

## Setup

### Prerequisites

- Node.js 18+
- Python 3.12+
- `uv` package manager (`pip install uv` or `brew install uv`)
- `ANTHROPIC_API_KEY` environment variable set

### Install Dependencies

```bash
# Agent runner dependencies
cd runner && npm install && cd ..

# Backend dependencies
cd backend && uv sync && cd ..

# Frontend dependencies
cd frontend && npm install && cd ..
```

### Configure Environment

```bash
# Copy the example environment file and add your API key
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-...
```

### Run Locally

```bash
# Terminal 1: Backend (port 8000)
cd backend && uv run uvicorn main:app --reload --port 8000

# Terminal 2: Frontend (port 3000)
cd frontend && npm run dev

# Make agent scripts executable (one-time)
chmod +x agent/tools/scripts/*.sh agent/hooks/post_tool_use.sh
```

Open http://localhost:3000 in your browser.

## Architecture

### Agent

The gitclaw agent orchestrates the investigation. It defines 10 custom tools (backed by shell scripts) plus 4 built-in tools (`cli`, `read`, `write`, `memory`) for a total of 14 tools. Configuration lives in `agent/agent.yaml` — behavior rules in `agent/RULES.md` — persistent memory appended to `agent/memory/past_investigations.md` after each session. Active runtime memory is maintained in `agent/memory/MEMORY.md`.

Key files:
- **`agent/agent.yaml`** — model config (`anthropic:claude-sonnet-4-6`, temperature 0.3, 8192 max tokens) and 14-item tool list (4 built-in + 10 custom)
- **`agent/RULES.md`** — 10 behavioral constraints (always triage first, confidence gates, patch minimality, branch naming)
- **`agent/SOUL.md`** — agent identity and investigation directive
- **`agent/tools/`** — 10 YAML tool definitions + `scripts/` directory with shell implementations
- **`agent/memory/`** — contains `past_investigations.md` (session records) and `MEMORY.md` (active runtime memory)

### Runner

A Node.js bridge that calls the gitclaw SDK’s `query()` method and forwards all output as NDJSON to the backend. Reads `PROGRESS:` lines from agent stderr and emits them as `step` events; uses a `preToolUse` hook to intercept tool calls and emit `tool_call` events.

Key files:
- **`runner/index.ts`** — gitclaw SDK bridge; streams NDJSON event objects (tool_call, step, thinking, error, done)

### Backend

A FastAPI server managing sessions, spawning the runner as a subprocess, parsing gitclaw events into typed frontend events, and handling escalation pauses. Session lifecycle: create session → POST `/run` spawns runner subprocess → stream_parser maps NDJSON to typed events → send over WebSocket. Escalation gates pause the subprocess via `asyncio.Event` until frontend responds to `/sessions/{id}/review-decision`. All session data is persisted to SQLite via the database layer.

Key files:
- **`backend/main.py`** — FastAPI app, routes (`/run`, `/sessions/{id}`, `/sessions/{id}/review-decision`)
- **`backend/agent_runner.py`** — subprocess spawn and stdout/stderr handling
- **`backend/stream_parser.py`** — maps gitclaw NDJSON events to typed `AgentEvent` objects (triage_result, hypothesis, root_cause, blast_radius, patch, pr_opened, step, tool_call, thinking, error, done)
- **`backend/escalation_handler.py`** — asyncio.Event pause/resume for human review gates
- **`backend/session_manager.py`** — session creation and lifecycle tracking
- **`backend/github_client.py`** — GitHub API wrapper for PR creation and repo cloning
- **`backend/db.py`** — SQLite session persistence (database initialization, queries, session records)
- **`backend/secret_utils.py`** — scrubs sensitive values (API keys, tokens) from streamed events before sending to frontend

### Frontend

A Next.js 16.2.6 (React 19, Tailwind CSS v4) application. Landing page (`/`) accepts stack trace + repo URL. Session view (`/session/[id]`) renders a 3-panel investigation UI — left panel shows triage/hypothesis/root cause, center panel shows patch diff, right panel shows escalation controls. Uses `useAgentStream` hook to consume WebSocket events and update UI in real-time. Demo mode is available for testing investigations without a live backend.

Key files:
- **`frontend/app/page.tsx`** — landing page with stack trace + repo input form
- **`frontend/app/session/[id]/page.tsx`** — live 3-panel investigation view
- **`frontend/hooks/useAgentStream.ts`** — WebSocket consumer; manages AgentEvent state and updates UI
- **`frontend/hooks/useDemoStream.ts`** — demo mode hook; simulates investigation stream for testing without backend
- **`frontend/app/globals.css`** — Tailwind v4 stylesheet
- **`frontend/app/demo/`** — demo/example investigation view

## Deployment

### Docker Compose (Local Development)

A `docker-compose.yml` file orchestrates both backend and frontend services for local testing:

```bash
docker-compose up --build
```

This spins up:
- **Backend service** (`tracefix-backend`) on port 8000 — FastAPI app with volumes for `agent/` and `runner/` directories
- **Frontend service** (`tracefix-frontend`) on port 3000 — Next.js app with environment variable `NEXT_PUBLIC_BACKEND_URL` pointing to backend

### Fly.io Deployment

Production deployment to Fly.io is configured in `fly.toml`:
- **App name**: `tracefix-backend`
- **Region**: `sjc` (San Jose)
- **Resources**: Shared CPU, 1 vCPU, 1024MB RAM
- **Health checks**: 30s TCP checks on port 8000

**Environment variables for deployment**:
- `ANTHROPIC_API_KEY` — Required; Claude API key for agent
- `INTERNAL_API_SECRET` — Required in production; authenticates internal endpoints
- `GITHUB_TOKEN` — Optional; enables PR creation on GitHub
- `NEXT_PUBLIC_BACKEND_URL` — Frontend uses this to connect to backend API/WebSocket
- `CORS_ALLOW_ORIGINS` — Comma-separated list of allowed CORS origins for FastAPI (e.g., `https://example.com`)
- `SESSIONS_DB_PATH` — Optional; defaults to `backend/tracefix_sessions.db`
- `AGENT_TIMEOUT_SECONDS` — Optional; defaults to 660

See `.env.example` for all available environment variables.

## How the Investigation Works

1. **User submits**: Stack trace + GitHub repo URL on landing page
2. **Session created**: Frontend POSTs to `/run`; backend creates a session ID and spawns `runner/index.ts` as a child process
3. **Triage**: Agent calls `triage_classifier` — classifies input as regression or other category; non-regressions are escalated to human immediately
4. **Recall**: Agent calls `recall_past_investigations` to search memory for similar cases, avoiding duplicate effort
5. **Hypothesize**: Agent forms a hypothesis with confidence score before any investigation; traces dependency chain from stack frames using `trace_dependency_chain`
6. **Investigate**: Agent calls `investigate_regression` (runs `git bisect`) to find the introducing commit; calls `analyze_commit_intelligence` to understand what changed in that commit
7. **Validate**: Agent calls `validate_root_cause` to score confidence; if below 70%, calls `request_human_review` and pauses; frontend can approve, reject, or guide the agent to a different hypothesis
8. **Patch and PR**: Once confidence ≥70%, agent calls `estimate_blast_radius` to scope impact, then `generate_minimal_patch` to produce a fix (≤5 files, ≤20 lines), calls `analyze_regression_risk` to assess patch safety, and finally opens a PR via GitHub API; updates memory with the new investigation record

All progress streams to frontend as NDJSON-mapped AgentEvents over WebSocket; WebSocket consumer updates UI in real-time.

## Agent Tools

### Triage and Memory
- **`triage_classifier`** — classifies whether input is a regression, bug, feature request, or infrastructure issue
- **`recall_past_investigations`** — queries memory for similar regressions; uses semantic search to find relevant past cases

### Investigation
- **`trace_dependency_chain`** — traces call chain from stack frames; maps source locations to functions and files
- **`investigate_regression`** — runs `git bisect` to narrow down the introducing commit
- **`analyze_commit_intelligence`** — inspects commit diff, changed dependencies, and related commits; evaluates why the commit is suspicious

### Root Cause Validation
- **`validate_root_cause`** — scores confidence in the root cause based on code patterns, test coverage, and blast radius

### Patch Generation
- **`estimate_blast_radius`** — queries git logs and code dependencies to estimate what will be affected by a patch
- **`generate_minimal_patch`** — generates a surgical fix; enforces ≤5 files and ≤20 lines
- **`analyze_regression_risk`** — assesses the risk of the patch introducing new regressions

### Escalation
- **`request_human_review`** — emits an escalation event; pauses investigation and waits for frontend decision

## API Endpoints

### Sessions
- `POST /run` — create a session and start investigation; body: `{ stackTrace: string, repoUrl: string }`; returns `{ sessionId: string }`
- `GET /sessions/{id}` — fetch session metadata and investigation status

### Investigation Control
- `POST /sessions/{id}/review-decision` — respond to escalation pause; body: `{ decision: "approve" | "reject" | "guide", guidance?: string }`

### WebSocket
- `WS /ws/sessions/{id}` — stream investigation progress; emits `AgentEvent` objects as JSON lines

## Development Notes

- **Agent model string**: Format is `"provider:model-id"` (e.g., `"anthropic:claude-sonnet-4-6"`); defined in `agent/agent.yaml`
- **Confidence threshold**: Investigations below 70% confidence trigger mandatory `request_human_review`; hardcoded in `agent/RULES.md`
- **Patch limits**: Minimal patches must touch ≤5 files and ≤20 lines; enforced in `generate_minimal_patch.sh`
- **Branch naming**: Agent always branches to `tracefix/<commit-hash>` — never pushes to main/master
- **Repository cloning**: Repos are cloned to `/tmp/tracefix-<session_id>`; originals are never mutated
- **Event format**: Runner outputs NDJSON — each line is a JSON object with keys: `type` (event type), `step`, `confidence`, `summary`, `toolCall`, `result`, etc.
- **Python package management**: Always use `uv` (not `pip`); run via `uv run` (e.g., `uv run uvicorn main:app`)
- **Memory format**: `agent/memory/past_investigations.md` appends `## Session <id> — <date>` blocks after each investigation; query with semantic search in `recall_past_investigations`
- **Backend working directory**: Start backend from `backend/` directory so relative imports work (e.g., `import stream_parser`)
