import { useState, useEffect } from "react";
import { SecurityScore } from "../components/SecurityScore.js";
import { PermissionToggle } from "../components/PermissionToggle.js";
import { RiskBadge } from "../components/RiskBadge.js";
import { ErrorBanner } from "../components/ErrorBanner.js";
import type { PermissionLevel, Severity, CombinedConfig, SecuritySettingMeta, ScoreResult } from "../types.js";

interface SecurityProfile {
  id: string;
  name: string;
  emoji: string;
  description: string;
  riskLevel: string;
  config: CombinedConfig;
}

const SETTINGS_META: SecuritySettingMeta[] = [
  {
    key: "shell",
    label: "Shell Access",
    description: "Allows the agent to execute shell commands on the host system.",
    riskWhenAllowed: "danger",
    whatBreaksWhenDenied: "Agent cannot run terminal commands, install dependencies, or execute scripts.",
  },
  {
    key: "filesystem",
    label: "Filesystem Access",
    description: "Allows the agent to read and write files on the host filesystem.",
    riskWhenAllowed: "warning",
    whatBreaksWhenDenied: "Agent cannot read or write any files. Skills that generate files will fail.",
  },
  {
    key: "browser",
    label: "Browser Access",
    description: "Allows the agent to open and control a browser instance.",
    riskWhenAllowed: "caution",
    whatBreaksWhenDenied: "Agent cannot browse the web, fill forms, or scrape websites.",
  },
  {
    key: "network",
    label: "Network Access",
    description: "Allows the agent to make outbound network requests.",
    riskWhenAllowed: "warning",
    whatBreaksWhenDenied: "Agent cannot make API calls or fetch data from the internet.",
  },
];

const RISK_LEVEL_SEVERITY: Record<string, Severity> = {
  Minimal:  "safe",
  Moderate: "caution",
  Elevated: "warning",
};

const PROFILE_STYLES: Record<string, { gradient: string; accent: string; glow: string }> = {
  lockdown:  { gradient: "linear-gradient(135deg, rgba(20,83,45,0.25), rgba(5,46,22,0.15))",   accent: "rgba(74,222,128,0.25)", glow: "rgba(34,197,94,0.15)" },
  balanced:  { gradient: "linear-gradient(135deg, rgba(30,64,175,0.25), rgba(15,23,42,0.15))",  accent: "rgba(96,165,250,0.25)", glow: "rgba(59,130,246,0.15)" },
  developer: { gradient: "linear-gradient(135deg, rgba(113,63,18,0.25), rgba(60,33,8,0.15))",   accent: "rgba(251,191,36,0.25)", glow: "rgba(234,179,8,0.15)"  },
  migrate:   { gradient: "linear-gradient(135deg, rgba(88,28,135,0.25), rgba(46,16,101,0.15))", accent: "rgba(192,132,252,0.25)", glow: "rgba(168,85,247,0.15)" },
};

const STEPS = ["Profile", "Messaging", "Permissions", "Review"];

