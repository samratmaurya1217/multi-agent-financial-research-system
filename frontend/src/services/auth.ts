import { sleep, apiPost, apiGet, USE_MOCK } from "./api";

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
}

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload { name: string; email: string; password: string; }

export function normalizeUser(data: any): AuthUser {
  const user_id = data.user_id || data.id || "usr_01";
  const email = data.email || "user@example.com";
  const name = data.name || email.split("@")[0] || "User";
  const avatarInitials = data.avatarInitials || name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  return {
    ...data,
    user_id,
    email,
    role: data.role || "Analyst",
    created_at: data.created_at || data.createdAt || new Date().toISOString(),
    id: user_id,
    name,
    avatarInitials,
  };
}

const MOCK_USER: AuthUser = normalizeUser({
  user_id: "usr_01",
  name: "Samrat Maurya",
  email: "samrat@finsight.ai",
  role: "Analyst",
  avatarInitials: "SM",
  created_at: "2026-07-10T10:00:00Z",
});

export async function login(payload: LoginPayload): Promise<AuthUser> {
  if (USE_MOCK) {
    await sleep(800);
    return MOCK_USER;
  }
  const data = await apiPost<any>("/auth/login", payload);
  return normalizeUser(data.user || data);
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  if (USE_MOCK) {
    await sleep(1000);
    return normalizeUser({
      user_id: `usr_${Date.now()}`,
      name: payload.name,
      email: payload.email,
      role: "Analyst",
    });
  }
  const data = await apiPost<any>("/auth/register", payload);
  return normalizeUser(data);
}

export async function logout(): Promise<void> {
  if (USE_MOCK) {
    await sleep(300);
    return;
  }
  await apiPost("/auth/logout");
}

export async function getMe(): Promise<AuthUser> {
  if (USE_MOCK) {
    await sleep(400);
    return MOCK_USER;
  }
  const data = await apiGet<any>("/auth/me");
  return normalizeUser(data);
}

