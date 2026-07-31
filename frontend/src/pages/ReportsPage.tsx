import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getReports, downloadReport, generateReport, type Report } from "@/services/reports";
import { getWorkspaces } from "@/services/workspace";
import { FileText, Download, Plus, ExternalLink, Clock } from "lucide-react";




export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Report | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function loadReports() {
      try {
        // Load reports from all workspaces
        const workspaces = await getWorkspaces();
        const allReports: Report[] = [];
        for (const ws of workspaces) {
          try {
            const rpts = await getReports(ws.workspace_id);
            allReports.push(...rpts);
          } catch {
            // skip failed workspace
          }
        }
        // Sort by most recently generated
        allReports.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
        setReports(allReports);
        if (allReports.length > 0) setSelected(allReports[0]);
      } catch (err) {
        console.error("Reports load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const handleDownload = async (id: string) => {
    await downloadReport(id);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const workspaces = await getWorkspaces();
      const wsId = workspaces[0]?.workspace_id || "ws_default";
      const newReport = await generateReport(wsId, [], {
        target_company: workspaces[0]?.name || "Company",
        type: "single",
      });
      setReports((prev) => [newReport, ...prev]);
      setSelected(newReport);
    } catch (err) {
      console.error("Generate report error:", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-2"><FileText className="h-4 w-4" /><span>Reports</span></div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-1">Generated Reports</h1>
            <p className="text-slate-500 font-medium text-sm">PDF reports with citations, metrics, and risk assessments.</p>
          </div>
          <button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-md shadow-blue-500/20">
            {generating ? <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</> : <><Plus className="h-4 w-4" />Generate Report</>}
          </button>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Report list */}
          <div className="lg:col-span-1 space-y-3">
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-3xl bg-slate-100 animate-pulse border border-slate-200" />)}</div>
            ) : reports.length === 0 ? (
              <EmptyState icon={FileText} title="No reports yet" description="Generate your first report from a workspace." />
            ) : (
              reports.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                  onClick={() => setSelected(r)}
                  className={`p-5 rounded-3xl border cursor-pointer transition-all ${selected?.id === r.id ? "border-blue-400 bg-blue-50 shadow-sm" : "border-slate-100 bg-white hover:border-slate-300 hover:shadow-md"}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-indigo-500" />
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1 line-clamp-2">{r.title}</h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(r.generatedAt).toLocaleDateString()}
                    <span>·</span>
                    <span>{r.pageCount} pages</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Report preview */}
          <div className="lg:col-span-2">
            {selected ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Report header */}
                <div className="px-8 py-6 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-slate-800 font-extrabold text-xl mb-1">{selected.title}</h2>
                      <p className="text-slate-500 font-medium text-sm">{selected.companyNames.join(" · ")} · {new Date(selected.generatedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-bold text-sm hover:text-slate-800 hover:border-slate-300 hover:bg-white transition-all shadow-sm">
                        <ExternalLink className="h-3.5 w-3.5" /> Share
                      </button>
                      <button onClick={() => handleDownload(selected.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold text-sm hover:bg-blue-100 transition-colors shadow-sm">
                        <Download className="h-3.5 w-3.5" /> PDF
                      </button>
                    </div>
                  </div>
                  {/* Tabs */}
                  <div className="flex gap-1 mt-6 overflow-x-auto">
                    {(selected.sections || []).map((tab: string, i: number) => (
                      <button key={tab} onClick={() => setActiveTab(i)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${activeTab === i ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}>
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Content */}
                <div className="px-8 py-6">
                  {selected.sections[activeTab] === "Red Flags" && selected.redFlags && selected.redFlags.length > 0 ? (
                    <div className="space-y-4">
                      <div className="mb-4">
                        <h3 className="text-lg font-extrabold text-slate-800">Identified Red Flags</h3>
                        <p className="text-sm font-medium text-slate-500">The following potential risks were extracted from the source documents.</p>
                      </div>
                      {selected.redFlags.map((flag: any, idx: number) => (
                        <div key={idx} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col gap-2 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-extrabold text-slate-800">{flag.category || "Risk"} - {flag.trigger || "Issue Identified"}</span>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${flag.severity === 'high' ? 'bg-rose-100 text-rose-700' : flag.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{String(flag.severity || "medium").toUpperCase()}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-600">{flag.description || "No description provided."}</p>
                          <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-200 text-xs font-bold text-slate-400">
                            <span>Confidence: {Math.round((flag.confidence || 0) * 100)}%</span>
                            <span>Page {flag.page || 'N/A'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selected.sections[activeTab] === "Red Flags" ? (
                    <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50 text-center">
                       <p className="text-sm font-bold text-slate-500">No red flags were identified in the analyzed documents.</p>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-line">
                      <p className="mb-3"><strong className="text-slate-800">{selected.title}</strong></p>
                      <p className="mb-2">Companies analyzed: <span className="text-slate-800">{selected.companyNames.join(" · ")}</span></p>
                      <p className="mb-2">Report type: <span className="text-slate-800 capitalize">{selected.type}</span></p>
                      <p className="mb-2">Pages: <span className="text-slate-800">{selected.pageCount || "N/A"}</span></p>
                      <p className="mb-4">Sections: <span className="text-slate-800">{selected.sections.join(", ")}</span></p>
                      <p>Status: <span className={selected.status === "ready" ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>{selected.status}</span></p>
                    </div>
                  )}
                  <div className="mt-6 p-4 rounded-2xl border border-blue-100 bg-blue-50 flex items-start gap-3">
                    <FileText className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-blue-800">This report was generated from workspace documents indexed in the Velsora system. Generated at {new Date(selected.generatedAt).toLocaleString()}.</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-64 rounded-3xl border-2 border-slate-200 border-dashed bg-white/50">
                <p className="text-slate-400 font-bold text-sm">Select a report to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
