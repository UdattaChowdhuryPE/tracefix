import asyncio
from typing import Any
from fastapi import WebSocket


class SessionManager:
    def __init__(self):
        self._sessions: dict[str, dict] = {}
        self._connections: dict[str, list[WebSocket]] = {}

    def create(self, session_id: str, meta: dict) -> None:
        self._sessions[session_id] = {"status": "created", "result": None, **meta}
        self._connections[session_id] = []

    def get(self, session_id: str) -> dict | None:
        return self._sessions.get(session_id)

    def update(self, session_id: str, **kwargs) -> None:
        if session_id in self._sessions:
            self._sessions[session_id].update(kwargs)

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
