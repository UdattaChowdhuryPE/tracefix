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
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black tracking-tight mb-2">
            <span className="text-blue-400">Trace</span>Fix
          </h1>
          <p className="text-gray-400 text-lg">Autonomous root-cause investigation engineer</p>
          <p className="text-gray-600 text-sm mt-1">
            Paste a stack trace. TraceFix finds the exact commit, validates the hypothesis, and opens a PR.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">GitHub Repository URL</label>
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Stack Trace / Error</label>
            <textarea
              value={errorText}
              onChange={(e) => setErrorText(e.target.value)}
              placeholder={`Traceback (most recent call last):\n  File "app/auth.py", line 42, in validate_user\nAttributeError: 'NoneType' object has no attribute 'id'`}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-40 resize-y"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              GitHub Token <span className="text-gray-500 font-normal">(optional — required to open PRs)</span>
            </label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {err && <p className="text-red-400 text-sm">{err}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors text-base"
          >
            {loading ? "Starting investigation…" : "Begin Investigation"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-8">
          Built on{" "}
          <a href="https://github.com/open-gitagent/gitagent" className="text-gray-500 hover:text-gray-400">GitAgent</a>
          {" "}· Iterative · Explainable · Surgical patches
        </p>
      </div>
    </main>
  );
}
