interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-5 animate-slide-in"
      style={{
        background: "rgba(127,29,29,0.25)",
        border:     "1px solid rgba(220,38,38,0.3)",
        backdropFilter: "blur(8px)",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#f87171"
        strokeWidth="2"
        strokeLinecap="round"
        className="mt-0.5 flex-shrink-0"
      >
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p className="flex-1 text-sm leading-relaxed" style={{ color: "#fca5a5" }}>
        {message}
      </p>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 transition-colors"
        style={{ color: "#f87171" }}
        aria-label="Dismiss error"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}