export function SetupWizard({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(0);
  const [profiles, setProfiles] = useState<SecurityProfile[]>([]);
  const [config, setConfig] = useState<CombinedConfig | null>(null);
  const [allowlistInput, setAllowlistInput] = useState("");
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((d) => setProfiles(d.profiles))
      .catch(() => setError("Could not load security profiles. Is the server running?"));
  }, []);

  function selectProfile(profile: SecurityProfile) {
    setConfig(structuredClone(profile.config));
    setError(null);
    setStep(1);
  }

  function updateSecurity(key: string, value: PermissionLevel) {
    if (!config) return;
    setConfig({
      ...config,
      clawguard: {
        ...config.clawguard,
        security: { ...config.clawguard.security, [key]: value },
      },
    });
  }

  function addToAllowlist() {
    if (!config || !allowlistInput.trim()) return;
    setConfig({
      ...config,
      clawguard: {
        ...config.clawguard,
        messaging: {
          ...config.clawguard.messaging,
          allowlist: [...config.clawguard.messaging.allowlist, allowlistInput.trim()],
        },
      },
    });
    setAllowlistInput("");
  }

  function removeFromAllowlist(item: string) {
    if (!config) return;
    setConfig({
      ...config,
      clawguard: {
        ...config.clawguard,
        messaging: {
          ...config.clawguard.messaging,
          allowlist: config.clawguard.messaging.allowlist.filter((i) => i !== item),
        },
      },
    });
  }

  async function goToReview() {
    if (!config) return;
    try {
      const res = await fetch("/api/config/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setScore(data.score);
    } catch {
      setError("Could not generate score. Is the server running?");
      return;
    }
    setStep(3);
  }

  async function applyConfig() {
    if (!config) return;
    setApplying(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setScore(data.score);
      setApplied(true);
      setTimeout(() => onComplete?.(), 1500);
    } catch {
      setError("Failed to apply configuration. Is the server running?");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="animate-fade-in">
      {/* ─── Step progress bar ───────────────────────────── */}
      <div className="flex items-center mb-10">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => { if (i <= step) { setError(null); setStep(i); } }}
              className="flex items-center gap-2.5 group shrink-0"
              disabled={i > step}
            >
              {/* Circle */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={
                  i < step
                    ? { background: "rgba(220,38,38,0.2)", color: "#f87171", border: "1.5px solid rgba(220,38,38,0.4)" }
                    : i === step
                    ? { background: "#dc2626", color: "#fff", boxShadow: "0 0 14px rgba(220,38,38,0.5)" }
                    : { background: "rgba(255,255,255,0.04)", color: "#334155", border: "1.5px solid rgba(255,255,255,0.08)" }
                }
              >
                {i < step ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {/* Label */}
              <span
                className="text-sm font-medium hidden sm:inline transition-colors"
                style={{ color: i === step ? "#e2e8f0" : i < step ? "#94a3b8" : "#334155" }}
              >
                {label}
              </span>
            </button>

            {/* Connector */}
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-px mx-3 transition-all duration-500"
                style={{
                  background: i < step
                    ? "linear-gradient(90deg, rgba(220,38,38,0.5), rgba(220,38,38,0.2))"
                    : "rgba(255,255,255,0.06)",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* ─── Step 0: Choose profile ───────────────────────── */}
      {step === 0 && (
        <div className="animate-fade-in">
          <h2 className="text-2xl font-bold text-slate-100 mb-1.5">Choose a security profile</h2>
          <p className="text-slate-500 mb-8 text-sm">Pick a starting point — you can fine-tune every setting in step 3.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {profiles.map((p) => {
              const style = PROFILE_STYLES[p.id] || PROFILE_STYLES.balanced;
              return (
                <button
                  key={p.id}
                  onClick={() => selectProfile(p)}
                  className="text-left rounded-2xl p-6 transition-all duration-200 group"
                  style={{
                    background:    style.gradient,
                    border:        `1px solid ${style.accent}`,
                    backdropFilter: "blur(8px)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 28px ${style.glow}`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "";
                    (e.currentTarget as HTMLElement).style.boxShadow = "";
                  }}
                >
                  <div className="text-3xl mb-3">{p.emoji}</div>
                  <div className="font-bold text-base text-slate-100 mb-2">{p.name}</div>
                  <RiskBadge severity={RISK_LEVEL_SEVERITY[p.riskLevel] || "caution"} className="mb-3" />
                  <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>
                  {p.id === "migrate" && (
                    <p className="text-xs mt-3 leading-relaxed" style={{ color: "#c084fc" }}>
                      Designed for testing NanoClaw alongside OpenClaw.
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Step 1: Messaging allowlist ─────────────────── */}
      {step === 1 && config && (
        <div className="animate-fade-in max-w-2xl">
          <h2 className="text-2xl font-bold text-slate-100 mb-1.5">Who can message your agent?</h2>
          <p className="text-slate-500 mb-8 text-sm">
            Add user IDs or platform handles to the messaging allowlist. Leave empty to block all incoming messages.
          </p>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={allowlistInput}
              onChange={(e) => setAllowlistInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addToAllowlist()}
              placeholder="e.g. @username or user-id-123"
              className="input-dark"
            />
            <button onClick={addToAllowlist} className="btn-primary shrink-0">Add</button>
          </div>

          {config.clawguard.messaging.allowlist.length > 0 ? (
            <div className="space-y-2 mb-6">
              {config.clawguard.messaging.allowlist.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-xl px-4 py-2.5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <span className="text-sm font-mono text-slate-300">{item}</span>
                  <button
                    onClick={() => removeFromAllowlist(item)}
                    className="text-xs transition-colors"
                    style={{ color: "#f87171" }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="rounded-xl px-4 py-3 mb-6 text-sm"
              style={{
                background: "rgba(127,29,29,0.12)",
                border:    "1px solid rgba(220,38,38,0.18)",
                color:     "#94a3b8",
              }}
            >
              No users in allowlist — all incoming messages will be blocked.
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="btn-ghost">← Back</button>
            <button onClick={() => setStep(2)} className="btn-primary">Next: Permissions →</button>
          </div>
        </div>
      )}

      {/* ─── Step 2: Fine-tune permissions ───────────────── */}
      {step === 2 && config && (
        <div className="animate-fade-in max-w-2xl">
          <h2 className="text-2xl font-bold text-slate-100 mb-1.5">Fine-tune permissions</h2>
          <p className="text-slate-500 mb-8 text-sm">
            Configure what your agent can access. Each toggle shows the risk level and what breaks if denied.
          </p>
          <div className="space-y-3 mb-6">
            {SETTINGS_META.map((meta) => (
              <PermissionToggle
                key={meta.key}
                label={meta.label}
                description={meta.description}
                riskWhenAllowed={meta.riskWhenAllowed}
                whatBreaksWhenDenied={meta.whatBreaksWhenDenied}
                value={config.clawguard.security[meta.key as keyof typeof config.clawguard.security] || "deny"}
                onChange={(v) => updateSecurity(meta.key, v)}
              />
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-ghost">← Back</button>
            <button onClick={goToReview} className="btn-primary">Review Config →</button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Review & Apply ───────────────────────── */}
      {step === 3 && config && score && (
        <div className="animate-fade-in">
          <h2 className="text-2xl font-bold text-slate-100 mb-8">Review &amp; Apply</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Score panel */}
            <div
              className="flex flex-col items-center rounded-2xl p-8"
              style={{
                background: "rgba(13,21,38,0.7)",
                border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(12px)",
              }}
            >
              <SecurityScore score={score.score} grade={score.grade} size="lg" />
              <p className="mt-5 text-sm text-slate-400 text-center max-w-[240px] leading-relaxed">
                {score.score >= 90
                  ? "Excellent security posture — you're well protected."
                  : score.score >= 70
                  ? "Good, but some settings could be tightened."
                  : score.score >= 50
                  ? "Moderate risk. Review the findings before applying."
                  : "High risk configuration. Consider tightening permissions."}
              </p>
            </div>

            {/* Config preview */}
            <div
              className="rounded-2xl p-5 overflow-auto"
              style={{
                background: "rgba(7,12,20,0.8)",
                border: "1px solid rgba(255,255,255,0.07)",
                maxHeight: "360px",
              }}
            >
              <p className="text-xs font-mono text-slate-500 mb-2">openclaw.json</p>
              <pre className="text-xs font-mono leading-relaxed mb-4" style={{ color: "#4ade80" }}>
                {JSON.stringify(config.openclaw, null, 2)}
              </pre>
              <p className="text-xs font-mono text-slate-500 mb-2">clawguard.json</p>
              <pre className="text-xs font-mono leading-relaxed" style={{ color: "#c084fc" }}>
                {JSON.stringify(config.clawguard, null, 2)}
              </pre>
            </div>
          </div>

          {/* Findings */}
          {score.findings.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Findings</h3>
              <div className="space-y-2">
                {score.findings.map((f, i) => (
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

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-ghost">← Back</button>
            {applied ? (
              <div
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: "rgba(20,83,45,0.4)",
                  color:      "#4ade80",
                  border:     "1px solid rgba(74,222,128,0.3)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Config applied successfully
              </div>
            ) : (
              <button onClick={applyConfig} disabled={applying} className="btn-primary">
                {applying ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                    </svg>
                    Applying…
                  </>
                ) : (
                  "Apply Config"
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
