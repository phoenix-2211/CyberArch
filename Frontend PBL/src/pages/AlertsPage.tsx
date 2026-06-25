import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import TopBar from "@/components/TopBar";
import SeverityBadge from "@/components/SeverityBadge";
import SkeletonLoader from "@/components/SkeletonLoader";
import ErrorCard from "@/components/ErrorCard";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const AlertsPage = () => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchAlerts = useCallback(async (isInitial = false) => {
    try {
      setError("");
      if (isInitial) setLoading(true);
      const data = await api.getAlerts(1, 50);
      setAlerts(data?.alerts || data?.data || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      if (isInitial) setError(err.message);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts(true);
    const interval = setInterval(() => fetchAlerts(false), 15000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleRunAll = async () => {
    setRunning(true);
    try {
      await api.runDetections();
      await api.runSoar();
      setLastRun(new Date().toLocaleTimeString());
      toast({ title: "Detections and SOAR executed successfully" });
      fetchAlerts(false);
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const getBorderColor = (severity: string) => {
    const s = severity?.toUpperCase();
    if (s === "CRITICAL") return "#ff1a66";
    if (s === "HIGH") return "#ff9100";
    if (s === "MEDIUM") return "#ffd700";
    return "#00e5ff";
  };

  return (
    <div>
      <TopBar title="Active Alerts" showRunDetections onRunDetections={handleRunAll} isRunning={running} lastUpdated={lastUpdated} />
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-4 bg-slate-900/50 border border-[#1e293b] rounded-lg p-3">
          <Button 
            onClick={handleRunAll} 
            disabled={running}
            className="cyber-btn-primary h-8 px-4 text-[11px] font-semibold uppercase tracking-wider font-sans"
          >
            {running && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Run Threat Scan
          </Button>
          {lastRun && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-slate-950 border border-[#1e293b] px-3 py-1 rounded">
              LAST RUN: {lastRun}
            </span>
          )}
        </div>

        {loading ? (
          <SkeletonLoader rows={5} cols={2} />
        ) : error ? (
          <ErrorCard message={error} onRetry={fetchAlerts} />
        ) : alerts.length === 0 ? (
          <div className="soc-card border border-[#1e293b] p-12 flex flex-col items-center gap-4 text-center">
            <div className="p-3.5 rounded-full bg-[#10b981]/10 border border-[#10b981]/25">
              <CheckCircle className="h-8 w-8 text-[#10b981]" />
            </div>
            <div className="space-y-1 bg-transparent">
              <p className="text-sm font-semibold text-foreground uppercase tracking-wider">NO ACTIVE THREATS</p>
              <p className="text-xs text-muted-foreground tracking-wide">All components operating within normal parameters</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert: any, i: number) => {
              const borderCol = getBorderColor(alert.severity);
              return (
                <div
                  key={alert.id || i}
                  className="soc-card p-5 border border-[#1e293b] relative overflow-hidden transition-all duration-200"
                  style={{ 
                    borderLeftColor: borderCol, 
                    borderLeftWidth: "3px"
                  }}
                >
                  <div className="flex items-center justify-between mb-3 border-b border-[#1e293b]/40 pb-2">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-sans">
                      {alert.alert_type || alert.type}
                    </h3>
                    <SeverityBadge severity={alert.severity} />
                  </div>
                  <p className="text-xs text-muted-foreground/90 font-mono mb-4 leading-relaxed">{alert.description}</p>
                  
                  <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono uppercase">
                    {alert.device_id && (
                      <span className="bg-[#2563eb]/5 border border-[#2563eb]/20 text-[#3b82f6] px-2.5 py-0.5 rounded font-semibold">{alert.device_id}</span>
                    )}
                    {alert.source_ip && (
                      <span className="bg-slate-900 border border-[#1e293b] text-muted-foreground px-2.5 py-0.5 rounded">IP: {alert.source_ip}</span>
                    )}
                    {alert.event_count != null && (
                      <span className="bg-slate-900 border border-[#1e293b] text-muted-foreground px-2.5 py-0.5 rounded">{alert.event_count} events</span>
                    )}
                    {alert.soar_action ? (
                      <span className="inline-flex items-center gap-1 text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20 px-2.5 py-0.5 rounded font-semibold">
                        SOAR: {alert.soar_action}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-warning bg-warning/10 border border-warning/20 px-2.5 py-0.5 rounded font-semibold">
                        PENDING
                      </span>
                    )}
                    <span className="ml-auto text-[9px] text-muted-foreground/60">{alert.created_at}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPage;
