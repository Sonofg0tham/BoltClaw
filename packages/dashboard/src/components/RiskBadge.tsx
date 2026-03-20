import type { Severity } from "../types.js";

interface Config {
  bg: string;
  text: string;
  label: string;
  dot: string;
  border: string;
}

const COLORS: Record<Severity, Config> = {
  safe: {
    bg:     "rgba(20, 83, 45, 0.3)",
    text:   "#4ade80",
    label:  "Safe",
    dot:    "#22c55e",
    border: "rgba(74, 222, 128, 0.2)",
  },
  caution: {
    bg:     "rgba(113, 63, 18, 0.3)",
    text:   "#fbbf24",
    label:  "Caution",
    dot:    "#f59e0b",
    border: "rgba(251, 191, 36, 0.2)",
  },
  warning: {
    bg:     "rgba(124, 45, 18, 0.3)",
    text:   "#fb923c",
    label:  "Warning",
    dot:    "#f97316",
    border: "rgba(249, 115, 22, 0.22)",
  },
  danger: {
    bg:     "rgba(127, 29, 29, 0.35)",
    text:   "#f87171",
    label:  "Danger",
    dot:    "#ef4444",
    border: "rgba(220, 38, 38, 0.28)",
  },
};

interface RiskBadgeProps {
  severity: Severity;
  className?: string;
}

export function RiskBadge({ severity, className = "" }: RiskBadgeProps) {
  const c = COLORS[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}
      style={{
        background:  c.bg,
        color:       c.text,
        border:      `1px solid ${c.border}`,
        letterSpacing: "0.02em",
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: c.dot, boxShadow: `0 0 5px ${c.dot}` }}
      />
      {c.label}
    </span>
  );
}
