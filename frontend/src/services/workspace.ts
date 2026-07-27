import { apiGet, apiPost, apiDelete } from "./api";

export interface WorkspaceManifestItem {
  document_id: string;
  filename: string;
  status: string;
}

export interface Workspace {
  // Official SAD Chapter 14.5 properties (matching backend & DB schema)
  workspace_id: string;
  name: string;
  document_manifest?: Array<string | WorkspaceManifestItem>;
  created_at: string;

  // UI aliases for existing React components (zero-crash strategy)
  id: string;
  description: string;
  documentCount: number;
  sessionCount: number;
  createdAt: string;
  updatedAt: string;
  status: "active" | "archived" | string;
}

export function normalizeWorkspace(data: any): Workspace {
  const workspace_id = data.workspace_id || data.id || `ws_${Date.now()}`;
  const created_at = data.created_at || data.createdAt || new Date().toISOString();
  const document_manifest = data.document_manifest || [];
  const documentCount =
    typeof data.documentCount === "number"
      ? data.documentCount
      : Array.isArray(document_manifest)
      ? document_manifest.length
      : 0;

  return {
    ...data,
    workspace_id,
    name: data.name || "Unnamed Workspace",
    document_manifest,
    created_at,
    id: workspace_id,
    description: data.description || "",
    documentCount,
    sessionCount: data.sessionCount !== undefined ? data.sessionCount : 0,
    createdAt: created_at,
    updatedAt: data.updated_at || data.updatedAt || created_at,
    status: data.status || "active",
  };
}

export async function getWorkspaces(): Promise<Workspace[]> {
  const data = await apiGet<any[]>("/workspaces");
  return Array.isArray(data) ? data.map(normalizeWorkspace) : [];
}

export async function getWorkspace(id: string): Promise<Workspace> {
  const data = await apiGet<any>(`/workspaces/${id}`);
  return normalizeWorkspace(data);
}

export async function createWorkspace(payload: { name: string; description?: string }): Promise<Workspace> {
  const data = await apiPost<any>("/workspaces", { name: payload.name, description: payload.description || "" });
  return normalizeWorkspace(data);
}

export async function deleteWorkspace(id: string): Promise<void> {
  await apiDelete(`/workspaces/${id}`);
}
