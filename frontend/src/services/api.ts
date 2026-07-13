// Base API client — swap BASE_URL and remove mock flag when backend is ready

export const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
export const USE_MOCK = true; // set false when FastAPI backend is available

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
