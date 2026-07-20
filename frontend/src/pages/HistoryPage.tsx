import { useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { History, Upload, MessageSquare, FileText, FolderOpen, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

type ActivityType = "upload" | "chat" | "report" | "workspace";

const EVENTS: { type: ActivityType; action: string; detail: string; workspace: string; time: string }[] = [
  { type: "upload",    action: "Uploaded document",       detail: "AAPL_10K_FY2024.pdf (4.2 MB)",       workspace: "Apple Inc. Analysis",    time: "Today · 08:22 AM" },
  { type: "chat",      action: "Research session",         detail: "AAPL Revenue Analysis · 4 messages",  workspace: "Apple Inc. Analysis",    time: "Today · 08:10 AM" },
  { type: "report",    action: "Generated report",         detail: "Tesla vs Ford — Competitive Benchmark",workspace: "Tesla vs Ford",          time: "Yesterday · 03:44 PM" },
  { type: "upload",    action: "Uploaded document",        detail: "TSLA_10K_FY2023.pdf (5.6 MB)",       workspace: "Tesla vs Ford",          time: "Yesterday · 02:00 PM" },
  { type: "chat",      action: "Research session",         detail: "Risk Factor Deep Dive · 6 messages",  workspace: "Apple Inc. Analysis",    time: "2 days ago · 10:00 AM" },
  { type: "workspace", action: "Created workspace",        detail: "MSFT Deep Dive",                      workspace: "MSFT Deep Dive",         time: "3 days ago · 11:30 AM" },
  { type: "report",    action: "Generated report",         detail: "Apple Inc. Full Analysis — FY2024",   workspace: "Apple Inc. Analysis",    time: "4 days ago · 09:15 AM" },
  { type: "upload",    action: "Uploaded document",        detail: "Ford_Annual_Report_2023.pdf (3.1 MB)","workspace": "Tesla vs Ford",        time: "5 days ago · 04:22 PM" },
];

const typeIcon: Record<ActivityType, React.ReactNode> = {
  upload:    <Upload className="h-4 w-4 text-indigo-400" />,
  chat:      <MessageSquare className="h-4 w-4 text-violet-400" />,
  report:    <FileText className="h-4 w-4 text-rose-400" />,
  workspace: <FolderOpen className="h-4 w-4 text-amber-400" />,
};

const typeBg: Record<ActivityType, string> = {
  upload:    "bg-indigo-500/10 border-indigo-500/20",
  chat:      "bg-violet-500/10 border-violet-500/20",
  report:    "bg-rose-500/10 border-rose-500/20",
  workspace: "bg-amber-500/10 border-amber-500/20",
};

export function HistoryPage() {
  const [filter, setFilter] = useState<ActivityType | "all">("all");

  const filtered = EVENTS.filter((e) => filter === "all" || e.type === filter);

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 text-white/30 text-sm mb-2"><History className="h-4 w-4" /><span>History</span></div>
          <h1 className="text-2xl font-bold text-white mb-1">Activity History</h1>
          <p className="text-white/40 text-sm">Your complete research history across all workspaces.</p>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter className="h-4 w-4 text-white/30" />
          {(["all", "upload", "chat", "report", "workspace"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-all border", filter === f ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "border-white/[0.08] text-white/40 hover:text-white hover:border-white/20")}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
            </button>
          ))}
        </motion.div>

        {/* Timeline */}
        <div className="relative pl-6">
          <div className="absolute left-0 top-2 bottom-2 w-px bg-white/[0.06]" />
          <div className="space-y-4">
            {filtered.map((event, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative flex items-start gap-4">
                {/* Timeline dot */}
                <div className={cn("absolute -left-[25px] h-8 w-8 rounded-lg border flex items-center justify-center flex-shrink-0", typeBg[event.type])}>
                  {typeIcon[event.type]}
                </div>
                {/* Content */}
                <div className="flex-1 ml-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">{event.action}</p>
                      <p className="text-sm text-white/50 mt-0.5">{event.detail}</p>
                      <p className="text-xs text-white/25 mt-1">In <span className="text-white/40">{event.workspace}</span></p>
                    </div>
                    <p className="text-xs text-white/30 flex-shrink-0">{event.time}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
