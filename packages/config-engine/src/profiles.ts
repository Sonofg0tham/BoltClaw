import type { CombinedConfig } from "./schema.js";

export interface SecurityProfile {
  id: string;
  name: string;
  emoji: string;
  description: string;
  riskLevel: string;
  config: CombinedConfig;
}

export const PROFILES: SecurityProfile[] = [
  {
    id: "lockdown",
    name: "Lockdown",
    emoji: "\u{1F6E1}\uFE0F",
    description:
      "Maximum security. All permissions denied, sandbox enforced on all agents. The agent can only respond to messages — it cannot access files, the network, or run commands. Ideal for untrusted environments or initial testing.",
    riskLevel: "Minimal",
    config: {
      openclaw: {
        agents: { defaults: { sandbox: { mode: "all" } } },
        commands: { native: "auto", nativeSkills: "auto", restart: true, ownerDisplay: "raw" },
        gateway: { mode: "local", bind: "loopback", port: 18789, auth: { token: "" } },
        skills: { allowBundled: [] },
      },
      boltclaw: {
        security: { shell: "deny", filesystem: "deny", browser: "deny", network: "deny" },
        messaging: { allowlist: [] },
      },
    },
  },
  {
    id: "balanced",
    name: "Balanced",
    emoji: "\u2696\uFE0F",
    description:
      "Sensible defaults for everyday use. The agent can browse the web and access the filesystem with a prompt, but shell access and network exposure remain locked down. Sandbox runs on non-main agents.",
    riskLevel: "Moderate",
    config: {
      openclaw: {
        agents: { defaults: { sandbox: { mode: "non-main" } } },
        commands: { native: "auto", nativeSkills: "auto", restart: true, ownerDisplay: "raw" },
        gateway: { mode: "local", bind: "loopback", port: 18789, auth: { token: "" } },
        skills: { allowBundled: ["*"] },
      },
      boltclaw: {
        security: { shell: "deny", filesystem: "ask", browser: "ask", network: "ask" },
        messaging: { allowlist: [] },
      },
    },
  },
  {
    id: "developer",
    name: "Developer",
    emoji: "\u{1F6E0}\uFE0F",
    description:
      "Permissive settings for developers who need the agent to run commands and write code. Shell and filesystem access are granted, but the agent still prompts for network calls. Sandbox runs on non-main agents. Not recommended for production.",
    riskLevel: "Elevated",
    config: {
      openclaw: {
        agents: { defaults: { sandbox: { mode: "non-main" } } },
        commands: { native: "auto", nativeSkills: "auto", restart: true, ownerDisplay: "raw" },
        gateway: { mode: "local", bind: "loopback", port: 18789, auth: { token: "" } },
        skills: { allowBundled: ["*"] },
      },
      boltclaw: {
        security: { shell: "ask", filesystem: "allow", browser: "ask", network: "ask" },
        messaging: { allowlist: [] },
      },
    },
  },
  {
    id: "migrate",
    name: "Migration Ready",
    emoji: "\u{1F680}",
    description:
      "Minimal config for users evaluating alternative agent platforms. Disables everything except basic chat functionality so you can test in parallel without conflicts.",
    riskLevel: "Minimal",
    config: {
      openclaw: {
        agents: { defaults: { sandbox: { mode: "all" } } },
        commands: { native: "auto", nativeSkills: "auto", restart: true, ownerDisplay: "raw" },
        gateway: { mode: "local", bind: "loopback", port: 18789, auth: { token: "" } },
        skills: { allowBundled: [] },
      },
      boltclaw: {
        security: { shell: "deny", filesystem: "deny", browser: "deny", network: "deny" },
        messaging: { allowlist: [] },
      },
    },
  },
];
