import { apiGet, apiPost } from "./api";

export interface Report {
  // Official SAD Section 14.9 properties
  report_id: string;
  workspace_id: string;
  status: "generating" | "ready" | "error" | "processing" | "completed" | string;
  download_url?: string;
  generated_at: string;
  job_id?: string;

  // UI aliases (zero-crash strategy)
  id: string;
  workspaceId: string;
  title: string;
  companyNames: string[];
  type: "single" | "comparison" | string;
  sections: string[];
  generatedAt: string;
  pageCount?: number;
  redFlags?: any[];
}

export function normalizeReport(data: any): Report {
  const report_id = data.report_id || data.id || `rpt_${Date.now()}`;
  const workspace_id = data.workspace_id || data.workspaceId || "ws_default";
  const generated_at = data.generated_at || data.generatedAt || new Date().toISOString();
  let status = data.status || "ready";
  if (status === "completed") status = "ready";
  if (status === "processing") status = "generating";

  // Backend uses company_names (snake_case), UI uses companyNames (camelCase)
  const companyNames =
    data.companyNames ||
    data.company_names ||
    [data.target_company].filter(Boolean) ||
    ["Analyzed Company"];

  return {
    ...data,
    report_id,
    workspace_id,
    status,
    download_url: data.download_url || "",
    generated_at,
    id: report_id,
    workspaceId: workspace_id,
    title: data.title || `Financial Report (${report_id})`,
    companyNames,
    type: data.type || "single",
    sections: data.sections || ["Executive Summary", "Financials", "Red Flags", "Outlook"],
    generatedAt: generated_at,
    pageCount: data.page_count !== undefined ? data.page_count : data.pageCount,
    redFlags: data.red_flags || data.redFlags || [],
  };
}

export async function getReports(workspaceId?: string): Promise<Report[]> {
  const url = workspaceId ? `/reports?workspace_id=${workspaceId}` : "/reports";
  const data = await apiGet<any[]>(url);
  return Array.isArray(data) ? data.map(normalizeReport) : [];
}

export async function generateReport(
  workspaceId: string,
  docIds: string[],
  options?: {
    target_company?: string;
    comparison_company?: string;
    type?: string;
    sections?: string[];
  }
): Promise<Report> {
  // Correct route: POST /reports/generate (SAD Section 14.9)
  const data = await apiPost<any>("/reports/generate", {
    workspace_id: workspaceId,
    type: options?.type || (docIds.length > 1 ? "comparison" : "single"),
    target_company: options?.target_company || "Company A",
    comparison_company: options?.comparison_company,
    sections: options?.sections || ["Executive Summary", "Financials", "Red Flags"],
  });
  return normalizeReport({ ...data, workspace_id: workspaceId });
}

export async function downloadReport(id: string): Promise<void> {
  const data = await apiGet<any>(`/reports/${id}/download`);
  if (data && data.download_url) {
    window.open(data.download_url, "_blank");
  }
}
