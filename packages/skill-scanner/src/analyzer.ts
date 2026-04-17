import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { THREAT_PATTERNS, type ThreatPattern, type Severity } from "./patterns.js";

export interface ScanMatch {
  pattern: ThreatPattern;
  file: string;
  line: number;
  content: string;
}

export type SkillPlatform = "openclaw" | "nanoclaw" | "unknown";

export interface ScanResult {
  skillPath: string;
  matches: ScanMatch[];
  riskScore: number;
  riskLevel: Severity;
  summary: string;
  scannedFiles: number;
  platform: SkillPlatform;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB per file
const MAX_FILE_COUNT = 5000;
const MAX_DEPTH = 10;

const SCANNABLE_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".ts",
  ".js",
  ".json",
  ".yaml",
  ".yml",
  ".sh",
  ".bash",
  ".py",
  ".toml",
]);

const SKIP_DIRS = new Set(["node_modules", ".git", ".env", ".aws", ".ssh", ".vscode"]);

async function collectFiles(dir: string, depth = 0): Promise<string[]> {
  if (depth > MAX_DEPTH) return [];
  const results: string[] = [];
  
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err: any) {
    if (err.code === "ENOTDIR") {
      const ext = dir.substring(dir.lastIndexOf("."));
      if (SCANNABLE_EXTENSIONS.has(ext)) {
        return [dir];
      }
      return [];
    }
    throw err;
  }

  for (const entry of entries) {
    if (results.length >= MAX_FILE_COUNT) break;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".env")) continue;
      results.push(...(await collectFiles(fullPath, depth + 1)));
    } else {
      const ext = entry.name.substring(entry.name.lastIndexOf("."));
      if (SCANNABLE_EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function detectPlatform(skillPath: string, files: string[], originalPath?: string): SkillPlatform {
  // Check both the scan path and original path (for GitHub URLs where temp path differs)
  const pathsToCheck = [skillPath, originalPath || ""].map((p) => p.replace(/\\/g, "/"));
  if (pathsToCheck.some((p) => p.includes(".claude/skills"))) {
    return "nanoclaw";
  }
  // NanoClaw pattern: multiple subdirectories each containing a SKILL.md
  const skillMdFiles = files.filter((f) => {
    const relative = f.replace(skillPath, "").replace(/\\/g, "/").replace(/^\//, "");
    return relative.endsWith("/SKILL.md") || relative === "SKILL.md";
  });
  const hasTopLevelSkillMd = skillMdFiles.some((f) => {
    const relative = f.replace(skillPath, "").replace(/\\/g, "/").replace(/^\//, "");
    return relative === "SKILL.md";
  });
  if (hasTopLevelSkillMd) return "openclaw";
  // Multiple SKILL.md files in subdirectories suggests NanoClaw skills collection
  if (skillMdFiles.length > 1) return "nanoclaw";
  return "unknown";
}

export async function scanSkill(skillPath: string, originalPath?: string): Promise<ScanResult> {
  const info = await stat(skillPath);
  const files = info.isDirectory()
    ? await collectFiles(skillPath)
    : [skillPath];

  const platform = detectPlatform(skillPath, files, originalPath);
  const matches: ScanMatch[] = [];

  for (const file of files) {
    const fileInfo = await stat(file);
    if (fileInfo.size > MAX_FILE_SIZE) continue;
    const content = await readFile(file, "utf-8");
    const lines = content.split("\n");

    for (const pattern of THREAT_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        // Reset regex lastIndex for global patterns
        pattern.pattern.lastIndex = 0;
        if (pattern.pattern.test(lines[i])) {
          matches.push({
            pattern,
            file: file.replace(skillPath, "."),
            line: i + 1,
            content: lines[i].trim().substring(0, 200),
          });
        }
      }
    }
  }

  const riskScore = calculateRiskScore(matches);
  const riskLevel = scoreToLevel(riskScore);

  return {
    skillPath,
    matches,
    riskScore,
    riskLevel,
    summary: buildSummary(matches, riskLevel),
    scannedFiles: files.length,
    platform,
  };
}

function calculateRiskScore(matches: ScanMatch[]): number {
  if (matches.length === 0) return 0;

  const severityWeights: Record<Severity, number> = {
    safe: 0,
    caution: 10,
    warning: 25,
    danger: 50,
  };

  // Score by unique pattern IDs - finding the same threat 11 times
  // is not 11x more dangerous than finding it once.
  const uniquePatterns = new Map<string, Severity>();
  for (const match of matches) {
    uniquePatterns.set(match.pattern.id, match.pattern.severity);
  }

  let total = 0;
  for (const severity of uniquePatterns.values()) {
    total += severityWeights[severity];
  }

  return Math.min(100, total);
}

function scoreToLevel(score: number): Severity {
  if (score === 0) return "safe";
  if (score <= 20) return "caution";
  if (score < 50) return "warning";
  return "danger";
}

function buildSummary(matches: ScanMatch[], level: Severity): string {
  if (matches.length === 0) return "No threats detected. This skill appears safe.";

  const byCategory = new Map<string, number>();
  for (const m of matches) {
    byCategory.set(
      m.pattern.category,
      (byCategory.get(m.pattern.category) || 0) + 1,
    );
  }

  const parts = Array.from(byCategory.entries()).map(
    ([cat, count]) => `${count} ${cat}`,
  );

  return `Found ${matches.length} issue(s) across ${parts.join(", ")} categories. Risk level: ${level}.`;
}
