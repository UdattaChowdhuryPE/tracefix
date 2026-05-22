import type { AgentEvent } from "../hooks/useAgentStream";

type PatchEvent = Extract<AgentEvent, { type: "patch_ready" }>;

export function PatchProposal({ event }: { event: PatchEvent }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden my-3">
      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
        <span className="text-white text-sm font-semibold">Patch Proposal</span>
        <div className="flex gap-3 text-xs text-gray-400">
          <span>{event.files_modified.length} file{event.files_modified.length !== 1 ? "s" : ""}</span>
          <span>{event.lines_changed} lines</span>
          {event.lines_changed <= 20 && event.files_modified.length <= 5 && (
            <span className="text-green-400 font-semibold">✓ Minimal</span>
          )}
        </div>
      </div>
      <div className="bg-gray-900 p-4 overflow-x-auto max-h-80">
        <pre className="text-xs text-gray-100 font-mono whitespace-pre">
          {event.patch.split("\n").map((line, i) => (
            <span
              key={i}
              className={`block ${
                line.startsWith("+") ? "text-green-400" :
                line.startsWith("-") ? "text-red-400" :
                line.startsWith("@@") ? "text-blue-400" :
                ""
              }`}
            >
              {line}
            </span>
          ))}
        </pre>
      </div>
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
        <p className="text-xs text-gray-600">{event.explanation}</p>
      </div>
    </div>
  );
}
