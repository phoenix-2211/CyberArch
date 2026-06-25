import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import TopBar from "@/components/TopBar";
import ConfirmDialog from "@/components/ConfirmDialog";
import SkeletonLoader from "@/components/SkeletonLoader";
import ErrorCard from "@/components/ErrorCard";
import { Button } from "@/components/ui/button";
import { Loader2, Search as SearchIcon, Zap, ShieldAlert, Play, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SoarPage = () => {
  const { toast } = useToast();
  const [blockedIPs, setBlockedIPs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unblockTarget, setUnblockTarget] = useState<any>(null);
  const [unblockLoading, setUnblockLoading] = useState(false);

  const [detectionsLoading, setDetectionsLoading] = useState(false);
  const [soarLoading, setSoarLoading] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [detectionsResult, setDetectionsResult] = useState<string | null>(null);
  const [soarResult, setSoarResult] = useState<string | null>(null);
  const [pipelineResult, setPipelineResult] = useState<string | null>(null);

  const fetchBlockedIPs = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const data = await api.getBlockedIPs();
      setBlockedIPs(data?.blocked_ips || data?.data || data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBlockedIPs(); }, [fetchBlockedIPs]);

  const runDetections = async () => {
    setDetectionsLoading(true);
    setDetectionsResult(null);
    try {
      const r = await api.runDetections();
      setDetectionsResult(`${r?.alerts_generated ?? r?.count ?? 0} alerts generated`);
      toast({ title: "Detections completed" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setDetectionsLoading(false);
    }
  };

  const runSoar = async () => {
    setSoarLoading(true);
    setSoarResult(null);
    try {
      const r = await api.runSoar();
      setSoarResult(`${r?.actions_executed ?? r?.count ?? 0} actions executed`);
      toast({ title: "SOAR completed" });
      fetchBlockedIPs();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setSoarLoading(false);
    }
  };

  const runPipeline = async () => {
    setPipelineLoading(true);
    setPipelineResult(null);
    try {
      const d = await api.runDetections();
      const s = await api.runSoar();
      setPipelineResult(`${d?.alerts_generated ?? 0} alerts, ${s?.actions_executed ?? 0} actions`);
      toast({ title: "Full pipeline completed" });
      fetchBlockedIPs();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setPipelineLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!unblockTarget) return;
    setUnblockLoading(true);
    try {
      await api.unblockIP(unblockTarget.id);
      toast({ title: `IP ${unblockTarget.ip_address} unblocked` });
      setUnblockTarget(null);
      fetchBlockedIPs();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setUnblockLoading(false);
    }
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      return d.toLocaleString();
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="min-h-screen pb-10">
      <TopBar title="SOAR Containment" showRunDetections onRunDetections={runPipeline} isRunning={pipelineLoading} />
      <div className="p-6 space-y-6">
        
        {/* Manual Controls */}
        <div>
          <h2 className="text-xs font-bold text-foreground font-sans uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
            Automated Threat Containment Runbook
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="soc-card p-5 border border-[#1e293b] flex flex-col justify-between bg-[#090e1a]">
              <div>
                <div className="flex items-center gap-2 mb-2 border-b border-[#1e293b]/45 pb-2">
                  <SearchIcon className="h-4 w-4 text-[#3b82f6]" />
                  <h3 className="text-xs font-bold font-sans uppercase tracking-wider text-foreground">SIEM Scanner</h3>
                </div>
                <p className="text-[11px] text-muted-foreground mb-4 leading-normal font-sans uppercase">Correlate system event logs and flag anomaly signatures</p>
              </div>
              <div>
                <Button 
                  size="sm" 
                  onClick={runDetections} 
                  disabled={detectionsLoading} 
                  className="w-full h-8 text-[10px] font-mono font-bold uppercase tracking-wider cyber-btn-primary"
                >
                  {detectionsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 text-background" />}
                  RUN DETECTIONS
                </Button>
                {detectionsResult && <p className="text-[10px] font-mono font-bold text-[#10b981] mt-2 uppercase tracking-wide">RESULT: {detectionsResult}</p>}
              </div>
            </div>

            <div className="soc-card p-5 border border-[#1e293b] flex flex-col justify-between bg-[#090e1a]">
              <div>
                <div className="flex items-center gap-2 mb-2 border-b border-[#1e293b]/45 pb-2">
                  <Zap className="h-4 w-4 text-[#fb923c]" />
                  <h3 className="text-xs font-bold font-sans uppercase tracking-wider text-foreground">SOAR Playbooks</h3>
                </div>
                <p className="text-[11px] text-muted-foreground mb-4 leading-normal font-sans uppercase">Execute containment protocols on unresolved incidents</p>
              </div>
              <div>
                <Button 
                  size="sm" 
                  onClick={runSoar} 
                  disabled={soarLoading} 
                  className="w-full h-8 text-[10px] font-mono font-bold uppercase tracking-wider bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {soarLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 text-white" />}
                  EXECUTE SOAR
                </Button>
                {soarResult && <p className="text-[10px] font-mono font-bold text-[#10b981] mt-2 uppercase tracking-wide">RESULT: {soarResult}</p>}
              </div>
            </div>

            <div className="soc-card p-5 border border-[#1e293b] flex flex-col justify-between bg-[#090e1a]">
              <div>
                <div className="flex items-center gap-2 mb-2 border-b border-[#1e293b]/45 pb-2">
                  <Play className="h-4 w-4 text-[#10b981]" />
                  <h3 className="text-xs font-bold font-sans uppercase tracking-wider text-foreground">Full Pipeline</h3>
                </div>
                <p className="text-[11px] text-muted-foreground mb-4 leading-normal font-sans uppercase">Scan events and mitigate active alerts sequentially</p>
              </div>
              <div>
                <Button 
                  size="sm" 
                  onClick={runPipeline} 
                  disabled={pipelineLoading} 
                  className="w-full h-8 text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {pipelineLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 text-white" />}
                  RUN FULL PIPELINE
                </Button>
                {pipelineResult && <p className="text-[10px] font-mono font-bold text-[#10b981] mt-2 uppercase tracking-wide">RESULT: {pipelineResult}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Blocked IPs */}
        <div>
          <h2 className="text-xs font-bold text-foreground font-sans uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            Active Containment Registry (IP Firewall)
          </h2>
          {loading ? (
            <SkeletonLoader rows={4} cols={4} />
          ) : error ? (
            <ErrorCard message={error} onRetry={fetchBlockedIPs} />
          ) : blockedIPs.length === 0 ? (
            <div className="soc-card border border-[#1e293b] p-12 text-center">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">No IP addresses currently restricted</p>
            </div>
          ) : (
            <div className="soc-card border border-[#1e293b] overflow-hidden bg-[#090e1a]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0e111e]/90 border-b border-[#1e293b]/80 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/80">
                      <th className="px-5 py-4 font-bold">Restricted IP Address</th>
                      <th className="px-5 py-4 font-bold">Incident Classification</th>
                      <th className="px-5 py-4 font-bold">Containment Timestamp</th>
                      <th className="px-5 py-4 font-bold text-right">Access Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedIPs.map((ip: any) => (
                      <tr key={ip.id} className="border-b border-[#1e293b]/30 last:border-0 hover:bg-primary/[0.02] transition-all duration-150">
                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-foreground">{ip.ip_address}</td>
                        <td className="px-5 py-3.5 text-muted-foreground text-xs font-mono uppercase">{ip.reason}</td>
                        <td className="px-5 py-3.5 text-muted-foreground/75 text-xs font-mono">{formatDate(ip.created_at)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setUnblockTarget(ip)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider h-7 px-3 text-[#00e676] border-[#00e676]/30 bg-[#00e676]/5 hover:bg-[#00e676]/15 transition-all duration-200"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>UNBLOCK</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!unblockTarget}
        title="Unblock IP Address"
        description={`Confirm removal of firewall restriction for "${unblockTarget?.ip_address}"? This node will be allowed to hit authentication gateways.`}
        onConfirm={handleUnblock}
        onCancel={() => setUnblockTarget(null)}
        loading={unblockLoading}
      />
    </div>
  );
};

export default SoarPage;
