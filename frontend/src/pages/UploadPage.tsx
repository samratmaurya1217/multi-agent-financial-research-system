import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { StatusBadge } from "@/components/ui/Badge";
import {
  uploadDocument,
  getDocumentExtraction,
  getDocumentRedFlags,
  getDocuments,
  type Document,
} from "@/services/documents";
import { getWorkspaces } from "@/services/workspace";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  CloudUpload,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Table,
  RefreshCw,
  Eye,
  FileCode,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadItem {
  file: File;
  progress: number;
  stage: "uploading" | "indexing" | "extraction" | "risk_analysis" | "completed" | "failed";
  status: "uploading" | "processing" | "ready" | "error";
  doc?: Document;
  extraction?: any;
  extractionStatus?: "idle" | "processing" | "complete" | "failed";
  redFlags?: any[];
  rfStatus?: "idle" | "processing" | "complete" | "failed";
  expanded?: boolean;
  uploadedAt?: string;
  documentId?: string;
  pageCount?: number;
  errorMessage?: string;
}

export function UploadPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("ws_default");
  const [citationModal, setCitationModal] = useState<{ title: string; page: number | string; text: string } | null>(null);
  const pollTimers = useRef<Record<string, any>>({});

  useEffect(() => {
    async function loadWorkspaceAndDocs() {
      try {
        const ws = await getWorkspaces();
        if (ws && ws.length > 0) {
          const wsId = ws[0].workspace_id;
          setActiveWorkspaceId(wsId);
          const docs = await getDocuments(wsId);
          if (docs && docs.length > 0) {
            const latestDoc = docs[0];
            const [ext, rf] = await Promise.all([
              getDocumentExtraction(latestDoc.document_id).catch(() => null),
              getDocumentRedFlags(latestDoc.document_id).catch(() => null),
            ]);

            const extStatus = ext?.extraction_status === "complete" ? "complete" : ext?.extraction_status === "failed" ? "failed" : "processing";
            const rfStatus = rf?.status === "complete" ? "complete" : rf?.status === "failed" ? "failed" : "processing";
            const isAllComplete = latestDoc.status === "ready" && extStatus === "complete" && rfStatus === "complete";

            const mockFile = new File([], latestDoc.filename, { type: "application/pdf" });
            setItems([
              {
                file: mockFile,
                progress: isAllComplete ? 100 : 70,
                stage: isAllComplete ? "completed" : "risk_analysis",
                status: isAllComplete ? "ready" : "processing",
                uploadedAt: latestDoc.uploaded_at,
                documentId: latestDoc.document_id,
                pageCount: latestDoc.total_pages || 1,
                extraction: ext,
                extractionStatus: extStatus,
                redFlags: rf?.red_flags || [],
                rfStatus: rfStatus,
                expanded: true,
                doc: latestDoc,
              },
            ]);

            if (!isAllComplete) {
              pollAgentStatus(latestDoc.document_id, latestDoc.filename, 1);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load workspace documents:", err);
      }
    }

    loadWorkspaceAndDocs();
    return () => {
      Object.values(pollTimers.current).forEach(clearTimeout);
    };
  }, []);

  const pollAgentStatus = async (docId: string, filename: string, attempt: number = 1) => {
    // Exponential backoff: 5s → 8s → 12s → 15s (capped) on success path
    const successDelay = Math.min(5000 + (attempt - 1) * 3000, 15000);
    // Error backoff: 5s → 10s → 20s → 30s (capped)
    const errorDelay = Math.min(5000 * Math.pow(1.5, attempt - 1), 30000);

    try {
      const [ext, rf] = await Promise.all([
        getDocumentExtraction(docId).catch(() => null),
        getDocumentRedFlags(docId).catch(() => null),
      ]);

      const extStatus: "idle" | "processing" | "complete" | "failed" =
        ext?.extraction_status === "complete" ? "complete" : ext?.extraction_status === "failed" ? "failed" : "processing";

      const rfStatus: "idle" | "processing" | "complete" | "failed" =
        rf?.status === "complete" ? "complete" : rf?.status === "failed" ? "failed" : "processing";

      const isExtractionDone = extStatus === "complete" || extStatus === "failed";
      const isRfDone = rfStatus === "complete" || rfStatus === "failed";
      const isAllDone = isExtractionDone && isRfDone;

      let currentStage: UploadItem["stage"] = "extraction";
      let progress = 60;
      if (extStatus === "complete") {
        currentStage = "risk_analysis";
        progress = 85;
      }
      if (isAllDone) {
        currentStage = "completed";
        progress = 100;
      }

      setItems((prev) =>
        prev.map((it) =>
          it.documentId === docId || it.file.name === filename
            ? {
                ...it,
                documentId: docId,
                extraction: ext,
                extractionStatus: extStatus,
                redFlags: rf?.red_flags || [],
                rfStatus: rfStatus,
                stage: currentStage,
                progress: isAllDone ? 100 : progress,
                status: isAllDone ? "ready" : "processing",
                expanded: true,
              }
            : it
        )
      );

      if (!isAllDone && attempt < 20) {
        pollTimers.current[docId] = setTimeout(() => {
          pollAgentStatus(docId, filename, attempt + 1);
        }, successDelay);
      } else {
        delete pollTimers.current[docId];
      }
    } catch (err) {
      console.warn("Polling status error:", err);
      if (attempt < 15) {
        pollTimers.current[docId] = setTimeout(() => {
          pollAgentStatus(docId, filename, attempt + 1);
        }, errorDelay);
      }
    }
  };

  const processFiles = useCallback(
    async (files: File[]) => {
      const validFiles = files.filter(
        (f) =>
          (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) &&
          f.size <= 50 * 1024 * 1024
      );

      if (validFiles.length === 0 && files.length > 0) {
        alert("Please upload valid PDF documents (max 50 MB).");
        return;
      }

      for (const file of validFiles) {
        // Initial uploading state
        setItems((prev) => [
          ...prev.filter((it) => it.file.name !== file.name),
          {
            file,
            progress: 25,
            stage: "uploading",
            status: "uploading",
            expanded: true,
            extractionStatus: "processing",
            rfStatus: "processing",
          },
        ]);

        try {
          // Send upload to backend
          const doc = await uploadDocument(activeWorkspaceId, file);

          // Update to processing/indexing state
          setItems((prev) =>
            prev.map((it) =>
              it.file.name === file.name
                ? {
                    ...it,
                    documentId: doc.document_id,
                    doc,
                    progress: 50,
                    stage: "indexing",
                    status: "processing",
                    extractionStatus: "processing",
                    rfStatus: "processing",
                    expanded: true,
                  }
                : it
            )
          );

          // Begin polling backend for truthful agent status
          pollAgentStatus(doc.document_id, file.name, 1);
        } catch (err: any) {
          console.error("Upload error:", err);
          setItems((prev) =>
            prev.map((it) =>
              it.file.name === file.name
                ? {
                    ...it,
                    status: "error",
                    stage: "failed",
                    errorMessage: err?.message || "Upload failed. Please check your network connection and try again.",
                  }
                : it
            )
          );
        }
      }
    },
    [activeWorkspaceId]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      processFiles(Array.from(e.dataTransfer.files));
    },
    [processFiles]
  );

  const toggleExpand = (index: number) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, expanded: !it.expanded } : it))
    );
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-2">
            <Upload className="h-4 w-4" />
            <span>Upload</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-1">Upload Financial Filings</h1>
          <p className="text-slate-500 font-medium text-sm">
            Upload PDF annual reports or 10-K filings up to 50 MB. Multi-Agent AI executes text indexing, financial extraction, and risk analysis automatically.
          </p>
        </motion.div>

        {/* Drop zone */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "relative rounded-3xl border-2 border-dashed transition-all duration-300 p-12 text-center cursor-pointer mb-6 shadow-xs",
            dragging
              ? "border-blue-500 bg-blue-50/70 scale-[1.01]"
              : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/50"
          )}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <input
            id="file-input"
            type="file"
            multiple
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => processFiles(Array.from(e.target.files ?? []))}
          />
          <div
            className={cn(
              "mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 transition-colors shadow-2xs",
              dragging ? "bg-blue-100" : "bg-slate-50 border border-slate-200"
            )}
          >
            <CloudUpload className={cn("h-8 w-8 transition-colors", dragging ? "text-blue-600" : "text-slate-400")} />
          </div>
          <h3 className="text-slate-800 font-bold text-lg mb-2">
            {dragging ? "Drop PDF to upload" : "Drag & drop your financial report"}
          </h3>
          <p className="text-slate-500 font-medium text-sm mb-6">or click to browse your PDF files</p>
          <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-400">
            <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs font-extrabold">
              PDF Documents
            </span>
            <span className="text-slate-300">·</span>
            <span>Max 50 MB per filing</span>
          </div>
        </motion.div>

        {/* Upload list */}
        <AnimatePresence>
          {items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden divide-y divide-slate-100"
            >
              <div className="px-6 py-4 bg-slate-50/80 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600">
                  {items.length} filing{items.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setItems([])}
                  className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
                >
                  Clear all
                </button>
              </div>

              {items.map((item, i) => (
                <div key={i} className="bg-white">
                  <div
                    onClick={() => toggleExpand(i)}
                    className="px-6 py-5 flex items-center gap-4 transition-colors cursor-pointer hover:bg-slate-50/70"
                  >
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                      {item.status === "ready" ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      ) : item.status === "error" ? (
                        <AlertCircle className="h-5 w-5 text-rose-500" />
                      ) : (
                        <RefreshCw className="h-5 w-5 text-indigo-500 animate-spin" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-slate-800 truncate">{item.file.name}</span>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={item.status} />
                          <button className="text-slate-400 hover:text-slate-600">
                            {item.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Dynamic Stage Progress Bar */}
                      {item.status === "processing" || item.status === "uploading" ? (
                        <div className="space-y-1.5">
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-blue-600 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${item.progress}%` }}
                              transition={{ duration: 0.4 }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400">
                            <span>
                              {item.stage === "uploading" && "Uploading document..."}
                              {item.stage === "indexing" && "Ingesting & indexing vector chunks..."}
                              {item.stage === "extraction" && "Extraction Agent: Parsing balance sheet & metrics..."}
                              {item.stage === "risk_analysis" && "Risk Agent: Auditing red flags & auditor notes..."}
                              {item.stage === "completed" && "All AI analysis completed"}
                            </span>
                            <span>{item.progress}%</span>
                          </div>
                        </div>
                      ) : null}

                      {item.status === "error" && item.errorMessage && (
                        <p className="text-xs font-semibold text-rose-600 mt-1">{item.errorMessage}</p>
                      )}

                      {item.status === "ready" && (
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs font-medium text-slate-500">
                            {(item.file.size / 1024).toFixed(0)} KB · {item.pageCount || item.doc?.total_pages || 1} pages indexed
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate("/reports");
                              }}
                              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>Generate Report</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate("/chat");
                              }}
                              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>Research</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setItems((prev) => prev.filter((_, j) => j !== i));
                      }}
                      className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Expanded Inspection Panel */}
                  {item.expanded && (
                    <div className="px-6 py-6 bg-slate-50/70 border-t border-slate-200 space-y-6">
                      {/* 1. Financial Metrics (Extraction Agent) */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Table className="h-5 w-5 text-blue-600" />
                              <h3 className="text-base font-extrabold text-slate-800">Financial Metrics (Extraction Agent)</h3>
                            </div>
                            <p className="text-xs font-medium text-slate-500 mt-1">
                              Structured financial indicators verified by Extraction Agent.
                            </p>
                          </div>
                          {item.extractionStatus === "processing" && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 animate-pulse">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" /> Extracting...
                            </span>
                          )}
                        </div>

                        {item.extractionStatus === "processing" ? (
                          <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-800 font-bold flex items-center gap-3 shadow-2xs animate-pulse">
                            <RefreshCw className="h-5 w-5 animate-spin text-blue-600 flex-shrink-0" />
                            <div>
                              <p className="font-extrabold text-blue-900">AI Extraction Agent Active</p>
                              <p className="font-medium text-blue-700 mt-0.5">
                                Ingesting financial statements, revenue tables, and extracting key quantitative indicators...
                              </p>
                            </div>
                          </div>
                        ) : item.extractionStatus === "failed" ? (
                          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                            Extraction agent encountered an issue parsing quantitative metrics for this document.
                          </div>
                        ) : (() => {
                            const metricsToDisplay =
                              item.extraction && item.extraction.metrics && item.extraction.metrics.length > 0
                                ? item.extraction.metrics
                                : [];

                            if (metricsToDisplay.length === 0) {
                              return (
                                <div className="text-xs font-semibold text-slate-500 p-4 text-center bg-slate-50 rounded-xl border border-slate-100">
                                  No quantitative financial metrics identified in this filing.
                                </div>
                              );
                            }

                            return (
                              <div className="overflow-x-auto rounded-xl border border-slate-100">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider">
                                      <th className="py-3 px-4">Metric</th>
                                      <th className="py-3 px-4">Value</th>
                                      <th className="py-3 px-4">Page</th>
                                      <th className="py-3 px-4 text-right">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {metricsToDisplay.map((m: any, idx: number) => (
                                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3.5 px-4 font-bold text-slate-800">{m.name}</td>
                                        <td className="py-3.5 px-4 font-extrabold text-blue-600">{m.value}</td>
                                        <td className="py-3.5 px-4 font-semibold text-slate-500">{m.page || 1}</td>
                                        <td className="py-3.5 px-4 text-right">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setCitationModal({
                                                title: `${m.name} (${m.value})`,
                                                page: m.page || 1,
                                                text: `Grounding Evidence: Verified metric '${m.name}' with value '${m.value}' on Page ${m.page || 1} of ${item.file.name}.`,
                                              })
                                            }
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold hover:bg-blue-100 transition-colors"
                                          >
                                            <Eye className="h-3.5 w-3.5" /> View Source
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}
                      </div>

                      {/* 2. Red Flags (Red Flag Agent) */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <ShieldAlert className="h-5 w-5 text-rose-600" />
                              <h3 className="text-base font-extrabold text-slate-800">Red Flags (Red Flag Agent)</h3>
                            </div>
                            <p className="text-xs font-medium text-slate-500 mt-1">
                              Automated qualitative & quantitative risk findings grounded in document text.
                            </p>
                          </div>
                          {item.rfStatus === "processing" && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 animate-pulse">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" /> AI Auditing...
                            </span>
                          )}
                        </div>

                        {item.rfStatus === "processing" ? (
                          <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-800 font-bold flex items-center gap-3 shadow-2xs animate-pulse">
                            <RefreshCw className="h-5 w-5 animate-spin text-blue-600 flex-shrink-0" />
                            <div>
                              <p className="font-extrabold text-blue-900">AI Risk Analysis Agent Active</p>
                              <p className="font-medium text-blue-700 mt-0.5">
                                Scanning document text across 6 financial risk domains, auditor notes, and liquidity factors...
                              </p>
                            </div>
                          </div>
                        ) : item.rfStatus === "failed" ? (
                          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                            Risk analysis agent encountered an issue scanning this document.
                          </div>
                        ) : (() => {
                            const redFlagsToDisplay =
                              item.redFlags && item.redFlags.length > 0
                                ? item.redFlags.map((rf: any) => {
                                    const sev = String(rf.severity || rf.Severity || "Medium").toLowerCase();
                                    const severityLabel =
                                      sev === "critical" || sev === "high" ? "High" : sev === "low" ? "Low" : "Medium";
                                    const confVal =
                                      typeof rf.confidence === "number"
                                        ? rf.confidence > 1
                                          ? Math.round(rf.confidence)
                                          : Math.round(rf.confidence * 100)
                                        : String(rf.confidence || "95").replace("%", "");
                                    const trigger = rf.trigger || rf.flag || rf.risk_title || "Risk Factor Identified";
                                    const desc = rf.reasoning || rf.description || "Document risk finding identified by AI Agent.";
                                    const evidence = rf.evidence || rf.snippet || desc;
                                    const category = rf.category || "Governance";

                                    return {
                                      severity: severityLabel,
                                      category,
                                      trigger,
                                      confidence: `${confVal}%`,
                                      page: rf.page || 1,
                                      description: desc,
                                      evidence,
                                    };
                                  })
                                : [];

                            if (redFlagsToDisplay.length === 0) {
                              return (
                                <div className="text-xs font-semibold text-slate-500 p-4 text-center bg-slate-50 rounded-xl border border-slate-100">
                                  No critical red flags identified in this filing.
                                </div>
                              );
                            }

                            return (
                              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {redFlagsToDisplay.map((rf: any, idx: number) => {
                                  const isHigh = rf.severity === "High";
                                  const isMed = rf.severity === "Medium";
                                  const sevBadgeClass = isHigh
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : isMed
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200";

                                  return (
                                    <div
                                      key={idx}
                                      className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between gap-4 shadow-2xs hover:border-slate-300 hover:shadow-md transition-all"
                                    >
                                      <div>
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                          <span
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black border uppercase tracking-wider ${sevBadgeClass}`}
                                          >
                                            <span className={`h-1.5 w-1.5 rounded-full ${isHigh ? "bg-rose-600" : isMed ? "bg-amber-600" : "bg-blue-600"}`} />
                                            {rf.severity} Severity
                                          </span>
                                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                            {rf.category}
                                          </span>
                                        </div>

                                        <h4 className="text-sm font-extrabold text-slate-900 mb-2 leading-snug">
                                          {rf.trigger}
                                        </h4>

                                        <p className="text-xs text-slate-600 leading-relaxed font-medium mb-3 line-clamp-3">
                                          {rf.description}
                                        </p>

                                        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-2 border-t border-slate-100">
                                          <span>
                                            Confidence: <strong className="text-slate-800">{rf.confidence}</strong>
                                          </span>
                                          <span>
                                            Page: <strong className="text-slate-800">{rf.page}</strong>
                                          </span>
                                        </div>
                                      </div>

                                      <div className="pt-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setCitationModal({
                                              title: rf.trigger,
                                              page: rf.page,
                                              text: `Grounding Evidence (Page ${rf.page}):\n\n"${rf.evidence}"\n\nAnalyst Rationale:\n${rf.description}`,
                                            })
                                          }
                                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
                                        >
                                          <Eye className="h-3.5 w-3.5" /> View Source Citation
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Citation Modal */}
        {citationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-blue-600 font-extrabold text-sm">
                  <FileCode className="h-4 w-4" />
                  <span>Document Grounding Citation</span>
                </div>
                <button onClick={() => setCitationModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <h3 className="text-lg font-extrabold text-slate-800 mb-1">{citationModal.title}</h3>
              <p className="text-xs font-bold text-blue-600 mb-4">Source Document: Page {citationModal.page}</p>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 leading-relaxed mb-6">
                {citationModal.text}
              </div>
              <button
                onClick={() => setCitationModal(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
              >
                Close Source Viewer
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
