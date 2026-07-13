import { sleep } from "./api";

export interface Workspace {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  sessionCount: number;
  createdAt: string;
  updatedAt: string;
  status: "active" | "archived";
}

const MOCK_WORKSPACES: Workspace[] = [
  { id: "ws_01", name: "Apple Inc. Analysis", description: "Full FY2024 analysis including 10-K and proxy", documentCount: 3, sessionCount: 5, createdAt: "2024-07-01", updatedAt: "2024-07-13", status: "active" },
  { id: "ws_02", name: "Tesla vs Ford Comparison", description: "Competitive benchmarking for EV vs legacy auto", documentCount: 4, sessionCount: 2, createdAt: "2024-07-05", updatedAt: "2024-07-11", status: "active" },
  { id: "ws_03", name: "MSFT Deep Dive", description: "Microsoft cloud revenue trajectory and margins", documentCount: 2, sessionCount: 3, createdAt: "2024-06-20", updatedAt: "2024-07-08", status: "active" },
  { id: "ws_04", name: "Amazon Risk Review", description: "Regulatory and margin risk assessment", documentCount: 1, sessionCount: 1, createdAt: "2024-06-10", updatedAt: "2024-06-25", status: "archived" },
];

export async function getWorkspaces(): Promise<Workspace[]> {
  await sleep(600);
  return MOCK_WORKSPACES;
}

export async function getWorkspace(id: string): Promise<Workspace> {
  await sleep(400);
  return MOCK_WORKSPACES.find((w) => w.id === id) ?? MOCK_WORKSPACES[0];
}

export async function createWorkspace(payload: { name: string; description: string }): Promise<Workspace> {
  await sleep(800);
  return { id: `ws_${Date.now()}`, ...payload, documentCount: 0, sessionCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: "active" };
}

export async function deleteWorkspace(_id: string): Promise<void> {
  await sleep(400);
}
