"use client";
import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface ImprovedRiskPanelProps {
  riskScore: number;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  whyRisky: string[];
  affectedServices: string[];
  impactedModules?: { name: string; count: number }[];
  callers?: string[];
}

export function ImprovedRiskPanel({
  riskScore,
  riskLevel,
  whyRisky,
  affectedServices,
  impactedModules = [],
  callers = [],
}: ImprovedRiskPanelProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    setTimeout(() => setAnimatedScore(riskScore), 50);
  }, [riskScore]);

  const riskConfig = {
    CRITICAL: {
      bg: "bg-red-950/40",
      border: "border-red-700",
      text: "text-red-300",
      badge: "bg-red-900 text-red-100",
      color: "#ef4444",
    },
    HIGH: {
      bg: "bg-red-950/40",
      border: "border-red-700",
      text: "text-red-300",
      badge: "bg-red-900 text-red-100",
      color: "#ef4444",
    },
    MEDIUM: {
      bg: "bg-amber-950/40",
      border: "border-amber-700",
      text: "text-amber-300",
      badge: "bg-amber-900 text-amber-100",
      color: "#f59e0b",
    },
    LOW: {
      bg: "bg-green-950/40",
      border: "border-green-700",
      text: "text-green-300",
      badge: "bg-green-900 text-green-100",
      color: "#10b981",
    },
  } as const;

  const config = riskConfig[riskLevel];

  return (
    <div className="sticky top-4 space-y-4">
      <div className={`${config.bg} border ${config.border} rounded-xl shadow-xl p-6 text-center backdrop-blur-sm`}>
        <div className="text-xs text-slate-400 mb-2 font-space-grotesk font-bold uppercase tracking-wide">
          Risk Score
        </div>
        <div className="flex items-center justify-center gap-4 mb-6">
          <div>
            <svg width="100" height="100" viewBox="0 0 100 100" className="mx-auto">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-slate-700"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={config.color}
                strokeWidth="3"
                strokeDasharray={`${(animatedScore / 100) * 282.7} 282.7`}
                strokeLinecap="round"
                className="transform -rotate-90 origin-center"
                style={{ transition: "stroke-dasharray 0.5s ease" }}
              />
            </svg>
          </div>
          <div>
            <div className="text-4xl font-bold text-slate-100">{riskScore}</div>
            <div className="text-xs text-slate-400">/100</div>
          </div>
        </div>

        <div
          className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold ${config.badge} ${
            riskLevel === "HIGH" || riskLevel === "CRITICAL" ? "animate-pulse" : ""
          }`}
        >
          {riskLevel} RISK
        </div>
      </div>

      {whyRisky.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-700 rounded-xl shadow-md p-4 backdrop-blur-sm">
          <h4 className="text-xs font-space-grotesk font-bold text-slate-300 mb-3 uppercase tracking-wide">Why Risky</h4>
          <ul className="space-y-2">
            {whyRisky.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${config.text}`} />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {affectedServices.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-700 rounded-xl shadow-md p-4 backdrop-blur-sm">
          <h4 className="text-xs font-space-grotesk font-bold text-slate-300 mb-3 uppercase tracking-wide">
            Affected Services
          </h4>
          <div className="flex flex-wrap gap-2">
            {affectedServices.map((service) => (
              <span
                key={service}
                className="bg-slate-800/60 text-slate-300 text-xs px-3 py-1.5 rounded-full border border-slate-600 font-medium hover:bg-slate-700/80 transition-colors cursor-default"
              >
                {service}
              </span>
            ))}
          </div>
        </div>
      )}

      {impactedModules.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-700 rounded-xl shadow-md p-4 backdrop-blur-sm">
          <h4 className="text-xs font-space-grotesk font-bold text-slate-300 mb-3 uppercase tracking-wide">
            Impacted Modules
          </h4>
          <div className="space-y-2">
            {impactedModules.map((module) => (
              <div
                key={module.name}
                className="flex items-center justify-between text-xs border-b border-slate-700 pb-2"
              >
                <span className="text-slate-400 font-mono truncate pr-2">{module.name}</span>
                <span className="bg-slate-700/60 text-slate-300 px-2 py-1 rounded font-mono text-xs flex-shrink-0">
                  {module.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {callers.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-700 rounded-xl shadow-md p-4 backdrop-blur-sm">
          <h4 className="text-xs font-space-grotesk font-bold text-slate-300 mb-3 uppercase tracking-wide">Callers</h4>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {callers.map((caller) => (
              <li key={caller} className="text-xs text-slate-400 font-mono break-all">
                {caller}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
