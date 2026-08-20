import { apiGet, apiPost } from "./api";

export interface Citation {
  // Official SAD Section 14.8 properties
  document_id: string;
  page: number;
  snippet: string;
  chunk_id?: string;
  section?: string;
  score?: number;

  // UI aliases
  docId: string;
  docName: string;
  chunkId?: string;
}

export interface ChatMessage {
  // Official SAD properties
  message_id?: string;
  role: "user" | "assistant" | string;
  content: string;
  citations?: Citation[];
  confidence?: number;
  grounding_status?: string;
  created_at?: string;

  // UI aliases (zero-crash strategy)
  id: string;
  createdAt: string;
}

export interface ResearchSession {
  // Official SAD properties
  conversation_id: string;
  workspace_id: string;
  title: string;
  turns?: any[];
  created_at?: string;
  updated_at: string;

  // UI aliases (zero-crash strategy)
  id: string;
  workspaceId: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export function normalizeCitation(data: any): Citation {
  const document_id = data.document_id || data.docId || "doc_01";
  const chunk_id = data.chunk_id || data.chunkId || "";
  return {
    ...data,
    document_id,
    page: data.page !== undefined ? data.page : 1,
    snippet: data.snippet || "",
    chunk_id,
    section: data.section || "",
    score: data.score !== undefined ? data.score : 1.0,
    docId: document_id,
    docName: data.docName || data.filename || data.document_name || `Document ${document_id}`,
    chunkId: chunk_id,
  };
}

export function normalizeMessage(data: any): ChatMessage {
  const id = data.message_id || data.id || `msg_${Date.now()}`;
  const created_at = data.created_at || data.createdAt || new Date().toISOString();
  const citations = Array.isArray(data.citations)
    ? data.citations.map(normalizeCitation)
    : undefined;

  return {
    ...data,
    message_id: id,
    role: data.role || "assistant",
    content: data.content || "",
    citations,
    confidence: data.confidence !== undefined ? data.confidence : 1.0,
    grounding_status: data.grounding_status || "grounded",
    created_at,
    id,
    createdAt: created_at,
  };
}

export function normalizeSession(data: any): ResearchSession {
  const conversation_id = data.conversation_id || data.id || `sess_${Date.now()}`;
  const workspace_id = data.workspace_id || data.workspaceId || "ws_default";
  const updated_at = data.updated_at || data.updatedAt || new Date().toISOString();
  const created_at = data.created_at || data.createdAt || updated_at;
  const turns = data.turns || [];
  const messageCount =
    data.messageCount !== undefined
      ? data.messageCount
      : Array.isArray(turns)
      ? turns.length
      : 0;

  return {
    ...data,
    conversation_id,
    workspace_id,
    title: data.title || "Research Session",
    turns,
    created_at,
    updated_at,
    id: conversation_id,
    workspaceId: workspace_id,
    messageCount,
    createdAt: created_at,
    updatedAt: updated_at,
  };
}

export async function getSessions(workspaceId: string): Promise<ResearchSession[]> {
  const data = await apiGet<any[]>(`/research/history?workspace_id=${workspaceId}`);
  return Array.isArray(data) ? data.map(normalizeSession) : [];
}

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const data = await apiGet<any>(`/research/history/${sessionId}`);
  const msgs = data.turns || data.messages || data;
  return Array.isArray(msgs) ? msgs.map(normalizeMessage) : [];
}

export async function createSession(sessionName: string, workspaceId: string): Promise<ResearchSession> {
  const data = await apiPost<any>("/research/sessions", {
    session_name: sessionName,
    workspace_id: workspaceId,
  });
  return normalizeSession(data);
}

export async function sendMessage(
  sessionId: string,
  content: string,
  workspaceId?: string,
  documentId?: string,
  documentIds?: string[]
): Promise<ChatMessage> {
  // Correct route: POST /research/query (SAD Section 14.8)
  const data = await apiPost<any>("/research/query", {
    workspace_id: workspaceId || sessionId,
    query: content,
    conversation_id: sessionId !== workspaceId ? sessionId : undefined,
    document_id: documentId || undefined,
    document_ids: documentIds && documentIds.length > 0 ? documentIds : undefined,
  });
  return normalizeMessage({
    message_id: data.message_id,
    role: "assistant",
    content: data.response,
    citations: data.citations,
    confidence: data.confidence,
    grounding_status: data.grounding_status,
    created_at: data.created_at,
  });
}
