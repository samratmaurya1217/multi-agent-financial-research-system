import { useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/store/authStore";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Settings, User, Bell, Shield, Key, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "account" | "notifications" | "security" | "api" | "danger";

const TABS: { id: Tab; label: string; icon: typeof Settings }[] = [
  { id: "account",       label: "Account",       icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security",      label: "Security",      icon: Shield },
  { id: "api",           label: "API Keys",      icon: Key },
  { id: "danger",        label: "Danger Zone",   icon: AlertTriangle },
];

function InputRow({ label, value, type = "text", disabled = false }: { label: string; value: string; type?: string; disabled?: boolean }) {
  const [val, setVal] = useState(value);
  return (
    <div className="grid md:grid-cols-3 gap-4 items-center py-4 border-t border-slate-100">
      <label className="text-sm font-bold text-slate-500">{label}</label>
      <div className="md:col-span-2">
        <input
          type={type}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-medium focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all disabled:opacity-50"
        />
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, defaultChecked = false }: { label: string; desc: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <div className="flex items-start justify-between py-4 border-t border-slate-100">
      <div>
        <p className="text-sm font-bold text-slate-700">{label}</p>
        <p className="text-xs font-medium text-slate-400 mt-1">{desc}</p>
      </div>
      <button onClick={() => setOn((v) => !v)} className={cn("h-6 w-11 rounded-full transition-colors flex-shrink-0 relative", on ? "bg-blue-600" : "bg-slate-200")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("account");

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-2"><Settings className="h-4 w-4" /><span>Settings</span></div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-1">Settings</h1>
          <p className="text-slate-500 font-medium text-sm">Configure your account and workspace preferences.</p>
        </motion.div>

        <div className="flex gap-6 flex-col md:flex-row">
          {/* Tab sidebar */}
          <aside className="md:w-56 flex-shrink-0">
            <nav className="space-y-1">
              {TABS.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left", activeTab === tab.id ? "bg-white shadow-sm border border-slate-200 text-blue-600" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent")}>
                  <tab.icon className="h-4 w-4 flex-shrink-0" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Tab content */}
          <div className="flex-1 min-w-0">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="p-8 rounded-3xl border border-slate-200 bg-white shadow-sm">
              {activeTab === "account" && (
                <>
                  <h3 className="text-slate-800 font-bold text-lg mb-4">Account Information</h3>
                  <InputRow label="Full Name" value={user?.name || "Samrat Maurya"} />
                  <InputRow label="Email" value={user?.email || "s.sam.11221177@gmail.com"} type="email" disabled />
                  <InputRow label="Role / Plan" value={user?.role || "Analyst Plan"} />
                  
                  <div className="flex items-center justify-between py-4 border-t border-slate-100 mt-2">
                    <div>
                      <p className="text-sm font-bold text-slate-700">Interface Theme</p>
                      <p className="text-xs font-medium text-slate-400 mt-1">Toggle between Dark and Light mode</p>
                    </div>
                    <ThemeToggle />
                  </div>

                  <div className="pt-6 border-t border-slate-100 mt-2">
                    <button className="px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20">Save Changes</button>
                  </div>
                </>
              )}

              {activeTab === "notifications" && (
                <>
                  <h3 className="text-slate-800 font-bold text-lg mb-4">Notification Preferences</h3>
                  <ToggleRow label="Document processing complete" desc="Notify when a document finishes processing" defaultChecked={true} />
                  <ToggleRow label="Report generated" desc="Notify when a report is ready to download" defaultChecked={true} />
                  <ToggleRow label="Research session complete" desc="Notify when a long research session finishes" defaultChecked={false} />
                  <ToggleRow label="Weekly usage digest" desc="Weekly summary of your research activity" defaultChecked={true} />
                </>
              )}

              {activeTab === "security" && (
                <>
                  <h3 className="text-slate-800 font-bold text-lg mb-4">Security Settings</h3>
                  <InputRow label="Current Password" value="" type="password" />
                  <InputRow label="New Password" value="" type="password" />
                  <InputRow label="Confirm Password" value="" type="password" />
                  <div className="pt-6 border-t border-slate-100 mt-2">
                    <button className="px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20">Update Password</button>
                  </div>
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <h4 className="text-slate-800 font-bold text-sm mb-4">Two-Factor Authentication</h4>
                    <ToggleRow label="Enable 2FA" desc="Add an extra layer of security to your account" />
                  </div>
                </>
              )}

              {activeTab === "api" && (
                <>
                  <h3 className="text-slate-800 font-bold text-lg mb-2">API Keys</h3>
                  <p className="text-slate-500 font-medium text-sm mb-6">API access is available on the Team plan. These keys allow programmatic access to the Velsora API.</p>
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 font-medium text-sm mb-6 shadow-sm">
                    API key management requires backend integration. Available when FastAPI backend is connected.
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                    <code className="text-sm font-bold text-slate-500 flex-1">sk_live_••••••••••••••••••••••••••••••</code>
                    <button className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white shadow-sm">Reveal</button>
                    <button className="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors px-3 py-1.5 rounded-lg border border-rose-200 hover:border-rose-300 bg-rose-50 shadow-sm">Revoke</button>
                  </div>
                </>
              )}

              {activeTab === "danger" && (
                <>
                  <h3 className="text-slate-800 font-bold text-lg mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-rose-500" /> Danger Zone</h3>
                  {[
                    { label: "Delete all workspaces", desc: "Permanently delete all workspaces and their documents. This cannot be undone.", action: "Delete Workspaces" },
                    { label: "Delete account", desc: "Permanently delete your account and all associated data. This is irreversible.", action: "Delete Account" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start justify-between gap-4 py-4 border-t border-slate-100">
                      <div>
                        <p className="text-sm font-bold text-slate-700">{item.label}</p>
                        <p className="text-xs font-medium text-slate-500 mt-1 max-w-xs">{item.desc}</p>
                      </div>
                      <button className="px-4 py-2 rounded-full border border-rose-200 bg-rose-50 text-rose-600 font-bold text-sm hover:bg-rose-100 transition-colors shadow-sm flex-shrink-0">{item.action}</button>
                    </div>
                  ))}
                </>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
