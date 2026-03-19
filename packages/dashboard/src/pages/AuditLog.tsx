import { useState, useEffect } from "react";
import type { AuditEvent } from "../types.js";

type SeverityFilter = "all" | "info" | "warning" | "danger";

const ACTION_LABELS: Record<AuditEvent["action"], { label: string; color: string }> = {
  config_read: { label: "Config Read", color: "bg-blue-900/50 text-blue-300 border-blue-700" },
  config_write: { label: "Config Write", color: "bg-amber-900/50 text-amber-300 border-amber-700" },
  config_restore: { label: "Restore", color: "bg-purple-900/50 text-purple-300 border-purple-700" },
  scan: { label: "Scan", color: "bg-green-900/50 text-green-300 border-green-700" },
  profile_apply: { label: "Profile", color: "bg-cyan-900/50 text-cyan-300 border-cyan-700" },
};

const SEVERITY_COLORS: Record<AuditEvent["severity"], string> = {
  info: "border-l-green-500",
  warning: "border-l-amber-500",
  danger: "border-l-red-500",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filter, setFilter] = useState<SeverityFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchEvents() {
    try {
      const res = await fetch("/api/audit");
      const data = await res.json();
      setEvents(data.events || []);
    } catch {
      // silently fail — events will load on next poll
    } finally {
      setLoading(false);
    }
  }

  async function clearLog() {
    try {
      await fetch("/api/audit", { method: "DELETE" });
      setEvents([]);
    } catch {
      // ignore
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
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold">Audit Log</h2>
        <button
          onClick={clearLog}
          className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
        >
          Clear Log
        </button>
      </div>
      <p className="text-slate-400 mb-6 text-sm">
        Every config change, skill scan, and backup restore is logged here.
      </p>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="flex gap-1">
          {(["all", "info", "warning", "danger"] as SeverityFilter[]).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilter(sev)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === sev
                  ? sev === "all"
                    ? "bg-slate-700 text-slate-100"
                    : sev === "info"
                    ? "bg-green-900/50 text-green-300"
                    : sev === "warning"
                    ? "bg-amber-900/50 text-amber-300"
                    : "bg-red-900/50 text-red-300"
                  : "bg-slate-800/50 text-slate-500 hover:text-slate-300"
              }`}
            >
              {sev === "all" ? "All" : sev.charAt(0).toUpperCase() + sev.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events..."
          className="flex-1 min-w-[200px] bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-green-600"
        />
      </div>

      {/* Event list */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading events...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">{"📋"}</div>
          <p className="text-slate-400 font-medium">
            {events.length === 0 ? "No events yet" : "No matching events"}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {events.length === 0
              ? "Events will appear here as you use ClawGuard — try scanning a skill or changing config."
              : "Try adjusting your filters or search."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((event) => (
            <div
              key={event.id}
              className={`bg-slate-900 border border-slate-800 border-l-4 ${SEVERITY_COLORS[event.severity]} rounded-lg p-4`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-slate-500 font-mono min-w-[140px]">
                  {formatTime(event.timestamp)}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${ACTION_LABELS[event.action].color}`}
                >
                  {ACTION_LABELS[event.action].label}
                </span>
                <span className="text-sm text-slate-200 flex-1">{event.summary}</span>
                {event.details && (
                  <button
                    onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {expandedId === event.id ? "Hide" : "Details"}
                  </button>
                )}
              </div>
              {expandedId === event.id && event.details && (
                <pre className="mt-3 text-xs font-mono bg-slate-950 border border-slate-800 rounded p-3 text-slate-400 overflow-x-auto">
                  {JSON.stringify(event.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Event count */}
      {filtered.length > 0 && (
        <div className="mt-4 text-xs text-slate-600 text-center">
          Showing {filtered.length} of {events.length} event(s)
        </div>
      )}
    </div>
  );
}
