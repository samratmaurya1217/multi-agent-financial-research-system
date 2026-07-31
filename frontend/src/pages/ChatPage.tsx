import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { CitationChip } from "@/components/CitationChip";
import { getMessages, getSessions, sendMessage, type ChatMessage } from "@/services/research";
import { getDocuments, type Document } from "@/services/documents";
import { getWorkspaces } from "@/services/workspace";
import { MessageSquare, Send, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTED = [
  "What was the total revenue in the latest fiscal year?",
  "What are the main risk factors mentioned?",
  "How has operating margin trended over the past 3 years?",
  "Are there any going concern warnings?",
];

export function ChatPage() {
  const { workspaceId: paramWorkspaceId } = useParams<{ workspaceId?: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>(paramWorkspaceId || "");
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionTitle, setSessionTitle] = useState("Research Session");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load workspace, documents, and existing conversation on mount
  useEffect(() => {
    async function init() {
      try {
        // Determine which workspace to use
        let wsId = paramWorkspaceId || "";
        if (!wsId) {
          const workspaces = await getWorkspaces();
          wsId = workspaces[0]?.workspace_id || "ws_apple2024";
        }
        setWorkspaceId(wsId);

        // Load documents for the workspace
        const wsDocs = await getDocuments(wsId);
        setDocs(wsDocs);

        // Load most recent conversation or create new
        const sessions = await getSessions(wsId);
        if (sessions.length > 0) {
          const latest = sessions[0];
          setSessionId(latest.conversation_id);
          setSessionTitle(latest.title || "Research Session");
          const msgs = await getMessages(latest.conversation_id);
          setMessages(msgs);
        } else {
          // No sessions yet — start fresh
          setSessionId(`conv_${Date.now()}`);
        }
      } catch (err) {
        console.error("Chat init error:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [paramWorkspaceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = async (text?: string) => {
    const content = text ?? input;
    if (!content.trim() || sending) return;
    setInput("");
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    try {
      const reply = await sendMessage(sessionId, content, workspaceId);
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* Source panel */}
        <AnimatePresence initial={false}>
          {sourcesOpen && (
            <motion.aside
              key="sources"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-shrink-0 border-r border-slate-200 bg-slate-50 overflow-hidden flex flex-col"
            >
              <div className="px-4 py-4 border-b border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Source Documents
                </p>
                {loading ? (
                  <div className="space-y-2">
                    {[0, 1].map((i) => (
                      <div key={i} className="h-14 rounded-xl bg-white border border-slate-200 shadow-sm animate-pulse" />
                    ))}
                  </div>
                ) : docs.length === 0 ? (
                  <p className="text-xs font-bold text-slate-400">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {docs.map((doc) => (
                      <div
                        key={doc.document_id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm"
                      >
                        <FileText className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-700 truncate">{doc.filename}</p>
                          <p className="text-xs font-medium text-slate-500">
                            {doc.total_pages ? `${doc.total_pages} pages` : doc.file_type.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-4 py-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Session
                </p>
                <p className="text-sm font-bold text-slate-700 truncate">{sessionTitle}</p>
                <p className="text-xs font-medium text-slate-500 mt-1">{messages.length} messages</p>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="h-14 border-b border-slate-200 flex items-center px-4 gap-3 flex-shrink-0 bg-white shadow-sm z-10">
            <button
              onClick={() => setSourcesOpen((v) => !v)}
              className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-white transition-colors shadow-sm"
            >
              {sourcesOpen ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{sessionTitle}</p>
              <p className="text-xs font-medium text-slate-500">{docs.length} source document{docs.length !== 1 ? "s" : ""} indexed</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="h-2 w-2 rounded-full bg-indigo-500/60"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-100 shadow-sm flex items-center justify-center mb-6">
                      <MessageSquare className="h-8 w-8 text-indigo-500" />
                    </div>
                    <h3 className="text-slate-800 font-extrabold text-2xl mb-2 tracking-tight">Ask anything about your documents</h3>
                    <p className="text-slate-500 font-medium text-sm mb-8 max-w-md">
                      Every answer is grounded in your source documents with exact citations.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3 max-w-2xl w-full">
                      {SUGGESTED.map((q) => (
                        <button
                          key={q}
                          onClick={() => submit(q)}
                          className="text-left px-5 py-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-sm font-medium text-slate-600 hover:text-slate-800 transition-all shadow-sm hover:shadow-md"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] space-y-2",
                        msg.role === "user" ? "items-end flex flex-col" : ""
                      )}
                    >
                      <div
                        className={cn(
                          "px-5 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line shadow-sm",
                          msg.role === "user"
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-white border border-slate-200 text-slate-700 font-medium rounded-bl-sm"
                        )}
                      >
                        {msg.content}
                      </div>
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((c, i) => (
                            <CitationChip key={i} citation={c} />
                          ))}
                        </div>
                      )}
                      <p className="text-xs font-bold text-slate-400 px-1 mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="px-5 py-4 rounded-2xl rounded-bl-sm bg-white border border-slate-200 shadow-sm flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-slate-400"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="px-6 py-4 border-t border-slate-200 flex-shrink-0 bg-white">
            <div className="flex items-end gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-sm">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Ask a question about your documents... (Enter to send)"
                rows={1}
                className="flex-1 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none resize-none max-h-32 py-1.5"
              />
              <button
                onClick={() => submit()}
                disabled={!input.trim() || sending}
                className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
            <p className="text-xs font-bold text-slate-400 mt-3 text-center">
              Answers are grounded in your documents. Every claim includes a source citation.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
