import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/Badge";
import { SkeletonCard, SkeletonRow } from "@/components/ui/Skeleton";
import { getWorkspaces, type Workspace } from "@/services/workspace";
import { LayoutDashboard, FolderOpen, FileText, MessageSquare, Plus, ArrowRight, Clock } from "lucide-react";

const chartData = [
  { month: "Feb", sessions: 2, reports: 1 },
  { month: "Mar", sessions: 5, reports: 2 },
  { month: "Apr", sessions: 4, reports: 3 },
  { month: "May", sessions: 8, reports: 4 },
  { month: "Jun", sessions: 6, reports: 5 },
  { month: "Jul", sessions: 11, reports: 7 },
];

const activity = [
  { action: "Uploaded AAPL_10K_FY2024.pdf", workspace: "Apple Inc. Analysis", time: "2 hours ago", type: "upload" },
  { action: "Generated comparison report", workspace: "Tesla vs Ford", time: "Yesterday", type: "report" },
  { action: "Started research session", workspace: "MSFT Deep Dive", time: "2 days ago", type: "chat" },
  { action: "Created new workspace", workspace: "Amazon Risk Review", time: "3 days ago", type: "workspace" },
];

export function DashboardPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getWorkspaces().then((ws) => { setWorkspaces(ws); setLoading(false); });
  }, []);

  const active = workspaces.filter((w) => w.status === "active");

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          <div className="flex items-center gap-2 text-white/30 text-sm mb-2">
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Overview</h1>
          <p className="text-white/40 text-sm">Your research command center.</p>
        </motion.div>

        {/* Stat cards */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard title="Active Workspaces" value={active.length} icon={FolderOpen} trend={{ value: 25, label: "vs last month" }} iconColor="text-indigo-400" iconBg="bg-indigo-500/10" />
              <StatCard title="Documents Analyzed" value="14" icon={FileText} trend={{ value: 40, label: "vs last month" }} iconColor="text-violet-400" iconBg="bg-violet-500/10" />
              <StatCard title="Research Sessions" value="11" icon={MessageSquare} trend={{ value: 15, label: "vs last month" }} iconColor="text-rose-400" iconBg="bg-rose-500/10" />
              <StatCard title="Reports Generated" value="7" icon={FileText} trend={{ value: 75, label: "vs last month" }} iconColor="text-amber-400" iconBg="bg-amber-500/10" />
            </>
          )}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chart */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="lg:col-span-2 p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            <h3 className="text-white font-semibold mb-1">Research Activity</h3>
            <p className="text-white/40 text-sm mb-6">Sessions and reports over time</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0d0d0d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#fff", fontSize: 12 }} />
                <Area type="monotone" dataKey="sessions" stroke="#6366f1" fill="url(#colorSessions)" strokeWidth={2} name="Sessions" />
                <Area type="monotone" dataKey="reports" stroke="#f43f5e" fill="url(#colorReports)" strokeWidth={2} name="Reports" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Activity feed */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            <h3 className="text-white font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {activity.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="h-3.5 w-3.5 text-white/30" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white/70 truncate">{item.action}</p>
                    <p className="text-xs text-white/30 truncate">{item.workspace} · {item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Workspaces table */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Recent Workspaces</h3>
            <button onClick={() => navigate("/workspaces")} className="flex items-center gap-1.5 text-indigo-400 text-sm hover:text-indigo-300 transition-colors">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/[0.03]">
                <tr>
                  {["Workspace", "Documents", "Sessions", "Updated", "Status"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => <tr key={i}><td colSpan={5}><SkeletonRow /></td></tr>)
                  : workspaces.slice(0, 4).map((ws) => (
                    <tr key={ws.id} onClick={() => navigate(`/workspaces/${ws.id}`)} className="hover:bg-white/[0.02] border-t border-white/[0.04] transition-colors cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                            <FolderOpen className="h-4 w-4 text-indigo-400" />
                          </div>
                          <span className="text-sm text-white font-medium">{ws.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/50">{ws.documentCount}</td>
                      <td className="px-6 py-4 text-sm text-white/50">{ws.sessionCount}</td>
                      <td className="px-6 py-4 text-sm text-white/50">{ws.updatedAt}</td>
                      <td className="px-6 py-4"><StatusBadge status={ws.status} /></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="mt-6 grid sm:grid-cols-3 gap-4">
          {[
            { label: "New Workspace", desc: "Create a research workspace", icon: FolderOpen, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", to: "/workspaces" },
            { label: "Upload Document", desc: "Add a PDF, DOCX, or TXT file", icon: FileText, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", to: "/upload" },
            { label: "Start Research", desc: "Ask questions about your docs", icon: MessageSquare, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", to: "/chat" },
          ].map((a) => (
            <button key={a.label} onClick={() => navigate(a.to)} className={`flex items-center gap-4 p-4 rounded-2xl border ${a.border} bg-white/[0.02] hover:bg-white/[0.04] hover:scale-[1.02] transition-all text-left`}>
              <div className={`h-10 w-10 rounded-xl ${a.bg} border ${a.border} flex items-center justify-center flex-shrink-0`}>
                <a.icon className={`h-5 w-5 ${a.color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{a.label}</p>
                <p className="text-xs text-white/40">{a.desc}</p>
              </div>
              <Plus className="h-4 w-4 text-white/20 ml-auto" />
            </button>
          ))}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
