import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  title: string;
  showRunDetections?: boolean;
  onRunDetections?: () => void;
  isRunning?: boolean;
  lastUpdated?: string | null;
}

const TopBar = ({ title, showRunDetections, onRunDetections, isRunning, lastUpdated }: TopBarProps) => {
  return (
    <div className="flex items-center justify-between border-b border-[#1e293b] px-6 py-3 bg-[#090e1a]/85 backdrop-filter backdrop-blur-md sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
      <h1 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-sans">
        {title}
      </h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono uppercase tracking-wider bg-slate-950 border border-[#1e293b] rounded-full px-3 py-1 shadow-sm">
          <span className="h-1.5 w-1.5 live-indicator" />
          <span className="text-slate-300 font-semibold">SYSTEM LIVE</span>
          {lastUpdated && (
            <>
              <span className="text-slate-700">|</span>
              <span className="text-[#3b82f6] font-semibold">SYNC: {lastUpdated}</span>
            </>
          )}
        </div>
        {showRunDetections && (
          <Button
            size="sm"
            onClick={onRunDetections}
            disabled={isRunning}
            className="cyber-btn-primary h-7 px-3 text-[10px] font-semibold uppercase tracking-wider font-sans"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1.5 text-background" />
                SCANNING...
              </>
            ) : (
              "RUN DETECTIONS"
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default TopBar;
