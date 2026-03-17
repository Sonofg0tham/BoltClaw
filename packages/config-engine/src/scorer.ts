import type { CombinedConfig, Severity } from "./schema.js";

export interface ScoreResult {
  score: number;
  grade: string;
  findings: Finding[];
}

export interface Finding {
  setting: string;
  severity: Severity;
  message: string;
}

export function scoreConfig(config: CombinedConfig): ScoreResult {
  let score = 100;
  const findings: Finding[] = [];

  // --- SafeClaw security toggles ---
  const permWeights: Record<string, number> = {
    shell: 30,
    filesystem: 20,
    browser: 10,
    network: 20,
  };

  for (const [key, weight] of Object.entries(permWeights)) {
    const val = config.safeclaw.security[key as keyof typeof config.safeclaw.security];
    if (val === "allow") {
      score -= weight;
      findings.push({
        setting: `security.${key}`,
        severity: weight >= 20 ? "danger" : "warning",
        message: `${key} access is set to "allow" — the agent has unrestricted ${key} access.`,
      });
    } else if (val === "ask") {
      score -= Math.floor(weight / 3);
      findings.push({
        setting: `security.${key}`,
        severity: "caution",
        message: `${key} access is set to "ask" — the agent will prompt before using ${key}.`,
      });
    }
  }

  // --- OpenClaw: sandbox mode ---
  const sandboxMode = config.openclaw.agents?.defaults?.sandbox?.mode;
  if (sandboxMode === "off") {
    score -= 20;
    findings.push({
      setting: "agents.defaults.sandbox.mode",
      severity: "danger",
      message: "Sandbox is disabled. Agents run without container isolation.",
    });
  } else if (sandboxMode === "non-main") {
    score -= 7;
    findings.push({
      setting: "agents.defaults.sandbox.mode",
      severity: "caution",
      message: "Only non-main agents are sandboxed. The main agent runs without isolation.",
    });
  }

  // --- OpenClaw: gateway exposure ---
  const bind = config.openclaw.gateway?.bind;
  if (bind && bind !== "loopback") {
    score -= 15;
    findings.push({
      setting: "gateway.bind",
      severity: "danger",
      message: `Gateway is bound to "${bind}". Anyone who can reach this machine can interact with the agent.`,
    });
  }

  // --- OpenClaw: bundled skills ---
  const allowBundled = config.openclaw.skills?.allowBundled;
  if (allowBundled && allowBundled.length > 0) {
    score -= 5;
    findings.push({
      setting: "skills.allowBundled",
      severity: "caution",
      message: allowBundled.includes("*")
        ? "All bundled skills are enabled. Consider enabling only what you need."
        : `${allowBundled.length} bundled skill(s) enabled.`,
    });
  }

  // --- SafeClaw: messaging allowlist ---
  if (config.safeclaw.messaging.allowlist.length === 0) {
    // No allowlist is secure (no one can message)
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    grade: scoreToGrade(score),
    findings,
  };
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}
