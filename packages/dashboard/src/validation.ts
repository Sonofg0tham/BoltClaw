import { z } from "zod";
import { resolve, normalize, sep } from "node:path";
import { homedir } from "node:os";

// Scan root defaults to ~/.claude/skills if BOLTCLAW_SCAN_ROOT is unset.
// Override with the BOLTCLAW_SCAN_ROOT environment variable.
// Resolved once at module load so later cwd changes cannot widen the allowed area.
export const SCAN_ROOT = resolve(
  process.env.BOLTCLAW_SCAN_ROOT ?? `${homedir()}/.claude/skills`
);

// Sensitive substrings that must never appear in a resolved scan path, even
// if a caller somehow points BOLTCLAW_SCAN_ROOT at a directory containing them.
// Matched case-insensitively against a forward-slash-normalised path.
const SENSITIVE_PATTERNS = [
  "/.ssh/",
  "/.aws/",
  "/.env",
  "/etc/passwd",
  "/etc/shadow",
  "/.git/config",
];

function expandHome(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) return homedir() + p.slice(1);
  return p;
}

export type ScanPathCheck =
  | { ok: true; resolved: string }
  | { ok: false; error: string };

/**
 * Validates a local scan path. Not used for GitHub URLs.
 * Rejects traversal, shell metacharacters, sensitive patterns, and
 * anything outside SCAN_ROOT after resolution.
 */
export function validateLocalScanPath(
  input: string,
  scanRoot: string = SCAN_ROOT
): ScanPathCheck {
  if (input.includes("..")) {
    return { ok: false, error: "Path traversal not allowed" };
  }
  if (/[;&|`$]/.test(input)) {
    return { ok: false, error: "Shell metacharacters not allowed in path" };
  }

  const expanded = expandHome(input);
  const resolved = resolve(normalize(expanded));
  const forMatch = resolved.replace(/\\/g, "/").toLowerCase();

  for (const pat of SENSITIVE_PATTERNS) {
    if (forMatch.includes(pat)) {
      return {
        ok: false,
        error: `Path matches a blocked sensitive pattern (${pat})`,
      };
    }
  }

  const root = resolve(normalize(scanRoot));
  if (resolved !== root && !resolved.startsWith(root + sep)) {
    return { ok: false, error: "Scan path is outside the allowed directory" };
  }

  return { ok: true, resolved };
}

export const ScanRequestSchema = z.object({
  path: z
    .string()
    .min(1, "Path must not be empty")
    .refine((p) => {
      if (p.startsWith("https://github.com/")) return true;
      return validateLocalScanPath(p).ok;
    }, "Invalid path or URL"),
});
