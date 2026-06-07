import asyncio
import json
import os
import sqlite3
import time
from pathlib import Path
from typing import Any

DB_PATH = Path(os.environ.get("SESSIONS_DB_PATH", "tracefix_sessions.db"))


def get_db():
    """Get a thread-safe connection to the sessions database."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


async def init_db() -> None:
    """Initialize the database schema."""
    loop = asyncio.get_event_loop()

    def _init():
        conn = get_db()
        try:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    repo_url TEXT,
                    error_text TEXT,
                    result TEXT,
                    review_token TEXT,
                    created_at REAL,
                    updated_at REAL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS session_events (
                    id        INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL REFERENCES sessions(session_id),
                    event_type TEXT NOT NULL,
                    payload    TEXT NOT NULL,
                    ts         REAL NOT NULL
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_session_events_session_id 
                ON session_events(session_id)
            """)
            conn.commit()
        finally:
            conn.close()

    await loop.run_in_executor(None, _init)


async def save_session(session_id: str, data: dict[str, Any]) -> None:
    """Save a session to the database."""
    import time

    loop = asyncio.get_event_loop()

    def _save():
        conn = get_db()
        try:
            created_at = data.get("created_at", time.time())
            updated_at = time.time()
            result_json = json.dumps(data.get("result")) if data.get("result") else None

            conn.execute(
                """
                INSERT OR REPLACE INTO sessions
                (session_id, status, repo_url, error_text, result, review_token, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    data.get("status"),
                    data.get("repo_url"),
                    data.get("error_text"),
                    result_json,
                    data.get("review_token"),
                    created_at,
                    updated_at,
                ),
            )
            conn.commit()
        finally:
            conn.close()

    await loop.run_in_executor(None, _save)


async def insert_event(session_id: str, event: dict[str, Any]) -> None:
    """Persist an event to the session event log."""
    import time

    loop = asyncio.get_event_loop()

    def _insert():
        conn = get_db()
        try:
            ts = time.time()
            conn.execute(
                """
                INSERT INTO session_events (session_id, event_type, payload, ts)
                VALUES (?, ?, ?, ?)
                """,
                (
                    session_id,
                    event.get("type", "unknown"),
                    json.dumps(event),
                    ts,
                ),
            )
            conn.commit()
        finally:
            conn.close()

    await loop.run_in_executor(None, _insert)


async def load_session_events(session_id: str) -> list[dict[str, Any]]:
    """Load all events for a session."""
    loop = asyncio.get_event_loop()

    def _load():
        conn = get_db()
        try:
            rows = conn.execute(
                "SELECT payload FROM session_events WHERE session_id = ? ORDER BY ts ASC",
                (session_id,),
            ).fetchall()
            return [json.loads(row["payload"]) for row in rows]
        finally:
            conn.close()

    return await loop.run_in_executor(None, _load)


async def load_session(session_id: str) -> dict[str, Any] | None:
    """Load a session from the database."""
    loop = asyncio.get_event_loop()

    def _load():
        conn = get_db()
        try:
            row = conn.execute(
                "SELECT * FROM sessions WHERE session_id = ?",
                (session_id,),
            ).fetchone()
            if not row:
                return None
            data = dict(row)
            if data.get("result"):
                data["result"] = json.loads(data["result"])
            return data
        finally:
            conn.close()

    return await loop.run_in_executor(None, _load)


async def load_all_sessions() -> list[dict[str, Any]]:
    """Load all sessions from the database."""
    loop = asyncio.get_event_loop()

    def _load_all():
        conn = get_db()
        try:
            rows = conn.execute("SELECT * FROM sessions").fetchall()
            result = []
            for row in rows:
                data = dict(row)
                if data.get("result"):
                    data["result"] = json.loads(data["result"])
                result.append(data)
            return result
        finally:
            conn.close()

    return await loop.run_in_executor(None, _load_all)
