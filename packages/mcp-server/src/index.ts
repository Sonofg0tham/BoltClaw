import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import {
  readConfig,
  writeConfig,
  listBackups,
  restoreConfig,
  scoreConfig,
  PROFILES,
} from "@boltclaw/config-engine";
import type { PermissionLevel, SandboxMode, GatewayBind } from "@boltclaw/config-engine";
import { scanSkill } from "@boltclaw/skill-scanner";

const server = new McpServer(
  {
    name: "boltclaw",
    version: "0.1.0",
  },
  {
    capabilities: { logging: {} },
  },
);

// --- scan_skill ---

server.registerTool(
  "scan_skill",
  {
    title: "Scan Skill",
    description:
      "Scan an OpenClaw or NanoClaw skill for security threats before installation. " +
      "Checks for 15 threat patterns across 6 categories: exfiltration, injection, " +
      "obfuscation, permissions, filesystem, and execution. " +
      "Accepts a local path to a skill directory/file.",
    inputSchema: z.object({
      path: z.string().describe("Local path to the skill directory or file to scan"),
    }),
  },
  async ({ path }: { path: string }) => {
    try {
      const result = await scanSkill(path);

      const lines: string[] = [
        `## Skill Scan Results`,
        ``,
        `**Path:** ${result.skillPath}`,
        `**Platform:** ${result.platform}`,
        `**Risk Level:** ${result.riskLevel.toUpperCase()}`,
        `**Risk Score:** ${result.riskScore}/100`,
        `**Files Scanned:** ${result.scannedFiles}`,
        ``,
        result.summary,
      ];

      if (result.matches.length > 0) {
        lines.push(``, `### Findings`);
        for (const m of result.matches) {
          lines.push(
            ``,
            `- **${m.pattern.name}** [${m.pattern.severity.toUpperCase()}]`,
            `  - File: ${m.file}:${m.line}`,
            `  - ${m.pattern.description}`,
            `  - **Why this matters:** ${m.pattern.impact}`,
            `  - Code: \`${m.content}\``,
          );
        }
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Scan failed: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  },
);

// --- get_security_config ---

server.registerTool(
  "get_security_config",
  {
    title: "Get Security Config",
    description:
      "Read the current OpenClaw + BoltClaw configuration and return the security score, " +
      "grade (A-F), and any findings. Shows permission levels (shell, filesystem, browser, network), " +
      "sandbox mode, gateway binding, and bundled skills status.",
    inputSchema: z.object({
      configDir: z
        .string()
        .optional()
        .describe("Optional path to the config directory. Defaults to ~/.openclaw"),
    }),
  },
  async ({ configDir }: { configDir?: string }) => {
    try {
      const config = await readConfig(configDir);
      const score = scoreConfig(config);

      const lines: string[] = [
        `## Security Configuration`,
        ``,
        `**Score:** ${score.score}/100 (Grade: ${score.grade})`,
        ``,
        `### Permissions (BoltClaw)`,
        `- Shell: ${config.boltclaw.security.shell}`,
        `- Filesystem: ${config.boltclaw.security.filesystem}`,
        `- Browser: ${config.boltclaw.security.browser}`,
        `- Network: ${config.boltclaw.security.network}`,
        ``,
        `### OpenClaw Settings`,
        `- Sandbox: ${config.openclaw.agents?.defaults?.sandbox?.mode ?? "not set"}`,
        `- Gateway bind: ${config.openclaw.gateway?.bind ?? "not set"}`,
        `- Gateway mode: ${config.openclaw.gateway?.mode ?? "not set"}`,
        `- Bundled skills: ${config.openclaw.skills?.allowBundled?.length ? config.openclaw.skills.allowBundled.join(", ") : "none"}`,
      ];

      if (config.boltclaw.messaging.allowlist.length > 0) {
        lines.push(`- Messaging allowlist: ${config.boltclaw.messaging.allowlist.join(", ")}`);
      }

      if (score.findings.length > 0) {
        lines.push(``, `### Findings`);
        for (const f of score.findings) {
          lines.push(`- [${f.severity.toUpperCase()}] ${f.setting}: ${f.message}`);
        }
      } else {
        lines.push(``, `No security findings - configuration looks solid.`);
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Failed to read config: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  },
);

// --- set_security_config ---

server.registerTool(
  "set_security_config",
  {
    title: "Set Security Config",
    description:
      "Update specific security settings in the BoltClaw/OpenClaw configuration. " +
      "Automatically backs up the current config before writing. " +
      "Returns the updated security score.",
    inputSchema: z.object({
      configDir: z
        .string()
        .optional()
        .describe("Optional path to the config directory. Defaults to ~/.openclaw"),
      shell: z.enum(["deny", "ask", "allow"]).optional().describe("Shell access level"),
      filesystem: z.enum(["deny", "ask", "allow"]).optional().describe("Filesystem access level"),
      browser: z.enum(["deny", "ask", "allow"]).optional().describe("Browser access level"),
      network: z.enum(["deny", "ask", "allow"]).optional().describe("Network access level"),
      sandboxMode: z.enum(["off", "non-main", "all"]).optional().describe("Agent sandbox mode"),
      gatewayBind: z.enum(["auto", "lan", "loopback", "custom", "tailnet"]).optional().describe("Gateway bind address"),
    }),
  },
  async ({ configDir, shell, filesystem, browser, network, sandboxMode, gatewayBind }: { configDir?: string; shell?: PermissionLevel; filesystem?: PermissionLevel; browser?: PermissionLevel; network?: PermissionLevel; sandboxMode?: SandboxMode; gatewayBind?: GatewayBind }) => {
    try {
      const config = await readConfig(configDir);

      if (shell) config.boltclaw.security.shell = shell;
      if (filesystem) config.boltclaw.security.filesystem = filesystem;
      if (browser) config.boltclaw.security.browser = browser;
      if (network) config.boltclaw.security.network = network;

      if (sandboxMode) {
        if (!config.openclaw.agents) config.openclaw.agents = { defaults: { sandbox: { mode: sandboxMode } } };
        else if (!config.openclaw.agents.defaults) config.openclaw.agents.defaults = { sandbox: { mode: sandboxMode } };
        else if (!config.openclaw.agents.defaults.sandbox) config.openclaw.agents.defaults.sandbox = { mode: sandboxMode };
        else config.openclaw.agents.defaults.sandbox.mode = sandboxMode;
      }

      if (gatewayBind) {
        if (!config.openclaw.gateway) config.openclaw.gateway = { bind: gatewayBind };
        else config.openclaw.gateway.bind = gatewayBind;
      }

      await writeConfig(config, configDir);
      const score = scoreConfig(config);

      return {
        content: [{
          type: "text",
          text: `Configuration updated successfully.\n\n**New Score:** ${score.score}/100 (Grade: ${score.grade})\n\nA backup was created automatically before the change.`,
        }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Failed to update config: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  },
);

// --- apply_security_profile ---

server.registerTool(
  "apply_security_profile",
  {
    title: "Apply Security Profile",
    description:
      "Apply a pre-built security profile to the OpenClaw configuration. " +
      "Available profiles: lockdown (maximum security), balanced (sensible defaults), " +
      "developer (permissive for dev work), migrate (minimal config for NanoClaw migration). " +
      "Automatically backs up current config before applying.",
    inputSchema: z.object({
      profile: z
        .enum(["lockdown", "balanced", "developer", "migrate"])
        .describe("Security profile to apply"),
      configDir: z
        .string()
        .optional()
        .describe("Optional path to the config directory. Defaults to ~/.openclaw"),
    }),
  },
  async ({ profile, configDir }: { profile: string; configDir?: string }) => {
    try {
      const selected = PROFILES.find((p) => p.id === profile);
      if (!selected) {
        return {
          content: [{ type: "text", text: `Unknown profile: ${profile}` }],
          isError: true,
        };
      }

      await writeConfig(selected.config, configDir);
      const score = scoreConfig(selected.config);

      return {
        content: [{
          type: "text",
          text: [
            `## Profile Applied: ${selected.name} ${selected.emoji}`,
            ``,
            selected.description,
            ``,
            `**Risk Level:** ${selected.riskLevel}`,
            `**New Score:** ${score.score}/100 (Grade: ${score.grade})`,
            ``,
            `A backup of your previous config was created automatically.`,
          ].join("\n"),
        }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Failed to apply profile: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  },
);

// --- list_backups ---

server.registerTool(
  "list_backups",
  {
    title: "List Config Backups",
    description:
      "List all available OpenClaw configuration backups. " +
      "BoltClaw creates automatic backups before every config change.",
    inputSchema: z.object({
      configDir: z
        .string()
        .optional()
        .describe("Optional path to the config directory. Defaults to ~/.openclaw"),
    }),
  },
  async ({ configDir }: { configDir?: string }) => {
    try {
      const backups = await listBackups(configDir);

      if (backups.length === 0) {
        return {
          content: [{ type: "text", text: "No backups found." }],
        };
      }

      const lines = [
        `## Config Backups (${backups.length} found)`,
        ``,
        ...backups.map((b, i) => `${i + 1}. ${b}`),
        ``,
        `Use \`restore_backup\` with the filename to restore any of these.`,
      ];

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Failed to list backups: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  },
);

// --- restore_backup ---

server.registerTool(
  "restore_backup",
  {
    title: "Restore Config Backup",
    description:
      "Restore the OpenClaw configuration from a backup file. " +
      "The current config is backed up first, so restores are always reversible.",
    inputSchema: z.object({
      filename: z.string().describe("Backup filename to restore (e.g. openclaw-2026-03-23T10-00-00-000Z.json)"),
      configDir: z
        .string()
        .optional()
        .describe("Optional path to the config directory. Defaults to ~/.openclaw"),
    }),
  },
  async ({ filename, configDir }: { filename: string; configDir?: string }) => {
    try {
      await restoreConfig(filename, configDir);
      const config = await readConfig(configDir);
      const score = scoreConfig(config);

      return {
        content: [{
          type: "text",
          text: `Configuration restored from ${filename}.\n\n**Current Score:** ${score.score}/100 (Grade: ${score.grade})\n\nYour previous config was backed up before the restore.`,
        }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Restore failed: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  },
);

// --- scan_installed_skills ---

const execFileAsync = promisify(execFile);

async function discoverSkillDirs(): Promise<Array<{ root: string; source: "installed" | "bundled" }>> {
  const dirs: Array<{ root: string; source: "installed" | "bundled" }> = [];

  // User-installed skills at ~/.openclaw/skills
  const installedDir = join(homedir(), ".openclaw", "skills");
  if (existsSync(installedDir)) dirs.push({ root: installedDir, source: "installed" });

  // Bundled skills shipped with the openclaw npm package
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  try {
    const { stdout } = await execFileAsync(npmCmd, ["root", "-g"], { timeout: 5000 });
    const candidate = join(stdout.trim(), "openclaw", "skills");
    if (existsSync(candidate)) dirs.push({ root: candidate, source: "bundled" });
  } catch {
    // npm not available
  }

  return dirs;
}

server.registerTool(
  "scan_installed_skills",
  {
    title: "Scan Installed Skills",
    description:
      "Scan all skills currently installed in OpenClaw — both bundled skills that ship with OpenClaw " +
      "and user-installed skills from ClawHub. Auto-detects skill directories. " +
      "Use this to audit what's already running, not just skills you're about to install.",
    inputSchema: z.object({
      skillsDir: z
        .string()
        .optional()
        .describe("Optional path to a specific skills directory. If omitted, auto-detects OpenClaw's bundled and user-installed skill directories."),
    }),
  },
  async ({ skillsDir }: { skillsDir?: string }) => {
    try {
      const dirsToScan = skillsDir
        ? [{ root: skillsDir, source: "custom" as const }]
        : await discoverSkillDirs();

      if (dirsToScan.length === 0) {
        return {
          content: [{ type: "text", text: "No skill directories found. Install OpenClaw globally or pass a skillsDir path." }],
        };
      }

      const MAX_SKILLS = 50;
      const results: Array<{ name: string; source: string; riskLevel: string; riskScore: number; matchCount: number; topFindings: string[] }> = [];
      let totalFound = 0;
      let totalScanned = 0;

      for (const { root, source } of dirsToScan) {
        let entries;
        try {
          entries = await readdir(root, { withFileTypes: true });
        } catch {
          continue;
        }
        const skillDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith(".")).map(e => e.name);
        totalFound += skillDirs.length;

        for (const name of skillDirs) {
          if (totalScanned >= MAX_SKILLS) break;
          try {
            const result = await scanSkill(join(root, name));
            const topFindings = result.matches
              .filter((m, i, arr) => arr.findIndex(x => x.pattern.name === m.pattern.name) === i)
              .slice(0, 3)
              .map(m => `${m.pattern.name} [${m.pattern.severity}]`);
            results.push({ name, source, riskLevel: result.riskLevel, riskScore: result.riskScore, matchCount: result.matches.length, topFindings });
            totalScanned++;
          } catch {
            // skip unreadable skills
          }
        }
        if (totalScanned >= MAX_SKILLS) break;
      }

      const riskOrder = { danger: 3, warning: 2, caution: 1, safe: 0 } as Record<string, number>;
      results.sort((a, b) => (riskOrder[b.riskLevel] ?? 0) - (riskOrder[a.riskLevel] ?? 0));

      const danger = results.filter(r => r.riskLevel === "danger");
      const warning = results.filter(r => r.riskLevel === "warning");
      const caution = results.filter(r => r.riskLevel === "caution");
      const safe = results.filter(r => r.riskLevel === "safe");

      const lines: string[] = [
        `## Installed Skills Audit`,
        ``,
        `**Scanned:** ${totalScanned} skills${totalFound > totalScanned ? ` (${totalFound - totalScanned} skipped, cap ${MAX_SKILLS})` : ""}`,
        `**Sources:** ${dirsToScan.map(d => `${d.source} (${d.root})`).join(", ")}`,
        ``,
        `| Risk | Count |`,
        `|------|-------|`,
        `| Danger | ${danger.length} |`,
        `| Warning | ${warning.length} |`,
        `| Caution | ${caution.length} |`,
        `| Safe | ${safe.length} |`,
      ];

      if (danger.length > 0 || warning.length > 0) {
        lines.push(``, `### Skills Needing Attention`);
        for (const r of [...danger, ...warning]) {
          lines.push(``, `**${r.name}** [${r.source}] — ${r.riskLevel.toUpperCase()} (${r.riskScore}/100)`);
          if (r.topFindings.length > 0) lines.push(`- Findings: ${r.topFindings.join(", ")}`);
        }
      }

      if (caution.length > 0) {
        lines.push(``, `### Caution`, caution.map(r => `- **${r.name}** [${r.source}] — ${r.riskScore}/100`).join("\n"));
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Audit failed: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  },
);

// --- Start server ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("BoltClaw MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
