"use client";

interface RiskScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export default function RiskScore({ score, size = "md" }: RiskScoreProps) {
  const level =
    score >= 70 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";

  const color =
    score >= 70
      ? { text: "text-red-400", stroke: "#ef4444", bg: "bg-red-500/10 border-red-500/30" }
      : score >= 30
      ? { text: "text-amber-400", stroke: "#f59e0b", bg: "bg-amber-500/10 border-amber-500/30" }
      : { text: "text-green-400", stroke: "#22c55e", bg: "bg-green-500/10 border-green-500/30" };

  const radius = size === "lg" ? 42 : size === "md" ? 34 : 24;
  const strokeWidth = size === "lg" ? 5 : 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const svgSize = (radius + strokeWidth) * 2 + 4;

  return (
    <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-xl border ${color.bg}`}>
      {/* SVG ring */}
      <svg width={svgSize} height={svgSize} className="-rotate-90">
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="#1e1e35"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke={color.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="rotate-90 origin-center"
          fill={color.stroke}
          fontSize={size === "lg" ? 16 : 12}
          fontWeight="bold"
          transform={`rotate(90, ${svgSize / 2}, ${svgSize / 2})`}
        >
          {score}
        </text>
      </svg>

      <div>
        <p className={`text-sm font-bold ${color.text}`}>{level} RISK</p>
        <p className="text-xs text-text-muted">Score: {score}/100</p>
      </div>
    </div>
  );
}
