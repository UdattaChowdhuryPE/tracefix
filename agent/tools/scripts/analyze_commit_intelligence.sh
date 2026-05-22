#!/bin/sh
# Input: JSON on stdin with {repo_dir, commit_hash, dependency_chain?}
# Output: JSON with {risk_assessment, risk_reasons, dependency_changes, affected_services, diff_summary}
set -e

INPUT=$(cat)
REPO_DIR=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('repo_dir',''))" 2>/dev/null)
COMMIT_HASH=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('commit_hash',''))" 2>/dev/null)

if [ -z "$REPO_DIR" ] || [ -z "$COMMIT_HASH" ]; then
  echo '{"error": "repo_dir and commit_hash are required"}'
  exit 1
fi

DIFF=$(git -C "$REPO_DIR" show "$COMMIT_HASH" --stat --patch 2>/dev/null | head -300)
MESSAGE=$(git -C "$REPO_DIR" log -1 --pretty=format:"%s" "$COMMIT_HASH" 2>/dev/null)
AUTHOR=$(git -C "$REPO_DIR" log -1 --pretty=format:"%an <%ae>" "$COMMIT_HASH" 2>/dev/null)
DATE=$(git -C "$REPO_DIR" log -1 --pretty=format:"%ai" "$COMMIT_HASH" 2>/dev/null)
FILES_CHANGED=$(git -C "$REPO_DIR" show --name-only --pretty=format:"" "$COMMIT_HASH" 2>/dev/null | grep -v '^$' || true)

export DIFF MESSAGE AUTHOR DATE FILES_CHANGED COMMIT_HASH

python3 << 'PYEOF'
import os, json, re

diff = os.environ.get('DIFF', '')
message = os.environ.get('MESSAGE', '')
author = os.environ.get('AUTHOR', '')
date = os.environ.get('DATE', '')
files_changed = [f for f in os.environ.get('FILES_CHANGED', '').split('\n') if f.strip()]
commit_hash = os.environ.get('COMMIT_HASH', '')

# Risk heuristics
risk_reasons = []
risk_score = 0

# Check for dangerous patterns in diff
dangerous_patterns = [
    (r'null[\s]*(check|guard|assert)', 'Removes null-check or guard', 30),
    (r'-\s*(if|unless).*none.*:|\bnot\s+\w+\s*is\s+None', 'Removes None check', 25),
    (r'auth|authen|authoriz', 'Modifies authentication/authorization code', 20),
    (r'password|secret|token|key|credential', 'Modifies security-sensitive code', 30),
    (r'def\s+\w+|function\s+\w+|class\s+\w+', 'Changes public interface', 15),
    (r'^-.*import\s', 'Removes import (possible dependency removal)', 10),
    (r'migration|schema|database|table', 'Database/schema change', 20),
]

diff_lower = diff.lower()
for pattern, reason, score in dangerous_patterns:
    if re.search(pattern, diff_lower):
        risk_reasons.append(reason)
        risk_score += score

# Dependency changes: removed imports
removed_imports = re.findall(r'^-.*(?:import|require|from)\s+[\w./"]+', diff, re.MULTILINE)
dep_changes = [line.strip().lstrip('-').strip() for line in removed_imports[:5]]

# Affected services: infer from file paths
affected = set()
for f in files_changed:
    parts = f.split('/')
    if len(parts) > 1:
        affected.add(parts[0])

if risk_score >= 50:
    risk_level = 'HIGH'
elif risk_score >= 20:
    risk_level = 'MEDIUM'
else:
    risk_level = 'LOW'

result = {
    'commit_hash': commit_hash,
    'author': author,
    'date': date,
    'message': message,
    'risk_assessment': risk_level,
    'risk_score': risk_score,
    'risk_reasons': risk_reasons if risk_reasons else ['No high-risk patterns detected'],
    'dependency_changes': dep_changes,
    'affected_services': list(affected),
    'files_changed': files_changed,
    'diff_summary': diff[:1000],
}
print(json.dumps(result))
PYEOF
