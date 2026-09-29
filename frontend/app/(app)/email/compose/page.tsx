"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { errMsg, toIso } from "@/lib/format";
import type { Template } from "@/lib/types";
import Guard from "@/components/Guard";
import AudienceFields, { AudienceState, buildAudience, emptyAudience } from "@/components/AudienceFields";
import { Alert, btn, Card, Field, inputCls, PageHeader } from "@/components/ui";

export default function ComposePage() {
  const user = useUser();
  const canBulk = can(user.role, "emails.bulk");
  const restricted = user.role === "coordinator";

  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [to, setTo] = useState("");
  const [userId, setUserId] = useState("");
  const [aud, setAud] = useState<AudienceState>(emptyAudience);
  const [schedule, setSchedule] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ templates: Template[] }>("/email-templates", { query: { active: "true" } })
      .then((r) => setTemplates(r.templates))
      .catch(() => {});
  }, []);

  const selected = templates.find((t) => t._id === templateId);
  const varNames = (selected?.variables || []).filter((v) => v !== "name" && v !== "email");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setOk("");
    setBusy(true);
    try {
      const content = templateId ? { templateId } : { subject, body };
      const variables = Object.fromEntries(Object.entries(vars).filter(([, v]) => v.trim() !== ""));
      const common = { ...content, variables, scheduledAt: toIso(schedule) };

      if (mode === "single") {
        await api("/emails/send", {
          method: "POST",
          body: { to: to.trim() || undefined, userId: userId.trim() || undefined, ...common },
        });
        setOk("Email queued. It will be sent in a few seconds.");
        setTo("");
        setUserId("");
      } else {
        const r = await api<{ message: string }>("/emails/bulk", {
          method: "POST",
          body: { recipients: buildAudience(aud, true), ...common },
        });
        setOk(r.message + ". They will be sent in batches.");
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Guard perm="emails.send">
      <PageHeader
        title="Compose email"
        subtitle="Emails go into a queue and are delivered in the background."
        actions={<Link href="/emails/history" className={btn.secondary}>View history</Link>}
      />

      {canBulk && (
        <div className="mb-4 inline-flex rounded-lg border border-slate-300 bg-white p-1 text-sm">
          {(["single", "bulk"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-4 py-1.5 font-medium ${mode === m ? "bg-indigo-600 text-white" : "text-slate-600"}`}
            >
              {m === "single" ? "Single email" : "Bulk email"}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="max-w-2xl space-y-4">
        {error && <Alert>{error}</Alert>}
        {ok && (
          <Alert type="success">
            {ok} <Link href="/emails/history" className="font-medium underline">Check status</Link>
          </Alert>
        )}

        {mode === "single" ? (
          <Card className="space-y-3">
            <Field label="To (email)">
              <input className={inputCls} type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="student@example.com" />
            </Field>
            <Field
              label="…or User ID"
              hint={restricted ? "Coordinators must use a User ID (of a user in their batch/program)." : "Optional. Fills name & email automatically."}
            >
              <input className={inputCls} value={userId} onChange={(e) => setUserId(e.target.value)} />
            </Field>
          </Card>
        ) : (
          <AudienceFields value={aud} onChange={setAud} restricted={restricted} allowExplicit />
        )}

        <Field label="Template">
          <select className={inputCls} value={templateId} onChange={(e) => { setTemplateId(e.target.value); setVars({}); }}>
            <option value="">— Write custom email —</option>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>{t.name} ({t.key})</option>
            ))}
          </select>
        </Field>

        {templateId ? (
          <Card className="space-y-3">
            <div className="text-sm text-slate-600">
              Subject: <b>{selected?.subject}</b>
            </div>
            {varNames.length === 0 && (
              <p className="text-xs text-slate-500">No extra variables. {"{{name}}"} and {"{{email}}"} are filled per recipient.</p>
            )}
            {varNames.map((v) => (
              <Field key={v} label={`{{${v}}}`}>
                <input className={inputCls} value={vars[v] || ""} onChange={(e) => setVars({ ...vars, [v]: e.target.value })} />
              </Field>
            ))}
          </Card>
        ) : (
          <>
            <Field label="Subject" hint="You can use {{name}} and {{email}}.">
              <input className={inputCls} required maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Field label="Body (HTML allowed)" hint="Example: <p>Hello {{name}},</p><p>Your message…</p>">
              <textarea className={inputCls} required rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
          </>
        )}

        <Field label="Schedule (optional)" hint="Leave empty to send now.">
          <input className={inputCls} type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
        </Field>

        <button className={btn.primary} disabled={busy}>
          {busy ? "Queuing…" : mode === "single" ? "Send email" : "Send bulk email"}
        </button>
      </form>
    </Guard>
  );
}
