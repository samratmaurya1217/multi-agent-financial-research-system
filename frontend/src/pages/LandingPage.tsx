import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { motion } from "framer-motion";
import {
  BarChart3,
  ShieldAlert,
  Scale,
  FileSearch,
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  Zap,
  Award,
  GitBranch,
  ExternalLink,
  Link2,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

// ─── Feature Cards ────────────────────────────────────────────────────────────
const features = [
  {
    icon: BarChart3,
    title: "Instant Metric Extraction",
    description:
      "Automatically surface revenue, EBITDA, EPS, margins, and 10+ key ratios from complex filings in seconds — no manual parsing needed.",
    color: "from-indigo-500/20 to-indigo-500/5",
    border: "border-indigo-500/20",
    iconColor: "text-indigo-400",
  },
  {
    icon: ShieldAlert,
    title: "Automated Risk Detection",
    description:
      "Uncover rising debt, falling margins, auditor qualifications, and unusual patterns before they become costly liabilities.",
    color: "from-rose-500/20 to-rose-500/5",
    border: "border-rose-500/20",
    iconColor: "text-rose-400",
  },
  {
    icon: Scale,
    title: "Side-by-Side Comparison",
    description:
      "Benchmark any two companies with an intelligent comparative narrative and highlighted performance deltas — across all key metrics.",
    color: "from-violet-500/20 to-violet-500/5",
    border: "border-violet-500/20",
    iconColor: "text-violet-400",
  },
  {
    icon: FileSearch,
    title: "Evidence-Backed Research",
    description:
      "Ask multi-part questions in plain language and get answers with exact citations — document name, page, and quoted snippet — every time.",
    color: "from-amber-500/20 to-amber-500/5",
    border: "border-amber-500/20",
    iconColor: "text-amber-400",
  },
];

// ─── How It Works ─────────────────────────────────────────────────────────────
const steps = [
  {
    step: "01",
    icon: FileText,
    title: "Upload Your Documents",
    description:
      "Upload annual reports, 10-Ks, earnings calls, or use our pre-loaded seed filings to get started instantly.",
  },
  {
    step: "02",
    icon: Zap,
    title: "Automatic Analysis",
    description:
      "Your documents are automatically processed — metrics extracted, risks flagged, and everything indexed for research.",
  },
  {
    step: "03",
    icon: FileSearch,
    title: "Research & Generate Reports",
    description:
      "Ask questions, compare companies, and export a beautifully formatted PDF report — with every claim traced to source.",
  },
];

// ─── Pricing ──────────────────────────────────────────────────────────────────
const plans = [
  {
    name: "Student",
    price: "Free",
    period: "",
    description: "Perfect for finance students and learners exploring financial analysis.",
    features: [
      "3 workspaces",
      "10 documents / month",
      "Basic metric extraction",
      "PDF report export",
      "Community support",
    ],
    highlighted: false,
    cta: "Get Started Free",
  },
  {
    name: "Analyst",
    price: "$29",
    period: "/mo",
    description: "For MBA candidates and early-career analysts who need serious horsepower.",
    features: [
      "Unlimited workspaces",
      "100 documents / month",
      "Full metric extraction + red flags",
      "Multi-company comparison",
      "Citation-backed research chat",
      "Priority support",
    ],
    highlighted: true,
    cta: "Start 14-day Trial",
  },
  {
    name: "Team",
    price: "$99",
    period: "/mo",
    description: "For research teams that need shared workspaces and admin controls.",
    features: [
      "Everything in Analyst",
      "5 team seats",
      "Shared workspaces",
      "Admin dashboard",
      "API access",
      "Dedicated support",
    ],
    highlighted: false,
    cta: "Contact Sales",
  },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: "What document formats are supported?",
    a: "We support PDF, DOCX, and TXT files up to 50 MB. Scanned PDFs are processed with OCR automatically.",
  },
  {
    q: "How accurate are the extracted metrics?",
    a: "Every metric includes an exact citation — document name, page number, and the raw text snippet it was extracted from. You can verify every number in one click.",
  },
  {
    q: "Can I compare more than two companies?",
    a: "Yes. You can select any number of indexed documents within a workspace for side-by-side benchmarking.",
  },
  {
    q: "Is my financial data secure?",
    a: "Absolutely. All data is encrypted in transit (TLS 1.3) and at rest. Documents are isolated per workspace and never shared across accounts.",
  },
  {
    q: "Does it hallucinate or make up information?",
    a: "No. The system is strictly grounded — it only generates insights traceable to your uploaded source documents and explicitly refuses to answer when no relevant source material is found.",
  },
];

