import type { AgentEvent } from "../hooks/useAgentStream";

type CommitEvent = Extract<AgentEvent, { type: "commit_intelligence" }>;

const riskColors: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800 border-red-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  LOW: "bg-green-100 text-green-800 border-green-200",
};

export function CommitIntelligence({ event }: { event: CommitEvent }) {
  const riskClass = riskColors[event.risk_assessment] ?? riskColors.LOW;
  return (
    <div className={`border rounded-lg p-4 my-3 ${riskClass}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="font-bold text-sm">Commit Intelligence</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${riskClass}`}>
          {event.risk_assessment} RISK
        </span>
        <span className="text-xs text-gray-600 font-mono ml-auto">{event.commit_hash.slice(0, 8)}</span>
      </div>
      {event.risk_reasons.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold mb-1 uppercase tracking-wide opacity-70">Why risky</p>
          <ul className="text-sm space-y-0.5">
            {event.risk_reasons.map((r, i) => <li key={i}>• {r}</li>)}
          </ul>
        </div>
      )}
      {event.dependency_changes.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold mb-1 uppercase tracking-wide opacity-70">Dependency changes</p>
          <ul className="text-sm space-y-0.5">
            {event.dependency_changes.map((d, i) => <li key={i} className="font-mono text-xs">{d}</li>)}
          </ul>
        </div>
      )}
      {event.affected_services.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1 uppercase tracking-wide opacity-70">Affected services</p>
          <div className="flex flex-wrap gap-1">
            {event.affected_services.map((s) => (
              <span key={s} className="bg-white/60 border text-xs px-2 py-0.5 rounded">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
