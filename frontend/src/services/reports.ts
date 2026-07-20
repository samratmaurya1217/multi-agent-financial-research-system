import { sleep } from "./api";

export interface Report {
  id: string;
  workspaceId: string;
  title: string;
  companyNames: string[];
  type: "single" | "comparison";
  sections: string[];
  generatedAt: string;
  status: "generating" | "ready" | "error";
  pageCount?: number;
}

const MOCK_REPORTS: Report[] = [
  { id: "rpt_01", workspaceId: "ws_01", title: "Apple Inc. Full Analysis — FY2024", companyNames: ["Apple Inc."], type: "single", sections: ["Executive Summary", "Financials", "Red Flags", "Outlook"], generatedAt: "2024-07-13T09:00:00Z", status: "ready", pageCount: 18 },
  { id: "rpt_02", workspaceId: "ws_02", title: "Tesla vs Ford — Competitive Benchmark", companyNames: ["Tesla, Inc.", "Ford Motor Company"], type: "comparison", sections: ["Executive Summary", "Financials", "Risk Comparison", "Recommendation"], generatedAt: "2024-07-11T14:30:00Z", status: "ready", pageCount: 24 },
  { id: "rpt_03", workspaceId: "ws_03", title: "Microsoft Deep Dive — FY2023", companyNames: ["Microsoft Corporation"], type: "single", sections: ["Executive Summary", "Cloud Revenue", "Margins", "Red Flags"], generatedAt: "2024-07-08T11:00:00Z", status: "ready", pageCount: 16 },
];

export async function getReports(workspaceId: string): Promise<Report[]> {
  await sleep(500);
  return MOCK_REPORTS.filter((r) => r.workspaceId === workspaceId);
}

export async function generateReport(workspaceId: string, docIds: string[]): Promise<Report> {
  await sleep(2000);
  return { id: `rpt_${Date.now()}`, workspaceId, title: "New Report", companyNames: ["Company"], type: docIds.length > 1 ? "comparison" : "single", sections: ["Executive Summary", "Financials", "Red Flags"], generatedAt: new Date().toISOString(), status: "ready", pageCount: 12 };
}

export async function downloadReport(_id: string): Promise<void> {
  await sleep(500);
  // TODO: trigger blob download from FastAPI /reports/{id}/pdf
}
