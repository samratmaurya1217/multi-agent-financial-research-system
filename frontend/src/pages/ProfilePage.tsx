import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/store/authStore";
import { User, Shield, BarChart2, Edit3, FolderOpen, FileText, MessageSquare } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
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
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
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
      </div>
    </DashboardLayout>
  );
}
