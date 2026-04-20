import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { readConfig, writeConfig, listBackups, restoreConfig, scoreConfig, PROFILES } from "@boltclaw/config-engine";
import { scanSkill } from "@boltclaw/skill-scanner";
import { existsSync, mkdirSync } from "node:fs";
import { mkdtemp, rm, readFile, writeFile, appendFile, truncate, readdir, stat } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { join, resolve, dirname, sep } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import multer from "multer";
import { ScanRequestSchema, validateLocalScanPath, SCAN_ROOT } from "./validation.js";

const execFileAsync = promisify(execFile);
const upload = multer({ dest: tmpdir() });

const app = express();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(express.json({ limit: "1mb" }));

const PORT = parseInt(process.env.PORT || "3000", 10);

// --- API Token Authentication ---

const TOKEN_DIR = join(homedir(), ".openclaw");
const TOKEN_FILE = join(TOKEN_DIR, "boltclaw-token");

async function resolveApiToken(): Promise<string> {
  // Use env var if explicitly set
  if (process.env.BOLTCLAW_API_TOKEN) {
    return process.env.BOLTCLAW_API_TOKEN;
  }

  // Try to read existing token from disk
  try {
    const existing = await readFile(TOKEN_FILE, "utf-8");
    const trimmed = existing.trim();
    if (trimmed.length > 0) return trimmed;
  } catch {
    // File doesn't exist yet, generate a new token
  }

  // Generate a new random token
  const token = randomBytes(32).toString("hex");
  if (!existsSync(TOKEN_DIR)) {
    mkdirSync(TOKEN_DIR, { recursive: true, mode: 0o700 });
  }
  await writeFile(TOKEN_FILE, token, { mode: 0o600 });
  return token;
}

const API_TOKEN = await resolveApiToken();
console.log(`BoltClaw API token: ${API_TOKEN}`);
console.log(`  (also saved to ${TOKEN_FILE})`);

/**
 * Constant-time token comparison to prevent timing attacks.
 */
function tokenMatches(provided: string): boolean {
  try {
    const a = Buffer.from(provided, "utf-8");
    const b = Buffer.from(API_TOKEN, "utf-8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Auth middleware: require token on all /api/* routes except /api/health
app.use("/api", (req, res, next) => {
  // Health check is public so monitoring tools can hit it
  if (req.path === "/health") return next();

  const token =
    req.headers["x-boltclaw-token"] as string | undefined ??
    (req.query.token as string | undefined);

  if (!token || !tokenMatches(token)) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Missing or invalid API token. Check the terminal where BoltClaw is running, or pass ?token=... in the URL.",
    });
    return;
  }

  next();
});

// --- Audit Log (persisted to JSONL) ---

interface AuditEvent {
  id: string;
  timestamp: string;
  action: "config_read" | "config_write" | "config_restore" | "scan" | "profile_apply";
  severity: "info" | "warning" | "danger";
  source: "system" | "user";
  summary: string;
  details?: Record<string, unknown>;
}

const AUDIT_FILE = join(homedir(), ".openclaw", "boltclaw-audit.jsonl");
const auditLog: AuditEvent[] = [];
const MAX_AUDIT_EVENTS = 500;

// Load persisted audit events on startup
async function loadAuditLog(): Promise<void> {
  try {
    const raw = await readFile(AUDIT_FILE, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    // Take last MAX_AUDIT_EVENTS lines, newest first
    const events = lines
      .slice(-MAX_AUDIT_EVENTS)
      .reverse()
      .map((line) => {
        try { return JSON.parse(line) as AuditEvent; }
        catch { return null; }
      })
      .filter((e): e is AuditEvent => e !== null);
    auditLog.push(...events);
  } catch {
    // File doesn't exist yet, start fresh
  }
}

await loadAuditLog();

/** Redact sensitive fields before they hit the audit log. */
function redactDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) return details;
  const redacted = { ...details };
  const sensitiveKeys = ["token", "api_token", "apiToken", "secret", "password"];
  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      redacted[key] = "[REDACTED]";
    }
  }
  return redacted;
}

