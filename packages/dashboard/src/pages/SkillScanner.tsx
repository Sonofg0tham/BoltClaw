import { useState } from "react";
import { RiskBadge } from "../components/RiskBadge.js";
import type { Severity, ScanResult } from "../types.js";

function riskBarColor(score: number): string {
  if (score === 0) return "bg-green-500";
  if (score <= 20) return "bg-yellow-500";
  if (score <= 50) return "bg-orange-500";
  return "bg-red-500";
}

export function SkillScanner() {
  const [path, setPath] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function scan() {
    if (!path.trim()) return;
    setScanning(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: path.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Scan failed");
      } else {
        setResult(data);
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setScanning(false);
    }
  }

  // Group matches by severity
  const grouped = result
    ? (["danger", "warning", "caution", "safe"] as Severity[])
        .map((sev) => ({
          severity: sev,
          matches: result.matches.filter((m) => m.pattern.severity === sev),
        }))
        .filter((g) => g.matches.length > 0)
    : [];

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Skill Scanner</h2>
      <p className="text-slate-400 mb-6 text-sm">
        Scan a skill for security threats before installation. Paste a local path or a GitHub URL.
        Works with both OpenClaw and NanoClaw skills.
      </p>

      {/* Input */}
      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && scan()}
          placeholder="/path/to/skill or https://github.com/user/repo"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-green-600"
        />
        <button
          onClick={scan}
          disabled={scanning || !path.trim()}
          className="px-6 py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {scanning ? "Scanning..." : "Scan"}
        </button>
      </div>

      {/* URL format hint */}
      <p className="text-xs text-slate-600 -mt-6 mb-6">
        Supports local paths and GitHub URLs (e.g. https://github.com/user/repo or https://github.com/user/repo/tree/main/skills/my-skill)
      </p>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-950/50 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div>
          {/* Summary */}
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-100">Scan Results</h3>
                  {result.platform !== "unknown" && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      result.platform === "nanoclaw"
                        ? "bg-purple-900/50 text-purple-300 border border-purple-700"
                        : "bg-blue-900/50 text-blue-300 border border-blue-700"
                    }`}>
                      {result.platform === "nanoclaw" ? "NanoClaw Skill" : "OpenClaw Skill"}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400">
                  Scanned {result.scannedFiles} file(s) in{" "}
                  <span className="font-mono text-slate-300">{result.skillPath}</span>
                </p>
              </div>
              <RiskBadge severity={result.riskLevel} />
            </div>

            {/* Risk score bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Risk Score</span>
                <span>{result.riskScore}/100</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${riskBarColor(result.riskScore)}`}
                  style={{ width: `${result.riskScore}%` }}
                />
              </div>
            </div>

            <p className="text-sm text-slate-300">{result.summary}</p>
          </div>

          {/* Findings grouped by severity */}
          {grouped.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-green-400 font-medium">No threats detected</p>
              <p className="text-sm text-slate-500 mt-1">This skill appears safe to install.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <div key={group.severity}>
                  <div className="flex items-center gap-2 mb-3">
                    <RiskBadge severity={group.severity} />
                    <span className="text-sm text-slate-400">
                      {group.matches.length} finding(s)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.matches.map((m, i) => (
                      <div
                        key={`${m.pattern.id}-${i}`}
                        className="bg-slate-900 border border-slate-800 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-200 text-sm">{m.pattern.name}</span>
                          <span className="text-xs text-slate-500 font-mono">
                            {m.file}:{m.line}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">{m.pattern.description}</p>
                        {m.pattern.impact && (
                          <p className="text-xs text-amber-400/80 mb-2">
                            <span className="font-medium">Why this matters: </span>
                            {m.pattern.impact}
                          </p>
                        )}
                        <pre className="text-xs font-mono bg-slate-950 border border-slate-800 rounded p-2 text-red-400 overflow-x-auto">
                          {m.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
