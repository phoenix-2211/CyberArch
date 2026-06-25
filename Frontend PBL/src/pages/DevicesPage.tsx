import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import TopBar from "@/components/TopBar";
import StatusBadge from "@/components/StatusBadge";
import PaginationControls from "@/components/PaginationControls";
import ConfirmDialog from "@/components/ConfirmDialog";
import SkeletonLoader from "@/components/SkeletonLoader";
import ErrorCard from "@/components/ErrorCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Loader2, Eye, EyeOff, ShieldOff, ShieldCheck, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DevicesPage = () => {
  const { toast } = useToast();
  const [devices, setDevices] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Register modal
  const [showRegister, setShowRegister] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState("");
  const [newSecretKey, setNewSecretKey] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");

  // Unlock confirm
  const [unlockTarget, setUnlockTarget] = useState<any>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Revoke confirm
  const [revokeTarget, setRevokeTarget] = useState<any>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Grant Access modal
  const [grantTarget, setGrantTarget] = useState<any>(null);
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantResult, setGrantResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const fetchDevices = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const data = await api.getDevices(page, 50);
      setDevices(data?.devices || data?.data || []);
      setTotal(data?.total || data?.devices?.length || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const filteredDevices = search
    ? devices.filter((d) => d.device_id?.toLowerCase().includes(search.toLowerCase()))
    : devices;

  // ── Register ──
  const handleRegister = async () => {
    setRegisterError("");
    setRegisterLoading(true);
    try {
      await api.registerDevice(newDeviceId, newSecretKey);
      toast({ title: "Device registered successfully" });
      setShowRegister(false);
      setNewDeviceId("");
      setNewSecretKey("");
      fetchDevices();
    } catch (err: any) {
      setRegisterError(err.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  // ── Unlock ──
  const handleUnlock = async () => {
    if (!unlockTarget) return;
    setUnlockLoading(true);
    try {
      await api.unlockDevice(unlockTarget.device_id);
      toast({ title: `Device ${unlockTarget.device_id} unlocked` });
      setUnlockTarget(null);
      fetchDevices();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setUnlockLoading(false);
    }
  };

  // ── Revoke ──
  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevokeLoading(true);
    try {
      await api.revokeDevice(revokeTarget.device_id);
      toast({ title: `Access revoked for ${revokeTarget.device_id}` });
      setRevokeTarget(null);
      fetchDevices();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setRevokeLoading(false);
    }
  };

  // ── Grant Access ──
  const handleGrant = async () => {
    if (!grantTarget) return;
    setGrantLoading(true);
    try {
      const result = await api.grantDevice(grantTarget.device_id);
      setGrantResult(result);
      fetchDevices();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
      setGrantTarget(null);
    } finally {
      setGrantLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (grantResult?.new_secret) {
      navigator.clipboard.writeText(grantResult.new_secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeGrantModal = () => {
    setGrantTarget(null);
    setGrantResult(null);
    setCopied(false);
  };

  // Determine which action buttons to show per device
  const getActions = (d: any) => {
    const status = d.status?.toUpperCase();
    return {
      showUnlock: status === "LOCKED",
      showRevoke: status === "ACTIVE" || status === "LOCKED",
      showGrant: status === "LOCKED",
      isActive: status === "ACTIVE",
    };
  };

  return (
    <div className="min-h-screen pb-10">
      <TopBar title="Registered IoT Terminals" />
      <div className="p-6 space-y-5">
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#0a0c16]/50 border border-[#1d223c]/50 rounded-lg p-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter by Terminal ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 cyber-input font-mono text-xs py-4"
            />
          </div>
          <Button 
            onClick={() => setShowRegister(true)} 
            size="sm"
            className="cyber-btn-primary h-8 px-4 text-[10px] font-bold uppercase tracking-wider font-mono shrink-0"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            REGISTER NEW NODE
          </Button>
        </div>

        {loading ? (
          <SkeletonLoader rows={8} cols={5} />
        ) : error ? (
          <ErrorCard message={error} onRetry={fetchDevices} />
        ) : filteredDevices.length === 0 ? (
          <div className="soc-card border border-border/50 p-12 text-center">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">NO TERMINALS LOCATED</p>
          </div>
        ) : (
          <div className="soc-card border border-[#1d223c]/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0e111e]/90 border-b border-[#1d223c]/80 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/80">
                    <th className="px-5 py-4 font-bold">Node ID</th>
                    <th className="px-5 py-4 font-bold">Security Status</th>
                    <th className="px-5 py-4 font-bold">Key Spec</th>
                    <th className="px-5 py-4 font-bold">Registration Epoch</th>
                    <th className="px-5 py-4 font-bold text-right">Access Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevices.map((d: any) => {
                    const { showUnlock, showRevoke, showGrant, isActive } = getActions(d);
                    return (
                      <tr key={d.device_id} className="border-b border-[#1d223c]/30 last:border-0 hover:bg-primary/[0.02] transition-all duration-150">
                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-foreground">{d.device_id}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={d.status} /></td>
                        <td className="px-5 py-3.5 text-muted-foreground text-xs font-mono">v{d.key_version}</td>
                        <td className="px-5 py-3.5 text-muted-foreground/75 text-xs font-mono">{d.created_at}</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2 flex-wrap">

                            {/* ACTIVE — only show Revoke */}
                            {isActive && (
                              <Button
                                variant="outline" size="sm"
                                onClick={() => setRevokeTarget(d)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider h-7 px-3 text-destructive border-destructive/30 bg-destructive/5 hover:bg-destructive/15 transition-all duration-200"
                              >
                                <ShieldOff className="h-3.5 w-3.5" />
                                <span>REVOKE</span>
                              </Button>
                            )}

                            {/* LOCKED — show Unlock, Grant Access, Revoke */}
                            {showUnlock && (
                              <Button
                                variant="outline" size="sm"
                                onClick={() => setUnlockTarget(d)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider h-7 px-3 text-warning border-warning/30 bg-warning/5 hover:bg-warning/15 transition-all duration-200"
                              >
                                <span>UNLOCK</span>
                              </Button>
                            )}

                            {showGrant && (
                              <Button
                                variant="outline" size="sm"
                                onClick={() => { setGrantTarget(d); setGrantResult(null); }}
                                className="inline-flex items-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider h-7 px-3 text-[#00e676] border-[#00e676]/30 bg-[#00e676]/5 hover:bg-[#00e676]/15 transition-all duration-200"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span>GRANT</span>
                              </Button>
                            )}

                            {showRevoke && !isActive && (
                              <Button
                                variant="outline" size="sm"
                                onClick={() => setRevokeTarget(d)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider h-7 px-3 text-destructive border-destructive/30 bg-destructive/5 hover:bg-destructive/15 transition-all duration-200"
                              >
                                <ShieldOff className="h-3.5 w-3.5" />
                                <span>REVOKE</span>
                              </Button>
                            )}

                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-[#1d223c]/40 bg-[#070911]/50">
              <PaginationControls page={page} perPage={50} total={total} onPageChange={setPage} />
            </div>
          </div>
        )}
      </div>

      {/* ── REGISTER DEVICE MODAL ── */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="soc-card border border-[#1e293b] p-6 max-w-md bg-[#0a0c16]/95 backdrop-blur-xl">
          <DialogHeader className="border-b border-[#1e293b]/50 pb-3">
            <DialogTitle className="text-sm font-bold font-sans uppercase tracking-wider text-foreground">
              Register IoT Device Node
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground/80">Device ID</Label>
              <Input
                value={newDeviceId}
                onChange={(e) => setNewDeviceId(e.target.value)}
                placeholder="e.g. ESP32_001"
                className="cyber-input font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground/80">HMAC Secret Key</Label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={newSecretKey}
                  onChange={(e) => setNewSecretKey(e.target.value)}
                  placeholder="Enter secret key..."
                  className="cyber-input font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {registerError && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 rounded-md font-mono">
                ERR_REG: {registerError}
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-[#1e293b]/50 pt-4 flex gap-2">
            <Button variant="outline" onClick={() => setShowRegister(false)} className="border-border text-foreground hover:bg-accent/40 font-mono text-xs h-8">
              CANCEL
            </Button>
            <Button 
              onClick={handleRegister} 
              disabled={registerLoading || !newDeviceId || !newSecretKey}
              className="cyber-btn-primary font-mono text-xs uppercase h-8"
            >
              {registerLoading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              REGISTER NODE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── GRANT ACCESS MODAL ── */}
      {grantTarget && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !grantLoading) closeGrantModal(); }}
        >
          <div className="soc-card p-6 w-full max-w-md border border-[#1e293b] bg-[#0a0c16]/95 backdrop-blur-xl">

            {/* Header */}
            <div className="flex items-center gap-2 mb-4 border-b border-[#1e293b]/50 pb-3">
              <ShieldCheck className="h-5 w-5 text-[#00e676]" />
              <h2 className="text-sm font-bold text-foreground font-sans uppercase tracking-wider">Grant Access & Refresh Keys</h2>
            </div>

            {/* Before grant — confirmation */}
            {!grantResult && (
              <>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider mb-2">
                  System will generate new keys for:
                </p>
                <div className="bg-[#0c0f1d] border border-[#1e293b] rounded-lg p-3 mb-4">
                  <span className="font-mono text-xs font-bold text-foreground uppercase">{grantTarget.device_id}</span>
                  <span className="text-[10px] text-muted-foreground/60 ml-3 font-mono">current: v{grantTarget.key_version}</span>
                </div>
                <div className="bg-[#00e676]/5 border border-[#00e676]/20 rounded-lg p-4 mb-5">
                  <p className="text-[10px] text-[#00e676] font-extrabold uppercase font-mono tracking-wider mb-1.5">Action Protocol:</p>
                  <ul className="text-[10px] text-muted-foreground/80 space-y-1 list-disc list-inside font-mono">
                    <li>Generate new cryptographic HMAC key (v{grantTarget.key_version + 1})</li>
                    <li>Update node status record to ACTIVE</li>
                    <li>Commit status change block to Blockchain Ledger</li>
                    <li>Flash key configuration to client firmware</li>
                  </ul>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 border-[#1e293b] text-foreground hover:bg-accent/40 font-mono text-xs h-8" onClick={closeGrantModal} disabled={grantLoading}>
                    CANCEL
                  </Button>
                  <Button
                    className="flex-1 bg-[#00e676] hover:bg-[#00c853] text-[#04050a] font-mono text-xs font-bold uppercase h-8 rounded"
                    onClick={handleGrant}
                    disabled={grantLoading}
                  >
                    {grantLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> GENERATING...</>
                    ) : (
                      "CONFIRM GRANT"
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* After grant — show new key */}
            {grantResult && (
              <>
                <div className="bg-[#00e676]/10 border border-[#00e676]/30 rounded-lg p-3.5 mb-4">
                  <p className="text-xs text-[#00e676] font-bold font-mono uppercase tracking-wider mb-1">Access Protocol Complete</p>
                  <p className="text-[10px] text-muted-foreground/90 font-mono">Key upgraded to version v{grantResult.new_key_version}. Ledger block appended successfully.</p>
                </div>

                <p className="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-widest mb-2">
                  New Cryptographic Key (HMAC Secret)
                </p>
                <div className="bg-[#0c0f1d] border border-[#1e293b] rounded-lg p-3.5 mb-2.5 flex items-center gap-3">
                  <code className="font-mono text-xs text-foreground flex-1 word-break-all select-all font-bold">
                    {grantResult.new_secret}
                  </code>
                  <button
                    onClick={handleCopyKey}
                    className="flex-shrink-0 p-1.5 rounded bg-[#0a0c16] border border-[#1e293b] hover:border-primary/45 hover:text-primary transition-all"
                    title="Copy Key"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-[#00e676]" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>

                <div className="bg-destructive/5 border border-destructive/25 rounded-lg p-3.5 mb-5 text-[10px] text-destructive/90 font-mono">
                  <p className="font-bold uppercase mb-1">⚠ SECURITY WARNING</p>
                  <p className="leading-relaxed">This token is generated once and cannot be recovered. Flash it to the IoT device hardware now. Closing this dialog destroys the cache.</p>
                </div>

                <Button className="w-full bg-accent hover:bg-accent/80 border border-border text-foreground font-mono text-xs h-9" onClick={closeGrantModal}>
                  DONE — KEY SAFELY COPIED
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── UNLOCK CONFIRM ── */}
      <ConfirmDialog
        open={!!unlockTarget}
        title="Unlock Device"
        description={`Unlock "${unlockTarget?.device_id}"? The device will resume using its existing key. No firmware changes needed.`}
        onConfirm={handleUnlock}
        onCancel={() => setUnlockTarget(null)}
        loading={unlockLoading}
      />

      {/* ── REVOKE CONFIRM ── */}
      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke Device Access"
        description={`Permanently revoke access for "${revokeTarget?.device_id}"? This will lock the device and record a REVOKED block in the blockchain. The device cannot authenticate until Grant Access is used.`}
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
        loading={revokeLoading}
      />
    </div>
  );
};

export default DevicesPage;