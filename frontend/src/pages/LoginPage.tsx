import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/layouts/AuthLayout";
import { useAuth } from "@/store/authStore";
import { Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";

export function LoginPage() {
  const { login, loginWithGoogle, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate("/dashboard");
    } catch {
      // error handled in store
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
      navigate("/dashboard");
    } catch {
      // error handled in store
    }
  };

  return (
    <AuthLayout>
      <div className="text-left mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight mb-2">
          Welcome back
        </h2>
        <p className="text-sm font-normal text-[#475569] leading-relaxed">
          Sign in to your Velsora account to continue your research.
        </p>
      </div>

      {/* Google Auth Button (FintechX Light/Glass Style) */}
      <div className="mb-6">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-3 px-5 rounded-full font-semibold text-sm flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer transition-all duration-200 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z" />
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
            <path fill="#FBBC05" d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.6 7.4C.6 9.4 0 10.9 0 12.5s.6 3.1 1.6 5.1l3.7-2.8z" />
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.2-6.7-5.2L1.6 16.9C3.5 20.7 7.4 24 12 24z" />
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>

      {/* Divider */}
      <div className="relative mb-6 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <span className="relative px-3 text-xs uppercase tracking-wider font-bold bg-white text-slate-400 rounded-full border border-slate-200/80 py-0.5 shadow-2xs">
          or continue with email
        </span>
      </div>

      {/* Email / Password Form matching sentence-case reference image */}
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold leading-relaxed shadow-xs">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-[#334155] mb-1.5">
            Email address*
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-[#0f172a] placeholder:text-slate-400 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 shadow-2xs"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-semibold text-[#334155]">
              Password*
            </label>
            <a href="#forgot" onClick={(e) => { e.preventDefault(); alert("Password reset sent to your email if registered!"); }} className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 pr-11 rounded-xl bg-white border border-slate-200 text-[#0f172a] placeholder:text-slate-400 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 shadow-2xs"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Primary Submit Button (FintechX Blue Style) */}
        <div className="pt-2">
          <button
            type="submit"
            id="login-submit"
            disabled={isLoading}
            className="btn-fintechx-blue w-full justify-center py-3.5 rounded-full text-white font-bold text-base shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/35 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? "Signing in..." : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Footer Link */}
      <p className="mt-8 text-center text-sm font-medium text-slate-500">
        Don't have an account?{" "}
        <Link to="/signup" className="font-bold text-blue-600 hover:text-blue-700 transition-colors underline-offset-4 hover:underline">
          Create free account
        </Link>
      </p>
    </AuthLayout>
  );
}
