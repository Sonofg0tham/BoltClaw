# BoltClaw Positioning

_Last updated: 2026-04-17_

This doc captures where BoltClaw sits in the real AI agent security market, who it's for, and how it functions as a portfolio piece for an AppSec / AI Security pivot. Monetisation is explicitly out of scope (see "Why not monetise" below).

## One-line pitch

BoltClaw is the friendly security control panel for developers and hobbyists running AI agents on their own machines. It's what Little Snitch is to a firewall, or 1Password is to a password file: the visual front door for something that's otherwise CLI-only and expert-only.

## The real market in 2026

The AI agent security space moved fast over the last year. The tools that exist today fall into two clear camps.

**Enterprise-focused scanners and guardrails:**

- Cisco AI Defense Skill Scanner - YAML and YARA rules plus LLM-as-a-judge plus behavioural dataflow analysis. Aimed at security teams.
- Snyk ToxicSkills - shipped alongside a study finding 36% of scanned skills contained prompt injection. Aimed at procurement.
- MintMCP - sits between AI clients and MCP servers intercepting every tool call with real-time guardrails and audit trails. Aimed at CISOs.
- AgentVerus Scanner, Skillscan Security, SkillScanner - open source but expert-focused, CLI-only, structured trust reports, ML classifiers (DeBERTa), air-gapped Ollama modes. Aimed at AppSec engineers.
- Anthropic's own `@anthropic-ai/sandbox-runtime` npm package plus the bubblewrap and seatbelt-based Claude Code sandbox. Aimed at agent platform builders.

**Dev/consumer-focused tools for people running agents on their own laptop:**

Nothing. There is no visual, guided, beginner-friendly security tool in this space. Every tool listed above assumes you already know what a prompt injection is, can read a YARA rule, and are comfortable in a terminal. The hundreds of thousands of people running Claude Code, installing skills from GitHub, and wiring up MCP servers have no accessible option.

That's the slot BoltClaw owns. It is not competing with Cisco and Snyk. It is competing with "I'll just run it and hope for the best" and "I read half a blog post and felt overwhelmed".

## Who BoltClaw is for

Three concentric rings.

1. **The solo developer or hobbyist who just installed a Claude Code skill or MCP server from a GitHub repo and is wondering "should I have done that?"** They don't have a security team. They might have read about prompt injection once. They want a dashboard that shows them what their agent can access and a scanner that tells them in plain English whether that skill they downloaded is going to steal their SSH keys.
2. **The vibe coder or non-traditional developer building agent-powered side projects.** AI-powered IDEs made shipping real software accessible to people who don't write code themselves. Those same people are running agents with broad permissions and no security instincts. BoltClaw gives them guardrails without a PhD in AppSec.
3. **The small-team dev lead who wants a quick sanity check before rolling out a new agent config or MCP server to their team.** Not doing a compliance audit, not writing a policy document. Just wants to look at a dashboard for two minutes and know nothing obvious is wrong.

Notice who it's explicitly not for: anyone with a procurement process, anyone writing a SOC 2 report, anyone who's going to compare feature matrices against Cisco. Those people will buy Snyk. That's fine. Let them.

## What makes BoltClaw defensible

Three things, and they're things none of the enterprise tools can easily copy because they'd have to throw out their existing product to do it.

1. **Visual first.** A dashboard with a circular security score gauge, colour-coded permission grids, and Quick Fix buttons. Every competitor is CLI-plus-JSON-report. For the target user, visual is not a nice-to-have, it's the entire product.
2. **Plain-English "why this matters".** Every threat pattern in BoltClaw's scanner has a plain-language impact explanation, not just a CWE ID. "This could silently send your private files to someone else's server" beats "CWE-200: Exposure of Sensitive Information" for the target user every time.
3. **Guided setup, not a feature list.** The 4-step Setup Wizard with preset profiles (Lockdown, Balanced, Developer, Migration Ready) is the opposite of how enterprise tools onboard. Enterprise tools hand you a config reference. BoltClaw walks you through four questions and generates a secure config. That's 1Password vs a KeePass database.

If BoltClaw ever loses those three things in pursuit of feature parity with Cisco, it dies. The moat is accessibility, not detection breadth.

## Why not monetise

Short version: the market wedge BoltClaw owns is not one you can charge money for.

The longer version. A paid tier for BoltClaw would have to out-compete free tools from Snyk and Cisco that the target audience can find in 30 seconds. The non-expert developer who would benefit most is also the person least willing to put a credit card down for a security tool they've never heard of. They'll either use BoltClaw free, use another free tool, or not use anything at all. Converting 2% of that audience to a Pro tier at 12 GBP a month would consume more time in support emails, refund requests, and Stripe integration than the revenue justifies.

