# Security

## Reporting vulnerabilities

If you find a security issue in BoltClaw, please open a GitHub issue or email craig.mccart@outlook.com. BoltClaw is a portfolio project maintained by one person, so there is no bug bounty, but all reports will be acknowledged and addressed.

## Dependency hygiene policy

BoltClaw runs `npm audit` before every release. The policy is:

1. **Runtime dependencies** (anything that ships in the built dashboard or MCP server) must have zero known high or critical vulnerabilities at release time. If a patched version exists, we upgrade. If no patch exists, we document the finding below and assess whether BoltClaw's usage is affected.
2. **Dev dependencies** (build tools, test runners, linters) are lower priority. If a vulnerability only exists in a package used during development and never runs in production, it may be deferred until the upstream maintainer ships a fix. These are documented below with a reason for deferral.
3. **Overrides** are used sparingly. If a transitive dependency has a patched version but the direct dependency hasn't updated yet, we pin via `overrides` in `package.json` only when we've confirmed the patched version doesn't introduce breaking changes.

## Current status

Last audited: 2026-04-16

### Resolved in this release

All 5 findings were in **Vite** (`node_modules/vite`), a dev-only build tool that is never included in the production dashboard or MCP server builds. Resolved via `npm audit fix`:

- 2 moderate severity vulnerabilities
- 3 high severity vulnerabilities

All 5 were fixable with a non-breaking version bump to Vite. No runtime dependencies were affected.

### Deferred findings

None. All findings resolved.

### Runtime dependency status

Zero known vulnerabilities in runtime dependencies as of last audit date. Runtime deps include: Express 5.2.1, Helmet 8.1.0, Multer 2.1.1, Zod 4.3.6, dotenv, @modelcontextprotocol/sdk.

## Hardening measures

BoltClaw applies the following security measures to its own codebase:

- **API authentication** - shared-secret token required for all API endpoints except health check, with constant-time comparison
- **Input validation** - Zod schemas on all API request bodies
- **Path traversal prevention** - scan paths validated against a configurable root directory, sensitive paths explicitly blocked
- **Scan rate limiting** - concurrent scan limit to prevent resource exhaustion
- **CSP headers** - Helmet with a restrictive Content Security Policy
- **Automatic backups** - every config write creates a timestamped backup
- **Audit logging** - all config reads, writes, restores, and scans are logged with timestamps
