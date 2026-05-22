import asyncio
import pytest
from escalation_handler import EscalationHandler


@pytest.fixture
def handler():
    return EscalationHandler()


def test_not_pending_before_register(handler):
    assert not handler.is_pending("sess-1")


def test_is_pending_after_register(handler):
    handler.register("sess-1", {"reason": "low confidence"})
    assert handler.is_pending("sess-1")


def test_get_payload_after_register(handler):
    payload = {"reason": "uncertain", "confidence": 0.5}
    handler.register("sess-1", payload)
    assert handler.get_payload("sess-1") == payload


def test_get_decision_pending(handler):
    handler.register("sess-1", {})
    assert handler.get_decision("sess-1") == {"decision": "pending"}


def test_resolve_clears_pending(handler):
    handler.register("sess-1", {})
    handler.resolve("sess-1", "approve")
    assert not handler.is_pending("sess-1")


def test_get_decision_after_resolve(handler):
    handler.register("sess-1", {})
    handler.resolve("sess-1", "reject", guidance="needs more info")
    result = handler.get_decision("sess-1")
    assert result["decision"] == "reject"


async def test_wait_for_decision_resolves(handler):
    handler.register("sess-1", {})

    async def _resolve_later():
        await asyncio.sleep(0.05)
        handler.resolve("sess-1", "approve", guidance="looks good")

    asyncio.create_task(_resolve_later())
    result = await handler.wait_for_decision("sess-1", timeout=2.0)
    assert result["decision"] == "approve"
    assert result["guidance"] == "looks good"


async def test_wait_for_decision_timeout_auto_approves(handler):
    handler.register("sess-1", {})
    result = await handler.wait_for_decision("sess-1", timeout=0.05)
    assert result["decision"] == "approve"
    assert result.get("note") == "timeout_auto_approved"


async def test_wait_without_register_returns_approve(handler):
    result = await handler.wait_for_decision("no-such-session", timeout=0.1)
    assert result == {"decision": "approve", "guidance": ""}
