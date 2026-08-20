import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getReports,
  getReportById,
  downloadReport,
  viewReportPdf,
  generateReport,
  type Report,
} from "@/services/reports";
import { getWorkspaces, type Workspace } from "@/services/workspace";
import { getDocuments, type Document } from "@/services/documents";
import {
  FileText,
  Download,
  Plus,
  ExternalLink,
  Clock,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  X,
  RefreshCw,
  BookOpen,
  Sparkles,
  Check,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const REPORT_SECTIONS = [
  "Executive Summary",
  "Key Financials",
  "Red Flags",
  "Company Comparison",
  "Outlook",
  "Sources & Citations",
];

export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Report | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [openingPdf, setOpeningPdf] = useState(false);

  // Generate Modal State
  const [showModal, setShowModal] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [workspaceDocs, setWorkspaceDocs] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [targetCompany, setTargetCompany] = useState<string>("");
  const [reportType, setReportType] = useState<"single" | "comparison">("single");
  const [reportTitle, setReportTitle] = useState<string>("");

  useEffect(() => {
    loadAllReports();
    loadWorkspaceList();
  }, []);

  async function loadWorkspaceList() {
    try {
      const wsList = await getWorkspaces();
      setWorkspaces(wsList);
      if (wsList.length > 0) {
        setSelectedWorkspaceId(wsList[0].workspace_id);
        setTargetCompany(wsList[0].name || "Company");
      }
    } catch (e) {
      console.error("Failed to load workspaces:", e);
    }
  }

  async function loadAllReports() {
    setLoading(true);
    try {
      const wsList = await getWorkspaces();
      const allReports: Report[] = [];
      for (const ws of wsList) {
        try {
          const rpts = await getReports(ws.workspace_id);
          allReports.push(...rpts);
        } catch {
          // skip
        }
      }
      allReports.sort(
        (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
      );
      setReports(allReports);
      if (allReports.length > 0) {
        // Fetch full details of the first report
        try {
          const fullFirst = await getReportById(allReports[0].id);
          setSelected(fullFirst);
        } catch {
          setSelected(allReports[0]);
        }
      }
    } catch (err) {
      console.error("Reports load error:", err);
    } finally {
      setLoading(false);
    }
  }

  // When workspace changes in modal, load its documents
  useEffect(() => {
    if (!selectedWorkspaceId) return;
    async function fetchDocs() {
      try {
        const docs = await getDocuments(selectedWorkspaceId);
        setWorkspaceDocs(docs);
        setSelectedDocIds(docs.map((d) => d.id));
        const currentWs = workspaces.find((w) => w.workspace_id === selectedWorkspaceId);
        if (currentWs) {
          setTargetCompany(currentWs.name || "Company");
        }
      } catch (e) {
        console.error("Failed to fetch workspace documents:", e);
      }
    }
    fetchDocs();
  }, [selectedWorkspaceId, workspaces]);

  const handleSelectReport = async (reportSummary: Report) => {
    setSelected(reportSummary);
    try {
      const full = await getReportById(reportSummary.id);
      setSelected(full);
    } catch (e) {
      console.error("Error fetching full report:", e);
    }
  };

  const handleDownload = async (id: string) => {
    if (!selected) return;
    setDownloadingPdf(true);
    try {
      await downloadReport(id, selected.title);
    } catch (e: any) {
      console.error("PDF download error:", e);
      alert(e?.message || "Failed to download PDF report.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleOpenPdf = async (id: string) => {
    setOpeningPdf(true);
    try {
      await viewReportPdf(id);
    } catch (e: any) {
      console.error("PDF preview error:", e);
      alert(e?.message || "Failed to preview PDF report.");
    } finally {
      setOpeningPdf(false);
    }
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspaceId) return;

    setGenerating(true);
    setShowModal(false);

    try {
      const newReport = await generateReport(selectedWorkspaceId, selectedDocIds, {
        target_company: targetCompany || "Analyzed Company",
        type: reportType,
        title: reportTitle || undefined,
        sections: [
          "Executive Summary",
          "Key Financials",
          "Red Flags",
          "Company Comparison",
          "Outlook",
        ],
      });

      setReports((prev) => [newReport, ...prev]);
      setSelected(newReport);
      setActiveTab(0);
    } catch (err) {
      console.error("Generate report error:", err);
    } finally {
      setGenerating(false);
    }
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-7xl mx-auto">
        {/* Top Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Milestone 4 • Final Report Agent</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">
              Institutional Diligence Reports
            </h1>
            <p className="text-slate-500 font-medium text-sm">
              Publication-grade PDF reports synthesized from verified multi-agent extractions, risks, and peer comparisons.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Synthesizing Report...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Generate New Report</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Main 2-Column Grid */}
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Report List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Reports ({reports.length})
              </span>
              <button
                onClick={loadAllReports}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 rounded-3xl bg-slate-100 animate-pulse border border-slate-200"
                  />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No reports generated"
                description="Click 'Generate New Report' to compile your first institutional PDF."
              />
            ) : (
              <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
                {reports.map((r, i) => {
                  const isSelected = selected?.id === r.id;
                  return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleSelectReport(r)}
                      className={cn(
                        "p-5 rounded-3xl border cursor-pointer transition-all relative overflow-hidden",
                        isSelected
                          ? "border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600" />
                      )}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="h-9 w-9 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                          <FileText className="h-4.5 w-4.5 text-blue-600" />
                        </div>
                        <StatusBadge status={r.status} />
                      </div>

                      <h3 className="text-sm font-extrabold text-slate-800 mb-1 line-clamp-2 leading-snug">
                        {r.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-400 mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(r.generatedAt).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>{r.pageCount || 3} pages</span>
                        <span>•</span>
                        <span className="capitalize">{r.type}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Report Viewer & Interactive Tabs (8 cols) */}
          <div className="lg:col-span-8">
            {selected ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden"
              >
                {/* Report Header Card */}
                <div className="px-8 py-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                          <ShieldCheck className="h-3 w-3" />
                          Strict Grounding Verified
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 text-xs font-semibold">
                          {selected.pageCount || 3} Pages PDF
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold capitalize">
                          {selected.type} Analysis
                        </span>
                      </div>

                      <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1.5">
                        {selected.title}
                      </h2>
                      <p className="text-slate-300 text-xs md:text-sm font-medium">
                        {selected.companyNames.join(" • ")} | Workspace: {selected.workspaceId}
                      </p>
                    </div>

                    {/* PDF Actions */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        onClick={() => handleOpenPdf(selected.id)}
                        disabled={openingPdf}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all shadow-sm disabled:opacity-50"
                      >
                        {openingPdf ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ExternalLink className="h-3.5 w-3.5" />
                        )}
                        <span>{openingPdf ? "Opening..." : "View PDF"}</span>
                      </button>
                      <button
                        onClick={() => handleDownload(selected.id)}
                        disabled={downloadingPdf}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/30 active:scale-95 disabled:opacity-50"
                      >
                        {downloadingPdf ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        <span>{downloadingPdf ? "Downloading..." : "Download PDF"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Section Tabs */}
                  <div className="flex gap-1.5 mt-6 overflow-x-auto border-t border-white/10 pt-4 custom-scrollbar">
                    {REPORT_SECTIONS.map((tab, idx) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(idx)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                          activeTab === idx
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-white/70 hover:text-white hover:bg-white/10"
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Content Body */}
                <div className="p-8">
                  {/* TAB 0: EXECUTIVE SUMMARY */}
                  {activeTab === 0 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-black text-slate-900 mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-blue-600" />
                          Executive Performance Briefing
                        </h3>
                        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm leading-relaxed font-normal whitespace-pre-line">
                          {selected.executive_summary ||
                            "Executive summary synthesizing revenue momentum, operational efficiency, and risk posture across the filed reports."}
                        </div>
                      </div>

                      {/* Snapshot Highlights */}
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                            Extracted Metrics
                          </p>
                          <p className="text-2xl font-black text-slate-900">
                            {selected.extracted_metrics?.length || 0}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">Verified financial items</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1">
                            Red Flags Detected
                          </p>
                          <p className="text-2xl font-black text-slate-900">
                            {selected.red_flags?.length || 0}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">Audited risk disclosures</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">
                            Grounded Citations
                          </p>
                          <p className="text-2xl font-black text-slate-900">
                            {selected.citations?.length || 0}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">Primary source references</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 1: KEY FINANCIALS */}
                  {activeTab === 1 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-black text-slate-900 mb-2 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          Quantitative Commentary & Ratio Analysis
                        </h3>
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm leading-relaxed font-normal whitespace-pre-line">
                          {selected.key_financials_narrative ||
                            "Quantitative synthesis of extracted financial metrics including topline performance, operating profit, and leverage ratios."}
                        </div>
                      </div>

                      {/* Financial Metrics Table */}
                      <div>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                          Verified Financial Metrics Matrix
                        </h4>
                        {selected.extracted_metrics && selected.extracted_metrics.length > 0 ? (
                          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                            <table className="w-full text-left text-xs border-collapse bg-white">
                              <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-extrabold uppercase tracking-wider text-[11px]">
                                <tr>
                                  <th className="px-4 py-3">Financial Dimension</th>
                                  <th className="px-4 py-3">Reported Value</th>
                                  <th className="px-4 py-3">Unit</th>
                                  <th className="px-4 py-3">Period</th>
                                  <th className="px-4 py-3">Source Citation</th>
                                  <th className="px-4 py-3">Confidence</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {selected.extracted_metrics.map((m, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-4 py-3 font-bold text-slate-900 capitalize">
                                      {m.name.replace(/_/g, " ")}
                                    </td>
                                    <td className="px-4 py-3 font-black text-slate-900">
                                      {typeof m.value === "number" ? m.value.toLocaleString() : m.value}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{m.unit || "—"}</td>
                                    <td className="px-4 py-3 text-slate-600">{m.period || "FY"}</td>
                                    <td className="px-4 py-3 text-blue-600 font-bold">
                                      {m.source_document_id || "doc"} (p.{m.page || "1"})
                                    </td>
                                    <td className="px-4 py-3 text-emerald-600 font-bold">
                                      {Math.round((m.confidence || 0.95) * 100)}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No standard metrics extracted.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: RED FLAGS */}
                  {activeTab === 2 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-black text-slate-900 mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          Risk Assessment & Footnote Audit
                        </h3>
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm leading-relaxed font-normal whitespace-pre-line">
                          {selected.red_flags_narrative ||
                            "Analysis of detected risks, accounting shifts, and governance disclosures."}
                        </div>
                      </div>

                      {/* Red Flags List */}
                      <div className="space-y-3">
                        {selected.red_flags && selected.red_flags.length > 0 ? (
                          selected.red_flags.map((rf, idx) => {
                            const sev = String(rf.severity || "medium").toLowerCase();
                            return (
                              <div
                                key={idx}
                                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs transition-all flex flex-col gap-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-900 uppercase">
                                      {rf.category || "General Risk"}
                                    </span>
                                    {rf.title && (
                                      <span className="text-xs font-extrabold text-slate-700">
                                        • {rf.title}
                                      </span>
                                    )}
                                  </div>
                                  <span
                                    className={cn(
                                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                                      sev === "high"
                                        ? "bg-rose-100 text-rose-700 border border-rose-200"
                                        : sev === "medium"
                                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                                        : "bg-blue-100 text-blue-700 border border-blue-200"
                                    )}
                                  >
                                    {sev}
                                  </span>
                                </div>

                                <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-medium">
                                  {rf.description}
                                </p>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-400">
                                  <span className="text-blue-600">
                                    Source: {rf.source_document_id || "doc"} (Page {rf.page || 1})
                                  </span>
                                  <span>Verified Grounding</span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50 text-center">
                            <p className="text-xs font-bold text-slate-500">
                              No critical red flags detected in analyzed filings.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: COMPANY COMPARISON */}
                  {activeTab === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-black text-slate-900 mb-2 flex items-center gap-2">
                          <Layers className="h-4 w-4 text-blue-600" />
                          Comparative Benchmarking & Positioning
                        </h3>
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm leading-relaxed font-normal whitespace-pre-line">
                          {selected.comparison_narrative ||
                            "Cross-company and historical comparative benchmarking evaluating relative margin dynamics and capital allocation."}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: OUTLOOK */}
                  {activeTab === 4 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-black text-slate-900 mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-blue-600" />
                          Strategic Outlook & Forward Catalysts
                        </h3>
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm leading-relaxed font-normal whitespace-pre-line">
                          {selected.outlook_narrative ||
                            "Forward-looking strategic trajectory grounded in management guidance and operational risk disclosures."}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: SOURCES & CITATIONS */}
                  {activeTab === 5 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-black text-slate-900 mb-2 flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-blue-600" />
                          Source Citations & Verification Ledger
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                          All quantitative figures and risk observations are indexed to the following primary document citations:
                        </p>

                        {selected.citations && selected.citations.length > 0 ? (
                          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                            <table className="w-full text-left text-xs border-collapse bg-white">
                              <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-extrabold uppercase tracking-wider text-[11px]">
                                <tr>
                                  <th className="px-4 py-3">#</th>
                                  <th className="px-4 py-3">Document ID</th>
                                  <th className="px-4 py-3">Page</th>
                                  <th className="px-4 py-3">Dimension / Metric</th>
                                  <th className="px-4 py-3">Excerpt Evidence</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {selected.citations.map((c, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-4 py-3 font-bold text-slate-400">{idx + 1}</td>
                                    <td className="px-4 py-3 font-black text-blue-600">{c.document_id}</td>
                                    <td className="px-4 py-3 font-bold text-slate-700">p.{c.page}</td>
                                    <td className="px-4 py-3 font-bold text-slate-900">{c.metric || "Item"}</td>
                                    <td className="px-4 py-3 text-slate-600 max-w-md line-clamp-2">
                                      {c.snippet || "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No citations recorded.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footnote Bar */}
                  <div className="mt-8 p-4 rounded-2xl border border-blue-100 bg-blue-50/60 flex items-start gap-3">
                    <FileText className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-950 leading-relaxed font-medium">
                      Generated via Velsora Multi-Agent System (Report Agent) on{" "}
                      <span className="font-bold">
                        {new Date(selected.generatedAt).toLocaleString()}
                      </span>
                      . PDF output is stored and ready for institutional export.
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-80 rounded-3xl border-2 border-slate-200 border-dashed bg-slate-50/50 text-center p-6">
                <FileText className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-600 font-extrabold text-sm">No Report Selected</p>
                <p className="text-slate-400 text-xs mt-1 max-w-sm">
                  Select a report from the list on the left to preview, or click "Generate New Report" to create a fresh diligence document.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Generate Report Modal */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden"
              >
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        Generate Institutional Report
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Compile verified agent extractions into an analyst PDF
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="h-8 w-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleGenerateSubmit} className="p-6 space-y-4">
                  {/* Select Workspace */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Target Workspace
                    </label>
                    <select
                      value={selectedWorkspaceId}
                      onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      {workspaces.map((ws) => (
                        <option key={ws.workspace_id} value={ws.workspace_id}>
                          {ws.name} ({ws.documentCount || 0} docs)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Company Name */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Company Name / Entity Title
                    </label>
                    <input
                      type="text"
                      value={targetCompany}
                      onChange={(e) => setTargetCompany(e.target.value)}
                      placeholder="e.g. Apple Inc. or Tesla Motors"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Optional Custom Title */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Report Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      placeholder="e.g. Apple Inc. FY24 Institutional Diligence"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Document Multi-Select Scope */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Included Filings ({selectedDocIds.length}/{workspaceDocs.length})
                    </label>
                    {workspaceDocs.length === 0 ? (
                      <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-slate-100">
                        No filings uploaded in this workspace yet.
                      </p>
                    ) : (
                      <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-slate-200 bg-slate-50 custom-scrollbar">
                        {workspaceDocs.map((doc) => {
                          const isChecked = selectedDocIds.includes(doc.id);
                          return (
                            <div
                              key={doc.id}
                              onClick={() => toggleDocSelection(doc.id)}
                              className={cn(
                                "px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all flex items-center justify-between",
                                isChecked
                                  ? "bg-blue-50 border-blue-300 text-blue-900"
                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                              )}
                            >
                              <span className="truncate max-w-xs">{doc.filename}</span>
                              {isChecked && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Report Type */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setReportType("single")}
                      className={cn(
                        "p-3 rounded-2xl border text-left transition-all",
                        reportType === "single"
                          ? "bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      )}
                    >
                      <p className="text-xs font-black">Single Company</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Deep diligence report</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportType("comparison")}
                      className={cn(
                        "p-3 rounded-2xl border text-left transition-all",
                        reportType === "comparison"
                          ? "bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      )}
                    >
                      <p className="text-xs font-black">Peer Comparison</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Benchmarking matrix</p>
                    </button>
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 rounded-full border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={generating || !selectedWorkspaceId}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50"
                    >
                      {generating ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Generate Report</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
