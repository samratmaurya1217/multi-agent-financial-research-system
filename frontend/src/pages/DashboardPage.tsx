import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
  Briefcase,
  ShieldCheck,
  Download,
  Share,
} from "lucide-react";

/* ─── Data Builders ──────────────────────────────────────────────────────── */
function buildChartData(workspaces: Workspace[], reports: Report[]) {
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
    
    result.push({ month: monthName, workspaces: wsCount, reports: rpCount });
  }
  return result;
}

function buildDonutData(reports: Report[]) {
  if (reports.length === 0) {
    return [{ name: "No Reports", value: 1, color: "#cbd5e1" }];
  }
  
  let single = 0;
  let comparison = 0;
  
  reports.forEach(r => {
    if (r.type === "comparison") comparison++;
    else single++;
  });
  
  const result = [];
  if (single > 0) result.push({ name: "Single Reports", value: single, color: "#3b82f6" });
  if (comparison > 0) result.push({ name: "Comparison", value: comparison, color: "#f59e0b" });
  
  return result;
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
      className="p-6 rounded-3xl bg-white shadow-sm border border-slate-100 flex flex-col justify-between h-full hover:shadow-md transition-shadow"
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

  const performanceData = buildChartData(workspaces, reports);
  const allocationData = buildDonutData(reports);
  const totalDocs = reports.length;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-2">Research Command</h1>
            <p className="text-slate-500 font-medium">
              Welcome back, {user?.name?.split(" ")[0] || "Alex"}. You have <span className="text-slate-700 font-bold">{workspaces.length} active workspaces</span> this quarter.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-bold shadow-2xs hover:bg-slate-50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-bold shadow-2xs hover:bg-slate-50 transition-colors flex items-center gap-2">
              <Share className="w-4 h-4" />
              Share Insights
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
            badgeText="+2 this week"
            badgeBg="bg-slate-100"
            badgeColor="text-slate-600"
          />
          <StatCard
            title="Reports Generated"
            value={reports.length.toString()}
            icon={FileText}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
            badgeText="Up to date"
            badgeBg="bg-slate-100"
            badgeColor="text-slate-600"
          />

        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Area Chart */}
          <div className="lg:col-span-2 p-6 md:p-8 rounded-3xl bg-white shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Research Activity</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Workspaces and Reports over the last 6 months</p>
              </div>
              <div className="flex gap-4 text-sm font-bold">
                <span className="text-slate-400 cursor-pointer hover:text-slate-800 transition-colors">Daily</span>
                <span className="text-slate-400 cursor-pointer hover:text-slate-800 transition-colors">Weekly</span>
                <span className="text-blue-600 border-b-2 border-blue-600 pb-1 cursor-pointer">Monthly</span>
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
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} dy={10} />
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
          <div className="p-6 md:p-8 rounded-3xl bg-white shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-800">Report Types</h3>
              <div className="flex items-center gap-1 text-sm font-bold text-slate-500 cursor-pointer">
                All
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
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
    </DashboardLayout>
  );
}
