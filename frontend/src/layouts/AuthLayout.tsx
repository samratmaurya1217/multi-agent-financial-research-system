import { Link } from "react-router-dom";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-indigo-500 to-rose-500" />
          <span className="text-lg font-semibold text-white tracking-tight">FinSight</span>
        </Link>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8">
          {children}
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          © {new Date().getFullYear()} FinSight. Precision financial research.
        </p>
      </div>
    </div>
  );
}
