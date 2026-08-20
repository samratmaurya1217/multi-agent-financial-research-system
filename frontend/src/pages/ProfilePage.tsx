import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/store/authStore";
import { User, Shield, BarChart2, Edit3, FolderOpen, FileText, MessageSquare } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { getWorkspaces, type Workspace } from "@/services/workspace";
import { getReports, type Report } from "@/services/reports";

export function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    workspaces: 0,
    documents: 0,
    sessions: 0,
    reports: 0,
  });

  useEffect(() => {
    async function loadUserStats() {
      try {
        const workspaces: Workspace[] = await getWorkspaces();
        const reports: Report[] = await getReports();

        let totalDocs = 0;
        let totalSessions = 0;
        workspaces.forEach((w) => {
          totalDocs += w.documentCount || 0;
          totalSessions += w.sessionCount || 0;
        });

        setStats({
          workspaces: workspaces.length,
          documents: totalDocs,
          sessions: totalSessions,
          reports: reports.length,
        });
      } catch (err) {
        console.error("Failed to load user stats:", err);
      }
    }

    loadUserStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-1">My Profile</h1>
          <p className="text-slate-500 font-medium text-sm">
            Manage your account details and real-time usage statistics.
          </p>
        </motion.div>

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm mb-6"
        >
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 border border-blue-400 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xl font-bold text-white">{user?.avatarInitials ?? "??"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{user?.name || "Analyst"}</h2>
                <Badge variant="info">{user?.role ? `${user.role} Plan` : "Analyst Plan"}</Badge>
              </div>
              <p className="text-slate-500 font-medium text-sm mb-3">{user?.email || "analyst@velsora.ai"}</p>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm">
                  <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                </button>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm">
                  <Shield className="h-3.5 w-3.5" /> Security
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Usage stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <StatCard
            title="Workspaces"
            value={stats.workspaces.toString()}
            icon={FolderOpen}
            iconColor="text-indigo-600"
            iconBg="bg-indigo-50"
          />
          <StatCard
            title="Documents"
            value={stats.documents.toString()}
            icon={FileText}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <StatCard
            title="Research Sessions"
            value={stats.sessions.toString()}
            icon={MessageSquare}
            iconColor="text-purple-600"
            iconBg="bg-purple-50"
          />
          <StatCard
            title="Reports"
            value={stats.reports.toString()}
            icon={BarChart2}
            iconColor="text-orange-600"
            iconBg="bg-orange-50"
          />
        </motion.div>

        {/* Plan info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-8 rounded-3xl border border-blue-200 bg-gradient-to-b from-blue-50 to-white shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-slate-800 font-bold text-lg mb-1">
                {user?.role ? `${user.role} Plan` : "Analyst Plan"}
              </h3>
              <p className="text-slate-500 font-medium text-sm">
                Unlimited workspaces · 100 documents/month · Multi-agent extraction enabled
              </p>
            </div>
            <button className="px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20">
              Manage Plan
            </button>
          </div>
          <div className="mt-6 space-y-4">
            {[
              { label: "Active Documents Ingested", used: stats.documents, total: 100 },
              { label: "Research Queries & Reports", used: stats.sessions + stats.reports, total: 500 },
            ].map((bar) => (
              <div key={bar.label}>
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>{bar.label}</span>
                  <span>{bar.used} / {bar.total}</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(5, (bar.used / bar.total) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
