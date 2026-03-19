import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { readConfig, writeConfig, listBackups, restoreConfig, scoreConfig, PROFILES } from "@clawguard/config-engine";
import { scanSkill } from "@clawguard/skill-scanner";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, normalize, dirname, sep } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);

const app = express();
app.use(helmet());
app.use(express.json({ limit: "1mb" }));

const PORT = parseInt(process.env.PORT || "3000", 10);

// --- Audit Log (in-memory) ---

interface AuditEvent {
  id: string;
  timestamp: string;
  action: "config_read" | "config_write" | "config_restore" | "scan" | "profile_apply";
  severity: "info" | "warning" | "danger";
  summary: string;
  details?: Record<string, unknown>;
}

const auditLog: AuditEvent[] = [];
const MAX_AUDIT_EVENTS = 500;

function logEvent(action: AuditEvent["action"], severity: AuditEvent["severity"], summary: string, details?: Record<string, unknown>) {
  const event: AuditEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    action,
    severity,
    summary,
    details,
  };
  auditLog.unshift(event);
  if (auditLog.length > MAX_AUDIT_EVENTS) auditLog.pop();
}

const SCAN_ROOT = process.env.CLAWGUARD_SCAN_ROOT || undefined;

// Simple concurrency limiter for scans (prevents DoS via many parallel git clones)
let activeScans = 0;
const MAX_CONCURRENT_SCANS = 3;

// --- GitHub URL Fetching ---

const GITHUB_URL_RE = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\/tree\/[\w.-]+\/([\w./-]+))?$/;

async function fetchGitHubSkill(url: string): Promise<{ tmpDir: string; scanPath: string }> {
  const match = url.match(/^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)(?:\/tree\/([^/]+)\/(.+))?$/);
  if (!match) throw new Error("Invalid GitHub URL format");

  const repo = match[1];
  const branch = match[2] || "main";
  const subPath = match[3] || "";

  const tmpDir = await mkdtemp(join(tmpdir(), "clawguard-scan-"));

  try {
    await execFileAsync("git", [
      "clone", "--depth", "1", "--branch", branch,
      `https://github.com/${repo}.git`, tmpDir,
    ], { timeout: 30000 });
  } catch (err) {
    await rm(tmpDir, { recursive: true, force: true });
    console.error("Failed to clone repository:", err);
    throw new Error("Failed to clone repository");
  }

  const scanPath = subPath ? join(tmpDir, subPath) : tmpDir;
  // Prevent path traversal via ../ in the GitHub URL subpath
  const resolvedScan = resolve(scanPath);
  const resolvedTmp = resolve(tmpDir);
  if (!resolvedScan.startsWith(resolvedTmp + sep) && resolvedScan !== resolvedTmp) {
    await rm(tmpDir, { recursive: true, force: true });
    throw new Error("Invalid subpath: directory traversal not allowed");
  }
  if (!existsSync(scanPath)) {
    await rm(tmpDir, { recursive: true, force: true });
    throw new Error(`Path not found in repository: ${subPath}`);
  }

  return { tmpDir, scanPath };
}

// Resolve config directory from env or default
const CONFIG_DIR = process.env.OPENCLAW_CONFIG_PATH
  ? dirname(process.env.OPENCLAW_CONFIG_PATH)
  : undefined;

// --- Zod Schemas ---

const PermissionLevelSchema = z.enum(["deny", "ask", "allow"]);
const SandboxModeSchema = z.enum(["off", "non-main", "all"]);
const GatewayModeSchema = z.enum(["local", "remote"]);
const GatewayBindSchema = z.enum(["auto", "lan", "loopback", "custom", "tailnet"]);

const CombinedConfigSchema = z.object({
  openclaw: z.object({
    meta: z.object({
      lastTouchedVersion: z.string().optional(),
      lastTouchedAt: z.string().optional(),
    }).optional(),
    agents: z.object({
      defaults: z.object({
        sandbox: z.object({
          mode: SandboxModeSchema.optional(),
        }).optional(),
        memorySearch: z.object({
          enabled: z.boolean().optional(),
        }).optional(),
      }).optional(),
    }).optional(),
    commands: z.object({
      native: z.string().optional(),
      nativeSkills: z.string().optional(),
      restart: z.boolean().optional(),
      ownerDisplay: z.string().optional(),
    }).optional(),
    gateway: z.object({
      mode: GatewayModeSchema.optional(),
      bind: GatewayBindSchema.optional(),
      port: z.number().int().min(1).max(65535).optional(),
      auth: z.object({
        token: z.string().optional(),
      }).optional(),
    }).optional(),
    skills: z.object({
      allowBundled: z.array(z.string()).optional(),
    }).optional(),
  }).passthrough(), // Allow unknown keys OpenClaw may have
  clawguard: z.object({
    security: z.object({
      shell: PermissionLevelSchema,
      filesystem: PermissionLevelSchema,
      browser: PermissionLevelSchema,
      network: PermissionLevelSchema,
    }),
    messaging: z.object({
      allowlist: z.array(z.string()),
    }),
  }),
});

