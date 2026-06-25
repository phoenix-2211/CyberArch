import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import TopBar from "@/components/TopBar";
import ConfirmDialog from "@/components/ConfirmDialog";
import SkeletonLoader from "@/components/SkeletonLoader";
import ErrorCard from "@/components/ErrorCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus, X, Eye, EyeOff, Search, KeyRound,
  Users, ShieldCheck, UserCheck, UserX, Trash2,
  LayoutGrid, Cpu, Shield, Bell, Zap, Link,
  BrainCircuit, CheckSquare, Square,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── All available tabs ───────────────────────────────────────────────────────

const ALL_TABS = [
  { id: "overview",    label: "Overview",        icon: LayoutGrid  },
  { id: "devices",     label: "Devices",          icon: Cpu         },
  { id: "events",      label: "Security Events",  icon: Shield      },
  { id: "alerts",      label: "Alerts",           icon: Bell        },
  { id: "soar",        label: "SOAR Actions",     icon: Zap         },
  { id: "blockchain",  label: "Blockchain",       icon: Link        },
  { id: "ai-analysis", label: "AI Analysis",      icon: BrainCircuit },
];

// Admin always gets everything — we only show the picker for non-admin roles
const DEFAULT_TABS_FOR_ROLE = (role: string): string[] => {
  if (role === "admin")  return ALL_TABS.map((t) => t.id);
  if (role === "user")   return ["overview", "devices", "events", "alerts"];
  return ["overview"]; // viewer default
};

// ─── Component ────────────────────────────────────────────────────────────────

