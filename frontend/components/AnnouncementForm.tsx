"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { errMsg, toIso, toLocalInput } from "@/lib/format";
import type { Announcement } from "@/lib/types";
import AudienceFields, { AudienceState, buildAudience } from "./AudienceFields";
import { Alert, btn, Field, inputCls } from "./ui";

export default function AnnouncementForm({ initial }: { initial?: Announcement }) {
  const user = useUser();
  const router = useRouter();
  const restricted = user.role === "coordinator";

  const [title, setTitle] = useState(initial?.title || "");
  const [content, setContent] = useState(initial?.content || "");
  const [priority, setPriority] = useState(initial?.priority || "normal");
  const [status, setStatus] = useState<string>(initial?.status || "published");
  const [isPinned, setIsPinned] = useState(initial?.isPinned || false);
  const [sendEmail, setSendEmail] = useState(initial?.sendEmail || false);
  const [publishAt, setPublishAt] = useState(toLocalInput(initial?.publishAt));
  const [expiresAt, setExpiresAt] = useState(toLocalInput(initial?.expiresAt));
  const [aud, setAud] = useState<AudienceState>({
    all: initial?.audience.all || false,
    roles: initial?.audience.roles || [],
    batches: (initial?.audience.batches || []).join(", "),
    programs: (initial?.audience.programs || []).join(", "),
    userIds: "",
    emails: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = {
        title, content, priority, status, isPinned, sendEmail,
        audience: buildAudience(aud),
        publishAt: toIso(publishAt),
        expiresAt: initial ? (expiresAt ? toIso(expiresAt) : null) : toIso(expiresAt),
      };
      const res = initial
        ? await api<{ emailsQueued?: number; emailWarning?: string }>(`/announcements/${initial._id}`, { method: "PATCH", body })
        : await api<{ emailsQueued?: number; emailWarning?: string }>("/announcements", { method: "POST", body });

      if (res.emailWarning) alert(`Saved, but emails were not queued: ${res.emailWarning}`);
      router.push("/announcements");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      {error && <Alert>{error}</Alert>}

      <Field label="Title">
        <input className={inputCls} required minLength={3} maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Content">
        <textarea className={inputCls} required rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Priority">
          <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
            <option value="normal">Normal</option>
            <option value="important">Important</option>
            <option value="urgent">Urgent</option>
          </select>
        </Field>
        <Field label="Status">
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="published">Published</option>
            <option value="draft">Draft (hidden)</option>
            {initial && <option value="archived">Archived</option>}
          </select>
        </Field>
        <Field label="Publish at" hint="Leave empty = now">
          <input className={inputCls} type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
        </Field>
        <Field label="Expires at" hint="Optional">
          <input className={inputCls} type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </Field>
      </div>

      <AudienceFields value={aud} onChange={setAud} restricted={restricted} />

      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} /> Pin to top
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /> Also send by email
        </label>
      </div>

      <div className="flex gap-3">
        <button className={btn.primary} disabled={busy}>{busy ? "Saving…" : initial ? "Save changes" : "Create announcement"}</button>
        <button type="button" className={btn.secondary} onClick={() => router.push("/announcements")}>Cancel</button>
      </div>
    </form>
  );
}
