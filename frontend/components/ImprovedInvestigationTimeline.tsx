"use client";
import { Check } from "lucide-react";
import type { AgentEvent } from "../hooks/useAgentStream";

type StepEvent = Extract<AgentEvent, { type: "step" }>;

interface TimelineStep {
  id: string;
  name: string;
  matchStep: string;
  status: "complete" | "running" | "pending";
  confidence?: number;
}

interface Props {
  steps: StepEvent[];
  confidenceByStep?: Record<string, number>;
}

const TIMELINE_DEFS: { id: string; name: string; matchStep: string }[] = [
  { id: "memory", name: "Memory", matchStep: "memory_recall" },
  { id: "dependency", name: "Dependency", matchStep: "dependency_chain" },
  { id: "hypothesis", name: "Hypothesis", matchStep: "hypothesis_validation" },
  { id: "commit", name: "Commit", matchStep: "commit_intelligence" },
  { id: "blast", name: "Blast", matchStep: "blast_radius" },
  { id: "patch", name: "Patch", matchStep: "patch_ready" },
  { id: "risk", name: "Risk", matchStep: "regression_risk" },
];

export function ImprovedInvestigationTimeline({ steps, confidenceByStep = {} }: Props) {
  const seen = new Set(steps.map((s) => s.step));
  const lastStep = steps[steps.length - 1]?.step;

  const timelineSteps: TimelineStep[] = TIMELINE_DEFS.map((def) => {
    let status: TimelineStep["status"] = "pending";
    if (seen.has(def.matchStep)) status = "complete";
    if (def.matchStep === lastStep) status = "running";
    return {
      id: def.id,
      name: def.name,
      matchStep: def.matchStep,
      status,
      confidence: confidenceByStep[def.matchStep],
    };
  });

  return (
    <div className="bg-slate-900 border-b border-slate-700 px-6 py-4 overflow-x-auto">
      <div className="flex items-center gap-3 min-w-max">
        {timelineSteps.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-3">
            <TimelineStepCard step={step} />
            {idx < timelineSteps.length - 1 && (
              <div className="w-6 h-0.5 bg-gradient-to-r from-slate-600 to-slate-700" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineStepCard({ step }: { step: TimelineStep }) {
  const statusConfig = {
    complete: {
      bg: "bg-green-900",
      text: "text-green-400",
      border: "border-green-500",
      iconColor: "text-green-300",
    },
    running: {
      bg: "bg-blue-900",
      text: "text-blue-400",
      border: "border-blue-500",
      iconColor: "text-blue-300",
      glow: true,
    },
    pending: {
      bg: "bg-slate-800",
      text: "text-slate-400",
      border: "border-slate-600",
      iconColor: "text-slate-500",
    },
  } as const;

  const config = statusConfig[step.status];
  const isRunning = step.status === "running";

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.border} ${config.bg} transition-all duration-200 hover:scale-105 cursor-default`}
      style={isRunning ? { boxShadow: "0 0 12px 2px rgb(59, 130, 246, 0.5)" } : undefined}
    >
      {step.status === "complete" ? (
        <Check className={`w-3 h-3 ${config.iconColor}`} />
      ) : (
        <div
          className={`w-2 h-2 rounded-full ${
            step.status === "running" ? "bg-blue-500 animate-pulse" : "bg-slate-600"
          }`}
        />
      )}
      <span className={`${config.text} text-sm font-fraunces font-semibold`}>{step.name}</span>
    </div>
  );
}
