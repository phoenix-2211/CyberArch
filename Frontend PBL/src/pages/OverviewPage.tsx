import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import TopBar from "@/components/TopBar";
import StatCard from "@/components/StatCard";
import SeverityBadge from "@/components/SeverityBadge";
import StatusBadge from "@/components/StatusBadge";
import SkeletonLoader from "@/components/SkeletonLoader";
import ErrorCard from "@/components/ErrorCard";
import { Cpu, Bell, Shield, Link } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

// ── shared chart config ──
const gridColor = "rgba(29, 34, 60, 0.4)";
const tickColor = "#94a3b8";
const tooltipBg = "#0a0c16";

const axisStyle = {
  ticks: { color: tickColor, font: { size: 10, family: "JetBrains Mono" } },
  grid: { color: gridColor },
  border: { color: gridColor },
};

const tooltipStyle = {
  backgroundColor: tooltipBg,
  borderColor: "rgba(0, 229, 255, 0.2)",
  borderWidth: 1,
  titleColor: "#f3f5f9",
  bodyColor: "#94a3b8",
  padding: 10,
  titleFont: { family: "Outfit", size: 11, weight: "bold" as const },
  bodyFont: { family: "JetBrains Mono", size: 10 },
};

const OverviewPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [charts, setCharts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setError("");
        setLoading(true);
      }
      const [s, e, d, c] = await Promise.all([
        api.getDashboardStats(),
        api.getSecurityEvents(1, 10),
        api.getDevices(1, 10),
        api.getDashboardCharts(),
      ]);
      setStats(s);
      setEvents(e?.events || e?.data || []);
      setDevices(d?.devices || d?.data || []);
      setCharts(c);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      if (isInitial) setError(err.message);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Chart data ──
  const severityData = {
    labels: ["Critical", "High", "Medium", "Info"],
    datasets: [{
      data: [
        charts?.severity_breakdown?.CRITICAL ?? 0,
        charts?.severity_breakdown?.HIGH ?? 0,
        charts?.severity_breakdown?.MEDIUM ?? 0,
        charts?.severity_breakdown?.INFO ?? 0,
      ],
      backgroundColor: ["#ff1a66", "#ff9100", "#ffd700", "#00e5ff"],
      borderRadius: 4,
      borderSkipped: false,
    }],
  };

  const typeLabels = charts?.event_type_breakdown
    ? Object.keys(charts.event_type_breakdown)
    : ["LOGIN_FAIL", "HMAC_MISMATCH", "AUTH_SUCCESS", "SOAR_ACTION_EXECUTED", "LOGIN_SUCCESS"];

  const typeValues = charts?.event_type_breakdown
    ? Object.values(charts.event_type_breakdown) as number[]
    : [0, 0, 0, 0, 0];

  const typeColors = ["#00e5ff", "#ff9100", "#ff1a66", "#00e676", "#a78bfa"];

  const doughnutData = {
    labels: typeLabels,
    datasets: [{
      data: typeValues,
      backgroundColor: typeColors,
      borderWidth: 0,
      hoverOffset: 4,
    }],
  };

  const weeklyDays = charts?.daily_counts?.days ?? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const lineData = {
    labels: weeklyDays,
    datasets: [
      {
        label: "Critical",
        data: charts?.daily_counts?.critical ?? [0, 0, 0, 0, 0, 0, 0],
        borderColor: "#ff1a66",
        backgroundColor: "rgba(255, 26, 102, 0.03)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#ff1a66",
        pointBorderColor: "#0a0c16",
        pointBorderWidth: 1.5,
      },
      {
        label: "High",
        data: charts?.daily_counts?.high ?? [0, 0, 0, 0, 0, 0, 0],
        borderColor: "#ff9100",
        backgroundColor: "rgba(255, 145, 0, 0.02)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#ff9100",
        pointBorderColor: "#0a0c16",
        pointBorderWidth: 1.5,
      },
      {
        label: "Info",
        data: charts?.daily_counts?.info ?? [0, 0, 0, 0, 0, 0, 0],
        borderColor: "#00e5ff",
        backgroundColor: "rgba(0, 229, 255, 0.02)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#00e5ff",
        pointBorderColor: "#0a0c16",
        pointBorderWidth: 1.5,
      },
    ],
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Overview" />
        <div className="p-6"><SkeletonLoader rows={8} cols={4} /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <TopBar title="Overview" />
        <div className="p-6"><ErrorCard message={error} onRetry={fetchData} /></div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Overview" lastUpdated={lastUpdated} />
      <div className="p-6 space-y-4">

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Devices"
            value={stats?.total_devices ?? 0}
            subLabel={`${stats?.active_devices ?? 0} active`}
            accentColor="#00e5ff"
            icon={Cpu}
          />
          <StatCard
            label="Active Alerts"
            value={stats?.active_alerts ?? 0}
            subLabel="requires attention"
            accentColor="#ff1a66"
            subLabelColor={stats?.active_alerts > 0 ? "text-destructive font-bold animate-pulse" : "text-[#00e676]"}
            isCritical={stats?.active_alerts > 0}
            valueColor={stats?.active_alerts > 0 ? "text-destructive" : "text-[#00e676]"}
            icon={Bell}
          />
          <StatCard
            label="Events Today"
            value={stats?.events_today ?? 0}
            subLabel="last 24 hours"
            accentColor="#ff9100"
            icon={Shield}
          />
          <StatCard
            label="Chain Integrity"
            value={stats?.chain_valid ? "Valid" : "TAMPERED"}
            subLabel={`${stats?.total_blocks ?? 0} blocks`}
            accentColor={stats?.chain_valid ? "#00e676" : "#ff1a66"}
            subLabelColor={stats?.chain_valid ? "text-[#00e676] font-semibold" : "text-destructive font-bold"}
            isCritical={!stats?.chain_valid}
            valueColor={stats?.chain_valid ? "text-[#00e676]" : "text-destructive"}
            icon={Link}
          />
        </div>

        {/* ── LIVE EVENTS + DEVICE STATUS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Live Security Events */}
          <div className="soc-card p-5 border border-[#1e293b]">
            <div className="flex items-center justify-between mb-4 border-b border-[#1e293b] pb-3">
              <h2 className="text-xs font-bold text-foreground font-sans uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Live Security Events
              </h2>
              <button 
                onClick={() => navigate("/events")} 
                className="text-[10px] font-bold font-sans uppercase tracking-wider text-[#3b82f6] border border-[#2563eb]/20 rounded px-2.5 py-1 bg-[#2563eb]/5 hover:bg-[#2563eb] hover:text-white transition-all duration-150"
              >
                View All
              </button>
            </div>
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground font-sans uppercase py-4 text-center">No recent events logged</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {events.slice(0, 10).map((ev: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-sm py-2 border-b border-[#1e293b]/35 last:border-0 hover:bg-[#0f172a]/60 px-2 rounded transition-all duration-150">
                    <SeverityBadge severity={ev.severity} />
                    <span className="text-muted-foreground text-xs font-mono uppercase tracking-wider">{ev.event_type}</span>
                    <span className="font-mono text-[10px] font-bold text-[#3b82f6] bg-[#2563eb]/5 px-2 py-0.5 rounded border border-[#2563eb]/20">{ev.device_id || "—"}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground/60 whitespace-nowrap font-mono">{ev.timestamp_IST || ev.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Device Status */}
          <div className="soc-card p-5 border border-[#1e293b]">
            <div className="flex items-center justify-between mb-4 border-b border-[#1e293b] pb-3">
              <h2 className="text-xs font-bold text-foreground font-sans uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                Device Status
              </h2>
              <button 
                onClick={() => navigate("/devices")} 
                className="text-[10px] font-bold font-sans uppercase tracking-wider text-[#3b82f6] border border-[#2563eb]/20 rounded px-2.5 py-1 bg-[#2563eb]/5 hover:bg-[#2563eb] hover:text-white transition-all duration-150"
              >
                Register
              </button>
            </div>
            {devices.length === 0 ? (
              <p className="text-xs text-muted-foreground font-sans uppercase py-4 text-center">No devices registered</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {devices.slice(0, 10).map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-sm py-2.5 border-b border-[#1e293b]/35 last:border-0 hover:bg-[#0f172a]/60 px-2 rounded transition-all duration-150">
                    <span className="font-mono text-[10px] font-bold text-[#3b82f6] bg-[#2563eb]/5 px-2 py-0.5 rounded border border-[#2563eb]/20">{d.device_id}</span>
                    <StatusBadge status={d.status} />
                    <span className="ml-auto text-[10px] text-muted-foreground/60 font-mono">v{d.key_version}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── CHARTS ROW 1: Severity Bar + Event Type Doughnut ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Bar chart — severity breakdown */}
          <div className="soc-card p-5 border border-[#1e293b]">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Severity Distribution (Last 24h)
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-4 font-sans">
              {[
                { label: "Critical", value: charts?.severity_breakdown?.CRITICAL ?? 0, color: "#ff1a66" },
                { label: "High", value: charts?.severity_breakdown?.HIGH ?? 0, color: "#ff9100" },
                { label: "Medium", value: charts?.severity_breakdown?.MEDIUM ?? 0, color: "#ffd700" },
                { label: "Info", value: charts?.severity_breakdown?.INFO ?? 0, color: "#00e5ff" },
              ].map((l) => (
                <span key={l.label} className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase text-muted-foreground bg-slate-900 border border-[#1e293b] px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: l.color }} />
                  {l.label}: <span className="text-foreground font-semibold">{l.value}</span>
                </span>
              ))}
            </div>
            <div style={{ position: "relative", height: "180px" }}>
              <Bar
                data={severityData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false }, tooltip: { ...tooltipStyle } },
                  scales: { x: axisStyle, y: { ...axisStyle, beginAtZero: true } },
                }}
              />
            </div>
          </div>

          {/* Doughnut chart — event type breakdown */}
          <div className="soc-card p-5 border border-[#1e293b]">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Event Breakdown (Last 24h)
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-4 font-sans">
              {typeLabels.map((label: string, i: number) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase text-muted-foreground bg-slate-900 border border-[#1e293b] px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: typeColors[i] ?? "#484f58" }} />
                  {label.replace(/_/g, " ")}: <span className="text-foreground font-semibold">{typeValues[i] ?? 0}</span>
                </span>
              ))}
            </div>
            <div style={{ position: "relative", height: "180px" }}>
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: "65%",
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      ...tooltipStyle,
                      callbacks: {
                        label: (c: any) => ` ${c.label?.replace(/_/g, " ")}: ${c.raw}`,
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* ── CHART ROW 2: Weekly line chart full width ── */}
        <div className="soc-card p-5 border border-[#1e293b]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
              Threat Timeline (Last 7 Days)
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-2 font-sans">
              {[
                { label: "Critical", color: "#ff1a66" },
                { label: "High", color: "#ff9100" },
                { label: "Info", color: "#00e5ff" },
              ].map((l) => (
                <span key={l.label} className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase text-muted-foreground bg-slate-900 border border-[#1e293b] px-2 py-0.5 rounded">
                  <span className="w-2.5 h-0.5" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
          <div style={{ position: "relative", height: "180px" }}>
            <Line
              data={lineData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { ...tooltipStyle } },
                scales: {
                  x: { ...axisStyle, ticks: { ...axisStyle.ticks, autoSkip: false } },
                  y: { ...axisStyle, beginAtZero: true },
                },
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default OverviewPage;