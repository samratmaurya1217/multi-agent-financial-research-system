import { sleep } from "./api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "Student" | "Analyst" | "Team";
  avatarInitials: string;
}

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload { name: string; email: string; password: string; }

const MOCK_USER: AuthUser = {
  id: "usr_01",
  name: "Samrat Maurya",
  email: "samrat@finsight.ai",
  role: "Analyst",
  avatarInitials: "SM",
};

export async function login(_payload: LoginPayload): Promise<AuthUser> {
  await sleep(800);
  return MOCK_USER;
}

export async function register(_payload: RegisterPayload): Promise<AuthUser> {
  await sleep(1000);
  return MOCK_USER;
}

export async function logout(): Promise<void> {
  await sleep(300);
}

export async function getMe(): Promise<AuthUser> {
  await sleep(400);
  return MOCK_USER;
}