function logEvent(action: AuditEvent["action"], severity: AuditEvent["severity"], summary: string, details?: Record<string, unknown>) {
  const event: AuditEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    action,
    severity,
    source: "system",
    summary,
    details: redactDetails(details),
  };
  auditLog.unshift(event);
  if (auditLog.length > MAX_AUDIT_EVENTS) auditLog.pop();

  // Persist to disk (fire-and-forget, never crash the server)
  const auditDir = dirname(AUDIT_FILE);
  if (!existsSync(auditDir)) {
    mkdirSync(auditDir, { recursive: true });
  }
  appendFile(AUDIT_FILE, JSON.stringify(event) + "\n").catch((err) => {
    console.error("Failed to write audit event to disk:", err);
  });
}

console.log(`BoltClaw scan root: ${SCAN_ROOT}`);

// Simple concurrency limiter for scans (prevents DoS via many parallel git clones)
let activeScans = 0;
const MAX_CONCURRENT_SCANS = 3;

// --- GitHub URL Fetching ---

const GITHUB_URL_RE = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\/tree\/[\w.-]+\/([\w./-]+))?$/;

// Hard caps to prevent DoS via giant-repo cloning.
// 50 MB covers any realistic skill repo; 10k files covers any realistic skill tree.
export const CLONE_MAX_BYTES = 50 * 1024 * 1024;
export const CLONE_MAX_FILES = 10_000;

/**
 * Build the git clone command used by fetchGitHubSkill.
 * Exported so tests can assert the safety flags are present without shelling out.
 *
 * Safety flags:
 *   -c http.followRedirects=false   don't follow redirects to unknown hosts
 *   -c protocol.version=2           modern, faster protocol
 *   --depth 1                       shallow, no history
 *   --single-branch                 only the requested branch's tip
 *   --no-tags                       skip tag objects
 *   --filter=blob:limit=10m         blobs over 10 MB are fetched lazily (server-side filter)
 */
export function buildCloneArgs(repo: string, branch: string, tmpDir: string): string[] {
  return [
    "-c", "http.followRedirects=false",
    "-c", "protocol.version=2",
    "clone",
    "--depth", "1",
    "--single-branch",
    "--no-tags",
    "--filter=blob:limit=10m",
    "--branch", branch,
    `https://github.com/${repo}.git`,
    tmpDir,
  ];
}

/**
 * Walk a directory and return total byte size and file count.
 * Skips the .git directory to measure actual repo payload.
 */
async function measureTree(dir: string): Promise<{ bytes: number; files: number }> {
  let bytes = 0;
  let files = 0;
  const stack: string[] = [dir];
  while (stack.length) {
    const current = stack.pop()!;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name === ".git") continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        files++;
        if (files > CLONE_MAX_FILES) return { bytes, files };
        try {
          const s = await stat(full);
          bytes += s.size;
          if (bytes > CLONE_MAX_BYTES) return { bytes, files };
        } catch {
          // ignore unreadable entries
        }
      }
    }
  }
  return { bytes, files };
}

