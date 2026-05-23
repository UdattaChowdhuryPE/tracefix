"use client";
import { useEffect, useState } from "react";
import { DEMO_EVENTS } from "../data/demoEvents";
import type { AgentEvent } from "./useAgentStream";

export function useDemoStream() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [escalation, setEscalation] = useState<Extract<AgentEvent, { type: "escalation" }> | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: NodeJS.Timeout;
    let eventIndex = 0;

    const scheduleNext = () => {
      if (cancelled) return;
      if (eventIndex >= DEMO_EVENTS.length) {
        setIsComplete(true);
        return;
      }

      const event = DEMO_EVENTS[eventIndex];
      const nextEvent = DEMO_EVENTS[eventIndex + 1];

      let delay: number;
      if (event.type === "step") {
        delay = 1200;
      } else if (
        event.type === "memory_match" ||
        event.type === "hypothesis" ||
        event.type === "commit_intelligence" ||
        event.type === "blast_radius" ||
        event.type === "regression_risk" ||
        event.type === "patch_ready"
      ) {
        delay = 800;
      } else if (event.type === "tool_call" || event.type === "tool_result") {
        delay = 400;
      } else if (event.type === "thinking") {
        delay = 300;
      } else if (event.type === "complete") {
        delay = 600;
      } else {
        delay = 200;
      }

      if (nextEvent?.type === "step") {
        delay += 400;
      }

      timeoutId = setTimeout(() => {
        if (cancelled) return;
        setEvents((prev) => [...prev, event]);
        if (event.type === "escalation") setEscalation(event);
        if (event.type === "escalation_resolved") setEscalation(null);
        if (event.type === "complete") setIsComplete(true);
        if (event.type === "error") setError(event.message);

        eventIndex++;
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const resolveEscalation = async (decision: string, guidance = "") => {
    setEscalation(null);
  };

  return { events, escalation, isComplete, error, resolveEscalation };
}
