import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/store/authStore";
import { User, Shield, BarChart2, Edit3, FolderOpen, FileText, MessageSquare, X, Check } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { getWorkspaces, type Workspace } from "@/services/workspace";
import { getReports, type Report } from "@/services/reports";

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || "Analyst");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [stats, setStats] = useState({
    workspaces: 0,
    documents: 0,
    sessions: 0,
    reports: 0,
  });

  useEffect(() => {
    if (user?.name) {
      setNameInput(user.name);
    }
  }, [user?.name]);

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

  const handleSaveProfile = () => {
    if (!nameInput.trim()) return;
    updateUser({ name: nameInput.trim() });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setShowEditModal(false);
    }, 1200);
  };

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
          className="p-6 rounded-3xl border border-slate-200 bg-white shadow-xs mb-6"
        >
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 border border-blue-400 flex items-center justify-center flex-shrink-0 shadow-xs">
              <span className="text-xl font-bold text-white">{user?.avatarInitials ?? "??"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{user?.name || "Analyst"}</h2>
              </div>
              <p className="text-slate-500 font-medium text-sm mb-3">{user?.email || "analyst@velsora.ai"}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                </button>
                <button
                  onClick={() => navigate("/settings")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-xs active:scale-95 cursor-pointer"
                >
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

      {/* ─── Edit Profile Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Edit3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Edit Profile</h3>
                    <p className="text-xs font-medium text-slate-500">Update your display information</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-sm font-medium cursor-not-allowed"
                  />
                  <span className="text-[11px] font-medium text-slate-400 mt-1 block">Email is managed by authentication provider.</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs active:scale-95"
                >
                  {savedSuccess ? <Check className="h-3.5 w-3.5" /> : null}
                  <span>{savedSuccess ? "Saved!" : "Save Changes"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
