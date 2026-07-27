import { sleep, apiGet, apiPost, USE_MOCK } from "./api";

export interface Citation {
  // Official SAD Section 14.8 properties
  document_id: string;
  page: number;
  snippet: string;

  // UI aliases
  docId: string;
  docName: string;
}

export interface ChatMessage {
  // Official SAD properties
  message_id?: string;
  role: "user" | "assistant" | string;
  content: string;
  citations?: Citation[];
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
  return {
    ...data,
    document_id,
    page: data.page !== undefined ? data.page : 1,
    snippet: data.snippet || "",
    docId: document_id,
    docName: data.docName || data.filename || `Document ${document_id}`,
  };
}

export function normalizeMessage(data: any): ChatMessage {
  const id = data.message_id || data.id || `msg_${Date.now()}`;
  const created_at = data.created_at || data.createdAt || new Date().toISOString();
  const citations = Array.isArray(data.citations) ? data.citations.map(normalizeCitation) : undefined;

  return {
    ...data,
    message_id: id,
    role: data.role || "assistant",
    content: data.content || "",
    citations,
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
  const messageCount = data.messageCount !== undefined ? data.messageCount : (Array.isArray(turns) ? turns.length : 0);

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

const MOCK_MESSAGES: ChatMessage[] = [
  normalizeMessage({ id: "msg_01", role: "user", content: "What was Apple's total revenue in FY2024?", createdAt: "2024-07-13T10:00:00Z" }),
  normalizeMessage({
    id: "msg_02", role: "assistant",
    content: "Apple's total net sales for fiscal year 2024 were **$391.0 billion**, representing an increase of approximately 2% compared to FY2023 ($383.3 billion). The growth was primarily driven by Services revenue, which reached $96.2 billion, up 13% year-over-year.",
    citations: [
      { docId: "doc_01", docName: "AAPL_10K_FY2024.pdf", page: 24, snippet: "Net sales: $391,035 million for the year ended September 28, 2024." },
      { docId: "doc_01", docName: "AAPL_10K_FY2024.pdf", page: 28, snippet: "Services revenue increased 13% to $96,169 million." },
    ],
    createdAt: "2024-07-13T10:00:05Z",
  }),
  normalizeMessage({ id: "msg_03", role: "user", content: "What are the main risk factors mentioned?", createdAt: "2024-07-13T10:01:00Z" }),
  normalizeMessage({
    id: "msg_04", role: "assistant",
    content: "Apple's 10-K identifies several key risk factors:\n\n1. **Global economic conditions** — demand sensitivity to macroeconomic downturns\n2. **Supply chain concentration** — heavy dependence on a limited number of manufacturing partners\n3. **Regulatory environment** — increasing scrutiny of App Store practices in the EU and US\n4. **Geopolitical risk** — significant revenue exposure to China (~18% of net sales)\n5. **Competition** — intensifying competition in smartphones, wearables, and services",
    citations: [
      { docId: "doc_01", docName: "AAPL_10K_FY2024.pdf", page: 6, snippet: "A significant portion of the Company's revenue and earnings are generated from outside the U.S." },
    ],
    createdAt: "2024-07-13T10:01:06Z",
  }),
];

export async function getSessions(workspaceId: string): Promise<ResearchSession[]> {
  if (USE_MOCK) {
    await sleep(400);
    return [
      normalizeSession({ id: "sess_01", workspaceId, title: "AAPL Revenue Analysis", messageCount: 4, createdAt: "2024-07-13", updatedAt: "2024-07-13" }),
      normalizeSession({ id: "sess_02", workspaceId, title: "Risk Factor Deep Dive", messageCount: 2, createdAt: "2024-07-12", updatedAt: "2024-07-12" }),
    ];
  }
  const data = await apiGet<any[]>(`/research/history?workspace_id=${workspaceId}`);
  return Array.isArray(data) ? data.map(normalizeSession) : [];
}

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  if (USE_MOCK) {
    await sleep(600);
    return MOCK_MESSAGES;
  }
  const data = await apiGet<any>(`/research/history/${sessionId}`);
  const msgs = data.turns || data.messages || data;
  return Array.isArray(msgs) ? msgs.map(normalizeMessage) : [];
}

export async function sendMessage(sessionId: string, content: string, workspaceId?: string): Promise<ChatMessage> {
  if (USE_MOCK) {
    await sleep(1500);
    return normalizeMessage({
      id: `msg_${Date.now()}`,
      role: "assistant",
      content: `Based on the documents in your workspace, here is what I found regarding "${content.slice(0, 40)}..."\n\nThis is a mock response. Connect the FastAPI backend to get real citations.`,
      citations: [{ docId: "doc_01", docName: "AAPL_10K_FY2024.pdf", page: 1, snippet: "Mock citation snippet." }],
      createdAt: new Date().toISOString(),
    });
  }
  const data = await apiPost<any>("/research", {
    workspace_id: workspaceId || sessionId,
    query: content,
  });
  return normalizeMessage(data.answer || data);
}

