import asyncio
from typing import Any


class EscalationHandler:
    def __init__(self):
        self._pending: dict[str, asyncio.Event] = {}
        self._decisions: dict[str, dict] = {}
        self._payloads: dict[str, dict] = {}

    def register(self, session_id: str, payload: dict) -> None:
        """Called when request_human_review tool signals escalation."""
        self._pending[session_id] = asyncio.Event()
        self._payloads[session_id] = payload

    def is_pending(self, session_id: str) -> bool:
        return session_id in self._pending and not self._pending[session_id].is_set()

    def get_payload(self, session_id: str) -> dict | None:
        return self._payloads.get(session_id)

    async def wait_for_decision(self, session_id: str, timeout: float = 300.0) -> dict:
        evt = self._pending.get(session_id)
        if evt is None:
            return {"decision": "approve", "guidance": ""}
        try:
            await asyncio.wait_for(evt.wait(), timeout=timeout)
        except asyncio.TimeoutError:
            return {"decision": "approve", "guidance": "", "note": "timeout_auto_approved"}
        return self._decisions.pop(session_id, {"decision": "approve", "guidance": ""})

    def resolve(self, session_id: str, decision: str, guidance: str = "") -> None:
        self._decisions[session_id] = {"decision": decision, "guidance": guidance}
        if session_id in self._pending:
            self._pending[session_id].set()

    def get_decision(self, session_id: str) -> dict | None:
        """For polling by the shell script."""
        if session_id not in self._pending:
            return None
        if not self._pending[session_id].is_set():
            return {"decision": "pending"}
        return self._decisions.get(session_id, {"decision": "approve"})

    def clear(self, session_id: str) -> None:
        """Clear escalation state on session cancellation."""
        self._pending.pop(session_id, None)
        self._decisions.pop(session_id, None)
        self._payloads.pop(session_id, None)


escalation_handler = EscalationHandler()
