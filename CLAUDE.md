# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BoltClaw is a local security dashboard for developers running AI agents on their own machines. It provides skill threat scanning, guided config hardening, and a visual permission manager for Claude Code skills and MCP servers. No cloud dependencies for core functionality.

BoltClaw is aimed at the solo developer or vibe coder who installs skills and MCP servers from GitHub, wants to know whether they're safe, and has no appetite for reading YARA rules or JSON audit reports. Every competitor in the AI agent security space is CLI-only and expert-oriented. BoltClaw is the visual, plain-English alternative.

## Target Platforms

- **Claude Code skills** - Skills stored in `.claude/skills/` using the `SKILL.md` format. BoltClaw's scanner checks skills for 15 threat patterns before installation.
- **MCP servers** - Model Context Protocol servers that extend Claude's tool use. BoltClaw checks MCP server code for undeclared capabilities, prompt injection vectors, and exfiltration patterns.

## Competitive Context

- **SecureClaw (Adversa AI)** - 55 OWASP-mapped audit checks. CLI-only, no visual dashboard. Focuses on auditing, not guided hardening.
- **AgentVerus / Skillscan Security / SkillScanner** - open source, expert-focused, CLI-only, ML classifiers (DeBERTa), structured trust reports. Aimed at AppSec engineers.
- **Snyk ToxicSkills** - found prompt injection in 36% of scanned skills. Aimed at enterprise procurement.
- **MintMCP** - real-time MCP interceptor with audit trails. Aimed at CISOs.
- **Anthropic's `@anthropic-ai/sandbox-runtime`** - bubblewrap/seatbelt sandboxing for agent platform builders, not end users.

BoltClaw differs by combining accessibility (visual dashboard), plain-English threat explanations, and a prevention-first approach (guided setup, scan before install, config hardening). None of the enterprise tools can easily copy this without rebuilding their product.

## Tech Stack

- **Backend:** Node.js (Express), TypeScript
- **Frontend:** React (single-page app, functional components), TypeScript, Tailwind CSS
- **Container:** Docker for isolated agent testing
- **Testing:** Playwright (21 end-to-end tests across 5 suites), node:test (24 unit tests)
- **Validation:** Zod for API request schemas
- **Monorepo:** npm workspaces

## Architecture

BoltClaw runs on localhost:3000 with four main UI features backed by a shared config engine:

- **Setup Wizard** - 4-step guided flow producing a hardened agent config with preset profiles (Lockdown, Balanced, Developer, Migration Ready)
- **Skill Scanner** - static analysis of Claude Code skills and MCP servers for 15 threat patterns across 6 categories (exfiltration, injection, obfuscation, permissions, filesystem, execution). Accepts local paths or GitHub URLs. Each finding includes a "Why this matters" plain-English impact explanation. Risk levels: Safe, Caution, Warning, Danger
- **Permission Dashboard** - real-time permission grid, circular security score gauge (A-F), Quick Fix buttons, findings list grouped by severity, backup/restore UI
- **Audit Log** - tracks every BoltClaw action (config reads/writes, scans, restores) with severity filters, search, and expandable details

All config changes write through the **Config Engine** (`packages/config-engine/`), which manages:
- `openclaw.json` - agent config file (currently modelled on the openclaw schema; Phase 2 will retarget this to a real Claude Code / MCP config format)
- `boltclaw.json` - sidecar for BoltClaw-specific toggles (security permissions, messaging allowlist)

Automatic backup before every write. Bidirectional mapping between BoltClaw toggles and config values.

## Monorepo Structure

```
boltclaw/
├── docker/               # Hardened agent container + docker-compose
│   ├── docker-compose.yml
│   ├── Dockerfile.dashboard
│   └── openclaw-defaults/ # Seed config (to be retargeted in Phase 2)
├── packages/
│   ├── config-engine/    # Parse, validate, backup, and write agent config + boltclaw.json
│   ├── skill-scanner/    # Static analysis - 15 patterns, 6 categories, risk scoring
│   ├── dashboard/        # React frontend + Express API server
│   └── mcp-server/       # MCP server exposing BoltClaw tools to Claude
├── tests/                # Playwright end-to-end tests (5 suites)
├── playwright.config.ts
└── package.json          # Monorepo root with npm workspaces
```

## Common Commands

```bash
npm run docker:up        # Start containers (agent + Ollama + Dashboard)
npm run docker:down      # Stop all containers
npm run dev              # Start dashboard in dev mode (localhost:5173)
npm run build            # Build all packages
npm run test:unit        # Run 24 unit tests (no containers needed)
npm test                 # Run Playwright E2E tests (requires containers running)
npm run test:ui          # Run Playwright with interactive UI
```

## Security Principles

These are non-negotiable design constraints:

- BoltClaw must never require more permissions than the agent it is securing
- All config changes must be reversible (automatic backups)
- Default to the most restrictive settings; users opt in to more access
- Scan all skills and MCP servers before they touch the agent runtime
- Every security toggle needs a plain-English explanation of what it does, its risk level, and what breaks if disabled

## Docker Container Setup

3-container stack via docker-compose:

- **Agent container** - hardened with read-only filesystem, bridge network only, tmpfs for writable dirs with uid=1000 ownership
- **Ollama** - `ollama/ollama:latest`, local LLM on port 11434
- **Dashboard** - built from `Dockerfile.dashboard`, serves UI on port 3000, includes git for GitHub URL scanning

## Phase 2 Note

The config engine currently targets a placeholder agent config schema. Phase 2 will rewrite it to target a real Claude Code or MCP config format. This is a 400-600 LOC change and should be done in a dedicated session. Do not start Phase 2 work without a confirmed target schema - it touches every config-engine test and the Permission Dashboard mapping layer.
