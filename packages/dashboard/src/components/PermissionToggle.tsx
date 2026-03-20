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

const LEVEL_STYLE: Record<PermissionLevel, { active: string; label: string }> = {
  deny:  { active: "background: rgba(20,83,45,0.5); color: #4ade80; border-color: rgba(74,222,128,0.3);",  label: "Deny"  },
  ask:   { active: "background: rgba(113,63,18,0.5); color: #fbbf24; border-color: rgba(251,191,36,0.3);", label: "Ask"   },
  allow: { active: "background: rgba(127,29,29,0.5); color: #f87171; border-color: rgba(239,68,68,0.3);",  label: "Allow" },
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
    <div
      className="perm-card rounded-2xl p-5"
      style={{
        background: "rgba(13,21,38,0.6)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Label & description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="font-semibold text-slate-100 text-sm">{label}</span>
            <RiskBadge
              severity={value === "deny" ? "safe" : value === "ask" ? "caution" : riskWhenAllowed}
            />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
        </div>

        {/* 3-way toggle */}
        <div
          className="flex rounded-xl overflow-hidden shrink-0"
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(7,12,20,0.6)",
          }}
        >
          {LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => onChange(level)}
              className="px-3 py-1.5 text-xs font-medium capitalize transition-all duration-150"
              style={
                value === level
                  ? {
                      ...Object.fromEntries(
                        LEVEL_STYLE[level].active.split(";")
                          .filter(Boolean)
                          .map((s) => {
                            const [k, v] = s.split(":").map((p) => p.trim());
                            const camelKey = k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
                            return [camelKey, v];
                          })
                      ),
                      fontWeight: 600,
                    }
                  : { color: "#475569" }
              }
            >
              {LEVEL_STYLE[level].label}
            </button>
          ))}
        </div>
      </div>

      {/* Expand what-breaks */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 flex items-center gap-1 text-xs transition-colors"
        style={{ color: expanded ? "#94a3b8" : "#475569" }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="transition-transform duration-200"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {expanded ? "Hide details" : "What breaks if denied?"}
      </button>

      {expanded && (
        <p
          className="mt-2 text-xs leading-relaxed rounded-xl px-3 py-2.5 animate-fade-in"
          style={{
            color:      "#64748b",
            background: "rgba(7,12,20,0.5)",
            border:     "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {whatBreaksWhenDenied}
        </p>
      )}
    </div>
  );
}
