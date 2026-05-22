---
name: yaml-load-null-guard-investigation
description: Investigates and fixes TypeError crashes caused by js-yaml's yaml.load() returning null for empty/comment-only YAML files. Adds null guard after yaml.load() calls to prevent null propagation to property access. Applies to any TypeScript/JavaScript codebase using js-yaml where parsed YAML objects are used without null checks.
learned_from: task:f5daac41-eb44-40c4-a7a2-8c3a136fdb47
learned_at: '2026-05-22T18:25:07.234Z'
confidence: 1
usage_count: 0
success_count: 0
failure_count: 0
negative_examples: []
---

## Steps
1. Confirmed offending commit 23bb53a bumped pi-agent-core from 0.55.4 to 0.70.2. Stack trace src/agent/core.ts:142 is internal to pi-agent-core. The crash is in src/loader.ts resolveInheritance() where yaml.load() can return null and null.tools causes TypeError.
2. Crafting minimal surgical 3-line patch to add null guard in src/loader.ts:resolveInheritance() after yaml.load(). Creating branch tracefix/23bb53a.
3. Patch committed to branch tracefix/23bb53a. Push failed (no write token). PR body written to workspace/tracefix-pr-f5daac41.md. Updating memory now.

## What Worked
This approach succeeded on attempt #1.
