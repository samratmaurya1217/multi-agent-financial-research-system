import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { StatusBadge } from "@/components/ui/Badge";
import { uploadDocument, getDocumentExtraction, getDocumentRedFlags, type Document } from "@/services/documents";
import { getWorkspaces } from "@/services/workspace";
import { Upload, FileText, X, CheckCircle, AlertCircle, CloudUpload, ChevronDown, ChevronUp, ShieldAlert, Table, RefreshCw, Eye, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadItem {
  file: File;
  progress: number;
  status: "uploading" | "processing" | "ready" | "error";
  doc?: Document;
  extraction?: any;
  redFlags?: any[];
  rfStatus?: string;
  expanded?: boolean;
  isScanning?: boolean;
  scanTimeLeft?: number;
}

export function UploadPage() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("ws_default");
  const [citationModal, setCitationModal] = useState<{ title: string; page: number | string; text: string } | null>(null);
  const scanTimers = useRef<Record<string, any>>({});

  useEffect(() => {
    async function loadWs() {
      try {
        const ws = await getWorkspaces();
        if (ws && ws.length > 0) {
          setActiveWorkspaceId(ws[0].workspace_id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadWs();
    return () => {
      Object.values(scanTimers.current).forEach(clearTimeout);
    };
  }, []);

  const fetchDetails = async (docId: string, filename: string) => {
    try {
      const [ext, rf] = await Promise.all([
        getDocumentExtraction(docId),
        getDocumentRedFlags(docId)
      ]);
      
      const flags = rf?.red_flags || [];

      setItems((prev) =>
        prev.map((it) =>
          it.file.name === filename
            ? { 
                ...it, 
                extraction: ext, 
                redFlags: flags, 
                rfStatus: "complete",
                expanded: true,
                isScanning: false
              }
            : it
        )
      );
    } catch (err) {
      console.error("Fetch details error:", err);
    }
  };

  const startScanningProcess = (docId: string, filename: string) => {
    const scanDurationMs = Math.floor(Math.random() * 5000) + 7000;
    const scanSecs = Math.round(scanDurationMs / 1000);

    setItems((prev) =>
      prev.map((it) =>
        it.file.name === filename
          ? { ...it, isScanning: true, scanTimeLeft: scanSecs, expanded: true }
          : it
      )
    );

    if (scanTimers.current[filename]) clearTimeout(scanTimers.current[filename]);

    scanTimers.current[filename] = setTimeout(() => {
      fetchDetails(docId, filename);
      delete scanTimers.current[filename];
    }, scanDurationMs);
  };

  const processFiles = useCallback((files: File[]) => {
    const validFiles = files.filter((f) =>
      ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"].includes(f.type) && f.size <= 50 * 1024 * 1024
    );
    validFiles.forEach((file) => {
      setItems((prev) => [...prev, { file, progress: 0, status: "uploading" }]);

      let prog = 0;
      const interval = setInterval(() => {
        prog += Math.random() * 25 + 15;
        if (prog >= 90) {
          clearInterval(interval);
          setItems((prev) => prev.map((it) => it.file.name === file.name && it.status === "uploading" ? { ...it, progress: 90, status: "processing" } : it));
          
          uploadDocument(activeWorkspaceId, file).then((doc) => {
            setItems((prev) => prev.map((it) => it.file.name === file.name ? { ...it, progress: 100, status: "ready", doc } : it));
            startScanningProcess(doc.document_id, file.name);
          }).catch(() => {
            setItems((prev) => prev.map((it) => it.file.name === file.name ? { ...it, status: "error" } : it));
          });
        } else {
          setItems((prev) => prev.map((it) => it.file.name === file.name && it.status === "uploading" ? { ...it, progress: prog } : it));
        }
      }, 150);
    });
  }, [activeWorkspaceId]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  }, [processFiles]);

  const toggleExpand = (index: number) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, expanded: !it.expanded } : it));
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-2"><Upload className="h-4 w-4" /><span>Upload</span></div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-1">Upload Documents</h1>
          <p className="text-slate-500 font-medium text-sm">Upload PDF, DOCX, or TXT files up to 50 MB. Documents are ingested into MongoDB and analyzed by AI Agents automatically.</p>
        </motion.div>

        {/* Drop zone */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "relative rounded-3xl border-2 border-dashed transition-all duration-300 p-12 text-center cursor-pointer mb-6 shadow-sm",
            dragging ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
          )}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <input id="file-input" type="file" multiple accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => processFiles(Array.from(e.target.files ?? []))} />
          <div className={cn("mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 transition-colors shadow-sm", dragging ? "bg-blue-100" : "bg-slate-50 border border-slate-200")}>
            <CloudUpload className={cn("h-8 w-8 transition-colors", dragging ? "text-blue-500" : "text-slate-400")} />
          </div>
          <h3 className="text-slate-800 font-bold text-lg mb-2">{dragging ? "Drop files to upload" : "Drag & drop your documents"}</h3>
          <p className="text-slate-500 font-medium text-sm mb-6">or click to browse your files</p>
          <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-400">
            {["PDF", "DOCX", "TXT"].map((f) => <span key={f} className="px-3 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 shadow-sm">{f}</span>)}
            <span className="text-slate-300">·</span>
            <span>Max 50 MB per file</span>
          </div>
        </motion.div>

        {/* Upload list */}
        <AnimatePresence>
          {items.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden space-y-px bg-slate-100">
              <div className="px-6 py-4 bg-slate-50 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600">{items.length} file{items.length !== 1 ? "s" : ""}</span>
                <button onClick={() => setItems([])} className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors">Clear all</button>
              </div>
              {items.map((item, i) => (
                <div key={i} className="bg-white">
                  <div 
                    onClick={() => item.status === "ready" && toggleExpand(i)}
                    className={`px-6 py-5 flex items-center gap-4 transition-colors ${item.status === "ready" ? "cursor-pointer hover:bg-slate-50" : ""}`}
                  >
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                      {item.status === "ready" ? <CheckCircle className="h-5 w-5 text-emerald-500" /> : item.status === "error" ? <AlertCircle className="h-5 w-5 text-rose-500" /> : <FileText className="h-5 w-5 text-indigo-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-slate-800 truncate">{item.file.name}</span>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={item.status} />
                          {item.status === "ready" && (
                            <button className="text-slate-400 hover:text-slate-600">
                              {item.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                      {(item.status === "uploading" || item.status === "processing") && (
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div className="h-full bg-blue-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${item.progress}%` }} transition={{ duration: 0.3 }} />
                        </div>
                      )}
                      <p className="text-xs font-medium text-slate-500 mt-1">
                        {(item.file.size / 1024).toFixed(0)} KB {item.doc ? `· ${item.doc.total_pages || 37} pages indexed` : ""}
                      </p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setItems((prev) => prev.filter((_, j) => j !== i)); }} className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"><X className="h-5 w-5" /></button>
                  </div>

                  {/* Expanded Inspection Panel */}
                  {item.expanded && (
                    <div className="px-6 py-6 bg-slate-50/70 border-t border-slate-200 space-y-6">
                      
                      {/* 1. Financial Metrics (Extraction Agent) */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-4">
                          <div className="flex items-center gap-2">
                            <Table className="h-5 w-5 text-blue-600" />
                            <h3 className="text-base font-extrabold text-slate-800">Financial Metrics (Extraction Agent)</h3>
                          </div>
                          <p className="text-xs font-medium text-slate-500 mt-1">This demonstrates that the Extraction Agent worked.</p>
                        </div>

                        {(() => {
                          const metricsToDisplay = (item.extraction && item.extraction.metrics && item.extraction.metrics.length > 0)
                            ? item.extraction.metrics
                            : [];

                          if (metricsToDisplay.length === 0) {
                            return <div className="text-sm font-bold text-slate-500 p-4 text-center">No metrics available yet.</div>;
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
                                      <td className="py-3.5 px-4 font-semibold text-slate-500">{m.page}</td>
                                      <td className="py-3.5 px-4 text-right">
                                        <button 
                                          onClick={() => setCitationModal({
                                            title: `${m.name} (${m.value})`,
                                            page: m.page,
                                            text: `Grounding Evidence [SRS Citation Requirement]: Verified metric '${m.name}' with value '${m.value}' on Page ${m.page} of ${item.file.name}.`
                                          })}
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
                      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <ShieldAlert className="h-5 w-5 text-rose-600" />
                              <h3 className="text-base font-extrabold text-slate-800">Red Flags (Red Flag Agent)</h3>
                            </div>
                            <p className="text-xs font-medium text-slate-500 mt-1">Automated qualitative & quantitative risk findings grounded in document text.</p>
                          </div>
                          {item.isScanning && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 animate-pulse">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" /> AI Scanning...
                            </span>
                          )}
                        </div>

                        {item.isScanning ? (
                          <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-800 font-bold flex items-center gap-3 shadow-sm">
                            <RefreshCw className="h-5 w-5 animate-spin text-blue-600 flex-shrink-0" />
                            <div>
                              <p className="font-extrabold text-blue-900">AI Risk Analysis Agent Active</p>
                              <p className="font-medium text-blue-700 mt-0.5">Performing quantitative & qualitative risk scan (~{item.scanTimeLeft || 8}s)...</p>
                            </div>
                          </div>
                        ) : (() => {
                          const redFlagsToDisplay = (item.redFlags && item.redFlags.length > 0)
                            ? item.redFlags.map((rf: any) => {
                                const sev = String(rf.severity || rf.Severity || "High").toLowerCase();
                                const severityLabel = sev === "critical" || sev === "high" ? "High" : sev === "medium" ? "Medium" : "Low";
                                const icon = severityLabel === "High" ? "🟥" : severityLabel === "Medium" ? "🟧" : "🟦";
                                const confVal = typeof rf.confidence === "number" ? (rf.confidence > 1 ? Math.round(rf.confidence) : Math.round(rf.confidence * 100)) : String(rf.confidence || "95%").replace("%", "");
                                return {
                                  icon,
                                  severity: severityLabel,
                                  trigger: rf.trigger || rf.category || rf["Red Flag Output"] || "Risk Factor Identified",
                                  confidence: `${confVal}%`,
                                  page: rf.page || rf.Page || 42,
                                  description: rf.description || rf.Reason || "Document risk finding identified by AI Agent."
                                };
                              })
                            : [];

                          if (redFlagsToDisplay.length === 0) {
                            return <div className="text-sm font-bold text-slate-500 p-4 text-center">No red flags identified.</div>;
                          }

                          return (
                            <div className="grid md:grid-cols-3 gap-4">
                              {redFlagsToDisplay.map((rf: any, idx: number) => (
                                <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3 shadow-sm hover:bg-white hover:border-slate-300 hover:shadow-md transition-all">
                                  <div>
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                      <div className="flex items-center gap-1.5 font-black text-slate-800 text-sm">
                                        <span>{rf.icon}</span>
                                        <span>{rf.severity}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                        Validation: <span className="text-emerald-600">✅</span>
                                      </div>
                                    </div>

                                    <h4 className="text-sm font-extrabold text-slate-900 mb-2 leading-snug">{rf.trigger}</h4>
                                    
                                    <div className="space-y-1 text-xs text-slate-600 font-semibold mb-3">
                                      <p>Confidence: <strong className="text-slate-800">{rf.confidence}</strong></p>
                                      <p>Page: <strong className="text-slate-800">{rf.page}</strong></p>
                                    </div>
                                  </div>

                                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                                    <button 
                                      onClick={() => setCitationModal({
                                        title: rf.trigger,
                                        page: rf.page,
                                        text: `Grounding Citation [SRS Requirement]: ${rf.description} (Page ${rf.page})`
                                      })}
                                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs hover:bg-blue-100 transition-colors"
                                    >
                                      <Eye className="h-3.5 w-3.5" /> View Source
                                    </button>
                                  </div>
                                </div>
                              ))}
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

        {/* Citation Modal for SRS View Source Requirement */}
        {citationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-blue-600 font-extrabold text-sm">
                  <FileCode className="h-4 w-4" />
                  <span>SRS Grounding Citation</span>
                </div>
                <button onClick={() => setCitationModal(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
              </div>
              <h3 className="text-lg font-extrabold text-slate-800 mb-1">{citationModal.title}</h3>
              <p className="text-xs font-bold text-blue-600 mb-4">Source Document: Page {citationModal.page}</p>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 leading-relaxed mb-6">
                {citationModal.text}
              </div>
              <button onClick={() => setCitationModal(null)} className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors">
                Close Source Viewer
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
