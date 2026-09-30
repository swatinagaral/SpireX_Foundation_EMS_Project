"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { errMsg, fmtDate } from "@/lib/format";
import type { EmailLog, EmailStatus, Paged } from "@/lib/types";
import Guard from "@/components/Guard";
import { Alert, Badge, btn, Card, Empty, inputCls, Loading, Modal, PageHeader, Pagination } from "@/components/ui";

const tone = { queued: "amber", sending: "blue", sent: "green", failed: "red", cancelled: "gray" } as const;

interface Stats { queued: number; sending: number; sent: number; failed: number; cancelled: number; total: number }
type ListRes = Paged & { emails: EmailLog[] };

export default function HistoryPage() {
  const user = useUser();
  const canSend = can(user.role, "emails.send");

  const [data, setData] = useState<ListRes | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [smtp, setSmtp] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<EmailLog | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, st] = await Promise.all([
        api<ListRes>("/emails/history", { query: { page, status, type, q: search } }),
        api<{ stats: Stats; smtpConfigured: boolean }>("/emails/stats"),
      ]);
      setData(list);
      setStats(st.stats);
      setSmtp(st.smtpConfigured);
      setError("");
    } catch (e) {
      setError(errMsg(e));
    }
  }, [page, status, type, search]);

  useEffect(() => { load(); }, [load]);

  // auto-refresh while emails are still waiting
  const waiting = (stats?.queued || 0) + (stats?.sending || 0) > 0;
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [waiting, load]);

  const action = async (id: string, what: "retry" | "cancel") => {
    try {
      await api(`/emails/${id}/${what}`, { method: "POST" });
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const openDetail = async (id: string) => {
    try {
      const r = await api<{ email: EmailLog }>(`/emails/${id}`);
      setDetail(r.email);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <Guard perm="emails.history">
      <PageHeader
        title="Email history"
        subtitle={user.role === "admin" || user.role === "super_admin" ? "All emails in the system." : "Emails you have sent."}
        actions={<button className={btn.secondary} onClick={load}>↻ Refresh</button>}
      />

      {!smtp && <Alert type="warning">Dev mode: SMTP is not configured, so emails marked “sent” are not really delivered.</Alert>}
      {error && <Alert>{error}</Alert>}

      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(["queued", "sending", "sent", "failed", "cancelled"] as EmailStatus[]).map((s) => (
            <button key={s} onClick={() => { setStatus(status === s ? "" : s); setPage(1); }} className="text-left">
              <Card className={status === s ? "ring-2 ring-indigo-500" : ""}>
                <div className="text-xs capitalize text-slate-500">{s}</div>
                <div className="text-2xl font-bold text-slate-900">{stats[s]}</div>
              </Card>
            </button>
          ))}
        </div>
      )}

      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(e) => { e.preventDefault(); setSearch(q); setPage(1); }}
      >
        <input className={`${inputCls} max-w-xs`} placeholder="Search email or subject…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inputCls} max-w-[10rem]`} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">All types</option>
          <option value="single">Single</option>
          <option value="bulk">Bulk</option>
          <option value="automated">Automated</option>
          <option value="announcement">Announcement</option>
        </select>
        <button className={btn.secondary}>Search</button>
      </form>

      {!data && !error && <Loading />}
      {data && data.emails.length === 0 && <Empty>No emails found.</Empty>}
      {data && data.emails.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">To</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.emails.map((m) => (
                <tr key={m._id}>
                  <td className="px-3 py-2">
                    <div className="text-slate-900">{m.to.email}</div>
                    {m.to.name && <div className="text-xs text-slate-500">{m.to.name}</div>}
                  </td>
                  <td className="max-w-[16rem] truncate px-3 py-2 text-slate-700" title={m.subject}>{m.subject}</td>
                  <td className="px-3 py-2 capitalize text-slate-600">{m.type}</td>
                  <td className="px-3 py-2">
                    <Badge tone={tone[m.status]}>{m.status}</Badge>
                    {m.status === "failed" && <div className="mt-0.5 text-xs text-red-600">{m.attempts}/{m.maxAttempts} tries</div>}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{fmtDate(m.sentAt || m.scheduledAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1.5">
                      <button className={btn.small} onClick={() => openDetail(m._id)}>View</button>
                      {canSend && m.status === "failed" && <button className={btn.small} onClick={() => action(m._id, "retry")}>Retry</button>}
                      {canSend && m.status === "queued" && <button className={btn.small} onClick={() => action(m._id, "cancel")}>Cancel</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Email details" wide>
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div><span className="text-slate-500">To:</span> {detail.to.email}</div>
              <div><span className="text-slate-500">Status:</span> <Badge tone={tone[detail.status]}>{detail.status}</Badge></div>
              <div><span className="text-slate-500">Type:</span> {detail.type}</div>
              <div><span className="text-slate-500">Sent:</span> {fmtDate(detail.sentAt)}</div>
            </div>
            <div><span className="text-slate-500">Subject:</span> <b>{detail.subject}</b></div>
            {detail.lastError && <Alert>{detail.lastError}</Alert>}
            {/* sandboxed: the email HTML cannot run scripts */}
            <iframe title="Email preview" sandbox="" srcDoc={detail.html} className="h-72 w-full rounded-lg border border-slate-200" />
          </div>
        )}
      </Modal>
    </Guard>
  );
}
