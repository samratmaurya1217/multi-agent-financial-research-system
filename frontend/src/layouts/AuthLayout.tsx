import { Link, useLocation } from "react-router-dom";
import { BarChart2, ChevronRight } from "lucide-react";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isLogin = location.pathname === "/login";

  return (
    <div className="min-h-screen flex overflow-hidden sky-hero-bg relative selection:bg-blue-500 selection:text-white font-sans">
      {/* Background Cloud & Grassy Ambience */}
      <div className="sky-clouds absolute inset-0 pointer-events-none opacity-85" />
      <div className="absolute bottom-0 left-0 right-0 h-56 pointer-events-none z-0 opacity-50 bg-gradient-to-t from-emerald-500/25 via-emerald-500/5 to-transparent" />

      {/* Left panel - minimal, humanized branding (Desktop only) */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[45%] flex-col relative overflow-hidden z-10 border-r border-white/40 bg-white/30 backdrop-blur-xl p-12 xl:p-16 justify-between">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 w-fit group">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 group-hover:scale-105 transition-transform duration-200">
            <BarChart2 className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-[#0f172a]">Velsora</span>
        </Link>

        {/* Center content - matching the humanized reference image */}
        <div className="my-auto py-10 max-w-lg">
          <h1 className="text-5xl xl:text-6xl font-extrabold text-[#0f172a] tracking-tight leading-[1.08] mb-6">
            {isLogin ? (
              <>
                Welcome back<br />
                to Velsora
              </>
            ) : (
              <>
                Start your free<br />
                account today
              </>
            )}
          </h1>

          <p className="text-[#475569] text-base xl:text-lg leading-relaxed font-normal mb-10 max-w-md">
            {isLogin
              ? "Sign in to access your financial research workspace, saved multi-agent analyses, and verified document intelligence."
              : "Get instant answers from 10-K reports, audits, and financial tables. Our team of autonomous AI agents is ready to help you make smarter decisions."}
          </p>

          {/* Clean bullet list with green chevrons matching reference image */}
          <ul className="space-y-3.5 text-[#334155] font-semibold text-sm xl:text-base">
            {[
              "Bank-level security",
              "Secure data infrastructure",
              "Privacy-first protection",
              "Global compliance standards",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <ChevronRight className="w-4 h-4 text-emerald-600 stroke-[3]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-slate-500 text-xs font-medium pt-6 border-t border-slate-200/60">
          <p>© {new Date().getFullYear()} Velsora. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-slate-800 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-800 cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </div>

      {/* Right panel - form container */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative z-10 overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2.5 justify-center mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
              <BarChart2 className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-2xl text-[#0f172a] tracking-tight">Velsora</span>
          </Link>

          {/* Frosted Glass Card matching image */}
          <div className="bg-white/90 backdrop-blur-2xl border border-white shadow-2xl rounded-3xl p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600" />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
