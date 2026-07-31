import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, CheckCircle2, Shield, Zap, Sparkles, TrendingUp, 
  BarChart2, Lock, FileText, Search, ChevronDown, ChevronRight, Star, 
  AlertTriangle, Layers, Building2
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('after');
  const [activeStep, setActiveStep] = useState<number>(1);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-cycle step tabs every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev % 3) + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "How accurate is the financial data extraction?",
      a: "Velsora operates under a strict Zero-Hallucination policy. Every extracted metric, financial ratio, and qualitative statement is cross-referenced and linked directly to the exact page and paragraph of your uploaded filing."
    },
    {
      q: "What types of financial documents can I upload?",
      a: "You can upload annual reports, 10-K filings, 10-Q quarterly reports, earnings call transcripts, investor presentations, and audit reports in PDF format."
    },
    {
      q: "How does the automated risk detection work?",
      a: "Our specialized Red Flag Agent automatically audits footnotes, auditor qualifications, related-party transactions, debt covenant changes, and unusual accounting policy shifts before they become costly liabilities."
    },
    {
      q: "Is my financial research and data secure?",
      a: "Yes. We employ bank-level encryption (AES-256) at rest and in transit. Your uploaded documents and research sessions are strictly isolated in your workspace and are never used to train public AI models."
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans selection:bg-blue-500 selection:text-white overflow-x-hidden">
      
      {/* ─── FLOATING PILL NAVBAR ─────────────────────────────────────────── */}
      <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav className={`pointer-events-auto glass-pill-nav-light px-6 py-3 rounded-full flex items-center justify-between gap-8 max-w-4xl w-full transition-all duration-300 ${scrolled ? 'shadow-xl bg-white/80 border-white/90' : 'bg-white/60 border-white/75'}`}>
          <Link to="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-[#0f172a]">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
              <BarChart2 className="w-5 h-5" />
            </div>
            <span>Velsora</span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-[#334155]">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How it works</a>
            <a href="#use-cases" className="hover:text-blue-600 transition-colors">Use Cases</a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-[#334155] hover:text-[#0f172a] px-3 py-1.5 hidden sm:block">
              Sign In
            </Link>
            <Link 
              to="/signup" 
              className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-5 py-2 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm transition-all hover:scale-105"
            >
              <span>Try it free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </nav>
      </header>

      {/* ─── HERO SECTION (SKY & CLOUDS WITH GRASS HILLS) ─────────────────── */}
      <section className="sky-hero-bg pt-36 pb-32 md:pt-44 md:pb-48 px-4 text-center relative min-h-[92vh] flex flex-col items-center justify-start">
        <div className="sky-clouds absolute inset-0 pointer-events-none opacity-90" />
        
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-blue-200/60 shadow-sm text-blue-700 font-semibold text-xs md:text-sm mb-8 animate-fade-up">
            <Sparkles className="w-4 h-4 text-blue-500 animate-spin" />
            <span>AI-Powered Financial Research Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#0f172a] max-w-4xl leading-[1.1] mb-6">
            Financial <span className="badge-ai"><Sparkles className="w-7 h-7 text-cyan-400 animate-pulse shrink-0" /><span>AI</span></span> Research
          </h1>

          <p className="text-lg md:text-xl text-[#475569] max-w-2xl mx-auto mb-10 font-normal leading-relaxed">
            Analyze annual reports, extract key metrics, detect risk signals, and generate cited research — all powered by autonomous multi-agent AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14 w-full sm:w-auto">
            <Link to="/signup" className="btn-fintechx-blue w-full sm:w-auto justify-center text-base py-3.5 px-8 shadow-blue-500/25">
              <span>Get started now</span>
              <div className="w-6 h-6 rounded-full bg-white text-blue-600 flex items-center justify-center ml-1">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
            <a href="#how-it-works" className="btn-fintechx-light w-full sm:w-auto justify-center text-base py-3.5 px-8">
              <span>View demo</span>
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-xs md:text-sm font-semibold text-[#334155] mb-16">
            <div className="flex items-center gap-2 bg-white/60 px-3.5 py-1.5 rounded-full border border-white/80 shadow-2xs">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>4.9/5 Analyst Rating</span>
            </div>
            <div className="flex items-center gap-2 bg-white/60 px-3.5 py-1.5 rounded-full border border-white/80 shadow-2xs">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Bank-level encryption</span>
            </div>
            <div className="flex items-center gap-2 bg-white/60 px-3.5 py-1.5 rounded-full border border-white/80 shadow-2xs">
              <Zap className="w-4 h-4 text-blue-600" />
              <span>Zero-Hallucination policy</span>
            </div>
          </div>

          {/* ─── DASHBOARD PREVIEW CARD IN HERO ───────────────────────────── */}
          <div className="w-full max-w-5xl relative mt-4 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition duration-500" />
            
            <div className="fintechx-card-dark p-3 sm:p-6 text-left relative z-10 shadow-2xl border border-white/15 overflow-hidden">
              
              {/* App Chrome Bar */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs text-slate-400 font-mono ml-2">velsora.ai/command-center</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live Analysis
                  </span>
                </div>
              </div>

              {/* Mock Dashboard Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Left Mini Nav */}
                <div className="hidden lg:flex flex-col gap-2 border-r border-white/10 pr-4 text-xs font-medium text-slate-400">
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white font-semibold flex items-center gap-2.5 shadow-md">
                    <BarChart2 className="w-4 h-4" />
                    <span>Command Center</span>
                  </div>
                  <div className="p-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5 transition-colors">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>Filings & 10-Ks</span>
                  </div>
                  <div className="p-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5 transition-colors">
                    <Search className="w-4 h-4 text-slate-400" />
                    <span>Deep Research</span>
                  </div>
                  <div className="p-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5 transition-colors">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Risk Audit Logs</span>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-3 flex flex-col gap-6">
                  
                  {/* Top Stats Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span>Extracted Metrics</span>
                        <span className="text-emerald-400 font-semibold">+100% Verified</span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">1,420</div>
                      <div className="text-[11px] text-slate-500 mt-1">From FY2025 Annual Reports</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span>Red Flag Score</span>
                        <span className="text-amber-400 font-semibold">Low Risk</span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">18 <span className="text-sm font-normal text-slate-400">/ 100</span></div>
                      <div className="text-[11px] text-slate-500 mt-1">Auditor notes audited</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 col-span-2 sm:col-span-1 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span>Analysis Time</span>
                        <span className="text-cyan-400 font-semibold">90x Faster</span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">4.2 <span className="text-sm font-normal text-slate-400">sec</span></div>
                      <div className="text-[11px] text-slate-500 mt-1">Multi-agent pipeline</div>
                    </div>
                  </div>

                  {/* Visual Chart / Insight Row */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-white">Revenue vs EBITDA Trend Analysis</div>
                        <div className="text-xs text-slate-400">Automated extraction with direct citation links</div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold border border-blue-500/30">
                        Zero Hallucinations
                      </span>
                    </div>

                    {/* Simulated visual graph line */}
                    <div className="h-28 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-white/10">
                      {[35, 45, 40, 60, 55, 75, 70, 85, 80, 95].map((val, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <div 
                            style={{ height: `${val}%` }} 
                            className="w-full max-w-[24px] rounded-t-sm bg-gradient-to-t from-blue-600 to-cyan-400 transition-all hover:brightness-125"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>Q1 '23</span><span>Q2 '23</span><span>Q3 '23</span><span>Q4 '23</span>
                      <span>Q1 '24</span><span>Q2 '24</span><span>Q3 '24</span><span>Q4 '24</span>
                      <span>Q1 '25</span><span>Q2 '25</span>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>

        </div>

        {/* Rolling Grassy Hills Overlay at Bottom of Hero */}
        <div className="grass-hills-bottom" />
      </section>

      {/* ─── BEFORE / AFTER INTERACTIVE SHOWCASE ──────────────────────────── */}
      <section className="py-24 px-4 max-w-6xl mx-auto text-center relative z-20">
        <div className="inline-block px-4 py-1.5 rounded-full bg-slate-200/80 text-slate-700 font-semibold text-xs mb-4">
          Why Velsora
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold text-[#0f172a] tracking-tight mb-4">
          Smarter decisions start with clear data
        </h2>
        <p className="text-[#475569] text-base md:text-lg max-w-2xl mx-auto mb-12">
          See how autonomous multi-agent AI transforms manual 10-K reading into verified, actionable financial intelligence.
        </p>

        {/* Dial / Toggle Switch */}
        <div className="flex items-center justify-center gap-4 mb-14">
          <button 
            onClick={() => setActiveTab('before')}
            className={`text-base font-bold transition-colors ${activeTab === 'before' ? 'text-[#0f172a]' : 'text-[#94a3b8]'}`}
          >
            Before Velsora
          </button>
          
          <button 
            onClick={() => setActiveTab(activeTab === 'before' ? 'after' : 'before')}
            className="w-20 h-10 rounded-full bg-slate-900 p-1 flex items-center relative transition-all shadow-md"
          >
            <div className={`w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-lg transition-transform duration-300 ${activeTab === 'after' ? 'translate-x-10' : 'translate-x-0'}`}>
              <Sparkles className="w-4 h-4" />
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('after')}
            className={`text-base font-bold transition-colors ${activeTab === 'after' ? 'text-blue-600' : 'text-[#94a3b8]'}`}
          >
            After Velsora
          </button>
        </div>

        {/* Dynamic Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {activeTab === 'before' ? (
            <>
              <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col gap-4 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-xl">1</div>
                <h3 className="text-xl font-bold text-[#0f172a]">10+ Hours Per Filing</h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  Manually reading through 300-page annual reports and footnotes to find key EBITDA adjustments and covenant terms.
                </p>
                <div className="mt-auto pt-4 border-t border-slate-100 text-xs text-red-500 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> High manual fatigue & error rate
                </div>
              </div>

              <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col gap-4 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xl">2</div>
                <h3 className="text-xl font-bold text-[#0f172a]">Buried Risk Signals</h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  Crucial warning signs like auditor qualifications or related-party transactions easily overlooked in dense legal disclosures.
                </p>
                <div className="mt-auto pt-4 border-t border-slate-100 text-xs text-amber-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Missed red flags lead to losses
                </div>
              </div>

              <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col gap-4 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xl">3</div>
                <h3 className="text-xl font-bold text-[#0f172a]">Unverified AI Answers</h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  Standard LLMs hallucinate numbers and make up financial ratios without exact proof or audit trails.
                </p>
                <div className="mt-auto pt-4 border-t border-slate-100 text-xs text-slate-500 font-semibold flex items-center gap-1">
                  <Lock className="w-4 h-4" /> Unusable for formal compliance
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-900 to-slate-900 text-white shadow-xl flex flex-col gap-4 transition-all border border-blue-500/30 transform hover:-translate-y-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-cyan-400 border border-blue-400/30 flex items-center justify-center font-bold text-xl">⚡</div>
                <h3 className="text-xl font-bold text-white">90x Faster Extraction</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Autonomous agents process complex tables and narrative text in seconds, extracting 10+ core financial ratios instantly.
                </p>
                <div className="mt-auto pt-4 border-t border-white/10 text-xs text-cyan-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Results in under 10 seconds
                </div>
              </div>

              <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-[#08080d] text-white shadow-xl flex flex-col gap-4 transition-all border border-emerald-500/30 transform hover:-translate-y-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center font-bold text-xl">🛡️</div>
                <h3 className="text-xl font-bold text-white">Automated Risk Audit</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Specialized Red Flag Agent scores filings 0–100, highlighting debt covenants, going concern warnings, and litigation.
                </p>
                <div className="mt-auto pt-4 border-t border-white/10 text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Proactive risk mitigation
                </div>
              </div>

              <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-blue-950 text-white shadow-xl flex flex-col gap-4 transition-all border border-cyan-500/30 transform hover:-translate-y-1">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center font-bold text-xl">🎯</div>
                <h3 className="text-xl font-bold text-white">100% Grounded Citations</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Zero hallucinations. Click any generated claim or number to jump directly to the exact source page and paragraph in the PDF.
                </p>
                <div className="mt-auto pt-4 border-t border-white/10 text-xs text-cyan-300 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Institutional-grade reliability
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ─── CORE FEATURES SECTION ────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4 max-w-6xl mx-auto text-center">
        <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs mb-4">
          Core features
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold text-[#0f172a] tracking-tight mb-4">
          Everything you need to invest & analyze confidently
        </h2>
        <p className="text-[#475569] text-base md:text-lg max-w-2xl mx-auto mb-16">
          Professional tools designed for active analysts, portfolio managers, and research teams managing complex diligence.
        </p>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          
          {/* Card 1: Risk Analysis (Light Card) */}
          <div className="fintechx-card-light p-8 flex flex-col justify-between border border-slate-200/80 shadow-md">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 shadow-xs">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-[#0f172a] mb-3">Advanced risk analysis</h3>
              <p className="text-[#475569] text-sm leading-relaxed mb-6">
                Automatically surface debt maturity walls, auditor changes, revenue recognition shifts, and contingent liabilities before they impact valuation.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-4 border-t border-slate-200/60">
              <span className="badge-pill-light">Predictive alerts</span>
              <span className="badge-pill-light">0-100 Risk Score</span>
            </div>
          </div>

          {/* Card 2: Market & Metric Insights (Sky/Grass theme card) */}
          <div className="rounded-3xl bg-gradient-to-b from-blue-100/60 to-emerald-100/60 p-8 flex flex-col justify-between border border-blue-200/60 shadow-md relative overflow-hidden group">
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mb-6 shadow-md shadow-emerald-500/30">
                <BarChart2 className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-[#0f172a] mb-3">Instant Metric Extraction</h3>
              <p className="text-[#475569] text-sm leading-relaxed mb-6">
                Extract Revenue, EBITDA, Free Cash Flow, Operating Margins, and EPS directly into structured comparison tables.
              </p>
            </div>
            
            {/* Mini floating pill graphic */}
            <div className="relative z-10 pt-4 border-t border-emerald-200/60 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-200/80 px-3 py-1 rounded-full">
                Live FY25 Extraction
              </span>
              <span className="text-xs font-bold text-blue-700">+99.8% Accuracy</span>
            </div>
          </div>

          {/* Card 3: AI-powered Insights (Dark FintechX Card) */}
          <div className="fintechx-card-dark p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-cyan-400 flex items-center justify-center mb-6 border border-white/15">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">AI-powered insights</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Ask complex questions across dozens of filings simultaneously. Receive instant, synthesized answers backed by clickable citations.
              </p>
            </div>
            
            {/* Bold graphic */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 tracking-wider">
                VERIFIED
              </span>
              <span className="text-xs text-slate-400 font-mono">Page 42, Para 3</span>
            </div>
          </div>

        </div>
      </section>

      {/* ─── HOW IT WORKS (STEP 01 / 02 / 03) ─────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4 bg-white border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-xs mb-4">
              Platform workflow
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-[#0f172a] tracking-tight mb-4">
              Research that moves at the speed of thought
            </h2>
            <p className="text-[#475569] text-base md:text-lg">
              Stop manually reading through hundreds of pages. Let autonomous agents extract, verify, and summarize in 3 simple steps.
            </p>
          </div>

          {/* Interactive Step Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {[
              { step: 1, title: "Step 01: Upload Filings", desc: "Securely upload PDF annual reports, 10-Ks, and transcripts." },
              { step: 2, title: "Step 02: Multi-Agent Audit", desc: "AI pipeline extracts metrics and detects hidden risk flags." },
              { step: 3, title: "Step 03: Grounded Insights", desc: "Receive cited research reports and chat interactively." }
            ].map((item) => (
              <button
                key={item.step}
                onClick={() => setActiveStep(item.step)}
                className={`p-6 rounded-2xl text-left transition-all border flex flex-col justify-between cursor-pointer ${
                  activeStep === item.step 
                    ? 'bg-[#0f172a] text-white border-slate-900 shadow-xl scale-[1.02]' 
                    : 'bg-[#f8fafc] text-[#0f172a] border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${activeStep === item.step ? 'text-cyan-400' : 'text-blue-600'}`}>
                    {item.title.split(':')[0]}
                  </div>
                  <div className="text-lg font-bold mb-2">{item.title.split(':')[1]}</div>
                  <div className={`text-sm leading-relaxed ${activeStep === item.step ? 'text-slate-300' : 'text-[#475569]'}`}>
                    {item.desc}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between pt-4 border-t border-current/10">
                  <span className="text-xs font-semibold">View capabilities</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>

          {/* Step Showcase Card */}
          <div className="p-8 sm:p-12 rounded-3xl bg-[#f8fafc] border border-slate-200/80 shadow-sm min-h-[320px] flex items-center justify-center">
            {activeStep === 1 && (
              <div className="max-w-3xl w-full flex flex-col md:flex-row items-center gap-8 animate-fade-up">
                <div className="w-24 h-24 rounded-3xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
                  <FileText className="w-12 h-12" />
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-bold text-[#0f172a] mb-2">Instant Document Ingestion & Indexing</h3>
                  <p className="text-[#475569] leading-relaxed mb-4">
                    Drop your 10-K, annual report, or audit PDF into your isolated workspace. Our high-speed ingestion engine parses tables, footnotes, and multi-column layouts without losing formatting context.
                  </p>
                  <div className="flex items-center gap-4 text-xs font-bold text-blue-700">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Multi-document workspaces</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Table structure preserved</span>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="max-w-3xl w-full flex flex-col md:flex-row items-center gap-8 animate-fade-up">
                <div className="w-24 h-24 rounded-3xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                  <Layers className="w-12 h-12" />
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-bold text-[#0f172a] mb-2">Autonomous Multi-Agent Pipeline</h3>
                  <p className="text-[#475569] leading-relaxed mb-4">
                    Once indexed, specialized AI agents get to work. The Extraction Agent pulls revenue and EBITDA ratios, while the Red Flag Agent scans footnotes for debt covenant breaches and accounting changes.
                  </p>
                  <div className="flex items-center gap-4 text-xs font-bold text-emerald-700">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Autonomous collaboration</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Deep footnote auditing</span>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="max-w-3xl w-full flex flex-col md:flex-row items-center gap-8 animate-fade-up">
                <div className="w-24 h-24 rounded-3xl bg-slate-900 text-cyan-400 flex items-center justify-center shrink-0 shadow-lg shadow-slate-900/40">
                  <Sparkles className="w-12 h-12" />
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-bold text-[#0f172a] mb-2">100% Citation-Backed Answers</h3>
                  <p className="text-[#475569] leading-relaxed mb-4">
                    Ask any financial question in natural language or export automated diligence reports. Every single insight includes clickable badge links taking you directly to the source paragraph.
                  </p>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Zero hallucinations</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Clickable PDF proof</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ─── USE CASES SECTION ────────────────────────────────────────────── */}
      <section id="use-cases" className="py-24 px-4 max-w-6xl mx-auto text-center">
        <div className="inline-block px-4 py-1.5 rounded-full bg-slate-200/80 text-slate-700 font-semibold text-xs mb-4">
          Use cases
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold text-[#0f172a] tracking-tight mb-4">
          Who this platform is built for
        </h2>
        <p className="text-[#475569] text-base md:text-lg max-w-2xl mx-auto mb-16">
          Tailored financial research workflows for institutions and professionals who cannot afford errors.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#0f172a] mb-3">Equity Analysts & VCs</h3>
            <p className="text-[#475569] text-sm leading-relaxed mb-6">
              Accelerate due diligence on new investments. Extract multi-year historical ratios and benchmark peers in minutes instead of days.
            </p>
            <div className="pt-4 border-t border-slate-100 text-xs font-semibold text-blue-600 flex items-center gap-1">
              <span>3x faster investment memo creation</span>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#0f172a] mb-3">Risk & Compliance Teams</h3>
            <p className="text-[#475569] text-sm leading-relaxed mb-6">
              Audit corporate filings for subtle changes in accounting policies, related-party disclosures, or going-concern risk warnings automatically.
            </p>
            <div className="pt-4 border-t border-slate-100 text-xs font-semibold text-amber-600 flex items-center gap-1">
              <span>Automated footnote auditing</span>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#0f172a] mb-3">Wealth & Asset Managers</h3>
            <p className="text-[#475569] text-sm leading-relaxed mb-6">
              Monitor portfolio holdings continuously. Get instant answers to client queries with verified citations from official SEC filings.
            </p>
            <div className="pt-4 border-t border-slate-100 text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <span>Institutional-grade reliability</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS SECTION ─────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-slate-900 text-white text-center relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-cyan-400 font-semibold text-xs mb-4 border border-white/15">
            Analyst endorsements
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-16">
            Trusted by modern research teams
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center gap-1 text-amber-400 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400" />)}
              </div>
              <p className="text-slate-200 text-base italic mb-6 leading-relaxed">
                "Velsora has cut our earnings season analysis time by 80%. The Red Flag Agent caught an obscure inventory accounting adjustment in a footnote that our analysts missed on the first pass."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold text-sm">MR</div>
                <div>
                  <div className="font-bold text-sm">Marcus Reynolds</div>
                  <div className="text-xs text-slate-400">Senior Equity Analyst, Apex Capital</div>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center gap-1 text-amber-400 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400" />)}
              </div>
              <p className="text-slate-200 text-base italic mb-6 leading-relaxed">
                "The citation-backed insights are game changing. We can't present unverified AI answers to our investment committee. With Velsora, every single number links straight to the 10-K page."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-sm">SL</div>
                <div>
                  <div className="font-bold text-sm">Sarah Lin</div>
                  <div className="text-xs text-slate-400">Director of Diligence, Horizon Wealth</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ SECTION ──────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs mb-4">
            Got questions?
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#0f172a] tracking-tight">
            Frequently asked questions
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden transition-all shadow-2xs"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-6 text-left font-bold text-lg text-[#0f172a] flex items-center justify-between gap-4 cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${openFaq === idx ? 'rotate-180 text-blue-600' : ''}`} />
              </button>
              
              {openFaq === idx && (
                <div className="px-6 pb-6 text-[#475569] text-base leading-relaxed border-t border-slate-100 pt-4 animate-fade-up">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA BANNER ─────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-600 p-10 sm:p-16 text-white text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent)] pointer-events-none" />
          
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 relative z-10">
            Ready to elevate your financial research?
          </h2>
          <p className="text-blue-100 text-base sm:text-lg max-w-2xl mx-auto mb-8 relative z-10">
            Join modern analysts and investment teams using autonomous multi-agent AI to extract verified insights in seconds.
          </p>
          
          <div className="relative z-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              to="/signup" 
              className="bg-white text-blue-700 hover:bg-slate-100 font-bold px-8 py-4 rounded-full shadow-lg transition-all hover:scale-105 inline-flex items-center justify-center gap-2"
            >
              <span>Get started for free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200/80 py-12 px-4 text-sm text-[#475569]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 font-bold text-lg text-[#0f172a]">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs">
              <BarChart2 className="w-4 h-4" />
            </div>
            <span>Velsora</span>
          </div>
          
          <div className="flex items-center gap-8 font-medium">
            <a href="#features" className="hover:text-[#0f172a]">Features</a>
            <a href="#how-it-works" className="hover:text-[#0f172a]">Workflow</a>
            <a href="#use-cases" className="hover:text-[#0f172a]">Use Cases</a>
            <a href="#faq" className="hover:text-[#0f172a]">FAQ</a>
            <Link to="/login" className="hover:text-[#0f172a]">Sign In</Link>
          </div>

          <div className="text-xs text-slate-400">
            © {new Date().getFullYear()} Velsora. Built with Multi-Agent AI.
          </div>
        </div>
      </footer>

    </div>
  );
};
