#!/bin/sh
# Input: JSON on stdin with {repo_dir, files_to_patch, dependency_chain?}
# Output: JSON with {blast_radius_score, impacted_modules, impacted_services, callers, test_coverage, summary}
set -e

INPUT=$(cat)
REPO_DIR=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('repo_dir',''))" 2>/dev/null)
FILES_JSON=$(echo "$INPUT" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('files_to_patch',[])))" 2>/dev/null)

export REPO_DIR FILES_JSON

python3 << 'PYEOF'
import os, json, subprocess, re

repo_dir = os.environ.get('REPO_DIR', '')
files_to_patch = json.loads(os.environ.get('FILES_JSON', '[]'))

if not repo_dir or not os.path.isdir(repo_dir):
    print(json.dumps({'error': 'repo_dir not found'}))
    exit()

callers = []
impacted_modules = set()
total_callers = 0

for file_path in files_to_patch:
    full_path = os.path.join(repo_dir, file_path) if not file_path.startswith('/') else file_path
    module_name = os.path.splitext(os.path.basename(file_path))[0]

    # Find callers via grep
    try:
        result = subprocess.run(
            ['grep', '-r', '--include=*.py', '--include=*.ts', '--include=*.js',
             '-l', module_name, repo_dir],
            capture_output=True, text=True, timeout=10
        )
        for caller_file in result.stdout.strip().split('\n'):
            if caller_file and caller_file != full_path:
                rel = os.path.relpath(caller_file, repo_dir)
                callers.append(rel)
                parts = rel.split('/')
                if len(parts) > 1:
                    impacted_modules.add(parts[0])
                total_callers += 1
    except Exception:
        pass

    # Module from file path
    parts = file_path.split('/')
    if parts:
        impacted_modules.add(parts[0])

# Check test coverage
test_files = []
try:
    result = subprocess.run(
        ['find', repo_dir, '-name', 'test_*.py', '-o', '-name', '*.test.ts', '-o', '-name', '*.spec.ts'],
        capture_output=True, text=True, timeout=5
    )
    test_files = result.stdout.strip().split('\n')
except Exception:
    pass

has_tests = any(
    any(os.path.splitext(os.path.basename(f))[0] in tf for tf in test_files)
    for f in files_to_patch
)
test_coverage = 'partial' if has_tests else 'none'

blast_radius_score = min(100, total_callers * 15 + len(impacted_modules) * 5)
if blast_radius_score >= 60:
    risk_level = 'HIGH'
elif blast_radius_score >= 25:
    risk_level = 'MEDIUM'
else:
    risk_level = 'LOW'

result = {
    'blast_radius_score': blast_radius_score,
    'risk_level': risk_level,
    'impacted_modules': list(impacted_modules),
    'impacted_services': list(impacted_modules),
    'callers': callers[:10],
    'total_callers': total_callers,
    'test_coverage': test_coverage,
    'summary': f'{risk_level} blast radius. {total_callers} callers found across {len(impacted_modules)} modules.',
}
print(json.dumps(result))
PYEOF
