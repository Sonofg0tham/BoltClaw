import type {
  CombinedConfig,
  OpenClawConfig,
  ClawGuardConfig,
  PermissionLevel,
  GatewayBind,
  SandboxMode,
} from "./schema.js";

/**
 * Apply ClawGuard security settings to the OpenClaw config.
 * Maps ClawGuard abstractions to real OpenClaw fields where possible.
 */
export function applyClawGuardToOpenClaw(combined: CombinedConfig): OpenClawConfig {
  const oc = structuredClone(combined.openclaw);
  const sc = combined.clawguard;

  // Network access toggle → gateway.bind + gateway.mode
  if (sc.security.network === "allow") {
    oc.gateway = { ...oc.gateway, bind: "lan", mode: "remote" };
  } else {
    oc.gateway = { ...oc.gateway, bind: "loopback", mode: "local" };
  }

  // Update meta timestamp
  oc.meta = {
    ...oc.meta,
    lastTouchedAt: new Date().toISOString(),
  };

  return oc;
}

/**
 * Infer ClawGuard settings from an OpenClaw config.
 * Used when someone edits openclaw.json directly.
 */
export function inferClawGuardFromOpenClaw(oc: OpenClawConfig): Partial<ClawGuardConfig> {
  const inferred: Partial<ClawGuardConfig> = {};

  // Infer network access from gateway.bind
  const bind = oc.gateway?.bind;
  if (bind) {
    const networkLevel = gatewayBindToPermission(bind);
    inferred.security = {
      shell: "deny",
      filesystem: "deny",
      browser: "deny",
      network: networkLevel,
    };
  }

  return inferred;
}

function gatewayBindToPermission(bind: GatewayBind): PermissionLevel {
  if (bind === "lan" || bind === "auto" || bind === "tailnet" || bind === "custom") return "allow";
  return "deny"; // loopback
}

export function sandboxModeToLabel(mode: SandboxMode): string {
  if (mode === "all") return "All agents sandboxed";
  if (mode === "non-main") return "Non-main agents sandboxed";
  return "Sandbox disabled";
}

export function sandboxModeSeverity(mode: SandboxMode): "safe" | "caution" | "danger" {
  if (mode === "all") return "safe";
  if (mode === "non-main") return "caution";
  return "danger";
}
