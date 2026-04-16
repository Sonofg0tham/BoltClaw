import { useState, useEffect } from "react";
import { apiFetch } from "../api.js";
import type { AuditEvent } from "../types.js";

type SeverityFilter = "all" | "info" | "warning" | "danger";

const ACTION_STYLES: Record<AuditEvent["action"], { label: string; bg: string; color: string; border: string }> = {
  config_read:    { label: "Config Read",   bg: "rgba(30,64,175,0.25)",  color: "#93c5fd", border: "rgba(96,165,250,0.25)"  },
  config_write:   { label: "Config Write",  bg: "rgba(113,63,18,0.25)",  color: "#fcd34d", border: "rgba(251,191,36,0.25)"  },
  config_restore: { label: "Restore",        bg: "rgba(88,28,135,0.25)", color: "#d8b4fe", border: "rgba(192,132,252,0.25)" },
  scan:           { label: "Scan",           bg: "rgba(20,83,45,0.25)",  color: "#86efac", border: "rgba(74,222,128,0.25)"  },
  profile_apply:  { label: "Profile",        bg: "rgba(22,78,99,0.25)",  color: "#67e8f9", border: "rgba(103,232,249,0.25)" },
};

const LEFT_BORDER: Record<AuditEvent["severity"], string> = {
  info:    "#22c55e",
  warning: "#f59e0b",
  danger:  "#ef4444",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month:   "short",
    day:     "numeric",
    hour:    "numeric",
    minute:  "2-digit",
    hour12:  true,
  });
}

const FILTER_STYLES: Record<SeverityFilter, { active: string; dot: string }> = {
  all:     { active: "rgba(255,255,255,0.1)",    dot: "#94a3b8" },
  info:    { active: "rgba(20,83,45,0.4)",        dot: "#22c55e" },
  warning: { active: "rgba(113,63,18,0.4)",       dot: "#f59e0b" },
  danger:  { active: "rgba(127,29,29,0.4)",       dot: "#ef4444" },
};

export function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filter, setFilter] = useState<SeverityFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchEvents() {
    try {
      const res = await apiFetch("/api/audit");
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error("Failed to fetch audit events:", err);
    } finally {
      setLoading(false);
    }
  }

  async function clearLog() {
    try {
      await apiFetch("/api/audit", { method: "DELETE" });
      setEvents([]);
    } catch (err) {
      console.error("Failed to clear audit log:", err);
    }
  }

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = events
    .filter((e) => filter === "all" || e.severity === filter)
    .filter((e) => !search || e.summary.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade-in">
      {/* ─── Header row ──────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 mb-1">Audit Log</h2>
          <p className="text-slate-500 text-sm">Every config change, skill scan, and backup restore is logged here.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live refresh indicator */}
          <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: "#334155" }}>
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "#22c55e", boxShadow: "0 0 5px rgba(34,197,94,0.5)" }}
            />
            auto-refresh 10s
          </div>
          <button onClick={clearLog} className="btn-ghost text-xs">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            Clear Log
          </button>
        </div>
      </div>

      {/* ─── Filters ─────────────────────────────────────── */}
      <div className="flex gap-3 mt-6 mb-6 flex-wrap">
        <div
          className="flex rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(7,12,20,0.4)" }}
        >
          {(["all", "info", "warning", "danger"] as SeverityFilter[]).map((sev) => {
            const s = FILTER_STYLES[sev];
            return (
              <button
                key={sev}
                onClick={() => setFilter(sev)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all duration-150"
                style={
                  filter === sev
                    ? { background: s.active, color: "#e2e8f0" }
                    : { color: "#475569" }
                }
              >
                {sev !== "all" && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: s.dot }}
                  />
                )}
                {sev === "all" ? "All" : sev.charAt(0).toUpperCase() + sev.slice(1)}
              </button>
            );
          })}
        </div>

        <div className="flex-1 relative min-w-[200px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#334155"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events…"
            className="input-dark pl-9"
            style={{ padding: "8px 12px 8px 36px" }}
          />
        </div>
      </div>

      {/* ─── Event list ──────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div
            className="w-10 h-10 rounded-full border-2 animate-spin mb-3"
            style={{ borderColor: "rgba(220,38,38,0.15)", borderTopColor: "#dc2626" }}
          />
          <p className="text-slate-600 text-sm">Loading events…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <p className="text-slate-500 font-medium mb-1">
            {events.length === 0 ? "No events yet" : "No matching events"}
          </p>
          <p className="text-sm text-slate-600">
            {events.length === 0
              ? "Events appear here as you use BoltClaw — try scanning a skill or changing config."
              : "Try adjusting your filters or search."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((event) => {
            const st = ACTION_STYLES[event.action];
            const lbColor = LEFT_BORDER[event.severity];
            return (
              <div
                key={event.id}
                className="rounded-2xl overflow-hidden transition-all duration-200"
                style={{
                  background:      "rgba(13,21,38,0.7)",
                  border:          "1px solid rgba(255,255,255,0.07)",
                  borderLeftWidth: "3px",
                  borderLeftColor: lbColor,
                  backdropFilter:  "blur(8px)",
                }}
              >
                <div className="flex items-center gap-3 flex-wrap px-4 py-3.5">
                  <span className="text-xs font-mono shrink-0" style={{ color: "#334155", minWidth: 130 }}>
                    {formatTime(event.timestamp)}
                  </span>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0"
                    style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                  >
                    {st.label}
                  </span>
                  <span className="text-sm text-slate-300 flex-1">{event.summary}</span>
                  {event.details && (
                    <button
                      onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                      className="shrink-0 flex items-center gap-1 text-xs transition-colors"
                      style={{ color: "#475569" }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="transition-transform"
                        style={{ transform: expandedId === event.id ? "rotate(180deg)" : "none" }}
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                      {expandedId === event.id ? "Hide" : "Details"}
                    </button>
                  )}
                </div>

                {expandedId === event.id && event.details && (
                  <div className="px-4 pb-4">
                    <pre
                      className="text-xs font-mono rounded-xl p-3 overflow-x-auto leading-relaxed"
                      style={{
                        background: "rgba(7,12,20,0.8)",
                        border:     "1px solid rgba(255,255,255,0.05)",
                        color:      "#64748b",
                      }}
                    >
                      {JSON.stringify(event.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Count ───────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="mt-5 text-xs text-center font-mono" style={{ color: "#1e293b" }}>
          Showing {filtered.length} of {events.length} event(s)
        </div>
      )}
    </div>
  );
}
