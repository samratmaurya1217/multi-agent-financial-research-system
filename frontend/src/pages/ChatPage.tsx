import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { CitationChip } from "@/components/CitationChip";
import {
  getMessages,
  getSessions,
  sendMessage,
  createSession,
  type ChatMessage,
  type Citation,
  type ResearchSession,
} from "@/services/research";
import { getDocuments, type Document } from "@/services/documents";
import { getWorkspaces } from "@/services/workspace";
import {
  MessageSquare,
  Send,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Layers,
  X,
  Sparkles,
  Filter,
  Plus,
  ShieldCheck,
  AlertTriangle,
  BookOpen,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTED = [
  "What was the total revenue and what key risk factors are highlighted in the report?",
  "What are the main risk factors mentioned in the financial statements?",
  "How has operating margin trended over the past fiscal periods?",
  "What is the revenue breakdown between manufactured goods and services?",
];

export function ChatPage() {
  const { workspaceId: paramWorkspaceId } = useParams<{ workspaceId?: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>(paramWorkspaceId || "");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionTitle, setSessionTitle] = useState("Research Session");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fast initialization on mount
  useEffect(() => {
    async function init() {
      try {
        let wsId = paramWorkspaceId || "";
        if (!wsId) {
          const workspaces = await getWorkspaces();
          wsId = workspaces[0]?.workspace_id || "ws_default";
        }
        setWorkspaceId(wsId);

        // Fetch documents and existing chat sessions in parallel
        const [wsDocs, wsSessions] = await Promise.all([
          getDocuments(wsId).catch(() => []),
          getSessions(wsId).catch(() => []),
        ]);

        // Deduplicate distinct documents by filename
        const uniqueDocs = Array.from(new Map(wsDocs.map((d) => [d.filename, d])).values());
        setDocs(uniqueDocs);
        setSessions(wsSessions);

        if (wsSessions.length > 0) {
          const latest = wsSessions[0];
          setSessionId(latest.conversation_id);
          setSessionTitle(latest.title || "Research Session");
          const msgs = await getMessages(latest.conversation_id).catch(() => []);
          setMessages(msgs);
        } else {
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
  }, [messages, sending]);

  const selectedDoc = docs.find((d) => d.document_id === selectedDocId);

  const toggleDocSelection = (docId: string) => {
    setSelectedDocId((prev) => (prev === docId ? null : docId));
  };

  const handleSelectSession = async (sess: ResearchSession) => {
    if (sess.conversation_id === sessionId) return;
    setSessionId(sess.conversation_id);
    setSessionTitle(sess.title || "Research Session");
    setLoading(true);
    try {
      const msgs = await getMessages(sess.conversation_id);
      setMessages(msgs);
    } catch (err) {
      console.error("Load session error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = async () => {
    try {
      const newSess = await createSession(
        `Research Session ${sessions.length + 1}`,
        workspaceId
      );
      setSessions((prev) => [newSess, ...prev]);
      setSessionId(newSess.conversation_id);
      setSessionTitle(newSess.title);
      setMessages([]);
    } catch (err) {
      console.error("Create session error:", err);
      const fallbackId = `conv_${Date.now()}`;
      setSessionId(fallbackId);
      setSessionTitle("New Research Session");
      setMessages([]);
    }
  };

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
      const reply = await sendMessage(
        sessionId,
        content,
        workspaceId,
        selectedDocId || undefined
      );
      setMessages((prev) => [...prev, reply]);
      // Refresh session list count
      getSessions(workspaceId)
        .then((s) => setSessions(s))
        .catch(() => {});
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-full relative">
        {/* Source & Session Sidebar */}
        <AnimatePresence initial={false}>
          {sourcesOpen && (
            <motion.aside
              key="sources"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex-shrink-0 border-r border-slate-200 bg-slate-50/90 backdrop-blur-sm overflow-hidden flex flex-col"
            >
              {/* Header Action: New Research Chat */}
              <div className="p-3 border-b border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={handleNewSession}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-500/20 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Research Chat</span>
                </button>
              </div>

              {/* Source Documents Filter */}
              <div className="px-4 py-3 border-b border-slate-200">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                    Source Documents
                  </p>
                  {selectedDocId && (
                    <button
                      onClick={() => setSelectedDocId(null)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="space-y-2">
                    {[0, 1].map((i) => (
                      <div
                        key={i}
                        className="h-12 rounded-xl bg-white border border-slate-200 shadow-sm animate-pulse"
                      />
                    ))}
                  </div>
                ) : docs.length === 0 ? (
                  <p className="text-xs font-medium text-slate-500 py-1">No documents indexed yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {/* All Documents Scope Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedDocId(null)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl border text-left transition-all text-xs font-bold",
                        selectedDocId === null
                          ? "bg-indigo-50/90 border-indigo-300 text-indigo-900 shadow-sm ring-1 ring-indigo-200"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100/60"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Layers
                          className={cn(
                            "h-3.5 w-3.5 flex-shrink-0",
                            selectedDocId === null ? "text-indigo-600" : "text-slate-400"
                          )}
                        />
                        <span className="truncate">All Documents ({docs.length})</span>
                      </div>
                      {selectedDocId === null && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0" />
                      )}
                    </button>

                    {/* Individual Document Scope Options */}
                    {docs.map((doc) => {
                      const isSelected = selectedDocId === doc.document_id;
                      return (
                        <button
                          key={doc.document_id}
                          type="button"
                          onClick={() => toggleDocSelection(doc.document_id)}
                          className={cn(
                            "w-full flex items-start gap-2 px-3 py-2 rounded-xl border text-left transition-all",
                            isSelected
                              ? "bg-indigo-50/90 border-indigo-400 text-indigo-950 shadow-sm ring-1 ring-indigo-300"
                              : "bg-white border-slate-200 hover:bg-slate-100/60 text-slate-700"
                          )}
                        >
                          <FileText
                            className={cn(
                              "h-3.5 w-3.5 mt-0.5 flex-shrink-0",
                              isSelected ? "text-indigo-600" : "text-slate-400"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate leading-tight">{doc.filename}</p>
                            <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                              {doc.total_pages ? `${doc.total_pages} pages` : doc.file_type.toUpperCase()}
                            </p>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Research Sessions History */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                  Past Research Sessions
                </p>
                <div className="space-y-1.5">
                  {sessions.map((sess) => {
                    const isActive = sess.conversation_id === sessionId;
                    return (
                      <button
                        key={sess.conversation_id}
                        type="button"
                        onClick={() => handleSelectSession(sess)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-xl border transition-all flex flex-col gap-0.5",
                          isActive
                            ? "bg-indigo-50/90 border-indigo-300 text-indigo-950 shadow-sm font-bold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100/60"
                        )}
                      >
                        <p className="text-xs font-bold truncate">{sess.title || "Research Session"}</p>
                        <p className="text-[10px] font-medium text-slate-400">
                          {sess.messageCount || 0} messages •{" "}
                          {new Date(sess.updated_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Chat Main Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/40">
          {/* Header */}
          <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 gap-3 flex-shrink-0 bg-white shadow-sm z-10">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSourcesOpen((v) => !v)}
                className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-white transition-colors shadow-sm"
              >
                {sourcesOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{sessionTitle}</p>
                <p className="text-xs font-medium text-slate-500 truncate">
                  {docs.length} source document{docs.length !== 1 ? "s" : ""} indexed
                </p>
              </div>
            </div>

            {/* Scope Filter Pill */}
            <div className="flex items-center gap-2">
              {selectedDoc ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold shadow-sm animate-in fade-in">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span className="max-w-[200px] truncate">Filtered: {selectedDoc.filename}</span>
                  <button
                    onClick={() => setSelectedDocId(null)}
                    className="ml-1 hover:bg-indigo-200/60 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
                  <Layers className="h-3 w-3 text-slate-500" />
                  <span>Searching All Documents</span>
                </div>
              )}
            </div>
          </div>

          {/* Messages Container */}
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
                  <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto py-8">
                    <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-100 shadow-sm flex items-center justify-center mb-6">
                      <Sparkles className="h-8 w-8 text-indigo-600" />
                    </div>
                    <h3 className="text-slate-800 font-extrabold text-2xl mb-2 tracking-tight">
                      Research & Financial Analysis
                    </h3>
                    <p className="text-slate-500 font-medium text-sm mb-6 max-w-md">
                      {selectedDoc
                        ? `Insights will be synthesized strictly from ${selectedDoc.filename}.`
                        : "Every insight is synthesized across your workspace filings with exact source citations."}
                    </p>

                    <div className="grid sm:grid-cols-2 gap-3 w-full">
                      {SUGGESTED.map((q) => (
                        <button
                          key={q}
                          onClick={() => submit(q)}
                          className="text-left px-4 py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-medium text-slate-700 hover:text-slate-900 transition-all shadow-sm hover:shadow-md"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg) => {
                  const isUser = msg.role === "user";
                  const isRefusal =
                    msg.grounding_status === "refused" ||
                    msg.content.includes("This information is not available in the provided documents");

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("flex", isUser ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] space-y-2",
                          isUser ? "items-end flex flex-col" : "items-start flex flex-col"
                        )}
                      >
                        {/* Status / Confidence Badge for Assistant messages */}
                        {!isUser && (
                          <div className="flex items-center gap-2 mb-1">
                            {isRefusal ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold shadow-xs">
                                <AlertTriangle className="h-3 w-3 text-amber-600" />
                                Grounding Refusal (FR-RES-04)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold shadow-xs">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                Grounded • {msg.citations?.length || 0} Citations
                              </span>
                            )}
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div
                          className={cn(
                            "px-5 py-4 rounded-2xl text-sm leading-relaxed shadow-sm border",
                            isUser
                              ? "bg-indigo-600 text-white rounded-br-sm border-indigo-700 font-medium"
                              : isRefusal
                              ? "bg-amber-50/60 border-amber-200 text-slate-800 rounded-bl-sm"
                              : "bg-white border-slate-200 text-slate-800 rounded-bl-sm"
                          )}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <div className="prose prose-slate max-w-none text-xs md:text-sm text-slate-800 leading-relaxed font-medium">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  table: ({ node, ...props }) => (
                                    <div className="my-4 overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                                      <table className="w-full text-left text-xs border-collapse bg-white" {...props} />
                                    </div>
                                  ),
                                  thead: ({ node, ...props }) => (
                                    <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-800 font-extrabold uppercase tracking-wider text-[11px]" {...props} />
                                  ),
                                  th: ({ node, ...props }) => (
                                    <th className="px-4 py-2.5 border-r border-slate-200 last:border-r-0 font-black" {...props} />
                                  ),
                                  td: ({ node, ...props }) => (
                                    <td className="px-4 py-2.5 border-b border-slate-100 border-r border-slate-100 last:border-r-0 text-slate-800 font-medium" {...props} />
                                  ),
                                  h1: ({ node, ...props }) => (
                                    <h1 className="text-lg font-black text-slate-900 mt-5 mb-2 border-b border-slate-100 pb-1.5" {...props} />
                                  ),
                                  h2: ({ node, ...props }) => (
                                    <h2 className="text-base font-extrabold text-slate-900 mt-4 mb-2 flex items-center gap-2 border-b border-slate-100 pb-1.5" {...props} />
                                  ),
                                  h3: ({ node, ...props }) => (
                                    <h3 className="text-sm font-black text-slate-900 mt-4 mb-2 flex items-center gap-1.5" {...props} />
                                  ),
                                  ul: ({ node, ...props }) => (
                                    <ul className="list-disc pl-5 my-2 space-y-1 text-slate-700" {...props} />
                                  ),
                                  ol: ({ node, ...props }) => (
                                    <ol className="list-decimal pl-5 my-2 space-y-1 text-slate-700" {...props} />
                                  ),
                                  li: ({ node, ...props }) => (
                                    <li className="leading-relaxed" {...props} />
                                  ),
                                  strong: ({ node, ...props }) => (
                                    <strong className="font-extrabold text-slate-900" {...props} />
                                  ),
                                  blockquote: ({ node, ...props }) => (
                                    <blockquote className="border-l-4 border-indigo-500 pl-4 py-1.5 my-3 bg-indigo-50/60 rounded-r-xl italic text-slate-700 text-xs" {...props} />
                                  ),
                                  code: ({ node, className, children, ...props }) => (
                                    <code className="px-1.5 py-0.5 rounded-md bg-slate-100 text-indigo-700 font-mono text-[11px] font-bold" {...props}>
                                      {children}
                                    </code>
                                  ),
                                  hr: ({ node, ...props }) => (
                                    <hr className="my-4 border-slate-200" {...props} />
                                  ),
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>

                        {/* Citations at the End (FR-RES-03) */}
                        {!isUser && msg.citations && msg.citations.length > 0 && (
                          <div className="pt-1">
                            <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              Supporting Document Sources
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.citations.map((c, i) => (
                                <CitationChip
                                  key={i}
                                  citation={c}
                                  onClick={() => setActiveCitation(c)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Timestamp */}
                        <p className="text-[10px] font-bold text-slate-400 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}

                {sending && (
                  <div className="flex justify-start">
                    <div className="px-5 py-4 rounded-2xl rounded-bl-sm bg-white border border-slate-200 shadow-sm flex items-center gap-2.5">
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="h-2 w-2 rounded-full bg-indigo-600"
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-slate-600 ml-1">
                        Synthesizing verified multi-agent research analysis...
                      </span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="px-6 py-4 border-t border-slate-200 flex-shrink-0 bg-white shadow-sm">
            {selectedDoc && (
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                <span className="truncate">
                  Query scoped to: <strong className="font-bold">{selectedDoc.filename}</strong>
                </span>
                <button
                  onClick={() => setSelectedDocId(null)}
                  className="text-indigo-600 hover:text-indigo-900 font-bold ml-2 underline text-[11px]"
                >
                  Switch to All Documents
                </button>
              </div>
            )}

            <div className="flex items-end gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 transition-all shadow-sm">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder={
                  selectedDoc
                    ? `Ask anything about ${selectedDoc.filename}... (Enter to send)`
                    : "Ask a question across all documents... (Enter to send)"
                }
                rows={1}
                className="flex-1 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none resize-none max-h-32 py-1.5"
              />
              <button
                onClick={() => submit()}
                disabled={!input.trim() || sending}
                className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 text-white"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] font-bold text-slate-400 mt-2 text-center">
              Answers are synthesized by AI and grounded in your indexed filings with exact page citations.
            </p>
          </div>
        </div>

        {/* Interactive Citation Preview Modal (FR-RES-03) */}
        <AnimatePresence>
          {activeCitation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
              >
                {/* Modal Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 truncate max-w-xs">
                        {activeCitation.docName}
                      </h4>
                      <p className="text-[11px] font-semibold text-indigo-600">
                        Page {activeCitation.page} • Verified Source Chunk
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveCitation(null)}
                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      Chunk Identifier & Metadata
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[11px]">
                        ID: {activeCitation.chunkId || activeCitation.chunk_id || "chk_indexed"}
                      </span>
                      {activeCitation.section && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px]">
                          Section: {activeCitation.section}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                        Relevance: {Math.round((activeCitation.score || 1.0) * 100)}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      Supporting Evidence Excerpt
                    </p>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-700 font-mono max-h-56 overflow-y-auto whitespace-pre-wrap">
                      "{activeCitation.snippet}"
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                  <button
                    onClick={() => setActiveCitation(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors"
                  >
                    Close Preview
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
