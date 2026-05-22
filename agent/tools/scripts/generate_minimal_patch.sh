#!/bin/sh
# Input: JSON on stdin with {repo_dir, commit_hash, evidence, blast_radius?}
# Output: JSON with {patch, files_modified, lines_changed, explanation, confidence}
# Note: This script prepares the context. The agent (LLM) generates the actual patch text.
set -e

INPUT=$(cat)
REPO_DIR=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('repo_dir',''))" 2>/dev/null)
COMMIT_HASH=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('commit_hash',''))" 2>/dev/null)
EVIDENCE=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('evidence',''))" 2>/dev/null)

if [ -z "$REPO_DIR" ] || [ -z "$COMMIT_HASH" ]; then
  echo '{"error": "repo_dir and commit_hash required"}'
  exit 1
fi

# Get the offending commit's full diff for LLM context
DIFF=$(git -C "$REPO_DIR" show "$COMMIT_HASH" --patch 2>/dev/null)
FILES=$(git -C "$REPO_DIR" show --name-only --pretty=format:"" "$COMMIT_HASH" 2>/dev/null | grep -v '^$' || true)
FILE_COUNT=$(echo "$FILES" | wc -l | tr -d ' ')

# Generate reverse patch (revert the offending commit)
REVERT_PATCH=$(git -C "$REPO_DIR" show "$COMMIT_HASH" --patch 2>/dev/null | python3 -c "
import sys
lines = sys.stdin.readlines()
patch_lines = []
for line in lines:
    if line.startswith('---'):
        patch_lines.append(line.replace('---', '+++').replace('/b/', '/a/'))
    elif line.startswith('+++'):
        patch_lines.append(line.replace('+++', '---').replace('/a/', '/b/'))
    elif line.startswith('+'):
        patch_lines.append('-' + line[1:])
    elif line.startswith('-'):
        patch_lines.append('+' + line[1:])
    else:
        patch_lines.append(line)
print(''.join(patch_lines))
" 2>/dev/null || echo "")

LINES_CHANGED=$(echo "$REVERT_PATCH" | grep -c '^[+-]' 2>/dev/null || echo 0)

export DIFF REVERT_PATCH FILES FILE_COUNT LINES_CHANGED EVIDENCE COMMIT_HASH

python3 << 'PYEOF'
import os, json

revert_patch = os.environ.get('REVERT_PATCH', '')
files = [f for f in os.environ.get('FILES', '').split('\n') if f.strip()]
file_count = int(os.environ.get('FILE_COUNT', '0'))
lines_changed = int(os.environ.get('LINES_CHANGED', '0'))
evidence = os.environ.get('EVIDENCE', '')
commit_hash = os.environ.get('COMMIT_HASH', '')

# Minimality check
warnings = []
if file_count > 5:
    warnings.append(f'Patch touches {file_count} files (>5). Verify each is truly necessary.')
if int(lines_changed) > 20:
    warnings.append(f'Patch changes {lines_changed} lines (>20). Consider if all are required.')

result = {
    'patch': revert_patch,
    'files_modified': files,
    'lines_changed': lines_changed,
    'explanation': f'Reverting changes from commit {commit_hash[:8]}. Evidence: {evidence}',
    'confidence': 80,
    'minimality_warnings': warnings,
    'commit_reverted': commit_hash,
}
print(json.dumps(result))
PYEOF
