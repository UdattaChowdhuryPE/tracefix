# TraceFix Memory

## Past Investigations

### [2026] gitagent — TypeError: Cannot read property 'tools' of undefined (Session 1)
- **Repo:** https://github.com/open-gitagent/gitagent
- **Session:** 204ad5b5-443f-49cb-8a24-b43997647c10
- **Error:** `TypeError: Cannot read property 'tools' of undefined` at `Agent.initializeTools`
- **Root Cause:** In `src/loader.ts`, `resolveInheritance()` — `yaml.load()` on an empty/null/comment-only parent `agent.yaml` returns `null` WITHOUT throwing. The `try/catch` only guarded against `readFile()` I/O errors. The null value reached `parentManifest.tools` causing a TypeError.
- **Fix:** 6-line null guard after `yaml.load()` in `resolveInheritance()` — if null, skip inheritance gracefully.
- **Branch:** `tracefix/23bb53a`
- **Associated commit:** `23bb53a` — package bump `@mariozechner/pi-agent-core` `^0.55.4 → ^0.70.2` + OTel instrumentation

### [2026] gitagent — TypeError: Cannot read property 'tools' of undefined (Session 2 / f5daac41)
- **Repo:** https://github.com/open-gitagent/gitagent
- **Session:** f5daac41-eb44-40c4-a7a2-8c3a136fdb47
- **Error:** `TypeError: Cannot read property 'tools' of undefined` at `Agent.initializeTools (src/agent/core.ts:142)`
- **Stack trace paths:** `src/agent/core.ts`, `src/agent/index.ts` — these are **INTERNAL paths inside `@mariozechner/pi-agent-core`**, NOT files in the gitclaw repo itself.
- **Root Cause:** Same as Session 1 — `yaml.load()` in `src/loader.ts:resolveInheritance()` (line 193) returns null for empty/comment-only parent `agent.yaml`. No null guard existed.
- **Trigger:** `23bb53a` bumped `@mariozechner/pi-agent-core` `^0.55.4 → ^0.70.2`. New Agent eagerly calls `initializeTools()` at constructor time (v0.55.4 deferred), surfacing the pre-existing null-propagation bug.
- **Fix Applied:** 6-line null guard added to `src/loader.ts:resolveInheritance()` after `yaml.load()` call. Returns `{ manifest, parentRules: "" }` on null — identical to I/O error path.
- **Confidence:** 97/100
- **Branch:** `tracefix/23bb53a` (local only — no GitHub write token provided)
- **PR body:** `workspace/tracefix-pr-f5daac41.md`
- **Patch (6 lines, 1 file):**
  ```diff
  + // Guard: yaml.load() returns null for empty/comment-only YAML without throwing.
  + // A null parentManifest would crash on .tools access below.
  + if (!parentManifest) {
  +     return { manifest, parentRules: "" };
  + }
  ```

### [2026] gitagent — TypeError: Cannot read property 'tools' of undefined (Session 3 / 1ce5a497)
- **Repo:** https://github.com/open-gitagent/gitagent
- **Session:** 1ce5a497-af86-4202-a4ff-d0122f656ce8
- **Error:** `TypeError: Cannot read property 'tools' of undefined` at `Agent.initializeTools (src/agent/core.ts:142)`
- **Root Cause:** IDENTICAL to Sessions 1 & 2 — yaml.load() null return in src/loader.ts:resolveInheritance() line 193
- **Confidence:** 99/100
- **Branch:** `tracefix/23bb53a` (local only — no GitHub write token)
- **Commit:** `487879b`
- **PR body:** `workspace/tracefix-pr-1ce5a497.md`
- **Key learning:** This is the THIRD time this exact bug has been reported in this repo. The fix has been ready twice before but never merged (no write token). The bug persists because the PR was never pushed upstream.
- **Skill applied:** `yaml-load-null-guard-investigation` (confidence 1, first actual use)
- **Patch (5 lines, 1 file):**
  ```diff
  + // Guard: yaml.load() returns null/undefined for empty or comment-only YAML without throwing.
  + // A null parentManifest would crash on .tools access below — TypeError: Cannot read property 'tools' of undefined.
  + if (!parentManifest) {
  +     return { manifest, parentRules: "" };
  + }
  ```

