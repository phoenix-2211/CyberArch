import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const s = status?.toUpperCase() || "INACTIVE";
  const cls = cn(
    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
    s === "ACTIVE" && "status-active",
    s === "LOCKED" && "status-locked",
    (s === "INACTIVE" || s === "GENESIS") && "status-inactive"
  );
  return <span className={cls}>{s}</span>;
};

export default StatusBadge;
