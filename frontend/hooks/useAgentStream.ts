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
  | { type: "tool_call"; tool: string; args: unknown }
  | { type: "tool_result"; tool: string; content: string }
  | { type: "triage_result"; is_regression: boolean; category: string; confidence: number; suggested_approach: string; reason: string }
  | { type: "memory_match"; matches: MemoryMatch[]; reasoning: string }
  | { type: "hypothesis"; validated: boolean; confidence: number; evidence: string; revised_hypothesis: string | null }
  | { type: "escalation"; reason: string; confidence: number; hypothesis: string }
  | { type: "escalation_resolved"; decision: string; guidance: string }
  | { type: "blast_radius"; score: number; risk_level: string; impacted_modules: string[]; callers: string[]; summary: string }
  | { type: "commit_intelligence"; commit_hash: string; risk_assessment: string; risk_reasons: string[]; dependency_changes: string[]; affected_services: string[] }
  | { type: "patch_ready"; patch: string; files_modified: string[]; lines_changed: number; explanation: string }
  | { type: "regression_risk"; risk_score: number; risk_level: string; downstream_callers: string[]; test_coverage: string; suggested_tests: string[]; risk_explanation: string }
  | { type: "step"; step: string; summary?: string; ts?: string }
  | { type: "assistant_message"; content: string; stop_reason: string }
  | { type: "complete"; content?: string; pr_url?: string }
  | { type: "error"; message: string }
  | { type: "session_state"; status: string }
  | { type: "ping" };

export function useAgentStream(sessionId: string) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [escalation, setEscalation] = useState<Extract<AgentEvent, { type: "escalation" }> | null>(null);
  const [triageResult, setTriageResult] = useState<Extract<AgentEvent, { type: "triage_result" }> | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

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
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = () => setError("WebSocket connection failed");

    return () => ws.close();
  }, [sessionId]);

  const resolveEscalation = async (decision: string, guidance = "") => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
    await fetch(`${backendUrl}/api/sessions/${sessionId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, guidance }),
    });
  };

  return { events, escalation, triageResult, isComplete, error, resolveEscalation };
}
