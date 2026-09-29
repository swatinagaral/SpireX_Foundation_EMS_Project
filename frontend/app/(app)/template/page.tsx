"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { errMsg } from "@/lib/format";
import type { Template } from "@/lib/types";
import Guard from "@/components/Guard";
import { Alert, Badge, btn, Empty, Field, inputCls, Loading, Modal, PageHeader } from "@/components/ui";

const CATEGORIES = ["general", "welcome", "application", "offer_letter", "certificate", "announcement", "reminder", "other"];

interface FormState { name: string; key: string; category: string; subject: string; body: string; isActive: boolean }
const blank: FormState = { name: "", key: "", category: "general", subject: "", body: "", isActive: true };

export default function TemplatesPage() {
  const [items, setItems] = useState<Template[] | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<{ id?: string } | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [formErr, setFormErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ t: Template; vars: Record<string, string>; html: string; subject: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ templates: Template[] }>("/email-templates");
      setItems(r.templates);
      setError("");
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(blank); setFormErr(""); setEditing({}); };

  const openEdit = async (id: string) => {
    try {
      const r = await api<{ template: Template }>(`/email-templates/${id}`);
      const t = r.template;
      setForm({ name: t.name, key: t.key, category: t.category, subject: t.subject, body: t.body || "", isActive: t.isActive });
      setFormErr("");
      setEditing({ id });
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormErr("");
    try {
      if (editing?.id) await api(`/email-templates/${editing.id}`, { method: "PATCH", body: form });
      else await api("/email-templates", { method: "POST", body: form });
      setEditing(null);
      load();
    } catch (err) {
      setFormErr(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (t: Template) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    try {
      await api(`/email-templates/${t._id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const runPreview = async (t: Template, vars: Record<string, string>) => {
    try {
      const r = await api<{ preview: { html: string; subject: string } }>(`/email-templates/${t._id}/preview`, {
        method: "POST",
        body: { variables: vars },
      });
      setPreview({ t, vars, html: r.preview.html, subject: r.preview.subject });
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <Guard perm="emails.template">
      <PageHeader
        title="Email templates"
        subtitle="Reusable emails. Use {{name}}, {{email}} or any {{variable}}."
        actions={<button className={btn.primary} onClick={openNew}>+ New template</button>}
      />
      {error && <Alert>{error}</Alert>}
      {!items && !error && <Loading />}
      {items && items.length === 0 && <Empty>No templates yet.</Empty>}
      {items && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Key</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Variables</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((t) => (
                <tr key={t._id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{t.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{t.key}</td>
                  <td className="px-3 py-2 capitalize text-slate-600">{t.category.replace("_", " ")}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{t.variables.join(", ") || "—"}</td>
                  <td className="px-3 py-2"><Badge tone={t.isActive ? "green" : "gray"}>{t.isActive ? "active" : "inactive"}</Badge></td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1.5">
                      <button className={btn.small} onClick={() => runPreview(t, {})}>Preview</button>
                      <button className={btn.small} onClick={() => openEdit(t._id)}>Edit</button>
                      <button className={btn.danger + " !px-2 !py-1 !text-xs"} onClick={() => remove(t)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit template" : "New template"} wide>
        <form onSubmit={save} className="space-y-3">
          {formErr && <Alert>{formErr}</Alert>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input className={inputCls} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Key" hint="a-z, 0-9, _  (used by code, e.g. offer_letter)">
              <input className={inputCls} required value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase() })} />
            </Field>
            <Field label="Category">
              <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active
            </label>
          </div>
          <Field label="Subject">
            <input className={inputCls} required maxLength={200} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </Field>
          <Field label="Body (HTML)">
            <textarea className={`${inputCls} font-mono`} required rows={9} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </Field>
          <div className="flex gap-3">
            <button className={btn.primary} disabled={busy}>{busy ? "Saving…" : "Save template"}</button>
            <button type="button" className={btn.secondary} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Preview" wide>
        {preview && (
          <div className="space-y-3 text-sm">
            {preview.t.variables.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {preview.t.variables.map((v) => (
                  <Field key={v} label={`{{${v}}}`}>
                    <input
                      className={inputCls}
                      value={preview.vars[v] || ""}
                      onChange={(e) => setPreview({ ...preview, vars: { ...preview.vars, [v]: e.target.value } })}
                    />
                  </Field>
                ))}
              </div>
            )}
            <button className={btn.secondary} onClick={() => runPreview(preview.t, preview.vars)}>Update preview</button>
            <div><span className="text-slate-500">Subject:</span> <b>{preview.subject}</b></div>
            <iframe title="Template preview" sandbox="" srcDoc={preview.html} className="h-72 w-full rounded-lg border border-slate-200" />
          </div>
        )}
      </Modal>
    </Guard>
  );
}
