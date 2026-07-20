import { useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { GitCompare, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const companies = ["Apple Inc. (AAPL)", "Tesla, Inc. (TSLA)", "Microsoft Corp. (MSFT)"];

const metrics = [
  { label: "Total Revenue", values: ["$391.0B", "$97.7B", "$245.1B"], best: 0, worst: 1 },
  { label: "Gross Margin", values: ["46.2%", "17.9%", "69.8%"], best: 2, worst: 1 },
  { label: "Net Income", values: ["$93.7B", "$15.0B", "$88.1B"], best: 0, worst: 1 },
  { label: "Operating Margin", values: ["31.5%", "9.2%", "44.6%"], best: 2, worst: 1 },
  { label: "Revenue YoY Growth", values: ["+2.0%", "+18.8%", "+15.7%"], best: 1, worst: 0 },
  { label: "Debt-to-Equity", values: ["1.87", "0.08", "0.35"], best: 1, worst: 0 },
  { label: "Current Ratio", values: ["1.07", "1.84", "1.75"], best: 1, worst: 0 },
  { label: "EPS (Diluted)", values: ["$6.11", "$4.73", "$11.80"], best: 2, worst: 1 },
  { label: "Free Cash Flow", values: ["$108.8B", "$2.7B", "$75.0B"], best: 0, worst: 1 },
  { label: "R&D Spend", values: ["$31.4B", "$3.1B", "$27.2B"], best: 0, worst: 1 },
];

const narrative = `**Apple** leads on absolute scale — $391B revenue, $93.7B net income, and exceptional free cash flow of $108.8B. However, its revenue growth (+2.0%) is the slowest of the three, reflecting maturity in its core hardware segment.\n\n**Tesla** shows the strongest revenue growth (+18.8%) but suffers from compressed margins (gross: 17.9%, operating: 9.2%), raising concerns about long-term profitability as EV competition intensifies. Its low debt burden is a structural positive.\n\n**Microsoft** demonstrates the best overall risk-adjusted quality — 69.8% gross margin, 44.6% operating margin, and strong growth (+15.7%), driven by its cloud segment. Its EPS of $11.80 and free cash flow profile make it the most capital-efficient of the three.`;

export function ComparisonPage() {
  const [selected, setSelected] = useState<number[]>([0, 1, 2]);

  const toggle = (i: number) => setSelected((prev) => prev.includes(i) ? (prev.length > 2 ? prev.filter((x) => x !== i) : prev) : [...prev, i]);

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 text-white/30 text-sm mb-2"><GitCompare className="h-4 w-4" /><span>Comparison</span></div>
          <h1 className="text-2xl font-bold text-white mb-1">Side-by-Side Comparison</h1>
          <p className="text-white/40 text-sm">Compare key financial metrics across companies in your workspace.</p>
        </motion.div>

        {/* Company selector */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-3 mb-8">
          {companies.map((c, i) => (
            <button key={c} onClick={() => toggle(i)} className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all border", selected.includes(i) ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "border-white/[0.08] text-white/40 hover:text-white hover:border-white/20")}>
              {c}
            </button>
          ))}
        </motion.div>

        {/* Metrics table */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-white/[0.08] overflow-hidden mb-6">
          <table className="w-full">
            <thead className="bg-white/[0.03]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Metric</th>
                {companies.filter((_, i) => selected.includes(i)).map((c) => (
                  <th key={c} className="px-6 py-3 text-right text-xs font-semibold text-white/40 uppercase tracking-wider">{c.split(" ")[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, ri) => (
                <motion.tr key={m.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ri * 0.03 }} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-3.5 text-sm text-white/60 font-medium">{m.label}</td>
                  {companies.map((_, ci) => {
                    if (!selected.includes(ci)) return null;
                    const isBest = m.best === ci;
                    const isWorst = m.worst === ci;
                    return (
                      <td key={ci} className={cn("px-6 py-3.5 text-right text-sm font-semibold", isBest ? "text-emerald-400" : isWorst ? "text-rose-400" : "text-white")}>
                        <span className="flex items-center justify-end gap-1.5">
                          {m.values[ci]}
                          {isBest ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400/60" /> : isWorst ? <TrendingDown className="h-3.5 w-3.5 text-rose-400/60" /> : <Minus className="h-3.5 w-3.5 text-white/20" />}
                        </span>
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Narrative */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <GitCompare className="h-4 w-4 text-indigo-400" />
            </div>
            <h3 className="text-white font-semibold">Comparative Analysis</h3>
            <span className="ml-auto text-xs text-white/30 px-2 py-0.5 rounded-full border border-white/[0.06] bg-white/[0.03]">AI-generated · Cite-verified</span>
          </div>
          <div className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{narrative}</div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
