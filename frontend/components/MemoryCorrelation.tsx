import type { MemoryMatch } from "../hooks/useAgentStream";

export function MemoryCorrelation({
  matches,
  reasoning,
}: {
  matches: MemoryMatch[];
  reasoning: string;
}) {
  if (!matches.length) return null;

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-indigo-600 font-bold text-sm uppercase tracking-wide">Memory</span>
        <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
          {matches.length} match{matches.length > 1 ? "es" : ""}
        </span>
      </div>
      <p className="text-indigo-800 text-sm font-medium mb-3 italic">{reasoning}</p>
      <div className="space-y-2">
        {matches.map((m) => (
          <div key={m.session_id} className="bg-white border border-indigo-100 rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-indigo-500">{m.date} · {m.session_id}</span>
              <span className="text-xs font-semibold text-indigo-700">
                {Math.round(m.similarity * 100)}% similar
              </span>
            </div>
            <p className="text-sm text-gray-800">{m.summary}</p>
            {m.fix_applied && (
              <p className="text-xs text-green-700 mt-1">✔ Fix: {m.fix_applied}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
