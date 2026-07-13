import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-xl bg-white/[0.04] animate-pulse", className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] space-y-3", className)}>
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-4 border-t border-white/[0.04]">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}
