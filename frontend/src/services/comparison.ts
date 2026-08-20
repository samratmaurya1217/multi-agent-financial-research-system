import { apiGet, apiPost } from "./api";

export interface ComparisonMetricDetail {
  document_id: string;
  filename: string;
  value?: number | string;
  unit?: string;
  period?: string;
  page?: number;
  snippet?: string;
  confidence?: number;
}

export interface ComparisonTableRow {
  metric: string;
  metric_label: string;
  category: string;
  unit?: string;
  period?: string;
  values: Record<string, number | null>;
  details: Record<string, ComparisonMetricDetail | null>;
  best_performer?: string | null;
  worst_performer?: string | null;
  variance?: string | null;
}

export interface ComparisonRedFlagCategory {
  category: string;
  total_count: number;
  flags_by_document: Record<string, any[]>;
}

export interface ComparisonCitation {
  document_id: string;
  filename?: string;
  page: number;
  snippet: string;
  metric?: string;
  category?: string;
}

export interface ComparisonResult {
  comparison_id: string;
  workspace_id: string;
  document_ids: string[];
  documents: Array<{
    document_id: string;
    filename: string;
    file_type: string;
    total_pages: number;
    size_kb: number;
  }>;
  table: ComparisonTableRow[];
  narrative: string;
  red_flags_summary: ComparisonRedFlagCategory[];
  citations: ComparisonCitation[];
  confidence: number;
  grounding_status: string;
  llm_metadata?: {
    provider?: string;
    model?: string;
    tokens_used?: number;
    elapsed_seconds?: number;
    is_fallback?: boolean;
    fallback_reason?: string;
  };
  status: string;
  error?: string;
  created_at?: string;
}

export async function runComparison(workspaceId: string, documentIds: string[]): Promise<ComparisonResult> {
  return await apiPost<ComparisonResult>("/comparisons", {
    workspace_id: workspaceId,
    document_ids: documentIds,
  });
}

export async function getComparison(comparisonId: string): Promise<ComparisonResult> {
  return await apiGet<ComparisonResult>(`/comparisons/${comparisonId}`);
}

export async function getComparisons(workspaceId: string): Promise<ComparisonResult[]> {
  return await apiGet<ComparisonResult[]>(`/comparisons?workspace_id=${workspaceId}`);
}
