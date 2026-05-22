#!/bin/sh
# Input: JSON on stdin with {repo_dir, bad_commit?, good_commit?, repro_script}
# Output: JSON with {first_bad_commit, bisect_log, commits_tested, steps_taken}
set -e

INPUT=$(cat)

REPO_DIR=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('repo_dir',''))" 2>/dev/null)
BAD_COMMIT=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('bad_commit','HEAD'))" 2>/dev/null)
GOOD_COMMIT=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('good_commit',''))" 2>/dev/null)
REPRO_SCRIPT=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('repro_script',''))" 2>/dev/null)

if [ -z "$REPO_DIR" ] || [ ! -d "$REPO_DIR" ]; then
  echo '{"error": "repo_dir not found or not a directory"}'
  exit 1
fi

# Write the repro script to a temp file
TMP_REPRO=$(mktemp /tmp/tracefix-repro-XXXXXX.sh)
printf '%s' "$REPRO_SCRIPT" > "$TMP_REPRO"
chmod +x "$TMP_REPRO"

# Find good commit if not provided: use first commit
if [ -z "$GOOD_COMMIT" ]; then
  GOOD_COMMIT=$(git -C "$REPO_DIR" rev-list --max-parents=0 HEAD 2>/dev/null | head -1)
fi

# Start bisect
git -C "$REPO_DIR" bisect reset 2>/dev/null || true
git -C "$REPO_DIR" bisect start
git -C "$REPO_DIR" bisect bad "$BAD_COMMIT"
git -C "$REPO_DIR" bisect good "$GOOD_COMMIT"

# Run bisect with the repro script, capture output
BISECT_LOG=$(git -C "$REPO_DIR" bisect run "$TMP_REPRO" 2>&1 || true)

# Extract first bad commit
FIRST_BAD=$(echo "$BISECT_LOG" | grep -oE '[0-9a-f]{40} is the first bad commit' | head -1 | awk '{print $1}' || true)
if [ -z "$FIRST_BAD" ]; then
  FIRST_BAD=$(echo "$BISECT_LOG" | grep -oE '^[0-9a-f]{7,40}' | head -1 || true)
fi

# Count steps
STEPS=$(echo "$BISECT_LOG" | grep -c 'Bisecting:' || true)

# Clean up
git -C "$REPO_DIR" bisect reset 2>/dev/null || true
rm -f "$TMP_REPRO"

python3 -c "
import json, sys
result = {
    'first_bad_commit': '$FIRST_BAD',
    'steps_taken': $STEPS,
    'bisect_log': '''$BISECT_LOG'''[:2000],
    'good_commit': '$GOOD_COMMIT',
    'bad_commit': '$BAD_COMMIT',
}
print(json.dumps(result))
"
