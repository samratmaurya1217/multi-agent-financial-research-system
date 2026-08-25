import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { AuthUser, LoginPayload, RegisterPayload } from "@/services/auth";
import {
  login as apiLogin,
  register as apiRegister,
  loginWithGoogle as apiLoginGoogle,
  resetPassword as apiResetPassword,
  logout as apiLogout,
  getMe,
} from "@/services/auth";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<string>;
  logout: () => Promise<void>;
  updateUser: (fields: Partial<AuthUser>) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    const token = localStorage.getItem("velsora_token");
    if (token) {
      getMe()
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem("velsora_token");
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const u = await apiLogin(payload);
      setUser(u);
    } catch (err: any) {
      const msg = err?.message || "Invalid credentials. Please try again.";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const u = await apiRegister(payload);
      setUser(u);
    } catch (err: any) {
      const msg = err?.message || "Registration failed. Please try again.";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const u = await apiLoginGoogle();
      setUser(u);
    } catch (err: any) {
      const msg = err?.message || "Google sign-in failed. Please try again.";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<string> => {
    setError(null);
    try {
      return await apiResetPassword(email);
    } catch (err: any) {
      const msg = err?.message || "Could not reset password. Please try again.";
      setError(msg);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const updateUser = useCallback((fields: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...fields };
      if (fields.name) {
        const parts = fields.name.trim().split(" ");
        updated.avatarInitials = parts.length > 1
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : (parts[0]?.slice(0, 2) || "AN").toUpperCase();
      }
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        loginWithGoogle,
        resetPassword,
        logout,
        updateUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
