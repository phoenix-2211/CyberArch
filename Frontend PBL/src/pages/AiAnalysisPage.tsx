import { useState, useEffect, useRef } from "react";
import { api } from "@/services/api";
import TopBar from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  BrainCircuit, Loader2, FileText, ShieldAlert, BarChart3,
  Download, Calendar, Cpu, ChevronRight, CheckCircle2,
  AlertTriangle, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType = "risk_summary" | "full_soc" | "alert_analysis";

interface ReportResult {
  report_type: string;
  analysis_text: string;
  report_file: string | null;
  docx_file: string | null;
  csv_available?: boolean;
  summary?: Record<string, unknown>;
}

const REPORT_TYPES: { id: ReportType; label: string; description: string; icon: React.ElementType }[] = [
  { id: "risk_summary",    label: "Risk Summary",    description: "Overall risk score, classification & executive overview",  icon: ShieldAlert },
  { id: "full_soc",        label: "Full SOC Report", description: "Deep-dive: incidents, correlations, impact & timeline",    icon: BarChart3   },
  { id: "alert_analysis",  label: "Alert Analysis",  description: "Attack patterns, severity reasoning & mitigation steps",  icon: FileText    },
];

const BASE = "http://127.0.0.1:5000";

// ─── Component ────────────────────────────────────────────────────────────────

