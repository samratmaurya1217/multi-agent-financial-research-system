import { useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/store/authStore";
import { Settings, User, Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "account" | "security" | "danger";

const TABS: { id: Tab; label: string; icon: typeof Settings }[] = [
  { id: "account",  label: "Account",     icon: User },
  { id: "security", label: "Security",    icon: Shield },
  { id: "danger",   label: "Danger Zone", icon: AlertTriangle },
];

function InputRow({
  label,
  value,
  type = "text",
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  disabled?: boolean;
  onChange?: (v: string) => void;
}) {
  const [val, setVal] = useState(value);
  return (
    <div className="grid md:grid-cols-3 gap-4 items-center py-4 border-t border-slate-100">
      <label className="text-sm font-bold text-slate-600">{label}</label>
      <div className="md:col-span-2">
        <input
          type={type}
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            onChange?.(e.target.value);
          }}
          disabled={disabled}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("account");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-1">Settings</h1>
          <p className="text-slate-500 font-medium text-sm">Configure your account and research workspace preferences.</p>
        </motion.div>

        <div className="flex gap-6 flex-col md:flex-row">
          {/* Tab sidebar */}
          <aside className="md:w-56 flex-shrink-0">
            <nav className="space-y-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left",
                    activeTab === tab.id
                      ? "bg-white shadow-xs border border-slate-200 text-blue-600"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent"
                  )}
                >
                  <tab.icon className="h-4 w-4 flex-shrink-0" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Tab content */}
          <div className="flex-1 min-w-0">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="p-8 rounded-3xl border border-slate-200 bg-white shadow-xs"
            >
              {activeTab === "account" && (
                <>
                  <h3 className="text-slate-800 font-bold text-lg mb-4">Account Information</h3>
                  <InputRow label="Full Name" value={user?.name || "Analyst"} />
                  <InputRow label="Email" value={user?.email || "analyst@velsora.ai"} type="email" disabled />

                  <div className="pt-6 border-t border-slate-100 mt-2 flex items-center gap-4">
                    <button
                      onClick={handleSave}
                      className="px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 active:scale-95"
                    >
                      Save Changes
                    </button>
                    {savedSuccess && (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                        Preferences saved successfully
                      </span>
                    )}
                  </div>
                </>
              )}

              {activeTab === "security" && (
                <>
                  <h3 className="text-slate-800 font-bold text-lg mb-4">Security Settings</h3>
                  <InputRow label="Current Password" value="" type="password" />
                  <InputRow label="New Password" value="" type="password" />
                  <InputRow label="Confirm Password" value="" type="password" />
                  <div className="pt-6 border-t border-slate-100 mt-2">
                    <button className="px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 active:scale-95">
                      Update Password
                    </button>
                  </div>
                </>
              )}

              {activeTab === "danger" && (
                <>
                  <h3 className="text-slate-800 font-bold text-lg mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-rose-500" /> Danger Zone
                  </h3>
                  {[
                    {
                      label: "Reset workspace documents",
                      desc: "Clear cached documents and re-index from primary source files.",
                      action: "Reset Cache",
                    },
                    {
                      label: "Delete account",
                      desc: "Permanently delete your account session and associated local tokens.",
                      action: "Delete Account",
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start justify-between gap-4 py-4 border-t border-slate-100">
                      <div>
                        <p className="text-sm font-bold text-slate-700">{item.label}</p>
                        <p className="text-xs font-medium text-slate-500 mt-1 max-w-xs">{item.desc}</p>
                      </div>
                      <button className="px-4 py-2 rounded-full border border-rose-200 bg-rose-50 text-rose-600 font-bold text-sm hover:bg-rose-100 transition-colors shadow-xs flex-shrink-0 active:scale-95">
                        {item.action}
                      </button>
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
