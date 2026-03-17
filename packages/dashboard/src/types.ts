// Shared frontend types — single source of truth
// Backend canonical types live in @safeclaw/config-engine; these mirror them for the UI.

export type PermissionLevel = "deny" | "ask" | "allow";
export type Severity = "safe" | "caution" | "warning" | "danger";
export type SandboxMode = "off" | "non-main" | "all";
export type GatewayBind = "auto" | "lan" | "loopback" | "custom" | "tailnet";

export interface OpenClawConfig {
  meta?: { lastTouchedVersion?: string; lastTouchedAt?: string };
  agents?: { defaults?: { sandbox?: { mode?: SandboxMode } } };
  commands?: { native?: string; nativeSkills?: string; restart?: boolean; ownerDisplay?: string };
  gateway?: { mode?: string; bind?: GatewayBind; port?: number; auth?: { token?: string } };
  skills?: { allowBundled?: string[] };
  [key: string]: unknown;
}

export interface SafeClawConfig {
  security: {
    shell: PermissionLevel;
    filesystem: PermissionLevel;
    browser: PermissionLevel;
    network: PermissionLevel;
  };
  messaging: { allowlist: string[] };
}

export interface CombinedConfig {
  openclaw: OpenClawConfig;
  safeclaw: SafeClawConfig;
}

export interface SecuritySettingMeta {
  key: string;
  label: string;
  description: string;
  riskWhenAllowed: Severity;
  whatBreaksWhenDenied: string;
}

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

export interface ScanMatch {
  pattern: {
    id: string;
    name: string;
    description: string;
    impact: string;
    severity: Severity;
    category: string;
  };
  file: string;
  line: number;
  content: string;
}

export interface ScanResult {
  skillPath: string;
  matches: ScanMatch[];
  riskScore: number;
  riskLevel: Severity;
  summary: string;
  scannedFiles: number;
  platform: "openclaw" | "nanoclaw" | "unknown";
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: "config_read" | "config_write" | "config_restore" | "scan" | "profile_apply";
  severity: "info" | "warning" | "danger";
  summary: string;
  details?: Record<string, unknown>;
}
