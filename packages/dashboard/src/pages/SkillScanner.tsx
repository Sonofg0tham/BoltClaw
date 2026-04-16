import { useState, useRef, useCallback, type ChangeEvent, type DragEvent } from "react";
import { RiskBadge } from "../components/RiskBadge.js";
import { apiFetch } from "../api.js";
import type { Severity, ScanResult } from "../types.js";

function riskBarColor(score: number): string {
  if (score === 0)  return "#22c55e";
  if (score <= 20)  return "#eab308";
  if (score <= 50)  return "#f97316";
  return "#ef4444";
}

function riskBarGlow(score: number): string {
  if (score === 0)  return "rgba(34,197,94,0.4)";
  if (score <= 20)  return "rgba(234,179,8,0.4)";
  if (score <= 50)  return "rgba(249,115,22,0.4)";
  return "rgba(239,68,68,0.4)";
}

export function SkillScanner() {
  const [path, setPath] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setScanning(true);
    setResult(null);
    setError(null);
    setPath(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiFetch("/api/scan/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload scan failed");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? `Upload error: ${err.message}` : "Failed to connect to server");
    } finally {
      setScanning(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  async function scan() {
    if (!path.trim()) return;
    setScanning(true);
    setResult(null);
    setError(null);
    try {
      const res = await apiFetch("/api/scan", {
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
    } catch (err) {
      setError(err instanceof Error ? `Connection error: ${err.message}` : "Failed to connect to server");
    } finally {
      setScanning(false);
    }
  }

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setScanning(true);
    setResult(null);
    setError(null);
    setPath(file.name); // Show filename in the input box visually
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiFetch("/api/scan/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload scan failed");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? `Upload error: ${err.message}` : "Failed to connect to server");
    } finally {
      setScanning(false);
      // Reset input so the same file can be uploaded again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const grouped = result
    ? (["danger", "warning", "caution", "safe"] as Severity[])
        .map((sev) => ({
          severity: sev,
          matches:  result.matches.filter((m) => m.pattern.severity === sev),
        }))
        .filter((g) => g.matches.length > 0)
    : [];

  return (
    <div className="animate-fade-in">
      {/* ─── Hero header ─────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-1.5">Skill Scanner</h2>
        <p className="text-slate-500 text-sm">
          Scan a skill for security threats before installation — paste a local path or GitHub URL.
          Works with both OpenClaw and NanoClaw skills.
        </p>
      </div>

      {/* ─── Input area ──────────────────────────────────── */}
      <div
        className={`relative rounded-2xl mb-3 overflow-hidden transition-all duration-300 ${scanning ? "scan-overlay" : ""}`}
        style={{
          background: dragging ? "rgba(30,64,175,0.15)" : "rgba(13,21,38,0.7)",
          border:     dragging
            ? "2px dashed rgba(96,165,250,0.5)"
            : scanning
              ? "1px solid rgba(220,38,38,0.4)"
              : "1px solid rgba(255,255,255,0.08)",
          boxShadow:  dragging
            ? "0 0 24px rgba(96,165,250,0.15)"
            : scanning ? "0 0 24px rgba(220,38,38,0.15)" : "none",
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex items-center gap-3 px-4 py-1">
          {/* Icon */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={scanning ? "#dc2626" : "#475569"}
            strokeWidth="2"
            strokeLinecap="round"
            className="shrink-0 transition-colors duration-300"
          >
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>

          <input
            id="skill-path-input"
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && scan()}
            placeholder="/path/to/skill or https://github.com/user/repo"
            className="flex-1 bg-transparent py-4 text-sm font-mono text-slate-100 outline-none placeholder-slate-700"
          />

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".js,.ts,.py,.sh,.bash,.json,.yaml,.yml"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="btn-secondary shrink-0 py-2 !px-3"
            title="Upload skill file"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>

          <button
            id="skill-scan-button"
            onClick={scan}
            disabled={scanning || !path.trim()}
            className="btn-primary shrink-0 py-2"
          >
            {scanning ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                </svg>
                Scanning…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Scan
              </>
            )}
          </button>
        </div>
      </div>

      <p className="text-xs mb-8" style={{ color: "#334155" }}>
        Supports local paths and GitHub URLs — e.g.{" "}
        <code style={{ color: "#475569" }}>https://github.com/user/repo/tree/main/skills/my-skill</code>
      </p>

      {/* ─── Error ───────────────────────────────────────── */}
      {error && (
        <div
          className="rounded-2xl px-4 py-3.5 mb-6 text-sm animate-slide-in"
          style={{
            background: "rgba(127,29,29,0.25)",
            border:     "1px solid rgba(220,38,38,0.3)",
            color:      "#fca5a5",
          }}
        >
          {error}
        </div>
      )}

      {/* ─── Results ─────────────────────────────────────── */}
      {result && (
        <div className="animate-fade-in">
          {/* Summary card */}
          <div
            className="rounded-2xl p-6 mb-6"
            style={{
              background:    "rgba(13,21,38,0.7)",
              border:        "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                  <h3 className="font-bold text-slate-100">Scan Results</h3>
                  {result.platform !== "unknown" && (
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={
                        result.platform === "nanoclaw"
                          ? { background: "rgba(88,28,135,0.3)", color: "#c084fc", border: "1px solid rgba(192,132,252,0.25)" }
                          : { background: "rgba(30,64,175,0.3)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.25)" }
                      }
                    >
                      {result.platform === "nanoclaw" ? "NanoClaw Skill" : "OpenClaw Skill"}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  Scanned {result.scannedFiles} file(s) in{" "}
                  <code className="font-mono text-slate-400">{result.skillPath}</code>
                </p>
              </div>
              <RiskBadge severity={result.riskLevel} />
            </div>

            {/* Risk score bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-2" style={{ color: "#475569" }}>
                <span>Risk Score</span>
                <span className="font-mono" style={{ color: riskBarColor(result.riskScore) }}>
                  {result.riskScore}/100
                </span>
              </div>
              <div className="risk-bar-track">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width:      `${result.riskScore}%`,
                    background: `linear-gradient(90deg, ${riskBarColor(result.riskScore)}, ${riskBarColor(result.riskScore)}cc)`,
                    boxShadow:  `0 0 10px ${riskBarGlow(result.riskScore)}`,
                  }}
                />
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">{result.summary}</p>
          </div>

          {/* Findings */}
          {grouped.length === 0 ? (
            <div
              className="text-center py-16 rounded-2xl"
              style={{
                background: "rgba(20,83,45,0.1)",
                border: "1px solid rgba(74,222,128,0.15)",
              }}
            >
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
                style={{ background: "rgba(20,83,45,0.3)", border: "1px solid rgba(74,222,128,0.25)" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="font-semibold mb-1" style={{ color: "#4ade80" }}>No threats detected</p>
              <p className="text-sm text-slate-500">This skill appears safe to install.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <div key={group.severity}>
                  <div className="flex items-center gap-2 mb-3">
                    <RiskBadge severity={group.severity} />
                    <span className="text-sm text-slate-500">{group.matches.length} finding(s)</span>
                  </div>
                  <div className="space-y-3">
                    {group.matches.map((m, i) => (
                      <div
                        key={`${m.pattern.id}-${i}`}
                        className="rounded-2xl p-4"
                        style={{
                          background:    "rgba(13,21,38,0.7)",
                          border:        "1px solid rgba(255,255,255,0.07)",
                          backdropFilter: "blur(8px)",
                        }}
                      >
                        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                          <span className="font-semibold text-slate-200 text-sm">{m.pattern.name}</span>
                          <span className="text-xs font-mono" style={{ color: "#475569" }}>
                            {m.file}:{m.line}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-2.5 leading-relaxed">{m.pattern.description}</p>
                        {m.pattern.impact && (
                          <p className="text-xs mb-2.5 leading-relaxed">
                            <span className="font-semibold" style={{ color: "#fbbf24" }}>⚠ Why this matters: </span>
                            <span style={{ color: "rgba(251,191,36,0.75)" }}>{m.pattern.impact}</span>
                          </p>
                        )}
                        <pre className="code-block">{m.content}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Empty state ─────────────────────────────────── */}
      {!result && !scanning && !error && (
        <div className="text-center py-20">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{
              background:    "rgba(220,38,38,0.08)",
              border:        "1px solid rgba(220,38,38,0.15)",
              backdropFilter: "blur(8px)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(220,38,38,0.6)" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </div>
          <p className="text-slate-500 text-sm">Enter a skill path or GitHub URL above to begin scanning</p>
        </div>
      )}
    </div>
  );
}
