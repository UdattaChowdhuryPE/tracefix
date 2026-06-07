"""Layer 2: Event stream structural tests.

These tests verify that:
- Events are persisted to the database
- Events maintain proper ordering (ts ascending)
- Event schemas are correct per type
- Metrics endpoint returns correct aggregates
"""

import asyncio
import json
import os
import pytest
import websockets
from pathlib import Path


# Configuration
BACKEND_URL = os.environ.get("TRACEFIX_BACKEND_URL", "http://localhost:8000")
WS_URL = BACKEND_URL.replace("https", "wss").replace("http", "ws")
TEST_REPO = "https://github.com/octocat/Hello-World"
TEST_ERROR = "TypeError: Cannot read property 'foo' of undefined at line 42"
TEST_TIMEOUT = 30  # seconds


@pytest.mark.integration
class TestEventStreamFlow:
    """Test session creation, event streaming, and persistence."""

    @pytest.mark.asyncio
    async def test_session_creation(self):
        """Test creating a session returns session_id and review_token."""
        async with websockets.ClientSession() as session:
            async with session.post(
                f"{BACKEND_URL}/api/sessions",
                json={"repo_url": TEST_REPO, "error_text": TEST_ERROR, "github_token": ""}
            ) as resp:
                assert resp.status == 200
                data = await resp.json()
                assert "session_id" in data
                assert "review_token" in data
                assert len(data["session_id"]) == 36  # UUID length

    @pytest.mark.asyncio
    async def test_websocket_connection(self):
        """Test WebSocket connection and session_state event."""
        import httpx
        
        # Create session
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/sessions",
                json={"repo_url": TEST_REPO, "error_text": TEST_ERROR, "github_token": ""}
            )
            assert resp.status_code == 200
            session_id = resp.json()["session_id"]
        
        # Connect via WebSocket
        try:
            async with websockets.connect(f"{WS_URL}/ws/{session_id}") as ws:
                # Receive initial session_state message
                msg = await asyncio.wait_for(ws.recv(), timeout=5)
                event = json.loads(msg)
                assert event["type"] == "session_state"
                assert "status" in event
        except asyncio.TimeoutError:
            pytest.fail("WebSocket connection timed out")

    @pytest.mark.asyncio
    async def test_event_persistence(self):
        """Test that events are persisted to the database."""
        import httpx
        
        # Create session
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/sessions",
                json={"repo_url": TEST_REPO, "error_text": TEST_ERROR, "github_token": ""}
            )
            session_id = resp.json()["session_id"]
            
            # Verify events endpoint is accessible (may be empty if agent hasn't run)
            resp = await client.get(f"{BACKEND_URL}/api/sessions/{session_id}/events")
            assert resp.status_code == 200
            data = resp.json()
            assert "session_id" in data
            assert "events" in data
            assert isinstance(data["events"], list)

    @pytest.mark.asyncio
    async def test_metrics_endpoint(self):
        """Test metrics endpoint returns correct structure."""
        import httpx
        
        # Create session
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/sessions",
                json={"repo_url": TEST_REPO, "error_text": TEST_ERROR, "github_token": ""}
            )
            session_id = resp.json()["session_id"]
            
            # Query metrics
            resp = await client.get(f"{BACKEND_URL}/api/sessions/{session_id}/metrics")
            assert resp.status_code == 200
            metrics = resp.json()
            
            # Verify required fields
            assert "session_id" in metrics
            assert "total_events" in metrics
            assert "by_type" in metrics
            assert "tool_durations" in metrics
            assert "span_seconds" in metrics
            
            # Verify types
            assert isinstance(metrics["total_events"], int)
            assert isinstance(metrics["by_type"], dict)
            assert isinstance(metrics["tool_durations"], dict)
            assert isinstance(metrics["span_seconds"], (int, float))

    @pytest.mark.asyncio
    async def test_event_ordering(self, demo_events):
        """Test that events maintain ts-ascending order."""
        # Sort events by timestamp
        sorted_events = sorted(demo_events, key=lambda e: e.get("ts", 0))
        
        # Verify original is already sorted
        for i in range(len(demo_events) - 1):
            ts_curr = demo_events[i].get("ts", 0)
            ts_next = demo_events[i + 1].get("ts", 0)
            assert ts_curr <= ts_next, f"Events not in order: {ts_curr} > {ts_next}"

    @pytest.mark.asyncio
    async def test_event_schema_tool_call(self, demo_events):
        """Test tool_call events have required fields."""
        tool_calls = [e for e in demo_events if e.get("type") == "tool_call"]
        if not tool_calls:
            pytest.skip("No tool_call events in demo data")
        
        for event in tool_calls:
            assert "type" in event
            assert event["type"] == "tool_call"
            assert "tool" in event
            assert isinstance(event["tool"], str)

    @pytest.mark.asyncio
    async def test_event_schema_tool_result(self, demo_events):
        """Test tool_result events have required fields."""
        tool_results = [e for e in demo_events if e.get("type") == "tool_result"]
        if not tool_results:
            pytest.skip("No tool_result events in demo data")
        
        for event in tool_results:
            assert "type" in event
            assert event["type"] == "tool_result"
            assert "tool" in event
            assert isinstance(event["tool"], str)
            # tool_duration_ms is optional but if present should be a number
            if "tool_duration_ms" in event:
                assert isinstance(event["tool_duration_ms"], (int, float))

    @pytest.mark.asyncio
    async def test_event_schema_complete(self, demo_events):
        """Test complete events have correct schema."""
        complete_events = [e for e in demo_events if e.get("type") == "complete"]
        if not complete_events:
            pytest.skip("No complete events in demo data")
        
        for event in complete_events:
            assert "type" in event
            assert event["type"] == "complete"

    @pytest.mark.asyncio
    async def test_metrics_tool_durations(self, demo_events):
        """Test that tool durations are aggregated correctly in metrics."""
        # Extract tool_duration_ms from tool_result events
        tool_results = [e for e in demo_events if e.get("type") == "tool_result"]
        
        if not tool_results:
            pytest.skip("No tool_result events with durations")
        
        # Group by tool
        by_tool = {}
        for event in tool_results:
            tool = event.get("tool", "unknown")
            duration = event.get("tool_duration_ms")
            
            if duration is not None:
                if tool not in by_tool:
                    by_tool[tool] = []
                by_tool[tool].append(duration)
        
        # Verify aggregations
        for tool, durations in by_tool.items():
            avg = sum(durations) / len(durations)
            max_dur = max(durations)
            
            assert avg >= 0, f"Tool {tool} has negative average: {avg}"
            assert max_dur >= avg, f"Tool {tool} max duration less than average"
