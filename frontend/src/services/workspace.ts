import { sleep, apiGet, apiPost, apiDelete, USE_MOCK } from "./api";

export interface WorkspaceManifestItem {
  document_id: string;
  filename: string;
  status: string;
}

export interface Workspace {
  // Official SAD Chapter 14.5 properties (matching backend PR & DB schema)
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
  const documentCount = Array.isArray(document_manifest)
    ? document_manifest.length
    : (data.documentCount !== undefined ? data.documentCount : 0);

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

const MOCK_WORKSPACES: Workspace[] = [
  normalizeWorkspace({ workspace_id: "ws_01", name: "Apple Inc. Analysis", description: "Full FY2024 analysis including 10-K and proxy", documentCount: 3, sessionCount: 5, created_at: "2024-07-01T10:00:00Z", updatedAt: "2024-07-13", status: "active" }),
  normalizeWorkspace({ workspace_id: "ws_02", name: "Tesla vs Ford Comparison", description: "Competitive benchmarking for EV vs legacy auto", documentCount: 4, sessionCount: 2, created_at: "2024-07-05T10:00:00Z", updatedAt: "2024-07-11", status: "active" }),
  normalizeWorkspace({ workspace_id: "ws_03", name: "MSFT Deep Dive", description: "Microsoft cloud revenue trajectory and margins", documentCount: 2, sessionCount: 3, created_at: "2024-06-20T10:00:00Z", updatedAt: "2024-07-08", status: "active" }),
  normalizeWorkspace({ workspace_id: "ws_04", name: "Amazon Risk Review", description: "Regulatory and margin risk assessment", documentCount: 1, sessionCount: 1, created_at: "2024-06-10T10:00:00Z", updatedAt: "2024-06-25", status: "archived" }),
];

export async function getWorkspaces(): Promise<Workspace[]> {
  if (USE_MOCK) {
    await sleep(600);
    return MOCK_WORKSPACES;
  }
  const data = await apiGet<any[]>("/workspaces");
  return Array.isArray(data) ? data.map(normalizeWorkspace) : [];
}

export async function getWorkspace(id: string): Promise<Workspace> {
  if (USE_MOCK) {
    await sleep(400);
    return MOCK_WORKSPACES.find((w) => w.id === id || w.workspace_id === id) ?? MOCK_WORKSPACES[0];
  }
  const data = await apiGet<any>(`/workspaces/${id}`);
  return normalizeWorkspace(data);
}

export async function createWorkspace(payload: { name: string; description?: string }): Promise<Workspace> {
  if (USE_MOCK) {
    await sleep(800);
    const newWs = normalizeWorkspace({
      workspace_id: `ws_${Date.now()}`,
      name: payload.name,
      description: payload.description || "",
      created_at: new Date().toISOString(),
      status: "active",
    });
    return newWs;
  }
  const data = await apiPost<any>("/workspaces", { name: payload.name });
  return normalizeWorkspace({ ...data, description: payload.description });
}

export async function deleteWorkspace(id: string): Promise<void> {
  if (USE_MOCK) {
    await sleep(400);
    return;
  }
  await apiDelete(`/workspaces/${id}`);
}