### [2026] gitagent — TypeError: Cannot read property 'tools' of undefined (Session 4 / 6f6ab147)
- **Repo:** https://github.com/open-gitagent/gitagent
- **Session:** 6f6ab147-a7ef-4dbe-bb0b-c1eaee63fbc4
- **Error:** `TypeError: Cannot read property 'tools' of undefined` at `Agent.initializeTools (src/agent/core.ts:142)`
- **Root Cause:** IDENTICAL to Sessions 1, 2 & 3 — yaml.load() null return in src/loader.ts:resolveInheritance() line 193
- **Confidence:** 99/100
- **Branch:** `tracefix/23bb53a` (local only — no GitHub write token, push failed 403)
- **Patch commit:** `a400f28`
- **PR body:** `workspace/tracefix-pr-session4.md`
- **Key learning:** This is the FOURTH time this exact bug has been reported. Root cause is 100% confirmed. The fix is proven correct. The only blocker to resolution is that the repository owner has never provided a write token to enable pushing the fix. **This bug will keep recurring until merged.**
- **Skill applied:** `yaml-load-null-guard-investigation` (confidence 1, 2nd successful use)
- **Memory recognition:** Instant — within first tool call, confidence was already 95%+
- **Investigation time:** ~3 minutes (memory + skill made this extremely efficient)
- **Patch (+6 lines, 1 file):**
  ```diff
  +	// Guard: yaml.load() returns null/undefined for empty or comment-only YAML without throwing.
  +	// A null parentManifest would crash on .tools access below — TypeError: Cannot read property 'tools' of undefined.
  +	if (!parentManifest) {
  +		return { manifest, parentRules: "" };
  +	}
  ```

### [2026] gitagent — TypeError: Cannot read property 'tools' of undefined (Session 5 / 18a790eb)
- **Repo:** https://github.com/open-gitagent/gitagent
- **Session:** 18a790eb-fc73-4d8c-ab33-f141619b1d2d
- **Error:** `TypeError: Cannot read property 'tools' of undefined` at `Agent.initializeTools (src/agent/core.ts:142)`
- **Root Cause:** IDENTICAL to Sessions 1, 2, 3 & 4 — yaml.load() null return in src/loader.ts:resolveInheritance() line 193
- **Confidence:** 99/100
- **Branch:** `tracefix/23bb53a` (local only — no GitHub write token, push not attempted)
- **Patch commit:** `0e30143`
- **PR body:** `workspace/tracefix-pr-session5.md`
- **Key learning:** This is the FIFTH time this exact bug has been reported. The investigation is now instantaneous (memory → skill → code confirm → patch in ~3 min). The ONLY outstanding problem is that no write token has ever been provided. **The fix is ready. The blocker is access.**
- **Skill applied:** `yaml-load-null-guard-investigation` (3rd successful application)
- **Memory recognition:** Instant — 99% confidence before any investigation tool ran
- **Patch (+6 lines, 1 file):**
  ```diff
  +	// Guard: yaml.load() returns null/undefined for empty or comment-only YAML without throwing.
  +	// A null parentManifest would crash on .tools access below — TypeError: Cannot read property 'tools' of undefined.
  +	if (!parentManifest) {
  +		return { manifest, parentRules: "" };
  +	}
  ```

### [2026] lodash/lodash — TypeError: Cannot read property "id" of undefined at validateUser (auth.py:42) — INVALID BUG REPORT (Session bbb2d106)
- **Repo:** https://github.com/lodash/lodash
- **Session:** bbb2d106-554d-41aa-b709-46343ced13dd
- **Error:** `TypeError: Cannot read property "id" of undefined at validateUser (auth.py:42)`
- **Outcome:** ⚠️ **INVESTIGATION HALTED — INVALID/INCOMPATIBLE BUG REPORT**
- **Confidence:** 10/100
- **Root Cause Finding:** The stack trace is **fundamentally incompatible** with the referenced repository. Evidence:
  1. `lodash/lodash` is a pure **JavaScript** utility library — zero Python files in its entire history
  2. `auth.py` does not exist anywhere in the repo (confirmed with `find -name "*.py"` → 0 results)
  3. `validateUser` function does not exist in any file (grep returns 0 results)
  4. `TypeError: Cannot read property "id" of undefined` is **JavaScript** syntax — Python raises `AttributeError`, not this kind of TypeError
  5. The error format mixes JavaScript error style with a Python file path — internally contradictory
- **Action Taken:** Called `request_human_review` (confidence < 70 threshold triggered correctly). Escalated to human.
- **Key Learning:** Bug reports can be submitted with the wrong repository URL or fabricated stack traces. Always verify that referenced files (auth.py) and functions (validateUser) actually exist in the codebase **before** running bisect or generating patches. A `find` + `grep` scan at clone time is a critical early gate.

