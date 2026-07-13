import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/layouts/AuthLayout";
import { useAuth } from "@/store/authStore";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

export function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("samrat@finsight.ai");
  const [password, setPassword] = useState("password");
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ email, password });
    navigate("/dashboard");
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
      <p className="text-white/40 text-sm mb-8">Sign in to your FinSight account to continue.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/60 mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.06] transition-all text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/60 mb-2">Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 pr-11 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.06] transition-all text-sm"
            />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-rose-400 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-full bg-gradient-to-r from-indigo-500 to-rose-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <span className="text-white/30 text-sm">Don't have an account? </span>
        <Link to="/signup" className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors">Sign up</Link>
      </div>
    </AuthLayout>
  );
}
