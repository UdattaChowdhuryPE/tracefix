import type { AgentEvent } from "../hooks/useAgentStream";

type BlastEvent = Extract<AgentEvent, { type: "blast_radius" }>;

const levelColors: Record<string, string> = {
  HIGH: "bg-red-500",
  MEDIUM: "bg-yellow-400",
  LOW: "bg-green-500",
};

export function BlastRadiusMap({ event }: { event: BlastEvent }) {
  const barColor = levelColors[event.risk_level] ?? levelColors.LOW;
  return (
    <div className="border border-gray-200 rounded-lg p-4 my-3 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-bold text-sm">Blast Radius</span>
        <span className={`text-white text-xs font-bold px-2 py-0.5 rounded-full ${barColor}`}>
          {event.risk_level}
        </span>
      </div>
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Risk score</span>
          <span>{event.score}/100</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(event.score, 100)}%` }}
          />
        </div>
      </div>
      {event.impacted_modules.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold mb-1 uppercase tracking-wide text-gray-500">Impacted modules</p>
          <div className="flex flex-wrap gap-1">
            {event.impacted_modules.map((m) => (
              <span key={m} className="bg-gray-100 border text-xs px-2 py-0.5 rounded font-mono">{m}</span>
            ))}
          </div>
        </div>
      )}
      {event.callers.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1 uppercase tracking-wide text-gray-500">Callers</p>
          <ul className="text-xs space-y-0.5 text-gray-700">
            {event.callers.slice(0, 5).map((c, i) => (
              <li key={i} className="font-mono">{c}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-gray-600 mt-2 italic">{event.summary}</p>
    </div>
  );
}
