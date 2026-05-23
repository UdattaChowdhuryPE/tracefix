"use client";
import { useState, useEffect } from "react";

export default function TerminalAnimation() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    if (phase === 0) {
      timeouts.push(setTimeout(() => setPhase(1), 400));
    } else if (phase === 1) {
      timeouts.push(setTimeout(() => setPhase(2), 600));
    } else if (phase === 2) {
      timeouts.push(setTimeout(() => setPhase(3), 700));
    } else if (phase === 3) {
      timeouts.push(setTimeout(() => setPhase(4), 1200));
    } else if (phase === 4) {
      timeouts.push(setTimeout(() => setPhase(5), 600));
    } else if (phase === 5) {
      timeouts.push(setTimeout(() => setPhase(6), 500));
    } else if (phase === 6) {
      timeouts.push(setTimeout(() => setPhase(7), 600));
    } else if (phase === 7) {
      timeouts.push(setTimeout(() => setPhase(0), 1800));
    }

    return () => {
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, [phase]);

  return (
    <div className="h-80 md:h-96 bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col text-sm" style={{ fontFamily: "var(--font-jakarta)" }}>
      {/* Terminal header */}
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-700">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span className="text-slate-500 text-xs ml-2">tracefix</span>
      </div>

      {/* Terminal content */}
      <div className="flex-1 text-slate-200 overflow-hidden">
        {/* Phase 0: Blank */}
        {phase >= 0 && (
          <div>
            <span className="text-blue-400">$</span>{" "}
            {phase > 0 && (
              <>
                <span className="text-slate-300">
                  tracefix analyze github.com/acme/api --token ghp_***
                </span>
                {phase === 1 && <span className="text-blue-400 animate-pulse">|</span>}
              </>
            )}
            {phase === 0 && <span className="text-blue-400 animate-pulse">|</span>}
          </div>
        )}

        {/* Phase 2: Stack trace */}
        {phase >= 2 && (
          <div
            className="mt-3 space-y-0.5 transition-opacity duration-300 text-xs"
            style={{ opacity: phase >= 2 ? 1 : 0 }}
          >
            <div className="text-red-400">
              Traceback (most recent call last):
            </div>
            <div className="text-red-400">
              {'  '}File "app/auth.py", line 42, in validate_user
            </div>
            <div className="text-red-400">
              AttributeError: 'NoneType' object has no attribute 'id'
            </div>
          </div>
        )}

        {/* Phase 3: Progress bar */}
        {phase >= 3 && (
          <div
            className="mt-4 transition-opacity duration-300 text-xs"
            style={{ opacity: phase >= 3 ? 1 : 0 }}
          >
            <div className="text-slate-300 mb-2">Analyzing 1,247 commits...</div>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className={`bg-blue-600 h-full transition-all ${
                  phase === 3
                    ? "animate-[width_1.2s_ease-in-out]"
                    : "w-full"
                }`}
                style={{
                  width: phase >= 3 ? "100%" : "0%",
                  transitionDuration: phase === 3 ? "1200ms" : "0ms",
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Phase 4: Root cause found */}
        {phase >= 4 && (
          <div
            className="mt-3 text-green-400 transition-opacity duration-300 text-xs"
            style={{ opacity: phase >= 4 ? 1 : 0 }}
          >
            ✓ Root cause: commit d7c3a9f
            <div className="text-slate-400 text-xs mt-1">
              author: alice@acme.com  5 days ago
            </div>
            <div className="text-slate-400 text-xs">
              fix: handle missing user profile data
            </div>
          </div>
        )}

        {/* Phase 5: Generating patch */}
        {phase >= 5 && (
          <div
            className="mt-3 text-slate-300 transition-opacity duration-300 text-xs"
            style={{ opacity: phase >= 5 ? 1 : 0 }}
          >
            Generating surgical patch...
          </div>
        )}

        {/* Phase 6: PR opened */}
        {phase >= 6 && (
          <div
            className="mt-2 text-green-400 transition-opacity duration-300 text-xs"
            style={{ opacity: phase >= 6 ? 1 : 0 }}
          >
            ✓ PR #847 opened (1 file changed, 3 lines)
          </div>
        )}
      </div>
    </div>
  );
}
