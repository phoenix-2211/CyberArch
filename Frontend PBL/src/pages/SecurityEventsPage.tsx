import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import TopBar from "@/components/TopBar";
import SeverityBadge from "@/components/SeverityBadge";
import PaginationControls from "@/components/PaginationControls";
import SkeletonLoader from "@/components/SkeletonLoader";
import ErrorCard from "@/components/ErrorCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const EVENT_TYPES = [
  "LOGIN_FAIL", "LOGIN_SUCCESS", "AUTH_SUCCESS", "HMAC_MISMATCH",
  "NONCE_REPLAY_ATTEMPT", "INVALID_DEVICE", "DEVICE_REGISTERED",
  "KEY_ROTATION_INITIATED", "KEY_ROTATION_COMPLETED",
  "BLOCKCHAIN_TAMPER_DETECTED", "SOAR_ACTION_EXECUTED",
];

const SecurityEventsPage = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState("");
  const [eventType, setEventType] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const data = await api.getSecurityEvents(page, 50, severity, eventType);
      setEvents(data?.events || data?.data || []);
      setTotal(data?.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, severity, eventType]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const filteredEvents = search
    ? events.filter(
        (e) =>
          e.device_id?.toLowerCase().includes(search.toLowerCase()) ||
          e.ip_address?.includes(search)
      )
    : events;

  const criticalCount = events.filter((e) => e.severity === "CRITICAL").length;
  const highCount = events.filter((e) => e.severity === "HIGH").length;

  const clearFilters = () => {
    setSeverity("");
    setEventType("");
    setSearch("");
    setPage(1);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await api.exportSecurityEvents(severity, eventType);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err: any) {
      alert("Export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <TopBar title="Security Events" />
      <div className="p-6 space-y-4">

        {/* Mini stat bar */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-text-secondary">
            Total: <span className="text-foreground font-medium">{total}</span>
          </span>
          <span className="text-text-secondary">
            Critical: <span className="text-destructive font-medium">{criticalCount}</span>
          </span>
          <span className="text-text-secondary">
            High: <span className="text-warning font-medium">{highCount}</span>
          </span>
        </div>

        {/* Filters + Export button */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={severity}
            onValueChange={(v) => { setSeverity(v === "ALL" ? "" : v); setPage(1); }}
          >
            <SelectTrigger className="w-[160px] bg-secondary border-border">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="ALL">All Severity</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="INFO">Info</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={eventType}
            onValueChange={(v) => { setEventType(v === "ALL" ? "" : v); setPage(1); }}
          >
            <SelectTrigger className="w-[220px] bg-secondary border-border">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="ALL">All Types</SelectItem>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search device/IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-[200px] bg-secondary border-border"
            />
          </div>

          {(severity || eventType || search) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}

          {/* ── EXPORT CSV BUTTON ── */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
            className="ml-auto flex items-center gap-2 border-border bg-secondary hover:bg-card"
          >
            <Download className="h-4 w-4" />
            {exporting
              ? "Exporting..."
              : exportSuccess
              ? "✓ Downloaded!"
              : "Export CSV"}
          </Button>
        </div>

        {/* Export hint */}
        {(severity || eventType) && (
          <p className="text-xs text-muted-foreground">
            Export will apply current filters ({[severity, eventType].filter(Boolean).join(", ")})
          </p>
        )}

        {loading ? (
          <SkeletonLoader rows={10} cols={6} />
        ) : error ? (
          <ErrorCard message={error} onRetry={fetchEvents} />
        ) : filteredEvents.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-text-secondary">No security events found</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary text-left">
                  <th className="px-4 py-3 font-medium w-8">#</th>
                  <th className="px-4 py-3 font-medium">Severity</th>
                  <th className="px-4 py-3 font-medium">Event Type</th>
                  <th className="px-4 py-3 font-medium">Device ID</th>
                  <th className="px-4 py-3 font-medium">IP Address</th>
                  <th className="px-4 py-3 font-medium">Message</th>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev: any, i: number) => (
                  <tr
                    key={ev.id || i}
                    className={cn(
                      "border-b border-border last:border-0",
                      ev.severity === "CRITICAL" && "border-l-2 border-l-destructive"
                    )}
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {(page - 1) * 50 + i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={ev.severity} />
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{ev.event_type}</td>
                    <td className="px-4 py-3 font-mono text-foreground">
                      {ev.device_id || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-text-secondary">
                      {ev.ip_address || "—"}
                    </td>
                    <td className="px-4 py-3 text-text-secondary max-w-[200px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate block cursor-default">
                            {ev.message?.length > 60
                              ? ev.message.slice(0, 60) + "..."
                              : ev.message}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm bg-card border-border">
                          <p className="text-sm">{ev.message}</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {ev.timestamp_IST || ev.timestamp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 pb-3">
              <PaginationControls
                page={page}
                perPage={50}
                total={total}
                onPageChange={setPage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityEventsPage;