import { useState, useEffect } from "react";
import { SecurityScore } from "../components/SecurityScore.js";
import { RiskBadge } from "../components/RiskBadge.js";
import { ErrorBanner } from "../components/ErrorBanner.js";
import type { PermissionLevel, Severity, CombinedConfig, ScoreResult, SandboxMode } from "../types.js";

interface ConfigResponse {
  config: CombinedConfig;
  score: ScoreResult;
}

interface PermissionCard {
  key: string;
  label: string;
  value: PermissionLevel;
  secureDefault: PermissionLevel;
}

function permissionSeverity(value: PermissionLevel): Severity {
  if (value === "deny") return "safe";
  if (value === "ask") return "caution";
  return "danger";
}

function cardColor(value: PermissionLevel): string {
  if (value === "deny") return "border-green-700 bg-green-950/30";
  if (value === "ask") return "border-yellow-700 bg-yellow-950/30";
  return "border-red-700 bg-red-950/30";
}

function sandboxSeverity(mode: SandboxMode | undefined): Severity {
  if (mode === "all") return "safe";
  if (mode === "non-main") return "caution";
  return "danger";
}

function sandboxColor(mode: SandboxMode | undefined): string {
  if (mode === "all") return "border-green-700 bg-green-950/30";
  if (mode === "non-main") return "border-yellow-700 bg-yellow-950/30";
  return "border-red-700 bg-red-950/30";
}

function sandboxLabel(mode: SandboxMode | undefined): string {
  if (mode === "all") return "all agents";
  if (mode === "non-main") return "non-main only";
  return "disabled";
}

