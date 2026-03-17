import { useState } from "react";
import { RiskBadge } from "./RiskBadge.js";
import type { Severity, PermissionLevel } from "../types.js";

interface PermissionToggleProps {
  label: string;
  description: string;
  riskWhenAllowed: Severity;
  whatBreaksWhenDenied: string;
  value: PermissionLevel;
  onChange: (value: PermissionLevel) => void;
}

const LEVELS: PermissionLevel[] = ["deny", "ask", "allow"];

const LEVEL_COLORS: Record<PermissionLevel, string> = {
  deny: "bg-green-600",
  ask: "bg-yellow-600",
  allow: "bg-red-600",
};

export function PermissionToggle({
  label,
  description,
  riskWhenAllowed,
  whatBreaksWhenDenied,
  value,
  onChange,
}: PermissionToggleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-100">{label}</span>
            <RiskBadge severity={value === "deny" ? "safe" : value === "ask" ? "caution" : riskWhenAllowed} />
          </div>
          <p className="text-sm text-slate-400 mt-1">{description}</p>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-slate-600 shrink-0">
          {LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => onChange(level)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                value === level
                  ? `${LEVEL_COLORS[level]} text-white`
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        {expanded ? "Hide details \u25B2" : "What breaks if denied? \u25BC"}
      </button>
      {expanded && (
        <p className="mt-2 text-xs text-slate-500 bg-slate-800/50 rounded p-2 border border-slate-700">
          {whatBreaksWhenDenied}
        </p>
      )}
    </div>
  );
}
