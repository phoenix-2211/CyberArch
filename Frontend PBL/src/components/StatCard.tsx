import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subLabel: string;
  accentColor: string;
  subLabelColor?: string;
  isCritical?: boolean;
  valueColor?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const StatCard = ({ label, value, subLabel, accentColor, subLabelColor, isCritical, valueColor, icon: Icon }: StatCardProps) => {
  return (
    <div
      className={cn(
        "soc-card p-5 border border-[#1e293b] relative overflow-hidden transition-all duration-200 group bg-[#090e1a]",
        isCritical && "border-destructive/30 bg-destructive/[0.02]"
      )}
      style={{ borderLeftColor: accentColor, borderLeftWidth: "3px" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold font-sans uppercase tracking-wider text-muted-foreground/80 mb-2">
            {label}
          </p>
          <p className={cn("text-2xl font-bold tracking-tight font-mono", valueColor || "text-foreground")}>
            {value}
          </p>
        </div>
        {Icon && (
          <div 
            className="p-2 rounded-md bg-slate-950 border border-[#1e293b] flex items-center justify-center transition-all duration-200 group-hover:border-[#334155]"
            style={{ color: accentColor }}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className={cn("text-[10px] font-mono uppercase tracking-wider mt-4 flex items-center gap-1.5", subLabelColor || "text-muted-foreground/80")}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
        {subLabel}
      </div>
    </div>
  );
};

export default StatCard;
