# TraceFix

> Autonomous root-cause investigation engineer.

Given a stack trace and a GitHub repo, TraceFix:
1. **Recalls** past investigations from memory
2. **Traces** the full dependency chain from the stack frames
3. **Bisects** git history to find the exact introducing commit
4. **Analyzes** commit intelligence — why it’s risky, what dependencies changed
5. **Validates** the root cause with confidence scoring (iterates if < 70%)
6. **Estimates** blast radius before touching any code
7. **Escalates** to human review when confidence is low
8. **Generates** a minimal surgical patch
9. **Assesses** regression risk
10. **Opens** a production-aware PR with a full investigation report

All streamed live to a 3-panel UI.

## Stack

- **Agent**: [gitclaw](https://github.com/open-gitagent/gitagent) (git-native agent framework)
- **Backend**: FastAPI + Python 3.11
- **Frontend**: Next.js 14 (App Router, Tailwind)

## Quick Start

### 1. Prerequisites

- Node.js 20+
- Python 3.11+
- Git

### 2. Environment

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 3. Install dependencies

```bash
# Runner (gitclaw SDK bridge)
cd runner && npm install && cd ..

# Backend
cd backend && pip install -r requirements.txt && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 4. Make tool scripts executable

```bash
chmod +x agent/tools/scripts/*.sh agent/hooks/post_tool_use.sh
```

### 5. Run

```bash
# Terminal 1: backend
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2: frontend
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste a stack trace, provide a GitHub repo URL, and click **Begin Investigation**.

## Agent Architecture

```
user
 ↓ (stack trace + repo URL)
FastAPI backend
 ↓ (spawns)
runner/index.ts  (gitclaw query() SDK → NDJSON stdout)
 ↓
agent/          (gitclaw agent: SOUL.md + RULES.md + 9 custom tools)
 ↓
tool shell scripts  (git bisect, grep, diff analysis, GitHub API)
```

## Investigation Workflow

```
recall_past_investigations → trace_dependency_chain
  → form hypothesis (confidence score)
  → investigate_regression (git bisect)
  → analyze_commit_intelligence
  → validate_root_cause
    → [if confidence < 70] request_human_review (escalate)
    → [if confidence >= 70] estimate_blast_radius
  → generate_minimal_patch
  → analyze_regression_risk
  → create PR with full investigation report
  → update memory
```

## Built with GitAgent

TraceFix uses [gitclaw](https://github.com/open-gitagent/gitagent) as its agent runtime.
The agent lives in `agent/` — a standard git repository with:
- `agent.yaml` — model config, tool list
- `SOUL.md` — agent identity
- `RULES.md` — behavioral constraints (memory-first, confidence thresholds, minimality)
- `memory/` — git-committed investigation log
- `tools/` — 9 custom YAML-defined tools backed by shell scripts
- `hooks/` — post-tool hook that emits PROGRESS events for live streaming
