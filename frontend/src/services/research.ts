import { sleep } from "./api";

export interface Citation {
  docId: string;
  docName: string;
  page: number;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  createdAt: string;
}

export interface ResearchSession {
  id: string;
  workspaceId: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

const MOCK_MESSAGES: ChatMessage[] = [
  { id: "msg_01", role: "user", content: "What was Apple's total revenue in FY2024?", createdAt: "2024-07-13T10:00:00Z" },
  {
    id: "msg_02", role: "assistant",
    content: "Apple's total net sales for fiscal year 2024 were **$391.0 billion**, representing an increase of approximately 2% compared to FY2023 ($383.3 billion). The growth was primarily driven by Services revenue, which reached $96.2 billion, up 13% year-over-year.",
    citations: [
      { docId: "doc_01", docName: "AAPL_10K_FY2024.pdf", page: 24, snippet: "Net sales: $391,035 million for the year ended September 28, 2024." },
      { docId: "doc_01", docName: "AAPL_10K_FY2024.pdf", page: 28, snippet: "Services revenue increased 13% to $96,169 million." },
    ],
    createdAt: "2024-07-13T10:00:05Z",
  },
  { id: "msg_03", role: "user", content: "What are the main risk factors mentioned?", createdAt: "2024-07-13T10:01:00Z" },
  {
    id: "msg_04", role: "assistant",
    content: "Apple's 10-K identifies several key risk factors:\n\n1. **Global economic conditions** — demand sensitivity to macroeconomic downturns\n2. **Supply chain concentration** — heavy dependence on a limited number of manufacturing partners\n3. **Regulatory environment** — increasing scrutiny of App Store practices in the EU and US\n4. **Geopolitical risk** — significant revenue exposure to China (~18% of net sales)\n5. **Competition** — intensifying competition in smartphones, wearables, and services",
    citations: [
      { docId: "doc_01", docName: "AAPL_10K_FY2024.pdf", page: 6, snippet: "A significant portion of the Company's revenue and earnings are generated from outside the U.S." },
    ],
    createdAt: "2024-07-13T10:01:06Z",
  },
];

export async function getSessions(workspaceId: string): Promise<ResearchSession[]> {
  await sleep(400);
  return [
    { id: "sess_01", workspaceId, title: "AAPL Revenue Analysis", messageCount: 4, createdAt: "2024-07-13", updatedAt: "2024-07-13" },
    { id: "sess_02", workspaceId, title: "Risk Factor Deep Dive", messageCount: 2, createdAt: "2024-07-12", updatedAt: "2024-07-12" },
  ];
}

export async function getMessages(_sessionId: string): Promise<ChatMessage[]> {
  await sleep(600);
  return MOCK_MESSAGES;
}

export async function sendMessage(_sessionId: string, content: string): Promise<ChatMessage> {
  await sleep(1500);
  return {
    id: `msg_${Date.now()}`,
    role: "assistant",
    content: `Based on the documents in your workspace, here is what I found regarding "${content.slice(0, 40)}..."\n\nThis is a mock response. Connect the FastAPI backend to get real citations.`,
    citations: [{ docId: "doc_01", docName: "AAPL_10K_FY2024.pdf", page: 1, snippet: "Mock citation snippet." }],
    createdAt: new Date().toISOString(),
  };
}
