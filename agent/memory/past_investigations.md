# Past Investigations

This file is updated automatically after every resolved TraceFix session.
The recall_past_investigations tool searches this file for similar incidents.

---

## Session sess_demo — 2025-03-10
**Repo:** github.com/pallets/flask
**Error:** KeyError: 'user_id' in session middleware
**Root Cause Commit:** a3f9c12 by @maintainer
**Root Cause:** Session dict key renamed from 'user_id' to 'userId' without migrating consumers
**Files:** src/middleware/session.py, src/auth/views.py
**Fix:** Reverted key rename in session.py; updated consumers to use new key
**Blast Radius:** MEDIUM — 3 callers affected, full test coverage
**Keywords:** session, key, auth, middleware, dict, KeyError
