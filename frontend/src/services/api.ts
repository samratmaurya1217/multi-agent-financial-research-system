// Base API client — Velsora backend at http://localhost:8000
// All mock flags removed. Real FastAPI backend is used for all requests.

export const BASE_URL = import.meta.env.VITE_API_URL ?? (typeof window !== "undefined" && window.location.hostname ? `http://${window.location.hostname}:8000` : "http://127.0.0.1:8000");

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("velsora_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleAuthError(res: Response) {
  if (res.status === 401) {
    localStorage.removeItem("velsora_token");
    localStorage.removeItem("velsora_user");
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    credentials: "include",
  });
  if (!res.ok) {
    handleAuthError(res);
    throw new Error(`GET ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    handleAuthError(res);
    throw new Error(`POST ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: { ...getAuthHeader() },
    credentials: "include",
  });
  if (!res.ok) {
    handleAuthError(res);
    throw new Error(`DELETE ${path} failed: ${res.status}`);
  }
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { ...getAuthHeader() },
    body: formData,
    credentials: "include",
  });
  if (!res.ok) {
    handleAuthError(res);
    throw new Error(`UPLOAD ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}


export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
