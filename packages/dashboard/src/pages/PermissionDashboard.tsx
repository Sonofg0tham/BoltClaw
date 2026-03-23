import { useState, useEffect } from "react";
import { SecurityScore } from "../components/SecurityScore.js";
import { RiskBadge } from "../components/RiskBadge.js";
import { ErrorBanner } from "../components/ErrorBanner.js";
import { InfoIcon } from "../components/InfoIcon.js";
import type { PermissionLevel, Severity, CombinedConfig, ScoreResult, SandboxMode, ScanResult } from "../types.js";

interface ConfigResponse {
  config: CombinedConfig;
  score: ScoreResult;
}

interface PermissionCard {
  key: string;
  label: string;
  icon: string;
  value: PermissionLevel;
  secureDefault: PermissionLevel;
}

function permissionSeverity(value: PermissionLevel): Severity {
  if (value === "deny")  return "safe";
  if (value === "ask")   return "caution";
  return "danger";
}

function cardBorderColor(value: PermissionLevel): string {
  if (value === "deny")  return "rgba(74,222,128,0.2)";
  if (value === "ask")   return "rgba(251,191,36,0.2)";
  return "rgba(239,68,68,0.25)";
}

function cardBg(value: PermissionLevel): string {
  if (value === "deny")  return "rgba(20,83,45,0.15)";
  if (value === "ask")   return "rgba(113,63,18,0.15)";
  return "rgba(127,29,29,0.18)";
}

function sandboxSeverity(mode: SandboxMode | undefined): Severity {
  if (mode === "all")      return "safe";
  if (mode === "non-main") return "caution";
  return "danger";
}

function sandboxBg(mode: SandboxMode | undefined): string {
  if (mode === "all")      return cardBg("deny");
  if (mode === "non-main") return cardBg("ask");
  return cardBg("allow");
}

function sandboxBorder(mode: SandboxMode | undefined): string {
  if (mode === "all")      return cardBorderColor("deny");
  if (mode === "non-main") return cardBorderColor("ask");
  return cardBorderColor("allow");
}

function sandboxLabel(mode: SandboxMode | undefined): string {
  if (mode === "all")      return "all agents";
  if (mode === "non-main") return "non-main only";
  return "disabled";
}

const PERM_ICONS: Record<string, string> = {
  shell: "💻",
  filesystem: "📁",
  browser: "🌐",
  network: "📡",
};