// ─── FAQ Item ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        "border border-white/[0.08] rounded-xl overflow-hidden transition-colors",
        open && "border-white/[0.14]"
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left gap-4"
      >
        <span className="text-white/80 font-medium">{q}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-white/40 shrink-0 transition-transform duration-300",
            open && "rotate-180"
          )}
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
        className="overflow-hidden"
      >
        <p className="px-6 pb-4 text-white/40 text-sm leading-relaxed">{a}</p>
      </motion.div>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div className="bg-[#030303] min-h-screen text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#030303]/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-rose-500" />
            <span className="font-semibold text-white tracking-tight">FinSight</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-white/50 hover:text-white transition-colors">Sign In</Link>
            <Link to="/signup" className="px-4 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section id="hero">
        <HeroGeometric
          badge="AI-Powered Financial Research"
          title1="Elevate Your"
          title2="Financial Research"
        />
      </section>

      {/* Features */}
      <section id="features" className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/10 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <span className="inline-block text-xs font-semibold text-indigo-400 tracking-widest uppercase mb-4">
              What You Get
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Research that moves at the
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-rose-300">
                speed of your thinking
              </span>
            </h2>
            <p className="text-white/40 max-w-xl mx-auto text-base md:text-lg">
              Stop manually reading through hundreds of pages. Let every insight surface automatically — cited and verified.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className={cn(
                  "p-6 rounded-2xl border bg-gradient-to-br",
                  f.color,
                  f.border,
                  "hover:scale-[1.02] transition-transform duration-300 cursor-default"
                )}
              >
                <f.icon className={cn("h-7 w-7 mb-4", f.iconColor)} />
                <h3 className="font-semibold text-white text-lg mb-2">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 md:py-32 border-t border-white/[0.06]">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <span className="inline-block text-xs font-semibold text-rose-400 tracking-widest uppercase mb-4">
              How It Works
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              From document to insight
              <br />
              <span className="text-white/40">in three steps</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-[calc(16.6%+1rem)] right-[calc(16.6%+1rem)] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-6">
                  <div className="h-16 w-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                    <s.icon className="h-7 w-7 text-white/60" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-[10px] font-bold text-white/20 bg-white/[0.06] rounded-full px-1.5 py-0.5 border border-white/[0.08]">
                    {s.step}
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{s.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-12 border-y border-white/[0.06] bg-white/[0.01]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 items-center">
            {[
              { icon: Award, label: "Built for Finance Students & Analysts" },
              { icon: ShieldAlert, label: "Zero-Hallucination Policy" },
              { icon: FileSearch, label: "Every Answer Cited to the Source" },
              { icon: Zap, label: "Automatic Pipeline — No Prompting Required" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-white/30 text-sm">
                <item.icon className="h-4 w-4 text-white/20" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <span className="inline-block text-xs font-semibold text-violet-400 tracking-widest uppercase mb-4">
              Pricing
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-white/40 max-w-md mx-auto">
              Start free. Upgrade when you need more power.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className={cn(
                  "rounded-2xl p-6 border relative",
                  plan.highlighted
                    ? "border-indigo-500/50 bg-gradient-to-b from-indigo-950/50 to-transparent"
                    : "border-white/[0.08] bg-white/[0.02]"
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-[11px] font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full text-white">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="font-semibold text-white mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1 mb-3">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-white/40 text-sm mb-1">{plan.period}</span>}
                </div>
                <p className="text-white/40 text-sm mb-6 leading-relaxed">{plan.description}</p>
                <Link
                  to="/signup"
                  className={cn(
                    "w-full flex justify-center py-2.5 rounded-full font-semibold text-sm mb-6 transition-all",
                    plan.highlighted
                      ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-90"
                      : "border border-white/[0.12] text-white/60 hover:text-white hover:border-white/30"
                  )}
                >
                  {plan.cta}
                </Link>
                <ul className="space-y-2.5">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm text-white/50">
                      <Check className="h-4 w-4 text-indigo-400 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 md:py-32 border-t border-white/[0.06]">
        <div className="container mx-auto px-4 md:px-6 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <span className="inline-block text-xs font-semibold text-amber-400 tracking-widest uppercase mb-4">
              FAQ
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Common questions
            </h2>
          </motion.div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} {...faq} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 relative overflow-hidden border-t border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-transparent to-rose-950/20 pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
              Ready to research smarter?
            </h2>
            <p className="text-white/40 mb-10 max-w-md mx-auto text-lg">
              Upload your first document and get cited insights in seconds.
            </p>
            <Link to="/signup" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-indigo-500 to-rose-500 text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-xl shadow-indigo-500/20">
              Start for Free <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-md bg-gradient-to-br from-indigo-500 to-rose-500" />
              <span className="font-semibold text-white text-sm tracking-tight">FinSight</span>
            </div>
            <p className="text-white/20 text-sm text-center">
              © {new Date().getFullYear()} FinSight. Built for finance students, MBA candidates & analysts.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-white/30 hover:text-white/60 transition-colors">
                <GitBranch className="h-4 w-4" />
              </a>
              <a href="#" className="text-white/30 hover:text-white/60 transition-colors">
                <ExternalLink className="h-4 w-4" />
              </a>
              <a href="#" className="text-white/30 hover:text-white/60 transition-colors">
                <Link2 className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
