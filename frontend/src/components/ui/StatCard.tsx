import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  iconColor?: string;
  iconBg?: string;
}

export function StatCard({ title, value, icon: Icon, trend, iconColor = "text-indigo-400", iconBg = "bg-indigo-500/10" }: StatCardProps) {
  const TrendIcon = trend ? (trend.value > 0 ? TrendingUp : trend.value < 0 ? TrendingDown : Minus) : null;
  const trendColor = trend ? (trend.value > 0 ? "text-emerald-400" : trend.value < 0 ? "text-rose-400" : "text-white/40") : "";

  return (
    <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        {TrendIcon && trend && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
            <TrendIcon className="h-3.5 w-3.5" />
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-white/40">{title}</p>
      {trend && <p className="text-xs text-white/25 mt-0.5">{trend.label}</p>}
    </div>
  );
}
