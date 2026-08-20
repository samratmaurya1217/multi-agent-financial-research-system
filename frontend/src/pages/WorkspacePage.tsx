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
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white border border-slate-100 rounded-3xl p-6 w-full max-w-md z-10 shadow-2xl">
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-3">
          <h2 className="text-lg font-extrabold text-slate-800">New Workspace</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Workspace Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Annual Filings Analysis" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Describe the focus or companies in this workspace..." className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium resize-none" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50">
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
            <div className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-2">
              <FolderOpen className="h-4 w-4" /><span>Workspaces</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-1">Your Workspaces</h1>
            <p className="text-slate-500 font-medium text-sm">Organize your financial research into dedicated workspaces.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
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
                className="p-6 rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-slate-200 hover:-translate-y-1 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <FolderOpen className="h-6 w-6 text-indigo-500" />
                  </div>
                  <StatusBadge status={ws.status} />
                </div>
                <h3 className="text-slate-800 font-bold text-lg mb-1 truncate">{ws.name}</h3>
                <p className="text-slate-500 font-medium text-sm mb-6 line-clamp-2">{ws.description}</p>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" />{ws.documentCount} docs</span>
                  <span className="flex items-center gap-1.5"><MessageSquare className="h-4 w-4" />{ws.sessionCount} sessions</span>
                  {ws.status === "archived" && <Archive className="h-4 w-4" />}
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
