import { useState } from "react";
import { SetupWizard } from "./pages/SetupWizard.js";
import { PermissionDashboard } from "./pages/PermissionDashboard.js";
import { SkillScanner } from "./pages/SkillScanner.js";
import { AuditLog } from "./pages/AuditLog.js";

const TABS = [
  { id: "wizard", label: "Setup Wizard", icon: "\u{1F6E1}\uFE0F" },
  { id: "dashboard", label: "Permissions", icon: "\u{1F50D}" },
  { id: "scanner", label: "Skill Scanner", icon: "\u{1F9EA}" },
  { id: "audit", label: "Audit Log", icon: "\u{1F4DC}" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function App() {
  const [tab, setTab] = useState<TabId>("wizard");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <span className="font-bold text-lg tracking-tight">
              Safe<span className="text-green-400">Claw</span>
            </span>
            <span className="text-xs text-slate-500 ml-2 font-mono">v0.1</span>
          </div>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "bg-slate-800 text-green-400"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <span className="mr-1.5">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {tab === "wizard" && <SetupWizard />}
        {tab === "dashboard" && <PermissionDashboard />}
        {tab === "scanner" && <SkillScanner />}
        {tab === "audit" && <AuditLog />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-600">
        SafeClaw — Security-first configuration for OpenClaw
      </footer>
    </div>
  );
}
