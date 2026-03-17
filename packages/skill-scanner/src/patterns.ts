export type Severity = "safe" | "caution" | "warning" | "danger";

export interface ThreatPattern {
  id: string;
  name: string;
  description: string;
  impact: string;
  severity: Severity;
  pattern: RegExp;
  category: "exfiltration" | "injection" | "obfuscation" | "permissions" | "filesystem" | "execution";
}

export const THREAT_PATTERNS: ThreatPattern[] = [
  // Exfiltration
  {
    id: "exfil-curl",
    name: "curl/wget call",
    description: "Detected a command that sends data to an external server.",
    impact: "This skill could silently send your private files, passwords, or conversation history to someone else's server. The curl command piped to bash also means it runs whatever code the remote server sends — which could change at any time.",
    severity: "danger",
    pattern: /\b(curl|wget)\s+.*https?:\/\//gi,
    category: "exfiltration",
  },
  {
    id: "exfil-fetch",
    name: "fetch/HTTP request",
    description: "Makes an outbound HTTP request that could exfiltrate data.",
    impact: "This skill makes network requests that could send your data to an external server. Unlike curl, fetch is common in legitimate code too — check whether the URLs it contacts are expected.",
    severity: "warning",
    pattern: /\b(fetch|axios|http\.request|https\.request)\s*\(/gi,
    category: "exfiltration",
  },
  {
    id: "exfil-webhook",
    name: "Webhook URL",
    description: "Contains a webhook URL that could receive exfiltrated data.",
    impact: "Webhooks are one-way data pipes to an external service. This skill could send your files, messages, or agent activity to someone without you knowing.",
    severity: "danger",
    pattern: /https?:\/\/[^\s]*webhook[^\s]*/gi,
    category: "exfiltration",
  },

  // Prompt injection
  {
    id: "injection-ignore",
    name: "Instruction override",
    description: "Attempts to override the agent's instructions.",
    impact: "This tries to make your AI agent forget its safety rules. If it works, the agent could be tricked into running dangerous commands or leaking private data.",
    severity: "danger",
    pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|constraints)/gi,
    category: "injection",
  },
  {
    id: "injection-system",
    name: "System prompt manipulation",
    description: "Attempts to manipulate the system prompt.",
    impact: "This attempts to rewrite your agent's core instructions. A successful attack could turn your agent into a tool that works for an attacker instead of you.",
    severity: "danger",
    pattern: /\b(system\s*prompt|you\s+are\s+now|new\s+instructions|act\s+as\s+if)\b/gi,
    category: "injection",
  },
  {
    id: "injection-roleplay",
    name: "Role override",
    description: "Attempts to force the agent into a new role.",
    impact: "This tries to trick your agent into behaving differently than intended. It's a softer form of prompt injection — less likely to succeed but still a red flag.",
    severity: "warning",
    pattern: /\b(pretend\s+you|roleplay\s+as|you\s+must\s+now|from\s+now\s+on\s+you)\b/gi,
    category: "injection",
  },

  // Obfuscation
  {
    id: "obfusc-base64",
    name: "Base64 encoded content",
    description: "Contains base64-encoded strings that may hide malicious content.",
    impact: "Base64 encoding hides text so you can't read it directly. Legitimate skills rarely need this — it's often used to sneak malicious commands past reviews.",
    severity: "warning",
    pattern: /[A-Za-z0-9+/]{40,}={0,2}/g,
    category: "obfuscation",
  },
  {
    id: "obfusc-eval",
    name: "Dynamic code execution",
    description: "Uses eval() or similar to execute dynamic code.",
    impact: "eval() runs code that's built on the fly, which means it could execute anything — including commands the skill author didn't show you. This is one of the most dangerous patterns in code.",
    severity: "danger",
    pattern: /\b(eval|exec|Function)\s*\(/gi,
    category: "obfuscation",
  },
  {
    id: "obfusc-hex",
    name: "Hex-encoded strings",
    description: "Contains hex escape sequences that may obfuscate intent.",
    impact: "Hex encoding can hide the true content of strings. While sometimes used for binary data, in skill files it may be obscuring URLs or commands.",
    severity: "caution",
    pattern: /(\\x[0-9a-fA-F]{2}){4,}/g,
    category: "obfuscation",
  },

  // Excessive permissions
  {
    id: "perm-sudo",
    name: "Privilege escalation",
    description: "Requests elevated privileges (sudo/admin).",
    impact: "This skill tries to run commands with admin/root access. With elevated privileges, it could install software, change system settings, or access any file on your machine.",
    severity: "danger",
    pattern: /\b(sudo|runas|chmod\s+777|chmod\s+\+x)\b/gi,
    category: "permissions",
  },
  {
    id: "perm-env",
    name: "Environment variable access",
    description: "Reads environment variables that may contain secrets.",
    impact: "Environment variables often store API keys, tokens, and passwords. This skill could read those secrets and potentially send them elsewhere.",
    severity: "warning",
    pattern: /\b(process\.env|os\.environ|\$\{?\w*KEY\w*\}?|\$\{?\w*SECRET\w*\}?|\$\{?\w*TOKEN\w*\}?)/gi,
    category: "permissions",
  },

  // Filesystem
  {
    id: "fs-sensitive",
    name: "Sensitive file access",
    description: "Accesses sensitive files or directories.",
    impact: "This skill tries to access files that contain passwords, SSH keys, or cloud credentials. If combined with network access, those secrets could be sent to an attacker.",
    severity: "danger",
    pattern: /\b(\/etc\/passwd|\/etc\/shadow|~\/\.ssh|~\/\.aws|~\/\.env|\.git\/config)\b/gi,
    category: "filesystem",
  },
  {
    id: "fs-write",
    name: "File write operations",
    description: "Writes or appends to files on the filesystem.",
    impact: "This skill writes to your filesystem. While some skills legitimately need this, a malicious skill could modify your config files, plant backdoors, or overwrite important data.",
    severity: "caution",
    pattern: /\b(writeFile|appendFile|fs\.write|>>|>\s*\/)/gi,
    category: "filesystem",
  },

  // NanoClaw-specific: container escape
  {
    id: "nanoclaw-container-escape",
    name: "Container escape attempt",
    description: "Commands that attempt to break out of container isolation — the core security boundary in NanoClaw.",
    impact: "This tries to break out of NanoClaw's Docker sandbox — the main security boundary keeping skills isolated. If successful, the skill gets full access to your host machine.",
    severity: "danger",
    pattern: /\b(mount\s+-[a-z]*\s|nsenter|chroot|docker\.sock|--privileged)\b|\/proc\/self\//gi,
    category: "execution",
  },

  // NanoClaw-specific: SDK abuse
  {
    id: "nanoclaw-sdk-abuse",
    name: "Agent SDK misuse",
    description: "Attempts to manipulate the Anthropic Agent SDK to bypass safety controls.",
    impact: "This tries to tamper with the AI agent's SDK controls. If it works, the skill could bypass safety restrictions that are meant to limit what the agent can do.",
    severity: "warning",
    pattern: /\b(agent\.override|system_prompt\s*[=:]|tool_override)\b/gi,
    category: "injection",
  },
];
