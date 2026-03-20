import { useState } from "react";
import { SetupWizard } from "./pages/SetupWizard.js";
import { PermissionDashboard } from "./pages/PermissionDashboard.js";
import { SkillScanner } from "./pages/SkillScanner.js";
import { AuditLog } from "./pages/AuditLog.js";
import { ClawGuardLogo } from "./components/ClawGuardLogo.js";

const TABS = [
  {
    id: "wizard",
    label: "Setup Wizard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    id: "dashboard",
    label: "Permissions",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    id: "scanner",
    label: "Skill Scanner",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ),
  },
  {
    id: "audit",
    label: "Audit Log",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function App() {
  const [tab, setTab] = useState<TabId>("wizard");

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          background: "rgba(7, 12, 20, 0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          backgroundImage: "linear-gradient(90deg, rgba(220,38,38,0.07) 0%, transparent 50%)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <a href="#" className="flex items-center gap-3 group" onClick={(e) => e.preventDefault()}>
            <div
              className="relative flex-shrink-0"
              style={{
                filter: "drop-shadow(0 0 8px rgba(220,38,38,0.5))",
                transition: "filter 0.2s ease",
              }}
            >
              <ClawGuardLogo size={36} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-[17px] tracking-tight text-slate-100">
                Claw<span style={{ color: "#dc2626" }}>Guard</span>
              </span>
              <span
                className="text-[10px] font-mono tracking-widest uppercase mt-0.5"
                style={{ color: "rgba(220,38,38,0.7)", letterSpacing: "0.12em" }}
              >
                Security Control Panel
              </span>
            </div>
            <span
              className="text-xs font-mono ml-1 px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(220,38,38,0.1)",
                border: "1px solid rgba(220,38,38,0.2)",
                color: "rgba(220,38,38,0.8)",
                fontSize: "10px",
              }}
            >
              v0.1
            </span>
          </a>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`nav-tab ${tab === t.id ? "active" : ""}`}
                style={{ fontSize: "13px" }}
              >
                <span className="opacity-80">{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </nav>

          {/* Status indicator */}
          <div
            className="hidden md:flex items-center gap-2 text-xs font-mono"
            style={{ color: "#64748b" }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full animate-pulse"
              style={{ background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.6)" }}
            />
            <span style={{ color: "#4ade80" }}>Live</span>
          </div>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 animate-fade-in">
        {tab === "wizard"    && <SetupWizard />}
        {tab === "dashboard" && <PermissionDashboard />}
        {tab === "scanner"   && <SkillScanner />}
        {tab === "audit"     && <AuditLog />}
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer
        className="border-t py-4 text-center text-xs font-mono"
        style={{
          borderColor: "rgba(255,255,255,0.05)",
          color: "#1e293b",
          background: "rgba(7,12,20,0.8)",
        }}
      >
        <span style={{ color: "#334155" }}>
          ClawGuard&nbsp;·&nbsp;Security control panel for AI agents&nbsp;·&nbsp;
          <span style={{ color: "rgba(220,38,38,0.5)" }}>
            OpenClaw · NanoClaw · NemoClaw
          </span>
        </span>
      </footer>
    </div>
  );
}
