import json


def parse_event(raw_line: str) -> dict | None:
    """Parse a NDJSON line from the gitclaw runner into a typed frontend event."""
    try:
        msg = json.loads(raw_line)
    except json.JSONDecodeError:
        # Check for bare PROGRESS line
        if raw_line.startswith("PROGRESS:"):
            try:
                payload = json.loads(raw_line[len("PROGRESS:"):])
                return {"type": "step", **payload}
            except Exception:
                pass
        return None

    msg_type = msg.get("type", "")

    if msg_type == "delta":
        if msg.get("deltaType") == "thinking":
            return {"type": "thinking", "text": msg.get("content", "")}
        return {"type": "thinking", "text": msg.get("content", "")}

    if msg_type == "tool_call":
        return {
            "type": "tool_call",
            "tool": msg.get("tool", ""),
            "args": msg.get("args", {}),
        }

    if msg_type == "tool_result":
        tool_name = msg.get("toolName", "")
        content_raw = msg.get("content", "")

        # Try to parse content as JSON for enriched events
        try:
            content = json.loads(content_raw) if isinstance(content_raw, str) else content_raw
        except Exception:
            content = content_raw

        # Route to specialized event types based on tool name
        if tool_name == "recall_past_investigations":
            matches = content.get("matches", []) if isinstance(content, dict) else []
            return {
                "type": "memory_match",
                "matches": matches,
                "reasoning": content.get("reasoning", "") if isinstance(content, dict) else "",
            }

        if tool_name == "validate_root_cause":
            if isinstance(content, dict):
                return {
                    "type": "hypothesis",
                    "validated": content.get("hypothesis_validated", False),
                    "confidence": content.get("confidence", 0),
                    "evidence": content.get("evidence", ""),
                    "revised_hypothesis": content.get("revised_hypothesis"),
                }

        if tool_name == "request_human_review":
            if isinstance(content, dict):
                return {
                    "type": "escalation",
                    "reason": content.get("reason", ""),
                    "confidence": content.get("confidence", 0),
                    "hypothesis": content.get("hypothesis", ""),
                }

        if tool_name == "estimate_blast_radius":
            if isinstance(content, dict):
                return {
                    "type": "blast_radius",
                    "score": content.get("blast_radius_score", 0),
                    "risk_level": content.get("risk_level", "LOW"),
                    "impacted_modules": content.get("impacted_modules", []),
                    "callers": content.get("callers", []),
                    "summary": content.get("summary", ""),
                }

        if tool_name == "analyze_commit_intelligence":
            if isinstance(content, dict):
                return {
                    "type": "commit_intelligence",
                    "commit_hash": content.get("commit_hash", ""),
                    "risk_assessment": content.get("risk_assessment", ""),
                    "risk_reasons": content.get("risk_reasons", []),
                    "dependency_changes": content.get("dependency_changes", []),
                    "affected_services": content.get("affected_services", []),
                }

        if tool_name == "generate_minimal_patch":
            if isinstance(content, dict):
                return {
                    "type": "patch_ready",
                    "patch": content.get("patch", ""),
                    "files_modified": content.get("files_modified", []),
                    "lines_changed": content.get("lines_changed", 0),
                    "explanation": content.get("explanation", ""),
                }

        if tool_name == "analyze_regression_risk":
            if isinstance(content, dict):
                return {
                    "type": "regression_risk",
                    "risk_score": content.get("risk_score", 0),
                    "risk_level": content.get("risk_level", ""),
                    "downstream_callers": content.get("downstream_callers", []),
                    "test_coverage": content.get("test_coverage", ""),
                    "suggested_tests": content.get("suggested_tests", []),
                    "risk_explanation": content.get("risk_explanation", ""),
                }

        # Generic tool_result
        return {
            "type": "tool_result",
            "tool": tool_name,
            "content": content_raw[:2000] if isinstance(content_raw, str) else str(content_raw)[:2000],
        }

    if msg_type == "assistant":
        return {
            "type": "assistant_message",
            "content": msg.get("content", ""),
            "stop_reason": msg.get("stopReason", ""),
        }

    if msg_type == "system":
        subtype = msg.get("subtype", "")
        if subtype == "session_end":
            return {"type": "complete", "content": msg.get("content", "")}
        return {"type": "system", "subtype": subtype, "content": msg.get("content", "")}

    if msg_type == "step":
        return {"type": "step", "step": msg.get("step", ""), "summary": msg.get("summary", "")}

    if msg_type == "error":
        return {"type": "error", "message": msg.get("message", "")}

    return None