export function PermissionDashboard() {
  const [data, setData] = useState<ConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backups, setBackups] = useState<string[]>([]);
  const [showBackups, setShowBackups] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState<string | null>(null);

  const [auditing, setAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<ScanResult[] | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

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

  async function runAudit() {
    setAuditing(true);
    setAuditResults(null);
    setAuditError(null);
    try {
      const res = await fetch("/api/scan/audit");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Audit failed");
      setAuditResults(json.results);
    } catch (err: any) {
      setAuditError(err.message);
    } finally {
      setAuditing(false);
    }
  }

  useEffect(() => { loadConfig(); }, []);

  async function quickFix(key: string) {
    if (!data) return;
    const updated = structuredClone(data.config);
    updated.clawguard.security[key as keyof typeof updated.clawguard.security] = "deny";
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
      setError("Quick fix failed.");
    }
  }

  async function quickFixGateway() {
    if (!data) return;
    const updated = structuredClone(data.config);
    if (!updated.openclaw.gateway) updated.openclaw.gateway = { bind: "loopback", mode: "local" };
    else { updated.openclaw.gateway.bind = "loopback"; updated.openclaw.gateway.mode = "local"; }
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const json = await res.json();
      setData({ config: updated, score: json.score });
    } catch {
      setError("Quick fix failed.");
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
      setError("Quick fix failed.");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div
          className="w-12 h-12 rounded-full border-2 animate-spin mb-4"
          style={{ borderColor: "rgba(220,38,38,0.2)", borderTopColor: "#dc2626" }}
        />
        <p className="text-slate-500 text-sm">Loading configuration…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <p style={{ color: "#f87171" }}>Failed to load configuration</p>
      </div>
    );
  }

  const securityCards: PermissionCard[] = [
    { key: "shell",      label: "Shell",      icon: PERM_ICONS.shell,      value: data.config.clawguard.security.shell,      secureDefault: "deny" },
    { key: "filesystem", label: "Filesystem", icon: PERM_ICONS.filesystem, value: data.config.clawguard.security.filesystem, secureDefault: "deny" },
    { key: "browser",    label: "Browser",    icon: PERM_ICONS.browser,    value: data.config.clawguard.security.browser,    secureDefault: "deny" },
    { key: "network",    label: "Network",    icon: PERM_ICONS.network,    value: data.config.clawguard.security.network,     secureDefault: "deny" },
  ];

  const sandboxMode  = data.config.openclaw.agents?.defaults?.sandbox?.mode;
  const gatewayBind  = data.config.openclaw.gateway?.bind;
  const allowBundled = data.config.openclaw.skills?.allowBundled || [];

  return (
    <div className="animate-fade-in">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* ─── Score hero ─────────────────────────────────── */}
      <div className="flex flex-col items-center mb-12">
        <SecurityScore score={data.score.score} grade={data.score.grade} size="lg" />
        <p className="mt-4 text-sm text-slate-500 font-mono tracking-wide uppercase flex items-center gap-2" style={{ letterSpacing: "0.1em" }}>
          Overall Security Score
          <InfoIcon text="Scored 0–100 based on your permission levels, sandbox mode, and gateway settings. A = 90–100, B = 75–89, C = 60–74, D = 40–59, F = below 40. Higher is safer." />
        </p>
      </div>

      {/* ─── Permission grid ────────────────────────────── */}
      <h3 className="section-heading flex items-center gap-2">
        <span
          className="inline-block w-1 h-5 rounded-full"
          style={{ background: "linear-gradient(180deg, #dc2626, #7f1d1d)" }}
        />
        Permission Status
        <InfoIcon text="Controls what OpenClaw's agent can access. Deny blocks it completely. Ask prompts you each time before allowing. Allow grants unrestricted access — avoid this unless necessary." />
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {securityCards.map((card) => (
          <div
            key={card.key}
            className="perm-card rounded-2xl p-5"
            style={{ background: cardBg(card.value), border: `1px solid ${cardBorderColor(card.value)}` }}
          >
            <span className="text-2xl mb-3 block">{card.icon}</span>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-200 text-sm">{card.label}</span>
              <RiskBadge severity={permissionSeverity(card.value)} />
            </div>
            <div className="font-mono text-xs mb-3 capitalize" style={{ color: "#64748b" }}>{card.value}</div>
            {card.value !== card.secureDefault && (
              <button
                onClick={() => quickFix(card.key)}
                className="btn-success w-full justify-center text-xs py-1.5"
              >
                Quick Fix → {card.secureDefault}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ─── OpenClaw settings ──────────────────────────── */}
      <h3 className="section-heading flex items-center gap-2">
        <span
          className="inline-block w-1 h-5 rounded-full"
          style={{ background: "linear-gradient(180deg, #dc2626, #7f1d1d)" }}
        />
        OpenClaw Settings
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {/* Sandbox Mode */}
        <div
          className="perm-card rounded-2xl p-5"
          style={{ background: sandboxBg(sandboxMode), border: `1px solid ${sandboxBorder(sandboxMode)}` }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-slate-200 text-sm flex items-center gap-1.5">
              Sandbox Mode
              <InfoIcon text="Sandboxing isolates agents so they can't interfere with each other or your system. 'All' is safest. 'Non-main' only isolates sub-agents. 'Off' means no isolation at all." />
            </span>
            <RiskBadge severity={sandboxSeverity(sandboxMode)} />
          </div>
          <div className="font-mono text-xs mb-3" style={{ color: "#64748b" }}>{sandboxLabel(sandboxMode)}</div>
          {sandboxMode !== "all" && (
            <button onClick={quickFixSandbox} className="btn-success w-full justify-center text-xs py-1.5">
              Quick Fix → all
            </button>
          )}
        </div>

        {/* Gateway Bind */}
        <div
          className="perm-card rounded-2xl p-5"
          style={{
            background: gatewayBind && gatewayBind !== "loopback" ? cardBg("allow") : cardBg("deny"),
            border:     `1px solid ${gatewayBind && gatewayBind !== "loopback" ? cardBorderColor("allow") : cardBorderColor("deny")}`,
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-slate-200 text-sm flex items-center gap-1.5">
              Gateway Bind
              <InfoIcon text="Controls which network interfaces OpenClaw listens on. Loopback means only your own machine can connect — safest. LAN or auto exposes it to other devices on your network." />
            </span>
            <RiskBadge severity={gatewayBind && gatewayBind !== "loopback" ? "danger" : "safe"} />
          </div>
          <div className="font-mono text-xs mb-3" style={{ color: "#64748b" }}>{gatewayBind || "loopback"}</div>
          {gatewayBind && gatewayBind !== "loopback" && (
            <button onClick={quickFixGateway} className="btn-success w-full justify-center text-xs py-1.5">
              Quick Fix → loopback
            </button>
          )}
        </div>

        {/* Bundled Skills */}
        <div
          className="perm-card rounded-2xl p-5"
          style={{
            background: allowBundled.length > 0 ? cardBg("ask") : cardBg("deny"),
            border:     `1px solid ${allowBundled.length > 0 ? cardBorderColor("ask") : cardBorderColor("deny")}`,
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-slate-200 text-sm flex items-center gap-1.5">
              Bundled Skills
              <InfoIcon text="Pre-installed skills that ship with OpenClaw. Disabling them means only skills you've explicitly approved can run — reduces your attack surface." />
            </span>
            <RiskBadge severity={allowBundled.length > 0 ? "caution" : "safe"} />
          </div>
          <div className="font-mono text-xs mb-3" style={{ color: "#64748b" }}>
            {allowBundled.length === 0 ? "none" : allowBundled.includes("*") ? "all enabled" : `${allowBundled.length} enabled`}
          </div>
          {allowBundled.length > 0 && (
            <button onClick={quickFixSkills} className="btn-success w-full justify-center text-xs py-1.5 mb-2">
              Quick Fix → none
            </button>
          )}
          <button onClick={runAudit} disabled={auditing} className="btn-secondary w-full justify-center text-xs py-1.5">
            {auditing ? "Auditing..." : "Audit All Installed"}
          </button>
        </div>
      </div>

      {/* ─── Findings ───────────────────────────────────── */}
      {data.score.findings.length > 0 && (
        <div className="mb-8">
          <h3 className="section-heading flex items-center gap-2">
            <span
              className="inline-block w-1 h-5 rounded-full"
              style={{ background: "linear-gradient(180deg, #dc2626, #7f1d1d)" }}
            />
            Findings
          </h3>
          <div className="space-y-2">
            {data.score.findings.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{ background: "rgba(7,12,20,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <RiskBadge severity={f.severity} />
                <div>
                  <span className="text-xs font-mono" style={{ color: "#475569" }}>{f.setting}</span>
                  <p className="text-sm text-slate-300">{f.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Audit Results ──────────────────────────────── */}
      {(auditResults || auditError) && (
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-heading flex items-center gap-2 mb-0">
              <span
                className="inline-block w-1 h-5 rounded-full"
                style={{ background: "linear-gradient(180deg, #dc2626, #7f1d1d)" }}
              />
              Audit Results
            </h3>
            <button onClick={runAudit} disabled={auditing} className="btn-secondary text-xs py-1 px-3">
              {auditing ? "..." : "Re-run Audit"}
            </button>
          </div>
          
          {auditError && (
            <div className="rounded-xl px-4 py-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 mb-4">
              {auditError}
            </div>
          )}

          {auditResults && (
            <div className="space-y-2">
              {auditResults.length === 0 ? (
                <p className="text-sm text-slate-500">No installed skills found in the configured directory.</p>
              ) : (
                auditResults.map((res, i) => (
                  <div
                    key={res.skillPath + i}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl px-4 py-3"
                    style={{ background: "rgba(7,12,20,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <RiskBadge severity={res.riskLevel} />
                        <span className="text-sm font-semibold text-slate-200">{res.skillPath}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Score: {res.riskScore} — {res.matches.length} matches found
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Migration Advisor ───────────────────────────── */}
      {data.score.score < 40 && (
        <div
          className="rounded-2xl p-6 mb-8"
          style={{
            background: "rgba(113,63,18,0.2)",
            border: "1px solid rgba(251,191,36,0.25)",
          }}
        >
          <h3 className="font-bold mb-2" style={{ color: "#fbbf24" }}>Migration Advisor</h3>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(253,230,138,0.8)" }}>
            Your configuration has critical security gaps. Consider{" "}
            <a
              href="https://github.com/qwibitai/nanoclaw"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#fbbf24", textDecoration: "underline" }}
            >
              NanoClaw
            </a>{" "}
            for OS-level container isolation, or apply the Quick Fixes above.
          </p>
        </div>
      )}

      {/* ─── Backups ─────────────────────────────────────── */}
      <div className="mt-4">
        <button
          onClick={() => {
            setShowBackups(!showBackups);
            if (!showBackups) loadBackups();
          }}
          className="btn-ghost"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points={showBackups ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
          </svg>
          {showBackups ? "Hide Backups" : "View Backups"}
        </button>

        {showBackups && (
          <div className="mt-4 space-y-2 animate-fade-in">
            {backups.length === 0 ? (
              <p className="text-sm" style={{ color: "#475569" }}>No backups found.</p>
            ) : (
              backups.map((filename) => (
                <div
                  key={filename}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <span className="text-sm font-mono text-slate-300">{filename}</span>
                  <button
                    onClick={() => restoreBackup(filename)}
                    disabled={restoringBackup === filename}
                    className="btn-success text-xs py-1.5 px-3"
                  >
                    {restoringBackup === filename ? "Restoring…" : "Restore"}
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
