# BoltClaw

**The security control panel for claw-based AI agents**

BoltClaw gives you visual security management, skill threat scanning, and guided hardening for OpenClaw, NanoClaw, and NemoClaw - so you can see what your agent can access, catch malicious skills before they run, and fix misconfigurations before they become headlines.

## How BoltClaw is Different

| Tool | Type | Focus | UI |
|------|------|-------|----|
| SecureClaw (Adversa AI) | Plugin + Skill | 55 audit checks, OWASP mapped | CLI only |
| openclaw-security-monitor | Scanner | 48-point scan, IOC feeds, threat intel | Web dashboard |
| NemoClaw (Nvidia) | Runtime | OpenShell sandboxing, privacy router | None (CLI) |
| NanoClaw | Alternative platform | Container isolation from scratch | None (CLI) |
| **BoltClaw** | **Control panel** | **Config hardening + skill scanning + risk scoring** | **Visual dashboard** |

BoltClaw is the only tool that combines visual permission management, cross-platform skill scanning, and guided setup - designed for the people who need security most: those who aren't security experts.

## Why not just use NanoClaw?

NanoClaw is great for new setups - it's a lightweight, container-first alternative to OpenClaw with strong isolation out of the box. But BoltClaw helps the 250,000+ existing OpenClaw users harden what they already have. BoltClaw's skill scanner also works across both platforms since OpenClaw and NanoClaw share the same SKILL.md format, so you get threat detection regardless of which platform you're running.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      YOUR MACHINE                         │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              BoltClaw Dashboard                     │ │
│  │            (localhost:3000)                           │ │
│  │                                                      │ │
│  │  ┌──────────┐ ┌───────────┐ ┌────────────────────┐  │ │
│  │  │ Setup    │ │ Skill     │ │ Permission         │  │ │
│  │  │ Wizard   │ │ Scanner   │ │ Manager            │  │ │
│  │  └────┬─────┘ └─────┬─────┘ └──────────┬─────────┘  │ │
│  │       │              │                  │             │ │
│  │  ┌────▼──────────────▼──────────────────▼──────────┐ │ │
│  │  │           BoltClaw Config Engine                │ │ │
│  │  │      (reads/writes openclaw.json)                │ │ │
│  │  └───────────────────┬─────────────────────────────┘ │ │
│  └──────────────────────│──────────────────────────────┘ │
│                         │                                 │
│  ┌──────────────────────▼─────────────────────────────┐  │
│  │              Docker Container(s)                    │  │
│  │  ┌───────────────────────┐ ┌─────────────────────┐ │  │
│  │  │   OpenClaw Instance   │ │  NanoClaw Instance  │ │  │
│  │  │  + Ollama (local LLM) │ │  + Docker Sandbox   │ │  │
│  │  │  + Sandboxed FS       │ │  + Container-first  │ │  │
│  │  │  + No host network    │ │  + Isolated agents  │ │  │
│  │  └───────────────────────┘ └─────────────────────┘ │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Prerequisites

