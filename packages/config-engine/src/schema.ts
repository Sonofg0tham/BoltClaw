// --- Permission levels (ClawGuard abstraction) ---

export type PermissionLevel = "deny" | "ask" | "allow";
export type Severity = "safe" | "caution" | "warning" | "danger";

// --- OpenClaw's real config schema ---

export type SandboxMode = "off" | "non-main" | "all";
export type GatewayMode = "local" | "remote";
export type GatewayBind = "auto" | "lan" | "loopback" | "custom" | "tailnet";

export interface OpenClawConfig {
  meta?: {
    lastTouchedVersion?: string;
    lastTouchedAt?: string;
  };
  agents?: {
    defaults?: {
      sandbox?: {
        mode?: SandboxMode;
      };
      memorySearch?: {
        enabled?: boolean;
      };
    };
  };
  commands?: {
    native?: string;
    nativeSkills?: string;
    restart?: boolean;
    ownerDisplay?: string;
  };
  gateway?: {
    mode?: GatewayMode;
    bind?: GatewayBind;
    port?: number;
    auth?: {
      token?: string;
    };
  };
  skills?: {
    allowBundled?: string[];
  };
  // Preserve any keys ClawGuard doesn't manage
  [key: string]: unknown;
}

// --- ClawGuard's sidecar config ---

export interface ClawGuardSecurity {
  shell: PermissionLevel;
  filesystem: PermissionLevel;
  browser: PermissionLevel;
  network: PermissionLevel;
}

export interface ClawGuardConfig {
  security: ClawGuardSecurity;
  messaging: {
    allowlist: string[];
  };
}

// --- Combined config (what the dashboard API works with) ---

export interface CombinedConfig {
  openclaw: OpenClawConfig;
  clawguard: ClawGuardConfig;
}

// --- Security setting metadata (for UI toggles) ---

export type SecuritySettingKey = keyof ClawGuardSecurity;

export interface SecuritySettingMeta {
  key: SecuritySettingKey;
  label: string;
  description: string;
  riskWhenAllowed: Severity;
  whatBreaksWhenDenied: string;
}

export const SECURITY_SETTINGS_META: SecuritySettingMeta[] = [
  {
    key: "shell",
    label: "Shell Access",
    description:
      "Allows the agent to execute shell commands on the host system. This includes running scripts, installing packages, and modifying system files.",
    riskWhenAllowed: "danger",
    whatBreaksWhenDenied:
      "Agent cannot run terminal commands, install dependencies, or execute scripts.",
  },
  {
    key: "filesystem",
    label: "Filesystem Access",
    description:
      "Allows the agent to read and write files on the host filesystem. This includes creating, modifying, and deleting files anywhere the user has access.",
    riskWhenAllowed: "warning",
    whatBreaksWhenDenied:
      "Agent cannot read or write any files. Skills that generate files (reports, code) will fail.",
  },
  {
    key: "browser",
    label: "Browser Access",
    description:
      "Allows the agent to open and control a browser instance. This enables web scraping, form filling, and interacting with web applications.",
    riskWhenAllowed: "caution",
    whatBreaksWhenDenied:
      "Agent cannot browse the web, fill forms, or scrape websites. Web research skills will fail.",
  },
  {
    key: "network",
    label: "Network Access",
    description:
      "Allows the agent to make outbound network requests (HTTP, WebSocket, etc.). This enables API calls, data fetching, and communication with external services.",
    riskWhenAllowed: "warning",
    whatBreaksWhenDenied:
      "Agent cannot make API calls or fetch data from the internet. Most integrations will fail.",
  },
];

// --- Defaults ---

export const DEFAULT_OPENCLAW_CONFIG: OpenClawConfig = {
  meta: {
    lastTouchedVersion: "2026.3.13",
    lastTouchedAt: new Date().toISOString(),
  },
  agents: {
    defaults: {
      sandbox: { mode: "all" },
    },
  },
  commands: {
    native: "auto",
    nativeSkills: "auto",
    restart: true,
    ownerDisplay: "raw",
  },
  gateway: {
    mode: "local",
    bind: "loopback",
    port: 18789,
    auth: { token: "" },
  },
  skills: {
    allowBundled: [],
  },
};

export const DEFAULT_SAFECLAW_CONFIG: ClawGuardConfig = {
  security: {
    shell: "deny",
    filesystem: "deny",
    browser: "deny",
    network: "deny",
  },
  messaging: {
    allowlist: [],
  },
};

export const DEFAULT_COMBINED_CONFIG: CombinedConfig = {
  openclaw: DEFAULT_OPENCLAW_CONFIG,
  clawguard: DEFAULT_SAFECLAW_CONFIG,
};
