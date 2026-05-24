import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


async def test_create_session(client):
    r = await client.post("/api/sessions", json={"repo_url": "https://github.com/x/y", "error_text": "TypeError"})
    assert r.status_code == 200
    data = r.json()
    assert "session_id" in data
    assert "review_token" in data


async def test_get_session_not_found(client):
    r = await client.get("/api/sessions/nonexistent-id")
    assert r.status_code == 404


async def test_get_session_found(client):
    create = await client.post("/api/sessions", json={"repo_url": "https://github.com/a/b", "error_text": "err"})
    session_id = create.json()["session_id"]
    r = await client.get(f"/api/sessions/{session_id}")
    assert r.status_code == 200
    assert r.json()["status"] == "created"
    assert "review_token" not in r.json()
    assert "error_text" not in r.json()


async def test_submit_review_session_not_found(client):
    r = await client.post("/api/sessions/bad-id/review", json={"decision": "approve"}, headers={"X-Review-Token": "bad"})
    assert r.status_code == 404


async def test_submit_review_ok(client):
    create = await client.post("/api/sessions", json={"repo_url": "https://github.com/a/b", "error_text": "err"})
    session_data = create.json()
    session_id = session_data["session_id"]
    review_token = session_data["review_token"]
    r = await client.post(f"/api/sessions/{session_id}/review", json={"decision": "approve", "guidance": ""}, headers={"X-Review-Token": review_token})
    assert r.status_code == 200
    assert r.json() == {"ok": True}


async def test_submit_review_wrong_token(client):
    create = await client.post("/api/sessions", json={"repo_url": "https://github.com/a/b", "error_text": "err"})
    session_id = create.json()["session_id"]
    r = await client.post(f"/api/sessions/{session_id}/review", json={"decision": "approve"}, headers={"X-Review-Token": "wrong"})
    assert r.status_code == 403


async def test_internal_escalate(client):
    with patch.dict(os.environ, {"INTERNAL_API_SECRET": "test-secret"}):
        create = await client.post("/api/sessions", json={"repo_url": "https://github.com/a/b", "error_text": "err"})
        session_id = create.json()["session_id"]
        r = await client.post(
            f"/internal/escalate/{session_id}",
            json={"reason": "low confidence", "confidence": 0.4, "hypothesis": "maybe X", "evidence": ""},
            headers={"X-Internal-Secret": "test-secret"},
        )
        assert r.status_code == 200
        assert r.json() == {"ok": True}


async def test_internal_escalate_wrong_secret(client):
    with patch.dict(os.environ, {"INTERNAL_API_SECRET": "test-secret"}):
        create = await client.post("/api/sessions", json={"repo_url": "https://github.com/a/b", "error_text": "err"})
        session_id = create.json()["session_id"]
        r = await client.post(
            f"/internal/escalate/{session_id}",
            json={"reason": "low confidence", "confidence": 0.4, "hypothesis": "maybe X", "evidence": ""},
            headers={"X-Internal-Secret": "wrong-secret"},
        )
        assert r.status_code == 403


async def test_internal_get_decision_pending(client):
    with patch.dict(os.environ, {"INTERNAL_API_SECRET": "test-secret"}):
        create = await client.post("/api/sessions", json={"repo_url": "https://github.com/a/b", "error_text": "err"})
        session_id = create.json()["session_id"]
        await client.post(
            f"/internal/escalate/{session_id}",
            json={"reason": "low confidence", "confidence": 0.4, "hypothesis": "", "evidence": ""},
            headers={"X-Internal-Secret": "test-secret"},
        )
        r = await client.get(f"/internal/escalate/{session_id}/decision", headers={"X-Internal-Secret": "test-secret"})
        assert r.status_code == 200
        assert r.json()["decision"] == "pending"
