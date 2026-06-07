# TraceFix Evaluation Harness

Three-layer evaluation system for assessing investigation quality:

## Quick Start

```bash
# Layer 1: Tool script tests (no setup needed)
cd backend && uv run pytest ../evals/test_tool_scripts.py -v -m unit

# Scorer unit tests
cd backend && uv run pytest ../evals/tests/test_scorer.py -v

# Layer 3: Replay mode (uses demo fixture, zero LLM cost)
cd backend && uv run python -c "
import sys, json
sys.path.insert(0, '..')
from evals.scorer import score_scenario
with open('../evals/scenarios/yaml_loader_missing.json') as f:
    scenario = json.load(f)
with open('../evals/fixtures/demo_events.jsonl') as f:
    events = [json.loads(line) for line in f if line.strip()]
result = score_scenario(scenario, events)
print(json.dumps(result, indent=2))
"
```

## Architecture

### Layer 1: Tool Script Unit Tests
- **File:** `test_tool_scripts.py`
- **Tests:** ~10 unit tests per tool, 0 dependencies
- **Cost:** <1s, no network
- **What it catches:** Broken shell/Python logic, schema violations, confidence thresholds

### Layer 2: Event Stream Structural Tests  
- **File:** `test_session_flow.py` (not yet implemented)
- **Tests:** Event ordering, phase correctness, escalation flow
- **Cost:** 5-10s per test, needs backend running
- **What it catches:** Regression in event ordering, forbidden tool calls in non-regression path

### Layer 3: Scenario Quality Scoring
- **Files:** `scorer.py`, `scenarios/`, `fixtures/`
- **Traits:** 8 dimensions scored per scenario (regression flag, triage accuracy, patch minimality, etc.)
- **Cost:** Zero for replay mode (uses JSONL fixture), ~$0.01 per live run if using LLM-as-judge
- **What it catches:** Triage accuracy, phase correctness, memory recall quality, patch minimality

## Scenarios

Each scenario file defines a test case:

```json
{
  "id": "scenario_id",
  "input": {
    "repo_url": "...",
    "error_text": "..."
  },
  "ground_truth": {
    "is_regression": false,
    "category": "null_dereference_construction",
    "confidence_min": 70,
    "patch_expected": false
  },
  "rubric": [
    {"trait": "correct_regression_flag", "weight": 10},
    ...
  ]
}
```

**Current scenarios:**
- `yaml_loader_missing.json` — backed by demo_events.jsonl (free replay)

## Traits

| Trait | Measures |
|---|---|
| `correct_regression_flag` | Triage correctly identified regression vs non-regression |
| `correct_triage_category` | Category matches ground truth (null_dereference_construction, config_error, etc.) |
| `memory_recalled` | Agent matched previous investigation in memory |
| `hypothesis_validated` | Validation confidence >= threshold |
| `confidence_above_threshold` | Stated confidence meets minimum |
| `correct_file_identified` | Root cause file appears in patch |
| `patch_minimality` | Patch ≤5 files, ≤20 lines |
| `reached_complete` | Session reached completion (no error, no timeout) |

## Adding a New Scenario

1. Create `evals/scenarios/your_scenario.json` with ground truth
2. Create or record events from a real or mocked session
3. Save as JSONL to `evals/fixtures/your_scenario_events.jsonl` (one JSON object per line)
4. Run scorer:
   ```bash
   python -c "
   import json, sys
   sys.path.insert(0, '..')
   from evals.scorer import score_scenario
   scenario = json.load(open('../evals/scenarios/your_scenario.json'))
   events = [json.loads(l) for l in open('../evals/fixtures/your_scenario_events.jsonl')]
   print(json.dumps(score_scenario(scenario, events), indent=2))
   "
   ```

## Database

The SQLite backend now persists all events:

```sql
CREATE TABLE session_events (
    id INTEGER PRIMARY KEY,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,  -- JSON
    ts REAL NOT NULL
);
```

API endpoint: `GET /api/sessions/{session_id}/events` returns the full event log for replay.

## Known Limitations

- **triage_classifier.sh** has a shell-to-Python JSON extraction issue that causes multiline stack traces to be lost in some cases
- **Layer 2** (structural tests) is not yet implemented
- **Layer 3** with LLM-as-judge is not yet implemented
- No CI integration yet (could gate PRs on Layer 1 passing)
