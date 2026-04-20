# BoltClaw

**The security control panel for Claude Code skills and MCP servers**

## Why This Matters

Snyk's ToxicSkills study found prompt injection in 36% of scanned AI agent skills. Developers are installing skills and MCP servers from GitHub with no way to know whether they're safe - and every existing security tool assumes you already know what a YARA rule is. BoltClaw is the visual, plain-English alternative: scan before you install, see what your agent can access, fix misconfigurations before they become incidents.

![BoltClaw dashboard demo](demo.gif)

## How BoltClaw is Different

| Tool | Type | Focus | UI |
|------|------|-------|----|
| SecureClaw (Adversa AI) | Plugin + Skill | 55 audit checks, OWASP mapped | CLI only |
| AgentVerus / SkillScanner | Scanner | ML classifiers, structured trust reports | CLI only |
| Snyk ToxicSkills | Scanner | Prompt injection detection | CLI only |
| MintMCP | Runtime interceptor | Real-time MCP guardrails, audit trails | None (API) |
| Anthropic sandbox-runtime | Runtime sandbox | bubblewrap/seatbelt isolation | None (library) |
| **BoltClaw** | **Control panel** | **Config hardening + skill scanning + risk scoring** | **Visual dashboard** |

BoltClaw is the only tool that combines visual permission management, plain-English threat explanations, and guided setup - designed for the people who need security most: those who aren't security experts.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      YOUR MACHINE                         │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              BoltClaw Dashboard                     │ │
│  │            (localhost:3000)                         │ │
│  │                                                     │ │
│  │  ┌──────────┐ ┌───────────┐ ┌────────────────────┐ │ │
│  │  │ Setup    │ │ Skill     │ │ Permission         │ │ │
│  │  │ Wizard   │ │ Scanner   │ │ Manager            │ │ │
│  │  └────┬─────┘ └─────┬─────┘ └──────────┬─────────┘ │ │
│  │       │              │                  │           │ │
│  │  ┌────▼──────────────▼──────────────────▼─────────┐ │ │
│  │  │              BoltClaw Config Engine             │ │ │
│  │  │         (reads/writes agent config)             │ │ │
│  │  └───────────────────┬─────────────────────────────┘ │ │
│  └──────────────────────│─────────────────────────────┘ │
│                         │                                │
│  ┌──────────────────────▼──────────────────────────────┐ │
│  │           Claude Code + MCP Servers                 │ │
│  │  Skills in .claude/skills/   MCP servers via JSON   │ │
│  │  Scanned before installation  Config hardened        │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Prerequisites

- **Node.js 22+** - [nodejs.org](https://nodejs.org)
- **Docker Desktop** - [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)

## Quick Start

```bash
# Install dependencies
npm install

# Run unit tests (no Docker needed)
npm run test:unit

# Start the agent + Ollama + Dashboard containers
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

## Authentication

BoltClaw's API requires a shared-secret token to prevent other processes on your machine from reading or modifying your agent config.

On first startup, BoltClaw generates a random token and saves it to `~/.openclaw/boltclaw-token`. The token is printed to the terminal and also embedded in a clickable URL:

```
BoltClaw API token: abc123...
  Authenticated URL: http://localhost:3000?token=abc123...
```

Click the authenticated URL to open the dashboard. The token is stripped from the browser address bar automatically so it doesn't leak into history or referer headers.

To use a custom token, set the `BOLTCLAW_API_TOKEN` environment variable before starting BoltClaw.

## Project Structure

```
boltclaw/
├── docker/               # Hardened agent container + docker-compose
│   ├── docker-compose.yml
│   ├── Dockerfile.dashboard
│   └── openclaw-defaults/ # Seed config
├── packages/
│   ├── config-engine/    # Parse, validate, backup, and write agent config + boltclaw.json
│   ├── skill-scanner/    # Static analysis - 15 patterns, 6 categories, risk scoring
│   ├── dashboard/        # React frontend + Express API (Setup Wizard, Scanner, Permissions, Audit Log)
│   └── mcp-server/       # MCP server exposing BoltClaw tools to Claude
├── tests/                # Playwright end-to-end tests (21 tests across 5 suites)
├── playwright.config.ts
├── package.json          # Monorepo root (npm workspaces)
└── CLAUDE.md             # AI assistant project context
```

## Features

### Setup Wizard

4-step guided flow with four security profiles: Lockdown, Balanced, Developer, and Migration Ready. Configure permissions with 3-way toggles (deny/ask/allow), and review your generated config with a security score before applying.

### Skill Scanner

Scan Claude Code skills and MCP servers for threats before installation - paste a local directory path or a GitHub URL. Checks for 15 threat patterns across 6 categories: exfiltration (curl/wget, fetch, webhooks), prompt injection (instruction override, system prompt manipulation, tool output injection), obfuscation (base64, eval, hex encoding), permissions (sudo/privilege escalation, env variable access, undeclared capabilities), filesystem (sensitive file access, write operations), and execution (shell commands, browser automation). Each finding includes a plain-English "Why this matters" explanation. Risk scoring from 0-100 with levels: Safe, Caution, Warning, Danger.

### Permission Dashboard

Visual grid showing current permission levels with colour-coded risk badges. Includes a circular security score gauge (A-F grading), Quick Fix buttons for risky settings, a findings list grouped by severity, and backup/restore UI.

### Audit Log

Tracks every BoltClaw action: config reads, config writes, backup restores, and skill scans. Filterable by severity (Info/Warning/Danger), searchable by keyword, with expandable event details and a clear log button. Events auto-refresh every 10 seconds.

### Config Engine

Reads and writes your agent config plus a `boltclaw.json` sidecar for BoltClaw-specific settings. Automatic backup before every change. Bidirectional mapping between BoltClaw toggles and config values. Auto-migration from old formats.

## Testing

### End-to-end tests (Playwright)

21 tests across 5 suites covering UI rendering, navigation flows, API validation, security input sanitisation, and config round-trips:

```bash
npm test          # Run all tests (headless)
npm run test:ui   # Run with Playwright UI for debugging
```

### Unit tests

24 unit tests across two packages (dashboard API validation and skill-scanner analysis engine). No containers needed:

```bash
npm run test:unit
```

## Docker Setup

3-container stack via docker-compose:

- **Agent container** - hardened with read-only filesystem, bridge network only, tmpfs for writable directories with correct uid/gid ownership
- **Ollama** - local LLM for testing without cloud dependencies
- **BoltClaw Dashboard** - serves the UI and API, includes git for GitHub URL scanning

## Tech Stack

TypeScript, React, Express, Vite, Docker, Zod, Tailwind CSS, Playwright

## Licence and Monetisation

BoltClaw is MIT licensed. Use it, fork it, ship it.

There is no paid tier, no Pro plan, and no cloud component. The codebase exists as a portfolio piece demonstrating threat modelling, static analysis design, and secure API design in the AI security space. Contributions welcome.
