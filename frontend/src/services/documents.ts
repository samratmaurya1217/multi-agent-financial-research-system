import { sleep } from "./api";

export type DocStatus = "uploading" | "processing" | "ready" | "error";

export interface Document {
  id: string;
  workspaceId: string;
  name: string;
  type: string;
  sizeKb: number;
  status: DocStatus;
  uploadedAt: string;
  pageCount?: number;
}

const MOCK_DOCS: Document[] = [
  { id: "doc_01", workspaceId: "ws_01", name: "AAPL_10K_FY2024.pdf", type: "pdf", sizeKb: 4200, status: "ready", uploadedAt: "2024-07-10", pageCount: 128 },
  { id: "doc_02", workspaceId: "ws_01", name: "AAPL_Q3_2024_Earnings.pdf", type: "pdf", sizeKb: 820, status: "ready", uploadedAt: "2024-07-12", pageCount: 32 },
  { id: "doc_03", workspaceId: "ws_01", name: "AAPL_Proxy_2024.pdf", type: "pdf", sizeKb: 2100, status: "processing", uploadedAt: "2024-07-13" },
  { id: "doc_04", workspaceId: "ws_02", name: "TSLA_10K_FY2023.pdf", type: "pdf", sizeKb: 5600, status: "ready", uploadedAt: "2024-07-05", pageCount: 164 },
  { id: "doc_05", workspaceId: "ws_02", name: "Ford_Annual_Report_2023.pdf", type: "pdf", sizeKb: 3100, status: "ready", uploadedAt: "2024-07-05", pageCount: 96 },
  { id: "doc_06", workspaceId: "ws_03", name: "MSFT_10K_FY2023.pdf", type: "pdf", sizeKb: 6800, status: "ready", uploadedAt: "2024-06-22", pageCount: 194 },
];

export async function getDocuments(workspaceId: string): Promise<Document[]> {
  await sleep(500);
  return MOCK_DOCS.filter((d) => d.workspaceId === workspaceId);
}

export async function uploadDocument(workspaceId: string, _file: File): Promise<Document> {
  await sleep(1200);
  return { id: `doc_${Date.now()}`, workspaceId, name: _file.name, type: _file.name.split(".").pop() ?? "pdf", sizeKb: Math.round(_file.size / 1024), status: "processing", uploadedAt: new Date().toISOString() };
}

export async function deleteDocument(_id: string): Promise<void> {
  await sleep(300);
}
