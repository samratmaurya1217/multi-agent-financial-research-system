import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-white/20" />
      </div>
      <h3 className="text-white/60 font-medium mb-1">{title}</h3>
      <p className="text-white/30 text-sm max-w-xs">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-5 py-2 rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-medium hover:bg-indigo-500/30 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
