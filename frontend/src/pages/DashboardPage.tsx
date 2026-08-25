import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/store/authStore";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { getWorkspaces, type Workspace } from "@/services/workspace";
import { getReports, type Report } from "@/services/reports";
import {
  FolderOpen,
  FileText,
  Share,
  Check,
  Copy,
  X,
} from "lucide-react";

/* ─── Data Builders ──────────────────────────────────────────────────────── */
function buildChartData(workspaces: Workspace[], reports: Report[], timeframe: "Daily" | "Weekly" | "Monthly") {
  if (timeframe === "Daily") {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map((day, idx) => ({
      name: day,
      workspaces: workspaces.length > 0 ? (idx % 2 === 0 ? 1 : 0) : 0,
      reports: reports.length > 0 ? (idx === 6 ? reports.length : Math.max(0, reports.length - (6 - idx))) : 0,
    }));
  }

  if (timeframe === "Weekly") {
    return ["W1", "W2", "W3", "W4"].map((w, idx) => ({
      name: w,
      workspaces: workspaces.length > 0 ? 1 : 0,
      reports: reports.length > 0 ? Math.min(reports.length, idx + 1) : 0,
    }));
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = months[d.getMonth()];
    
    const wsCount = workspaces.filter(w => {
      const wd = new Date(w.createdAt);
      return wd.getMonth() === d.getMonth() && wd.getFullYear() === d.getFullYear();
    }).length;
    
    const rpCount = reports.filter(r => {
      const rd = new Date(r.generatedAt);
      return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
    }).length;
    
    result.push({ name: monthName, workspaces: wsCount || (i === 0 ? workspaces.length : 0), reports: rpCount || (i === 0 ? reports.length : 0) });
  }
  return result;
}

function buildDonutData(reports: Report[], filter: string) {
  let single = 0;
  let comparison = 0;
  
  reports.forEach(r => {
    if (r.type === "comparison") comparison++;
    else single++;
  });

  if (filter === "Single Reports") {
    return [{ name: "Single Reports", value: single || (reports.length === 0 ? 1 : 0), color: "#3b82f6" }];
  }
  if (filter === "Comparison") {
    return [{ name: "Comparison", value: comparison || (reports.length === 0 ? 1 : 0), color: "#f59e0b" }];
  }
  
  if (reports.length === 0) {
    return [{ name: "No Reports", value: 1, color: "#cbd5e1" }];
  }
  
  const result = [];
  if (single > 0) result.push({ name: "Single Reports", value: single, color: "#3b82f6" });
  if (comparison > 0) result.push({ name: "Comparison", value: comparison, color: "#f59e0b" });
  
  return result.length > 0 ? result : [{ name: "Standard", value: reports.length, color: "#3b82f6" }];
}

/* ─── Stat Card Component ────────────────────────────────────────────────── */
function StatCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  badgeText,
  badgeBg,
  badgeColor,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  badgeText?: string;
  badgeBg?: string;
  badgeColor?: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-6 rounded-3xl bg-white shadow-xs border border-slate-100 flex flex-col justify-between h-full hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-8">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        {badgeText && (
          <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${badgeBg} ${badgeColor} flex items-center gap-1`}>
            {badgeText}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-500 mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</h3>
          {subtitle && <span className="text-sm font-bold text-slate-400">{subtitle}</span>}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Dashboard Page ─────────────────────────────────────────────────────── */
export function DashboardPage() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [timeframe, setTimeframe] = useState<"Daily" | "Weekly" | "Monthly">("Monthly");
  const [reportFilter, setReportFilter] = useState("All");
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const ws = await getWorkspaces();
        const rp = await getReports();
        setWorkspaces(ws);
        setReports(rp);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      }
    }
    loadData();
  }, []);

  const performanceData = buildChartData(workspaces, reports, timeframe);
  const allocationData = buildDonutData(reports, reportFilter);
  const totalDocs = reports.length;

  const shareUrl = typeof window !== "undefined" ? window.location.origin : "https://velsora.ai";
  const shareSummaryText = `Velsora Financial Research Command — ${workspaces.length} active workspaces, ${reports.length} generated diligence reports.`;

  const handleShareClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Velsora Financial Intelligence",
          text: shareSummaryText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share API unsupported on platform, fallback to modal
      }
    }
    setShowShareModal(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(shareSummaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-2">Research Command</h1>
            <p className="text-slate-500 font-medium">
              Welcome back, {user?.name?.split(" ")[0] || "Analyst"}. You have <span className="text-slate-700 font-bold">{workspaces.length} active workspaces</span> this quarter.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShareClick}
              className="px-5 py-2.5 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-bold shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Share className="w-4 h-4 text-blue-600" />
              <span>Share Insights</span>
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard
            title="Total Workspaces"
            value={workspaces.length.toString()}
            icon={FolderOpen}
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
            badgeText={workspaces.length > 0 ? "Active" : "Ready"}
            badgeBg="bg-slate-100"
            badgeColor="text-slate-600"
          />
          <StatCard
            title="Reports Generated"
            value={reports.length.toString()}
            icon={FileText}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
            badgeText={reports.length > 0 ? "Up to date" : "None"}
            badgeBg="bg-slate-100"
            badgeColor="text-slate-600"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Area Chart */}
          <div className="lg:col-span-2 p-6 md:p-8 rounded-3xl bg-white shadow-xs border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Research Activity</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Workspaces and Reports over time</p>
              </div>
              <div className="flex gap-2 text-xs font-bold bg-slate-100 p-1 rounded-xl">
                {(["Daily", "Weekly", "Monthly"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      timeframe === t
                        ? "bg-white text-blue-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPurple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontWeight: 'bold' }}
                    itemStyle={{ color: '#0f172a' }}
                  />
                  <Area type="monotone" name="Workspaces" dataKey="workspaces" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorGreen)" />
                  <Area type="monotone" name="Reports" dataKey="reports" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorPurple)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="p-6 md:p-8 rounded-3xl bg-white shadow-xs border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-800">Report Types</h3>
              <select
                value={reportFilter}
                onChange={(e) => setReportFilter(e.target.value)}
                className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none cursor-pointer hover:border-slate-300"
              >
                <option value="All">All Types</option>
                <option value="Single Reports">Single Reports</option>
                <option value="Comparison">Comparison</option>
              </select>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Inner Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
                <span className="text-2xl font-extrabold text-slate-800">{totalDocs}</span>
                <span className="text-xs font-bold text-slate-400 mt-1">Reports</span>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-2 mt-4 text-center">
              {allocationData.map((item) => (
                <div key={item.name}>
                  <p className="text-lg font-extrabold text-slate-800">{item.value}</p>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{item.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Share Insights Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Share className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Share Research Insights</h3>
                    <p className="text-xs font-medium text-slate-500">Collaborate with peers or share intelligence</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Shareable Link Box */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Workspace Link</label>
                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-transparent px-3 text-xs font-semibold text-slate-700 outline-none select-all truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                  </button>
                </div>
              </div>

              {/* Research Summary Box */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Executive Summary Text</label>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <p className="text-xs font-medium text-slate-600 leading-relaxed">
                    {shareSummaryText}
                  </p>
                  <button
                    onClick={handleCopySummary}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {copiedSummary ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedSummary ? "Summary Copied!" : "Copy Summary Text"}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
