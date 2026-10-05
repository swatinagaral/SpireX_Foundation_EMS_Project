const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const TOKEN_KEY = "ems_token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const getToken = () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY));
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

interface Options {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

export async function api<T = Record<string, unknown>>(path: string, opts: Options = {}): Promise<T> {
  const url = new URL(`${API}/api${path}`);
  Object.entries(opts.query || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  });

  const token = getToken();
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: opts.method || "GET",
      headers: {
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running?", 0);
  }

  let data: { message?: string } | null = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    // expired / invalid token -> back to login (but not for a failed login attempt)
    if (res.status === 401 && !path.startsWith("/auth/login") && typeof window !== "undefined") {
      clearToken();
      window.location.href = "/login";
    }
    throw new ApiError(data?.message || "Request failed", res.status);
  }
  return data as T;
}

// Downloads a file (CSV/XLSX/PDF) from a protected endpoint using the saved auth token.
export async function apiDownload(path: string, query: Record<string, string | number | undefined> = {}, suggestedName = "download") {
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const url = new URL(`${API}/api${path}`);
  Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== "") url.searchParams.set(k, String(v)); });

  const token = getToken();
  const res = await fetch(url.toString(), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) {
    let message = "Export failed";
    try { message = (await res.json()).message || message; } catch { /* not JSON */ }
    throw new ApiError(message, res.status);
  }

  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : suggestedName;

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

// Opens a "Print" export (an HTML page) in a new tab and triggers the browser print dialog.
export async function apiPrint(path: string, query: Record<string, string | number | undefined> = {}) {
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const url = new URL(`${API}/api${path}`);
  Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== "") url.searchParams.set(k, String(v)); });

  const token = getToken();
  const res = await fetch(url.toString(), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) {
    let message = "Print export failed";
    try { message = (await res.json()).message || message; } catch { /* not JSON */ }
    throw new ApiError(message, res.status);
  }
  const html = await res.text();
  const win = window.open("", "_blank");
  if (!win) throw new Error("Pop-up blocked. Please allow pop-ups for this site.");
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}
