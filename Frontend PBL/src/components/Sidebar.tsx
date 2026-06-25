import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutGrid, Cpu, Shield, Bell, Zap,
  Link, Users, LogOut, ShieldCheck, BrainCircuit, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: number;
  adminOnly?: boolean;
}

interface SidebarProps {
  alertCount?: number;
  deviceCount?: number;
  eventCount?: number;
}

// Map tab id → nav item definition
interface SidebarSection {
  title: string;
  items: NavItem[];
}

const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    title: "Monitoring",
    items: [
      { id: "overview",   label: "Overview",       path: "/overview",     icon: LayoutGrid   },
      { id: "alerts",     label: "Alerts",          path: "/alerts",       icon: Bell         },
      { id: "events",     label: "Security Events", path: "/events",       icon: Shield       },
    ]
  },
  {
    title: "Response",
    items: [
      { id: "soar",       label: "SOAR Actions",    path: "/soar",         icon: Zap          },
      { id: "blockchain", label: "Blockchain",      path: "/blockchain",   icon: Link         },
    ]
  },
  {
    title: "Management",
    items: [
      { id: "devices",    label: "Devices",         path: "/devices",      icon: Cpu          },
      { id: "users",      label: "Users",           path: "/users",        icon: Users,        adminOnly: true },
    ]
  },
  {
    title: "Intelligence",
    items: [
      { id: "ai-analysis", label: "AI Documentation", path: "/ai-analysis",  icon: BrainCircuit, adminOnly: true },
    ]
  },
  {
    title: "System",
    items: [
      { id: "settings",   label: "Settings",        path: "/settings",     icon: Settings },
    ]
  }
];

const Sidebar = ({ alertCount = 0, deviceCount = 0, eventCount = 0 }: SidebarProps) => {
  const { username, role, logout, isAdmin } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();

  // Read saved tab permissions for this user
  const savedTabsRaw = username ? localStorage.getItem(`tabs_${username}`) : null;
  const allowedTabs: string[] | null = savedTabsRaw ? JSON.parse(savedTabsRaw) : null;

  // Inject badge counts
  const badgeMap: Record<string, number> = {
    devices: deviceCount,
    events:  eventCount,
    alerts:  alertCount,
  };

  return (
    <div className="fixed left-0 top-0 bottom-0 w-[220px] bg-[#020617] border-r border-[#1e293b] flex flex-col z-50 shadow-[4px_0_24px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-[#1e293b]">
        <div className="p-1.5 rounded-lg bg-primary/5 border border-primary/20">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <span className="font-extrabold text-foreground text-sm tracking-wider uppercase font-mono">
          CYPHER<span className="text-primary">GUARD</span>
        </span>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-6 overflow-y-auto">
        {SIDEBAR_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => {
            if (item.adminOnly && !isAdmin) return false;
            if (!allowedTabs) return true;
            return allowedTabs.includes(item.id);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-1.5">
              <h3 className="px-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/45 font-bold">
                {section.title}
              </h3>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const badge    = badgeMap[item.id];
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 border border-transparent font-mono",
                        isActive
                          ? "bg-primary/10 text-primary border-primary/10"
                          : "text-muted-foreground hover:bg-[#0f172a] hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 shrink-0 transition-transform duration-150", isActive ? "text-primary scale-105" : "text-muted-foreground")} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {badge !== undefined && badge > 0 && (
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-md font-bold min-w-[20px] text-center border font-mono",
                            item.id === "alerts"
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-[#1e293b] text-foreground border-[#334155]"
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-[#1e293b] p-4 bg-[#090e1a]/40">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-[#0f172a] border border-[#1e293b]">
          <div className="h-8 w-8 rounded-full bg-[#1e293b] border border-slate-700 flex items-center justify-center font-mono font-bold text-slate-300 text-xs uppercase">
            {username ? username.slice(0, 2).toUpperCase() : "OP"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-foreground truncate font-mono">{username}</p>
            <span
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded font-mono uppercase border",
                role === "admin"
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-muted text-muted-foreground border-border"
              )}
            >
              {role}
            </span>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground border border-transparent hover:border-destructive/20 transition-all"
            title="Logout System"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;