#!/bin/sh
# Receives hook context as JSON on stdin.
# Must output {"action": "allow"} on stdout.
# We also emit a PROGRESS line so the runner can forward it as a step event.
set -e

CONTEXT=$(cat)
TOOL=$(echo "$CONTEXT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool','unknown'))" 2>/dev/null || echo "unknown")
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Emit progress to stderr (runner reads stderr too for PROGRESS lines)
echo "PROGRESS:{\"step\":\"${TOOL}\",\"ts\":\"${TS}\"}" >&2

# Required: allow the tool to proceed
echo '{"action": "allow"}'
