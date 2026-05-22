"use client";
import { useEffect, useRef } from "react";
import type { AgentEvent } from "../hooks/useAgentStream";
import { HypothesisCard } from "./HypothesisCard";
import { EscalationBanner } from "./EscalationBanner";

type EscalationEvent = Extract<AgentEvent, { type: "escalation" }>;

export function InvestigationStream({
  events,
  escalation,
  onResolveEscalation,
}: {
  events: AgentEvent[];
  escalation: EscalationEvent | null;
  onResolveEscalation: (decision: string, guidance?: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-1 text-sm font-mono">
      {escalation && (
        <EscalationBanner event={escalation} onResolve={onResolveEscalation} />
      )}
      {events.map((event, i) => {
        switch (event.type) {
          case "thinking":
            return (
              <span key={i} className="text-gray-700 leading-relaxed">
                {event.text}
              </span>
            );
          case "tool_call":
            return (
              <div key={i} className="my-2 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                <span className="text-blue-700 font-semibold text-xs uppercase">
                  &#9654; {event.tool}
                </span>
              </div>
            );
          case "hypothesis":
            return <HypothesisCard key={i} event={event} />;
          case "step":
            return (
              <div key={i} className="text-xs text-gray-400 italic">
                &rarr; {event.step}{event.summary ? `: ${event.summary}` : ""}
              </div>
            );
          case "memory_match":
            if (!event.matches.length) return null;
            return (
              <div key={i} className="my-2 bg-indigo-50 border border-indigo-200 rounded px-3 py-2 text-xs text-indigo-700 font-sans">
                🧠 {event.reasoning}
              </div>
            );
          case "assistant_message":
            return (
              <p key={i} className="text-gray-800 leading-relaxed my-2 font-sans">
                {event.content}
              </p>
            );
          case "complete":
            return (
              <div key={i} className="my-4 p-3 bg-green-50 border border-green-300 rounded text-green-800 font-sans font-semibold">
                &#10003; Investigation complete
              </div>
            );
          case "error":
            return (
              <div key={i} className="my-2 p-3 bg-red-50 border border-red-300 rounded text-red-700 font-sans">
                Error: {event.message}
              </div>
            );
          default:
            return null;
        }
      })}
      <div ref={bottomRef} />
    </div>
  );
}
