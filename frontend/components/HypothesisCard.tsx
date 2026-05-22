import type { AgentEvent } from "../hooks/useAgentStream";

type HypothesisEvent = Extract<AgentEvent, { type: "hypothesis" }>;

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color =
    confidence >= 80 ? "bg-green-100 text-green-800" :
    confidence >= 60 ? "bg-yellow-100 text-yellow-800" :
    "bg-red-100 text-red-800";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {confidence}% confidence
    </span>
  );
}

export function HypothesisCard({ event }: { event: HypothesisEvent }) {
  return (
    <div className={`border rounded-lg p-4 my-3 ${
      event.validated
        ? "border-green-300 bg-green-50"
        : "border-yellow-300 bg-yellow-50"
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-semibold text-sm">
          {event.validated ? "✓ Root Cause Validated" : "⚠ Validation Inconclusive"}
        </span>
        <ConfidenceBadge confidence={event.confidence} />
      </div>
      <p className="text-sm text-gray-700">{event.evidence}</p>
      {event.revised_hypothesis && (
        <p className="text-sm text-yellow-800 mt-2 italic">
          Revised: {event.revised_hypothesis}
        </p>
      )}
    </div>
  );
}
