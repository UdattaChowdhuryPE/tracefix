"use client";
import { useMemo } from "react";
import { useDemoStream } from "../../hooks/useDemoStream";
import { ImprovedInvestigationTimeline } from "../../components/ImprovedInvestigationTimeline";
import { FindingCard } from "../../components/FindingCard";
import { ImprovedRiskPanel } from "../../components/ImprovedRiskPanel";
import { MemoryCorrelation } from "../../components/MemoryCorrelation";
import { HypothesisCard } from "../../components/HypothesisCard";
import { CommitIntelligence } from "../../components/CommitIntelligence";
import { BlastRadiusMap } from "../../components/BlastRadiusMap";
import { PatchProposal } from "../../components/PatchProposal";
import { EscalationBanner } from "../../components/EscalationBanner";
import type { AgentEvent } from "../../hooks/useAgentStream";

type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

function normalizeRiskLevel(level: string | undefined): RiskLevel {
  const upper = (level || "").toUpperCase();
  if (upper === "CRITICAL" || upper === "HIGH" || upper === "MEDIUM" || upper === "LOW") {
    return upper;
  }
  return "LOW";
}

export default function DemoPage() {
  const { events, escalation, isComplete, error, resolveEscalation } = useDemoStream();

  const latestMemoryMatch = useMemo(
    () => [...events].reverse().find((e) => e.type === "memory_match") as Extract<AgentEvent, { type: "memory_match" }> | undefined,
    [events]
  );
  const latestHypothesis = useMemo(
    () => [...events].reverse().find((e) => e.type === "hypothesis") as Extract<AgentEvent, { type: "hypothesis" }> | undefined,
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
  const stepSummaries = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of stepEvents) {
      if (s.step && s.summary) map[s.step] = s.summary;
    }
    return map;
  }, [stepEvents]);
  const memoryConfidence = useMemo(() => {
    if (!latestMemoryMatch?.matches.length) return undefined;
    return Math.round(Math.max(...latestMemoryMatch.matches.map((m) => m.similarity)) * 100);
  }, [latestMemoryMatch]);

  const liveLogEvents = useMemo(
    () =>
      events.filter(
        (e) => e.type === "thinking" || e.type === "tool_call" || e.type === "tool_result"
      ),
    [events]
  );

  const lastStep = stepEvents[stepEvents.length - 1]?.step;
  const seenSteps = new Set(stepEvents.map((s) => s.step));

  function statusFor(stepName: string, hasDomainEvent: boolean): "complete" | "running" | "pending" {
    if (hasDomainEvent) return "complete";
    if (lastStep === stepName) return "running";
    if (seenSteps.has(stepName)) return "complete";
    return "pending";
  }

  const confidenceByStep: Record<string, number> = {};
  if (memoryConfidence !== undefined) confidenceByStep["memory_recall"] = memoryConfidence;
  if (latestHypothesis) confidenceByStep["hypothesis_validation"] = latestHypothesis.confidence;
  if (latestRisk) confidenceByStep["regression_risk"] = latestRisk.risk_score;
  if (latestBlast) confidenceByStep["blast_radius"] = latestBlast.score;

  // Risk panel derivation
  const hasRiskData = !!(latestRisk || latestBlast);
  const riskScore = latestRisk?.risk_score ?? latestBlast?.score ?? 0;
  const riskLevel = normalizeRiskLevel(latestRisk?.risk_level ?? latestBlast?.risk_level);
  const whyRisky: string[] = [];
  if (latestCommit?.risk_reasons) whyRisky.push(...latestCommit.risk_reasons);
  if (latestRisk?.risk_explanation) {
    latestRisk.risk_explanation
      .split(/\n|(?<=\.)\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => whyRisky.push(s));
  }
  const affectedServices = latestCommit?.affected_services ?? [];
  const impactedModules = (latestBlast?.impacted_modules ?? []).map((name) => ({ name, count: 1 }));
  const callers = [...new Set([
    ...(latestBlast?.callers ?? []),
    ...(latestRisk?.downstream_callers ?? []),
  ])];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center gap-4">
        <a href="/" className="text-xl font-black tracking-tight">
          <span className="text-blue-400">Trace</span>Fix
        </a>
        <span className="text-slate-600">|</span>
        <span className="bg-amber-500/15 text-amber-300 border border-amber-500/40 text-xs px-3 py-1 rounded-full font-semibold">
          ✨ DEMO MODE
        </span>
        {isComplete ? (
          <span className="ml-auto bg-green-900 text-green-300 text-xs px-3 py-1 rounded-full font-semibold">
            ✓ Completed
          </span>
        ) : (
          <span className="ml-auto bg-blue-900 text-blue-300 text-xs px-3 py-1.5 rounded-full font-semibold">
            ⟳ Investigating
          </span>
        )}
      </header>

      {/* Timeline */}
      <ImprovedInvestigationTimeline steps={stepEvents} confidenceByStep={confidenceByStep} />

      {/* Escalation */}
      {escalation && (
        <div className="px-6 pt-4">
          <EscalationBanner event={escalation} onResolve={resolveEscalation} />
        </div>
      )}

      {/* Main content: findings + sticky risk panel */}
      <div className="flex flex-1 overflow-hidden gap-6 p-6">
        {/* Left: Findings */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-2">
          {/* Memory Recall */}
          <FindingCard
            stepName="MEMORY RECALL"
            status={statusFor("memory_recall", !!latestMemoryMatch)}
            confidence={memoryConfidence}
            stepIndex={1}
            content={
              latestMemoryMatch
                ? `Found ${latestMemoryMatch.matches.length} similar past investigation${latestMemoryMatch.matches.length === 1 ? "" : "s"}.`
                : stepSummaries["memory_recall"] || "Searching memory for similar past incidents."
            }
          >
            {latestMemoryMatch && latestMemoryMatch.matches.length > 0 && (
              <MemoryCorrelation
                matches={latestMemoryMatch.matches}
                reasoning={latestMemoryMatch.reasoning}
              />
            )}
          </FindingCard>

          {/* Dependency Chain */}
          <FindingCard
            stepName="DEPENDENCY CHAIN"
            status={statusFor("dependency_chain", false)}
            stepIndex={2}
            content={stepSummaries["dependency_chain"] || "Tracing dependency chain to identify candidate culprits."}
          />

          {/* Hypothesis */}
          <FindingCard
            stepName="HYPOTHESIS VALIDATION"
            status={statusFor("hypothesis_validation", !!latestHypothesis)}
            confidence={latestHypothesis?.confidence}
            stepIndex={3}
            content={
              latestHypothesis
                ? latestHypothesis.evidence
                : stepSummaries["hypothesis_validation"] || "Validating root-cause hypothesis."
            }
          >
            {latestHypothesis && <HypothesisCard event={latestHypothesis} />}
          </FindingCard>

          {/* Commit Intelligence */}
          <FindingCard
            stepName="COMMIT INTELLIGENCE"
            status={statusFor("commit_intelligence", !!latestCommit)}
            stepIndex={4}
            content={
              latestCommit
                ? `Commit ${latestCommit.commit_hash.slice(0, 8)} — ${latestCommit.risk_assessment} risk.`
                : stepSummaries["commit_intelligence"] || "Analyzing commit history."
            }
          >
            {latestCommit && <CommitIntelligence event={latestCommit} />}
          </FindingCard>

          {/* Blast Radius */}
          <FindingCard
            stepName="BLAST RADIUS"
            status={statusFor("blast_radius", !!latestBlast)}
            confidence={latestBlast?.score}
            stepIndex={5}
            content={
              latestBlast
                ? latestBlast.summary
                : stepSummaries["blast_radius"] || "Calculating blast radius."
            }
          >
            {latestBlast && <BlastRadiusMap event={latestBlast} />}
          </FindingCard>

          {/* Patch Ready */}
          <FindingCard
            stepName="PATCH READY"
            status={statusFor("patch_ready", !!latestPatch)}
            stepIndex={6}
            content={
              latestPatch
                ? `${latestPatch.files_modified.length} file(s), ${latestPatch.lines_changed} line(s) changed.`
                : stepSummaries["patch_ready"] || "Generating minimal patch."
            }
          >
            {latestPatch && <PatchProposal event={latestPatch} />}
          </FindingCard>

          {/* Live Investigation Log */}
          <div className="rounded-xl shadow-lg bg-slate-900/80 border border-slate-700 p-5 mb-4">
            <h3 className="font-space-grotesk font-bold text-slate-100 text-sm mb-3 flex items-center gap-2">
              <span className="text-lg">⟳</span> Live Investigation Log
            </h3>
            {liveLogEvents.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Waiting for activity…</p>
            ) : (
              <div className="text-xs space-y-1 max-h-56 overflow-y-auto scroll-smooth font-mono">
                {liveLogEvents.slice(-50).map((e, idx) => {
                  if (e.type === "thinking") {
                    return (
                      <div key={idx} className="flex items-start gap-2 py-0.5 leading-relaxed">
                        <span className="text-purple-400 flex-shrink-0">💭</span>
                        <span className="text-slate-400">{e.text}</span>
                      </div>
                    );
                  }
                  if (e.type === "tool_call") {
                    return (
                      <div key={idx} className="flex items-start gap-2 py-0.5 leading-relaxed">
                        <span className="text-cyan-300 font-semibold flex-shrink-0">🔧</span>
                        <span className="text-cyan-300 font-semibold">Called: {e.tool}</span>
                      </div>
                    );
                  }
                  if (e.type === "tool_result") {
                    const preview = e.content.length > 120 ? e.content.slice(0, 120) + "…" : e.content;
                    return (
                      <div key={idx} className="flex items-start gap-2 py-0.5 leading-relaxed">
                        <span className="text-slate-500 flex-shrink-0">↳</span>
                        <span className="text-slate-500 italic truncate">{e.tool}: {preview}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Sticky risk panel */}
        <div className="w-96 flex-shrink-0 overflow-y-auto">
          {hasRiskData ? (
            <ImprovedRiskPanel
              riskScore={riskScore}
              riskLevel={riskLevel}
              whyRisky={whyRisky}
              affectedServices={affectedServices}
              impactedModules={impactedModules}
              callers={callers}
            />
          ) : (
            <div className="sticky top-4 bg-slate-900/60 border border-slate-700 rounded-lg p-6 text-center text-slate-500 text-sm">
              Risk assessment will appear here once the investigation reaches the blast-radius stage.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
