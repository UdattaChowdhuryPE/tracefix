#!/bin/sh
# Input: JSON on stdin with {error_text, language?}
# Output: JSON with {dependency_chain, error_type, language, entry_point, frame_count}
set -e

INPUT=$(cat)

# Write input to a temp file so Python can read it cleanly
TMP=$(mktemp /tmp/tracefix-XXXXXX.json)
printf '%s' "$INPUT" > "$TMP"

python3 - "$TMP" << 'PYEOF'
import sys, json, re, os

with open(sys.argv[1]) as f:
    try:
        data = json.load(f)
    except Exception:
        data = {}

error_text = data.get('error_text', '')
language = data.get('language', '')

frames = []
error_type = 'Unknown'
entry_point = ''

# Python traceback
if not language or language == 'python':
    py_frames = re.findall(r'File "([^"]+)", line (\d+), in (\S+)', error_text)
    if py_frames:
        language = 'python'
        for f, l, fn in py_frames:
            frames.append({'file': f, 'line': int(l), 'function': fn})
        err_m = re.search(r'^(\w+Error|\w+Exception):', error_text, re.MULTILINE)
        if err_m:
            error_type = err_m.group(1)

# JavaScript/Node.js
if not frames and (not language or language in ('javascript', 'node', 'typescript')):
    js_frames = re.findall(r'at\s+(\S+)\s+\(([^:)]+):(\d+):\d+\)', error_text)
    if js_frames:
        language = 'javascript'
        for fn, fp, l in js_frames:
            frames.append({'file': fp, 'line': int(l), 'function': fn})
        err_m = re.search(r'^(\w+Error):', error_text, re.MULTILINE)
        if err_m:
            error_type = err_m.group(1)

# Java
if not frames and (not language or language == 'java'):
    java_frames = re.findall(r'at ([\w.$]+)\.([\w$<>]+)\(([^:)]+):(\d+)\)', error_text)
    if java_frames:
        language = 'java'
        for pkg, fn, fp, l in java_frames:
            frames.append({'file': fp, 'line': int(l), 'function': f'{pkg}.{fn}'})
        err_m = re.search(r'^([\w.]+(?:Exception|Error)):', error_text, re.MULTILINE)
        if err_m:
            error_type = err_m.group(1).split('.')[-1]

if frames:
    entry_point = frames[-1]['file'] + ':' + str(frames[-1]['line'])

result = {
    'dependency_chain': frames,
    'error_type': error_type,
    'language': language or 'unknown',
    'entry_point': entry_point,
    'frame_count': len(frames),
}
print(json.dumps(result))
PYEOF

rm -f "$TMP"
