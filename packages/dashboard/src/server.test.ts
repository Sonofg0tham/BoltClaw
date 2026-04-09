import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";

// SCAN_ROOT is resolved at module load from BOLTCLAW_SCAN_ROOT.
// Set it to a known temp dir before importing validation so the
// "valid path inside SCAN_ROOT" case has something real to hit.
process.env.BOLTCLAW_SCAN_ROOT = tmpdir();

const { ScanRequestSchema } = await import("./validation.js");

test("ScanRequestSchema rejects relative traversal like ../../../etc/passwd", () => {
  const result = ScanRequestSchema.safeParse({ path: "../../../etc/passwd" });
  assert.equal(result.success, false);
});

test("ScanRequestSchema rejects ~/.ssh/id_rsa after home expansion", () => {
  const result = ScanRequestSchema.safeParse({ path: "~/.ssh/id_rsa" });
  assert.equal(result.success, false);
});

test("ScanRequestSchema accepts a GitHub URL", () => {
  const result = ScanRequestSchema.safeParse({
    path: "https://github.com/openclaw/example",
  });
  assert.equal(result.success, true);
});

test("ScanRequestSchema accepts a valid path inside SCAN_ROOT", () => {
  const result = ScanRequestSchema.safeParse({
    path: join(tmpdir(), "my-skill"),
  });
  assert.equal(result.success, true);
});
