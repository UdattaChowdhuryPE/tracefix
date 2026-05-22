#!/bin/sh
# Input: JSON on stdin with {error_text, stack_files?, repo_name?}
# Output: JSON with {matches, reasoning}
set -e

INPUT=$(cat)
ERROR_TEXT=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error_text',''))" 2>/dev/null)
REPO_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('repo_name',''))" 2>/dev/null)

MEMORY_FILE="$(dirname "$0")/../../memory/past_investigations.md"

if [ ! -f "$MEMORY_FILE" ]; then
  echo '{"matches": [], "reasoning": "No past investigations found."}'
  exit 0
fi

python3 << PYEOF
import json, re, sys

error_text = """$ERROR_TEXT"""
repo_name = """$REPO_NAME"""
memory_path = """$MEMORY_FILE"""

with open(memory_path) as f:
    content = f.read()

# Split into sessions
sessions = re.split(r'(?=^## Session)', content, flags=re.MULTILINE)

matches = []
for session in sessions:
    if not session.strip() or 'Session' not in session:
        continue

    # Extract keywords line
    kw_match = re.search(r'\*\*Keywords:\*\*\s*(.+)', session)
    keywords = [k.strip() for k in kw_match.group(1).split(',')] if kw_match else []

    # Score: count keyword hits in the error text
    error_lower = error_text.lower()
    hits = sum(1 for kw in keywords if kw.lower() in error_lower)
    if hits == 0:
        continue

    similarity = min(1.0, hits / max(len(keywords), 1))

    # Extract fields
    summary_m = re.search(r'\*\*Root Cause:\*\*\s*(.+)', session)
    commit_m = re.search(r'\*\*Root Cause Commit:\*\*\s*(\S+)', session)
    fix_m = re.search(r'\*\*Fix:\*\*\s*(.+)', session)
    date_m = re.search(r'## Session (\S+) — (\S+)', session)

    matches.append({
        "session_id": date_m.group(1) if date_m else "unknown",
        "date": date_m.group(2) if date_m else "",
        "similarity": round(similarity, 2),
        "summary": summary_m.group(1).strip() if summary_m else "",
        "root_cause_commit": commit_m.group(1) if commit_m else "",
        "fix_applied": fix_m.group(1).strip() if fix_m else "",
    })

matches.sort(key=lambda x: x['similarity'], reverse=True)
matches = matches[:3]

if matches:
    top = matches[0]
    reasoning = f"Similar incident detected: {top['summary']} (session {top['session_id']}, {top['date']})"
else:
    reasoning = "No similar past incidents found in memory."

print(json.dumps({"matches": matches, "reasoning": reasoning}))
PYEOF
