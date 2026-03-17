import type { Severity } from "../types.js";

const COLORS: Record<Severity, { bg: string; text: string; label: string }> = {
  safe:    { bg: "bg-green-900/50",  text: "text-green-400",  label: "Safe" },
  caution: { bg: "bg-yellow-900/50", text: "text-yellow-400", label: "Caution" },
  warning: { bg: "bg-orange-900/50", text: "text-orange-400", label: "Warning" },
  danger:  { bg: "bg-red-900/50",    text: "text-red-400",    label: "Danger" },
};

interface RiskBadgeProps {
  severity: Severity;
  className?: string;
}

export function RiskBadge({ severity, className = "" }: RiskBadgeProps) {
  const c = COLORS[severity];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text} ${className}`}
    >
      {c.label}
    </span>
  );
}
