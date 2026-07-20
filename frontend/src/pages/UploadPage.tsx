import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { StatusBadge } from "@/components/ui/Badge";
import { uploadDocument, type Document } from "@/services/documents";
import { Upload, FileText, X, CheckCircle, AlertCircle, CloudUpload } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadItem { file: File; progress: number; status: "uploading" | "processing" | "ready" | "error"; doc?: Document; }

export function UploadPage() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);

  const processFiles = useCallback((files: File[]) => {
    const validFiles = files.filter((f) =>
      ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"].includes(f.type) && f.size <= 50 * 1024 * 1024
    );
    validFiles.forEach((file) => {
      const id = `${Date.now()}-${file.name}`;
      setItems((prev) => [...prev, { file, progress: 0, status: "uploading" }]);

      // Simulate progress
      let prog = 0;
      const interval = setInterval(() => {
        prog += Math.random() * 15 + 5;
        if (prog >= 90) {
          clearInterval(interval);
          setItems((prev) => prev.map((it) => it.file.name === file.name && it.status === "uploading" ? { ...it, progress: 90, status: "processing" } : it));
          uploadDocument("ws_01", file).then((doc) => {
            setItems((prev) => prev.map((it) => it.file.name === file.name ? { ...it, progress: 100, status: "ready", doc } : it));
          }).catch(() => {
            setItems((prev) => prev.map((it) => it.file.name === file.name ? { ...it, status: "error" } : it));
          });
        } else {
          setItems((prev) => prev.map((it) => it.file.name === file.name && it.status === "uploading" ? { ...it, progress: prog } : it));
        }
      }, 200);
      void id;
    });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  }, [processFiles]);

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 text-white/30 text-sm mb-2"><Upload className="h-4 w-4" /><span>Upload</span></div>
          <h1 className="text-2xl font-bold text-white mb-1">Upload Documents</h1>
          <p className="text-white/40 text-sm">Upload PDF, DOCX, or TXT files up to 50 MB. Documents are processed automatically.</p>
        </motion.div>

        {/* Drop zone */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "relative rounded-2xl border-2 border-dashed transition-all duration-300 p-12 text-center cursor-pointer mb-6",
            dragging ? "border-indigo-500/70 bg-indigo-500/10" : "border-white/[0.10] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.03]"
          )}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <input id="file-input" type="file" multiple accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => processFiles(Array.from(e.target.files ?? []))} />
          <div className={cn("mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 transition-colors", dragging ? "bg-indigo-500/20" : "bg-white/[0.04] border border-white/[0.08]")}>
            <CloudUpload className={cn("h-8 w-8 transition-colors", dragging ? "text-indigo-400" : "text-white/30")} />
          </div>
          <h3 className="text-white font-semibold mb-2">{dragging ? "Drop files to upload" : "Drag & drop your documents"}</h3>
          <p className="text-white/40 text-sm mb-4">or click to browse your files</p>
          <div className="flex items-center justify-center gap-4 text-xs text-white/25">
            {["PDF", "DOCX", "TXT"].map((f) => <span key={f} className="px-2 py-1 rounded bg-white/[0.04] border border-white/[0.06]">{f}</span>)}
            <span className="text-white/20">·</span>
            <span>Max 50 MB per file</span>
          </div>
        </motion.div>

        {/* Upload list */}
        <AnimatePresence>
          {items.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="rounded-2xl border border-white/[0.08] overflow-hidden">
              <div className="px-6 py-3 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-sm font-medium text-white/60">{items.length} file{items.length !== 1 ? "s" : ""}</span>
                <button onClick={() => setItems([])} className="text-xs text-white/30 hover:text-white/60 transition-colors">Clear all</button>
              </div>
              {items.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="px-6 py-4 border-t border-white/[0.04] flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    {item.status === "ready" ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : item.status === "error" ? <AlertCircle className="h-4 w-4 text-rose-400" /> : <FileText className="h-4 w-4 text-indigo-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-white truncate">{item.file.name}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    {(item.status === "uploading" || item.status === "processing") && (
                      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${item.progress}%` }} transition={{ duration: 0.3 }} />
                      </div>
                    )}
                    <p className="text-xs text-white/30 mt-1">{(item.file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))} className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0"><X className="h-4 w-4" /></button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
