import { apiPost, apiGet } from "./api";
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  googleProvider,
  signOut,
} from "./firebase";

export interface AuthUser {
  // Official SAD Section 14.4 properties
  user_id: string;
  email: string;
  role: "analyst" | "admin" | "viewer" | "Student" | "Analyst" | "Team" | string;
  created_at?: string;

  // UI aliases (zero-crash strategy)
  id: string;
  name: string;
  avatarInitials: string;
  workspaceId?: string;
}

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload { name: string; email: string; password: string; }

export function normalizeUser(data: any): AuthUser {
  const user_id = data.user_id || data.id || data.firebaseUid || "usr_01";
  const email = data.email || "user@velsora.ai";
  const name = data.name || data.displayName || email.split("@")[0] || "User";
  const avatarInitials =
    data.avatarInitials ||
    name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ||
    "U";

  return {
    ...data,
    user_id,
    email,
    role: data.role || "Analyst",
    created_at: data.created_at || data.createdAt || new Date().toISOString(),
    id: user_id,
    name,
    avatarInitials,
    workspaceId: data.workspaceId,
  };
}

export async function syncBackendProfile(token: string, endpoint: string = "/auth/login"): Promise<AuthUser> {
  localStorage.setItem("velsora_token", token);
  const data = await apiPost<any>(endpoint, {});
  return normalizeUser(data.user || data);
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  try {
    const cred = await signInWithEmailAndPassword(auth, payload.email, payload.password);
    const token = await cred.user.getIdToken();
    return await syncBackendProfile(token, "/auth/login");
  } catch (err: any) {
    if (auth.app.options.apiKey?.includes("demo-key")) {
      const devToken = `dev_token_${payload.email.split("@")[0]}`;
      return await syncBackendProfile(devToken, "/auth/login");
    }
    throw err;
  }
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
    const token = await cred.user.getIdToken();
    return await syncBackendProfile(token, "/auth/register");
  } catch (err: any) {
    if (auth.app.options.apiKey?.includes("demo-key")) {
      const devToken = `dev_token_${payload.email.split("@")[0]}`;
      return await syncBackendProfile(devToken, "/auth/register");
    }
    throw err;
  }
}

export async function loginWithGoogle(): Promise<AuthUser> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const token = await cred.user.getIdToken();
    return await syncBackendProfile(token, "/auth/login");
  } catch (err: any) {
    if (auth.app.options.apiKey?.includes("demo-key")) {
      const devToken = `dev_token_google_user`;
      return await syncBackendProfile(devToken, "/auth/login");
    }
    throw err;
  }
}

export async function logout(): Promise<void> {
  await signOut(auth).catch(() => {});
  await apiPost("/auth/logout").catch(() => {});
  localStorage.removeItem("velsora_token");
  localStorage.removeItem("velsora_user");
}

export async function getMe(): Promise<AuthUser> {
  const data = await apiGet<any>("/auth/me");
  return normalizeUser(data);
}
