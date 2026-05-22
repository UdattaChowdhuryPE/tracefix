import pytest
from unittest.mock import AsyncMock, MagicMock
from session_manager import SessionManager


@pytest.fixture
def sm():
    return SessionManager()


def test_create_and_get(sm):
    sm.create("s1", {"repo_url": "https://github.com/x/y"})
    session = sm.get("s1")
    assert session is not None
    assert session["status"] == "created"
    assert session["repo_url"] == "https://github.com/x/y"


def test_get_missing_returns_none(sm):
    assert sm.get("does-not-exist") is None


def test_update(sm):
    sm.create("s1", {})
    sm.update("s1", status="running")
    assert sm.get("s1")["status"] == "running"


def test_update_nonexistent_is_noop(sm):
    sm.update("ghost", status="running")  # should not raise


async def test_connect_and_disconnect(sm):
    sm.create("s1", {})
    ws = AsyncMock()
    await sm.connect("s1", ws)
    ws.accept.assert_awaited_once()
    sm.disconnect("s1", ws)
    # After disconnect the websocket is removed
    assert ws not in sm._connections.get("s1", [])


async def test_broadcast_sends_to_all(sm):
    sm.create("s1", {})
    ws1, ws2 = AsyncMock(), AsyncMock()
    await sm.connect("s1", ws1)
    await sm.connect("s1", ws2)
    await sm.broadcast("s1", {"type": "ping"})
    ws1.send_json.assert_awaited_once_with({"type": "ping"})
    ws2.send_json.assert_awaited_once_with({"type": "ping"})


async def test_broadcast_removes_dead_connections(sm):
    sm.create("s1", {})
    ws_good = AsyncMock()
    ws_dead = AsyncMock()
    ws_dead.send_json.side_effect = Exception("closed")
    await sm.connect("s1", ws_good)
    await sm.connect("s1", ws_dead)
    await sm.broadcast("s1", {"type": "ping"})
    assert ws_dead not in sm._connections["s1"]
    assert ws_good in sm._connections["s1"]
