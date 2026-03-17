# SafeClaw — Build Plan
## A Security-First Configuration Wrapper for OpenClaw

### What You're Building
A local web dashboard that wraps OpenClaw's setup and configuration process, enforcing secure defaults, scanning skills before install, and giving users clear visibility into what their agent can access. Think of it as a "security control panel" that sits between the user and OpenClaw's raw config.

---

## Your Dev Environment

| Tool | Purpose | Cost |
|------|---------|------|
| **Docker Desktop** | Run OpenClaw in an isolated container | Free (you have it) |
| **Claude Code** | Build SafeClaw (CLI + web UI) | Free with Claude Pro |
| **Ollama** | Run a local LLM for OpenClaw testing | Free |
| **Node.js** | SafeClaw is a Node app (OpenClaw is Node-based too) | Free |
| **GitHub** | Version control + portfolio visibility | Free |
| **Gemini Flash Lite** | Swap in later for smarter testing | ~$0.01-0.05/session |
| **Vercel** | Optional: host a project landing page | Free tier |
| **Supabase** | Optional: if you add a skill reputation database later | Free tier |

---

## Claude Code Setup — MCP Servers to Connect

These will accelerate your build significantly. Set them up before you start coding.

### Essential (install these first)

```bash
# 1. GitHub MCP — push code, manage issues, PRs
claude mcp add --transport stdio github -- npx -y @modelcontextprotocol/server-github
# You'll need a GitHub Personal Access Token (free)

# 2. Filesystem MCP — let Claude Code read your project + OpenClaw docs
claude mcp add --transport stdio filesystem -- npx -y @modelcontextprotocol/server-filesystem /path/to/your/safeclaw-project

# 3. Docker MCP (via Docker MCP Toolkit) — interact with containers from Claude Code
# Install from Docker Desktop > Settings > MCP Toolkit (one-click)
# This lets Claude Code manage your OpenClaw test container directly
```

### Recommended (install when you need them)

```bash
# 4. Context7 — get up-to-date docs for React, Next.js, etc. inside Claude Code
claude mcp add --transport stdio context7 -- npx -y @upstash/context7-mcp

# 5. Playwright MCP — for testing your web UI automatically
claude mcp add --transport stdio playwright -- npx -y @anthropic/mcp-playwright
```

### Claude Code Plugins & Skills to Install

```bash
# Security-focused code review (by Trail of Bits)
# Clone from: https://github.com/trailofbits — look for their Claude Code security skills

# Parry — prompt injection scanner for Claude Code hooks
# Early stage but directly relevant to what you're building
# https://github.com/search?q=parry+claude+code+prompt+injection

# Anthropic's security review slash command — built into Claude Code
# Just run: /security-review

# Trail of Bits security skills — clone into your global skills directory:
# mkdir -p ~/.claude/skills
# Then pull their skills from GitHub into that folder

# ⚠️ NOT AVAILABLE — `claude install @anthropic/feature-dev` does not work.
# `claude install` is for updating Claude Code itself, not plugins.
# For structured feature development, work with Claude Code conversationally.
```

### Your CLAUDE.md File (Critical)

Create this at the root of your SafeClaw project. It tells Claude Code how to behave:

