import { useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/layouts/DashboardLayout";
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

function InputRow({ label, value, type = "text" }: { label: string; value: string; type?: string }) {
  return (
    <div className="grid md:grid-cols-3 gap-4 items-center py-4 border-t border-white/[0.04]">
      <label className="text-sm font-medium text-white/60">{label}</label>
      <div className="md:col-span-2">
        <input type={type} defaultValue={value} className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-indigo-500/60 transition-all" />
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, defaultChecked = false }: { label: string; desc: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <div className="flex items-start justify-between py-4 border-t border-white/[0.04]">
      <div>
        <p className="text-sm font-medium text-white/80">{label}</p>
        <p className="text-xs text-white/40 mt-0.5">{desc}</p>
      </div>
      <button onClick={() => setOn((v) => !v)} className={cn("h-6 w-11 rounded-full transition-colors flex-shrink-0 relative", on ? "bg-indigo-500" : "bg-white/[0.10]")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("account");

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 text-white/30 text-sm mb-2"><Settings className="h-4 w-4" /><span>Settings</span></div>
          <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
          <p className="text-white/40 text-sm">Configure your account and workspace preferences.</p>
        </motion.div>

        <div className="flex gap-6 flex-col md:flex-row">
          {/* Tab sidebar */}
          <aside className="md:w-48 flex-shrink-0">
            <nav className="space-y-0.5">
              {TABS.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all text-left", activeTab === tab.id ? "bg-white/[0.08] text-white" : "text-white/40 hover:text-white hover:bg-white/[0.04]")}>
                  <tab.icon className="h-4 w-4 flex-shrink-0" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Tab content */}
          <div className="flex-1 min-w-0">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              {activeTab === "account" && (
                <>
                  <h3 className="text-white font-semibold mb-4">Account Information</h3>
                  <InputRow label="Full Name" value="Samrat Maurya" />
                  <InputRow label="Email" value="samrat@finsight.ai" type="email" />
                  <InputRow label="Organization" value="FinSight Research" />
                  <div className="pt-4 border-t border-white/[0.04] mt-2">
                    <button className="px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-rose-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity">Save Changes</button>
                  </div>
                </>
              )}

              {activeTab === "notifications" && (
                <>
                  <h3 className="text-white font-semibold mb-4">Notification Preferences</h3>
                  <ToggleRow label="Document processing complete" desc="Notify when a document finishes processing" defaultChecked={true} />
                  <ToggleRow label="Report generated" desc="Notify when a report is ready to download" defaultChecked={true} />
                  <ToggleRow label="Research session complete" desc="Notify when a long research session finishes" defaultChecked={false} />
                  <ToggleRow label="Weekly usage digest" desc="Weekly summary of your research activity" defaultChecked={true} />
                </>
              )}

              {activeTab === "security" && (
                <>
                  <h3 className="text-white font-semibold mb-4">Security Settings</h3>
                  <InputRow label="Current Password" value="" type="password" />
                  <InputRow label="New Password" value="" type="password" />
                  <InputRow label="Confirm Password" value="" type="password" />
                  <div className="pt-4 border-t border-white/[0.04] mt-2">
                    <button className="px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-rose-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity">Update Password</button>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/[0.06]">
                    <h4 className="text-white/60 font-medium text-sm mb-3">Two-Factor Authentication</h4>
                    <ToggleRow label="Enable 2FA" desc="Add an extra layer of security to your account" />
                  </div>
                </>
              )}

              {activeTab === "api" && (
                <>
                  <h3 className="text-white font-semibold mb-2">API Keys</h3>
                  <p className="text-white/40 text-sm mb-6">API access is available on the Team plan. These keys allow programmatic access to the FinSight API.</p>
                  <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 text-sm mb-4">
                    API key management requires backend integration. Available when FastAPI backend is connected.
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <code className="text-sm text-white/40 flex-1">sk_live_••••••••••••••••••••••••••••••</code>
                    <button className="text-xs text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/20">Reveal</button>
                    <button className="text-xs text-rose-400 hover:text-rose-300 transition-colors px-3 py-1.5 rounded-lg border border-rose-500/20 hover:border-rose-500/40">Revoke</button>
                  </div>
                </>
              )}

              {activeTab === "danger" && (
                <>
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-rose-400" /> Danger Zone</h3>
                  {[
                    { label: "Delete all workspaces", desc: "Permanently delete all workspaces and their documents. This cannot be undone.", action: "Delete Workspaces" },
                    { label: "Delete account", desc: "Permanently delete your account and all associated data. This is irreversible.", action: "Delete Account" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start justify-between gap-4 py-4 border-t border-white/[0.04]">
                      <div>
                        <p className="text-sm font-medium text-white/80">{item.label}</p>
                        <p className="text-xs text-white/40 mt-0.5 max-w-xs">{item.desc}</p>
                      </div>
                      <button className="px-4 py-2 rounded-full border border-rose-500/30 text-rose-400 text-sm hover:bg-rose-500/10 transition-colors flex-shrink-0">{item.action}</button>
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
