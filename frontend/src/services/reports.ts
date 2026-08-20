import { apiGet, apiPost, BASE_URL } from "./api";

export interface ReportCitation {
  document_id: string;
  page: number;
  metric?: string;
  snippet?: string;
  value?: string;
}

export interface ReportMetric {
  metric_id?: string;
  name: string;
  value: number | string;
  unit?: string;
  period?: string;
  page?: number;
  snippet?: string;
  source_document_id?: string;
  confidence?: number;
}

export interface ReportRedFlag {
  flag_id?: string;
  category: string;
  severity: "high" | "medium" | "low" | string;
  title?: string;
  description: string;
  page?: number;
  snippet?: string;
  source_document_id?: string;
  confidence?: number;
}

export interface Report {
  // Official SAD Section 14.9 properties
  report_id: string;
  workspace_id: string;
  status: "generating" | "ready" | "error" | "processing" | "completed" | string;
  download_url?: string;
  generated_at: string;
  job_id?: string;

  // UI aliases & Section narratives
  id: string;
  workspaceId: string;
  title: string;
  companyNames: string[];
  target_company?: string;
  comparison_company?: string;
  type: "single" | "comparison" | string;
  sections: string[];
  generatedAt: string;
  pageCount?: number;
  page_count?: number;

  // Synthesized Section Content (Milestone 4)
  executive_summary?: string;
  key_financials_narrative?: string;
  red_flags_narrative?: string;
  comparison_narrative?: string;
  outlook_narrative?: string;

  // Structured Data & Citations
  extracted_metrics?: ReportMetric[];
  red_flags?: ReportRedFlag[];
  redFlags?: ReportRedFlag[];
  citations?: ReportCitation[];
  confidence?: number;
  grounding_status?: string;
  pdf_path?: string;
  llm_metadata?: {
    provider?: string;
    model?: string;
    tokens_used?: number;
    elapsed_seconds?: number;
    is_fallback?: boolean;
  };
}

export function normalizeReport(data: any): Report {
  const report_id = data.report_id || data.id || `rpt_${Date.now()}`;
  const workspace_id = data.workspace_id || data.workspaceId || "ws_default";
  const generated_at = data.generated_at || data.generatedAt || new Date().toISOString();
  let status = data.status || "ready";
  if (status === "completed") status = "ready";
  if (status === "processing") status = "generating";

  const companyNames =
    data.companyNames ||
    data.company_names ||
    [data.target_company].filter(Boolean) ||
    ["Analyzed Company"];

  const redFlags = data.red_flags || data.redFlags || [];

  return {
    ...data,
    report_id,
    workspace_id,
    status,
    download_url: data.download_url || `/reports/${report_id}/download`,
    generated_at,
    id: report_id,
    workspaceId: workspace_id,
    title: data.title || `Financial Diligence Report (${report_id})`,
    companyNames,
    type: data.type || "single",
    sections: data.sections || [
      "Executive Summary",
      "Key Financials",
      "Red Flags",
      "Company Comparison",
      "Outlook",
    ],
    generatedAt: generated_at,
    pageCount: data.page_count !== undefined ? data.page_count : (data.pageCount || 3),
    page_count: data.page_count !== undefined ? data.page_count : (data.pageCount || 3),
    red_flags: redFlags,
    redFlags: redFlags,
    extracted_metrics: data.extracted_metrics || [],
    citations: data.citations || [],
    confidence: data.confidence !== undefined ? data.confidence : 0.95,
    grounding_status: data.grounding_status || "grounded",
    executive_summary: data.executive_summary || "",
    key_financials_narrative: data.key_financials_narrative || "",
    red_flags_narrative: data.red_flags_narrative || "",
    comparison_narrative: data.comparison_narrative || "",
    outlook_narrative: data.outlook_narrative || "",
  };
}

export async function getReports(workspaceId?: string): Promise<Report[]> {
  const url = workspaceId ? `/reports?workspace_id=${workspaceId}` : "/reports";
  const data = await apiGet<any[]>(url);
  return Array.isArray(data) ? data.map(normalizeReport) : [];
}

export async function getReportById(reportId: string): Promise<Report> {
  const data = await apiGet<any>(`/reports/${reportId}`);
  return normalizeReport(data);
}

export async function generateReport(
  workspaceId: string,
  docIds: string[] = [],
  options?: {
    target_company?: string;
    comparison_company?: string;
    type?: string;
    title?: string;
    sections?: string[];
  }
): Promise<Report> {
  const data = await apiPost<any>("/reports/generate", {
    workspace_id: workspaceId,
    document_ids: docIds.length > 0 ? docIds : undefined,
    type: options?.type || (docIds.length > 1 ? "comparison" : "single"),
    target_company: options?.target_company,
    comparison_company: options?.comparison_company,
    title: options?.title,
    sections: options?.sections || [
      "Executive Summary",
      "Key Financials",
      "Red Flags",
      "Company Comparison",
      "Outlook",
    ],
  });
  return normalizeReport({ ...data, workspace_id: workspaceId });
}

export async function downloadReport(id: string, title?: string): Promise<void> {
  const token =
    localStorage.getItem("velsora_token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    "";
  try {
    const url = `${BASE_URL}/reports/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && (contentType.includes("application/pdf") || contentType.includes("octet-stream"))) {
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const cleanName = (title || `Velsora_Report_${id}`).replace(/[^\w\-_\.]/g, "_");
      a.download = `${cleanName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      return;
    }

    let errDetail = "Failed to download PDF report.";
    try {
      const errJson = await res.json();
      if (errJson?.detail || errJson?.message) {
        errDetail = errJson.detail || errJson.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errDetail);
  } catch (e: any) {
    console.error("Direct PDF download failed:", e);
    throw e;
  }
}

export async function viewReportPdf(id: string): Promise<void> {
  const token =
    localStorage.getItem("velsora_token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    "";
  try {
    const url = `${BASE_URL}/reports/${id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && (contentType.includes("application/pdf") || contentType.includes("octet-stream"))) {
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      return;
    }

    let errDetail = "Failed to open PDF report.";
    try {
      const errJson = await res.json();
      if (errJson?.detail || errJson?.message) {
        errDetail = errJson.detail || errJson.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errDetail);
  } catch (e: any) {
    console.error("View PDF failed:", e);
    throw e;
  }
}

export function getReportPdfStreamUrl(id: string): string {
  const token =
    localStorage.getItem("velsora_token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    "";
  return `${BASE_URL}/reports/${id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}
