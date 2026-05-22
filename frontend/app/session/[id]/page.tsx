"use client";
import { use, useMemo } from "react";
import { useAgentStream } from "../../../hooks/useAgentStream";
import { StepTracker } from "../../../components/StepTracker";
import { InvestigationStream } from "../../../components/InvestigationStream";
import { MemoryCorrelation } from "../../../components/MemoryCorrelation";
import { BisectTimeline } from "../../../components/BisectTimeline";
import { CommitIntelligence } from "../../../components/CommitIntelligence";
import { BlastRadiusMap } from "../../../components/BlastRadiusMap";
import { PatchProposal } from "../../../components/PatchProposal";
import { RegressionRiskPanel } from "../../../components/RegressionRiskPanel";
import type { AgentEvent } from "../../../hooks/useAgentStream";

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const { events, escalation, isComplete, error, resolveEscalation } = useAgentStream(sessionId);

  // Derive latest contextual events for right panel
  const latestMemoryMatch = useMemo(
    () => [...events].reverse().find((e) => e.type === "memory_match") as Extract<AgentEvent, { type: "memory_match" }> | undefined,
    [events]
  );
  const latestCommit = useMemo(
    () => [...events].reverse().find((e) => e.type === "commit_intelligence") as Extract<AgentEvent, { type: "commit_intelligence" }> | undefined,
    [events]
  );
  const latestBlast = useMemo(
    () => [...events].reverse().find((e) => e.type === "blast_radius") as Extract<AgentEvent, { type: "blast_radius" }> | undefined,
    [events]
  );
  const latestPatch = useMemo(
    () => [...events].reverse().find((e) => e.type === "patch_ready") as Extract<AgentEvent, { type: "patch_ready" }> | undefined,
    [events]
  );
  const latestRisk = useMemo(
    () => [...events].reverse().find((e) => e.type === "regression_risk") as Extract<AgentEvent, { type: "regression_risk" }> | undefined,
    [events]
  );
  const stepEvents = useMemo(
    () => events.filter((e) => e.type === "step") as Extract<AgentEvent, { type: "step" }>[],
    [events]
  );
  const prUrl = useMemo(() => {
    const completeEvent = events.find((e) => e.type === "complete") as Extract<AgentEvent, { type: "complete" }> | undefined;
    return completeEvent?.pr_url;
  }, [events]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        <a href="/" className="text-xl font-black tracking-tight">
          <span className="text-blue-400">Trace</span>Fix
        </a>
        <span className="text-gray-600">|</span>
        <span className="text-gray-400 text-sm font-mono truncate max-w-xs">{sessionId}</span>
        {isComplete && (
          <span className="ml-auto bg-green-900 text-green-300 text-xs px-3 py-1 rounded-full font-semibold">
            ✓ Complete
          </span>
        )}
        {error && (
          <span className="ml-auto bg-red-900 text-red-300 text-xs px-3 py-1 rounded-full">
            Error
          </span>
        )}
        {prUrl && (
          <a
            href={prUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-2 bg-blue-700 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-semibold transition-colors"
          >
            View PR →
          </a>
        )}
      </header>

      {/* 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Step tracker */}
        <aside className="w-52 flex-shrink-0 border-r border-gray-800 bg-gray-900 overflow-y-auto">
          <StepTracker events={events} />
        </aside>

        {/* Center: Live stream */}
        <main className="flex-1 overflow-y-auto bg-gray-950">
          <InvestigationStream
            events={events}
            escalation={escalation}
            onResolveEscalation={resolveEscalation}
          />
        </main>

        {/* Right: Context panel */}
        <aside className="w-80 flex-shrink-0 border-l border-gray-800 bg-gray-900 overflow-y-auto p-3 space-y-2">
          {latestMemoryMatch && latestMemoryMatch.matches.length > 0 && (
            <MemoryCorrelation
              matches={latestMemoryMatch.matches}
              reasoning={latestMemoryMatch.reasoning}
            />
          )}
          {!latestCommit && <BisectTimeline steps={stepEvents} />}
          {latestCommit && <CommitIntelligence event={latestCommit} />}
          {latestBlast && <BlastRadiusMap event={latestBlast} />}
          {latestPatch && <PatchProposal event={latestPatch} />}
          {latestRisk && <RegressionRiskPanel event={latestRisk} />}
          {!latestMemoryMatch && !latestCommit && !latestBlast && !latestPatch && !latestRisk && (
            <div className="text-center text-gray-600 text-sm py-8">
              Investigation context will appear here
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
