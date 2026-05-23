---
name: yaml-load-null-guard-investigation
description: Investigates and fixes TypeError crashes caused by js-yaml's yaml.load() returning null for empty/comment-only YAML files. Adds null guard after yaml.load() calls to prevent null propagation to property access. Applies to any TypeScript/JavaScript codebase using js-yaml where parsed YAML objects are used without null checks.
learned_from: task:f5daac41-eb44-40c4-a7a2-8c3a136fdb47
learned_at: '2026-05-22T18:25:07.234Z'
confidence: 0.76
usage_count: 8
success_count: 3
failure_count: 5
negative_examples:
  - Patch is complete and correct (commit 0e30143, branch tracefix/23bb53a) but could not be pushed to GitHub — no write token provided. This is the 5th consecutive session blocked by the same access issue. Investigation itself was fully successful.
  - 'Push to GitHub failed with 403 — no write token provided. Investigation fully complete and patch committed locally. Outcome is partial: fix ready but not merged.'
  - 'Push to GitHub failed with 403 — no write token provided. Investigation fully complete and patch committed locally (72a92f5 on tracefix/23bb53a). Outcome is partial: fix ready but not merged. This is the 7th consecutive session blocked by the same access issue.'
  - Push to GitHub failed 403 — no write token provided. Investigation 100% complete. Patch committed locally (afbb0ab on tracefix/session8-yaml-null-guard). PR body written to workspace/tracefix-pr-session8.md. This is the 8th consecutive session blocked by missing write access.
  - 'Push to GitHub failed with 403 — no write token provided. Investigation fully complete and patch committed locally (97d6393 on tracefix/session9-yaml-null-guard). Outcome is partial: fix ready but not merged. This is the 9th consecutive session blocked by the same access issue.'
---
## Steps
1. Confirmed offending commit 23bb53a bumped pi-agent-core from 0.55.4 to 0.70.2. Stack trace src/agent/core.ts:142 is internal to pi-agent-core. The crash is in src/loader.ts resolveInheritance() where yaml.load() can return null/undefined and null.tools causes TypeError.
2. Direct code proof: node -e with js-yaml confirms yaml.load('') returns undefined and yaml.load('# comment') returns null — neither throws. The try/catch at line 191-196 only catches I/O errors, not null returns.
3. Craft minimal surgical 5-line patch to add null guard in src/loader.ts:resolveInheritance() after yaml.load(). Creating branch tracefix/23bb53a. REJECT any full-revert patch from generate_minimal_patch.
4. Commit to branch tracefix/23bb53a. If no write token: write PR body to workspace/tracefix-pr-{session_id}.md. Update memory/past_investigations.md.

## What Worked
This approach succeeded on attempts #1, #2, and #3 (all three sessions for this exact bug).

## Key Insights
- validate_root_cause will return LOW confidence (~60) for this bug because the fix is in src/loader.ts which was NOT modified by the offending commit. Override with direct code proof.
- generate_minimal_patch returns a massive full-revert diff — always reject and craft manually.
- The fix is identical across all sessions: 5-line null guard after yaml.load() returning { manifest, parentRules: "" } on null/undefined.
- This bug has appeared 3 times — root cause is clear, fix is proven, blocker is write token access for PR merge.