export function PermissionDashboard() {
  const [data, setData] = useState<ConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backups, setBackups] = useState<string[]>([]);
  const [showBackups, setShowBackups] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState<string | null>(null);

  async function loadConfig() {
    setLoading(true);
    try {
      const res = await fetch("/api/config");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Could not load configuration. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  async function loadBackups() {
    try {
      const res = await fetch("/api/config/backups");
      const json = await res.json();
      setBackups(json.backups);
    } catch {
      setError("Could not load backups.");
    }
  }

  async function restoreBackup(filename: string) {
    setRestoringBackup(filename);
    try {
      const res = await fetch("/api/config/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Restore failed");
        return;
      }
      await loadConfig();
      await loadBackups();
    } catch {
      setError("Failed to restore backup. Is the server running?");
    } finally {
      setRestoringBackup(null);
    }
  }

  useEffect(() => { loadConfig(); }, []);

  async function quickFix(key: string) {
    if (!data) return;
    const updated = structuredClone(data.config);
    updated.safeclaw.security[key as keyof typeof updated.safeclaw.security] = "deny";
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const json = await res.json();
      setData({ config: updated, score: json.score });
    } catch {
      setError("Quick fix failed. Is the server running?");
    }
  }

  async function quickFixSandbox() {
    if (!data) return;
    const updated = structuredClone(data.config);
    if (!updated.openclaw.agents) updated.openclaw.agents = { defaults: { sandbox: { mode: "all" } } };
    else if (!updated.openclaw.agents.defaults) updated.openclaw.agents.defaults = { sandbox: { mode: "all" } };
    else if (!updated.openclaw.agents.defaults.sandbox) updated.openclaw.agents.defaults.sandbox = { mode: "all" };
    else updated.openclaw.agents.defaults.sandbox.mode = "all";
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const json = await res.json();
      setData({ config: updated, score: json.score });
    } catch {
      setError("Quick fix failed. Is the server running?");
    }
  }

  async function quickFixGateway() {
    if (!data) return;
    const updated = structuredClone(data.config);
    if (!updated.openclaw.gateway) updated.openclaw.gateway = { bind: "loopback", mode: "local" };
    else {
      updated.openclaw.gateway.bind = "loopback";
      updated.openclaw.gateway.mode = "local";
    }
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const json = await res.json();
      setData({ config: updated, score: json.score });
    } catch {
      setError("Quick fix failed. Is the server running?");
    }
  }

  async function quickFixSkills() {
    if (!data) return;
    const updated = structuredClone(data.config);
    if (!updated.openclaw.skills) updated.openclaw.skills = { allowBundled: [] };
    else updated.openclaw.skills.allowBundled = [];
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const json = await res.json();
      setData({ config: updated, score: json.score });
    } catch {
      setError("Quick fix failed. Is the server running?");
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-slate-500">Loading configuration...</div>;
  }

  if (!data) {
    return <div className="flex items-center justify-center py-24 text-red-400">Failed to load configuration</div>;
  }

  const securityCards: PermissionCard[] = [
    { key: "shell", label: "Shell", value: data.config.safeclaw.security.shell, secureDefault: "deny" },
    { key: "filesystem", label: "Filesystem", value: data.config.safeclaw.security.filesystem, secureDefault: "deny" },
    { key: "browser", label: "Browser", value: data.config.safeclaw.security.browser, secureDefault: "deny" },
    { key: "network", label: "Network", value: data.config.safeclaw.security.network, secureDefault: "deny" },
  ];

  const sandboxMode = data.config.openclaw.agents?.defaults?.sandbox?.mode;
  const gatewayBind = data.config.openclaw.gateway?.bind;
  const allowBundled = data.config.openclaw.skills?.allowBundled || [];

  return (
    <div>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Top: Score gauge */}
      <div className="flex flex-col items-center mb-10">
        <SecurityScore score={data.score.score} grade={data.score.grade} size="lg" />
        <p className="mt-3 text-sm text-slate-400">Overall Security Score</p>
      </div>

      {/* Permission Grid */}
      <h3 className="text-lg font-bold text-slate-100 mb-4">Permission Status</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {securityCards.map((card) => (
          <div
            key={card.key}
            className={`rounded-xl border p-5 transition-all ${cardColor(card.value)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-slate-200">{card.label}</span>
              <RiskBadge severity={permissionSeverity(card.value)} />
            </div>
            <div className="font-mono text-sm text-slate-400 mb-3 capitalize">{card.value}</div>
            {card.value !== card.secureDefault && (
              <button
                onClick={() => quickFix(card.key)}
                className="w-full py-1.5 bg-green-800/50 hover:bg-green-700/50 border border-green-700 text-green-400 rounded-lg text-xs font-medium transition-colors"
              >
                Quick Fix → {card.secureDefault}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* OpenClaw Settings */}
      <h3 className="text-lg font-bold text-slate-100 mb-4">OpenClaw Settings</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Sandbox Mode */}
        <div className={`rounded-xl border p-5 ${sandboxColor(sandboxMode)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-slate-200">Sandbox</span>
            <RiskBadge severity={sandboxSeverity(sandboxMode)} />
          </div>
          <div className="font-mono text-sm text-slate-400 mb-3">{sandboxLabel(sandboxMode)}</div>
          {sandboxMode !== "all" && (
            <button onClick={quickFixSandbox} className="w-full py-1.5 bg-green-800/50 hover:bg-green-700/50 border border-green-700 text-green-400 rounded-lg text-xs font-medium transition-colors">
              Quick Fix → all
            </button>
          )}
        </div>

        {/* Gateway Bind */}
        <div className={`rounded-xl border p-5 ${gatewayBind && gatewayBind !== "loopback" ? "border-red-700 bg-red-950/30" : "border-green-700 bg-green-950/30"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-slate-200">Gateway Bind</span>
            <RiskBadge severity={gatewayBind && gatewayBind !== "loopback" ? "danger" : "safe"} />
          </div>
          <div className="font-mono text-sm text-slate-400 mb-3">{gatewayBind || "loopback"}</div>
          {gatewayBind && gatewayBind !== "loopback" && (
            <button onClick={quickFixGateway} className="w-full py-1.5 bg-green-800/50 hover:bg-green-700/50 border border-green-700 text-green-400 rounded-lg text-xs font-medium transition-colors">
              Quick Fix → loopback
            </button>
          )}
        </div>

        {/* Bundled Skills */}
        <div className={`rounded-xl border p-5 ${allowBundled.length > 0 ? "border-yellow-700 bg-yellow-950/30" : "border-green-700 bg-green-950/30"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-slate-200">Bundled Skills</span>
            <RiskBadge severity={allowBundled.length > 0 ? "caution" : "safe"} />
          </div>
          <div className="font-mono text-sm text-slate-400 mb-3">
            {allowBundled.length === 0 ? "none" : allowBundled.includes("*") ? "all enabled" : `${allowBundled.length} enabled`}
          </div>
          {allowBundled.length > 0 && (
            <button onClick={quickFixSkills} className="w-full py-1.5 bg-green-800/50 hover:bg-green-700/50 border border-green-700 text-green-400 rounded-lg text-xs font-medium transition-colors">
              Quick Fix → none
            </button>
          )}
        </div>
      </div>

      {/* Findings */}
      {data.score.findings.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-slate-100 mb-4">Findings</h3>
          <div className="space-y-2">
            {data.score.findings.map((f, i) => (
              <div key={i} className="flex items-start gap-3 bg-slate-900 border border-slate-800 rounded-lg p-3">
                <RiskBadge severity={f.severity} />
                <div>
                  <span className="text-sm font-mono text-slate-500">{f.setting}</span>
                  <p className="text-sm text-slate-300">{f.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Migration Advisor — only shown for scores below 40 (grade D or F) */}
      {data.score.score < 40 && (
        <div className="mt-8 rounded-xl border border-yellow-700 bg-yellow-950/30 p-6">
          <h3 className="text-lg font-bold text-yellow-300 mb-2">Migration Advisor</h3>
          <p className="text-sm text-yellow-200/80 leading-relaxed">
            Your configuration has critical security gaps that are difficult to fix at the application level.
            Consider{" "}
            <a
              href="https://github.com/qwibitai/nanoclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-300 underline hover:text-yellow-100"
            >
              NanoClaw
            </a>{" "}
            for OS-level container isolation, or apply the fixes above to improve your current setup.
          </p>
        </div>
      )}

      {/* Backups */}
      <div className="mt-8">
        <button
          onClick={() => { setShowBackups(!showBackups); if (!showBackups) loadBackups(); }}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-sm font-medium transition-colors"
        >
          {showBackups ? "Hide Backups" : "View Backups"}
        </button>
        {showBackups && (
          <div className="mt-4 space-y-2">
            {backups.length === 0 ? (
              <p className="text-sm text-slate-500">No backups found.</p>
            ) : (
              backups.map((filename) => (
                <div
                  key={filename}
                  className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-4 py-3"
                >
                  <span className="text-sm font-mono text-slate-300">{filename}</span>
                  <button
                    onClick={() => restoreBackup(filename)}
                    disabled={restoringBackup === filename}
                    className="px-3 py-1 bg-green-800/50 hover:bg-green-700/50 border border-green-700 text-green-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {restoringBackup === filename ? "Restoring..." : "Restore"}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
