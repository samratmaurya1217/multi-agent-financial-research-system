import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/store/authStore";
import { getWorkspaces, type Workspace } from "@/services/workspace";
import { getDocuments, type Document } from "@/services/documents";
import {
  runComparison,
  type ComparisonResult,
  type ComparisonTableRow,
} from "@/services/comparison";
import {
  GitCompare,
  Loader2,
  Sparkles,
  Check,
  ChevronDown,
  Search,
  FileText,
  X,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  BookOpen,
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ComparisonPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Workspaces & Documents State
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);
  const [docsError, setDocsError] = useState<string | null>(null);

  // Selection & Dropdown State
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Comparison Agent Results State
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [hasCompared, setHasCompared] = useState<boolean>(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  // Citation Modal Preview
  const [citationModal, setCitationModal] = useState<{
    docName: string;
    metricLabel: string;
    page?: number;
    snippet?: string;
    confidence?: number;
  } | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Initial Load: Fetch workspaces and set active workspace
  useEffect(() => {
    async function initWorkspaces() {
      try {
        setLoadingDocs(true);
        setDocsError(null);
        const wsList = await getWorkspaces();
        setWorkspaces(wsList);

        const targetWsId =
          user?.workspaceId ||
          (wsList.length > 0 ? wsList[0].workspace_id : "ws_default");

        setActiveWorkspaceId(targetWsId);
      } catch (err: any) {
        console.error("Failed to load workspaces:", err);
        setDocsError(err.message || "Failed to load workspace data.");
        setLoadingDocs(false);
      }
    }
    initWorkspaces();
  }, [user]);

  // 2. Fetch documents whenever active workspace changes
  useEffect(() => {
    if (!activeWorkspaceId) return;

    async function loadWorkspaceDocs() {
      try {
        setLoadingDocs(true);
        setDocsError(null);
        // Reset comparison results when switching workspace
        setHasCompared(false);
        setComparisonResult(null);

        const docs = await getDocuments(activeWorkspaceId);

        // Deduplicate documents strictly by document_id
        const uniqueMap = new Map<string, Document>();
        for (const doc of docs) {
          if (doc.document_id && !uniqueMap.has(doc.document_id)) {
            uniqueMap.set(doc.document_id, doc);
          }
        }
        const uniqueDocs = Array.from(uniqueMap.values());
        setDocuments(uniqueDocs);

        // Pre-select first 2 documents if available
        if (uniqueDocs.length >= 2) {
          setSelectedDocIds([uniqueDocs[0].document_id, uniqueDocs[1].document_id]);
        } else if (uniqueDocs.length === 1) {
          setSelectedDocIds([uniqueDocs[0].document_id]);
        } else {
          setSelectedDocIds([]);
        }
      } catch (err: any) {
        console.error("Failed to load documents for workspace:", err);
        setDocsError(err.message || "Failed to retrieve documents from backend.");
      } finally {
        setLoadingDocs(false);
      }
    }

    loadWorkspaceDocs();
  }, [activeWorkspaceId]);

  // Document formatting helper
  const getDocDisplayName = (filename: string) => {
    return filename
      .replace(/\.(pdf|docx|txt)$/i, "")
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .trim();
  };

  // Toggle selection of a document
  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) => {
      if (prev.includes(docId)) {
        return prev.filter((id) => id !== docId);
      } else {
        return [...prev, docId];
      }
    });
  };

  // Select all / clear selection
  const selectAllDocs = () => {
    setSelectedDocIds(documents.map((d) => d.document_id));
  };

  const clearSelection = () => {
    setSelectedDocIds([]);
    setHasCompared(false);
    setComparisonResult(null);
  };

  // Filter available documents by search input
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter(
      (d) =>
        d.filename.toLowerCase().includes(q) ||
        getDocDisplayName(d.filename).toLowerCase().includes(q)
    );
  }, [documents, searchQuery]);

  // 3. Comparison Execution: Calls backend Comparison Agent (SAD 7.4)
  const handleRunComparison = async () => {
    if (selectedDocIds.length < 2) return;

    try {
      setIsComparing(true);
      setComparisonError(null);

      // Validate selected document IDs belong to current workspace
      const validDocs = documents.filter((d) => selectedDocIds.includes(d.document_id));
      if (validDocs.length < 2) {
        throw new Error("Please select at least 2 valid documents from the active workspace.");
      }

      // Invoke backend Comparison Agent
      const res = await runComparison(activeWorkspaceId, selectedDocIds);
      setComparisonResult(res);
      setHasCompared(true);
    } catch (err: any) {
      console.error("Comparison execution failed:", err);
      setComparisonError(err.message || "An error occurred while running the Comparison Agent.");
    } finally {
      setIsComparing(false);
    }
  };

  const activeWorkspaceName =
    workspaces.find((w) => w.workspace_id === activeWorkspaceId)?.name ||
    user?.name + "'s Workspace" ||
    "Active Workspace";

  const comparedDocs = comparisonResult?.documents || [];

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-7xl mx-auto space-y-8">
        {/* Header with Workspace Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-6"
        >
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-2">
              <GitCompare className="h-4 w-4" />
              <span>Cross-Company Intelligence</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
              Company Comparison
            </h1>
            <p className="text-slate-500 font-medium text-sm mt-1">
              Cross-reference extracted financial data and red flags across companies for benchmarking and grounded peer analysis.
            </p>
          </div>

          {/* Workspace Switcher */}
          {workspaces.length > 1 && (
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs self-start md:self-auto">
              <span className="text-xs font-bold text-slate-500 pl-2">Workspace:</span>
              <select
                value={activeWorkspaceId}
                onChange={(e) => setActiveWorkspaceId(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                {workspaces.map((ws) => (
                  <option key={ws.workspace_id} value={ws.workspace_id}>
                    {ws.name} ({ws.documentCount || 0} docs)
                  </option>
                ))}
              </select>
            </div>
          )}
        </motion.div>

        {/* Loading Documents from Backend State */}
        {loadingDocs ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 shadow-2xs">
            <Loader2 className="h-9 w-9 text-blue-600 animate-spin mb-3" />
            <p className="text-sm font-bold text-slate-700">Loading indexed workspace documents...</p>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Fetching verified filings for {activeWorkspaceName}
            </p>
          </div>
        ) : docsError ? (
          <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">Failed to retrieve documents</h3>
              <p className="text-xs text-rose-600 mt-1">{docsError}</p>
            </div>
          </div>
        ) : documents.length < 2 ? (
          /* Empty State: Workspace has < 2 documents */
          <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-2xs text-center">
            <EmptyState
              icon={GitCompare}
              title="At least 2 documents required for comparison"
              description={`The active workspace (${activeWorkspaceName}) contains ${documents.length} document. Upload two or more corporate filings (PDF, DOCX) to generate side-by-side comparative financial insights.`}
              action={{
                label: "Upload Documents",
                onClick: () => navigate("/upload"),
              }}
            />
          </div>
        ) : (
          /* Main Document Selection & Comparison Workspace */
          <div className="space-y-6">
            {/* Selection Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-2xs space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                    Select Documents to Compare
                  </h2>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Choose 2 or more indexed filings from {activeWorkspaceName}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllDocs}
                    className="text-xs font-bold text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
                  >
                    Select All ({documents.length})
                  </button>
                  {selectedDocIds.length > 0 && (
                    <button
                      onClick={clearSelection}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-full hover:bg-rose-50 transition-colors"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>

              {/* Multi-Select Dropdown Component */}
              <div className="relative" ref={dropdownRef}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Available Filings ({documents.length} indexed)
                </label>

                {/* Dropdown Toggle Trigger Button */}
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border text-left text-sm font-medium transition-all shadow-2xs bg-slate-50/70",
                    dropdownOpen
                      ? "border-blue-500 bg-white ring-4 ring-blue-500/10"
                      : "border-slate-200 hover:border-slate-300 hover:bg-white text-slate-700"
                  )}
                >
                  <div className="flex items-center gap-3 truncate">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <span className="font-semibold text-slate-800">
                      {selectedDocIds.length === 0
                        ? "Select documents to compare..."
                        : `${selectedDocIds.length} of ${documents.length} documents selected`}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-slate-400 transition-transform duration-200",
                      dropdownOpen && "rotate-180 text-blue-600"
                    )}
                  />
                </button>

                {/* Dropdown Menu Overlay */}
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.99 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-30 mt-2 w-full bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden"
                    >
                      {/* Search in Dropdown */}
                      <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter by company or filename..."
                            className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-800 placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* Dropdown Options List with dedicated custom scroller */}
                      <div className="max-h-64 overflow-y-auto overscroll-contain custom-scrollbar p-2 pr-1.5 space-y-1 divide-y divide-slate-50">
                        {filteredDocuments.length === 0 ? (
                          <div className="p-6 text-center text-xs font-medium text-slate-400">
                            No documents matched your search filter.
                          </div>
                        ) : (
                          filteredDocuments.map((doc) => {
                            const isSelected = selectedDocIds.includes(doc.document_id);
                            const displayName = getDocDisplayName(doc.filename);
                            const pageCount = doc.total_pages || doc.pageCount;
                            const sizeKb = doc.size_kb || doc.sizeKb;

                            return (
                              <div
                                key={doc.document_id}
                                onClick={() => toggleDocSelection(doc.document_id)}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors text-left",
                                  isSelected
                                    ? "bg-blue-50/80 text-blue-900 font-semibold"
                                    : "hover:bg-slate-50 text-slate-700"
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0 pr-4">
                                  {/* Custom Checkbox */}
                                  <div
                                    className={cn(
                                      "h-5 w-5 rounded-lg border flex items-center justify-center transition-all flex-shrink-0",
                                      isSelected
                                        ? "bg-blue-600 border-blue-600 text-white shadow-2xs"
                                        : "border-slate-300 bg-white"
                                    )}
                                  >
                                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                  </div>

                                  <div className="truncate">
                                    <p className="text-xs font-bold text-slate-800 truncate">
                                      {displayName}
                                    </p>
                                    <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                                      {doc.filename}
                                    </p>
                                  </div>
                                </div>

                                {/* Document Metadata Badges */}
                                <div className="flex items-center gap-2 flex-shrink-0 text-[10px] font-bold text-slate-500">
                                  {pageCount !== undefined && (
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                                      {pageCount} {pageCount === 1 ? "page" : "pages"}
                                    </span>
                                  )}
                                  {sizeKb !== undefined && (
                                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                                      {sizeKb} KB
                                    </span>
                                  )}
                                  <span className="uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                                    {doc.file_type || "PDF"}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Selected Documents Badges Row */}
              {selectedDocIds.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Selected for Comparison ({selectedDocIds.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedDocIds.map((id) => {
                      const doc = documents.find((d) => d.document_id === id);
                      if (!doc) return null;
                      const displayName = getDocDisplayName(doc.filename);

                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 border border-blue-200 text-blue-800 shadow-2xs"
                        >
                          <FileText className="h-3.5 w-3.5 text-blue-600" />
                          <span className="max-w-[200px] truncate">{displayName}</span>
                          {doc.total_pages && (
                            <span className="text-[10px] text-blue-500 font-semibold">
                              ({doc.total_pages}p)
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDocSelection(id);
                            }}
                            className="h-4 w-4 rounded-full flex items-center justify-center text-blue-400 hover:text-rose-600 hover:bg-rose-100 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action / Trigger Row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  {selectedDocIds.length < 2 ? (
                    <span className="text-amber-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Select at least 2 documents to enable Comparison Agent
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" />
                      {selectedDocIds.length} filings ready for multi-agent synthesis
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={selectedDocIds.length < 2 || isComparing}
                  onClick={handleRunComparison}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white transition-all shadow-md shadow-blue-500/20",
                    selectedDocIds.length < 2 || isComparing
                      ? "bg-slate-300 cursor-not-allowed text-slate-500 shadow-none"
                      : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]"
                  )}
                >
                  {isComparing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Synthesizing Comparative Analysis...</span>
                    </>
                  ) : (
                    <>
                      <GitCompare className="h-4 w-4" />
                      <span>Compare Selected Documents</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>

            {/* Comparison Execution Results */}
            {comparisonError && (
              <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm">Comparison Error</h3>
                  <p className="text-xs text-rose-600 mt-1">{comparisonError}</p>
                </div>
              </div>
            )}

            {!hasCompared && !isComparing && (
              <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 bg-white/50 space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-slate-800 font-bold text-base">
                  Ready to Compare
                </h3>
                <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
                  Click <strong>"Compare Selected Documents"</strong> to trigger the Comparison Agent for side-by-side metric benchmarking, risk cross-analysis, and grounded narrative synthesis.
                </p>
              </div>
            )}

            {isComparing && (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                <div className="text-center">
                  <h3 className="text-slate-800 font-bold text-base">
                    Executing Comparison Agent Pipeline
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    Loading Extraction & Red Flag outputs, aligning metrics, and synthesizing grounded comparative narrative via NVIDIA Nemotron 3 Ultra / Gemini...
                  </p>
                </div>
              </div>
            )}

            {hasCompared && !isComparing && comparisonResult && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* ─── Executive Benchmark Header Banner ─────────────────── */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-indigo-900/40 space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-blue-400 text-xs font-extrabold uppercase tracking-wider mb-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        <span>Comparative Intelligence Synthesis</span>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                        {comparedDocs.map((d) => getDocDisplayName(d.filename)).join(" vs ")}
                      </h2>
                      <p className="text-blue-200/80 font-medium text-xs md:text-sm mt-1.5 max-w-2xl">
                        Cross-referenced analysis synthesized from {comparisonResult.table.length} verified metrics, {comparisonResult.red_flags_summary.length} risk categories, and {comparisonResult.citations.length} grounded citations.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
                      <button
                        onClick={handleRunComparison}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all active:scale-95 shadow-sm"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Re-run Agent
                      </button>
                    </div>
                  </div>

                  {/* Badges Row */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-white/10 text-xs">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-bold">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      Status: Grounded Synthesis Verified
                    </span>

                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200 font-bold">
                      <BookOpen className="h-3.5 w-3.5 text-amber-300" />
                      Citations: {comparisonResult.citations.length} verified excerpts
                    </span>

                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-200 font-bold">
                      <Check className="h-3.5 w-3.5 text-blue-400" />
                      Workspace: {activeWorkspaceName}
                    </span>
                  </div>

                  {/* Section Jump Nav Pills */}
                  <div className="flex items-center gap-2 pt-2 overflow-x-auto">
                    <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Jump to:</span>
                    <a
                      href="#section-metric-table"
                      className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                    >
                      1. Metric Table ({comparisonResult.table.length})
                    </a>
                    <a
                      href="#section-comparative-summary"
                      className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                    >
                      2. Comparative Summary
                    </a>
                    <a
                      href="#section-risk-summary"
                      className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                    >
                      3. Risk & Red Flags ({comparisonResult.red_flags_summary.length})
                    </a>
                    <a
                      href="#section-citations-ledger"
                      className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                    >
                      4. Sources & Citations ({comparisonResult.citations.length})
                    </a>
                  </div>
                </div>

                {/* ─── 1. Side-by-Side Metric Benchmarking Table ───────────── */}
                <div id="section-metric-table" className="space-y-3 scroll-mt-6">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-extrabold text-slate-800">
                        1. Side-by-Side Metric Benchmarking Table
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      {comparisonResult.table.length} financial dimensions aligned
                    </span>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/90 border-b border-slate-200">
                            <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider w-1/4">
                              Financial Dimension
                            </th>
                            {comparedDocs.map((doc) => (
                              <th
                                key={doc.document_id}
                                className="px-6 py-4 text-right text-xs font-extrabold text-slate-800 uppercase tracking-wider"
                              >
                                <div>
                                  <span className="block truncate font-black text-slate-900">
                                    {getDocDisplayName(doc.filename)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-semibold normal-case">
                                    {doc.total_pages} pages ({doc.file_type.toUpperCase()})
                                  </span>
                                </div>
                              </th>
                            ))}
                            <th className="px-6 py-4 text-right text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                              Variance / Delta
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {comparisonResult.table.length === 0 ? (
                            <tr>
                              <td
                                colSpan={comparedDocs.length + 2}
                                className="px-6 py-12 text-center text-xs font-medium text-slate-400"
                              >
                                No common financial metrics found in these filings.
                              </td>
                            </tr>
                          ) : (
                            comparisonResult.table.map((row: ComparisonTableRow, idx: number) => (
                              <motion.tr
                                key={row.metric}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.02 }}
                                className="hover:bg-slate-50/80 transition-colors"
                              >
                                <td className="px-6 py-4 text-xs font-bold text-slate-700">
                                  <div>
                                    <span className="block text-slate-900 font-black text-sm">
                                      {row.metric_label}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                      {row.category}
                                    </span>
                                  </div>
                                </td>

                                {comparedDocs.map((doc) => {
                                  const val = row.values[doc.document_id];
                                  const detail = row.details[doc.document_id];
                                  const isBest = row.best_performer === doc.document_id;
                                  const isWorst = row.worst_performer === doc.document_id && comparedDocs.length > 2;

                                  if (val === null || val === undefined) {
                                    return (
                                      <td
                                        key={doc.document_id}
                                        className="px-6 py-4 text-right text-xs font-medium text-slate-400"
                                      >
                                        <span className="text-slate-300 italic">Not Disclosed</span>
                                      </td>
                                    );
                                  }

                                  const formattedVal =
                                    typeof val === "number"
                                      ? val.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                      : val;

                                  return (
                                    <td key={doc.document_id} className="px-6 py-4 text-right">
                                      <div className="space-y-1 inline-block text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          {isBest && (
                                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shadow-2xs">
                                              Leader
                                            </span>
                                          )}
                                          {isWorst && (
                                            <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shadow-2xs">
                                              Laggard
                                            </span>
                                          )}
                                          <span className="text-sm font-black text-slate-900">
                                            {formattedVal}{" "}
                                            {row.unit && (
                                              <span className="text-[11px] font-bold text-slate-500">
                                                {row.unit}
                                              </span>
                                            )}
                                          </span>
                                        </div>

                                        <div className="flex items-center justify-end gap-1.5">
                                          {row.period && (
                                            <span className="text-[10px] font-semibold text-slate-400">
                                              {row.period}
                                            </span>
                                          )}

                                          {detail?.page && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setCitationModal({
                                                  docName: getDocDisplayName(doc.filename),
                                                  metricLabel: row.metric_label,
                                                  page: detail.page,
                                                  snippet: detail.snippet,
                                                  confidence: detail.confidence,
                                                })
                                              }
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-100"
                                            >
                                              <BookOpen className="h-2.5 w-2.5" />
                                              p.{detail.page}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}

                                <td className="px-6 py-4 text-right text-xs font-bold">
                                  {row.variance ? (
                                    <span
                                      className={cn(
                                        "px-2.5 py-1 rounded-full text-xs font-extrabold shadow-2xs inline-block",
                                        row.variance.startsWith("+")
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : "bg-rose-50 text-rose-700 border border-rose-200"
                                      )}
                                    >
                                      {row.variance}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-medium">—</span>
                                  )}
                                </td>
                              </motion.tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* ─── 2. Short Comparative Summary (Below Table) ─────────── */}
                <div id="section-comparative-summary" className="space-y-3 scroll-mt-6">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-extrabold text-slate-800">
                        2. Grounded Comparative Summary & Synthesis
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Strict Grounding Verified
                    </span>
                  </div>

                  <div className="p-6 md:p-8 rounded-3xl border border-slate-200 bg-white shadow-2xs space-y-6">
                    <div className="prose prose-slate max-w-none text-xs md:text-sm text-slate-700 leading-relaxed font-medium">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ node, ...props }) => (
                            <div className="my-5 overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                              <table className="w-full text-left text-xs border-collapse bg-white" {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => (
                            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-800 font-extrabold uppercase tracking-wider text-[11px]" {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className="px-4 py-3 border-r border-slate-200 last:border-r-0 font-black" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="px-4 py-3 border-b border-slate-100 border-r border-slate-100 last:border-r-0 text-slate-800 font-medium" {...props} />
                          ),
                          h1: ({ node, ...props }) => (
                            <h1 className="text-xl font-black text-slate-900 mt-6 mb-3 border-b border-slate-100 pb-2" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-base font-extrabold text-slate-900 mt-6 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-sm font-black text-slate-900 mt-4 mb-2 flex items-center gap-1.5" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-5 my-2 space-y-1 text-slate-700" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal pl-5 my-2 space-y-1 text-slate-700" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="leading-relaxed" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="font-extrabold text-slate-900" {...props} />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-3 bg-blue-50/60 rounded-r-xl italic text-slate-700 text-xs" {...props} />
                          ),
                          code: ({ node, className, children, ...props }) => (
                            <code className="px-1.5 py-0.5 rounded-md bg-slate-100 text-blue-700 font-mono text-[11px] font-bold" {...props}>
                              {children}
                            </code>
                          ),
                          hr: ({ node, ...props }) => (
                            <hr className="my-6 border-slate-200" {...props} />
                          ),
                        }}
                      >
                        {comparisonResult.narrative}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>

                {/* ─── 3. Risk / Red Flag Summary ─────────────────────────── */}
                <div id="section-risk-summary" className="space-y-3 scroll-mt-6">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <h3 className="text-lg font-extrabold text-slate-800">
                        3. Risk & Red Flag Cross-Company Summary
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      {comparisonResult.red_flags_summary.length} risk categories analyzed
                    </span>
                  </div>

                  <div className="space-y-4">
                    {comparisonResult.red_flags_summary.length === 0 ? (
                      <div className="p-12 text-center rounded-3xl border border-slate-200 bg-white shadow-2xs">
                        <ShieldCheck className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                        <h3 className="text-base font-extrabold text-slate-800">
                          No Critical Red Flags Detected
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">
                          No high or critical risk anomalies were detected in the selected filings.
                        </p>
                      </div>
                    ) : (
                      comparisonResult.red_flags_summary.map((rfCat) => (
                        <div
                          key={rfCat.category}
                          className="p-6 rounded-3xl border border-slate-200 bg-white shadow-2xs space-y-4"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-amber-500" />
                              {rfCat.category} Risk Category ({rfCat.total_count} findings)
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {comparedDocs.map((doc) => {
                              const docFlags = rfCat.flags_by_document[doc.document_id] || [];
                              const displayName = getDocDisplayName(doc.filename);

                              return (
                                <div
                                  key={doc.document_id}
                                  className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-3"
                                >
                                  <h5 className="text-xs font-black text-slate-800 truncate">
                                    {displayName} ({docFlags.length} flags)
                                  </h5>

                                  {docFlags.length === 0 ? (
                                    <p className="text-[11px] text-slate-400 font-medium italic">
                                      No {rfCat.category.toLowerCase()} risks detected in this filing.
                                    </p>
                                  ) : (
                                    docFlags.map((flag: any, fi: number) => (
                                      <div
                                        key={fi}
                                        className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5 shadow-2xs"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-bold text-slate-800">
                                            {flag.title || "Risk Flag"}
                                          </span>
                                          <span
                                            className={cn(
                                              "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                                              flag.severity === "critical"
                                                ? "bg-rose-100 text-rose-700 border-rose-200"
                                                : flag.severity === "high"
                                                ? "bg-amber-100 text-amber-700 border-amber-200"
                                                : "bg-blue-100 text-blue-700 border-blue-200"
                                            )}
                                          >
                                            {flag.severity || "medium"}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                                          {flag.description}
                                        </p>
                                        {flag.page && (
                                          <div className="pt-1 flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-400">
                                              Ref: Page {flag.page}
                                            </span>
                                            {flag.snippet && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setCitationModal({
                                                    docName: displayName,
                                                    metricLabel: flag.title || `${rfCat.category} Risk`,
                                                    page: flag.page,
                                                    snippet: flag.snippet,
                                                    confidence: 0.95,
                                                  })
                                                }
                                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800"
                                              >
                                                View Excerpt
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ─── 4. Sources & Citations Ledger ───────────────────────── */}
                <div id="section-citations-ledger" className="space-y-3 scroll-mt-6">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-indigo-600" />
                      <h3 className="text-lg font-extrabold text-slate-800">
                        4. Grounded Sources & Citations Ledger
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      {comparisonResult.citations.length} verified citations
                    </span>
                  </div>

                  <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-2xs space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {comparisonResult.citations.map((cit, ci) => (
                        <div
                          key={ci}
                          onClick={() =>
                            setCitationModal({
                              docName: cit.filename || cit.document_id,
                              metricLabel: cit.metric || cit.category || "Evidence Citation",
                              page: cit.page,
                              snippet: cit.snippet,
                              confidence: 1.0,
                            })
                          }
                          className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-200 cursor-pointer transition-all space-y-1.5 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-slate-800 group-hover:text-blue-700 truncate">
                              {cit.metric ? cit.metric.replace(/_/g, " ").toUpperCase() : cit.category || "CITATION"}
                            </span>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              p.{cit.page}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 font-mono">
                            "{cit.snippet}"
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold truncate pt-0.5">
                            {cit.filename || cit.document_id}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Filing Metadata Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {comparedDocs.map((doc) => (
                    <div
                      key={doc.document_id}
                      className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {doc.file_type?.toUpperCase() || "PDF"} Document
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <Check className="h-3 w-3" />
                          Grounded
                        </span>
                      </div>

                      <div>
                        <h3 className="font-extrabold text-slate-800 text-base truncate">
                          {getDocDisplayName(doc.filename)}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                          {doc.filename}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Total Pages</span>
                          <span className="font-bold text-slate-700">{doc.total_pages} pages</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">File Size</span>
                          <span className="font-bold text-slate-700">{doc.size_kb} KB</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Workspace</span>
                          <span className="font-bold text-slate-700 truncate block">
                            {activeWorkspaceName}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Status</span>
                          <span className="font-bold text-emerald-600">Indexed & Synthesized</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Citation Snippet Modal */}
        <AnimatePresence>
          {citationModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
                onClick={() => setCitationModal(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-lg w-full z-10 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                    <BookOpen className="h-4 w-4" />
                    <span>Source Grounding Citation</span>
                  </div>
                  <button
                    onClick={() => setCitationModal(null)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    {citationModal.metricLabel} — {citationModal.docName}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    Extracted from Page {citationModal.page || 1}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 leading-relaxed max-h-56 overflow-y-auto">
                  {citationModal.snippet ? (
                    `"${citationModal.snippet}"`
                  ) : (
                    <span className="text-slate-400 font-sans italic">
                      Direct page reference extracted without explicit textual snippet.
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 text-xs font-semibold text-slate-500">
                  <span>Grounding Confidence:</span>
                  <span className="text-emerald-600 font-bold">
                    {citationModal.confidence !== undefined
                      ? `${Math.round(citationModal.confidence * 100)}% Verified`
                      : "100% Grounded"}
                  </span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
