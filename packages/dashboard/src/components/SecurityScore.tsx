interface SecurityScoreProps {
  score: number;
  grade: string;
  size?: "sm" | "lg";
}

function scoreColor(score: number): string {
  if (score >= 90) return "#22c55e";
  if (score >= 75) return "#84cc16";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function scoreGlow(score: number): string {
  if (score >= 90) return "rgba(34,197,94,0.4)";
  if (score >= 75) return "rgba(132,204,22,0.4)";
  if (score >= 60) return "rgba(234,179,8,0.4)";
  if (score >= 40) return "rgba(249,115,22,0.4)";
  return "rgba(239,68,68,0.4)";
}

const ZONES = [
  { label: "F", min: 0,  max: 39,  color: "#ef4444" },
  { label: "D", min: 40, max: 59,  color: "#f97316" },
  { label: "C", min: 60, max: 74,  color: "#eab308" },
  { label: "B", min: 75, max: 89,  color: "#84cc16" },
  { label: "A", min: 90, max: 100, color: "#22c55e" },
];

export function SecurityScore({ score, grade, size = "lg" }: SecurityScoreProps) {
  const color = scoreColor(score);
  const glow  = scoreGlow(score);

  if (size === "sm") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span style={{ color, fontWeight: 700, fontSize: 18, textShadow: `0 0 10px ${glow}` }}>{grade}</span>
        <span style={{ color: "rgba(148,163,184,0.6)", fontSize: 10, fontFamily: "monospace" }}>{score}</span>
      </span>
    );
  }

  return (
    <div style={{ width: 220, textAlign: "center" }}>
      {/* Grade badge */}
      <div
        style={{
          display:        "inline-flex",
          alignItems:     "center",
          justifyContent: "center",
          width:          88,
          height:         88,
          borderRadius:   16,
          background:     "rgba(7,12,20,0.8)",
          border:         `2px solid ${color}`,
          boxShadow:      `0 0 24px ${glow}, inset 0 0 20px rgba(0,0,0,0.4)`,
          marginBottom:   12,
        }}
      >
        <span
          style={{
            fontSize:      52,
            fontWeight:    900,
            color,
            textShadow:    `0 0 20px ${glow}`,
            lineHeight:    1,
            letterSpacing: "-0.04em",
          }}
        >
          {grade}
        </span>
      </div>

      {/* Score number */}
      <div
        style={{
          fontFamily:    "monospace",
          fontSize:      13,
          color:         "rgba(148,163,184,0.65)",
          letterSpacing: "0.06em",
          marginBottom:  14,
        }}
      >
        {score} / 100
      </div>

      {/* Zone bar */}
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
        {ZONES.map(zone => {
          const active = score >= zone.min && score <= zone.max;
          const filled = score > zone.max;
          const lit = active || filled;
          return (
            <div key={zone.label} style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{
                  height:       active ? 10 : 6,
                  borderRadius: 4,
                  background:   lit ? zone.color : "rgba(255,255,255,0.07)",
                  boxShadow:    active ? `0 0 10px ${zone.color}` : undefined,
                  transition:   "all 0.4s ease",
                  marginBottom: 4,
                }}
              />
              <span
                style={{
                  fontSize:   9,
                  fontFamily: "monospace",
                  color:      active ? zone.color : "rgba(148,163,184,0.25)",
                  fontWeight: active ? 700 : 400,
                  transition: "color 0.4s ease",
                }}
              >
                {zone.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
