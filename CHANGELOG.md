# Changelog

All notable changes to BoltClaw are documented here.

## [1.1.0] - 2026-04-22

### Scanner improvements

- **Clipboard access pattern** — new `clipboard-access` pattern (warning) detects skills that
  read from the system clipboard via `navigator.clipboard`, `pyperclip.paste()`, `pbpaste`,
  `xclip -o`, `xdotool getclipboard`, or Win32 clipboard APIs. Clipboard content routinely
  includes passwords, tokens, and private data and is never expected to leave the machine.
- **Screen capture pattern** — new `screen-capture` pattern (warning) detects skills that take
  screenshots via `PIL.ImageGrab`, `pyautogui.screenshot()`, `mss`, `screencapture`, `scrot`,
  or the Electron `desktopCapturer` API. Silent screen capture is a serious privacy risk.
- **mcp-manifest-mismatch tightened** — severity reduced from `warning` to `caution`, pattern
  narrowed to synchronous file/shell operations (`readFileSync`, `readFile`, `execSync`,
  `spawnSync`) only. Removed `fetch`, `axios`, and `exec` which were generating false positives
  on legitimate MCP server code.

### Package metadata

- `packages/mcp-server/package.json` — author field updated to include `support@sonofg0tham.dev`.
- npm version badge added to README.

### Testing

- 2 new unit tests: `clipboard-access` pattern detection, `screen-capture` pattern detection.
- Total unit tests: 26 (9 server validation + 17 skill-scanner analysis).

---

## [1.0.0] - 2026-04-20

First stable release. BoltClaw is a local security dashboard for Claude Code skills and MCP
servers — scan before you install, harden your agent config, and see what your agent can access.

### Security hardening

- **API token authentication** — shared-secret token required on all `/api/*` routes, generated
  on first run and saved to `~/.openclaw/boltclaw-token`. Constant-time comparison prevents
  timing attacks. Token auto-injected into the served dashboard so users don't need to copy-paste.
- **Path traversal prevention** — local scan paths validated against a configurable root
  (`BOLTCLAW_SCAN_ROOT`), with explicit blocks on sensitive paths (`~/.ssh`, `~/.aws`, `/etc/passwd`,
  `.git/config`). Shell metacharacters rejected at the validation layer.
- **GitHub clone safety** — cloned repos capped at 50 MB and 10,000 files. Shallow single-branch
  clone with `--no-tags` and `--filter=blob:limit=10m`. `GIT_TERMINAL_PROMPT=0` prevents credential
  hangs. Redirect following disabled. Post-clone size enforcement catches repos that slip past the
  server-side filter.
- **Dependency hygiene** — all 5 Vite vulnerabilities resolved via `npm audit fix`. Zero known
  vulnerabilities in runtime dependencies. `SECURITY.md` documents the audit policy and current
  status.
- **Audit log persistence** — audit events written to `~/.openclaw/boltclaw-audit.jsonl` and
  reloaded on startup. Sensitive fields (tokens, secrets) redacted before logging.
- **Scan rate limiting** — concurrent scan cap of 3 to prevent resource exhaustion via parallel
  clone requests.
- **CSP headers** — Helmet with a restrictive Content Security Policy on all responses.
- **Automatic config backups** — every config write creates a timestamped backup before applying.

### Skill scanner

- **15 threat patterns across 6 categories** — exfiltration (curl/wget, fetch/axios, webhooks),
  prompt injection (instruction override, system prompt manipulation, role override, tool output
  injection), obfuscation (base64, eval/exec, hex encoding), permissions (sudo/privilege escalation,
  env variable access, undeclared MCP capabilities), filesystem (sensitive file access, write
  operations, Python file writes), execution (Python subprocess, shell execution, browser automation,
  captcha bypass, proxy/anonymisation).
- **Plain-English impact explanations** — every pattern includes a "Why this matters" description
  written for non-expert users, not security professionals.
- **Risk scoring** — 0-100 score based on unique pattern matches (deduplication prevents stacking),
  weighted by severity (danger=50, warning=25, caution=10). Capped at 100. Levels: Safe, Caution,
  Warning, Danger.
- **GitHub URL scanning** — paste a GitHub repo or subdirectory URL directly into the scanner.
- **File upload scanning** — drag-and-drop or file picker for single-file scans.
- **Bulk audit** — scans all skills in `~/.claude/skills` in one click from the Permission Dashboard.

### Bug fixes

- **scoreToLevel boundary** — score of exactly 50 now correctly returns `danger` instead of
  `warning`. The threshold was `<= 50`; corrected to `< 50`. A single high-severity pattern hit
  (curl, sudo, eval) was being under-reported.
- **Two pre-existing TypeScript errors** — `riskOrder[b.riskLevel]` undefined-return fixed with
  `?? 0` nullish coalesce; `check.error` discriminated union narrowing fixed with explicit cast.

### Platform retargeting (Round 3 Phase 1)

BoltClaw was originally built around a fictional "claw ecosystem" (OpenClaw, NanoClaw, NemoClaw).
All user-facing surfaces have been retargeted to the real platforms BoltClaw actually works with:

- Skill scanner targets Claude Code skills (`.claude/skills/`) and MCP servers.
- Two fictional scanner patterns replaced: `nanoclaw-container-escape` and `nanoclaw-sdk-abuse`
  replaced with `mcp-tool-output-injection` (indirect prompt injection via tool output) and
  `mcp-manifest-mismatch` (undeclared capabilities in MCP server code).
- Skills discovery updated to `~/.claude/skills` and the `CLAUDE_SKILLS_DIR` env var.
- All UI strings, MCP tool descriptions, README, CLAUDE.md, and POSITIONING.md updated.
- Competitor table updated to real tools: SecureClaw, AgentVerus, Snyk ToxicSkills, MintMCP,
  Anthropic sandbox-runtime.
- Config engine internals (`openclaw.json`, `OpenClawConfig` types, backup filename prefix) are
  intentionally unchanged — targeted for Phase 2.

### Testing

- **24 unit tests** — 9 in `packages/dashboard/src/server.test.ts` (API validation, clone safety
  flags), 15 in `packages/skill-scanner/src/analyzer.test.ts` (risk scoring, deduplication, score
  cap, platform detection, multi-file scanning, node_modules skip, summary text).
- **21 Playwright E2E tests** across 5 suites covering UI rendering, navigation, API validation,
  security input sanitisation, and config round-trips.
- **GitHub Actions CI** — build and unit tests run on every push and pull request to main.

### Documentation

- README leads with the "why this matters" story (Snyk 36% prompt injection finding).
- `SECURITY.md` — vulnerability reporting policy, dependency hygiene policy, hardening measures.
- `POSITIONING.md` — market analysis, target audience, competitive positioning, pre-showcase checklist.
- `CLAUDE.md` — project context and architecture for AI assistant sessions.

---

## [0.1.0] - 2026-03-23

Initial internal build. Setup Wizard, Skill Scanner, Permission Dashboard, and Audit Log shipped
as a working monorepo. Config engine targeting a placeholder agent schema. Docker stack with
hardened container, Ollama, and dashboard service.
