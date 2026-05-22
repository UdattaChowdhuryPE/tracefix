import type { AgentEvent } from "../hooks/useAgentStream";

type RiskEvent = Extract<AgentEvent, { type: "regression_risk" }>;

const levelColors: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800 border-red-300",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-300",
  LOW: "bg-green-100 text-green-800 border-green-300",
};

export function RegressionRiskPanel({ event }: { event: RiskEvent }) {
  const cls = levelColors[event.risk_level] ?? levelColors.LOW;
  return (
    <div className={`border rounded-lg p-4 my-3 ${cls}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-bold text-sm">Regression Risk</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cls}`}>
          {event.risk_level} ({event.risk_score}/100)
        </span>
      </div>
      <p className="text-sm mb-3">{event.risk_explanation}</p>
      {event.downstream_callers.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">Downstream callers</p>
          <ul className="text-xs space-y-0.5 font-mono">
            {event.downstream_callers.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
      <div className="flex items-center gap-2 text-xs mt-2">
        <span className="opacity-70">Test coverage:</span>
        <span className="font-semibold capitalize">{event.test_coverage}</span>
      </div>
      {event.suggested_tests.length > 0 && (
        <div className="mt-2">
          <p className="text-xs opacity-70 mb-1">Suggested tests:</p>
          <ul className="text-xs space-y-0.5">
            {event.suggested_tests.map((t, i) => <li key={i}>• {t}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