async function fetchGitHubSkill(url: string): Promise<{ tmpDir: string; scanPath: string }> {
  const match = url.match(/^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)(?:\/tree\/([^/]+)\/(.+))?$/);
  if (!match) throw new Error("Invalid GitHub URL format");

  const repo = match[1];
  const branch = match[2] || "main";
  const subPath = match[3] || "";

  const tmpDir = await mkdtemp(join(tmpdir(), "boltclaw-scan-"));

  try {
    await execFileAsync("git", buildCloneArgs(repo, branch, tmpDir), {
      timeout: 30000,
      // GIT_TERMINAL_PROMPT=0 stops git from ever prompting for credentials,
      // which would otherwise hang the server process until the 30s timeout.
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
  } catch (err) {
    await rm(tmpDir, { recursive: true, force: true });
    console.error("Failed to clone repository:", err);
    throw new Error("Failed to clone repository");
  }

  // Enforce size caps after clone. If the repo slipped past the server-side blob
  // filter (e.g. lots of small files), we still refuse to scan it.
  const { bytes, files } = await measureTree(tmpDir);
  if (bytes > CLONE_MAX_BYTES) {
    await rm(tmpDir, { recursive: true, force: true });
    throw new Error(`Repository exceeds ${CLONE_MAX_BYTES} byte cap (measured ${bytes})`);
  }
  if (files > CLONE_MAX_FILES) {
    await rm(tmpDir, { recursive: true, force: true });
    throw new Error(`Repository exceeds ${CLONE_MAX_FILES} file cap (measured ${files})`);
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

// Attempt to resolve where skills live
const SKILLS_DIR = process.env.CLAUDE_SKILLS_DIR || join(homedir(), ".claude", "skills");

// Discover Claude Code skills directory
async function findBundledSkillsDir(): Promise<string | null> {
  const envSkillsDir = process.env.CLAUDE_SKILLS_DIR;
  if (envSkillsDir && existsSync(envSkillsDir)) return envSkillsDir;
  return null;
}


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
  boltclaw: z.object({
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
    logEvent("config_write", "warning", "Configuration updated", { keys: Object.keys(parsed.data.boltclaw.security) });
    res.json({ success: true, score });
  } catch (err) {
    console.error("Failed to write config:", err);
    res.status(500).json({ error: "Failed to write config" });
  }
});

app.post("/api/config/score", (req, res) => {
  const parsed = CombinedConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid config", details: parsed.error.flatten().fieldErrors });
    return;
  }
  const score = scoreConfig(parsed.data);
  res.json({ score });
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
    // Local path validation: enforce SCAN_ROOT, block sensitive patterns,
    // and use the fully-resolved absolute path for the actual scan.
    const check = validateLocalScanPath(skillPath);
    if (!check.ok) {
      activeScans--;
      const errMsg = (check as { ok: false; error: string }).error;
      res.status(400).json({ error: errMsg });
      return;
    }
    if (!existsSync(check.resolved)) {
      activeScans--;
      res.status(400).json({ error: `Path does not exist: ${skillPath}` });
      return;
    }
    scanTarget = check.resolved;
  }

  try {
    const result = await scanSkill(scanTarget, isGitHubUrl ? skillPath : undefined);
    // Replace temp path with original URL in results for cleaner display
    if (isGitHubUrl) {
      result.skillPath = skillPath;
    }
    logEvent("scan", result.riskLevel === "danger" ? "danger" : "info", `Skill scanned: ${skillPath} - ${result.riskLevel}`, { path: skillPath, riskScore: result.riskScore, riskLevel: result.riskLevel, matches: result.matches.length });
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

app.post("/api/scan/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  
  if (activeScans >= MAX_CONCURRENT_SCANS) {
    rm(req.file.path, { force: true }).catch(() => {});
    res.status(429).json({ error: "Too many scans in progress" });
    return;
  }
  activeScans++;
  
  try {
    const result = await scanSkill(req.file.path, req.file.originalname);
    result.skillPath = req.file.originalname;
    logEvent("scan", result.riskLevel === "danger" ? "danger" : "info", `Uploaded file scanned: ${req.file.originalname} - ${result.riskLevel}`);
    res.json(result);
  } catch (err) {
    console.error("Upload scan failed:", err);
    res.status(500).json({ error: "Scan failed" });
  } finally {
    activeScans--;
    rm(req.file.path, { force: true }).catch(() => {});
  }
});

app.get("/api/scan/audit", async (_req, res) => {
  if (activeScans >= MAX_CONCURRENT_SCANS) {
    res.status(429).json({ error: "Too many scans in progress, please try again shortly" });
    return;
  }

  // Collect directories to scan: user-installed + bundled
  const dirsToScan: Array<{ root: string; source: "installed" | "bundled" }> = [];
  if (SKILLS_DIR && existsSync(SKILLS_DIR)) {
    dirsToScan.push({ root: SKILLS_DIR, source: "installed" });
  }
  const bundledDir = await findBundledSkillsDir();
  if (bundledDir) {
    dirsToScan.push({ root: bundledDir, source: "bundled" });
  }

  if (dirsToScan.length === 0) {
    res.status(404).json({ error: "No skills directories found. Ensure Claude Code is installed or set CLAUDE_SKILLS_DIR." });
    return;
  }

  activeScans++;

  try {
    const MAX_AUDIT_SKILLS = 50;
    const allResults: Array<ReturnType<typeof scanSkill> extends Promise<infer T> ? T & { source: string } : never> = [];
    let totalDirs = 0;
    let totalScanned = 0;

    for (const { root, source } of dirsToScan) {
      const entries = await import("node:fs/promises").then(fs => fs.readdir(root, { withFileTypes: true }));
      const dirs = entries.filter(e => e.isDirectory() && !e.name.startsWith(".")).map(e => e.name);
      totalDirs += dirs.length;

      const remaining = MAX_AUDIT_SKILLS - totalScanned;
      const toScan = dirs.slice(0, remaining);
      totalScanned += toScan.length;

      for (const dir of toScan) {
        try {
          const result = await scanSkill(join(root, dir));
          result.skillPath = dir;
          allResults.push({ ...result, source });
        } catch (err) {
          console.error(`Failed to scan skill ${dir}:`, err);
        }
      }

      if (totalScanned >= MAX_AUDIT_SKILLS) break;
    }

    // Sort highest risk first
    const riskOrder = { danger: 3, warning: 2, caution: 1, safe: 0 };
    allResults.sort((a, b) => (riskOrder[b.riskLevel] ?? 0) - (riskOrder[a.riskLevel] ?? 0));

    const skipped = totalDirs - totalScanned;
    logEvent("scan", "info", `Audited ${allResults.length} skills${skipped > 0 ? ` (${skipped} skipped)` : ""}`);
    res.json({ results: allResults, total: totalDirs, scanned: totalScanned });
  } catch (err) {
    console.error("Audit failed:", err);
    res.status(500).json({ error: "Audit failed" });
  } finally {
    activeScans--;
  }
});



// --- Audit Log Endpoints ---

app.get("/api/audit", (_req, res) => {
  res.json({ events: auditLog });
});

app.delete("/api/audit", async (_req, res) => {
  auditLog.length = 0;
  // Truncate the on-disk file too
  try {
    if (existsSync(AUDIT_FILE)) {
      await truncate(AUDIT_FILE, 0);
    }
  } catch (err) {
    console.error("Failed to truncate audit log file:", err);
  }
  res.json({ success: true });
});

// --- Static files (production build served by Express) ---
// In production (dist/server/server.js): clientDist = dist/server/../client = dist/client ✓
// In dev (src/server.ts via tsx): import.meta.dirname = src/, so we also check dist/client
const clientDist = join(import.meta.dirname, "..", "client");
const clientDistDev = join(import.meta.dirname, "..", "dist", "client");
const resolvedClientDir = existsSync(clientDist) ? clientDist : existsSync(clientDistDev) ? clientDistDev : null;

if (resolvedClientDir) {
  app.use(express.static(resolvedClientDir));

  // Serve index.html with the API token injected so the React app
  // can authenticate without the user needing to copy-paste tokens.
  let indexHtmlCache: string | null = null;
  app.get("*splat", async (_req, res) => {
    try {
      if (!indexHtmlCache) {
        indexHtmlCache = await readFile(join(resolvedClientDir, "index.html"), "utf-8");
      }
      // Inject a script tag that sets the token before the React app loads.
      // The token is safe to embed here because the page is only served on
      // localhost and requires the token to reach any API endpoint anyway.
      const injected = indexHtmlCache.replace(
        "</head>",
        `<script>window.__BOLTCLAW_TOKEN__=${JSON.stringify(API_TOKEN)};</script>\n</head>`,
      );
      res.type("html").send(injected);
    } catch {
      res.sendFile(join(resolvedClientDir, "index.html"));
    }
  });
}

// Only listen when this file is the entry point. Importing server.ts from a
// unit test (to reach helpers like buildCloneArgs) must not bind the port.
const isEntryPoint = (() => {
  try {
    return process.argv[1] === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (isEntryPoint) {
  app.listen(PORT, () => {
    console.log(`BoltClaw dashboard running on http://localhost:${PORT}`);
    console.log(`  Authenticated URL: http://localhost:${PORT}?token=${API_TOKEN}`);
  });
}
