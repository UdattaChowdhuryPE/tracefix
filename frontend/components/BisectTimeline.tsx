"use client";
import type { AgentEvent } from "../hooks/useAgentStream";

type StepEvent = Extract<AgentEvent, { type: "step" }>;

export function BisectTimeline({ steps }: { steps: StepEvent[] }) {
  const bisectSteps = steps.filter((s) =>
    s.step === "investigate_regression" || s.step === "bisect"
  );

  if (bisectSteps.length === 0) {
    return (
      <div className="text-sm text-gray-400 italic p-4">
        Bisect will start after dependency chain is traced…
      </div>
    );
  }

  return (
    <div className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
        Regression bisect — {bisectSteps.length} step{bisectSteps.length !== 1 ? "s" : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        {bisectSteps.map((s, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full bg-blue-400 flex items-center justify-center"
            title={s.step}
          />
        ))}
        <div className="w-4 h-4 rounded-full border-2 border-dashed border-gray-300 animate-pulse" />
      </div>
      {bisectSteps.length > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          Last: {bisectSteps[bisectSteps.length - 1].ts ?? ""}
        </p>
      )}
    </div>
  );
}
