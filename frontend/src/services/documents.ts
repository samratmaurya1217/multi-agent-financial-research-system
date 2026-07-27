import { sleep, apiGet, apiDelete, apiUpload, USE_MOCK } from "./api";

export type DocStatus = "uploading" | "processing" | "ready" | "error" | string;

export interface Document {
  // Official SAD Chapter 14.6 & DB schema properties
  document_id: string;
  workspace_id: string;
  filename: string;
  file_type: string;
  storage_path?: string;
  status: DocStatus;
  total_pages?: number;
  uploaded_at: string;

  // UI aliases for existing React components (zero-crash strategy)
  id: string;
  workspaceId: string;
  name: string;
  type: string;
  sizeKb?: number;
  uploadedAt: string;
  pageCount?: number;
}

export function normalizeDocument(data: any): Document {
  const document_id = data.document_id || data.id || `doc_${Date.now()}`;
  const workspace_id = data.workspace_id || data.workspaceId || "ws_default";
  const filename = data.filename || data.name || "Untitled_Document.pdf";
  const file_type = data.file_type || data.type || filename.split(".").pop() || "pdf";
  const uploaded_at = data.uploaded_at || data.uploadedAt || new Date().toISOString();
  const total_pages = data.total_pages !== undefined ? data.total_pages : data.pageCount;

  return {
    ...data,
    document_id,
    workspace_id,
    filename,
    file_type,
    storage_path: data.storage_path || "",
    status: data.status || "ready",
    total_pages,
    uploaded_at,
    id: document_id,
    workspaceId: workspace_id,
    name: filename,
    type: file_type,
    sizeKb: data.sizeKb !== undefined ? data.sizeKb : 1024,
    uploadedAt: uploaded_at,
    pageCount: total_pages,
  };
}

const MOCK_DOCS: Document[] = [
  normalizeDocument({ document_id: "doc_01", workspace_id: "ws_01", filename: "AAPL_10K_FY2024.pdf", file_type: "pdf", sizeKb: 4200, status: "ready", uploaded_at: "2024-07-10T10:00:00Z", total_pages: 128 }),
  normalizeDocument({ document_id: "doc_02", workspace_id: "ws_01", filename: "AAPL_Q3_2024_Earnings.pdf", file_type: "pdf", sizeKb: 820, status: "ready", uploaded_at: "2024-07-12T10:00:00Z", total_pages: 32 }),
  normalizeDocument({ document_id: "doc_03", workspace_id: "ws_01", filename: "AAPL_Proxy_2024.pdf", file_type: "pdf", sizeKb: 2100, status: "processing", uploaded_at: "2024-07-13T10:00:00Z" }),
  normalizeDocument({ document_id: "doc_04", workspace_id: "ws_02", filename: "TSLA_10K_FY2023.pdf", file_type: "pdf", sizeKb: 5600, status: "ready", uploaded_at: "2024-07-05T10:00:00Z", total_pages: 164 }),
  normalizeDocument({ document_id: "doc_05", workspace_id: "ws_02", filename: "Ford_Annual_Report_2023.pdf", file_type: "pdf", sizeKb: 3100, status: "ready", uploaded_at: "2024-07-05T10:00:00Z", total_pages: 96 }),
  normalizeDocument({ document_id: "doc_06", workspace_id: "ws_03", filename: "MSFT_10K_FY2023.pdf", file_type: "pdf", sizeKb: 6800, status: "ready", uploaded_at: "2024-06-22T10:00:00Z", total_pages: 194 }),
];

export async function getDocuments(workspaceId: string): Promise<Document[]> {
  if (USE_MOCK) {
    await sleep(500);
    return MOCK_DOCS.filter((d) => d.workspaceId === workspaceId || d.workspace_id === workspaceId);
  }
  const data = await apiGet<any[]>(`/documents?workspace_id=${workspaceId}`);
  return Array.isArray(data) ? data.map(normalizeDocument) : [];
}

export async function uploadDocument(workspaceId: string, file: File): Promise<Document> {
  if (USE_MOCK) {
    await sleep(1200);
    return normalizeDocument({
      document_id: `doc_${Date.now()}`,
      workspace_id: workspaceId,
      filename: file.name,
      file_type: file.name.split(".").pop() ?? "pdf",
      sizeKb: Math.round(file.size / 1024),
      status: "processing",
      uploaded_at: new Date().toISOString(),
    });
  }
  const formData = new FormData();
  formData.append("file", file);
  formData.append("workspace_id", workspaceId);
  try {
    const data = await apiUpload<any>("/documents", formData);
    return normalizeDocument({ ...data, workspace_id: workspaceId, filename: file.name, sizeKb: Math.round(file.size / 1024) });
  } catch (err) {
    // Fallback if backend PR still uses /upload instead of /documents during team transition
    const data = await apiUpload<any>("/upload", formData);
    return normalizeDocument({ ...data, workspace_id: workspaceId, filename: file.name, sizeKb: Math.round(file.size / 1024) });
  }
}

export async function deleteDocument(id: string): Promise<void> {
  if (USE_MOCK) {
    await sleep(300);
    return;
  }
  await apiDelete(`/documents/${id}`);
}

