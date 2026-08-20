export function ProgressRing({
  value,
  size = 148,
  stroke = 12,
  label,
  caption,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  caption?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="numeric font-display text-3xl font-semibold">{label ?? `${clamped}%`}</span>
        {caption ? <span className="text-xs text-muted-foreground">{caption}</span> : null}
      </div>
    </div>
  );
}