const AiAnalysisPage = () => {
  const { toast } = useToast();

  // Filters
  const [dateMode,   setDateMode]   = useState<"single" | "range">("single");
  const [singleDate, setSingleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startDate,  setStartDate]  = useState("");
  const [endDate,    setEndDate]    = useState("");

  // Device dropdown
  const [devices,       setDevices]       = useState<string[]>([]);
  const [devicesLoading,setDevicesLoading]= useState(false);
  const [deviceId,      setDeviceId]      = useState("all");
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Report type
  const [selectedType, setSelectedType] = useState<ReportType>("risk_summary");

  // State
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<ReportResult | null>(null);
  const [error,   setError]   = useState("");

  // Blob URL for iframe
  const [blobUrl,      setBlobUrl]      = useState<string | null>(null);
  const prevBlobUrl = useRef<string | null>(null);

  // ── Fetch device list on mount ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setDevicesLoading(true);
      try {
        const data = await api.getDevices(1, 100);
        const ids: string[] = (data?.devices || []).map((d: any) => d.device_id);
        setDevices(ids);
      } catch {
        // silently ignore — dropdown just shows "All Devices" only
      } finally {
        setDevicesLoading(false);
      }
    })();
  }, []);

  // ── Close dropdown on outside click ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Cleanup blob URLs ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => { if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current); };
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const activeDate   = dateMode === "single" ? singleDate : startDate && endDate ? `${startDate} → ${endDate}` : "Not set";
  const activeDevice = deviceId === "all" ? "All Devices" : deviceId;

  const buildFilters = () => {
    const f: Record<string, unknown> = {};
    if (dateMode === "single" && singleDate) { f.specific_dates = [singleDate]; }
    else { if (startDate) f.start_date = startDate; if (endDate) f.end_date = endDate; }
    if (deviceId !== "all") f.device_id = deviceId;
    return f;
  };

  const fetchReportBlob = async (filename: string) => {
    const token = localStorage.getItem("token");
    const res   = await fetch(`${BASE}/ai/view-report/${filename}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Could not load report preview");
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
    prevBlobUrl.current = url;
    setBlobUrl(url);
  };

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setLoading(true); setError(""); setResult(null); setBlobUrl(null);
    try {
      const filters = buildFilters();
      let data: ReportResult;
      if      (selectedType === "risk_summary")   data = await api.generateRiskSummary(filters);
      else if (selectedType === "full_soc")        data = await api.generateFullSocReport(filters);
      else                                          data = await api.generateAlertAnalysis(filters);

      setResult(data);
      if (data.report_file) await fetchReportBlob(data.report_file);
      toast({ title: "Report generated", description: data.report_type });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setError(msg);
      toast({ title: "Generation Failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadHtml = () => { if (result?.report_file) api.downloadReport(result.report_file); };
  const handleDownloadDocx = () => { if (result?.docx_file)   api.downloadDocx(result.docx_file);   };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full pb-10">
      <TopBar title="AI Threat Analysis Engine" />

      <div className="flex-1 overflow-auto p-6 space-y-5">

        {/* Header card */}
        <div className="soc-card p-5 border border-[#1d223c]/50 flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 shadow-[0_0_12px_rgba(0,229,255,0.15)] flex-shrink-0">
            <BrainCircuit className="h-6 w-6 text-primary cyber-glow-cyan" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-bold text-foreground font-sans tracking-wide uppercase text-sm">AI-Powered SOC Analyst</h2>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-accent text-primary border border-primary/20 font-mono font-black uppercase">
                OLLAMA · LLAMA3 · SIEM_AGENT
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Filter active telemetry streams, choose a security intelligence template, and invoke the LLM analyst. The system correlates log signatures, scores device risk, and outputs a cryptographically-indexed PDF/DOCX mitigation plan.
            </p>
          </div>
        </div>

        {/* Filters grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* DATE FILTER */}
          <div className="soc-card p-5 border border-[#1e293b] space-y-4 bg-[#090e1a]">
            <p className="text-[10px] font-bold text-muted-foreground font-mono uppercase tracking-widest flex items-center gap-1.5 border-b border-[#1e293b]/30 pb-2">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Date Filter Scope
            </p>
            <div className="flex rounded-lg overflow-hidden border border-[#1e293b] text-xs font-mono">
              <button 
                onClick={() => setDateMode("single")} 
                className={cn("flex-1 py-2 font-bold uppercase transition-all duration-200", dateMode === "single" ? "bg-primary text-background" : "bg-transparent text-muted-foreground hover:bg-accent/40")}
              >
                Single Epoch
              </button>
              <button 
                onClick={() => setDateMode("range")}  
                className={cn("flex-1 py-2 font-bold uppercase transition-all duration-200", dateMode === "range"  ? "bg-primary text-background" : "bg-transparent text-muted-foreground hover:bg-accent/40")}
              >
                Range Scope
              </button>
            </div>

            {dateMode === "single" ? (
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Target Date</label>
                <input 
                  type="date" 
                  value={singleDate} 
                  onChange={(e) => setSingleDate(e.target.value)} 
                  className="w-full text-xs font-mono bg-background border border-[#1e293b] rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary/50" 
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Start Date</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    className="w-full text-xs font-mono bg-background border border-[#1e293b] rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary/50" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">End Date</label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    className="w-full text-xs font-mono bg-background border border-[#1e293b] rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary/50" 
                  />
                </div>
              </div>
            )}

            {/* Active filters pill */}
            <div className="rounded-lg bg-[#070911]/80 border border-[#1e293b]/50 px-3.5 py-2.5 space-y-1.5 text-[10px] font-mono">
              <p className="font-extrabold text-muted-foreground/60 tracking-widest uppercase">ACTIVE FILTERS</p>
              <div className="flex items-center gap-1.5 text-foreground">
                <ChevronRight className="h-3 w-3 text-primary shrink-0" />
                <span className="text-muted-foreground/80">Date:</span>
                <span className="font-bold text-foreground">{activeDate}</span>
              </div>
              <div className="flex items-center gap-1.5 text-foreground">
                <ChevronRight className="h-3 w-3 text-primary shrink-0" />
                <span className="text-muted-foreground/80">Device:</span>
                <span className="font-bold text-foreground">{activeDevice}</span>
              </div>
            </div>
          </div>

          {/* DEVICE FILTER */}
          <div className="soc-card p-5 border border-[#1e293b] space-y-4 bg-[#090e1a]">
            <p className="text-[10px] font-bold text-muted-foreground font-mono uppercase tracking-widest flex items-center gap-1.5 border-b border-[#1e293b]/30 pb-2">
              <Cpu className="h-3.5 w-3.5 text-primary" /> Device Scope
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Target Hardware Node</label>

              {/* Custom dropdown with scrollable list */}
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="w-full flex items-center justify-between text-xs font-mono bg-background border border-[#1e293b] rounded-md px-3 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring hover:bg-accent/40 hover:border-border/30 transition-colors"
                >
                  <span className={cn(deviceId === "all" ? "text-muted-foreground/80 font-semibold" : "text-foreground font-bold")}>
                    {devicesLoading ? "Fetching nodes..." : activeDevice}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-250", dropdownOpen && "rotate-180")} />
                </button>

                {dropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-[#1e293b] bg-[#0c0e18] shadow-2xl overflow-hidden shadow-black">
                    {/* Scrollable list */}
                    <div className="overflow-y-auto" style={{ maxHeight: "180px" }}>
                      {/* All Devices option */}
                      <button
                        type="button"
                        onClick={() => { setDeviceId("all"); setDropdownOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono uppercase text-left transition-all hover:bg-accent",
                          deviceId === "all" ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground"
                        )}
                      >
                        <Cpu className="h-3.5 w-3.5 shrink-0" />
                        All Devices
                        {deviceId === "all" && <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />}
                      </button>

                      {/* Device list */}
                      {devices.length === 0 && !devicesLoading && (
                        <div className="px-3.5 py-2.5 text-xs text-muted-foreground/60 italic font-mono uppercase">No nodes registered</div>
                      )}
                      {devices.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => { setDeviceId(id); setDropdownOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono uppercase text-left border-t border-[#1e293b]/40 transition-all hover:bg-accent",
                            deviceId === id ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground"
                          )}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-[#00e676] shrink-0" />
                          {id}
                          {deviceId === id && <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground/60 font-mono leading-relaxed uppercase">
              {devices.length > 0
                ? `System monitoring ${devices.length} registered terminal${devices.length > 1 ? "s" : ""}. Choose specific node or aggregate telemetry.`
                : "Select all monitored terminals or filter by specific Hardware ID."}
            </p>
          </div>

          {/* REPORT TYPE */}
          <div className="soc-card p-5 border border-[#1e293b] space-y-3 bg-[#090e1a]">
            <p className="text-[10px] font-bold text-muted-foreground font-mono uppercase tracking-widest flex items-center gap-1.5 border-b border-[#1e293b]/30 pb-2">
              <FileText className="h-3.5 w-3.5 text-primary" /> Analysis Template
            </p>
            <div className="space-y-2">
              {REPORT_TYPES.map((rt) => {
                const Icon   = rt.icon;
                const active = selectedType === rt.id;
                return (
                  <button
                    key={rt.id}
                    onClick={() => setSelectedType(rt.id)}
                    className={cn(
                      "w-full flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-200",
                      active ? "border-primary/40 bg-primary/10 shadow-[0_0_12px_rgba(0,229,255,0.06)]" : "border-[#1e293b] bg-transparent hover:bg-accent/40 hover:border-border/40"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0 transition-transform duration-200", active ? "text-primary scale-110" : "text-muted-foreground")} />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xs font-bold uppercase tracking-wide", active ? "text-primary font-bold" : "text-foreground")}>{rt.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal line-clamp-1">{rt.description}</p>
                    </div>
                    {active && <CheckCircle2 className="h-4 w-4 text-primary shrink-0 ml-auto mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Generate button */}
        <div className="flex justify-start">
          <Button 
            onClick={handleGenerate} 
            disabled={loading} 
            className="cyber-btn-primary h-12 px-8 text-xs font-black uppercase tracking-wider font-mono bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                CORRELATING SIGNATURES (LLM COMPILING)...
              </>
            ) : (
              <>
                <BrainCircuit className="mr-2 h-4 w-4 text-white" />
                EXECUTE AI ANALYSIS REPORT
              </>
            )}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="soc-card border border-destructive/40 bg-destructive/10 px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5 animate-bounce" />
            <div>
              <p className="text-xs font-bold text-destructive font-mono uppercase tracking-widest">ERR_AI_ANALYSIS_FAILED</p>
              <p className="text-xs text-destructive/80 mt-1 font-mono">{error}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="soc-card border border-[#1d223c]/50 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1d223c]/60 bg-[#0e111e]/90 flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#00e676] animate-pulse" />
                <p className="font-bold text-foreground text-xs uppercase font-mono tracking-wider">{result.report_type}</p>
                {result.report_file && (
                  <span className="text-[10px] text-muted-foreground/60 font-mono hidden sm:inline">[{result.report_file}]</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] px-2 py-0.5 rounded border border-[#00e676]/30 bg-[#00e676]/10 text-[#00ff88] font-bold font-mono uppercase tracking-wider mr-2">
                  GENERATED
                </span>
                {result.report_file && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleDownloadHtml} 
                    className="h-7 text-[10px] font-mono font-bold uppercase tracking-wider border-[#1d223c] hover:bg-accent/40 gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" /> HTML
                  </Button>
                )}
                {result.docx_file && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleDownloadDocx} 
                    className="h-7 text-[10px] font-mono font-bold uppercase tracking-wider border-[#1d223c] hover:bg-accent/40 gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" /> DOCX
                  </Button>
                )}
              </div>
            </div>

            {/* Content Display */}
            <div className="p-4 bg-black/40">
              {blobUrl ? (
                <iframe src={blobUrl} title="AI Report" className="w-full rounded-lg border border-[#1d223c]/40" style={{ height: "70vh", border: "none" }} />
              ) : (
                <pre className="p-5 text-xs text-foreground/90 bg-[#0a0c16]/80 rounded-lg border border-[#1d223c]/40 whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-[70vh] shadow-[inset_0_0_15px_rgba(0,0,0,0.6)]">
                  {result.analysis_text}
                </pre>
              )}
            </div>

            {/* Summary stats */}
            {result.summary && Object.keys(result.summary).length > 0 && (
              <div className="border-t border-[#1d223c]/50 px-5 py-4 flex flex-wrap gap-4 bg-[#070911]/50 font-mono text-[10px] uppercase">
                {Object.entries(result.summary).map(([k, v]) => (
                  <div key={k} className="inline-flex items-center gap-1 text-muted-foreground bg-accent/45 border border-[#1d223c] px-2.5 py-1 rounded-md">
                    <span className="text-muted-foreground/60">{k.replace(/_/g, " ")}: </span>
                    <span className="font-bold text-primary">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAnalysisPage;