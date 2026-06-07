from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

import asyncio
import os
import secrets
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from session_manager import session_manager
from escalation_handler import escalation_handler
from agent_runner import run_agent
from db import init_db, load_all_sessions, load_session_events


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Mark orphaned running sessions as error
    for s in await load_all_sessions():
        if s.get("status") == "running":
            await session_manager.update(s["session_id"], status="error")
    yield


app = FastAPI(title="TraceFix API", lifespan=lifespan)

allowed_origins = os.environ.get("CORS_ALLOW_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def require_internal_secret(x_internal_secret: str = Header(...)):
    expected = os.environ.get("INTERNAL_API_SECRET")
    if not expected:
        raise HTTPException(500, "Server misconfiguration: INTERNAL_API_SECRET not set")
    if x_internal_secret != expected:
        raise HTTPException(403, "Forbidden")
    return True


def require_review_token(session_id: str, x_review_token: str = Header(...)):
    # This will be validated in the route handler after loading the session
    return x_review_token


class CreateSessionRequest(BaseModel):
    repo_url: str
    error_text: str
    github_token: str = ""


class RunSessionRequest(BaseModel):
    repo_url: str
    error_text: str
    github_token: str = ""


class ReviewDecisionRequest(BaseModel):
    decision: str  # approve | reject | guide
    guidance: str = ""


class EscalationPayload(BaseModel):
    reason: str
    confidence: float
    hypothesis: str = ""
    evidence: str = ""


def public_session_view(session: dict) -> dict:
    return {
        key: value
        for key, value in session.items()
        if key not in {"review_token", "github_token", "proc", "error_text"}
    }


# --- Session endpoints ---

@app.post("/api/sessions")
async def create_session(body: CreateSessionRequest):
    session_id = str(uuid.uuid4())
    review_token = secrets.token_hex(32)
    await session_manager.create(session_id, {
        "repo_url": body.repo_url,
        "error_text": body.error_text,
        "review_token": review_token,
    })
    return {"session_id": session_id, "review_token": review_token}


@app.post("/api/sessions/{session_id}/run", status_code=202)
async def run_session(
    session_id: str,
    body: RunSessionRequest,
    background_tasks: BackgroundTasks,
):
    session = await session_manager.get(session_id)
    if session is None:
        raise HTTPException(404, "Session not found")
    if session.get("status") == "running":
        raise HTTPException(409, "Session already running")

    background_tasks.add_task(
        run_agent,
        session_id=session_id,
        repo_url=body.repo_url,
        error_text=body.error_text,
        github_token=body.github_token,
    )
    return {"session_id": session_id, "status": "started"}


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    session = await session_manager.get(session_id)
    if session is None:
        raise HTTPException(404, "Session not found")
    return public_session_view(session)


@app.get("/api/sessions/{session_id}/events")
async def get_session_events(session_id: str):
    session = await session_manager.get(session_id)
    if session is None:
        raise HTTPException(404, "Session not found")
    events = await load_session_events(session_id)
    return {"session_id": session_id, "events": events}


@app.post("/api/sessions/{session_id}/review")
async def submit_review(session_id: str, body: ReviewDecisionRequest, x_review_token: str = Header(...)):
    session = await session_manager.get(session_id)
    if session is None:
        raise HTTPException(404, "Session not found")
    if session.get("review_token") != x_review_token:
        raise HTTPException(403, "Invalid review token")
    escalation_handler.resolve(session_id, body.decision, body.guidance)
    await session_manager.broadcast(session_id, {
        "type": "escalation_resolved",
        "decision": body.decision,
        "guidance": body.guidance,
    })
    return {"ok": True}


# --- WebSocket ---

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await session_manager.connect(session_id, websocket)
    try:
        # Send current session state on connect
        session = await session_manager.get(session_id)
        if session:
            await websocket.send_json({"type": "session_state", "status": session.get("status")})
        # Keep connection alive
        while True:
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        session_manager.disconnect(session_id, websocket)
    except Exception:
        session_manager.disconnect(session_id, websocket)


# --- Internal escalation endpoints (called by request_human_review.sh) ---

@app.post("/internal/escalate/{session_id}")
async def internal_escalate(session_id: str, payload: EscalationPayload, _: bool = Depends(require_internal_secret)):
    escalation_handler.register(session_id, payload.model_dump())
    await session_manager.broadcast(session_id, {
        "type": "escalation",
        **payload.model_dump(),
    })
    return {"ok": True}


@app.get("/internal/escalate/{session_id}/decision")
async def internal_get_decision(session_id: str, _: bool = Depends(require_internal_secret)):
    decision = escalation_handler.get_decision(session_id)
    if decision is None:
        return {"decision": "pending"}
    return decision


# --- Health ---

@app.get("/health")
async def health():
    return {"status": "ok"}
