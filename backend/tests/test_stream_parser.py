import json
import pytest
from stream_parser import parse_event


def test_invalid_json_returns_none():
    assert parse_event("not json") is None


def test_empty_string_returns_none():
    assert parse_event("") is None


def test_progress_prefix_parsed_as_step():
    payload = {"step": "bisect", "summary": "found commit"}
    line = "PROGRESS:" + json.dumps(payload)
    result = parse_event(line)
    assert result == {"type": "step", **payload}


def test_delta_returns_thinking():
    line = json.dumps({"type": "delta", "deltaType": "thinking", "content": "reasoning..."})
    result = parse_event(line)
    assert result == {"type": "thinking", "text": "reasoning..."}


def test_tool_call_event():
    line = json.dumps({"type": "tool_call", "tool": "validate_root_cause", "args": {"x": 1}})
    result = parse_event(line)
    assert result == {"type": "tool_call", "tool": "validate_root_cause", "args": {"x": 1}}


def test_tool_result_validate_root_cause():
    content = {"hypothesis_validated": True, "confidence": 85, "evidence": "commit abc", "revised_hypothesis": None}
    line = json.dumps({"type": "tool_result", "toolName": "validate_root_cause", "content": json.dumps(content)})
    result = parse_event(line)
    assert result["type"] == "hypothesis"
    assert result["validated"] is True
    assert result["confidence"] == 85


def test_tool_result_blast_radius():
    content = {"blast_radius_score": 7, "risk_level": "HIGH", "impacted_modules": ["auth"], "callers": [], "summary": "risky"}
    line = json.dumps({"type": "tool_result", "toolName": "estimate_blast_radius", "content": json.dumps(content)})
    result = parse_event(line)
    assert result["type"] == "blast_radius"
    assert result["risk_level"] == "HIGH"


def test_tool_result_patch_ready():
    content = {"patch": "diff...", "files_modified": ["main.py"], "lines_changed": 3, "explanation": "fix"}
    line = json.dumps({"type": "tool_result", "toolName": "generate_minimal_patch", "content": json.dumps(content)})
    result = parse_event(line)
    assert result["type"] == "patch_ready"
    assert result["lines_changed"] == 3


def test_tool_result_unknown_tool_returns_generic():
    line = json.dumps({"type": "tool_result", "toolName": "unknown_tool", "content": "raw output"})
    result = parse_event(line)
    assert result["type"] == "tool_result"
    assert result["tool"] == "unknown_tool"


def test_system_session_end_returns_complete():
    line = json.dumps({"type": "system", "subtype": "session_end", "content": "done"})
    result = parse_event(line)
    assert result == {"type": "complete", "content": "done"}


def test_error_event():
    line = json.dumps({"type": "error", "message": "something broke"})
    result = parse_event(line)
    assert result == {"type": "error", "message": "something broke"}


def test_unknown_type_returns_none():
    line = json.dumps({"type": "totally_unknown"})
    assert parse_event(line) is None
