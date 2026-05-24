import asyncio
import time
from typing import Any
from fastapi import WebSocket
from db import save_session, load_session


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
        session.update(kwargs)
        await save_session(session_id, session)

    async def connect(self, session_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.setdefault(session_id, []).append(ws)

    def disconnect(self, session_id: str, ws: WebSocket) -> None:
        if session_id in self._connections:
            self._connections[session_id] = [
                c for c in self._connections[session_id] if c is not ws
            ]

    async def broadcast(self, session_id: str, event: dict) -> None:
        dead: list[WebSocket] = []
        for ws in self._connections.get(session_id, []):
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(session_id, ws)


session_manager = SessionManager()
