"use client";

import React, { useState } from "react";
import {
  Search,
  LayoutDashboard,
  FolderOpen,
  Upload,
  MessageSquare,
  GitCompare,
  FileText,
  History,
  User,
  Settings,
  ChevronDown,
  Plus,
  Clock,
  CheckCircle,
  Flag,
  Archive,
  Eye,
  Star,
  BarChart2,
  Shield,
  Bell,
  LogOut,
  Building2,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/store/authStore";

const softSpring = "cubic-bezier(0.25, 1.1, 0.4, 1)";

/* ─── Brand ─────────────────────────────────────────────────────────────── */

function FinSightLogo({ size = 24 }: { size?: number }) {
  return (
    <div
      className="rounded-md bg-gradient-to-br from-indigo-500 to-rose-500 flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

function BrandBadge() {
  return (
    <div className="flex items-center gap-2.5 px-1 py-1 w-full">
      <FinSightLogo size={24} />
      <span className="text-[15px] font-semibold text-white tracking-tight">FinSight</span>
    </div>
  );
}

/* ─── Avatar ─────────────────────────────────────────────────────────────── */

function Avatar() {
  const { user } = useAuth();
  return (
    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500/60 to-violet-500/60 border border-white/[0.12] flex items-center justify-center flex-shrink-0">
      {user ? (
        <span className="text-[11px] font-bold text-white">{user.avatarInitials}</span>
      ) : (
        <User className="h-4 w-4 text-white/70" />
      )}
    </div>
  );
}

/* ─── Search ─────────────────────────────────────────────────────────────── */

function SearchInput({ isCollapsed }: { isCollapsed: boolean }) {
  const [value, setValue] = useState("");
  return (
    <div
      className={cn(
        "relative flex items-center rounded-xl bg-white/[0.04] border border-white/[0.06] transition-all overflow-hidden",
        isCollapsed ? "w-10 h-10 justify-center" : "h-9 w-full px-3"
      )}
      style={{ transitionDuration: "400ms", transitionTimingFunction: softSpring }}
    >
      <Search className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
      <div
        className={cn(
          "transition-all overflow-hidden",
          isCollapsed ? "w-0 opacity-0" : "w-full opacity-100 ml-2"
        )}
        style={{ transitionDuration: "400ms", transitionTimingFunction: softSpring }}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search..."
          tabIndex={isCollapsed ? -1 : 0}
          className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
        />
      </div>
    </div>
  );
}

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
  to?: string;
  children?: { label: string; icon?: React.ReactNode; to?: string }[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/* ─── Sidebar content per section ────────────────────────────────────────── */

const MAIN_SECTIONS: { id: string; icon: React.ReactNode; label: string }[] = [
  { id: "dashboard",   icon: <LayoutDashboard className="h-4 w-4" />, label: "Dashboard" },
  { id: "workspace",   icon: <FolderOpen className="h-4 w-4" />,       label: "Workspaces" },
  { id: "upload",      icon: <Upload className="h-4 w-4" />,            label: "Upload" },
  { id: "chat",        icon: <MessageSquare className="h-4 w-4" />,     label: "Research" },
  { id: "comparison",  icon: <GitCompare className="h-4 w-4" />,        label: "Comparison" },
  { id: "reports",     icon: <FileText className="h-4 w-4" />,          label: "Reports" },
  { id: "history",     icon: <History className="h-4 w-4" />,           label: "History" },
];

const BOTTOM_SECTIONS: { id: string; icon: React.ReactNode; label: string }[] = [
  { id: "profile",  icon: <User className="h-4 w-4" />,     label: "Profile" },
  { id: "settings", icon: <Settings className="h-4 w-4" />, label: "Settings" },
];

function getDetailContent(section: string): { title: string; sections: NavSection[] } {
  const content: Record<string, { title: string; sections: NavSection[] }> = {
    dashboard: {
      title: "Dashboard",
      sections: [
        {
          title: "Overview",
          items: [
            { id: "overview",    icon: <Eye className="h-4 w-4" />,      label: "Overview",         badge: "" },
            { id: "exec",        icon: <BarChart2 className="h-4 w-4" />, label: "Key Metrics",
              children: [
                { label: "Revenue Analysis" },
                { label: "Margin Trends" },
                { label: "Risk Summary" },
              ],
            },
            { id: "activity",    icon: <Clock className="h-4 w-4" />,     label: "Recent Activity" },
          ],
        },
        {
          title: "Quick Actions",
          items: [
            { id: "new-ws",    icon: <Plus className="h-4 w-4" />,         label: "New Workspace", to: "/workspaces" },
            { id: "new-upload",icon: <Upload className="h-4 w-4" />,       label: "Upload Document", to: "/upload" },
            { id: "new-chat",  icon: <MessageSquare className="h-4 w-4" />,label: "Start Research", to: "/chat" },
          ],
        },
      ],
    },
    workspace: {
      title: "Workspaces",
      sections: [
        {
          title: "My Workspaces",
          items: [
            {
              id: "apple",  icon: <Building2 className="h-4 w-4" />, label: "Apple Inc. Analysis",
              children: [
                { label: "10-K FY2024" },
                { label: "Q3 Earnings" },
                { label: "Proxy Statement" },
              ],
            },
            {
              id: "tesla",  icon: <Building2 className="h-4 w-4" />, label: "Tesla vs Ford",
              children: [
                { label: "Tesla 10-K" },
                { label: "Ford Annual Report" },
              ],
            },
            {
              id: "msft",   icon: <Building2 className="h-4 w-4" />, label: "MSFT Deep Dive",
            },
          ],
        },
        {
          title: "Seed Documents",
          items: [
            { id: "seed1", icon: <Star className="h-4 w-4" />, label: "Apple 10-K 2023" },
            { id: "seed2", icon: <Star className="h-4 w-4" />, label: "Tesla Annual Report" },
            { id: "seed3", icon: <Star className="h-4 w-4" />, label: "Microsoft 10-K 2023" },
            { id: "seed4", icon: <Star className="h-4 w-4" />, label: "Amazon Proxy 2023" },
          ],
        },
      ],
    },
    upload: {
      title: "Upload",
      sections: [
        {
          title: "Upload Documents",
          items: [
            { id: "new-file",  icon: <Upload className="h-4 w-4" />,      label: "Upload New File" },
            { id: "drag-drop", icon: <Plus className="h-4 w-4" />,         label: "Drag & Drop Zone" },
          ],
        },
        {
          title: "Recent Uploads",
          items: [
            { id: "r1", icon: <CheckCircle className="h-4 w-4" />, label: "AAPL_10K_2024.pdf", badge: "Ready" },
            { id: "r2", icon: <Clock className="h-4 w-4" />,       label: "TSLA_Q3_2024.pdf",  badge: "Processing" },
            { id: "r3", icon: <Archive className="h-4 w-4" />,     label: "MSFT_proxy.docx",   badge: "Ready" },
          ],
        },
      ],
    },
    chat: {
      title: "Research",
      sections: [
        {
          title: "Active Sessions",
          items: [
            {
              id: "sess1", icon: <MessageSquare className="h-4 w-4" />, label: "AAPL Revenue Analysis",
              children: [
                { label: "What drove revenue growth in FY2024?" },
                { label: "How does gross margin compare to FY2023?" },
              ],
            },
            { id: "sess2", icon: <MessageSquare className="h-4 w-4" />, label: "Tesla Risk Assessment" },
          ],
        },
        {
          title: "Quick Start",
          items: [
            { id: "new-session", icon: <Plus className="h-4 w-4" />, label: "New Research Session" },
            { id: "templates",   icon: <Flag className="h-4 w-4" />,  label: "Question Templates" },
          ],
        },
      ],
    },
    comparison: {
      title: "Comparison",
      sections: [
        {
          title: "Active Comparisons",
          items: [
            {
              id: "cmp1", icon: <GitCompare className="h-4 w-4" />, label: "AAPL vs MSFT",
              children: [
                { label: "Revenue Benchmark" },
                { label: "Margin Analysis" },
                { label: "Risk Comparison" },
              ],
            },
            { id: "cmp2", icon: <GitCompare className="h-4 w-4" />, label: "TSLA vs F vs GM" },
          ],
        },
        {
          title: "Quick Actions",
          items: [
            { id: "new-cmp", icon: <Plus className="h-4 w-4" />, label: "New Comparison" },
          ],
        },
      ],
    },
    reports: {
      title: "Reports",
      sections: [
        {
          title: "Generated Reports",
          items: [
            {
              id: "rpt1", icon: <FileText className="h-4 w-4" />, label: "AAPL Full Analysis",
              children: [
                { label: "Executive Summary" },
                { label: "Financial Metrics" },
                { label: "Red Flags" },
                { label: "Outlook" },
              ],
            },
            { id: "rpt2", icon: <FileText className="h-4 w-4" />, label: "TSLA vs Ford Report",   badge: "New" },
            { id: "rpt3", icon: <FileText className="h-4 w-4" />, label: "MSFT Deep Dive Report" },
          ],
        },
        {
          title: "Quick Actions",
          items: [
            { id: "gen-rpt", icon: <Plus className="h-4 w-4" />,    label: "Generate Report" },
            { id: "archived",icon: <Archive className="h-4 w-4" />, label: "Archived Reports" },
          ],
        },
      ],
    },
    history: {
      title: "History",
      sections: [
        {
          title: "Recent Activity",
          items: [
            {
              id: "today", icon: <Clock className="h-4 w-4" />, label: "Today",
              children: [
                { label: "Uploaded AAPL 10-K" },
                { label: "Started AAPL research" },
                { label: "Generated comparison report" },
              ],
            },
            {
              id: "week", icon: <History className="h-4 w-4" />, label: "This Week",
              children: [
                { label: "Created TSLA workspace" },
                { label: "Uploaded 3 documents" },
                { label: "Generated MSFT report" },
              ],
            },
          ],
        },
        {
          title: "Filters",
          items: [
            { id: "f-uploads",  icon: <Upload className="h-4 w-4" />,       label: "Uploads" },
            { id: "f-research", icon: <MessageSquare className="h-4 w-4" />, label: "Research Sessions" },
            { id: "f-reports",  icon: <FileText className="h-4 w-4" />,      label: "Reports" },
          ],
        },
      ],
    },
    profile: {
      title: "Profile",
      sections: [
        {
          title: "My Account",
          items: [
            { id: "edit-profile", icon: <User className="h-4 w-4" />,    label: "Edit Profile" },
            { id: "security",     icon: <Shield className="h-4 w-4" />,   label: "Security" },
            { id: "notifs",       icon: <Bell className="h-4 w-4" />,     label: "Notifications" },
          ],
        },
        {
          title: "Usage",
          items: [
            { id: "usage",       icon: <BarChart2 className="h-4 w-4" />, label: "Usage Stats" },
            { id: "billing",     icon: <Star className="h-4 w-4" />,      label: "Plan & Billing" },
          ],
        },
      ],
    },
    settings: {
      title: "Settings",
      sections: [
        {
          title: "Account",
          items: [
            { id: "account",  icon: <User className="h-4 w-4" />,    label: "Account" },
            { id: "security", icon: <Shield className="h-4 w-4" />,   label: "Security" },
            { id: "notifs",   icon: <Bell className="h-4 w-4" />,     label: "Notifications" },
          ],
        },
        {
          title: "Workspace",
          items: [
            { id: "pref",     icon: <Settings className="h-4 w-4" />, label: "Preferences",
              children: [
                { label: "Default workspace" },
                { label: "Citation format" },
                { label: "Export settings" },
              ],
            },
            { id: "api",      icon: <Users className="h-4 w-4" />,    label: "API Keys (stub)" },
          ],
        },
        {
          title: "Danger Zone",
          items: [
            { id: "delete", icon: <Archive className="h-4 w-4" />, label: "Delete Account" },
          ],
        },
      ],
    },
  };

  return content[section] ?? content.dashboard;
}

/* ─── Icon Rail (left) ───────────────────────────────────────────────────── */

function RailButton({
  icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-300",
        isActive
          ? "bg-white/[0.08] text-white"
          : "text-white/40 hover:text-white hover:bg-white/[0.04]"
      )}
    >
      {icon}
    </button>
  );
}

function IconRail({
  activeSection,
  onSelect,
}: {
  activeSection: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="flex flex-col items-center gap-1.5 w-[56px] min-w-[56px] h-full bg-[#050505] border-r border-white/[0.06] py-4 px-1.5">
      {/* Logo */}
      <div className="flex items-center justify-center h-10 w-10 mb-2">
        <FinSightLogo size={22} />
      </div>

      {/* Main nav */}
      <div className="flex flex-col gap-1 w-full items-center flex-1">
        {MAIN_SECTIONS.map((s) => (
          <RailButton
            key={s.id}
            icon={s.icon}
            label={s.label}
            isActive={activeSection === s.id}
            onClick={() => onSelect(s.id)}
          />
        ))}
      </div>

      {/* Bottom nav */}
      <div className="flex flex-col gap-1 w-full items-center">
        {BOTTOM_SECTIONS.map((s) => (
          <RailButton
            key={s.id}
            icon={s.icon}
            label={s.label}
            isActive={activeSection === s.id}
            onClick={() => onSelect(s.id)}
          />
        ))}
        {/* Avatar */}
        <div className="mt-2">
          <Avatar />
        </div>
      </div>
    </aside>
  );
}

/* ─── Detail Panel (right) ───────────────────────────────────────────────── */

function NavItemRow({
  item,
  isExpanded,
  onToggle,
  isCollapsed,
}: {
  item: NavItem;
  isExpanded: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
}) {
  return (
    <button
      onClick={() => {
        if (item.to) {
          // If it has a direct route, we could navigate here. Handled by parent.
        }
        onToggle();
      }}
      title={isCollapsed ? item.label : undefined}
      className={cn(
        "w-full flex items-center gap-3 rounded-xl transition-all duration-200",
        isCollapsed ? "justify-center h-10 w-10" : "px-3 py-2 h-9",
        "text-white/50 hover:text-white hover:bg-white/[0.04]",
        "focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:outline-none"
      )}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!isCollapsed && (
        <>
          <span className="flex-1 text-sm text-left truncate">{item.label}</span>
          {item.badge && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 flex-shrink-0">
              {item.badge}
            </span>
          )}
          {item.children && (
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-white/30 flex-shrink-0 transition-transform duration-300",
                isExpanded && "rotate-180"
              )}
            />
          )}
        </>
      )}
    </button>
  );
}

