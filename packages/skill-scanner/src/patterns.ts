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
    pattern: /(?:atob|btoa|base64[_-]?(?:decode|encode)|Buffer\.from)\s*\(.*[A-Za-z0-9+/]{20,}={0,2}/gi,
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

  // Python-specific patterns
  {
    id: "py-http-request",
    name: "Python HTTP request",
    description: "Makes outbound HTTP requests using Python's requests, urllib, or httpx libraries.",
    impact: "This skill makes network requests that could send your data to an external server. Python HTTP libraries are the equivalent of fetch() in JavaScript — common in legitimate code, but worth checking which URLs it contacts.",
    severity: "warning",
    pattern: /\b(requests\.(get|post|put|delete|patch|head)|urllib\.request\.(urlopen|urlretrieve)|httpx\.(get|post|put|delete|AsyncClient))\s*\(/gi,
    category: "exfiltration",
  },
  {
    id: "py-subprocess",
    name: "Python shell execution",
    description: "Executes shell commands directly from Python code.",
    impact: "This skill can run arbitrary shell commands on your machine. Subprocess calls are one of the most dangerous patterns in a skill — they can install software, delete files, or exfiltrate data through the shell.",
    severity: "danger",
    pattern: /\b(subprocess\.(run|call|Popen|check_output|check_call)|os\.(system|popen|execv|execve|execl|spawnl))\s*\(/gi,
    category: "execution",
  },
  {
    id: "py-file-write",
    name: "Python file write",
    description: "Opens files for writing or appending in Python.",
    impact: "This skill writes to your filesystem. While some skills legitimately need this (saving results, logs), a malicious skill could overwrite config files, plant backdoors, or log sensitive data to disk.",
    severity: "caution",
    pattern: /\bopen\s*\([^)]*,\s*['"](?:w|a|wb|ab|w\+|a\+)['"]/gi,
    category: "filesystem",
  },
  {
    id: "captcha-bypass",
    name: "Captcha bypass service",
    description: "References a third-party captcha-solving service to defeat bot detection.",
    impact: "This skill uses a paid service to bypass captcha challenges on websites. This violates the terms of service of most platforms and could get your accounts banned or flagged for suspicious activity.",
    severity: "warning",
    pattern: /\b(2captcha|anticaptcha|anti-captcha|capmonster|deathbycaptcha|nopecha)\b/gi,
    category: "execution",
  },
  {
    id: "proxy-anonymisation",
    name: "Proxy or anonymisation",
    description: "Uses proxy services to hide the origin of requests.",
    impact: "This skill routes traffic through proxy servers to avoid detection or rate limiting. While sometimes legitimate, it can be used to hide the skill's activity from the platforms it accesses.",
    severity: "caution",
    pattern: /\b(residential.{0,10}prox|rotating.{0,10}prox|proxy.{0,10}pool|socks5?:\/\/)\b/gi,
    category: "exfiltration",
  },
  {
    id: "browser-automation",
    name: "Browser automation",
    description: "Uses automated browser control (Selenium, Playwright, Puppeteer) to interact with websites.",
    impact: "This skill controls a real browser to click, fill forms, and submit data on your behalf. This is common in job-apply and scraping skills — check that it only visits sites you expect and cannot submit forms without your confirmation.",
    severity: "caution",
    pattern: /\b(selenium|webdriver|playwright|puppeteer|chromium\.launch|firefox\.launch|webkit\.launch)\b/gi,
    category: "execution",
  },

  // Claude Code / MCP: prompt injection via tool output
  {
    id: "mcp-tool-output-injection",
    name: "Tool output prompt injection",
    description: "Embeds instruction-override text in tool output that gets fed back to the agent.",
    impact: "This is indirect prompt injection: the skill returns text designed to hijack the agent's next action. When the agent reads the tool result, it may follow the attacker's instructions instead of yours — silently changing what it does next.",
    severity: "danger",
    pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|constraints?)|you\s+are\s+now\s+in|new\s+instructions?:/gi,
    category: "injection",
  },

  // Claude Code / MCP: manifest mismatch (tool does more than it declares)
  {
    id: "mcp-manifest-mismatch",
    name: "Undeclared capability",
    description: "Code does something not mentioned in the tool's name or description — a classic sign of a deceptive MCP server.",
    impact: "MCP servers declare what they do in a manifest. A server that reads files, makes network calls, or runs shell commands without declaring it is either poorly written or deliberately hiding its behaviour. Either way, you can't trust what it does with your data.",
    severity: "warning",
    pattern: /\b(readFileSync|readFile|execSync|exec|spawnSync|spawn|fetch|axios)\s*\((?![^)]*\/\*\s*declared)/gi,
    category: "permissions",
  },
];
