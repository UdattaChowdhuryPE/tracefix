"use client";
import { useState } from "react";
import type { AgentEvent } from "../hooks/useAgentStream";

type EscalationEvent = Extract<AgentEvent, { type: "escalation" }>;

export function EscalationBanner({
  event,
  onResolve,
}: {
  event: EscalationEvent;
  onResolve: (decision: string, guidance?: string) => void;
}) {
  const [guidance, setGuidance] = useState("");

  return (
    <div className="border-l-4 border-orange-500 bg-orange-50 rounded-r-lg p-5 my-4 shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">&#9888;</span>
        <h3 className="font-bold text-orange-900 text-lg">Human Review Required</h3>
        <span className="ml-auto bg-orange-200 text-orange-800 text-xs font-semibold px-2 py-1 rounded-full">
          Confidence: {event.confidence}%
        </span>
      </div>
      <p className="text-orange-800 mb-3">{event.reason}</p>
      {event.hypothesis && (
        <p className="text-sm text-orange-700 italic mb-3">
          Current hypothesis: {event.hypothesis}
        </p>
      )}
      <textarea
        value={guidance}
        onChange={(e) => setGuidance(e.target.value)}
        placeholder="Optional: provide guidance to the agent before approving..."
        className="w-full mt-1 p-2 border border-orange-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
        rows={3}
      />
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onResolve("approve", guidance)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors uppercase tracking-wide"
        >
          Approve &amp; Continue
        </button>
        {guidance && (
          <button
            onClick={() => onResolve("guide", guidance)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors uppercase tracking-wide"
          >
            Send Guidance
          </button>
        )}
        <button
          onClick={() => onResolve("reject")}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors uppercase tracking-wide"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
