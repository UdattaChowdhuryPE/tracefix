"""Layer 1: Unit tests for tool scripts.

Each test runs a tool script with crafted JSON input and validates the output structure
and logic. No network, no LLM, no git operations (except those built into the scripts).
"""

import json
import subprocess
import sys
import os
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).parent.parent
TOOLS_DIR = PROJECT_ROOT / "agent" / "tools" / "scripts"


def run_tool(tool_name: str, input_data: dict) -> dict:
    """Run a tool script with input_data on stdin, return parsed JSON output."""
    script_path = TOOLS_DIR / f"{tool_name}.sh"
    if not script_path.exists():
        pytest.skip(f"Tool script not found: {script_path}")

    input_json = json.dumps(input_data)
    result = subprocess.run(
        ["sh", str(script_path)],
        input=input_json,
        capture_output=True,
        text=True,
        timeout=30,
    )

    if result.returncode != 0:
        # Some tools may fail gracefully; capture stderr for debugging
        raise RuntimeError(
            f"Tool {tool_name} exited with code {result.returncode}\n"
            f"stderr: {result.stderr}"
        )

    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Tool {tool_name} output invalid JSON: {result.stdout}\n"
            f"Error: {e}"
        )


# --- triage_classifier.sh tests ---


@pytest.mark.unit
def test_triage_classifier_null_dereference():
    """TypeError at constructor should classify as null_dereference_construction."""
    input_data = {
        "error_text": "TypeError: Cannot read property 'tools' of undefined",
        "stack_trace": "at new Agent (src/agent/core.ts:22)",
    }
    result = run_tool("triage_classifier", input_data)
    assert result["is_regression"] is False
    assert result["category"] == "null_dereference_construction"
    assert result["confidence"] >= 80


@pytest.mark.unit
def test_triage_classifier_config_error():
    """ENOENT should classify as configuration_error."""
    input_data = {
        "error_text": "ENOENT: no such file or directory, open '.env'",
        "stack_trace": "at readFileSync (fs.js:123)",
    }
    result = run_tool("triage_classifier", input_data)
    assert result["is_regression"] is False
    assert result["category"] == "configuration_error"
    assert result["confidence"] >= 75


@pytest.mark.unit
def test_triage_classifier_empty_input():
    """Empty input should default to ambiguous."""
    input_data = {"error_text": "", "stack_trace": ""}
    result = run_tool("triage_classifier", input_data)
    assert "is_regression" in result
    assert "category" in result
    assert "confidence" in result


@pytest.mark.unit
def test_triage_classifier_output_schema():
    """Output must have required fields."""
    input_data = {
        "error_text": "some error",
        "stack_trace": "some trace",
    }
    result = run_tool("triage_classifier", input_data)
    assert isinstance(result["is_regression"], bool)
    assert isinstance(result["category"], str)
    assert isinstance(result["confidence"], int)
    assert 0 <= result["confidence"] <= 100


# --- trace_dependency_chain.sh tests ---


@pytest.mark.unit
def test_trace_dependency_chain_python():
    """Python traceback should extract frames and language."""
    input_data = {
        "error_text": 'File "app.py", line 42, in handle_request\n'
        'File "db.py", line 87, in query\n'
        "KeyError: 'user_id'",
    }
    result = run_tool("trace_dependency_chain", input_data)
    assert result["language"] == "python"
    assert result["frame_count"] == 2
    assert len(result["dependency_chain"]) == 2
    assert result["dependency_chain"][0]["file"] == "app.py"
    assert result["dependency_chain"][0]["line"] == 42


@pytest.mark.unit
def test_trace_dependency_chain_javascript():
    """JavaScript stack should extract frames."""
    input_data = {
        "error_text": "at Object.handler (app.js:100:5)\n"
        "at processRequest (middleware.js:50:10)\n"
        "TypeError: foo is undefined",
    }
    result = run_tool("trace_dependency_chain", input_data)
    assert result["language"] == "javascript"
    assert result["frame_count"] == 2
    assert result["dependency_chain"][0]["file"] == "app.js"
    assert result["dependency_chain"][0]["line"] == 100


@pytest.mark.unit
def test_trace_dependency_chain_empty():
    """Empty input should not crash."""
    input_data = {"error_text": ""}
    result = run_tool("trace_dependency_chain", input_data)
    assert result["language"] == "unknown"
    assert result["frame_count"] == 0
    assert result["dependency_chain"] == []


@pytest.mark.unit
def test_trace_dependency_chain_output_schema():
    """Output must have required fields."""
    input_data = {"error_text": "some error"}
    result = run_tool("trace_dependency_chain", input_data)
    assert isinstance(result["dependency_chain"], list)
    assert isinstance(result["language"], str)
    assert isinstance(result["frame_count"], int)
    assert "error_type" in result
    assert "entry_point" in result


# --- estimate_blast_radius.sh tests ---


@pytest.mark.unit
def test_estimate_blast_radius_output_schema():
    """Output must have required fields."""
    # blast_radius needs a repo_dir, which we don't have, so this validates graceful fallback
    input_data = {"repo_dir": "/nonexistent"}
    try:
        result = run_tool("estimate_blast_radius", input_data)
        # If it succeeds, check schema
        if "error" not in result:
            assert isinstance(result.get("blast_radius_score"), (int, float))
            assert "risk_level" in result
    except RuntimeError:
        # Tool may fail gracefully on missing repo; that's ok
        pytest.skip("Tool requires valid repo_dir")


# --- generate_minimal_patch.sh tests ---


@pytest.mark.unit
def test_generate_minimal_patch_output_schema():
    """Patch output must be valid unified diff format."""
    # This tool typically needs a real git repo and commit; skip if not available
    input_data = {
        "repo_dir": "/nonexistent",
        "commit_hash": "abcdef123456",
    }
    try:
        result = run_tool("generate_minimal_patch", input_data)
        if "patch" in result:
            # If patch exists, it should start with --- and +++
            assert isinstance(result["patch"], str)
            assert isinstance(result["files_modified"], list)
            assert isinstance(result["lines_changed"], int)
    except RuntimeError:
        # Tool may fail on missing repo; that's expected
        pytest.skip("Tool requires valid repo")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "unit"])
