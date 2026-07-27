import { sleep, apiGet, apiPost, USE_MOCK } from "./api";

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
}

export function normalizeReport(data: any): Report {
  const report_id = data.report_id || data.id || `rpt_${Date.now()}`;
  const workspace_id = data.workspace_id || data.workspaceId || "ws_default";
  const generated_at = data.generated_at || data.generatedAt || new Date().toISOString();
  let status = data.status || "ready";
  if (status === "completed") status = "ready";
  if (status === "processing") status = "generating";

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
    companyNames: data.companyNames || ["Analyzed Company"],
    type: data.type || "single",
    sections: data.sections || ["Executive Summary", "Financials", "Red Flags", "Outlook"],
    generatedAt: generated_at,
    pageCount: data.pageCount !== undefined ? data.pageCount : 12,
  };
}

const MOCK_REPORTS: Report[] = [
  normalizeReport({ report_id: "rpt_01", workspace_id: "ws_01", title: "Apple Inc. Full Analysis — FY2024", companyNames: ["Apple Inc."], type: "single", sections: ["Executive Summary", "Financials", "Red Flags", "Outlook"], generated_at: "2024-07-13T09:00:00Z", status: "ready", pageCount: 18 }),
  normalizeReport({ report_id: "rpt_02", workspace_id: "ws_02", title: "Tesla vs Ford — Competitive Benchmark", companyNames: ["Tesla, Inc.", "Ford Motor Company"], type: "comparison", sections: ["Executive Summary", "Financials", "Risk Comparison", "Recommendation"], generated_at: "2024-07-11T14:30:00Z", status: "ready", pageCount: 24 }),
  normalizeReport({ report_id: "rpt_03", workspace_id: "ws_03", title: "Microsoft Deep Dive — FY2023", companyNames: ["Microsoft Corporation"], type: "single", sections: ["Executive Summary", "Cloud Revenue", "Margins", "Red Flags"], generated_at: "2024-07-08T11:00:00Z", status: "ready", pageCount: 16 }),
];

export async function getReports(workspaceId: string): Promise<Report[]> {
  if (USE_MOCK) {
    await sleep(500);
    return MOCK_REPORTS.filter((r) => r.workspaceId === workspaceId || r.workspace_id === workspaceId);
  }
  const data = await apiGet<any[]>(`/reports?workspace_id=${workspaceId}`);
  return Array.isArray(data) ? data.map(normalizeReport) : [];
}

export async function generateReport(workspaceId: string, docIds: string[]): Promise<Report> {
  if (USE_MOCK) {
    await sleep(2000);
    return normalizeReport({
      report_id: `rpt_${Date.now()}`,
      workspace_id: workspaceId,
      title: "New Report",
      companyNames: ["Company"],
      type: docIds.length > 1 ? "comparison" : "single",
      sections: ["Executive Summary", "Financials", "Red Flags"],
      generated_at: new Date().toISOString(),
      status: "ready",
      pageCount: 12,
    });
  }
  const data = await apiPost<any>("/reports", {
    workspace_id: workspaceId,
    document_ids: docIds,
  });
  return normalizeReport({ ...data, workspace_id: workspaceId });
}

export async function downloadReport(id: string): Promise<void> {
  if (USE_MOCK) {
    await sleep(500);
    return;
  }
  const data = await apiGet<any>(`/reports/${id}`);
  if (data && data.download_url) {
    window.open(data.download_url, "_blank");
  }
}

