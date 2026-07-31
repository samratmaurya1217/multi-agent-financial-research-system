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
  const trendColor = trend ? (trend.value > 0 ? "text-emerald-500" : trend.value < 0 ? "text-rose-500" : "text-slate-400") : "";

  return (
    <div className="p-5 rounded-3xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", iconBg)}>
          <Icon className={cn("h-6 w-6", iconColor)} />
        </div>
        {TrendIcon && trend && (
          <div className={cn("flex items-center gap-1 text-xs font-bold", trendColor)}>
            <TrendIcon className="h-3.5 w-3.5" />
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <p className="text-3xl font-extrabold text-slate-800 tracking-tight mb-1">{value}</p>
      <p className="text-sm font-bold text-slate-500">{title}</p>
      {trend && <p className="text-xs font-bold text-slate-400 mt-1">{trend.label}</p>}
    </div>
  );
}
