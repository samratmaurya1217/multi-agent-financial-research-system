import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "processing";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:    "bg-white/[0.06] text-white/60 border-white/[0.08]",
  success:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  warning:    "bg-amber-500/15 text-amber-400 border-amber-500/20",
  error:      "bg-rose-500/15 text-rose-400 border-rose-500/20",
  info:       "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  processing: "bg-violet-500/15 text-violet-400 border-violet-500/20",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border", variantStyles[variant], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    ready: "success", processing: "processing", uploading: "info",
    error: "error", active: "success", archived: "default", generating: "processing",
  };
  return <Badge variant={map[status] ?? "default"}>{status}</Badge>;
}
