import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getReports, downloadReport, type Report } from "@/services/reports";
import { FileText, Download, Plus, ExternalLink, Clock } from "lucide-react";

const TABS = ["Executive Summary", "Financials", "Red Flags", "Outlook"];

const EXEC_SUMMARY = `Apple Inc. delivered solid results in FY2024 with total net sales of $391.0 billion (+2.0% YoY), driven by continued strength in Services (+13%), which reached $96.2 billion and now represents 25% of total revenue. Products revenue was relatively flat at $294.9B, constrained by maturation in iPhone and a softening Mac market.\n\nOperating income reached $123.2B (operating margin: 31.5%), and net income came in at $93.7B ($6.11 diluted EPS). Free cash flow remained exceptional at $108.8B, supporting continued share buybacks ($90.2B repurchased in FY2024).`;

export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Report | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    getReports("ws_01").then((r) => {
      setReports(r); setLoading(false);
      if (r.length > 0) setSelected(r[0]);
    });
  }, []);

  const handleDownload = async (id: string) => {
    await downloadReport(id);
    alert("PDF download would begin here (backend integration pending).");
  };

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 2000));
    setGenerating(false);
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-white/30 text-sm mb-2"><FileText className="h-4 w-4" /><span>Reports</span></div>
            <h1 className="text-2xl font-bold text-white mb-1">Generated Reports</h1>
            <p className="text-white/40 text-sm">PDF reports with citations, metrics, and risk assessments.</p>
          </div>
          <button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-rose-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            {generating ? <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</> : <><Plus className="h-4 w-4" />Generate Report</>}
          </button>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Report list */}
          <div className="lg:col-span-1 space-y-3">
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white/[0.03] animate-pulse border border-white/[0.06]" />)}</div>
            ) : reports.length === 0 ? (
              <EmptyState icon={FileText} title="No reports yet" description="Generate your first report from a workspace." />
            ) : (
              reports.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                  onClick={() => setSelected(r)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${selected?.id === r.id ? "border-indigo-500/40 bg-indigo-500/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14]"}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-indigo-400" />
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2">{r.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-white/30">
                    <Clock className="h-3 w-3" />
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
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                {/* Report header */}
                <div className="px-6 py-5 border-b border-white/[0.06]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-white font-semibold mb-1">{selected.title}</h2>
                      <p className="text-white/40 text-sm">{selected.companyNames.join(" · ")} · {new Date(selected.generatedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/50 text-sm hover:text-white hover:border-white/20 transition-all">
                        <ExternalLink className="h-3.5 w-3.5" /> Share
                      </button>
                      <button onClick={() => handleDownload(selected.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm hover:bg-indigo-500/30 transition-colors">
                        <Download className="h-3.5 w-3.5" /> PDF
                      </button>
                    </div>
                  </div>
                  {/* Tabs */}
                  <div className="flex gap-1 mt-4 overflow-x-auto">
                    {TABS.filter((t) => selected.sections.includes(t)).map((tab, i) => (
                      <button key={tab} onClick={() => setActiveTab(i)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap ${activeTab === i ? "bg-white/[0.08] text-white" : "text-white/40 hover:text-white"}`}>
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Content */}
                <div className="px-6 py-5">
                  <div className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{EXEC_SUMMARY}</div>
                  <div className="mt-4 p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-start gap-2">
                    <FileText className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-indigo-300">All figures are sourced from <strong>AAPL_10K_FY2024.pdf</strong> (pages 24–28, 47–52). Click any number to view the source excerpt.</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-64 rounded-2xl border border-white/[0.06] border-dashed">
                <p className="text-white/30 text-sm">Select a report to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
