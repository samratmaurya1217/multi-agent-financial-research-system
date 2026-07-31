import { motion } from "framer-motion";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/store/authStore";
import { User, Shield, Bell, BarChart2, Star, Edit3 } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-2"><User className="h-4 w-4" /><span>Profile</span></div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-1">My Profile</h1>
          <p className="text-slate-500 font-medium text-sm">Manage your account details and usage statistics.</p>
        </motion.div>

        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm mb-6">
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 border border-blue-400 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xl font-bold text-white">{user?.avatarInitials ?? "??"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{user?.name}</h2>
                <Badge variant="info">{user?.role} Plan</Badge>
              </div>
              <p className="text-slate-500 font-medium text-sm mb-3">{user?.email}</p>
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard title="Workspaces" value="4" icon={Star} iconColor="text-indigo-400" iconBg="bg-indigo-500/10" />
          <StatCard title="Documents" value="14" icon={BarChart2} iconColor="text-violet-400" iconBg="bg-violet-500/10" />
          <StatCard title="Research Sessions" value="11" icon={Bell} iconColor="text-rose-400" iconBg="bg-rose-500/10" />
          <StatCard title="Reports" value="7" icon={Star} iconColor="text-amber-400" iconBg="bg-amber-500/10" />
        </motion.div>

        {/* Plan info */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-8 rounded-3xl border border-blue-200 bg-gradient-to-b from-blue-50 to-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-slate-800 font-bold text-lg mb-1">Analyst Plan</h3>
              <p className="text-slate-500 font-medium text-sm">Unlimited workspaces · 100 documents/month · Full feature access</p>
            </div>
            <button className="px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20">
              Manage Plan
            </button>
          </div>
          <div className="mt-6 space-y-4">
            {[
              { label: "Documents this month", used: 14, total: 100 },
              { label: "API calls this month", used: 247, total: 5000 },
            ].map((bar) => (
              <div key={bar.label}>
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>{bar.label}</span>
                  <span>{bar.used} / {bar.total}</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(bar.used / bar.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
