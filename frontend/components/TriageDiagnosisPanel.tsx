"use client";
import React, { useEffect, useState } from "react";
import { Filter, AlertCircle, Lightbulb } from "lucide-react";

interface TriageDiagnosisPanelProps {
  category: string;
  confidence: number;
  reason: string;
  suggested_approach: string;
}

export function TriageDiagnosisPanel({
  category,
  confidence,
  reason,
  suggested_approach,
}: TriageDiagnosisPanelProps) {
  const [animatedConfidence, setAnimatedConfidence] = useState(0);

  useEffect(() => {
    setTimeout(() => setAnimatedConfidence(confidence), 50);
  }, [confidence]);

  const categoryConfig = {
    null_dereference_construction: {
      bg: "bg-amber-950/40",
      border: "border-amber-700",
      text: "text-amber-300",
      badge: "bg-amber-900 text-amber-100",
      icon: AlertCircle,
    },
    configuration_error: {
      bg: "bg-blue-950/40",
      border: "border-blue-700",
      text: "text-blue-300",
      badge: "bg-blue-900 text-blue-100",
      icon: AlertCircle,
    },
    ambiguous: {
      bg: "bg-slate-900/40",
      border: "border-slate-700",
      text: "text-slate-400",
      badge: "bg-slate-800 text-slate-300",
      icon: Lightbulb,
    },
    regression: {
      bg: "bg-green-950/40",
      border: "border-green-700",
      text: "text-green-300",
      badge: "bg-green-900 text-green-100",
      icon: Lightbulb,
    },
  } as const;

  const config = categoryConfig[category as keyof typeof categoryConfig] || categoryConfig.ambiguous;
  const IconComponent = config.icon;

  const displayCategory = category.replace(/_/g, " ").toLowerCase();
  const capitalizedCategory = displayCategory
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className={`sticky top-4 ${config.bg} border ${config.border} rounded-lg p-6 shadow-lg`}>
      <div className="flex items-center gap-3 mb-6">
        <IconComponent className={`w-5 h-5 ${config.text}`} />
        <h3 className="font-space-grotesk font-bold text-slate-100 text-lg">Diagnosis</h3>
      </div>

      {/* Category Badge */}
      <div className="mb-6">
        <div className={`inline-block ${config.badge} text-sm px-3 py-1.5 rounded-full font-semibold`}>
          {capitalizedCategory}
        </div>
      </div>

      {/* Confidence Meter */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-semibold tracking-wider uppercase ${config.text}`}>
            Confidence
          </span>
          <span className={`text-sm font-mono font-bold ${config.text}`}>
            {animatedConfidence}%
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ease-out`}
            style={{
              width: `${animatedConfidence}%`,
              backgroundColor:
                animatedConfidence >= 75
                  ? "#10b981"
                  : animatedConfidence >= 50
                    ? "#f59e0b"
                    : "#ef4444",
            }}
          />
        </div>
      </div>

      {/* Reason */}
      <div className="mb-6">
        <h4 className={`text-xs font-semibold tracking-wider uppercase ${config.text} mb-2`}>
          Why Not a Regression
        </h4>
        <p className="text-sm text-slate-300 leading-relaxed">{reason}</p>
      </div>

      {/* Suggested Approach */}
      <div>
        <h4 className={`text-xs font-semibold tracking-wider uppercase ${config.text} mb-2`}>
          Investigation Approach
        </h4>
        <p className="text-sm text-slate-300 leading-relaxed">{suggested_approach}</p>
      </div>
    </div>
  );
}
