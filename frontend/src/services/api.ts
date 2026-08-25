// Base API client — Velsora backend
export const BASE_URL =
  import.meta.env.VITE_API_URL ??
  (typeof window !== "undefined" && window.location.hostname
    ? `http://${window.location.hostname}:8000`
    : "http://127.0.0.1:8000");

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("velsora_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function extractErrorMessage(res: Response, defaultMsg: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      return data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
    }
  } catch {
    // If not JSON, try text
    try {
      const text = await res.text();
      if (text.trim()) return text;
    } catch {
      // ignore
    }
  }
  return defaultMsg;
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
    const msg = await extractErrorMessage(res, `Request failed with status ${res.status}`);
    throw new Error(msg);
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
    const msg = await extractErrorMessage(res, `Request failed with status ${res.status}`);
    throw new Error(msg);
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
    const msg = await extractErrorMessage(res, `Request failed with status ${res.status}`);
    throw new Error(msg);
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
    const msg = await extractErrorMessage(res, `Upload failed with status ${res.status}`);
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