const UsersPage = () => {
  const { toast } = useToast();
  const { isAdmin, username: currentUser } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers]   = useState<any[]>([]);
  const [stats, setStats]   = useState({ total: 0, admins: 0, active: 0, disabled: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Modals
  const [disableTarget, setDisableTarget] = useState<any>(null);
  const [disableLoading, setDisableLoading] = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Add user modal
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [newUsername,   setNewUsername]   = useState("");
  const [newPassword,   setNewPassword]   = useState("");
  const [newRole,       setNewRole]       = useState("viewer");
  const [showPassword,  setShowPassword]  = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError,   setCreateError]   = useState("");
  // Tab-permission checkboxes
  const [allowedTabs,   setAllowedTabs]   = useState<string[]>(DEFAULT_TABS_FOR_ROLE("viewer"));

  // Reset password modal
  const [resetTarget,       setResetTarget]       = useState<any>(null);
  const [resetPassword,     setResetPassword]     = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading,      setResetLoading]      = useState(false);
  const [resetError,        setResetError]        = useState("");

  useEffect(() => { if (!isAdmin) navigate("/overview"); }, [isAdmin, navigate]);

  const fetchUsers = useCallback(async () => {
    try {
      setError(""); setLoading(true);
      const data = await api.getUsers();
      setUsers(data?.users || []);
      if (data?.stats) setStats(data.stats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filteredUsers = users.filter((u) => {
    const matchSearch = !search || u.username.toLowerCase().includes(search.toLowerCase());
    const matchRole   = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // ── When role changes in modal, reset tabs to sensible defaults ─────────────
  const handleNewRoleChange = (role: string) => {
    setNewRole(role);
    setAllowedTabs(DEFAULT_TABS_FOR_ROLE(role));
  };

  const toggleTab = (tabId: string) => {
    setAllowedTabs((prev) =>
      prev.includes(tabId) ? prev.filter((t) => t !== tabId) : [...prev, tabId]
    );
  };

  // ── Disable ──────────────────────────────────────────────────────────────────
  const handleDisable = async () => {
    if (!disableTarget) return;
    setDisableLoading(true);
    try {
      await api.disableUser(disableTarget.id);
      toast({ title: `User "${disableTarget.username}" disabled` });
      setDisableTarget(null); fetchUsers();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally { setDisableLoading(false); }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deleteUser(deleteTarget.id);
      toast({ title: `User "${deleteTarget.username}" permanently deleted` });
      setDeleteTarget(null); fetchUsers();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally { setDeleteLoading(false); }
  };

  // ── Create user ──────────────────────────────────────────────────────────────
  const handleCreateUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      setCreateError("Username and password are required"); return;
    }
    if (newUsername.length > 50) {
      setCreateError("Username too long (max 50 chars)"); return;
    }
    if (newPassword.length < 6) {
      setCreateError("Password must be at least 6 characters"); return;
    }
    if (newRole !== "admin" && allowedTabs.length === 0) {
      setCreateError("Select at least one tab for this user"); return;
    }
    setCreateLoading(true); setCreateError("");
    try {
      // Store tab permissions in localStorage keyed by username
      // (frontend-only — no backend schema change needed)
      const perms = newRole === "admin" ? ALL_TABS.map((t) => t.id) : allowedTabs;
      localStorage.setItem(`tabs_${newUsername.trim()}`, JSON.stringify(perms));

      await api.createUser(newUsername.trim(), newPassword, newRole);
      toast({ title: `User "${newUsername}" created successfully` });
      closeAddModal(); fetchUsers();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create user");
    } finally { setCreateLoading(false); }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewUsername(""); setNewPassword(""); setNewRole("viewer");
    setCreateError(""); setShowPassword(false);
    setAllowedTabs(DEFAULT_TABS_FOR_ROLE("viewer"));
  };

  // ── Reset password ───────────────────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!resetTarget) return;
    if (resetPassword.length < 6) { setResetError("Password must be at least 6 characters"); return; }
    setResetLoading(true); setResetError("");
    try {
      await api.resetUserPassword(resetTarget.id, resetPassword);
      toast({ title: `Password for "${resetTarget.username}" reset successfully` });
      setResetTarget(null); setResetPassword("");
    } catch (err: any) {
      setResetError(err.message || "Password reset failed");
    } finally { setResetLoading(false); }
  };

  const closeResetModal = () => {
    setResetTarget(null); setResetPassword(""); setResetError(""); setShowResetPassword(false);
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen pb-10">
      <TopBar title="Identity Access Management" />
      <div className="p-6 space-y-5">

        {/* ── STATS BAR ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: stats.total,    icon: <Users className="h-4 w-4" />,      color: "#3b82f6" },
            { label: "Security Admins", value: stats.admins,   icon: <ShieldCheck className="h-4 w-4" />, color: "#a855f7" },
            { label: "Active Profiles", value: stats.active,   icon: <UserCheck className="h-4 w-4" />,   color: "#10b981" },
            { label: "Suspended Profiles", value: stats.disabled, icon: <UserX className="h-4 w-4" />,       color: "#ef4444" },
          ].map((s) => (
            <div 
              key={s.label} 
              className="soc-card p-5 border border-[#1e293b] bg-[#090e1a]"
              style={{ borderTop: `3px solid ${s.color}` }}
            >
              <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
                <span style={{ color: s.color }}>{s.icon}</span>
                {s.label}
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── TOOLBAR ── */}
        <div className="flex items-center gap-3 flex-wrap bg-[#0a0c16]/50 border border-[#1e293b]/50 rounded-lg p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="Filter by username..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-9 w-[220px] cyber-input font-mono text-xs py-4" 
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v === "ALL" ? "" : v)}>
            <SelectTrigger className="w-[150px] bg-secondary border-border h-8 font-mono text-xs"><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          {(search || roleFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setRoleFilter(""); }} className="h-8 font-mono text-xs">
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
          <Button 
            onClick={() => setShowAddModal(true)} 
            className="ml-auto flex items-center gap-2 h-8 px-4 text-[10px] font-bold uppercase tracking-wider font-mono cyber-btn-primary"
          >
            <UserPlus className="h-3.5 w-3.5" /> ADD NEW PROFILE
          </Button>
        </div>

        {/* ── TABLE ── */}
        {loading ? (
          <SkeletonLoader rows={5} cols={8} />
        ) : error ? (
          <ErrorCard message={error} onRetry={fetchUsers} />
        ) : filteredUsers.length === 0 ? (
          <div className="soc-card border border-[#1e293b] p-12 text-center">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{users.length === 0 ? "No user profiles found" : "No profiles match search query"}</p>
          </div>
        ) : (
          <div className="soc-card border border-[#1e293b] overflow-hidden bg-[#090e1a]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0e111e]/90 border-b border-[#1e293b]/80 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/80">
                    <th className="px-5 py-4 font-bold">UID</th>
                    <th className="px-5 py-4 font-bold">Identity Profile</th>
                    <th className="px-5 py-4 font-bold">Role Class</th>
                    <th className="px-5 py-4 font-bold">Status</th>
                    <th className="px-5 py-4 font-bold">Login Events</th>
                    <th className="px-5 py-4 font-bold">Last Login (IST)</th>
                    <th className="px-5 py-4 font-bold">Registration Date</th>
                    <th className="px-5 py-4 font-bold text-right">Access Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user: any) => {
                    const isCurrentUser = user.username === currentUser;
                    const isDisabled    = user.is_active === false;
                    return (
                      <tr key={user.id} className="border-b border-[#1e293b]/30 last:border-0 hover:bg-primary/[0.02] transition-all duration-150">
                        <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">#{user.id}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-mono border",
                              user.role === "admin" ? "bg-purple-950/30 text-purple-400 border-purple-900/40" : "bg-slate-900 border-[#1e293b] text-muted-foreground"
                            )}>
                              {user.username.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-foreground text-xs font-bold font-mono">{user.username}</span>
                            {isCurrentUser && <span className="text-[9px] font-bold font-mono bg-blue-950/60 text-blue-400 px-1.5 py-0.5 rounded border border-blue-900/40 uppercase">You</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wide border",
                            user.role === "admin" ? "bg-purple-950/20 text-purple-400 border-purple-900/30" : user.role === "user" ? "bg-blue-950/20 text-blue-400 border-blue-900/30" : "bg-slate-900 text-muted-foreground border-[#1e293b]"
                          )}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border",
                            isDisabled ? "status-locked" : "status-active"
                          )}>
                            {isDisabled ? "Suspended" : "Active"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs">
                          <span className="bg-slate-900 text-foreground border border-[#1e293b] px-2 py-0.5 rounded text-[10px] font-bold">
                            {user.login_count ?? 0}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground text-xs font-mono">{user.last_login || <span className="text-muted-foreground/50 italic">Never</span>}</td>
                        <td className="px-5 py-3.5 text-muted-foreground/75 text-xs font-mono">{user.created_at || "—"}</td>
                        <td className="px-5 py-3.5 text-right">
                          {isCurrentUser ? (
                            <span className="text-xs text-muted-foreground/50 font-mono italic">Protected</span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {!isDisabled && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => { setResetTarget(user); setResetPassword(""); setResetError(""); }} 
                                  className="inline-flex items-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider h-7 px-2.5 text-warning border-warning/30 bg-warning/5 hover:bg-warning/15 transition-all duration-200" 
                                  title="Reset Password"
                                >
                                  <KeyRound className="h-3 w-3" />
                                  <span>KEY</span>
                                </Button>
                              )}
                              {!isDisabled && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setDisableTarget(user)} 
                                  className="inline-flex items-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider h-7 px-2.5 text-orange-400 border-orange-900/40 bg-orange-950/10 hover:bg-orange-950/20"
                                >
                                  SUSPEND
                                </Button>
                              )}
                              {isDisabled && <span className="text-xs text-muted-foreground/50 italic font-mono mr-1.5">Suspended</span>}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setDeleteTarget(user)} 
                                className="inline-flex items-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider h-7 px-2.5 text-destructive border-destructive/30 bg-destructive/5 hover:bg-destructive/15 transition-all duration-200"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>DELETE</span>
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-[#1e293b]/40 bg-[#070911]/50 text-[10px] font-mono uppercase text-muted-foreground/75">
              Identity Registry: Showing {filteredUsers.length} of {users.length} profiles
            </div>
          </div>
        )}
      </div>

      {/* ── ADD USER MODAL ── */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeAddModal(); }}
        >
          <div className="soc-card p-6 w-full max-w-md border border-[#1e293b] bg-[#0a0c16]/95 backdrop-blur-xl">

            {/* Header */}
            <div className="flex items-center justify-between mb-5 border-b border-[#1e293b]/50 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-bold text-foreground font-sans uppercase tracking-wider">Create Identity Profile</h2>
              </div>
              <button onClick={closeAddModal} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-4">
              {/* Username */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground/80">Username</Label>
                <Input 
                  placeholder="Enter username..." 
                  value={newUsername} 
                  onChange={(e) => setNewUsername(e.target.value)} 
                  className="cyber-input font-mono text-xs" 
                  autoFocus 
                  onKeyDown={(e) => e.key === "Enter" && handleCreateUser()} 
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground/80">Password</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Min 6 characters" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="cyber-input font-mono text-xs pr-10" 
                    onKeyDown={(e) => e.key === "Enter" && handleCreateUser()} 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground/80">Role Class</Label>
                <Select value={newRole} onValueChange={handleNewRoleChange}>
                  <SelectTrigger className="bg-secondary border-border h-8 font-mono text-xs text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="viewer">Viewer (Read-only)</SelectItem>
                    <SelectItem value="user">User (Standard Access)</SelectItem>
                    <SelectItem value="admin">Admin (Full Access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* TAB ACCESS PICKER */}
              {newRole !== "admin" && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between border-b border-[#1e293b]/30 pb-1.5">
                    <Label className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground/80">
                      Module Access Scope
                    </Label>
                    <div className="flex gap-2 font-mono text-[10px] uppercase">
                      <button
                        type="button"
                        onClick={() => setAllowedTabs(ALL_TABS.map((t) => t.id))}
                        className="text-primary hover:underline"
                      >
                        All
                      </button>
                      <span className="text-muted-foreground/30">·</span>
                      <button
                        type="button"
                        onClick={() => setAllowedTabs([])}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground/85 font-mono leading-normal uppercase">
                    Select target dashboard modules authorized for this profile.
                  </p>

                  <div className="rounded-lg border border-[#1e293b] overflow-hidden max-h-[160px] overflow-y-auto bg-black/25">
                    {ALL_TABS.map((tab, idx) => {
                      const Icon = tab.icon;
                      const checked = allowedTabs.includes(tab.id);
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => toggleTab(tab.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-left font-mono text-xs transition-colors",
                            idx !== ALL_TABS.length - 1 && "border-b border-[#1e293b]/40",
                            checked ? "bg-primary/5" : "bg-transparent hover:bg-accent/40"
                          )}
                        >
                          {checked
                            ? <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                            : <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          }
                          <Icon className={cn("h-3.5 w-3.5 shrink-0", checked ? "text-primary" : "text-muted-foreground")} />
                          <span className={cn(checked ? "text-foreground font-bold" : "text-muted-foreground")}>
                            {tab.label}
                          </span>
                          {checked && (
                            <span className="ml-auto text-[9px] text-primary font-bold uppercase tracking-wider">Visible</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {newRole === "admin" && (
                <div className="rounded-lg border border-purple-900/40 bg-purple-950/10 px-3.5 py-2.5">
                  <p className="text-[10px] text-purple-400 font-mono flex items-center gap-2 uppercase leading-relaxed">
                    <ShieldCheck className="h-4 w-4 text-purple-400 shrink-0" />
                    Security Admins receive authorization across all dashboard modules automatically.
                  </p>
                </div>
              )}

              {/* Error */}
              {createError && (
                <div className="text-[10px] text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 rounded-md font-mono uppercase">
                  ERR_CREATE_USER: {createError}
                </div>
              )}

              {/* Admin warning */}
              {newRole === "admin" && (
                <div className="text-[10px] text-warning bg-warning/5 border border-warning/20 px-3 py-2 rounded-md font-mono uppercase leading-relaxed">
                  ⚠ WARNING: Admin profiles hold execution keys for SOAR containment, system config, and user revocation.
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex gap-3 mt-6 border-t border-[#1e293b]/50 pt-4">
              <Button variant="outline" className="flex-1 border-border font-mono text-xs h-8" onClick={closeAddModal} disabled={createLoading}>CANCEL</Button>
              <Button className="flex-1 cyber-btn-primary font-mono text-xs uppercase h-8" onClick={handleCreateUser} disabled={createLoading}>
                {createLoading ? "CREATING..." : "CONFIRM PROFILE"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD MODAL ── */}
      {resetTarget && (
        <div 
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4 backdrop-blur-sm" 
          onClick={(e) => { if (e.target === e.currentTarget) closeResetModal(); }}
        >
          <div className="soc-card p-6 w-full max-w-md border border-[#1e293b] bg-[#0a0c16]/95 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-5 border-b border-[#1e293b]/50 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-warning" />
                <h2 className="text-sm font-bold text-foreground font-sans uppercase tracking-wider">Reset Security Key</h2>
              </div>
              <button onClick={closeResetModal} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs font-mono text-muted-foreground uppercase mb-4">Update password signature for profile: <span className="text-foreground font-bold">{resetTarget.username}</span></p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground/80">New Password</Label>
                <div className="relative">
                  <Input 
                    type={showResetPassword ? "text" : "password"} 
                    placeholder="Min 6 characters" 
                    value={resetPassword} 
                    onChange={(e) => setResetPassword(e.target.value)} 
                    className="cyber-input font-mono text-xs pr-10" 
                    autoFocus 
                    onKeyDown={(e) => e.key === "Enter" && handleResetPassword()} 
                  />
                  <button type="button" onClick={() => setShowResetPassword(!showResetPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {resetError && (
                <div className="text-[10px] text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 rounded-md font-mono uppercase">
                  ERR_RESET: {resetError}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6 border-t border-[#1e293b]/50 pt-4">
              <Button variant="outline" className="flex-1 border-border font-mono text-xs h-8" onClick={closeResetModal} disabled={resetLoading}>CANCEL</Button>
              <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-mono text-xs uppercase h-8 rounded" onClick={handleResetPassword} disabled={resetLoading}>
                {resetLoading ? "RESETTING..." : "RESET PASSWORD"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── DISABLE CONFIRM ── */}
      <ConfirmDialog open={!!disableTarget} title="Disable User" description={`Are you sure you want to disable "${disableTarget?.username}"? They will no longer be able to log in.`} onConfirm={handleDisable} onCancel={() => setDisableTarget(null)} loading={disableLoading} />

      {/* ── DELETE CONFIRM ── */}
      <ConfirmDialog open={!!deleteTarget} title="Delete User" description={`Are you sure you want to permanently delete "${deleteTarget?.username}"? This action cannot be undone and all user data will be lost.`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleteLoading} />
    </div>
  );
};

export default UsersPage;