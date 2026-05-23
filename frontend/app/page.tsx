"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [errorText, setErrorText] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!repoUrl.trim() || !errorText.trim()) {
      setErr("Repository URL and stack trace are required.");
      return;
    }
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl, error_text: errorText, github_token: githubToken }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { session_id } = await res.json();

      await fetch(`http://localhost:8000/api/sessions/${session_id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl, error_text: errorText, github_token: githubToken }),
      });

      router.push(`/session/${session_id}`);
    } catch (e) {
      setErr(String(e));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <span className="font-[family-name:var(--font-space-grotesk)] font-bold text-xl text-slate-100">
            <span className="text-blue-500">Trace</span>Fix
          </span>
          <a
            href="#investigate"
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Begin Investigation
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-5xl md:text-6xl font-bold leading-tight mb-6 text-balance">
            <span className="text-blue-500">Ship</span> Fixes in Minutes,<br />Not Days
          </h1>
          <p className="font-[family-name:var(--font-inter)] text-lg text-slate-400 mb-8 text-balance">
            Autonomous root-cause investigation finds exact commits, validates fixes, and opens PRs automatically.
          </p>
          <div className="flex gap-4">
            <a
              href="#investigate"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors font-[family-name:var(--font-inter)] text-base"
            >
              Begin Investigation
            </a>
            <button
              onClick={() => router.push('/demo')}
              className="border border-slate-400 text-slate-300 hover:bg-slate-900 font-semibold px-8 py-3 rounded-lg transition-colors font-[family-name:var(--font-inter)] text-base"
            >
              See Demo
            </button>
          </div>
        </div>
        <div className="relative h-80 md:h-96">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-lg"></div>
          <svg className="w-full h-full" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "#3b82f6", stopOpacity: 0.3 }} />
                <stop offset="100%" style={{ stopColor: "#0ea5e9", stopOpacity: 0.3 }} />
              </linearGradient>
            </defs>
            {/* Stack Trace Box */}
            <rect x="20" y="20" width="100" height="80" fill="url(#flowGrad)" stroke="#3b82f6" strokeWidth="2" rx="8" />
            <text x="70" y="65" textAnchor="middle" fill="#93c5fd" fontSize="12" fontFamily="monospace">
              Stack Trace
            </text>
            {/* Arrow */}
            <path d="M 140 60 L 180 60" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
              </marker>
            </defs>
            {/* AI Thinking Box */}
            <rect x="180" y="20" width="100" height="80" fill="url(#flowGrad)" stroke="#0ea5e9" strokeWidth="2" rx="8" />
            <text x="230" y="55" textAnchor="middle" fill="#06b6d4" fontSize="12" fontFamily="monospace">
              AI
            </text>
            <text x="230" y="72" textAnchor="middle" fill="#06b6d4" fontSize="12" fontFamily="monospace">
              Investigates
            </text>
            {/* Arrow */}
            <path d="M 300 60 L 340 60" stroke="#0ea5e9" strokeWidth="2" markerEnd="url(#arrowhead2)" />
            <defs>
              <marker id="arrowhead2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#0ea5e9" />
              </marker>
            </defs>
            {/* Patch Ready Box */}
            <rect x="340" y="20" width="40" height="80" fill="url(#flowGrad)" stroke="#3b82f6" strokeWidth="2" rx="8" />
            {/* Down Arrow */}
            <path d="M 70 110 L 70 150" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrowhead3)" />
            <defs>
              <marker id="arrowhead3" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
              </marker>
            </defs>
            {/* Validate Box */}
            <rect x="20" y="150" width="100" height="80" fill="url(#flowGrad)" stroke="#3b82f6" strokeWidth="2" rx="8" />
            <text x="70" y="195" textAnchor="middle" fill="#93c5fd" fontSize="12" fontFamily="monospace">
              Validates
            </text>
            {/* Down Arrow */}
            <path d="M 230 110 L 230 150" stroke="#0ea5e9" strokeWidth="2" markerEnd="url(#arrowhead4)" />
            <defs>
              <marker id="arrowhead4" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#0ea5e9" />
              </marker>
            </defs>
            {/* PR Ready Box */}
            <rect x="180" y="150" width="100" height="80" fill="url(#flowGrad)" stroke="#0ea5e9" strokeWidth="2" rx="8" />
            <text x="230" y="195" textAnchor="middle" fill="#06b6d4" fontSize="12" fontFamily="monospace">
              PR Ready
            </text>
          </svg>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 py-20 bg-gradient-to-b from-transparent via-slate-900/20 to-transparent">
        <div className="text-center mb-16">
          <p className="font-[family-name:var(--font-inter)] text-xs tracking-widest uppercase text-slate-500 mb-4">
            How It Works
          </p>
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-4xl md:text-5xl font-bold text-slate-100 mb-6">
            4 Steps to Root-Cause Fix
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { num: 1, title: "Paste Stack Trace", desc: "Submit your error message and repository" },
            { num: 2, title: "AI Investigates", desc: "Autonomous agent bisects history and analyzes commits" },
            { num: 3, title: "Validates Root Cause", desc: "Confirms the exact culprit with test runs" },
            { num: 4, title: "Generates Patch", desc: "Creates minimal PR ready for merge" },
          ].map((step) => (
            <div
              key={step.num}
              className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 hover:bg-slate-900 transition-colors"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                <span className="font-[family-name:var(--font-space-grotesk)] font-bold text-lg text-white">
                  {step.num}
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-slate-100 mb-2">
                {step.title}
              </h3>
              <p className="font-[family-name:var(--font-inter)] text-sm text-slate-400">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <p className="font-[family-name:var(--font-inter)] text-xs tracking-widest uppercase text-slate-500 mb-4">
            Why TraceFix
          </p>
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-4xl md:text-5xl font-bold text-slate-100">
            Trustworthy Root-Cause Analysis
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Autonomous Investigation",
              desc: "AI-powered analysis finds root causes without manual debugging",
              icon: "🧠",
            },
            {
              title: "100% Explainable",
              desc: "Every finding includes detailed reasoning and commit history",
              icon: "✓",
            },
            {
              title: "Production-Ready",
              desc: "Minimal patches validated against test suites before PR",
              icon: "🛡️",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-slate-900/50 border border-slate-700 rounded-lg p-8 hover:bg-slate-900 transition-colors"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="font-[family-name:var(--font-space-grotesk)] text-xl font-semibold text-slate-100 mb-3">
                {feature.title}
              </h3>
              <p className="font-[family-name:var(--font-inter)] text-slate-400">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <section className="max-w-7xl mx-auto px-6 py-16 text-center">
        <p className="font-[family-name:var(--font-inter)] text-xs tracking-widest uppercase text-slate-500 mb-6">
          Trusted by developers at
        </p>
        <p className="font-[family-name:var(--font-inter)] text-slate-400 text-lg">
          GitAgent · Vercel · OSS Community
        </p>
        <p className="font-[family-name:var(--font-inter)] text-slate-500 text-sm mt-4">
          1,000+ investigations analyzed
        </p>
      </section>

      {/* Investigation Form */}
      <section id="investigate" className="max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-[family-name:var(--font-space-grotesk)] text-4xl font-bold text-slate-100 mb-4">
              Start Your First Investigation
            </h2>
            <p className="font-[family-name:var(--font-inter)] text-slate-400 text-lg">
              Paste your stack trace and we'll find the root cause.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block font-[family-name:var(--font-inter)] text-sm text-slate-400 mb-2">
                  GitHub Repository URL
                </label>
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block font-[family-name:var(--font-inter)] text-sm text-slate-400 mb-2">
                  Stack Trace / Error
                </label>
                <textarea
                  value={errorText}
                  onChange={(e) => setErrorText(e.target.value)}
                  placeholder={`Traceback (most recent call last):\n  File "app/auth.py", line 42, in validate_user\nAttributeError: 'NoneType' object has no attribute 'id'`}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-40 resize-y transition-all"
                  required
                />
              </div>

              <div>
                <label className="block font-[family-name:var(--font-inter)] text-sm text-slate-400 mb-2">
                  GitHub Token{" "}
                  <span className="text-slate-500 font-normal">(optional — required to open PRs)</span>
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {err && (
                <p className="font-[family-name:var(--font-inter)] text-red-400 text-sm">
                  {err}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors font-[family-name:var(--font-inter)] text-base"
              >
                {loading ? "Starting investigation…" : "Begin Investigation"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="font-[family-name:var(--font-inter)] text-sm text-slate-400 mb-2">
            Built on{" "}
            <a
              href="https://github.com/open-gitagent/gitagent"
              className="text-slate-300 hover:text-slate-200 transition-colors"
            >
              GitAgent
            </a>
            {" "}· Iterative · Explainable · Surgical patches
          </p>
          <p className="font-[family-name:var(--font-inter)] text-xs text-slate-500">
            © 2026 TraceFix
          </p>
        </div>
      </footer>
    </div>
  );
}
