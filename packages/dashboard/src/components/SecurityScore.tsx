interface SecurityScoreProps {
  score: number;
  grade: string;
  size?: "sm" | "lg";
}

function scoreColor(score: number): string {
  if (score >= 90) return "#22c55e";
  if (score >= 70) return "#eab308";
  if (score >= 50) return "#f97316";
  return "#ef4444";
}

function scoreGlow(score: number): string {
  if (score >= 90) return "rgba(34,197,94,0.35)";
  if (score >= 70) return "rgba(234,179,8,0.35)";
  if (score >= 50) return "rgba(249,115,22,0.35)";
  return "rgba(239,68,68,0.35)";
}

export function SecurityScore({ score, grade, size = "lg" }: SecurityScoreProps) {
  const dim = size === "lg" ? 200 : 80;
  const strokeWidth = size === "lg" ? 12 : 7;
  const radius = (dim - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = scoreColor(score);
  const glow  = scoreGlow(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dim, height: dim }}>
      {/* Outer ambient glow ring */}
      {size === "lg" && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
            transform: "scale(1.15)",
          }}
        />
      )}

      <svg width={dim} height={dim} className="-rotate-90" style={{ filter: `drop-shadow(0 0 ${size === "lg" ? 8 : 4}px ${glow})` }}>
        {/* Track */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - filled}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold leading-none"
          style={{
            fontSize:  size === "lg" ? 52 : 20,
            color,
            textShadow: `0 0 20px ${glow}`,
            letterSpacing: "-0.03em",
          }}
        >
          {grade}
        </span>
        <span
          className="font-mono mt-1"
          style={{
            fontSize: size === "lg" ? 13 : 9,
            color:    "rgba(148,163,184,0.7)",
            letterSpacing: "0.05em",
          }}
        >
          {score}/100
        </span>
      </div>
    </div>
  );
}
