# TraceFix Memory

## Past Investigations

### [2026] gitagent — TypeError: Cannot read property 'tools' of undefined
- **Repo:** https://github.com/open-gitagent/gitagent
- **Session:** 204ad5b5-443f-49cb-8a24-b43997647c10
- **Error:** `TypeError: Cannot read property 'tools' of undefined` at `Agent.initializeTools`
- **Root Cause:** In `src/loader.ts`, `resolveInheritance()` — `yaml.load()` on an empty/null/comment-only parent `agent.yaml` returns `null` WITHOUT throwing. The `try/catch` only guarded against `readFile()` I/O errors. The null value reached `parentManifest.tools` causing a TypeError.
- **Fix:** 6-line null guard after `yaml.load()` in `resolveInheritance()` — if null, skip inheritance gracefully.
- **Branch:** `tracefix/23bb53a`
- **Associated commit:** `23bb53a` — package bump `@mariozechner/pi-agent-core` `^0.55.4 → ^0.70.2` + OTel instrumentation

## Patterns Learned

### js-yaml null returns
- `yaml.load("")` returns `null` — never throws for empty/null/comment-only YAML
- Always guard `yaml.load()` return values with null checks when the result is used directly
- Pattern: `const parsed = yaml.load(raw); if (!parsed) { /* handle null */ }`

### Agent initialization errors
- "Cannot read property X of undefined/null" in agent init usually means config object parsing failed silently
- YAML loading is a common silent failure point — check null returns, not just exceptions

### pi-agent-core API changes (v0.55.4 → v0.70.2)
- `AgentState.streamMessage` renamed to `streamingMessage`
- `subscribe()` now passes `(event, signal)` to listeners and AWAITS them (was fire-and-forget)
- `createMutableAgentState()` uses getter/setter accessors for `tools/messages`
- Tool execute signature: `(toolCallId, params: unknown, signal?, onUpdate?)` — params typed as `unknown` requires internal cast
- `StringEnum` removed from `@mariozechner/pi-ai` — replace with `Type.Union([Type.Literal(...)])`
- New `toolExecution: "parallel" | "sequential"` mode (default: parallel)
- `beforeToolCall` / `afterToolCall` hooks added to AgentOptions
