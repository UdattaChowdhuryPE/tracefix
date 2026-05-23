"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import TerminalAnimation from "@/components/TerminalAnimation";

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
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
      const res = await fetch(`${backendUrl}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl, error_text: errorText, github_token: githubToken }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { session_id } = await res.json();

      await fetch(`${backendUrl}/api/sessions/${session_id}/run`, {
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
          <span className="font-[family-name:var(--font-fraunces)] font-bold text-2xl text-slate-100">
            <span className="text-blue-500">Trace</span>Fix
          </span>
          <a
            href="#investigate"
            className="bg-blue-600 hover:bg-blue-500 text-white text-base font-semibold px-6 py-3 rounded-lg transition-colors uppercase tracking-wide"
          >
            Begin Investigation →
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-[calc(100vh-64px)] max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="font-[family-name:var(--font-fraunces)] text-5xl md:text-6xl font-bold leading-tight mb-6 text-balance">
            Ship Fixes in<br /><span className="text-blue-500">Minutes</span>, Not Days
          </h1>
          <p className="font-[family-name:var(--font-jakarta)] text-lg text-slate-400 mb-8 text-balance">
            Autonomous root-cause investigation finds exact commits, validates hypotheses, and generates production-ready patches automatically.
          </p>
          <div className="flex gap-4">
            <a
              href="#investigate"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors font-[family-name:var(--font-jakarta)] text-base uppercase tracking-wide"
            >
              Begin Investigation →
            </a>
            <button
              onClick={() => router.push('/demo')}
              className="border border-slate-400 text-slate-300 hover:bg-slate-900 font-semibold px-8 py-3 rounded-lg transition-colors font-[family-name:var(--font-jakarta)] text-base uppercase tracking-wide"
            >
              See Demo
            </button>
          </div>
        </div>
        <TerminalAnimation />
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 py-20 bg-gradient-to-b from-transparent via-slate-900/20 to-transparent">
        <div className="text-center mb-16">
          <p className="font-[family-name:var(--font-jakarta)] text-xs tracking-widest uppercase text-slate-500 mb-4">
            How It Works
          </p>
          <h2 className="font-[family-name:var(--font-fraunces)] text-4xl md:text-5xl font-bold text-slate-100 mb-6">
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
                <span className="font-[family-name:var(--font-fraunces)] font-bold text-lg text-white">
                  {step.num}
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-slate-100 mb-2">
                {step.title}
              </h3>
              <p className="font-[family-name:var(--font-jakarta)] text-sm text-slate-400">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <p className="font-[family-name:var(--font-jakarta)] text-xs tracking-widest uppercase text-slate-500 mb-4">
            Why TraceFix
          </p>
          <h2 className="font-[family-name:var(--font-fraunces)] text-4xl md:text-5xl font-bold text-slate-100">
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
              <h3 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-slate-100 mb-3">
                {feature.title}
              </h3>
              <p className="font-[family-name:var(--font-jakarta)] text-slate-400">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <section className="max-w-7xl mx-auto px-6 py-16 text-center">
        <p className="font-[family-name:var(--font-jakarta)] text-xs tracking-widest uppercase text-slate-500 mb-6">
          Trusted by developers at
        </p>
        <p className="font-[family-name:var(--font-jakarta)] text-slate-400 text-lg">
          GitAgent · Vercel · OSS Community
        </p>
        <p className="font-[family-name:var(--font-jakarta)] text-slate-500 text-sm mt-4">
          1,000+ investigations analyzed
        </p>
      </section>

      {/* Investigation Form */}
      <section id="investigate" className="max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-[family-name:var(--font-fraunces)] text-4xl font-bold text-slate-100 mb-4">
              Start Your First Investigation
            </h2>
            <p className="font-[family-name:var(--font-jakarta)] text-slate-400 text-lg">
              Paste your stack trace and we'll find the root cause.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block font-[family-name:var(--font-jakarta)] text-sm text-slate-400 mb-2">
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
                <label className="block font-[family-name:var(--font-jakarta)] text-sm text-slate-400 mb-2">
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
                <label className="block font-[family-name:var(--font-jakarta)] text-sm text-slate-400 mb-2">
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
                <p className="font-[family-name:var(--font-jakarta)] text-red-400 text-sm">
                  {err}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors font-[family-name:var(--font-jakarta)] text-base uppercase tracking-wide"
              >
                {loading ? "Starting investigation…" : "Begin Investigation →"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="font-[family-name:var(--font-jakarta)] text-sm text-slate-400 mb-2">
            Built on{" "}
            <a
              href="https://github.com/open-gitagent/gitagent"
              className="text-slate-300 hover:text-slate-200 transition-colors"
            >
              GitAgent
            </a>
            {" "}· Iterative · Explainable · Surgical patches
          </p>
          <p className="font-[family-name:var(--font-jakarta)] text-xs text-slate-500">
            © 2026 TraceFix
          </p>
        </div>
      </footer>
    </div>
  );
}
