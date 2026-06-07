import asyncio
import logging
import time
from typing import Any
from fastapi import WebSocket
from db import save_session, load_session, insert_event

logger = logging.getLogger("tracefix.session_manager")


class SessionManager:
    def __init__(self):
        self._sessions: dict[str, dict] = {}
        self._connections: dict[str, list[WebSocket]] = {}

    async def create(self, session_id: str, meta: dict) -> None:
        self._sessions[session_id] = {
            "session_id": session_id,
            "status": "created",
            "result": None,
            "created_at": time.time(),
            **meta,
        }
        self._connections[session_id] = []
        await save_session(session_id, self._sessions[session_id])
        logger.info("session_created", extra={"session_id": session_id})

    async def get(self, session_id: str) -> dict | None:
        # Try cache first
        if session_id in self._sessions:
            return self._sessions[session_id]
        # Load from DB if not cached
        data = await load_session(session_id)
        if data:
            self._sessions[session_id] = data
        return data

    async def update(self, session_id: str, **kwargs) -> None:
        session = self._sessions.get(session_id)
        if session is None:
            session = await load_session(session_id)
            if session is None:
                return
            self._sessions[session_id] = session
        
        old_status = session.get("status")
        session.update(kwargs)
        new_status = session.get("status")
        
        # Log status transitions
        if old_status != new_status:
            logger.info("session_status_transition", extra={
                "session_id": session_id,
                "old_status": old_status,
                "new_status": new_status,
            })
        
        await save_session(session_id, session)

    async def connect(self, session_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.setdefault(session_id, []).append(ws)

    def disconnect(self, session_id: str, ws: WebSocket) -> None:
        if session_id in self._connections:
            before = len(self._connections[session_id])
            self._connections[session_id] = [
                c for c in self._connections[session_id] if c is not ws
            ]
            after = len(self._connections[session_id])
            if before > after:
                logger.info("websocket_disconnected", extra={"session_id": session_id})

    async def broadcast(self, session_id: str, event: dict) -> None:
        await insert_event(session_id, event)
        dead: list[WebSocket] = []
        for ws in self._connections.get(session_id, []):
            try:
                await ws.send_json(event)
            except Exception as e:
                logger.warning("websocket_send_failed", extra={
                    "session_id": session_id,
                    "event_type": event.get("type"),
                    "error": str(e),
                })
                dead.append(ws)
        for ws in dead:
            self.disconnect(session_id, ws)


session_manager = SessionManager()
