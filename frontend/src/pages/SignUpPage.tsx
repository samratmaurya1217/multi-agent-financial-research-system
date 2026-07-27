import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/layouts/AuthLayout";
import { useAuth } from "@/store/authStore";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

export function SignUpPage() {
  const { register, loginWithGoogle, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(form);
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
      <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
      <p className="text-white/40 text-sm mb-8">Start your financial research journey with Velsora.</p>

      <div className="mb-6">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white font-medium text-sm hover:bg-white/[0.1] transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.6 7.4C.6 9.4 0 10.9 0 12.5s.6 3.1 1.6 5.1l3.7-2.8z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.2-6.7-5.2L1.6 16.9C3.5 20.7 7.4 24 12 24z"
            />
          </svg>
          Continue with Google
        </button>
      </div>

      <div className="relative mb-6 flex items-center justify-center">
        <div className="border-t border-white/10 w-full"></div>
        <span className="bg-[#0b0f19] px-3 text-xs text-white/40 uppercase tracking-wider absolute">Or continue with email</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {(["name", "email", "password"] as const).map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-white/60 mb-2 capitalize">{field}</label>
            <div className="relative">
              <input
                type={field === "password" ? (showPw ? "text" : "password") : field === "email" ? "email" : "text"}
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                required
                placeholder={field === "name" ? "Samrat Maurya" : field === "email" ? "you@example.com" : "••••••••"}
                className="w-full px-4 py-3 pr-11 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.06] transition-all text-sm"
              />
              {field === "password" && (
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
        ))}

        {error && (
          <p className="text-sm text-rose-400 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-full bg-gradient-to-r from-indigo-500 to-rose-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25 disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <span className="text-white/30 text-sm">Already have an account? </span>
        <Link to="/login" className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors">Sign in</Link>
      </div>
    </AuthLayout>
  );
}
