import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/layouts/AuthLayout";
import { register } from "@/services/auth";
import { useAuth } from "@/store/authStore";
import { Eye, EyeOff } from "lucide-react";

export function SignUpPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await register(form);
    await login({ email: form.email, password: form.password });
    navigate("/dashboard");
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
      <p className="text-white/40 text-sm mb-8">Start your financial research journey with FinSight.</p>

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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-full bg-gradient-to-r from-indigo-500 to-rose-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25 disabled:opacity-50"
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
