"use client";
import React, { useState } from "react";
import {
  Brain,
  GitBranch,
  Lightbulb,
  GitCommit,
  Zap,
  Wrench,
  Shield,
  Filter,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface FindingCardProps {
  stepName: string;
  status: "complete" | "running" | "pending" | "skipped";
  confidence?: number | string;
  content?: string;
  progressLog?: string;
  defaultExpanded?: boolean;
  stepIndex?: number;
  children?: React.ReactNode;
}

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "TRIAGE": Filter,
  "MEMORY RECALL": Brain,
  "DEPENDENCY CHAIN": GitBranch,
  "HYPOTHESIS VALIDATION": Lightbulb,
  "COMMIT INTELLIGENCE": GitCommit,
  "BLAST RADIUS": Zap,
  "PATCH READY": Wrench,
};

export function FindingCard({
  stepName,
  status,
  confidence,
  content,
  progressLog,
  defaultExpanded = true,
  stepIndex = 0,
  children,
}: FindingCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const statusConfig = {
    complete: {
      bg: "bg-gradient-to-br from-green-950/40 to-slate-950",
      iconColor: "text-green-400",
      badge: "bg-green-900/50 text-green-300",
      shadow: "shadow-lg hover:shadow-xl",
    },
    running: {
      bg: "bg-gradient-to-br from-blue-950/40 to-slate-950",
      iconColor: "text-blue-400",
      badge: "bg-blue-900/50 text-blue-300",
      shadow: "shadow-lg hover:shadow-xl",
    },
    pending: {
      bg: "bg-gradient-to-br from-slate-900 to-slate-950",
      iconColor: "text-slate-500",
      badge: "bg-slate-900/50 text-slate-300",
      shadow: "shadow-lg hover:shadow-xl",
    },
    skipped: {
      bg: "bg-gradient-to-br from-slate-900/40 to-slate-950",
      iconColor: "text-slate-400",
      badge: "bg-slate-800/50 text-slate-400",
      shadow: "shadow-lg hover:shadow-xl opacity-60",
    },
  } as const;

  const config = statusConfig[status];
  const StepIcon = STEP_ICONS[stepName] || Shield;

  const badgeText =
    confidence !== undefined
      ? typeof confidence === "number"
        ? `${confidence}% confidence`
        : confidence
      : status === "pending"
      ? "Pending"
      : status === "running"
      ? "calculating..."
      : status === "skipped"
      ? "Skipped"
      : null;

  return (
    <div
      className={`${config.bg} ${config.shadow} border border-slate-700 rounded-xl p-5 mb-4 transition-all duration-200 hover:-translate-y-0.5 overflow-hidden`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-shrink-0">
            <StepIcon className={`w-5 h-5 ${config.iconColor}`} />
            {stepIndex > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold leading-none">
                {stepIndex}
              </div>
            )}
          </div>
          <div className="text-left">
            <h3 className="font-fraunces font-bold text-slate-100 text-sm">{stepName}</h3>
          </div>
          {badgeText && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${config.badge} flex-shrink-0`}>
              {badgeText}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
      </button>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isExpanded ? "1000px" : "0px" }}
      >
        <div className="mt-3 space-y-2">
          {content && <p className="text-sm text-slate-300 leading-relaxed">{content}</p>}
          {children}
          {progressLog && (
            <div className="bg-slate-950/60 border border-slate-700 rounded-lg p-3 mt-2">
              <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wide">
                Progress Log
              </p>
              <code className="text-xs text-slate-400 font-mono block max-h-32 overflow-y-auto whitespace-pre-wrap">
                {progressLog}
              </code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
