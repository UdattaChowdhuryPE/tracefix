#!/bin/sh
# Input: JSON on stdin with {reason, confidence, session_id, current_hypothesis?, evidence_so_far?}
# Signals the backend to pause and show the EscalationBanner.
# Polls for a human decision before returning.
set -e

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('session_id',''))" 2>/dev/null)
REASON=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('reason','Low confidence'))" 2>/dev/null)
CONFIDENCE=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('confidence',0))" 2>/dev/null)
HYPOTHESIS=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('current_hypothesis',''))" 2>/dev/null)

BACKEND_URL="${TRACEFIX_BACKEND_URL:-http://localhost:8000}"

# Signal the backend: escalation needed
HTTP_CODE=$(curl -s -o /tmp/tracefix-escalate-resp.json -w "%{http_code}" \
  -X POST "${BACKEND_URL}/internal/escalate/${SESSION_ID}" \
  -H 'Content-Type: application/json' \
  -d "$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps({'reason': d.get('reason',''), 'confidence': d.get('confidence',0), 'hypothesis': d.get('current_hypothesis',''), 'evidence': d.get('evidence_so_far','')}))")"
)

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "202" ]; then
  # Backend not available — return a mock approval for development
  echo '{"escalated": true, "decision": "approve", "guidance": "", "note": "backend_unavailable_auto_approved"}'
  exit 0
fi

# Poll for human decision (max 5 minutes)
MAX_POLLS=60
POLL_COUNT=0
while [ $POLL_COUNT -lt $MAX_POLLS ]; do
  RESP=$(curl -s "${BACKEND_URL}/internal/escalate/${SESSION_ID}/decision" 2>/dev/null || echo '{}')
  DECISION=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('decision','pending'))" 2>/dev/null)

  if [ "$DECISION" = "approve" ] || [ "$DECISION" = "reject" ] || [ "$DECISION" = "guide" ]; then
    echo "$RESP"
    exit 0
  fi

  sleep 5
  POLL_COUNT=$((POLL_COUNT + 1))
done

# Timeout — auto-approve with note
echo '{"escalated": true, "decision": "approve", "guidance": "", "note": "timeout_auto_approved"}'
