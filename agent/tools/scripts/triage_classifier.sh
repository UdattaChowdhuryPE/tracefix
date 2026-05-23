#!/bin/sh

set -e

# Read input JSON from stdin
INPUT=$(cat)

# Extract fields using python3 (no jq dependency)
ERROR_TEXT=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error_text',''))" 2>/dev/null || echo "")
STACK_TRACE=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('stack_trace',''))" 2>/dev/null || echo "")

export ERROR_TEXT STACK_TRACE

# Run classification logic in Python
python3 << 'PYEOF'
import os, json, re

error_text = os.environ.get('ERROR_TEXT', '')
stack_trace = os.environ.get('STACK_TRACE', '')

category = "ambiguous"
is_regression = False
confidence = 50
suggested_approach = ""
reason = ""

# Heuristic 1: Check for null/undefined dereference at construction
if re.search(r"Cannot read propert|TypeError.*undefined|ReferenceError", error_text):
    if re.search(r"(new |\.initialize|constructor|__init__|\.new)", stack_trace):
        category = "null_dereference_construction"
        is_regression = False
        confidence = 85
        suggested_approach = "Analyze the call site where the undefined config/object is passed. Suggest a defensive null-check or require explicit initialization."
        reason = "Error occurs at object construction time (new Foo(...) or .initialize) with undefined/null dereference — not a regression from a commit change."

# Heuristic 2: Check for configuration/setup errors (ENOENT, KeyError, missing env var)
elif re.search(r"ENOENT|no such file|KeyError|EnvironmentError|Missing.*config|undefined is not|not found", error_text):
    if not re.search(r"(bisect|checkout|git)", stack_trace):
        category = "configuration_error"
        is_regression = False
        confidence = 80
        suggested_approach = "Check required configuration, environment variables, and setup steps. Provide diagnostic output for missing files/config."
        reason = "Error indicates missing or misconfigured setup (file not found, missing env var, missing config) — not a regression from code change."

# Heuristic 3: Check for multi-frame stack with commit-bisectable depth
else:
    frame_count = len(re.findall(r"\bat ", stack_trace))
    construction_frames = len(re.findall(r"(new |constructor|__init__)", stack_trace))

    # If we have >3 frames and most are not construction-related, it's likely a regression
    if frame_count > 3 and construction_frames < frame_count // 2:
        category = "regression"
        is_regression = True
        confidence = 75
        suggested_approach = "Proceed with git bisect to find the commit that introduced this error."
        reason = "Stack trace indicates a multi-frame error path in application code — compatible with regression bisection."

# Output as JSON
result = {
    "is_regression": is_regression,
    "category": category,
    "confidence": confidence,
    "suggested_approach": suggested_approach,
    "reason": reason,
}
print(json.dumps(result))
PYEOF
