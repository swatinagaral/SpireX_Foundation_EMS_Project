"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api, apiDownload } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { errMsg, fmtDate } from "@/lib/format";
import type { Paged } from "@/lib/types";
import Guard from "@/components/Guard";
import { Alert, Badge, btn, Card, Empty, inputCls, Loading, PageHeader, Pagination } from "@/components/ui";

const STATUS_COLORS: Record<string, string> = {
  sent: "#16a34a", queued: "#d97706", sending: "#2563eb", failed: "#dc2626", cancelled: "#6b7280",
  published: "#16a34a", draft: "#6b7280", archived: "#d97706",
};
const PRIORITY_COLORS: Record<string, string> = { low: "#64748b", medium: "#2563eb", high: "#d97706", urgent: "#dc2626" };

interface DashboardData {
  emails: { byStatus: Record<string, number>; byType: Record<string, number>; perDay: { date: string; count: number }[] };
  announcements: { byStatus: Record<string, number>; byPriority: Record<string, number>; perDay: { date: string; count: number }[] };
}

const toChartData = (obj: Record<string, number>, colorMap: Record<string, string>) =>
  Object.entries(obj).map(([name, value]) => ({ name, value, fill: colorMap[name] || "#6366f1" }));

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

export default function ReportsPage() {
  const user = useUser();
  const canExport = can(user.role, "reports.export");
  const [tab, setTab] = useState<"overview" | "emails" | "announcements">("overview");

  return (
    <Guard perm="reports.view">
      <PageHeader title="Reports & Analytics" subtitle="Communication activity across the organisation." />

      <div className="mb-5 flex gap-2 border-b border-slate-200">
        {(["overview", "emails", "announcements"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t === "overview" ? "Overview" : t}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "emails" && <EmailReportTab canExport={canExport} />}
      {tab === "announcements" && <AnnouncementReportTab canExport={canExport} />}
    </Guard>
  );
}

function OverviewTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<DashboardData>("/reports/dashboard").then(setData).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Loading />;

  const emailStatusData = toChartData(data.emails.byStatus, STATUS_COLORS);
  const annPriorityData = toChartData(data.announcements.byPriority, PRIORITY_COLORS);
  const totalEmails = Object.values(data.emails.byStatus).reduce((a, b) => a + b, 0);
  const totalAnn = Object.values(data.announcements.byStatus).reduce((a, b) => a + b, 0);

  const perDay = data.emails.perDay.map((e, i) => ({
    date: shortDate(e.date),
    Emails: e.count,
    Announcements: data.announcements.perDay[i]?.count ?? 0,
  }));

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><div className="text-sm text-slate-500">Total emails</div><div className="mt-1 text-3xl font-bold text-slate-900">{totalEmails}</div></Card>
        <Card><div className="text-sm text-slate-500">Emails sent</div><div className="mt-1 text-3xl font-bold text-green-600">{data.emails.byStatus.sent || 0}</div></Card>
        <Card><div className="text-sm text-slate-500">Emails failed</div><div className="mt-1 text-3xl font-bold text-red-600">{data.emails.byStatus.failed || 0}</div></Card>
        <Card><div className="text-sm text-slate-500">Total announcements</div><div className="mt-1 text-3xl font-bold text-slate-900">{totalAnn}</div></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Email status breakdown</h3>
          {emailStatusData.length === 0 ? <Empty>No emails yet.</Empty> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={emailStatusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Announcements by priority</h3>
          {annPriorityData.length === 0 ? <Empty>No announcements yet.</Empty> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={annPriorityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Last 14 days</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={perDay}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Emails" stroke="#4f46e5" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Announcements" stroke="#0d9488" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}

function ExportButtons({ onExport, busy }: { onExport: (format: "csv" | "xlsx" | "pdf") => void; busy: string | null }) {
  return (
    <div className="flex gap-1.5">
      {(["csv", "xlsx", "pdf"] as const).map((f) => (
        <button key={f} className={btn.small} disabled={busy === f} onClick={() => onExport(f)}>
          {busy === f ? "…" : f.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

interface EmailReportRes extends Paged {
  summary: { byStatus: Record<string, number>; byType: Record<string, number> };
  emails: { _id: string; to: { email: string }; subject: string; type: string; status: string; sentByName: string; createdAt: string; sentAt?: string }[];
}

function EmailReportTab({ canExport }: { canExport: boolean }) {
  const [data, setData] = useState<EmailReportRes | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [batch, setBatch] = useState("");
  const [program, setProgram] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);

  const filters = { status, from, to, q: search, batch, program, department };

  const load = useCallback(async () => {
    try {
      setData(await api<EmailReportRes>("/reports/emails", { query: { page, ...filters } }));
      setError("");
    } catch (e) {
      setError(errMsg(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, from, to, search, batch, program, department]);

  useEffect(() => { load(); }, [load]);

  const doExport = async (format: "csv" | "xlsx" | "pdf") => {
    setExporting(format);
    try {
      await apiDownload("/reports/emails/export", { format, ...filters }, `email-report.${format}`);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      <form
        className="mb-2 flex flex-wrap gap-2"
        onSubmit={(e) => { e.preventDefault(); setSearch(q); setPage(1); }}
      >
        <input className={`${inputCls} max-w-xs`} placeholder="Search email or subject…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className={btn.secondary}>Search</button>
      </form>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select className={`${inputCls} max-w-[10rem]`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {["queued", "sending", "sent", "failed", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="date" className={`${inputCls} max-w-[10rem]`} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          <input type="date" className={`${inputCls} max-w-[10rem]`} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          <input className={`${inputCls} max-w-[9rem]`} placeholder="Batch ID" value={batch} onChange={(e) => { setBatch(e.target.value); setPage(1); }} />
          <input className={`${inputCls} max-w-[9rem]`} placeholder="Program ID" value={program} onChange={(e) => { setProgram(e.target.value); setPage(1); }} />
          <input className={`${inputCls} max-w-[9rem]`} placeholder="Department ID" value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }} />
        </div>
        {canExport && <ExportButtons onExport={doExport} busy={exporting} />}
      </div>

      {error && <Alert>{error}</Alert>}
      {!data && !error && <Loading />}
      {data && data.emails.length === 0 && <Empty>No emails match these filters.</Empty>}
      {data && data.emails.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Recipient</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Sent by</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.emails.map((m) => (
                <tr key={m._id}>
                  <td className="px-3 py-2 text-slate-900">{m.to.email}</td>
                  <td className="max-w-[16rem] truncate px-3 py-2 text-slate-700">{m.subject}</td>
                  <td className="px-3 py-2 capitalize text-slate-600">{m.type}</td>
                  <td className="px-3 py-2"><Badge tone={m.status === "sent" ? "green" : m.status === "failed" ? "red" : "amber"}>{m.status}</Badge></td>
                  <td className="px-3 py-2 text-slate-600">{m.sentByName}</td>
                  <td className="px-3 py-2 text-slate-600">{fmtDate(m.sentAt || m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </>
  );
}

interface AnnouncementReportRes extends Paged {
  summary: { byStatus: Record<string, number>; byPriority: Record<string, number> };
  announcements: { _id: string; title: string; priority: string; status: string; audienceText: string; readCount: number; createdByName: string; publishAt: string }[];
}

function AnnouncementReportTab({ canExport }: { canExport: boolean }) {
  const [data, setData] = useState<AnnouncementReportRes | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<AnnouncementReportRes>("/reports/announcements", { query: { page, status, priority } }));
      setError("");
    } catch (e) {
      setError(errMsg(e));
    }
  }, [page, status, priority]);

  useEffect(() => { load(); }, [load]);

  const doExport = async (format: "csv" | "xlsx" | "pdf") => {
    setExporting(format);
    try {
      await apiDownload("/reports/announcements/export", { format, status, priority }, `announcement-report.${format}`);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select className={`${inputCls} max-w-[10rem]`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {["draft", "published", "archived"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={`${inputCls} max-w-[10rem]`} value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
            <option value="">All priorities</option>
            {["low", "medium", "high", "urgent"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {canExport && <ExportButtons onExport={doExport} busy={exporting} />}
      </div>

      {error && <Alert>{error}</Alert>}
      {!data && !error && <Loading />}
      {data && data.announcements.length === 0 && <Empty>No announcements match these filters.</Empty>}
      {data && data.announcements.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Audience</th>
                <th className="px-3 py-2">Read</th>
                <th className="px-3 py-2">Created by</th>
                <th className="px-3 py-2">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.announcements.map((a) => (
                <tr key={a._id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{a.title}</td>
                  <td className="px-3 py-2"><Badge tone={a.priority === "urgent" ? "red" : a.priority === "high" ? "amber" : a.priority === "medium" ? "blue" : "gray"}>{a.priority}</Badge></td>
                  <td className="px-3 py-2"><Badge tone={a.status === "published" ? "green" : a.status === "archived" ? "amber" : "gray"}>{a.status}</Badge></td>
                  <td className="px-3 py-2 text-slate-600">{a.audienceText}</td>
                  <td className="px-3 py-2 text-slate-600">{a.readCount}</td>
                  <td className="px-3 py-2 text-slate-600">{a.createdByName}</td>
                  <td className="px-3 py-2 text-slate-600">{fmtDate(a.publishAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </>
  );
}
