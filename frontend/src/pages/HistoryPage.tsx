import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import { getWorkspaces, type Workspace } from "@/services/workspace";
import { getDocuments, type Document } from "@/services/documents";
import { getReports, type Report } from "@/services/reports";
import { getSessions, type ResearchSession } from "@/services/research";
import { History, Upload, MessageSquare, FileText, FolderOpen, Filter, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ActivityType = "upload" | "chat" | "report" | "workspace";

interface ActivityEvent {
  id: string;
  type: ActivityType;
  action: string;
  detail: string;
  workspace: string;
  timestamp: string;
  formattedTime: string;
}

const typeIcon: Record<ActivityType, React.ReactNode> = {
  upload: <Upload className="h-4 w-4 text-blue-600" />,
  chat: <MessageSquare className="h-4 w-4 text-purple-600" />,
  report: <FileText className="h-4 w-4 text-orange-600" />,
  workspace: <FolderOpen className="h-4 w-4 text-emerald-600" />,
};

const typeBg: Record<ActivityType, string> = {
  upload: "bg-blue-50 border-blue-200",
  chat: "bg-purple-50 border-purple-200",
  report: "bg-orange-50 border-orange-200",
  workspace: "bg-emerald-50 border-emerald-200",
};

export function HistoryPage() {
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActivityHistory() {
      try {
        setLoading(true);
        const workspaces: Workspace[] = await getWorkspaces();
        const activityList: ActivityEvent[] = [];

        for (const ws of workspaces) {
          // 1. Workspace event
          activityList.push({
            id: `ws_${ws.workspace_id}`,
            type: "workspace",
            action: "Created workspace",
            detail: ws.name,
            workspace: ws.name,
            timestamp: ws.createdAt,
            formattedTime: new Date(ws.createdAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          });

          // 2. Documents
          try {
            const docs: Document[] = await getDocuments(ws.workspace_id);
            for (const doc of docs) {
              const sizeStr = doc.size_kb ? `${doc.size_kb} KB` : "PDF";
              activityList.push({
                id: `doc_${doc.document_id}`,
                type: "upload",
                action: "Uploaded document",
                detail: `${doc.filename} (${sizeStr})`,
                workspace: ws.name,
                timestamp: doc.uploadedAt,
                formattedTime: new Date(doc.uploadedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              });
            }
          } catch {
            // Ignore error
          }

          // 3. Research Sessions
          try {
            const sessions: ResearchSession[] = await getSessions(ws.workspace_id);
            for (const s of sessions) {
              activityList.push({
                id: `sess_${s.conversation_id}`,
                type: "chat",
                action: "Research session",
                detail: `${s.title} · ${s.messageCount} turns`,
                workspace: ws.name,
                timestamp: s.updatedAt || s.createdAt,
                formattedTime: new Date(s.updatedAt || s.createdAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              });
            }
          } catch {
            // Ignore error
          }

          // 4. Reports
          try {
            const rpts: Report[] = await getReports(ws.workspace_id);
            for (const r of rpts) {
              activityList.push({
                id: `rpt_${r.report_id}`,
                type: "report",
                action: "Generated report",
                detail: r.title,
                workspace: ws.name,
                timestamp: r.generatedAt,
                formattedTime: new Date(r.generatedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              });
            }
          } catch {
            // Ignore error
          }
        }

        // Sort descending by timestamp
        activityList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setEvents(activityList);
      } catch (err) {
        console.error("Failed to load activity history:", err);
      } finally {
        setLoading(false);
      }
    }

    loadActivityHistory();
  }, []);

  const filtered = events.filter((e) => filter === "all" || e.type === filter);

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-2">
            <History className="h-4 w-4" />
            <span>History</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-1">Activity History</h1>
          <p className="text-slate-500 font-medium text-sm">
            Your real-time research and document activity across all active workspaces.
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 mb-8 flex-wrap"
        >
          <Filter className="h-4 w-4 text-slate-400" />
          {(["all", "upload", "chat", "report", "workspace"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border shadow-2xs",
                filter === f
                  ? "bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-500/10"
                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300"
              )}
            >
              {f === "all" ? "All Activity" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
            </button>
          ))}
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            <p className="text-sm font-bold text-slate-500">Loading activity timeline...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
            <EmptyState
              icon={History}
              title="No activity recorded"
              description="Activities will appear here in real-time as you upload documents, converse with research agents, and generate reports."
            />
          </div>
        ) : (
          /* Timeline */
          <div className="relative pl-8">
            <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-200" />
            <div className="space-y-4">
              {filtered.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative flex items-start gap-4"
                >
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      "absolute -left-[31px] h-8 w-8 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-2xs",
                      typeBg[event.type]
                    )}
                  >
                    {typeIcon[event.type]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{event.action}</p>
                        <p className="text-sm font-medium text-slate-600 mt-0.5">{event.detail}</p>
                        <p className="text-xs font-semibold text-slate-400 mt-1">
                          Workspace: <span className="text-slate-600">{event.workspace}</span>
                        </p>
                      </div>
                      <p className="text-xs font-bold text-slate-400 flex-shrink-0 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        {event.formattedTime}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
