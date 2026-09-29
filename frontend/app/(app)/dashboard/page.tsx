"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { fmtDate } from "@/lib/format";
import type { Announcement } from "@/lib/types";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";

interface Stats { queued: number; sending: number; sent: number; failed: number; cancelled: number; total: number }

export default function DashboardPage() {
  const user = useUser();
  const [unread, setUnread] = useState<number | null>(null);
  const [recent, setRecent] = useState<Announcement[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [smtp, setSmtp] = useState(true);

  useEffect(() => {
    if (can(user.role, "announcements.read")) {
      api<{ unread: number }>("/announcements/unread-count").then((r) => setUnread(r.unread)).catch(() => {});
      api<{ announcements: Announcement[] }>("/announcements", { query: { limit: 5 } })
        .then((r) => setRecent(r.announcements)).catch(() => {});
    }
    if (can(user.role, "emails.history")) {
      api<{ stats: Stats; smtpConfigured: boolean }>("/emails/stats")
        .then((r) => { setStats(r.stats); setSmtp(r.smtpConfigured); }).catch(() => {});
    }
  }, [user.role]);

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(" ")[0]} 👋`} subtitle="Here is what is happening." />

      {stats && !smtp && (
        <Alert type="warning">
          Email is in <b>dev mode</b> (SMTP not configured) — emails are marked as sent but are not really delivered.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {unread !== null && (
          <Link href="/announcements"><StatCard label="Unread announcements" value={unread} tone="text-indigo-600" /></Link>
        )}
        {stats && (
          <>
            <Link href="/emails/history"><StatCard label="Emails sent" value={stats.sent} tone="text-green-600" /></Link>
            <Link href="/emails/history"><StatCard label="Emails waiting" value={stats.queued + stats.sending} tone="text-amber-600" /></Link>
            <Link href="/emails/history"><StatCard label="Emails failed" value={stats.failed} tone="text-red-600" /></Link>
          </>
        )}
      </div>

      {can(user.role, "announcements.read") && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent announcements</h2>
            <Link href="/announcements" className="text-sm font-medium text-indigo-600 hover:underline">View all</Link>
          </div>
          {recent.length === 0 && <Card><span className="text-sm text-slate-500">No announcements yet.</span></Card>}
          <div className="space-y-2">
            {recent.map((a) => (
              <Card key={a._id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{a.isPinned && "📌 "}{a.title}</span>
                  {!a.isRead && <Badge tone="indigo">New</Badge>}
                  {a.priority !== "normal" && <Badge tone={a.priority === "urgent" ? "red" : "amber"}>{a.priority}</Badge>}
                </div>
                <div className="mt-1 text-xs text-slate-500">{fmtDate(a.publishAt)}</div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="transition hover:shadow-md">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${tone}`}>{value}</div>
    </Card>
  );
}
