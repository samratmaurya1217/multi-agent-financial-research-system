"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  Upload,
  MessageSquare,
  GitCompare,
  FileText,
  User,
  Settings,
  LogOut,
  BarChart2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/store/authStore";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
  to: string;
}

/* ─── Nav items ──────────────────────────────────────────────────────────── */
const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",  icon: <LayoutDashboard className="h-4 w-4" />, label: "Dashboard",   to: "/dashboard"  },
  { id: "workspaces", icon: <FolderOpen className="h-4 w-4" />,       label: "Workspaces",  to: "/workspaces" },
  { id: "compare",    icon: <GitCompare className="h-4 w-4" />,        label: "Compare",     to: "/compare"    },
  { id: "reports",    icon: <FileText className="h-4 w-4" />,          label: "Reports",     to: "/reports"    },
  { id: "chat",       icon: <MessageSquare className="h-4 w-4" />,     label: "Research Chat",to: "/chat"       },
  { id: "upload",     icon: <Upload className="h-4 w-4" />,            label: "Upload",      to: "/upload"     },
];

const BOTTOM_ITEMS: NavItem[] = [
  { id: "profile",  icon: <User className="h-4 w-4" />,     label: "Profile",   to: "/profile"  },
  { id: "settings", icon: <Settings className="h-4 w-4" />, label: "Settings",  to: "/settings" },
];

/* ─── Logo ───────────────────────────────────────────────────────────────── */
function Logo({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/dashboard")}
      className={cn("flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-white/[0.04]",
        collapsed ? "justify-center" : "")}
    >
      <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-600 shadow-md shadow-blue-500/30">
        <BarChart2 className="h-4 w-4 text-white" />
      </div>
      {!collapsed && (
        <span className="text-xl font-extrabold text-white tracking-tight">Velsora</span>
      )}
    </button>
  );
}

/* ─── Avatar ─────────────────────────────────────────────────────────────── */
function Avatar({ size = 8 }: { size?: number }) {
  const { user } = useAuth();
  return (
    <div
      className={`h-${size} w-${size} rounded-full flex items-center justify-center flex-shrink-0 font-bold bg-blue-600 shadow-sm`}
    >
      <span className="text-[11px] text-white">{user?.avatarInitials || "?"}</span>
    </div>
  );
}

/* ─── Nav item button ────────────────────────────────────────────────────── */
function NavItemButton({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(item.to)}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all outline-none",
        isActive
          ? "bg-white/[0.08] text-white font-semibold"
          : "text-white/50 hover:bg-white/[0.04] hover:text-white font-medium"
      )}
    >
      {/* Active Indicator Line */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-full" />
      )}
      
      <span className={cn("flex-shrink-0 transition-colors", isActive ? "text-blue-400" : "")}>
        {item.icon}
      </span>
      
      {!collapsed && (
        <>
          <span className="flex-1 text-sm text-left truncate">{item.label}</span>
          {item.badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-blue-300 bg-blue-500/15">
              {item.badge}
            </span>
          )}
        </>
      )}

      {/* Hover tooltip for collapsed */}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1.5 rounded-lg text-xs text-white font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 bg-[#1e293b] border border-white/10 shadow-xl">
          {item.label}
        </div>
      )}
    </button>
  );
}


/* ─── Main Sidebar ───────────────────────────────────────────────────────── */
export function TwoLevelSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const currentPath = "/" + (location.pathname.split("/")[1] || "dashboard");
  const getActiveId = () => {
    const match = [...NAV_ITEMS, ...BOTTOM_ITEMS].find((item) =>
      item.to === currentPath || (currentPath.startsWith(item.to) && item.to !== "/")
    );
    return match?.id || "dashboard";
  };
  const activeId = getActiveId();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-[calc(100vh-24px)] flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden m-3 mr-0 rounded-3xl shadow-[20px_0_40px_-15px_rgba(0,0,0,0.3)] z-20",
        collapsed ? "w-[76px]" : "w-[260px]"
      )}
      style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      {/* Header */}
      <div className={cn("h-20 flex items-center flex-shrink-0 px-4", collapsed ? "justify-center" : "gap-2 justify-between")}>
        <Logo collapsed={collapsed} />
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all flex-shrink-0"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className={cn("flex-1 overflow-y-auto py-2 flex flex-col gap-1", collapsed ? "px-2 items-center" : "px-3")}>
        
        {NAV_ITEMS.map((item) => (
          <NavItemButton
            key={item.id}
            item={item}
            isActive={activeId === item.id}
            collapsed={collapsed}
          />
        ))}

        <div className={cn("my-3 border-t border-white/5", collapsed ? "w-8" : "mx-2")} />
        
        {BOTTOM_ITEMS.map((item) => (
          <NavItemButton
            key={item.id}
            item={item}
            isActive={activeId === item.id}
            collapsed={collapsed}
          />
        ))}
      </nav>



      {/* Footer user card */}
      {!collapsed && (
        <div className="flex-shrink-0 p-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/[0.04] transition-all cursor-pointer group">
            <Avatar size={8} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{user?.name || "Analyst"}</p>
              <p className="text-[11px] text-white/40 truncate font-medium">{user?.email?.split("@")[0] || "velsora.ai"}</p>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Logout"
              title="Logout"
              className="h-8 w-8 rounded-xl flex items-center justify-center text-white/20 hover:text-rose-400 hover:bg-rose-400/10 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Notification button (collapsed-only) */}
      {collapsed && (
        <div className="px-2 pb-4 flex flex-col items-center gap-2">
          <button
            className="h-10 w-10 rounded-2xl flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all"
            title="Logout"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </button>
          <Avatar size={10} />
        </div>
      )}
    </aside>
  );
}
