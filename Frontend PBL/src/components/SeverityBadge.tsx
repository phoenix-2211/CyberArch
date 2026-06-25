import { cn } from "@/lib/utils";

interface SeverityBadgeProps {
  severity: string;
}

const SeverityBadge = ({ severity }: SeverityBadgeProps) => {
  const s = severity?.toUpperCase() || "INFO";
  const cls = cn(
    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
    s === "CRITICAL" && "severity-critical",
    s === "HIGH" && "severity-high",
    s === "MEDIUM" && "severity-medium",
    s === "INFO" && "severity-info"
  );
  return <span className={cls}>{s}</span>;
};

export default SeverityBadge;