const ScanRequestSchema = z.object({
  path: z
    .string()
    .min(1, "Path must not be empty")
    .refine((p) => {
      // Allow GitHub URLs
      if (p.startsWith("https://github.com/")) return true;
      // Block path traversal and injection for local paths
      return !p.includes("..") && !/[;&|`$]/.test(p);
    }, "Invalid path or URL"),
});

const RestoreRequestSchema = z.object({
  filename: z
    .string()
    .regex(/^openclaw-[\w-]+\.json$/, "Invalid backup filename"),
});

// --- API Routes ---

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/config", async (_req, res) => {
  try {
    const config = await readConfig(CONFIG_DIR);
    const score = scoreConfig(config);
    logEvent("config_read", "info", "Configuration loaded");
    res.json({ config, score });
  } catch (err) {
    console.error("Failed to read config:", err);
    res.status(500).json({ error: "Failed to read config" });
  }
});

app.post("/api/config", async (req, res) => {
  const parsed = CombinedConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid config", details: parsed.error.flatten().fieldErrors });
    return;
  }
  try {
    await writeConfig(parsed.data, CONFIG_DIR);
    const score = scoreConfig(parsed.data);
    logEvent("config_write", "warning", "Configuration updated", { keys: Object.keys(parsed.data.clawguard.security) });
    res.json({ success: true, score });
  } catch (err) {
    console.error("Failed to write config:", err);
    res.status(500).json({ error: "Failed to write config" });
  }
});

app.get("/api/config/backups", async (_req, res) => {
  try {
    const backups = await listBackups(CONFIG_DIR);
    res.json({ backups });
  } catch (err) {
    console.error("Failed to list backups:", err);
    res.status(500).json({ error: "Failed to list backups" });
  }
});

app.post("/api/config/restore", async (req, res) => {
  const parsed = RestoreRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid filename", details: parsed.error.flatten().fieldErrors });
    return;
  }
  try {
    await restoreConfig(parsed.data.filename, CONFIG_DIR);
    const config = await readConfig(CONFIG_DIR);
    const score = scoreConfig(config);
    logEvent("config_restore", "warning", "Config restored from backup", { filename: parsed.data.filename });
    res.json({ success: true, config, score });
  } catch (err) {
    console.error("Restore failed:", err);
    res.status(500).json({ error: "Restore failed" });
  }
});

app.get("/api/profiles", (_req, res) => {
  res.json({ profiles: PROFILES });
});

app.post("/api/scan", async (req, res) => {
  const parsed = ScanRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid scan request" });
    return;
  }
  if (activeScans >= MAX_CONCURRENT_SCANS) {
    res.status(429).json({ error: "Too many scans in progress, please try again shortly" });
    return;
  }
  activeScans++;

  const skillPath = parsed.data.path;
  const isGitHubUrl = skillPath.startsWith("https://github.com/");

  let scanTarget: string;
  let tmpDir: string | null = null;

  if (isGitHubUrl) {
    try {
      const fetched = await fetchGitHubSkill(skillPath);
      scanTarget = fetched.scanPath;
      tmpDir = fetched.tmpDir;
    } catch (err) {
      activeScans--;
      res.status(400).json({ error: String(err instanceof Error ? err.message : err) });
      return;
    }
  } else {
    // Local path validation
    if (SCAN_ROOT) {
      const resolved = resolve(normalize(skillPath));
      const root = resolve(normalize(SCAN_ROOT));
      if (!resolved.startsWith(root + sep) && resolved !== root) {
        activeScans--;
        res.status(400).json({ error: "Scan path is outside the allowed directory" });
        return;
      }
    }
    if (!existsSync(skillPath)) {
      activeScans--;
      res.status(400).json({ error: `Path does not exist: ${skillPath}` });
      return;
    }
    scanTarget = skillPath;
  }

  try {
    const result = await scanSkill(scanTarget, isGitHubUrl ? skillPath : undefined);
    // Replace temp path with original URL in results for cleaner display
    if (isGitHubUrl) {
      result.skillPath = skillPath;
    }
    logEvent("scan", result.riskLevel === "danger" ? "danger" : "info", `Skill scanned: ${skillPath} — ${result.riskLevel}`, { path: skillPath, riskScore: result.riskScore, riskLevel: result.riskLevel, matches: result.matches.length });
    res.json(result);
  } catch (err) {
    console.error("Scan failed:", err);
    res.status(500).json({ error: "Scan failed" });
  } finally {
    activeScans--;
    if (tmpDir) {
      rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
});

// --- Audit Log Endpoints ---

app.get("/api/audit", (_req, res) => {
  res.json({ events: auditLog });
});

app.delete("/api/audit", (_req, res) => {
  auditLog.length = 0;
  res.json({ success: true });
});

// --- Static files (production) ---
const clientDist = join(import.meta.dirname, "..", "client");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*splat", (_req, res) => {
    res.sendFile(join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`ClawGuard dashboard running on http://localhost:${PORT}`);
});
