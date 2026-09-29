"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { errMsg, fmtDate } from "@/lib/format";
import type { Announcement, Audience, Paged } from "@/lib/types";
import Guard from "@/components/Guard";
import { Alert, Badge, btn, Card, Empty, Loading, PageHeader, Pagination } from "@/components/ui";

const priorityTone = { normal: "gray", important: "amber", urgent: "red" } as const;
const statusTone = { published: "green", draft: "gray", archived: "amber" } as const;

const audienceText = (a: Audience) => {
  if (a.all) return "Everyone";
  const parts: string[] = [];
  if (a.roles.length) parts.push(a.roles.map((r) => r.replace("_", " ")).join(", "));
  if (a.batches.length) parts.push(`${a.batches.length} batch(es)`);
  if (a.programs.length) parts.push(`${a.programs.length} program(s)`);
  return parts.join(" • ") || "—";
};

type ListRes = Paged & { announcements: Announcement[] };

export default function AnnouncementsPage() {
  const user = useUser();
  const canManage = can(user.role, "announcements.create") || can(user.role, "announcements.update");
  const [tab, setTab] = useState<"mine" | "manage">("mine");

  return (
    <Guard perm="announcements.read">
      <PageHeader
        title="Announcements"
        subtitle="Notices for your batch, program or role."
        actions={
          can(user.role, "announcements.create") && (
            <Link href="/announcements/new" className={btn.primary}>+ New announcement</Link>
          )
        }
      />
      {canManage && (
        <div className="mb-4 flex gap-2 border-b border-slate-200">
          {(["mine", "manage"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                tab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t === "mine" ? "For me" : "Manage"}
            </button>
          ))}
        </div>
      )}
      {tab === "mine" ? <MyList /> : <ManageList />}
    </Guard>
  );
}

function MyList() {
  const [data, setData] = useState<ListRes | null>(null);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api<ListRes>("/announcements", { query: { page, unread: unreadOnly ? "true" : undefined } }));
      setError("");
    } catch (e) {
      setError(errMsg(e));
    }
  }, [page, unreadOnly]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    try {
      await api(`/announcements/${id}/read`, { method: "POST" });
      setData((d) => d && { ...d, announcements: d.announcements.map((a) => (a._id === id ? { ...a, isRead: true } : a)) });
      window.dispatchEvent(new Event("ems:unread-changed"));
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <>
      <label className="mb-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }} />
        Show unread only
      </label>
      {error && <Alert>{error}</Alert>}
      {!data && !error && <Loading />}
      {data && data.announcements.length === 0 && <Empty>No announcements to show.</Empty>}
      <div className="space-y-3">
        {data?.announcements.map((a) => (
          <Card key={a._id} className={a.isRead ? "" : "border-l-4 border-l-indigo-500"}>
            <div className="flex flex-wrap items-center gap-2">
              {a.isPinned && <span title="Pinned">📌</span>}
              <h3 className="font-semibold text-slate-900">{a.title}</h3>
              <Badge tone={priorityTone[a.priority]}>{a.priority}</Badge>
              {!a.isRead && <Badge tone="indigo">New</Badge>}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{a.content}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>{a.createdBy?.name || "Unknown"} • {fmtDate(a.publishAt)}</span>
              {!a.isRead && <button className={btn.small} onClick={() => markRead(a._id)}>Mark as read</button>}
            </div>
          </Card>
        ))}
      </div>
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </>
  );
}

function ManageList() {
  const user = useUser();
  const [data, setData] = useState<ListRes | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api<ListRes>("/announcements/manage", { query: { page, status } }));
      setError("");
    } catch (e) {
      setError(errMsg(e));
    }
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    try {
      await api(`/announcements/${id}`, { method: "PATCH", body });
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this announcement permanently?")) return;
    try {
      await api(`/announcements/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <>
      <div className="mb-4">
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      {error && <Alert>{error}</Alert>}
      {!data && !error && <Loading />}
      {data && data.announcements.length === 0 && <Empty>Nothing here yet.</Empty>}
      {data && data.announcements.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Audience</th>
                <th className="px-3 py-2">Read by</th>
                <th className="px-3 py-2">Published</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.announcements.map((a) => (
                <tr key={a._id}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900">{a.isPinned && "📌 "}{a.title}</div>
                    <Badge tone={priorityTone[a.priority]}>{a.priority}</Badge>
                  </td>
                  <td className="px-3 py-2"><Badge tone={statusTone[a.status]}>{a.status}</Badge></td>
                  <td className="px-3 py-2 text-slate-600">{audienceText(a.audience)}</td>
                  <td className="px-3 py-2">{a.readCount ?? 0}</td>
                  <td className="px-3 py-2 text-slate-600">{fmtDate(a.publishAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Link href={`/announcements/${a._id}/edit`} className={btn.small}>Edit</Link>
                      <button className={btn.small} onClick={() => patch(a._id, { isPinned: !a.isPinned })}>
                        {a.isPinned ? "Unpin" : "Pin"}
                      </button>
                      {a.status === "published" ? (
                        <button className={btn.small} onClick={() => patch(a._id, { status: "archived" })}>Archive</button>
                      ) : (
                        <button className={btn.small} onClick={() => patch(a._id, { status: "published" })}>Publish</button>
                      )}
                      {can(user.role, "announcements.delete") && (
                        <button className={btn.danger + " !px-2 !py-1 !text-xs"} onClick={() => remove(a._id)}>Delete</button>
                      )}
                    </div>
                  </td>
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
