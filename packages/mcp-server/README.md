# BoltClaw

Security control panel for OpenClaw, NanoClaw, and NemoClaw AI agents - delivered as an MCP server.

BoltClaw hardens your agent config, scans skills for threats before installation, and gives you visibility into what your AI agent can access. No cloud dependencies.

## Setup

Requires Node.js 22+.

### Claude Code

```bash
claude mcp add-json boltclaw '{"type":"stdio","command":"npx","args":["-y","boltclaw"]}'
```

### Claude Desktop

Add to your config file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "boltclaw": {
      "command": "npx",
      "args": ["-y", "boltclaw"]
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "servers": {
    "boltclaw": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "boltclaw"]
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "boltclaw": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "boltclaw"]
    }
  }
}
```

### VS Code (Copilot)

Add to your VS Code MCP settings:

```json
{
  "servers": {
    "boltclaw": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "boltclaw"]
    }
  }
}
```

### Codex CLI / IDE

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.boltclaw]
command = "npx"
args = ["-y", "boltclaw"]
```

### Gemini CLI

Add to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "boltclaw": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "boltclaw"]
    }
  }
}
```

### Run directly

```bash
npx boltclaw
```

## Tools

BoltClaw exposes 7 MCP tools:

### `scan_skill`

Scan a skill for security threats before installation. Checks for 15 threat patterns across 6 categories: exfiltration, injection, obfuscation, permissions, filesystem, and execution. Each finding includes a plain-English explanation of why it matters.

### `scan_installed_skills`

Audit all skills currently installed in OpenClaw, both bundled and user-installed. Auto-detects skill directories. Use this to check what's already running, not just new skills.

### `get_security_config`

Read your current OpenClaw + BoltClaw configuration. Returns the security score (A-F grade), permission levels, sandbox mode, gateway binding, and any findings.

### `set_security_config`

Update specific security settings. Supports shell, filesystem, browser, and network permission levels, agent sandbox mode, and gateway bind address. Automatically backs up your config before writing.

### `apply_security_profile`

Apply a pre-built security profile in one step:

- **Lockdown** - maximum security, all permissions denied
- **Balanced** - sensible defaults for most users
- **Developer** - permissive settings for dev work
- **Migrate** - minimal config for NanoClaw migration

### `list_backups`

List all available config backups. BoltClaw creates automatic backups before every config change.

### `restore_backup`

Restore your config from any backup. The current config is backed up first, so restores are always reversible.

## How It Works

BoltClaw manages two files:

- `openclaw.json` - your real OpenClaw config (validated against the official schema)
- `boltclaw.json` - a sidecar file for BoltClaw-specific settings like permission levels and messaging allowlists

Every config change creates an automatic backup. All changes are reversible.

## Supported Platforms

- **OpenClaw** - config hardening, skill scanning, permission management
- **NanoClaw** - skill scanning (same SKILL.md format), config management
- **NemoClaw** - complements NemoClaw's runtime sandboxing with config hardening and skill scanning

## Links

- [GitHub](https://github.com/Sonofg0tham/BoltClaw)
- [Dashboard](https://github.com/Sonofg0tham/BoltClaw/tree/main/packages/dashboard) - web UI with setup wizard, permission grid, and audit log

## Licence

MIT
