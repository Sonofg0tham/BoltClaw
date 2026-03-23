import { readFile, writeFile, copyFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import {
  type CombinedConfig,
  type OpenClawConfig,
  type ClawGuardConfig,
  DEFAULT_OPENCLAW_CONFIG,
  DEFAULT_CLAWGUARD_CONFIG,
} from "./schema.js";
import { applyClawGuardToOpenClaw, inferClawGuardFromOpenClaw } from "./mapper.js";

function resolveConfigDir(): string {
  if (process.env.OPENCLAW_CONFIG_PATH) {
    return dirname(process.env.OPENCLAW_CONFIG_PATH);
  }
  const home = process.env.HOME || process.env.USERPROFILE || "~";
  return join(home, ".openclaw");
}

function openclawPath(configDir: string): string {
  return join(configDir, "openclaw.json");
}

function clawguardPath(configDir: string): string {
  return join(configDir, "clawguard.json");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge<T>(base: T, override: any): T {
  if (typeof base !== "object" || base === null || Array.isArray(base)) return override ?? base;
  const result = { ...base } as Record<string, unknown>;
  const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
  for (const key of Object.keys(override)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    const baseVal = result[key];
    const overVal = override[key];
    if (
      overVal !== null &&
      typeof overVal === "object" &&
      !Array.isArray(overVal) &&
      typeof baseVal === "object" &&
      baseVal !== null &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(baseVal, overVal);
    } else {
      result[key] = overVal;
    }
  }
  return result as T;
}

/**
 * Detect if a parsed JSON object is the old ClawGuard format
 * (has security.shell, messaging.allowlist, etc. at root)
 */
function isOldClawGuardFormat(parsed: Record<string, unknown>): boolean {
  return (
    typeof parsed.security === "object" &&
    parsed.security !== null &&
    "shell" in (parsed.security as Record<string, unknown>)
  );
}

/**
 * Migrate old ClawGuard format to the new split format.
 * Returns the ClawGuard sidecar config extracted from the old format.
 */
function migrateOldFormat(parsed: Record<string, unknown>): {
  openclaw: OpenClawConfig;
  clawguard: ClawGuardConfig;
} {
  const old = parsed as {
    security?: { shell?: string; filesystem?: string; browser?: string; network?: string };
    messaging?: { allowlist?: string[] };
    skills?: { allowBundled?: boolean; installed?: string[] };
    tools?: { allowAll?: boolean; allowed?: string[] };
    network?: { expose?: boolean; port?: number };
  };

  const clawguard: ClawGuardConfig = {
    security: {
      shell: (old.security?.shell as ClawGuardConfig["security"]["shell"]) || "deny",
      filesystem: (old.security?.filesystem as ClawGuardConfig["security"]["filesystem"]) || "deny",
      browser: (old.security?.browser as ClawGuardConfig["security"]["browser"]) || "deny",
      network: (old.security?.network as ClawGuardConfig["security"]["network"]) || "deny",
    },
    messaging: {
      allowlist: old.messaging?.allowlist || [],
    },
  };

  const openclaw: OpenClawConfig = {
    ...DEFAULT_OPENCLAW_CONFIG,
    gateway: {
      ...DEFAULT_OPENCLAW_CONFIG.gateway,
      bind: clawguard.security.network === "allow" ? "lan" : "loopback",
      mode: clawguard.security.network === "allow" ? "remote" : "local",
    },
    skills: {
      allowBundled: old.skills?.allowBundled ? ["*"] : [],
    },
  };

  return { openclaw, clawguard };
}

export async function readConfig(
  configDir: string = resolveConfigDir(),
): Promise<CombinedConfig> {
  // Read OpenClaw config
  let openclaw: OpenClawConfig;
  const ocPath = openclawPath(configDir);

  try {
    const raw = await readFile(ocPath, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // Auto-detect and migrate old format
    if (isOldClawGuardFormat(parsed)) {
      const migrated = migrateOldFormat(parsed);
      // Write both new files (back up old one first)
      await backupFile(ocPath);
      await writeFile(ocPath, JSON.stringify(migrated.openclaw, null, 2), "utf-8");
      const scPath = clawguardPath(configDir);
      await writeFile(scPath, JSON.stringify(migrated.clawguard, null, 2), "utf-8");
      return { openclaw: migrated.openclaw, clawguard: migrated.clawguard };
    }

    openclaw = deepMerge(DEFAULT_OPENCLAW_CONFIG, parsed);
  } catch {
    openclaw = { ...DEFAULT_OPENCLAW_CONFIG };
  }

  // Read ClawGuard sidecar config
  let clawguard: ClawGuardConfig;
  const scPath = clawguardPath(configDir);

  try {
    const raw = await readFile(scPath, "utf-8");
    const parsed = JSON.parse(raw);
    clawguard = deepMerge(DEFAULT_CLAWGUARD_CONFIG, parsed);
  } catch {
    // No sidecar yet — infer from OpenClaw config
    const inferred = inferClawGuardFromOpenClaw(openclaw);
    clawguard = deepMerge(DEFAULT_CLAWGUARD_CONFIG, inferred);
  }

  return { openclaw, clawguard };
}

export async function writeConfig(
  combined: CombinedConfig,
  configDir: string = resolveConfigDir(),
): Promise<void> {
  const dir = configDir;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const ocPath = openclawPath(dir);
  const scPath = clawguardPath(dir);

  // Back up both files
  await backupFile(ocPath);
  await backupFile(scPath);

  // Apply ClawGuard mappings to OpenClaw config before writing
  const openclawOut = applyClawGuardToOpenClaw(combined);

  await writeFile(ocPath, JSON.stringify(openclawOut, null, 2), "utf-8");
  await writeFile(scPath, JSON.stringify(combined.clawguard, null, 2), "utf-8");
}

async function backupFile(filePath: string): Promise<string | null> {
  if (!existsSync(filePath)) return null;
  const dir = dirname(filePath);
  const backupDir = join(dir, "backups");
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }
  const basename = filePath.endsWith("clawguard.json") ? "clawguard" : "openclaw";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(backupDir, `${basename}-${timestamp}.json`);
  await copyFile(filePath, backupPath);
  return backupPath;
}

export async function backupConfig(
  configDir: string = resolveConfigDir(),
): Promise<string | null> {
  const ocBackup = await backupFile(openclawPath(configDir));
  await backupFile(clawguardPath(configDir));
  return ocBackup;
}

export async function restoreConfig(
  backupFilename: string,
  configDir: string = resolveConfigDir(),
): Promise<void> {
  // Validate filename pattern
  if (!/^openclaw-[\w-]+\.json$/.test(backupFilename)) {
    throw new Error("Invalid backup filename");
  }
  if (backupFilename.includes("..") || backupFilename.includes("/") || backupFilename.includes("\\")) {
    throw new Error("Invalid backup filename");
  }
  const backupDir = join(configDir, "backups");
  const backupPath = join(backupDir, backupFilename);
  if (!existsSync(backupPath)) {
    throw new Error(`Backup not found: ${backupFilename}`);
  }

  // Back up current files first (so restore is reversible)
  await backupConfig(configDir);

  // Restore OpenClaw config
  await copyFile(backupPath, openclawPath(configDir));

  // Try to restore matching ClawGuard backup
  const clawguardBackup = backupFilename.replace("openclaw-", "clawguard-");
  const clawguardBackupPath = join(backupDir, clawguardBackup);
  if (existsSync(clawguardBackupPath)) {
    await copyFile(clawguardBackupPath, clawguardPath(configDir));
  }
}

export async function listBackups(
  configDir: string = resolveConfigDir(),
): Promise<string[]> {
  const backupDir = join(configDir, "backups");
  if (!existsSync(backupDir)) return [];
  const files = await readdir(backupDir);
  return files
    .filter((f) => f.startsWith("openclaw-") && f.endsWith(".json"))
    .sort()
    .reverse();
}