---

## Patterns Learned

### js-yaml null returns
- `yaml.load("")` returns `undefined` — never throws for empty input
- `yaml.load("# comment")` returns `null` — never throws for comment-only YAML
- Always guard `yaml.load()` return values with null checks when the result is used directly
- Pattern: `const parsed = yaml.load(raw); if (!parsed) { /* handle null */ }`

### Agent initialization errors
- "Cannot read property X of undefined/null" in agent init usually means config object parsing failed silently
- YAML loading is a common silent failure point — check null returns, not just exceptions
- **Stack trace paths in `src/agent/core.ts` or `src/agent/index.ts` are INTERNAL to `@mariozechner/pi-agent-core`** — the bug lives in gitclaw's `src/loader.ts`

### pi-agent-core API changes (v0.55.4 → v0.70.2)
- `AgentState.streamMessage` renamed to `streamingMessage`
- `subscribe()` now passes `(event, signal)` to listeners and AWAITS them (was fire-and-forget)
- `createMutableAgentState()` uses getter/setter accessors for `tools/messages`
- Tool execute signature: `(toolCallId, params: unknown, signal?, onUpdate?)` — params typed as `unknown` requires internal cast
- `StringEnum` removed from `@mariozechner/pi-ai` — replace with `Type.Union([Type.Literal(...)])`
- New `toolExecution: "parallel" | "sequential"` mode (default: parallel)
- `beforeToolCall` / `afterToolCall` hooks added to AgentOptions
- **v0.70.2 NEW:** `Agent` constructor calls `initializeTools()` eagerly (v0.55.4 deferred it) — exposes pre-existing null/undefined bugs in tool setup

### Investigation methodology notes
- `recall_past_investigations` tool may fail with exit code 1 — fall back to memory file
- `trace_dependency_chain` may return empty frames for simple TypeScript stacks — reason manually
- `investigate_regression` (git bisect) may fail if repro script has env issues — document and proceed
- `analyze_regression_risk` may fail — perform manual analysis using grep + code inspection
- `validate_root_cause` scores against the commit diff only — if the bug is in an unchanged file (pre-existing) the score will be artificially low. Use code proof instead.
- When `generate_minimal_patch` produces a massive diff (full revert), **reject it** and craft the surgical patch manually.
- **RECURRING BUG PATTERN:** This exact bug has appeared 5 times. Fix is proven. Blocker = no write token. Resolution path: user must provide GitHub token with write access OR apply patch manually.
- Memory file provides extremely fast initial confidence boost (99% on first call) for known bugs.
- **NEW GATE (bbb2d106):** After cloning, ALWAYS verify that files and functions from the stack trace actually exist in the repo BEFORE running any investigation tools. A mismatched bug report wastes all downstream tool calls.

### Node.js / js-yaml module path
- `yaml.load('')` returns `undefined`, `yaml.load('# comment')` returns `null`
- Global npm root: `$(npm root -g)/js-yaml` — can test directly with `node -e "const yaml = require('$(npm root -g)/js-yaml');..."`

### Blocker pattern — no write token
- This specific bug (gitagent `TypeError: Cannot read property 'tools' of undefined`) has appeared **5 times**
- Each time the fix is identical, correct, and ready — but push fails (no write access)
- **For Session 6+:** Immediately point user to `workspace/tracefix-pr-session5.md` with manual apply instructions. Investigation is complete. The fix is: 5-line null guard in `src/loader.ts:resolveInheritance()` after `yaml.load()` call. No further investigation needed.
- **Manual fix instructions:**
  ```bash
  # In the gitagent repo:
  # Edit src/loader.ts — after line 194 (yaml.load(parentRaw) as AgentManifest;), add:
  
  # Guard: yaml.load() returns null/undefined for empty or comment-only YAML without throwing.
  # A null parentManifest would crash on .tools access below — TypeError: Cannot read property 'tools' of undefined.
  if (!parentManifest) {
      return { manifest, parentRules: "" };
  }
  ```

### Invalid/fabricated bug reports
- Stack traces can be submitted with wrong repo URLs, non-existent files, or mixed-language errors
- `TypeError: Cannot read property X of undefined` is **JavaScript** syntax — Python raises `AttributeError`
- Always verify: does the referenced file exist? Does the referenced function exist? Is the language consistent?
- Early validation gate: `find <repo> -name "<file>"` and `grep -r "<function>"` immediately after clone
