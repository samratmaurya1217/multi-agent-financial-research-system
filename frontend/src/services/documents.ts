import { apiGet, apiDelete, apiUpload } from "./api";

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
  size_kb?: number;
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
  const size_kb = data.size_kb !== undefined ? data.size_kb : data.sizeKb;

  return {
    ...data,
    document_id,
    workspace_id,
    filename,
    file_type,
    storage_path: data.storage_path || "",
    status: data.status || "ready",
    total_pages,
    size_kb,
    uploaded_at,
    id: document_id,
    workspaceId: workspace_id,
    name: filename,
    type: file_type,
    sizeKb: size_kb,
    uploadedAt: uploaded_at,
    pageCount: total_pages,
  };
}

export async function getDocuments(workspaceId: string): Promise<Document[]> {
  const data = await apiGet<any[]>(`/documents?workspace_id=${workspaceId}`);
  return Array.isArray(data) ? data.map(normalizeDocument) : [];
}

export async function uploadDocument(workspaceId: string, file: File): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("workspace_id", workspaceId);
  try {
    const data = await apiUpload<any>("/documents", formData);
    return normalizeDocument({
      ...data,
      workspace_id: workspaceId,
      filename: data.filename || file.name,
      size_kb: data.size_kb || Math.round(file.size / 1024),
    });
  } catch (err) {
    // Fallback to legacy /upload endpoint
    const fd2 = new FormData();
    fd2.append("file", file);
    fd2.append("workspace_id", workspaceId);
    const data = await apiUpload<any>("/upload", fd2);
    return normalizeDocument({
      ...data,
      workspace_id: workspaceId,
      filename: data.filename || file.name,
      size_kb: data.size_kb || Math.round(file.size / 1024),
    });
  }
}

export async function deleteDocument(id: string): Promise<void> {
  await apiDelete(`/documents/${id}`);
}
