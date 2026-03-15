import { formatSlaTime } from "./orderConstants";

interface SlaTimerBadgeProps {
  targetAt: string;
  className?: string;
}

export function SlaTimerBadge({ targetAt, className = "" }: SlaTimerBadgeProps) {
  const { label, status } = formatSlaTime(targetAt);

  const colorClasses = {
    green: "bg-success/10 text-success",
    amber: "bg-warning/10 text-warning animate-pulse",
    red: "bg-destructive/10 text-destructive font-bold",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-mono ${colorClasses[status]} ${className}`}
    >
      ⏱ {label}
    </span>
  );
}
