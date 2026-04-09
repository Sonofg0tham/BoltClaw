# BoltClaw Positioning and Monetisation

_Last updated: 2026-04-09_

This doc captures where BoltClaw sits in the market, who it's for, and how it could be monetised without burning the open-source community that gives it credibility. It's a living doc, not a pitch deck.

## One-line pitch

BoltClaw is the visual security control panel for AI agents. It's what Little Snitch is to macOS firewalls, or 1Password is to password files: the friendly front door for a piece of security infrastructure that's otherwise CLI-only and expert-only.

## Who it's for

Three concentric rings, tightest to widest.

1. **Non-expert OpenClaw/NanoClaw users who've heard agents can be dangerous and want a way to see what theirs can actually do.** This is the emotional core. They're not going to read a YAML schema. They want a dashboard with toggles and a score.
2. **Developers evaluating claw platforms who need a fast way to audit third-party skills before they install them.** The skill scanner is the hook for this group.
3. **Small teams and solo consultants who need to show a client or a compliance reviewer that "yes, we checked".** The audit log and exportable reports are the hook for this group.

Notice who it's _not_ for: large enterprises with an AppSec team. They'll use SecureClaw's 55 OWASP checks or roll their own. That's fine. Don't chase them.

## Competitive map

| Tool | What it is | What it lacks | BoltClaw's angle |
|---|---|---|---|
| SecureClaw (Adversa AI) | 55 OWASP-mapped audit checks as a plugin/skill | No UI, CLI-only, expert-focused | BoltClaw is the UI your team can actually use |
| openclaw-security-monitor | 48-point scanner with IOC feeds and threat intel | Detection-first, no config hardening, no guided setup | BoltClaw is prevention-first |
| NemoClaw (Nvidia) | Runtime sandboxing and privacy router | No config management, no UI | BoltClaw complements it |
| NanoClaw | Container-isolated OpenClaw alternative | Great for new setups, useless for existing OpenClaw users | BoltClaw helps the 250k+ existing users |

The unique slot BoltClaw owns: **visual, cross-platform, prevention-first, for non-experts**. No other tool in the space sits in all four of those cells.

## The "why it matters" hook

The README buries this. It should lead with it.

> In 2025, researchers found 40,000+ publicly exposed OpenClaw instances running on default settings. When those agents connected to the Moltbook social network, they were exploited for mass impersonation, prompt injection, and actions their owners never authorised. BoltClaw exists so that never happens to you.

That's the cold open. Everything else (features, architecture, tech stack) should come after it.

## Monetisation options

BoltClaw's credibility depends on its open-source core staying open. Anything that gates the skill scanner or the permission dashboard behind a paywall will kill the GitHub stars that drive discovery. So the model has to be: **open core, paid features around it**.

### Option 1: Open core with BoltClaw Pro (recommended)

Keep the dashboard, scanner, config engine, and audit log fully free and open. Monetise three things non-experts and small teams would actually pay for:

1. **Threat pattern updates as a subscription.** Today the 15+ threat patterns are hardcoded and ship with the release. For a security tool, that's a cold-start problem. A BoltClaw Pro subscription unlocks a live threat feed: new patterns pushed weekly based on real exploits seen in the wild. Free users get patterns baked into the release; Pro users get updates between releases. Target price: 9 to 15 GBP/month for individuals, 49 GBP/month for teams.
2. **Exportable compliance reports.** A paid "Export PDF report" button that generates a branded, signed PDF showing the current security score, all findings, audit log history, and skill scan results. Small consultancies and solo devs will pay for this because they can hand it to a client and say "here, we audited it". Target price: one-off at 19 GBP per report or bundled into Pro.
3. **Cloud sync and team dashboard.** Multi-machine config sync, shared audit log, a lightweight team view of all agents across a small team. This is the Tailscale model: open-source node, paid coordination. Target price: 5 GBP/user/month.

Revenue projection: if BoltClaw gets 2,000 free users and 2% convert to Pro at 12 GBP/month, that's 480 GBP/month recurring. Not life-changing, but a proof point for Craig's portfolio and a real income stream that grows with GitHub adoption.

### Option 2: One-off paid tools built on BoltClaw

Instead of a subscription, ship a "BoltClaw for Consultants" CLI that takes a client's agent config, runs a full audit, and produces a branded PDF and spreadsheet for 29 GBP per run. No recurring billing, no auth, no servers. This fits Craig's "one-off paid tools I can earn income from" goal stated in his preferences. Lower ceiling but near-zero ops burden.

### Option 3: Sponsored hardening packs

Claw platforms (NanoClaw, NemoClaw) might pay to have their platform's hardening profile shipped as a first-class option in the Setup Wizard. This is how Mullvad and ProtonVPN appear as first-class options in router firmware. Revenue is small but validates the tool and funds development.

### Option 4: GitHub Sponsors plus Pro combined

Run GitHub Sponsors for people who want to support the free version, and a separate Pro tier for people who want the extras. This is the Excalidraw/Obsidian model. Low friction, multiple revenue streams.

**Recommendation:** start with Option 1 feature 2 (exportable PDF reports) as the first paid surface. It's self-contained, doesn't require running a backend, doesn't need auth infrastructure, and it's the feature small consultants will actually pay for. Use Gumroad or Lemon Squeezy for billing so there's no Stripe integration to build. Add threat feed and team sync later if traction justifies it.

## What needs to happen before BoltClaw can charge money

In rough priority order:

1. **Fix the security holes in the dashboard itself.** A security tool with no auth on its API and weak path validation on the scanner is a liability. See `FIXES_ROUND_1.md`.
2. **Add a demo GIF to the README.** This is free and doubles the "star rate" of most dev tool repos.
3. **Move the "40,000+ exposed instances" hook to the top of the README.**
4. **Add unit tests for the scorer and analyzer.** Today the claim is "21 Playwright tests". That's E2E. For a security tool, the scoring logic and threat detection need unit tests so regressions are obvious.
5. **Ship a v1.0.0 release on GitHub with release notes.** Right now it's v0.1.0 in package.json. No one trusts a 0.x tool with their security.
6. **Publish to npm under `@boltclaw/dashboard` so people can `npx boltclaw` it.** Docker is friction for non-experts.
7. **Set up a landing page.** Even a one-page Vercel deploy explaining what it does, with screenshots and a "Get Pro" button. This is where paid tiers convert.
8. **Write 2 or 3 blog posts** on "how I found a malicious OpenClaw skill" or "walking through the 40k exposed instances story". This is the GitHub star multiplier.

## What BoltClaw should never do

- Require a BoltClaw cloud account to use the core features. Local-first is the whole point.
- Scan skills server-side where the user can't see what's happening. The scanner must stay local.
- Phone home with telemetry by default. Opt-in only, and only for anonymised threat pattern hits.
- Store config or audit data anywhere the user can't see and delete. Trust is the product.

## Success metrics

For the next 90 days:

- 500+ GitHub stars (currently unknown, check before committing to this number)
- 10+ skill scan results shared publicly by users as validation
- 1 paid customer (even at 19 GBP) to prove the pricing works
- 1 mention in a claw-ecosystem newsletter or podcast
