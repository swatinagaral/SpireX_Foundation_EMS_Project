export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

const pad = (n: number) => String(n).padStart(2, "0");

// ISO -> value for <input type="datetime-local">
export const toLocalInput = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// datetime-local value -> ISO (or undefined if empty)
export const toIso = (local: string) => (local ? new Date(local).toISOString() : undefined);

export const splitList = (s: string) => s.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
