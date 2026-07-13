import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { CitationChip } from "@/components/CitationChip";
import { getMessages, sendMessage, type ChatMessage } from "@/services/research";
import { MessageSquare, Send, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTED = [
  "What was the total revenue in the latest fiscal year?",
  "What are the main risk factors mentioned?",
  "How has operating margin trended over the past 3 years?",
  "Are there any going concern warnings?",
];

const MOCK_DOCS = [
  { id: "doc_01", name: "AAPL_10K_FY2024.pdf", pages: 128 },
  { id: "doc_02", name: "AAPL_Q3_2024_Earnings.pdf", pages: 32 },
];

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMessages("sess_01").then((msgs) => { setMessages(msgs); setLoading(false); });
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const submit = async (text?: string) => {
    const content = text ?? input;
    if (!content.trim() || sending) return;
    setInput("");
    const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: "user", content, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    const reply = await sendMessage("sess_01", content);
    setMessages((prev) => [...prev, reply]);
    setSending(false);
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
              className="flex-shrink-0 border-r border-white/[0.06] bg-[#050505] overflow-hidden flex flex-col"
            >
              <div className="px-4 py-4 border-b border-white/[0.06]">
                <p className="text-xs font-bold text-white/20 uppercase tracking-widest mb-3">Source Documents</p>
                <div className="space-y-2">
                  {MOCK_DOCS.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <FileText className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-white/70 truncate">{doc.name}</p>
                        <p className="text-xs text-white/30">{doc.pages} pages</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-4 py-4">
                <p className="text-xs font-bold text-white/20 uppercase tracking-widest mb-3">Session</p>
                <p className="text-sm text-white/40">AAPL Revenue Analysis</p>
                <p className="text-xs text-white/25 mt-1">{messages.length} messages</p>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="h-14 border-b border-white/[0.06] flex items-center px-4 gap-3 flex-shrink-0">
            <button onClick={() => setSourcesOpen((v) => !v)} className="h-8 w-8 rounded-lg border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors">
              {sourcesOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">AAPL Revenue Analysis</p>
              <p className="text-xs text-white/30">2 source documents indexed</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} className="h-2 w-2 rounded-full bg-indigo-500/60" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                      <MessageSquare className="h-7 w-7 text-indigo-400" />
                    </div>
                    <h3 className="text-white font-semibold mb-2">Ask anything about your documents</h3>
                    <p className="text-white/40 text-sm mb-6 max-w-md">Every answer is grounded in your source documents with exact citations.</p>
                    <div className="grid sm:grid-cols-2 gap-2 max-w-lg w-full">
                      {SUGGESTED.map((q) => (
                        <button key={q} onClick={() => submit(q)} className="text-left px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] text-sm text-white/60 hover:text-white transition-all">{q}</button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[75%] space-y-2", msg.role === "user" ? "items-end flex flex-col" : "")}>
                      <div className={cn("px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line",
                        msg.role === "user"
                          ? "bg-indigo-500/20 border border-indigo-500/30 text-white rounded-br-sm"
                          : "bg-white/[0.04] border border-white/[0.08] text-white/80 rounded-bl-sm"
                      )}>
                        {msg.content}
                      </div>
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((c, i) => <CitationChip key={i} citation={c} />)}
                        </div>
                      )}
                      <p className="text-xs text-white/20 px-1">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </motion.div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white/[0.04] border border-white/[0.08] flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div key={i} className="h-1.5 w-1.5 rounded-full bg-white/40" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="px-6 py-4 border-t border-white/[0.06] flex-shrink-0">
            <div className="flex items-end gap-3 p-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] focus-within:border-indigo-500/40 transition-colors">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                placeholder="Ask a question about your documents... (Enter to send)"
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none resize-none max-h-32"
              />
              <button
                onClick={() => submit()}
                disabled={!input.trim() || sending}
                className="h-9 w-9 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
            <p className="text-xs text-white/20 mt-2 text-center">Answers are grounded in your documents. Every claim includes a source citation.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
