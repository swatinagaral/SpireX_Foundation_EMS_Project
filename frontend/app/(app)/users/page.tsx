"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { errMsg, fmtDate } from "@/lib/format";
import type { Paged, Role, User } from "@/lib/types";
import Guard from "@/components/Guard";
import { Alert, Badge, btn, Empty, Field, inputCls, Loading, Modal, PageHeader, Pagination } from "@/components/ui";

type ListRes = Paged & { users: User[]; assignableRoles: Role[] };

const roleTone: Record<string, "indigo" | "blue" | "green" | "amber" | "gray"> = {
  super_admin: "indigo", admin: "indigo", hr: "blue", coordinator: "green", employee: "amber", student: "gray",
};
const statusTone: Record<string, "green" | "gray" | "red"> = { active: "green", inactive: "gray", suspended: "red" };

export default function UsersPage() {
  return (
    <Guard perm="users.manage">
      <UsersInner />
    </Guard>
  );
}

function UsersInner() {
  const [data, setData] = useState<ListRes | null>(null);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [created, setCreated] = useState<{ email: string; password?: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<ListRes>("/users", { query: { page, role, q: search } }));
      setError("");
    } catch (e) {
      setError(errMsg(e));
    }
  }, [page, role, search]);

  useEffect(() => { load(); }, [load]);

  const changeRole = async (id: string, newRole: string) => {
    try {
      await api(`/users/${id}/role`, { method: "PATCH", body: { role: newRole } });
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const changeStatus = async (u: User) => {
    const next = u.status === "active" ? "inactive" : "active";
    if (!confirm(`Set ${u.name} to "${next}"? ${next === "inactive" ? "They will not be able to log in." : ""}`)) return;
    try {
      await api(`/users/${u._id}/status`, { method: "PATCH", body: { status: next } });
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Users & Roles"
        subtitle="Create accounts for staff and assign roles. Public sign-up always creates a student."
        actions={<button className={btn.primary} onClick={() => setShowCreate(true)}>+ Create user</button>}
      />

      {error && <Alert>{error}</Alert>}

      <div className="mb-4 flex flex-wrap gap-2">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setSearch(q); setPage(1); }}>
          <input className={`${inputCls} max-w-xs`} placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className={btn.secondary}>Search</button>
        </form>
        <select className={`${inputCls} max-w-[10rem]`} value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          {(data?.assignableRoles || []).concat(role && !data?.assignableRoles.includes(role as Role) ? [role as Role] : []).map((r) => (
            <option key={r} value={r}>{r.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      {!data && !error && <Loading />}
      {data && data.users.length === 0 && <Empty>No users found.</Empty>}
      {data && data.users.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Joined</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.users.map((u) => {
                const canEditRole = data.assignableRoles.includes(u.role);
                return (
                  <tr key={u._id}>
                    <td className="px-3 py-2 font-medium text-slate-900">{u.name}</td>
                    <td className="px-3 py-2 text-slate-600">{u.email}</td>
                    <td className="px-3 py-2">
                      {canEditRole ? (
                        <select
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs capitalize"
                          value={u.role}
                          onChange={(e) => changeRole(u._id, e.target.value)}
                        >
                          {data.assignableRoles.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                        </select>
                      ) : (
                        <Badge tone={roleTone[u.role]}>{u.role.replace("_", " ")}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2"><Badge tone={statusTone[u.status]}>{u.status}</Badge></td>
                    <td className="px-3 py-2 text-slate-600">{fmtDate(u.createdAt)}</td>
                    <td className="px-3 py-2 text-right">
                      {canEditRole && (
                        <button className={btn.small} onClick={() => changeStatus(u)}>
                          {u.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}

      <CreateUserModal
        open={showCreate}
        roles={data?.assignableRoles || []}
        onClose={() => setShowCreate(false)}
        onCreated={(info) => { setCreated(info); setShowCreate(false); load(); }}
      />

      <Modal open={!!created} onClose={() => setCreated(null)} title="User created">
        {created && (
          <div className="space-y-2 text-sm">
            <p>Account created for <b>{created.email}</b>.</p>
            {created.password ? (
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Temporary password (share this manually — it will not be shown again):</div>
                <div className="mt-1 font-mono text-base">{created.password}</div>
              </div>
            ) : (
              <p className="text-slate-500">An invite email was queued to this address.</p>
            )}
            <button className={btn.secondary} onClick={() => setCreated(null)}>Close</button>
          </div>
        )}
      </Modal>
    </>
  );
}

function CreateUserModal({
  open, roles, onClose, onCreated,
}: { open: boolean; roles: Role[]; onClose: () => void; onCreated: (info: { email: string; password?: string }) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [sendInviteEmail, setSendInviteEmail] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setName(""); setEmail(""); setRole(roles[0] || "student"); setError(""); } }, [open, roles]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api<{ user: User; temporaryPassword?: string; emailWarning?: string }>("/users", {
        method: "POST",
        body: { name, email, role, sendInviteEmail },
      });
      if (r.emailWarning) alert(`User created, but the invite email failed: ${r.emailWarning}`);
      onCreated({ email: r.user.email, password: r.temporaryPassword });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create user">
      <form onSubmit={submit} className="space-y-3">
        {error && <Alert>{error}</Alert>}
        <Field label="Full name">
          <input className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Role">
          <select className={`${inputCls} capitalize`} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {roles.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sendInviteEmail} onChange={(e) => setSendInviteEmail(e.target.checked)} />
          Email login details to this user
        </label>
        <div className="flex gap-3">
          <button className={btn.primary} disabled={busy}>{busy ? "Creating…" : "Create user"}</button>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