```markdown
# SafeClaw Project Context

## What this is
SafeClaw is a security-first configuration wrapper for OpenClaw (openclaw.ai).
It provides a local web dashboard that enforces secure defaults and scans
skills before installation.

## Tech Stack
- Backend: Node.js (Express or Fastify)
- Frontend: React (single-page app, runs locally)
- Config: Reads/writes OpenClaw's ~/.openclaw/openclaw.json
- Container: Docker for isolated OpenClaw testing
- No cloud dependencies for core functionality

## Architecture Principles
- SafeClaw NEVER requires more permissions than OpenClaw itself
- All config changes are reversible (maintain backups)
- Default to most restrictive settings, let user opt in
- Scan all skills BEFORE they touch the OpenClaw runtime
- Clear, plain-English explanations of every security toggle

## Code Style
- TypeScript preferred
- Functional components in React
- Comprehensive error handling — this is a security tool
- Comments explaining WHY, not WHAT
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  YOUR MACHINE                    │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │           SafeClaw Dashboard              │   │
│  │         (localhost:3000)                   │   │
│  │                                           │   │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────┐ │   │
│  │  │ Setup   │ │ Skill    │ │ Permission│ │   │
│  │  │ Wizard  │ │ Scanner  │ │ Manager   │ │   │
│  │  └────┬────┘ └────┬─────┘ └─────┬─────┘ │   │
│  │       │           │              │        │   │
│  │  ┌────▼───────────▼──────────────▼─────┐ │   │
│  │  │        SafeClaw Config Engine        │ │   │
│  │  │   (reads/writes openclaw.json)       │ │   │
│  │  └────────────────┬────────────────────┘ │   │
│  └───────────────────│──────────────────────┘   │
│                      │                           │
│  ┌───────────────────▼──────────────────────┐   │
│  │         Docker Container                  │   │
│  │  ┌─────────────────────────────────────┐ │   │
│  │  │          OpenClaw Instance           │ │   │
│  │  │  + Ollama (local LLM)               │ │   │
│  │  │  + Sandboxed filesystem             │ │   │
│  │  │  + No host network access           │ │   │
│  │  └─────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## Build Plan — Week by Week

### Week 1: Foundation & Docker Sandbox

**Goal:** OpenClaw running in Docker, SafeClaw project scaffolded.

**Tasks:**
1. Create GitHub repo for SafeClaw
2. Write a Dockerfile that runs OpenClaw in a locked-down container:
   - No host network access (use bridge network)
   - Read-only filesystem where possible
   - No shell access by default
   - Ollama running alongside for free LLM testing
3. Scaffold SafeClaw as a Node.js + React project using Claude Code
4. Build the Config Engine — a module that can:
   - Read ~/.openclaw/openclaw.json
   - Parse and understand every security-relevant setting
   - Write changes back safely (with automatic backup)

**Claude Code prompt to kick things off:**
```
Create a new Node.js project called "safeclaw" with a React frontend.
The backend should be able to read and write OpenClaw configuration
files (openclaw.json format). Start with a module that parses the
config and identifies all security-relevant settings. Use TypeScript.
```

**What you'll learn:** Docker basics, OpenClaw's config structure, project scaffolding.

---

### Week 2: Setup Wizard (The Core Feature)

**Goal:** A guided setup flow that produces a secure openclaw.json.

**Tasks:**
1. Map every security-relevant setting in OpenClaw's config:
   - `security` (deny/allow for shell, filesystem, browser, network)
   - `messaging.allowlist` (who can talk to the bot)
   - `skills.allowBundled` (which built-in skills are enabled)
   - `tools` permissions
   - Network exposure settings
2. Build a step-by-step wizard UI with 4-5 screens:
   - **Screen 1:** "What will you use OpenClaw for?" (preset profiles: Personal, Developer, Business)
   - **Screen 2:** "Who can message your agent?" (allowlist configuration)
   - **Screen 3:** "What can your agent access?" (filesystem, shell, browser toggles with plain-English risk explanations)
   - **Screen 4:** "Review & Apply" (shows the generated config with a risk score)
3. Each toggle should show:
   - What it does (plain English)
   - Risk level (Low / Medium / High / Critical)
   - What breaks if you disable it

**What you'll learn:** OpenClaw's permission model deeply, secure-by-default design.

---

### Week 3: Skill Scanner

**Goal:** Scan OpenClaw skills for red flags before installation.

**Tasks:**
1. Build a skill analysis module that takes a skill directory and:
   - Parses SKILL.md for suspicious instructions
   - Checks for curl/wget/fetch calls to external URLs
   - Detects file system access patterns
   - Flags encoded or obfuscated content
   - Looks for prompt injection patterns in skill instructions
   - Checks if the skill requests more permissions than needed
2. Create a risk scoring system:
   - **Safe:** No external calls, read-only, well-documented
   - **Caution:** Makes network calls but to known services
   - **Warning:** Accesses filesystem + network, unclear purpose
   - **Danger:** Exfiltration patterns, obfuscated code, excessive permissions
3. Add a UI panel: "Scan a Skill" — paste a ClawHub URL or skill path, get a report
4. (Optional) Cross-reference with VirusTotal's API (OpenClaw already has this partnership)

**What you'll learn:** Static analysis, prompt injection patterns, supply chain security.

---

### Week 4: Permission Dashboard & Audit Log

**Goal:** Real-time visibility into what OpenClaw is configured to do.

**Tasks:**
1. Build a dashboard showing:
   - Current permission levels (visual grid: green/yellow/red)
   - Installed skills and their risk scores
   - Connected messaging platforms
   - Network exposure status (is it internet-accessible? what ports?)
2. Add an audit log viewer:
   - Parse OpenClaw's logs
   - Highlight security-relevant events
   - Show permission escalation attempts
3. Add a "Security Score" — an overall rating for the current config
4. Add a "Quick Fix" button for each issue found

**What you'll learn:** Security dashboards, log analysis, risk communication.

---

### Week 5: Polish, Document, Ship

**Goal:** Portfolio-ready project.

**Tasks:**
1. Write a great README with screenshots and a demo GIF
2. Create a project landing page (deploy to Vercel — free tier)
3. Write a blog post: "What I Learned About AI Agent Security Building SafeClaw"
4. Record a 2-minute demo video
5. Run Anthropic's /security-review on your own code
6. Open-source it with a clear LICENSE

---

## Folder Structure

```
safeclaw/
├── docker/
│   ├── Dockerfile            # Hardened OpenClaw container
│   └── docker-compose.yml    # OpenClaw + Ollama orchestration
├── packages/
│   ├── config-engine/        # Reads/writes openclaw.json
│   │   ├── src/
│   │   │   ├── parser.ts     # Parse OpenClaw config
│   │   │   ├── validator.ts  # Validate security settings
│   │   │   ├── defaults.ts   # Secure default profiles
│   │   │   └── backup.ts     # Config backup/restore
│   │   └── package.json
│   ├── skill-scanner/        # Static analysis of skills
│   │   ├── src/
│   │   │   ├── analyzer.ts   # Core analysis logic
│   │   │   ├── patterns.ts   # Known bad patterns
│   │   │   ├── scorer.ts     # Risk scoring
│   │   │   └── report.ts     # Human-readable output
│   │   └── package.json
│   └── dashboard/            # React web UI
│       ├── src/
│       │   ├── pages/
│       │   │   ├── SetupWizard.tsx
│       │   │   ├── SkillScanner.tsx
│       │   │   ├── PermissionDashboard.tsx
│       │   │   └── AuditLog.tsx
│       │   └── components/
│       └── package.json
├── CLAUDE.md                 # Claude Code project context
├── README.md
└── package.json              # Monorepo root
```

---

## Key Resources to Study

### OpenClaw Security (read these first)
- Official security docs: https://docs.openclaw.ai/gateway/security
- Cisco's analysis: https://blogs.cisco.com/ai/personal-ai-agents-like-openclaw-are-a-security-nightmare
- CrowdStrike's deep dive: https://www.crowdstrike.com/en-us/blog/what-security-teams-need-to-know-about-openclaw-ai-super-agent/
- Sophos's assessment: https://www.sophos.com/en-us/blog/the-openclaw-experiment-is-a-warning-shot-for-enterprise-ai-security
- Bitsight's exposure analysis: https://www.bitsight.com/blog/openclaw-ai-security-risks-exposed-instances

### Claude Code for Building
- Official docs: https://code.claude.com
- Docker + Claude Code: https://www.docker.com/blog/run-claude-code-with-docker/
- MCP setup guide: https://code.claude.com/docs/en/mcp
- Security review action: https://github.com/anthropics/claude-code-security-review

### Prompt Injection (core knowledge for your career)
- CrowdStrike's injection taxonomy (referenced in their OpenClaw article)
- OWASP Top 10 for LLM Applications
- Trail of Bits security skills for Claude Code

---

## Portfolio Positioning

When presenting SafeClaw in job applications, frame it as:

> "I built SafeClaw after studying how 40,000+ OpenClaw instances were
> exposed due to insecure defaults. It's a security-first configuration
> wrapper that enforces least-privilege by default, scans community skills
> for prompt injection and data exfiltration patterns, and gives users
> a clear dashboard showing their agent's attack surface. Built with
> Claude Code, Docker, React, and TypeScript."

This demonstrates:
- AI agent security knowledge (hot topic, few practitioners)
- Secure-by-default design thinking
- Static analysis / supply chain security
- Practical tooling that solves a real, documented problem
- Open source contribution to a fast-growing ecosystem
