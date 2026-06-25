import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import TopBar from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  KeyRound, 
  Database, 
  Download, 
  RefreshCw, 
  ShieldAlert, 
  X,
  CheckCircle,
  AlertTriangle,
  Sliders,
  Cpu,
  SlidersHorizontal,
  Palette,
  Check,
  HelpCircle
} from "lucide-react";

const SettingsPage = () => {
  const { toast } = useToast();
  const { isAdmin, logout } = useAuth();

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // System Configuration fields (Admin)
  const [activeModel, setActiveModel] = useState("llama3");
  const [ollamaHost, setOllamaHost] = useState("http://127.0.0.1:11434");
  const [bruteForceLimit, setBruteForceLimit] = useState(5);
  const [deviceFloodLimit, setDeviceFloodLimit] = useState(10);
  const [hmacFailureLimit, setHmacFailureLimit] = useState(5);
  const [theme, setTheme] = useState("deep-slate-soc");
  const [ollamaThreads, setOllamaThreads] = useState(2);
  
  // Ollama status
  const [isInstalled, setIsInstalled] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [pullModelName, setPullModelName] = useState("");
  const [pullLoading, setPullLoading] = useState(false);

  // Loaders
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  // Reset Modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Platform Environment config (cypherguard.json)
  const [sysConfig, setSysConfig] = useState<any>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // Fetch settings & system config on mount
  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      const data = await api.getSettingsConfig();
      setActiveModel(data.active_model || "llama3");
      setOllamaHost(data.ollama_host || "http://127.0.0.1:11434");
      setBruteForceLimit(data.brute_force_limit || 5);
      setDeviceFloodLimit(data.device_flood_limit || 10);
      setHmacFailureLimit(data.hmac_failure_limit || 5);
      setTheme(data.theme || "deep-slate-soc");
      setOllamaThreads(data.ollama_threads || 2);
      setIsInstalled(data.is_installed);
      setIsRunning(data.is_running);
      setAvailableModels(data.models || []);
    } catch (err: any) {
      toast({ title: "Failed to load settings configuration", description: err.message, variant: "destructive" });
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchSysConfig = async () => {
    try {
      setConfigLoading(true);
      const data = await api.getSystemConfig();
      setSysConfig(data);
    } catch (err: any) {
      console.error("Failed to load platform config:", err.message);
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    fetchSysConfig();
    if (isAdmin) {
      fetchSettings();
    } else {
      setSettingsLoading(false);
    }
  }, [isAdmin]);

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "New passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "New password must be at least 8 characters long", variant: "destructive" });
      return;
    }

    setPwLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      toast({ 
        title: "Success", 
        description: "Password updated successfully.",
        className: "bg-emerald-950 border-emerald-500 text-emerald-300"
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: err.message || "Failed to update password", variant: "destructive" });
    } finally {
      setPwLoading(false);
    }
  };

  // Save Settings Config
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      await api.saveSettingsConfig({
        active_model: activeModel,
        ollama_host: ollamaHost,
        brute_force_limit: Number(bruteForceLimit),
        device_flood_limit: Number(deviceFloodLimit),
        hmac_failure_limit: Number(hmacFailureLimit),
        theme: theme,
        ollama_threads: Number(ollamaThreads)
      });
      toast({
        title: "Configuration Saved",
        description: "Technical parameters updated successfully.",
        className: "bg-emerald-950 border-emerald-500 text-emerald-300"
      });
      // Refresh status and model listing
      fetchSettings();
    } catch (err: any) {
      toast({ title: "Failed to save configuration", description: err.message, variant: "destructive" });
    } finally {
      setSaveLoading(false);
    }
  };

  // Pull Ollama Model
  const handlePullModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pullModelName.trim()) return;
    setPullLoading(true);
    try {
      await api.pullOllamaModel(pullModelName.trim());
      toast({
        title: "Pull Initiated",
        description: `Pulling model '${pullModelName}' in background. Check Security Events for logs.`,
        className: "bg-[#090e1a] border-primary/45 text-primary"
      });
      setPullModelName("");
    } catch (err: any) {
      toast({ title: "Failed to initiate model pull", description: err.message, variant: "destructive" });
    } finally {
      setPullLoading(false);
    }
  };

  // Handle backup download
  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      await api.backupDatabase();
      toast({ 
        title: "Backup Downloaded", 
        description: "Database copy downloaded successfully.",
        className: "bg-emerald-950 border-emerald-500 text-emerald-300" 
      });
    } catch (err: any) {
      toast({ title: err.message || "Failed to download database backup", variant: "destructive" });
    } finally {
      setBackupLoading(false);
    }
  };

  // Handle system reset
  const handleReset = async () => {
    if (resetConfirmText !== "RESET SYSTEM") {
      toast({ title: "Confirmation text does not match", variant: "destructive" });
      return;
    }

    setResetLoading(true);
    try {
      await api.resetDatabase();
      toast({ 
        title: "System Reset Successful", 
        description: "Wiped all data and seeded demo events. Logging out...",
        className: "bg-rose-950 border-rose-500 text-rose-300"
      });
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (err: any) {
      toast({ title: err.message || "Failed to reset system data", variant: "destructive" });
      setResetLoading(false);
    }
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetConfirmText("");
  };

  return (
    <div className="min-h-screen pb-10">
      <TopBar title="System Configuration & Profile Settings" />
      
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {settingsLoading ? (
          <div className="soc-card p-12 bg-[#090e1a] border border-[#1e293b] text-center font-mono text-sm text-muted-foreground animate-pulse">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
            Loading SOC platform configuration parameters...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* ── LEFT COLUMN: USER & SIEM ── */}
            <div className="space-y-6 flex flex-col">
              
              {/* Profile Card */}
              <div className="soc-card p-6 bg-[#090e1a] border border-[#1e293b] flex-1">
                <div className="flex items-center gap-2.5 text-primary font-mono text-xs font-bold uppercase tracking-wider mb-5 border-b border-[#1e293b]/60 pb-3">
                  <KeyRound className="h-4.5 w-4.5" />
                  Profile Settings
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-foreground mb-1">Change Password</h2>
                    <p className="text-sm text-muted-foreground/80">
                      Update your account security credentials. The new password must be at least 8 characters long.
                    </p>
                  </div>

                  <form onSubmit={handlePasswordChange} className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 font-mono tracking-wider uppercase">
                        Current Password
                      </label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="cyber-input font-mono text-sm py-5 px-3"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 font-mono tracking-wider uppercase">
                        New Password
                      </label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="cyber-input font-mono text-sm py-5 px-3"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 font-mono tracking-wider uppercase">
                        Confirm New Password
                      </label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="cyber-input font-mono text-sm py-5 px-3"
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={pwLoading}
                      className="w-full cyber-btn-primary font-mono text-sm py-5 mt-2 flex items-center justify-center gap-2"
                    >
                      {pwLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Updating Credentials...
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-4 w-4" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </div>

              {/* SIEM Rules Parameters (Admin Only) */}
              {isAdmin && (
                <div className="soc-card p-6 bg-[#090e1a] border border-[#1e293b]">
                  <div className="flex items-center gap-2.5 text-primary font-mono text-xs font-bold uppercase tracking-wider mb-5 border-b border-[#1e293b]/60 pb-3">
                    <SlidersHorizontal className="h-4.5 w-4.5" />
                    SIEM Rule Parameters
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-extrabold text-foreground mb-1">Threat Thresholds</h2>
                      <p className="text-sm text-muted-foreground/80">
                        Adjust the number of raw events required to trigger automated alerts and SOAR actions.
                      </p>
                    </div>

                    <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-semibold text-slate-300 font-mono tracking-wider uppercase">
                            Brute Force Login Limit
                          </label>
                          <span className="text-xs font-mono text-muted-foreground">Failures / 2 mins</span>
                        </div>
                        <Input
                          type="number"
                          value={bruteForceLimit}
                          onChange={(e) => setBruteForceLimit(Number(e.target.value))}
                          className="cyber-input font-mono text-sm py-5 px-3"
                          min={1}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-semibold text-slate-300 font-mono tracking-wider uppercase">
                            Device Enumeration Flood Limit
                          </label>
                          <span className="text-xs font-mono text-muted-foreground">Invalid requests / 5 mins</span>
                        </div>
                        <Input
                          type="number"
                          value={deviceFloodLimit}
                          onChange={(e) => setDeviceFloodLimit(Number(e.target.value))}
                          className="cyber-input font-mono text-sm py-5 px-3"
                          min={1}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-semibold text-slate-300 font-mono tracking-wider uppercase">
                            HMAC Mismatch Failure Limit
                          </label>
                          <span className="text-xs font-mono text-muted-foreground">Mismatches / 3 mins</span>
                        </div>
                        <Input
                          type="number"
                          value={hmacFailureLimit}
                          onChange={(e) => setHmacFailureLimit(Number(e.target.value))}
                          className="cyber-input font-mono text-sm py-5 px-3"
                          min={1}
                          required
                        />
                      </div>

                      <Button 
                        type="submit" 
                        disabled={saveLoading}
                        className="w-full bg-[#1e293b] hover:bg-[#334155] border border-border text-foreground font-mono text-sm py-5 mt-2 flex items-center justify-center gap-2 transition-all"
                      >
                        {saveLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Saving Settings...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 text-emerald-400" />
                            Save SIEM Parameters
                          </>
                        )}
                      </Button>
                    </form>
                  </div>
                </div>
              )}

            </div>

            {/* ── RIGHT COLUMN: AI CONFIG, THEME & SYSTEM MAINTENANCE ── */}
            <div className="space-y-6 flex flex-col justify-between">
              
              {/* AI & Ollama settings (Admin Only) */}
              {isAdmin && (
                <div className="soc-card p-6 bg-[#090e1a] border border-[#1e293b] flex-1">
                  <div className="flex items-center gap-2.5 text-primary font-mono text-xs font-bold uppercase tracking-wider mb-5 border-b border-[#1e293b]/60 pb-3">
                    <Cpu className="h-4.5 w-4.5" />
                    AI & Ollama Configuration
                  </div>

                  <div className="space-y-5">
                    <div className="flex items-center justify-between bg-[#0a0f1d] border border-[#1e293b]/60 p-4 rounded-lg">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Ollama Command</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">CLI environment state</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${
                        isInstalled 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}>
                        {isInstalled ? "INSTALLED" : "MISSING"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-[#0a0f1d] border border-[#1e293b]/60 p-4 rounded-lg">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Ollama Service Status</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Local API reachability</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${
                        isRunning 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}>
                        {isRunning ? "RUNNING / ONLINE" : "OFFLINE / UNREACHABLE"}
                      </span>
                    </div>

                    <form onSubmit={handleSaveSettings} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300 font-mono tracking-wider uppercase">
                          Ollama Service Host
                        </label>
                        <Input
                          type="text"
                          value={ollamaHost}
                          onChange={(e) => setOllamaHost(e.target.value)}
                          className="cyber-input font-mono text-sm py-5 px-3"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300 font-mono tracking-wider uppercase">
                          Active AI Model
                        </label>
                        <select
                          value={activeModel}
                          onChange={(e) => setActiveModel(e.target.value)}
                          className="cyber-input font-mono text-sm py-2.5 px-3 w-full bg-[#0d1527] border border-[#1e293b] rounded focus:border-[#2563eb] focus:outline-none"
                        >
                          {availableModels.length > 0 ? (
                            availableModels.map((m) => (
                              <option key={m} value={m.split(":")[0]}>
                                {m}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="llama3">llama3 (Default)</option>
                              <option value="mistral">mistral</option>
                              <option value="llama2">llama2</option>
                              <option value="codellama">codellama</option>
                            </>
                          )}
                        </select>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Currently configured active model is matched against locally pulled models.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-semibold text-slate-300 font-mono tracking-wider uppercase">
                            Ollama CPU Threads limit
                          </label>
                          <span className="text-xs font-mono text-muted-foreground">{ollamaThreads} threads</span>
                        </div>
                        <Input
                          type="number"
                          value={ollamaThreads}
                          onChange={(e) => setOllamaThreads(Number(e.target.value))}
                          className="cyber-input font-mono text-sm py-5 px-3"
                          min={1}
                          max={32}
                          required
                        />
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Lower values (e.g. 1 or 2) reduce CPU load to prevent your processor from overheating.
                        </p>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={saveLoading}
                        className="w-full cyber-btn-primary font-mono text-sm py-5 flex items-center justify-center gap-2"
                      >
                        {saveLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Saving AI Config...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Save AI Configuration
                          </>
                        )}
                      </Button>
                    </form>

                    {/* Pull model form */}
                    <div className="border-t border-[#1e293b]/60 pt-4 mt-4">
                      <form onSubmit={handlePullModel} className="space-y-3">
                        <label className="text-xs font-semibold text-slate-300 font-mono tracking-wider uppercase">
                          Pull New Model
                        </label>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="e.g. mistral, llama2"
                            value={pullModelName}
                            onChange={(e) => setPullModelName(e.target.value)}
                            className="cyber-input font-mono text-sm py-5 px-3 flex-1"
                          />
                          <Button
                            type="submit"
                            disabled={pullLoading || !pullModelName.trim()}
                            className="bg-[#1e293b] hover:bg-[#334155] border border-border text-foreground font-mono text-sm px-4 flex items-center justify-center gap-1.5"
                          >
                            {pullLoading ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              "Pull"
                            )}
                          </Button>
                        </div>
                      </form>
                    </div>

                  </div>
                </div>
              )}

              {/* Theme Settings (Admin Only) */}
              {isAdmin && (
                <div className="soc-card p-6 bg-[#090e1a] border border-[#1e293b]">
                  <div className="flex items-center gap-2.5 text-primary font-mono text-xs font-bold uppercase tracking-wider mb-5 border-b border-[#1e293b]/60 pb-3">
                    <Palette className="h-4.5 w-4.5" />
                    Theme Management
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 font-mono tracking-wider uppercase">
                        Select Interface Theme
                      </label>
                      <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="cyber-input font-mono text-sm py-2.5 px-3 w-full bg-[#0d1527] border border-[#1e293b] rounded focus:border-[#2563eb] focus:outline-none"
                      >
                        <option value="deep-slate-soc">Deep Slate SOC (Dark Mode)</option>
                        <option value="cyberpunk-glow" disabled>Cyberpunk Neon Glow (Disabled)</option>
                        <option value="enterprise-light" disabled>Enterprise Light Mode (Disabled)</option>
                      </select>
                      <p className="text-xs text-muted-foreground/80 mt-1">
                        Deep Slate SOC theme uses Outfit typography for high-density corporate readability and JetBrains Mono for system metrics.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* System Maintenance */}
              {isAdmin ? (
                <div className="soc-card p-6 bg-[#090e1a] border border-[#1e293b] space-y-6">
                  
                  {/* Database Backup */}
                  <div>
                    <div className="flex items-center gap-2.5 text-primary font-mono text-xs font-bold uppercase tracking-wider mb-4 border-b border-[#1e293b]/60 pb-3">
                      <Database className="h-4.5 w-4.5" />
                      Platform Backups
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground/80">
                        Download a complete copy of the SQL database. Contains devices, registered users, nonces, blocks, and event logs.
                      </p>

                      <Button
                        onClick={handleBackup}
                        disabled={backupLoading}
                        variant="outline"
                        className="w-full bg-[#1e293b] hover:bg-[#334155] border-border text-foreground font-mono text-sm py-5 flex items-center justify-center gap-2 transition-all"
                      >
                        {backupLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Generating Backup...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            Download Backup File
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Danger Zone (Reset Database) */}
                  <div className="border-t border-[#3b0712] pt-5">
                    <div className="flex items-center gap-2 text-rose-500 font-mono text-xs font-bold uppercase tracking-wider mb-3">
                      <ShieldAlert className="h-4.5 w-4.5" />
                      Danger Zone
                    </div>
                    
                    <div className="bg-[#1c0a0f] border border-[#4c101b] rounded-lg p-4 space-y-3">
                      <div>
                        <h3 className="text-base font-bold text-rose-400">Reset Platform Data</h3>
                        <p className="text-xs text-rose-300/70 mt-1">
                          Drop and recreate all database tables, clear reports, and automatically seed ~45 baseline demo logs for charts.
                        </p>
                      </div>

                      <Button
                        onClick={() => setShowResetModal(true)}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white border-none font-mono text-sm py-5 flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reset System Data
                      </Button>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="soc-card p-6 bg-[#090e1a] border border-[#1e293b] flex items-center justify-center h-full text-center">
                  <div className="space-y-2 py-8">
                    <ShieldAlert className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                    <h3 className="text-sm font-bold text-muted-foreground/60 font-mono">Administrative Settings Restricted</h3>
                    <p className="text-xs text-muted-foreground/40 max-w-xs mx-auto">
                      Only system administrators have permission to download database backups or trigger platform data wipes.
                    </p>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

        {/* ── SYSTEM ENVIRONMENT CONFIGURATION (FULL WIDTH BELOW) ── */}
        <div className="soc-card p-6 bg-[#090e1a] border border-[#1e293b] mt-6">
          <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider mb-4 border-b border-[#1e293b]/60 pb-3">
            <Sliders className="h-4.5 w-4.5" />
            Platform Environment Configuration (cypherguard.json)
          </div>
          
          {configLoading ? (
            <div className="text-sm font-mono text-muted-foreground animate-pulse py-4 text-center">
              Retrieving environment settings...
            </div>
          ) : sysConfig ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: "Installation Directory", value: sysConfig.install_dir },
                { label: "Backend Source Path", value: sysConfig.backend_dir },
                { label: "Frontend Source Path", value: sysConfig.frontend_dir },
                { label: "Ollama Models Path", value: sysConfig.ollama_models },
                { label: "Platform Version", value: `v${sysConfig.version}`, color: "#10b981" }
              ].map((item, idx) => (
                <div key={idx} className="bg-[#0b0e17] border border-[#1e293b]/50 p-4 rounded-lg">
                  <div className="text-[10px] font-mono font-bold uppercase text-muted-foreground mb-1.5">{item.label}</div>
                  <div 
                    className="text-sm font-semibold truncate font-mono text-foreground"
                    style={{ color: item.color }}
                  >
                    {item.value || "N/A"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm font-mono text-rose-400 py-4 text-center">
              Error: Could not retrieve system configuration file. Make sure the backend server is running.
            </div>
          )}
        </div>

      </div>

      {/* ── CUSTOM CONFIRMATION MODAL ── */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="soc-card bg-[#0b0e14] border border-rose-500/30 max-w-md w-full p-6 space-y-4 shadow-[0_0_50px_rgba(239,68,68,0.15)] relative">
            <button 
              onClick={closeResetModal}
              className="absolute right-4 top-4 p-1 rounded-md text-muted-foreground hover:bg-[#1e293b] hover:text-foreground transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#3b0712] pb-3 text-rose-500">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h2 className="text-lg font-bold font-mono uppercase tracking-wider">Dangerous Operation</h2>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-foreground">
                You are about to trigger a factory reset of the secure IoT environment. This will:
              </p>
              <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                <li>Permanently wipe all users, devices, key records, and logs.</li>
                <li>Clean and remove all generated incident reports.</li>
                <li>Seed the default admin account (<code className="text-primary font-mono font-bold">admin / admin123</code>).</li>
                <li>Populate charts with 45 baseline mock events.</li>
              </ul>
              <p className="text-sm text-rose-400 font-bold mt-2">
                To confirm, please type <span className="font-mono text-white bg-[#4c101b] px-1.5 py-0.5 rounded font-extrabold select-none">RESET SYSTEM</span> below.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Input
                type="text"
                placeholder="Type RESET SYSTEM to confirm"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                className="cyber-input font-mono text-sm text-center border-rose-500/20 focus:border-rose-500 py-5"
              />

              <div className="flex gap-2">
                <Button 
                  onClick={closeResetModal}
                  disabled={resetLoading}
                  className="flex-1 bg-secondary hover:bg-secondary/80 border-border text-foreground font-mono text-sm py-5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReset}
                  disabled={resetLoading || resetConfirmText !== "RESET SYSTEM"}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-mono text-sm py-5 flex items-center justify-center gap-1.5"
                >
                  {resetLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Confirm Reset
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
