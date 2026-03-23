import { useState } from "react";

export function InfoIcon({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative inline-flex items-center" style={{ verticalAlign: "middle" }}>
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-label="More information"
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "1px solid rgba(100,116,139,0.5)",
          background: "rgba(255,255,255,0.04)",
          color: "#64748b",
          fontSize: 10,
          fontWeight: 700,
          lineHeight: 1,
          cursor: "default",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        ?
      </button>

      {visible && (
        <span
          className="absolute z-50 text-xs leading-relaxed rounded-xl px-3 py-2 pointer-events-none"
          style={{
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: 220,
            background: "rgba(7,12,20,0.97)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#94a3b8",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          }}
        >
          {text}
          <span
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid rgba(255,255,255,0.1)",
            }}
          />
        </span>
      )}
    </span>
  );
}