The alternative framing is more valuable. BoltClaw is a portfolio project for someone pivoting into AppSec and AI Security. A well-made, shipped, open source AI agent security dashboard on GitHub is worth more to a hiring manager than any Pro subscription MRR. Interviewers don't ask about monetisation. They ask about threat models, detection logic, false positive handling, and architectural decisions. BoltClaw can answer all of those if it's built well. It can't answer any of them if half the dev time went into billing infrastructure.

**Decision: BoltClaw stays fully open source, MIT licensed, no paid tier, no sponsored features, no telemetry. The investment goes into making it the most defensible portfolio piece it can be.**

If a paid tool opportunity appears later, it should be a separate project with a different name and a different audience (e.g. a CLI that generates branded PDF audits for small security consultancies). That's a different product and a different conversation.

## Portfolio positioning

BoltClaw is Craig's showcase piece for the AppSec / AI Security / DevSecOps pivot. Every decision about the repo should ask "does this make it easier for a hiring manager to say yes?".

The skills BoltClaw demonstrates, in the order an interviewer cares about them:

1. **Threat modelling for a real, current problem.** AI agent security is the hottest AppSec sub-field in 2026. Shipping a tool in this space shows you understand the threat landscape, not just the fundamentals.
2. **Practical static analysis design.** Writing regex threat patterns with plain-English impact explanations, thinking about false positives, handling pattern uniqueness for scoring. This is entry-level SAST work made concrete.
3. **Secure API design.** Authentication, input validation, path traversal prevention, rate limiting, audit logging. Each of these is a distinct resume bullet when interviewed on AppSec fundamentals.
4. **Full stack TypeScript.** Express API plus React dashboard plus a shared config engine in a monorepo. Shows you can ship an end-to-end product, not just a backend.
5. **Docker hardening.** Read-only filesystem, tmpfs, non-root user, bridge network only. Shows you understand container security beyond `FROM ubuntu`.
6. **Testing strategy.** Playwright E2E plus node:test unit tests. Shows you understand the test pyramid and can write tests that would have caught real bugs (the scoreToLevel boundary fix in Round 1 is a concrete example).
7. **Documentation and positioning.** A README that leads with the story, a CLAUDE.md that onboards future contributors, a POSITIONING.md that shows market awareness. Hiring managers read these.

## Pre-showcase checklist

Things that need to happen before BoltClaw is ready to be the first link on Craig's CV.

1. **Complete the security hardening pass** - DONE (Round 1, commits through `197c0bb`).
2. **Resolve and document dependency hygiene** - DONE (`1f33f9f`, SECURITY.md added).
3. **Record a 20 to 30 second demo GIF** - Pending. Wizard, scanner, dashboard. `demo.gif` placeholder is in the README. This doubles the star rate of most dev tool repos and is the single highest-leverage remaining change.
4. **Retarget at real platforms** - Phase 1 DONE (this commit). Phase 2 (config engine rewrite) pending - needs target schema decision.
5. **Write one blog post walking through a real finding.** Scan a handful of public Claude Code skills or MCP servers from well-known GitHub repos, publish "I found these issues, here's what they mean, here's how BoltClaw surfaces them". Snyk's ToxicSkills study (36% prompt injection rate) is gift-wrapped framing for this. The post is the content that gets BoltClaw noticed and is the single best interview talking point the project can generate.
6. **Ship a v1.0.0 release on GitHub with release notes.** No one trusts a 0.x tool with their security, and no one reads a project without releases.
7. **Publish to npm as `boltclaw`** so people can `npx boltclaw` it. Docker is too much friction for the target audience.
8. **Optional: one-page landing site.** A simple Vercel deploy with screenshots, the hook, and a GitHub link. Costs nothing extra.

## What BoltClaw should never do

Even as an open source portfolio piece, a few rules keep the project credible.

- Never require a cloud account. Local-first is the whole point.
- Never scan skills server-side where the user can't see what's happening.
- Never phone home with telemetry by default. Opt-in only, with clearly labelled data.
- Never store config or audit data anywhere the user can't see and delete.
- Never ship a security fix without a test that would have caught it.
- Never present a feature that is "coming soon" in the README. Either it's shipped or it's not mentioned.

## Success metrics

For the next 90 days (the portfolio horizon, not a product horizon):

- Round 1 merged and v1.0.0 shipped
- Retargeting to real platforms complete (Round 3 Phase 1 done, Phase 2 pending)
- One published blog post with at least one real, reproducible finding
- BoltClaw included in at least one interview conversation as Craig's primary portfolio piece
- 100+ GitHub stars (a secondary signal, but a cheap proxy for "someone noticed")

Not on the list: revenue, users, subscribers, MRR, churn. Those aren't what BoltClaw is for.
