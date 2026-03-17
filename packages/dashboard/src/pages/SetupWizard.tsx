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
  Minimal: "safe",
  Moderate: "caution",
  Elevated: "warning",
};

export function SetupWizard() {
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
      safeclaw: {
        ...config.safeclaw,
        security: { ...config.safeclaw.security, [key]: value },
      },
    });
  }

  function addToAllowlist() {
    if (!config || !allowlistInput.trim()) return;
    setConfig({
      ...config,
      safeclaw: {
        ...config.safeclaw,
        messaging: {
          ...config.safeclaw.messaging,
          allowlist: [...config.safeclaw.messaging.allowlist, allowlistInput.trim()],
        },
      },
    });
    setAllowlistInput("");
  }

  function removeFromAllowlist(item: string) {
    if (!config) return;
    setConfig({
      ...config,
      safeclaw: {
        ...config.safeclaw,
        messaging: {
          ...config.safeclaw.messaging,
          allowlist: config.safeclaw.messaging.allowlist.filter((i) => i !== item),
        },
      },
    });
  }

  async function goToReview() {
    if (!config) return;
    try {
      const res = await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
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
    } catch {
      setError("Failed to apply configuration. Is the server running?");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {["Profile", "Messaging", "Permissions", "Review"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <div className={`w-8 h-px ${i <= step ? "bg-green-600" : "bg-slate-700"}`} />}
            <button
              onClick={() => { if (i <= step) { setError(null); setStep(i); } }}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                i === step
                  ? "bg-green-900/50 text-green-400 border border-green-700"
                  : i < step
                    ? "bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
                    : "bg-slate-900 text-slate-600 border border-slate-800"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-xs">
                {i < step ? "✓" : i + 1}
              </span>
              {label}
            </button>
          </div>
        ))}
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Step 0: Choose profile */}
      {step === 0 && (
        <div>
          <h2 className="text-xl font-bold mb-2">Choose a security profile</h2>
          <p className="text-slate-400 mb-6 text-sm">Pick a starting point. You can fine-tune every setting in step 3.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProfile(p)}
                className="text-left rounded-xl border border-slate-700 bg-slate-900/60 p-6 hover:border-green-600 hover:bg-slate-900 transition-all group"
              >
                <div className="text-3xl mb-3">{p.emoji}</div>
                <div className="font-bold text-lg text-slate-100 mb-1">{p.name}</div>
                <RiskBadge severity={RISK_LEVEL_SEVERITY[p.riskLevel] || "caution"} className="mb-3" />
                <p className="text-sm text-slate-400 leading-relaxed">{p.description}</p>
                {p.id === "migrate" && (
                  <p className="text-xs text-purple-400 mt-3 leading-relaxed">
                    This profile is designed for users testing NanoClaw alongside OpenClaw. It minimizes OpenClaw's footprint so both can run safely.
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Messaging allowlist */}
      {step === 1 && config && (
        <div>
          <h2 className="text-xl font-bold mb-2">Who can message your agent?</h2>
          <p className="text-slate-400 mb-6 text-sm">
            Add user IDs or platform handles to the messaging allowlist.
            Leave empty to block all incoming messages.
          </p>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={allowlistInput}
              onChange={(e) => setAllowlistInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addToAllowlist()}
              placeholder="e.g. @username or user-id-123"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-green-600"
            />
            <button
              onClick={addToAllowlist}
              className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Add
            </button>
          </div>
          {config.safeclaw.messaging.allowlist.length > 0 ? (
            <div className="space-y-2 mb-6">
              {config.safeclaw.messaging.allowlist.map((item) => (
                <div key={item} className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg px-4 py-2">
                  <span className="text-sm font-mono text-slate-300">{item}</span>
                  <button
                    onClick={() => removeFromAllowlist(item)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 mb-6 bg-slate-900/50 rounded-lg p-3 border border-slate-800">
              No users in allowlist — all incoming messages will be blocked.
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors">
              Back
            </button>
            <button onClick={() => setStep(2)} className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors">
              Next: Permissions
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Fine-tune permissions */}
      {step === 2 && config && (
        <div>
          <h2 className="text-xl font-bold mb-2">Fine-tune permissions</h2>
          <p className="text-slate-400 mb-6 text-sm">
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
                value={config.safeclaw.security[meta.key as keyof typeof config.safeclaw.security] || "deny"}
                onChange={(v) => updateSecurity(meta.key, v)}
              />
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors">
              Back
            </button>
            <button onClick={goToReview} className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors">
              Review Config
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Apply */}
      {step === 3 && config && score && (
        <div>
          <h2 className="text-xl font-bold mb-6">Review & Apply</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score */}
            <div className="flex flex-col items-center bg-slate-900/60 border border-slate-700 rounded-xl p-8">
              <SecurityScore score={score.score} grade={score.grade} size="lg" />
              <p className="mt-4 text-sm text-slate-400">
                {score.score >= 90 ? "Excellent security posture." : score.score >= 70 ? "Good, but some settings could be tightened." : score.score >= 50 ? "Moderate risk. Review the findings below." : "High risk configuration. Consider tightening permissions."}
              </p>
            </div>

            {/* Config preview — show both files */}
            <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-6 overflow-auto">
              <h3 className="font-medium text-slate-300 mb-3 text-sm">OpenClaw Config (openclaw.json)</h3>
              <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap leading-relaxed mb-4">
                {JSON.stringify(config.openclaw, null, 2)}
              </pre>
              <h3 className="font-medium text-slate-300 mb-3 text-sm">SafeClaw Settings (safeclaw.json)</h3>
              <pre className="text-xs font-mono text-purple-400 whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(config.safeclaw, null, 2)}
              </pre>
            </div>
          </div>

          {/* Findings */}
          {score.findings.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium text-slate-300 mb-3 text-sm">Findings</h3>
              <div className="space-y-2">
                {score.findings.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 bg-slate-900 border border-slate-800 rounded-lg p-3">
                    <RiskBadge severity={f.severity} />
                    <div>
                      <span className="text-sm font-mono text-slate-400">{f.setting}</span>
                      <p className="text-sm text-slate-300">{f.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(2)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors">
              Back
            </button>
            {applied ? (
              <div className="px-4 py-2 bg-green-900/50 text-green-400 border border-green-700 rounded-lg text-sm font-medium">
                ✓ Config applied successfully
              </div>
            ) : (
              <button
                onClick={applyConfig}
                disabled={applying}
                className="px-6 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {applying ? "Applying..." : "Apply Config"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
