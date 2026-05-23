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
    <div className="border border-slate-600 rounded-lg p-4 my-3 bg-slate-800/50">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-bold text-sm text-slate-100">Blast Radius</span>
        <span className={`text-white text-xs font-bold px-2 py-0.5 rounded-full ${barColor}`}>
          {event.risk_level}
        </span>
      </div>
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Risk score</span>
          <span>{event.score}/100</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(event.score, 100)}%` }}
          />
        </div>
      </div>
      {event.impacted_modules.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold mb-1 uppercase tracking-wide text-slate-400">Impacted modules</p>
          <div className="flex flex-wrap gap-1">
            {event.impacted_modules.map((m) => (
              <span key={m} className="bg-slate-700/60 border border-slate-600 text-slate-300 text-xs px-2 py-0.5 rounded font-mono">{m}</span>
            ))}
          </div>
        </div>
      )}
      {event.callers.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1 uppercase tracking-wide text-slate-400">Callers</p>
          <ul className="text-xs space-y-0.5 text-slate-300">
            {event.callers.slice(0, 5).map((c, i) => (
              <li key={i} className="font-mono">{c}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-slate-400 mt-2 italic">{event.summary}</p>
    </div>
  );
}
