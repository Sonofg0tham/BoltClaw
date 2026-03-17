interface SecurityScoreProps {
  score: number;
  grade: string;
  size?: "sm" | "lg";
}

function scoreColor(score: number): string {
  if (score >= 90) return "#22c55e"; // green
  if (score >= 70) return "#eab308"; // yellow
  if (score >= 50) return "#f97316"; // orange
  return "#ef4444"; // red
}

export function SecurityScore({ score, grade, size = "lg" }: SecurityScoreProps) {
  const dim = size === "lg" ? 200 : 80;
  const strokeWidth = size === "lg" ? 10 : 6;
  const radius = (dim - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
        />
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
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold"
          style={{ fontSize: size === "lg" ? 48 : 18, color }}
        >
          {grade}
        </span>
        <span
          className="text-slate-400 font-mono"
          style={{ fontSize: size === "lg" ? 16 : 10 }}
        >
          {score}/100
        </span>
      </div>
    </div>
  );
}
