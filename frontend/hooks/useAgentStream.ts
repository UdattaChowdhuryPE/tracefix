"use client";
import { useEffect, useRef, useState } from "react";

export type MemoryMatch = {
  session_id: string;
  date: string;
  similarity: number;
  summary: string;
  root_cause_commit: string;
  fix_applied: string;
};

export type AgentEvent =
  | { type: "thinking"; text: string }
  | { type: "text_delta"; text: string }
  | { type: "tool_call"; tool: string; args: unknown }
  | { type: "tool_result"; tool: string; content: string; tool_duration_ms?: number }
  | { type: "triage_result"; is_regression: boolean; category: string; confidence: number; suggested_approach: string; reason: string }
  | { type: "memory_match"; matches: MemoryMatch[]; reasoning: string }
  | { type: "hypothesis"; validated: boolean; confidence: number; evidence: string; revised_hypothesis: string | null }
  | { type: "escalation"; reason: string; confidence: number; hypothesis: string }
  | { type: "escalation_resolved"; decision: string; guidance: string }
  | { type: "blast_radius"; score: number; risk_level: string; impacted_modules: string[]; callers: string[]; summary: string }
  | { type: "commit_intelligence"; commit_hash: string; risk_assessment: string; risk_reasons: string[]; dependency_changes: string[]; affected_services: string[] }
  | { type: "patch_ready"; patch: string; files_modified: string[]; lines_changed: number; explanation: string; tool_duration_ms?: number }
  | { type: "regression_risk"; risk_score: number; risk_level: string; downstream_callers: string[]; test_coverage: string; suggested_tests: string[]; risk_explanation: string }
  | { type: "step"; step: string; summary?: string; ts?: string }
  | { type: "assistant_message"; content: string; stop_reason: string }
  | { type: "pr_created"; pr_url: string; pr_number: number; branch: string }
  | { type: "complete"; content?: string; pr_url?: string }
  | { type: "error"; message: string }
  | { type: "session_state"; status: string }
  | { type: "ping" };

export function useAgentStream(sessionId: string, reviewToken: string = "") {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [escalation, setEscalation] = useState<Extract<AgentEvent, { type: "escalation" }> | null>(null);
  const [triageResult, setTriageResult] = useState<Extract<AgentEvent, { type: "triage_result" }> | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseErrorCount, setParseErrorCount] = useState(0);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reviewTokenRef = useRef(reviewToken);

  useEffect(() => {
    reviewTokenRef.current = reviewToken;
  }, [reviewToken]);

  useEffect(() => {
    if (!sessionId) return;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
    const wsUrl = backendUrl.replace(/^https/, "wss").replace(/^http/, "ws");
    const ws = new WebSocket(`${wsUrl}/ws/${sessionId}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const event: AgentEvent = JSON.parse(e.data);
        if (event.type === "ping") return;
        setEvents((prev) => [...prev, event]);
        if (event.type === "triage_result") setTriageResult(event);
        if (event.type === "escalation") setEscalation(event);
        if (event.type === "escalation_resolved") setEscalation(null);
        if (event.type === "complete") setIsComplete(true);
        if (event.type === "error") setError(event.message);
      } catch (e) {
        const errorMsg = `WebSocket parse error: ${e instanceof Error ? e.message : String(e)}`;
        console.warn("[useAgentStream] parse error:", e);
        setParseErrorCount((prev) => prev + 1);
      }
    };

    ws.onerror = () => setError("WebSocket connection failed");

    ws.onclose = () => {
      // Attempt to reconnect if not complete
      if (!isComplete && reconnectCount < 3) {
        const delay = 2000; // 2 seconds
        const timeout = setTimeout(() => {
          setReconnectCount((prev) => prev + 1);
          setRetryKey((prev) => prev + 1);
        }, delay);
        return () => clearTimeout(timeout);
      }
    };

    return () => ws.close();
  }, [sessionId, retryKey, isComplete, reconnectCount]);

  const resolveEscalation = async (decision: string, guidance = "") => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
    await fetch(`${backendUrl}/api/sessions/${sessionId}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Review-Token": reviewTokenRef.current,
      },
      body: JSON.stringify({ decision, guidance }),
    });
  };

  return { events, escalation, triageResult, isComplete, error, parseErrorCount, reconnectCount, resolveEscalation };
}
