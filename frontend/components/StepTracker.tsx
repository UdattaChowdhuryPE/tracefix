"use client";
import type { AgentEvent } from "../hooks/useAgentStream";

const STEPS = [
  { key: "recall_past_investigations", label: "Memory Recall" },
  { key: "trace_dependency_chain", label: "Dependency Chain" },
  { key: "investigate_regression", label: "Investigating" },
  { key: "analyze_commit_intelligence", label: "Commit Intelligence" },
  { key: "estimate_blast_radius", label: "Blast Radius" },
  { key: "validate_root_cause", label: "Validate Root Cause" },
  { key: "generate_minimal_patch", label: "Generate Patch" },
  { key: "analyze_regression_risk", label: "Regression Risk" },
  { key: "create_pr", label: "Open PR" },
] as const;

type StepStatus = "pending" | "active" | "done";

function getStepStatuses(
  events: AgentEvent[]
): Record<string, { status: StepStatus; meta?: string }> {
  const completed = new Set<string>();
  const active = new Set<string>();

  for (const e of events) {
    if (e.type === "tool_call") active.add(e.tool);
    if (e.type === "tool_result" || e.type === "step") {
      const key = e.type === "step" ? e.step : (e as { tool: string }).tool;
      completed.add(key);
      active.delete(key);
    }
    if (e.type === "memory_match") { completed.add("recall_past_investigations"); active.delete("recall_past_investigations"); }
    if (e.type === "commit_intelligence") { completed.add("analyze_commit_intelligence"); active.delete("analyze_commit_intelligence"); }
    if (e.type === "blast_radius") { completed.add("estimate_blast_radius"); active.delete("estimate_blast_radius"); }
    if (e.type === "hypothesis") { completed.add("validate_root_cause"); active.delete("validate_root_cause"); }
    if (e.type === "patch_ready") { completed.add("generate_minimal_patch"); active.delete("generate_minimal_patch"); }
    if (e.type === "regression_risk") { completed.add("analyze_regression_risk"); active.delete("analyze_regression_risk"); }
    if (e.type === "complete") { completed.add("create_pr"); }
  }

  const result: Record<string, { status: StepStatus; meta?: string }> = {};
  for (const step of STEPS) {
    if (completed.has(step.key)) result[step.key] = { status: "done" };
    else if (active.has(step.key)) result[step.key] = { status: "active" };
    else result[step.key] = { status: "pending" };
  }
  return result;
}

export function StepTracker({ events }: { events: AgentEvent[] }) {
  const statuses = getStepStatuses(events);

  return (
    <div className="space-y-1.5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
        Investigation Steps
      </p>
      {STEPS.map((step) => {
        const { status } = statuses[step.key];
        return (
          <div
            key={step.key}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
              status === "done" ? "text-green-700 bg-green-50" :
              status === "active" ? "text-blue-700 bg-blue-50 font-medium" :
              "text-gray-400"
            }`}
          >
            {status === "done" ? (
              <span className="text-green-500 font-bold">&#10003;</span>
            ) : status === "active" ? (
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
            ) : (
              <span className="inline-block w-3 h-3 rounded-full border border-gray-300" />
            )}
            {step.label}
          </div>
        );
      })}
    </div>
  );
}
