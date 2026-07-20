import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { getWorkspaces, createWorkspace, type Workspace } from "@/services/workspace";
import { FolderOpen, Plus, FileText, MessageSquare, X, Archive } from "lucide-react";

function CreateWorkspaceModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, desc: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onCreate(name, desc);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-[#0a0a0f] border border-white/[0.10] rounded-2xl p-6 w-full max-w-md z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">New Workspace</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Apple Inc. Analysis" className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/60 transition-all text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Describe the purpose of this workspace..." className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/60 transition-all text-sm resize-none" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-full bg-gradient-to-r from-indigo-500 to-rose-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? "Creating..." : "Create Workspace"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getWorkspaces().then((ws) => { setWorkspaces(ws); setLoading(false); });
  }, []);

  const handleCreate = async (name: string, description: string) => {
    const ws = await createWorkspace({ name, description });
    setWorkspaces((prev) => [ws, ...prev]);
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-white/30 text-sm mb-2">
              <FolderOpen className="h-4 w-4" /><span>Workspaces</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Your Workspaces</h1>
            <p className="text-white/40 text-sm">Organize your financial research into dedicated workspaces.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-rose-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20">
            <Plus className="h-4 w-4" /> New Workspace
          </button>
        </motion.div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : workspaces.length === 0 ? (
          <EmptyState icon={FolderOpen} title="No workspaces yet" description="Create your first workspace to start organizing your financial research." action={{ label: "Create Workspace", onClick: () => setShowCreate(true) }} />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {workspaces.map((ws, i) => (
              <motion.div key={ws.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                onClick={() => navigate(`/workspaces/${ws.id}`)}
                className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] hover:scale-[1.02] transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <FolderOpen className="h-5 w-5 text-indigo-400" />
                  </div>
                  <StatusBadge status={ws.status} />
                </div>
                <h3 className="text-white font-semibold mb-1 truncate">{ws.name}</h3>
                <p className="text-white/40 text-sm mb-4 line-clamp-2">{ws.description}</p>
                <div className="flex items-center gap-4 text-xs text-white/30">
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{ws.documentCount} docs</span>
                  <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{ws.sessionCount} sessions</span>
                  {ws.status === "archived" && <Archive className="h-3 w-3" />}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateWorkspaceModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </DashboardLayout>
  );
}