function NavSection({
  section,
  expanded,
  onToggle,
  isCollapsed,
}: {
  section: NavSection;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  isCollapsed: boolean;
}) {
  return (
    <div className="w-full">
      {!isCollapsed && (
        <div className="px-3 mb-1">
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
            {section.title}
          </span>
        </div>
      )}
      <div className={cn("flex flex-col", isCollapsed ? "items-center gap-1" : "gap-0.5")}>
        {section.items.map((item) => {
          const isOpen = expanded.has(item.id);
          return (
            <div key={item.id}>
              <NavItemRow
                item={item}
                isExpanded={isOpen}
                onToggle={() => {
                  onToggle(item.id);
                }}
                isCollapsed={isCollapsed}
              />
              {isOpen && item.children && !isCollapsed && (
                <div className="pl-6 pr-1 flex flex-col gap-0.5 mb-1">
                  {item.children.map((child, i) => (
                    <button
                      key={i}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.03] transition-colors"
                    >
                      {child.icon && <span className="flex-shrink-0">{child.icon}</span>}
                      <span className="truncate">{child.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailPanel({
  activeSection,
}: {
  activeSection: string;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { title, sections } = getDetailContent(activeSection);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggle = (id: string) => {
    // Check if the item has a 'to' property and navigate if so
    let targetTo: string | undefined;
    sections.forEach(sec => sec.items.forEach(item => {
      if (item.id === id && item.to) targetTo = item.to;
    }));
    
    if (targetTo) {
      navigate(targetTo);
      return;
    }

    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-[#050505] border-r border-white/[0.06] transition-all overflow-hidden",
        isCollapsed ? "w-[56px] min-w-[56px]" : "w-60 min-w-[240px]"
      )}
      style={{ transitionDuration: "400ms", transitionTimingFunction: softSpring }}
    >
      {/* Header */}
      <div className={cn("flex items-center h-16 px-4 border-b border-white/[0.06] flex-shrink-0",
        isCollapsed ? "justify-center" : "justify-between gap-2"
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <FinSightLogo size={20} />
            <span className="text-[14px] font-semibold text-white truncate">FinSight</span>
          </div>
        )}
        {isCollapsed && <FinSightLogo size={20} />}
        <button
          onClick={() => setIsCollapsed((v) => !v)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.04] transition-colors flex-shrink-0"
        >
          {isCollapsed
            ? <PanelLeftOpen className="h-4 w-4" />
            : <PanelLeftClose className="h-4 w-4" />
          }
        </button>
      </div>

      {/* Search */}
      <div className={cn("px-3 py-3 border-b border-white/[0.04] flex-shrink-0", isCollapsed && "flex justify-center")}>
        <SearchInput isCollapsed={isCollapsed} />
      </div>

      {/* Section title */}
      {!isCollapsed && (
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <span className="text-[16px] font-semibold text-white tracking-tight">{title}</span>
        </div>
      )}

      {/* Nav content */}
      <div className={cn("flex-1 overflow-y-auto py-2 flex flex-col gap-4",
        isCollapsed ? "px-1 items-center" : "px-2"
      )}>
        {sections.map((section, i) => (
          <NavSection
            key={i}
            section={section}
            expanded={expanded}
            onToggle={toggle}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div className="flex-shrink-0 border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer group">
            <Avatar />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-white/40 truncate">{user?.role} Plan</p>
            </div>
            <button aria-label="Logout" onClick={logout} className="ml-auto text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0 z-10">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {isCollapsed && (
        <div className="flex-shrink-0 border-t border-white/[0.06] p-2 flex flex-col gap-1 items-center">
          <button
            aria-label="Logout"
            onClick={logout}
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Combined Two-Level Sidebar ─────────────────────────────────────────── */

export function TwoLevelSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Map current pathname to an active section ID
  const path = location.pathname.split("/")[1] || "dashboard";
  const section = ["dashboard", "workspaces", "upload", "chat", "comparison", "reports", "history", "profile", "settings"].includes(path) ? path : "dashboard";

  const handleSelect = (id: string) => {
    // If it's a known route, navigate there
    if (id === "workspace") navigate("/workspaces");
    else navigate(`/${id}`);
  };

  return (
    <div className="flex h-full flex-shrink-0 z-50">
      <IconRail activeSection={section === "workspaces" ? "workspace" : section} onSelect={handleSelect} />
      <DetailPanel activeSection={section === "workspaces" ? "workspace" : section} />
    </div>
  );
}

/* ─── Demo wrapper (standalone preview) ─────────────────────────────────── */
export function SidebarDemo() {
  return (
    <div className="bg-[#030303] min-h-screen flex items-center justify-center p-8">
      <div className="h-[800px] rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl flex">
        <TwoLevelSidebar />
        <div className="flex-1 bg-[#030303] flex items-center justify-center">
          <p className="text-white/20 text-sm">Main content area</p>
        </div>
      </div>
    </div>
  );
}
