#!/bin/sh
# Input: JSON on stdin with {repo_dir, patch, files_modified}
# Output: JSON with {risk_score, risk_level, downstream_callers, test_coverage, suggested_tests, risk_explanation}
set -e

INPUT=$(cat)
REPO_DIR=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('repo_dir',''))" 2>/dev/null)
FILES_JSON=$(echo "$INPUT" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('files_modified',[])))" 2>/dev/null)
PATCH=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('patch',''))" 2>/dev/null)

export REPO_DIR FILES_JSON PATCH

python3 << 'PYEOF'
import os, json, subprocess, re

repo_dir = os.environ.get('REPO_DIR', '')
files_modified = json.loads(os.environ.get('FILES_JSON', '[]'))
patch = os.environ.get('PATCH', '')

downstream_callers = []
total_callers = 0
suggested_tests = []

for file_path in files_modified:
    module_name = os.path.splitext(os.path.basename(file_path))[0]

    # Find callers
    try:
        result = subprocess.run(
            ['grep', '-rn', '--include=*.py', '--include=*.ts', '--include=*.js',
             '-l', module_name, repo_dir],
            capture_output=True, text=True, timeout=10
        )
        for caller_file in result.stdout.strip().split('\n'):
            if caller_file and caller_file != os.path.join(repo_dir, file_path):
                rel = os.path.relpath(caller_file, repo_dir)
                if not rel.startswith('test') and not rel.startswith('spec'):
                    downstream_callers.append(rel)
                    total_callers += 1
    except Exception:
        pass

    # Find related tests
    try:
        result = subprocess.run(
            ['find', repo_dir, '-name', f'test_{module_name}*', '-o',
             '-name', f'{module_name}.test*', '-o', '-name', f'{module_name}.spec*'],
            capture_output=True, text=True, timeout=5
        )
        for test_file in result.stdout.strip().split('\n'):
            if test_file:
                suggested_tests.append(os.path.relpath(test_file, repo_dir))
    except Exception:
        pass

# Analyze patch for risk indicators
risk_score = 0
risk_reasons = []

if re.search(r'auth|password|secret|token', patch, re.IGNORECASE):
    risk_score += 30
    risk_reasons.append('Modifies security-sensitive code')

if total_callers > 5:
    risk_score += 20
    risk_reasons.append(f'{total_callers} downstream callers found')
elif total_callers > 0:
    risk_score += 10

if not suggested_tests:
    risk_score += 15
    risk_reasons.append('No existing tests found for modified files')

test_coverage = 'full' if len(suggested_tests) >= len(files_modified) else \
               'partial' if suggested_tests else 'none'

if risk_score >= 50:
    risk_level = 'HIGH'
elif risk_score >= 20:
    risk_level = 'MEDIUM'
else:
    risk_level = 'LOW'
    if not risk_reasons:
        risk_reasons.append('No high-risk patterns detected')

result = {
    'risk_score': risk_score,
    'risk_level': risk_level,
    'downstream_callers': downstream_callers[:8],
    'total_callers': total_callers,
    'test_coverage': test_coverage,
    'suggested_tests': suggested_tests[:5],
    'risk_explanation': f'{risk_level} risk. {";".join(risk_reasons)}.',
    'risk_reasons': risk_reasons,
}
print(json.dumps(result))
PYEOF
