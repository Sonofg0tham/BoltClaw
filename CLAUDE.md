# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeClaw is a security toolkit for AI agent platforms — starting with OpenClaw and NanoClaw. It provides a local web dashboard that enforces secure defaults, scans third-party skills before installation, and gives users visibility into what their AI agent can access. No cloud dependencies for core functionality.

## Supported Platforms

- **OpenClaw** (openclaw.ai) — the original AI agent platform. SafeClaw provides config hardening, skill scanning, and permission management for OpenClaw's `openclaw.json`.
- **NanoClaw** (github.com/qwibitai/nanoclaw) — a lightweight (~500 lines of code) OpenClaw alternative with container-first isolation via Docker Sandbox. Uses the same `SKILL.md` skill format as OpenClaw, so SafeClaw's skill scanner works with NanoClaw skills out of the box. NanoClaw stores skills in `.claude/skills/` rather than at the project root.

## Tech Stack

- **Backend:** Node.js (Express), TypeScript
- **Frontend:** React (single-page app, functional components), TypeScript, Tailwind CSS
- **Container:** Docker for isolated OpenClaw + Ollama testing
- **Testing:** Playwright (21 end-to-end tests across 5 suites)
- **Validation:** Zod for API request schemas
- **Monorepo:** npm workspaces

## Architecture

SafeClaw runs on localhost:3000 with four main UI features backed by a shared config engine:

- **Setup Wizard** — 4-step guided flow producing a secure `openclaw.json` with preset profiles (Lockdown, Balanced, Developer, Migration Ready)
- **Skill Scanner** — static analysis of OpenClaw and NanoClaw skills for 15 threat patterns across 6 categories (exfiltration, injection, obfuscation, permissions, filesystem, execution). Accepts local paths or GitHub URLs. Auto-detects platform. Each finding includes a "Why this matters" plain-English impact explanation. Risk levels: Safe → Caution → Warning → Danger
- **Permission Dashboard** — real-time permission grid, circular security score gauge (A-F), Quick Fix buttons, OpenClaw settings (sandbox, gateway, bundled skills), findings list, Migration Advisor, backup/restore UI
- **Audit Log** — tracks every SafeClaw action (config reads/writes, scans, restores) with severity filters, search, and expandable details

All config changes write through the **Config Engine** (`packages/config-engine/`), which manages two files:
- `openclaw.json` — real OpenClaw schema (validated against v2026.3.13)
- `safeclaw.json` — sidecar for SafeClaw-specific toggles (security permissions, messaging allowlist)

Automatic backup before every write. Bidirectional mapping between SafeClaw toggles and OpenClaw config values.

## Monorepo Structure

```
safeclaw/
├── docker/               # Hardened OpenClaw container + docker-compose
│   ├── docker-compose.yml
│   ├── Dockerfile.dashboard
│   └── openclaw-defaults/ # Seed config using real OpenClaw schema
├── packages/
│   ├── config-engine/    # Parse, validate, backup, and write openclaw.json + safeclaw.json
│   ├── skill-scanner/    # Static analysis — 15 patterns, 6 categories, risk scoring
│   └── dashboard/        # React frontend + Express API server
├── tests/                # Playwright end-to-end tests (5 suites)
├── playwright.config.ts
└── package.json          # Monorepo root with npm workspaces
```

## Common Commands

```bash
npm run docker:up        # Start all 3 containers (OpenClaw + Ollama + Dashboard)
npm run docker:down      # Stop all containers
npm run dev              # Start dashboard in dev mode (localhost:5173)
npm run build            # Build all packages
npm test                 # Run Playwright tests (requires containers running)
npm run test:ui          # Run Playwright with interactive UI
```

## Security Principles

These are non-negotiable design constraints:

- SafeClaw must never require more permissions than OpenClaw itself
- All config changes must be reversible (automatic backups)
- Default to the most restrictive settings; users opt in to more access
- Scan all skills before they touch the OpenClaw or NanoClaw runtime
- Every security toggle needs a plain-English explanation of what it does, its risk level, and what breaks if disabled

## Docker Container Setup

3-container stack via docker-compose:

- **OpenClaw** — `ghcr.io/openclaw/openclaw:latest`, hardened with read-only filesystem, bridge network only, tmpfs for writable dirs (tmp, canvas, cron, workspace, agents) with uid=1000 ownership
- **Ollama** — `ollama/ollama:latest`, local LLM on port 11434
- **Dashboard** — built from `Dockerfile.dashboard`, serves UI on port 3000, includes git for GitHub URL scanning

## Config Schema (Important)

OpenClaw's real config schema was discovered on 2026-03-17 by probing the Docker image. SafeClaw's original schema was completely wrong and caused OpenClaw to crash.

**Valid top-level keys:** meta, commands, agents, gateway, skills, channels, auth, tools

**Key paths:**
- `gateway.mode`: "local" | "remote"
- `gateway.bind`: "auto" | "lan" | "loopback" | "custom" | "tailnet"
- `agents.defaults.sandbox.mode`: "off" | "non-main" | "all"
- `skills.allowBundled`: array of strings (NOT boolean)

**Invalid keys (rejected by OpenClaw):** `security.*`, `permissions.*`, `messaging.*`, `network.*`, `tools.allowAll`, `tools.allowed`, `skills.installed`, `gateway.expose`

SafeClaw uses a sidecar approach: `openclaw.json` (real schema only) + `safeclaw.json` (SafeClaw toggles), with a mapper translating between them.
