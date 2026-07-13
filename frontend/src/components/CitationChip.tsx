import type { Citation } from "@/services/research";
import { FileText } from "lucide-react";

interface CitationChipProps {
  citation: Citation;
  onClick?: () => void;
}

export function CitationChip({ citation, onClick }: CitationChipProps) {
  return (
    <button
      onClick={onClick}
      title={`"${citation.snippet}"`}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-indigo-500/25 bg-indigo-500/10 text-indigo-300 text-[11px] font-medium hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all"
    >
      <FileText className="h-3 w-3 flex-shrink-0" />
      <span className="max-w-[180px] truncate">{citation.docName}</span>
      <span className="text-indigo-400/60">p.{citation.page}</span>
    </button>
  );
}
