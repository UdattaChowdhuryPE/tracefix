#!/bin/sh
# Input: JSON on stdin with {repo_dir, commit_hash, hypothesis, dependency_chain?}
# Output: JSON with {hypothesis_validated, confidence, evidence, revised_hypothesis}
set -e

INPUT=$(cat)
REPO_DIR=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('repo_dir',''))" 2>/dev/null)
COMMIT_HASH=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('commit_hash',''))" 2>/dev/null)
HYPOTHESIS=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('hypothesis',''))" 2>/dev/null)
DEP_CHAIN=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('dependency_chain','[]'))" 2>/dev/null)

DIFF=$(git -C "$REPO_DIR" show "$COMMIT_HASH" --patch 2>/dev/null | head -200)
FILES_CHANGED=$(git -C "$REPO_DIR" show --name-only --pretty=format:"" "$COMMIT_HASH" 2>/dev/null | grep -v '^$' || true)

export DIFF FILES_CHANGED HYPOTHESIS DEP_CHAIN COMMIT_HASH

python3 << 'PYEOF'
import os, json, re

diff = os.environ.get('DIFF', '')
files_changed = [f for f in os.environ.get('FILES_CHANGED', '').split('\n') if f.strip()]
hypothesis = os.environ.get('HYPOTHESIS', '')
dep_chain_raw = os.environ.get('DEP_CHAIN', '[]')
commit_hash = os.environ.get('COMMIT_HASH', '')

try:
    dep_chain = json.loads(dep_chain_raw)
except:
    dep_chain = []

# Extract files mentioned in dependency chain
chain_files = set()
for frame in dep_chain if isinstance(dep_chain, list) else []:
    if isinstance(frame, dict) and 'file' in frame:
        chain_files.add(os.path.basename(frame['file']))

# Check overlap between changed files and dependency chain files
overlap = sum(1 for f in files_changed if os.path.basename(f) in chain_files)
overlap_ratio = overlap / max(len(chain_files), 1) if chain_files else 0

# Extract keywords from hypothesis
hyp_lower = hypothesis.lower()
evidence_items = []

# Check if hypothesis keywords appear in diff
hyp_words = [w for w in re.findall(r'\b\w{4,}\b', hyp_lower) if w not in ('that', 'this', 'with', 'from', 'when', 'where')]
diff_lower = diff.lower()
keyword_hits = sum(1 for w in hyp_words if w in diff_lower)
keyword_ratio = keyword_hits / max(len(hyp_words), 1) if hyp_words else 0

# Build confidence score
confidence = 40  # base
if overlap_ratio > 0.5:
    confidence += 30
    evidence_items.append(f"{overlap} of {len(chain_files)} stack-trace files appear in this commit's diff")
elif overlap_ratio > 0:
    confidence += 15
    evidence_items.append(f"{overlap} stack-trace file(s) touched by this commit")

if keyword_ratio > 0.3:
    confidence += 20
    evidence_items.append(f"Hypothesis keywords ({keyword_hits}/{len(hyp_words)}) found in diff")

if files_changed:
    evidence_items.append(f"Commit modifies: {', '.join(files_changed[:3])}")

confidence = min(confidence, 95)
hypothesis_validated = confidence >= 65

result = {
    'commit_hash': commit_hash,
    'hypothesis_validated': hypothesis_validated,
    'confidence': confidence,
    'evidence': '; '.join(evidence_items) if evidence_items else 'Weak overlap between commit and stack trace.',
    'revised_hypothesis': None if hypothesis_validated else f'Consider: the change in {files_changed[0] if files_changed else "this commit"} may have altered behavior expected by the stack trace.',
    'files_changed': files_changed,
    'diff_preview': diff[:500],
}
print(json.dumps(result))
PYEOF
