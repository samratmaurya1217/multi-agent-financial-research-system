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
          <div className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-2"><GitCompare className="h-4 w-4" /><span>Comparison</span></div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-1">Side-by-Side Comparison</h1>
          <p className="text-slate-500 font-medium text-sm">Compare key financial metrics across companies in your workspace.</p>
        </motion.div>

        {/* Company selector */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-3 mb-8">
          {companies.map((c, i) => (
            <button key={c} onClick={() => toggle(i)} className={cn("px-4 py-2 rounded-full text-sm font-bold transition-all border", selected.includes(i) ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 shadow-sm")}>
              {c}
            </button>
          ))}
        </motion.div>

        {/* Metrics table */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-3xl border border-slate-200 bg-white overflow-hidden mb-6 shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Metric</th>
                {companies.filter((_, i) => selected.includes(i)).map((c) => (
                  <th key={c} className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">{c.split(" ")[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, ri) => (
                <motion.tr key={m.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ri * 0.03 }} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600 font-bold">{m.label}</td>
                  {companies.map((_, ci) => {
                    if (!selected.includes(ci)) return null;
                    const isBest = m.best === ci;
                    const isWorst = m.worst === ci;
                    return (
                      <td key={ci} className={cn("px-6 py-4 text-right text-sm font-extrabold", isBest ? "text-emerald-600" : isWorst ? "text-rose-600" : "text-slate-800")}>
                        <span className="flex items-center justify-end gap-1.5">
                          {m.values[ci]}
                          {isBest ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : isWorst ? <TrendingDown className="h-4 w-4 text-rose-500" /> : <Minus className="h-4 w-4 text-slate-300" />}
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="p-6 md:p-8 rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <GitCompare className="h-5 w-5 text-indigo-500" />
            </div>
            <h3 className="text-slate-800 font-bold text-lg">Comparative Analysis</h3>
            <span className="ml-auto text-xs font-bold text-slate-400 px-3 py-1 rounded-full border border-slate-100 bg-slate-50">AI-generated</span>
          </div>
          <div className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-line">{narrative}</div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
