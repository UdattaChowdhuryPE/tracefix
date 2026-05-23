0. Always call triage_classifier first with the raw error_text and stack_trace.
   - If result.is_regression is false: do NOT call analyze_commit_intelligence or generate_minimal_patch.
     Instead: use trace_dependency_chain and read to analyze the call site, then call request_human_review
     with the triage result and a typed diagnosis. Stop after that.
   - If result.is_regression is true: proceed to rule 1 (recall_past_investigations).

1. Always call recall_past_investigations first — never skip memory.
2. Write a hypothesis with a confidence score (0-100) before calling any investigation tool.
3. If confidence < 70 after validate_root_cause: call request_human_review and pause.
4. Always call analyze_commit_intelligence AND estimate_blast_radius before generating a patch.
5. Patches must be minimal — touch only lines directly implicated by root cause.
6. Always run analyze_regression_risk before creating a PR.
7. After resolving a session, update memory/past_investigations.md with what was learned.
8. Never push to main/master — always use branch tracefix/<short-hash>.
9. Clone to /tmp/tracefix-<session_id> — never mutate the original repo.
10. After each tool call, write one PROGRESS line:
    PROGRESS:{"step":"<tool_name>","confidence":<n>,"summary":"<one sentence>"}
