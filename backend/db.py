import asyncio
import json
import logging
import os
import sqlite3
import time
from pathlib import Path
from typing import Any

from logging_config import configure_logging

logger = logging.getLogger("tracefix.db")

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
            # Add duration_ms column if it doesn't exist (migration)
            try:
                conn.execute("ALTER TABLE sessions ADD COLUMN duration_ms REAL")
            except sqlite3.OperationalError:
                pass  # Column already exists
            conn.commit()
        except Exception as e:
            logger.exception("Failed to initialize database", extra={"error": str(e)})
            raise
        finally:
            conn.close()

    await loop.run_in_executor(None, _init)


async def save_session(session_id: str, data: dict[str, Any]) -> None:
    """Save a session to the database."""
    loop = asyncio.get_event_loop()

    def _save():
        conn = get_db()
        try:
            created_at = data.get("created_at", time.time())
            updated_at = time.time()
            result_json = json.dumps(data.get("result")) if data.get("result") else None
            duration_ms = data.get("duration_ms")

            conn.execute(
                """
                INSERT OR REPLACE INTO sessions
                (session_id, status, repo_url, error_text, result, review_token, created_at, updated_at, duration_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    duration_ms,
                ),
            )
            conn.commit()
        except Exception as e:
            logger.exception("Failed to save session", extra={"session_id": session_id, "error": str(e)})
            raise
        finally:
            conn.close()

    await loop.run_in_executor(None, _save)


async def insert_event(session_id: str, event: dict[str, Any]) -> None:
    """Persist an event to the session event log."""
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
        except Exception as e:
            logger.exception("Failed to insert event", extra={"session_id": session_id, "event_type": event.get("type"), "error": str(e)})
            raise
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
        except Exception as e:
            logger.exception("Failed to load events", extra={"session_id": session_id, "error": str(e)})
            raise
        finally:
            conn.close()

    return await loop.run_in_executor(None, _load)


async def load_session_metrics(session_id: str) -> dict[str, Any]:
    """Load aggregated metrics for a session from its event log."""
    loop = asyncio.get_event_loop()

    def _load_metrics():
        conn = get_db()
        try:
            rows = conn.execute(
                "SELECT payload, ts FROM session_events WHERE session_id = ? ORDER BY ts ASC",
                (session_id,),
            ).fetchall()
            
            if not rows:
                return {
                    "total_events": 0,
                    "by_type": {},
                    "tool_durations": {},
                    "span_seconds": 0,
                }
            
            by_type = {}
            tool_durations = {}
            timestamps = []
            
            for row in rows:
                event = json.loads(row["payload"])
                ts = row["ts"]
                timestamps.append(ts)
                
                event_type = event.get("type", "unknown")
                if event_type not in by_type:
                    by_type[event_type] = 0
                by_type[event_type] += 1
                
                # Extract tool timing if present
                if event_type == "tool_result" and "tool_duration_ms" in event:
                    tool_name = event.get("tool", "unknown")
                    if tool_name not in tool_durations:
                        tool_durations[tool_name] = {"count": 0, "total_ms": 0, "max_ms": 0}
                    duration = event["tool_duration_ms"]
                    tool_durations[tool_name]["count"] += 1
                    tool_durations[tool_name]["total_ms"] += duration
                    tool_durations[tool_name]["max_ms"] = max(tool_durations[tool_name]["max_ms"], duration)
            
            # Calculate averages for tools
            for tool_name in tool_durations:
                data = tool_durations[tool_name]
                data["avg_ms"] = round(data["total_ms"] / data["count"], 2) if data["count"] > 0 else 0
                del data["total_ms"]  # Remove intermediate sum
            
            span_seconds = (timestamps[-1] - timestamps[0]) if len(timestamps) > 1 else 0
            
            return {
                "total_events": len(rows),
                "by_type": by_type,
                "tool_durations": tool_durations,
                "span_seconds": round(span_seconds, 2),
            }
        except Exception as e:
            logger.exception("Failed to load metrics", extra={"session_id": session_id, "error": str(e)})
            raise
        finally:
            conn.close()
    
    return await loop.run_in_executor(None, _load_metrics)


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
        except Exception as e:
            logger.exception("Failed to load session", extra={"session_id": session_id, "error": str(e)})
            raise
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
        except Exception as e:
            logger.exception("Failed to load all sessions", extra={"error": str(e)})
            raise
        finally:
            conn.close()

    return await loop.run_in_executor(None, _load_all)