- **Node.js 22+** - [nodejs.org](https://nodejs.org)
- **Docker Desktop** - [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)

## Quick Start

```bash
# Install dependencies
npm install

# Start the OpenClaw + Ollama + Dashboard containers
npm run docker:up

# Optional: pull a local LLM model for agent testing
npm run docker:pull-model

# Run the Playwright test suite (requires containers running)
npm test
```

For local development without Docker:

```bash
npm run dev   # Starts dashboard at localhost:5173, proxies API to :3000
```

## Project Structure

```
boltclaw/
├── docker/               # Hardened OpenClaw container + docker-compose
│   ├── docker-compose.yml
│   ├── Dockerfile.dashboard
│   └── openclaw-defaults/ # Seed config using real OpenClaw schema
├── packages/
│   ├── config-engine/    # Parse, validate, backup, and write openclaw.json + boltclaw.json
│   ├── skill-scanner/    # Static analysis - 15 patterns, 6 categories, risk scoring
│   └── dashboard/        # React frontend + Express API (Setup Wizard, Scanner, Permissions, Audit Log)
├── tests/                # Playwright end-to-end tests (21 tests across 5 suites)
├── playwright.config.ts
├── package.json          # Monorepo root (npm workspaces)
└── CLAUDE.md             # AI assistant project context
```

## Features

### Setup Wizard

4-step guided flow with four security profiles: Lockdown, Balanced, Developer, and Migration Ready. Configure messaging allowlists, fine-tune individual permissions with 3-way toggles (deny/ask/allow), and review your generated config with a security score before applying. The Migration Ready profile is designed for users testing NanoClaw alongside OpenClaw.

### Skill Scanner

Scan skills for threats before installation - paste a local directory path or a GitHub URL. Works with both OpenClaw and NanoClaw skills (auto-detected). Checks for 15 threat patterns across 6 categories: exfiltration (curl/wget, fetch, webhooks), prompt injection (instruction override, system prompt manipulation, role override), obfuscation (base64, eval, hex encoding), permissions (sudo/privilege escalation, env variable access), filesystem (sensitive file access, write operations), and execution (container escape, SDK misuse). Each finding includes a plain-English "Why this matters" explanation of what the threat could actually do. Risk scoring from 0-100 with levels: Safe, Caution, Warning, Danger.

### Permission Dashboard

Visual grid showing current permission levels with colour-coded risk badges. Includes a circular security score gauge (A-F grading), Quick Fix buttons for risky settings, OpenClaw-specific settings (sandbox mode, gateway bind, bundled skills), a findings list grouped by severity, Migration Advisor for critically low scores, and backup/restore UI.

### Audit Log

Tracks every BoltClaw action: config reads, config writes, backup restores, and skill scans. Filterable by severity (Info/Warning/Danger), searchable by keyword, with expandable event details and a clear log button. Events auto-refresh every 10 seconds.

### Config Engine

Reads and writes OpenClaw's real `openclaw.json` schema (validated against actual OpenClaw v2026.3.13) plus a `boltclaw.json` sidecar for BoltClaw-specific settings. Automatic backup before every change. Bidirectional mapping between BoltClaw toggles and OpenClaw config values. Auto-migration from old formats.

## Testing

### End-to-end tests (Playwright)

21 tests across 5 suites covering UI rendering, navigation flows, API validation, security input sanitisation, and config round-trips:

```bash
npm test          # Run all tests (headless)
npm run test:ui   # Run with Playwright UI for debugging
```

### Config round-trip verification

All four security profiles have been tested against a live OpenClaw v2026.3.13 container:

| Profile | Score | OpenClaw Accepts | Live Reload | Clean Restart |
|---------|-------|-----------------|-------------|---------------|
| Lockdown | 100/A | Yes | Yes | Yes |
| Balanced | 73/C | Yes | Yes | Yes |
| Developer | 49/F | Yes | Yes | Yes |
| Migration Ready | 100/A | Yes | Yes | Yes |

OpenClaw detects config changes in real-time and hot-reloads without requiring a restart.

## Docker Setup

3-container stack via docker-compose:

- **OpenClaw** - hardened with read-only filesystem, bridge network only, tmpfs for writable directories (tmp, canvas, cron, workspace, agents) with correct uid/gid ownership
- **Ollama** - local LLM for testing without cloud dependencies
- **BoltClaw Dashboard** - serves the UI and API, includes git for GitHub URL scanning

## Why This Matters

BoltClaw exists because 40,000+ OpenClaw instances were exposed due to insecure defaults. When OpenClaw agents connected to the Moltbook social network, researchers found prompt injection vectors, mass impersonation, and agents acting beyond their owners' intent. BoltClaw's permission controls and skill scanning address exactly these failure modes.

## Tech Stack

TypeScript, React, Express, Vite, Docker, Zod, Tailwind CSS, Playwright
