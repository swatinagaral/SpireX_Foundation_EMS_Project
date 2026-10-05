"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { errMsg, fmtDate, toIso } from "@/lib/format";
import type { Attendance, Batch, Certificate, Performance, Program, Student, Task } from "@/lib/types";
import Guard from "@/components/Guard";
import { Alert, Badge, btn, Card, Empty, Field, inputCls, Loading, PageHeader } from "@/components/ui";

type ListRes<K extends string, T> = { total: number } & Record<K, T[]>;

// ---------- shared data (programs/batches/students/tasks feed the dropdowns) ----------

function useOptions() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const [p, b, s, t] = await Promise.all([
        api<ListRes<"items", Program>>("/data/programs", { query: { limit: 100 } }),
        api<ListRes<"items", Batch>>("/data/batches", { query: { limit: 100 } }),
        api<ListRes<"items", Student>>("/data/students", { query: { limit: 200 } }),
        api<ListRes<"items", Task>>("/data/tasks", { query: { limit: 200 } }),
      ]);
      setPrograms(p.items);
      setBatches(b.items);
      setStudents(s.items);
      setTasks(t.items);
      setError("");
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { programs, batches, students, tasks, reload, error };
}

const nameOf = (v: { name: string } | string | undefined) => (v && typeof v === "object" ? v.name : "-");
const studentLabel = (v: { name: string; email: string } | string | undefined) =>
  v && typeof v === "object" ? `${v.name} (${v.email})` : "-";

export default function DataPage() {
  const opts = useOptions();
  const [tab, setTab] = useState<"programs" | "batches" | "students" | "tasks" | "attendance" | "performance" | "certificates">("programs");

  const TABS = [
    ["programs", "Programs"], ["batches", "Batches"], ["students", "Students"], ["tasks", "Tasks"],
    ["attendance", "Attendance"], ["performance", "Performance"], ["certificates", "Certificates"],
  ] as const;

  return (
    <Guard perm="data.manage">
      <PageHeader
        title="Data Entry"
        subtitle="Seed Programs, Batches, Students, Tasks, Attendance, Performance and Certificates so Reports have real data."
      />
      {opts.error && <Alert>{opts.error}</Alert>}

      <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === key ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "programs" && <ProgramsTab onChanged={opts.reload} />}
      {tab === "batches" && <BatchesTab programs={opts.programs} onChanged={opts.reload} />}
      {tab === "students" && <StudentsTab programs={opts.programs} batches={opts.batches} onChanged={opts.reload} />}
      {tab === "tasks" && <TasksTab programs={opts.programs} batches={opts.batches} onChanged={opts.reload} />}
      {tab === "attendance" && <AttendanceTab students={opts.students} batches={opts.batches} />}
      {tab === "performance" && <PerformanceTab students={opts.students} programs={opts.programs} batches={opts.batches} tasks={opts.tasks} />}
      {tab === "certificates" && <CertificatesTab students={opts.students} />}
    </Guard>
  );
}

// ---------- generic list/delete shell ----------

function Section<T extends { _id: string }>({
  title, form, columns, rows, loading, error, onDelete,
}: {
  title: string;
  form: React.ReactNode;
  columns: { label: string; render: (row: T) => React.ReactNode }[];
  rows: T[] | null;
  loading: boolean;
  error: string;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Add {title}</h3>
        {form}
      </Card>
      <div>
        {error && <Alert>{error}</Alert>}
        {loading && <Loading />}
        {rows && rows.length === 0 && <Empty>No {title.toLowerCase()} records yet.</Empty>}
        {rows && rows.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {columns.map((c) => <th key={c.label} className="px-3 py-2">{c.label}</th>)}
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row._id}>
                    {columns.map((c) => <td key={c.label} className="px-3 py-2 text-slate-700">{c.render(row)}</td>)}
                    <td className="px-3 py-2 text-right">
                      <button className={btn.small} onClick={() => onDelete(row._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Programs ----------

function ProgramsTab({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<Program[] | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setRows((await api<ListRes<"items", Program>>("/data/programs", { query: { limit: 100 } })).items); }
    catch (e) { setError(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api("/data/programs", { method: "POST", body: { name, status } });
      setName("");
      load(); onChanged();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this program?")) return;
    try { await api(`/data/programs/${id}`, { method: "DELETE" }); load(); onChanged(); }
    catch (e) { setError(errMsg(e)); }
  };

  return (
    <Section<Program>
      title="Program"
      error={error}
      loading={!rows}
      rows={rows}
      onDelete={remove}
      columns={[
        { label: "Name", render: (r) => r.name },
        { label: "Status", render: (r) => <Badge tone={r.status === "active" ? "green" : "gray"}>{r.status}</Badge> },
      ]}
      form={
        <form onSubmit={submit} className="space-y-3">
          <Field label="Name"><input className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          <button className={btn.primary} disabled={busy}>{busy ? "Saving…" : "Add program"}</button>
        </form>
      }
    />
  );
}

// ---------- Batches ----------

function BatchesTab({ programs, onChanged }: { programs: Program[]; onChanged: () => void }) {
  const [rows, setRows] = useState<Batch[] | null>(null);
  const [name, setName] = useState("");
  const [program, setProgram] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("upcoming");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setRows((await api<ListRes<"items", Batch>>("/data/batches", { query: { limit: 100 } })).items); }
    catch (e) { setError(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api("/data/batches", { method: "POST", body: { name, program, startDate: toIso(startDate), endDate: toIso(endDate), status } });
      setName(""); setStartDate(""); setEndDate("");
      load(); onChanged();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this batch?")) return;
    try { await api(`/data/batches/${id}`, { method: "DELETE" }); load(); onChanged(); }
    catch (e) { setError(errMsg(e)); }
  };

  return (
    <Section<Batch>
      title="Batch"
      error={error}
      loading={!rows}
      rows={rows}
      onDelete={remove}
      columns={[
        { label: "Name", render: (r) => r.name },
        { label: "Program", render: (r) => nameOf(r.program) },
        { label: "Start", render: (r) => fmtDate(r.startDate) },
        { label: "End", render: (r) => fmtDate(r.endDate) },
        { label: "Status", render: (r) => <Badge tone={r.status === "ongoing" ? "green" : r.status === "completed" ? "amber" : "gray"}>{r.status}</Badge> },
      ]}
      form={
        <form onSubmit={submit} className="space-y-3">
          <Field label="Name"><input className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Program">
            <select className={inputCls} required value={program} onChange={(e) => setProgram(e.target.value)}>
              <option value="">Select…</option>
              {programs.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Start date"><input type="date" className={inputCls} required value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          <Field label="End date"><input type="date" className={inputCls} required value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
          <Field label="Status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          <button className={btn.primary} disabled={busy || !programs.length}>{busy ? "Saving…" : "Add batch"}</button>
          {!programs.length && <p className="text-xs text-amber-700">Add a Program first.</p>}
        </form>
      }
    />
  );
}

// ---------- Students ----------

function StudentsTab({ programs, batches, onChanged }: { programs: Program[]; batches: Batch[]; onChanged: () => void }) {
  const [rows, setRows] = useState<Student[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [program, setProgram] = useState("");
  const [batch, setBatch] = useState("");
  const [status, setStatus] = useState("active");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setRows((await api<ListRes<"items", Student>>("/data/students", { query: { limit: 200 } })).items); }
    catch (e) { setError(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api("/data/students", { method: "POST", body: { name, email, program, batch, status } });
      setName(""); setEmail("");
      load(); onChanged();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this student?")) return;
    try { await api(`/data/students/${id}`, { method: "DELETE" }); load(); onChanged(); }
    catch (e) { setError(errMsg(e)); }
  };

  return (
    <Section<Student>
      title="Student"
      error={error}
      loading={!rows}
      rows={rows}
      onDelete={remove}
      columns={[
        { label: "Name", render: (r) => r.name },
        { label: "Email", render: (r) => r.email },
        { label: "Program", render: (r) => nameOf(r.program) },
        { label: "Batch", render: (r) => nameOf(r.batch) },
        { label: "Status", render: (r) => <Badge tone={r.status === "active" ? "green" : r.status === "dropped" ? "red" : "amber"}>{r.status}</Badge> },
      ]}
      form={
        <form onSubmit={submit} className="space-y-3">
          <Field label="Name"><input className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email"><input type="email" className={inputCls} required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Program">
            <select className={inputCls} required value={program} onChange={(e) => setProgram(e.target.value)}>
              <option value="">Select…</option>
              {programs.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Batch">
            <select className={inputCls} required value={batch} onChange={(e) => setBatch(e.target.value)}>
              <option value="">Select…</option>
              {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
            </select>
          </Field>
          <button className={btn.primary} disabled={busy || !programs.length || !batches.length}>{busy ? "Saving…" : "Add student"}</button>
          {(!programs.length || !batches.length) && <p className="text-xs text-amber-700">Add a Program and Batch first.</p>}
        </form>
      }
    />
  );
}

// ---------- Tasks ----------

function TasksTab({ programs, batches, onChanged }: { programs: Program[]; batches: Batch[]; onChanged: () => void }) {
  const [rows, setRows] = useState<Task[] | null>(null);
  const [title, setTitle] = useState("");
  const [program, setProgram] = useState("");
  const [batch, setBatch] = useState("");
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState("pending");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setRows((await api<ListRes<"items", Task>>("/data/tasks", { query: { limit: 200 } })).items); }
    catch (e) { setError(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api("/data/tasks", { method: "POST", body: { title, program: program || undefined, batch: batch || undefined, domain, status, dueDate: toIso(dueDate) } });
      setTitle(""); setDomain(""); setDueDate("");
      load(); onChanged();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    try { await api(`/data/tasks/${id}`, { method: "DELETE" }); load(); onChanged(); }
    catch (e) { setError(errMsg(e)); }
  };

  return (
    <Section<Task>
      title="Task"
      error={error}
      loading={!rows}
      rows={rows}
      onDelete={remove}
      columns={[
        { label: "Title", render: (r) => r.title },
        { label: "Domain", render: (r) => r.domain || "-" },
        { label: "Batch", render: (r) => nameOf(r.batch) },
        { label: "Due", render: (r) => r.dueDate ? fmtDate(r.dueDate) : "-" },
        { label: "Status", render: (r) => <Badge tone={r.status === "completed" ? "green" : r.status === "in_progress" ? "blue" : "gray"}>{r.status}</Badge> },
      ]}
      form={
        <form onSubmit={submit} className="space-y-3">
          <Field label="Title"><input className={inputCls} required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Domain" hint="e.g. Frontend, Backend, Design"><input className={inputCls} value={domain} onChange={(e) => setDomain(e.target.value)} /></Field>
          <Field label="Program (optional)">
            <select className={inputCls} value={program} onChange={(e) => setProgram(e.target.value)}>
              <option value="">None</option>
              {programs.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Batch (optional)">
            <select className={inputCls} value={batch} onChange={(e) => setBatch(e.target.value)}>
              <option value="">None</option>
              {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Due date (optional)"><input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
          <Field label="Status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          <button className={btn.primary} disabled={busy}>{busy ? "Saving…" : "Add task"}</button>
        </form>
      }
    />
  );
}

// ---------- Attendance ----------

function AttendanceTab({ students, batches }: { students: Student[]; batches: Batch[] }) {
  const [rows, setRows] = useState<Attendance[] | null>(null);
  const [student, setStudent] = useState("");
  const [batch, setBatch] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("present");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setRows((await api<ListRes<"items", Attendance>>("/data/attendance", { query: { limit: 100 } })).items); }
    catch (e) { setError(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api("/data/attendance", { method: "POST", body: { student, batch, date: toIso(date), status } });
      load();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this attendance record?")) return;
    try { await api(`/data/attendance/${id}`, { method: "DELETE" }); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  return (
    <Section<Attendance>
      title="Attendance"
      error={error}
      loading={!rows}
      rows={rows}
      onDelete={remove}
      columns={[
        { label: "Student", render: (r) => studentLabel(r.student) },
        { label: "Batch", render: (r) => nameOf(r.batch) },
        { label: "Date", render: (r) => fmtDate(r.date) },
        { label: "Status", render: (r) => <Badge tone={r.status === "present" ? "green" : r.status === "late" ? "amber" : "red"}>{r.status}</Badge> },
      ]}
      form={
        <form onSubmit={submit} className="space-y-3">
          <Field label="Student">
            <select className={inputCls} required value={student} onChange={(e) => setStudent(e.target.value)}>
              <option value="">Select…</option>
              {students.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Batch">
            <select className={inputCls} required value={batch} onChange={(e) => setBatch(e.target.value)}>
              <option value="">Select…</option>
              {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Date"><input type="date" className={inputCls} required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
            </select>
          </Field>
          <button className={btn.primary} disabled={busy || !students.length || !batches.length}>{busy ? "Saving…" : "Mark attendance"}</button>
          <p className="text-xs text-slate-500">One record per student per day — marking again for the same day will be rejected.</p>
        </form>
      }
    />
  );
}

// ---------- Performance ----------

function PerformanceTab({ students, programs, batches, tasks }: { students: Student[]; programs: Program[]; batches: Batch[]; tasks: Task[] }) {
  const [rows, setRows] = useState<Performance[] | null>(null);
  const [student, setStudent] = useState("");
  const [program, setProgram] = useState("");
  const [batch, setBatch] = useState("");
  const [domain, setDomain] = useState("");
  const [task, setTask] = useState("");
  const [score, setScore] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setRows((await api<ListRes<"items", Performance>>("/data/performance", { query: { limit: 100 } })).items); }
    catch (e) { setError(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api("/data/performance", {
        method: "POST",
        body: { student, program: program || undefined, batch: batch || undefined, domain, task: task || undefined, score: Number(score), remarks },
      });
      setScore(""); setRemarks("");
      load();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this performance record?")) return;
    try { await api(`/data/performance/${id}`, { method: "DELETE" }); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  return (
    <Section<Performance>
      title="Performance"
      error={error}
      loading={!rows}
      rows={rows}
      onDelete={remove}
      columns={[
        { label: "Student", render: (r) => studentLabel(r.student) },
        { label: "Domain", render: (r) => r.domain || "-" },
        { label: "Task", render: (r) => (r.task && typeof r.task === "object" ? r.task.title : "-") },
        { label: "Score", render: (r) => r.score },
      ]}
      form={
        <form onSubmit={submit} className="space-y-3">
          <Field label="Student">
            <select className={inputCls} required value={student} onChange={(e) => setStudent(e.target.value)}>
              <option value="">Select…</option>
              {students.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Program (optional)">
            <select className={inputCls} value={program} onChange={(e) => setProgram(e.target.value)}>
              <option value="">None</option>
              {programs.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Batch (optional)">
            <select className={inputCls} value={batch} onChange={(e) => setBatch(e.target.value)}>
              <option value="">None</option>
              {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Domain" hint="e.g. Frontend, Backend"><input className={inputCls} value={domain} onChange={(e) => setDomain(e.target.value)} /></Field>
          <Field label="Task (optional)">
            <select className={inputCls} value={task} onChange={(e) => setTask(e.target.value)}>
              <option value="">None</option>
              {tasks.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
            </select>
          </Field>
          <Field label="Score (0-100)"><input type="number" min={0} max={100} className={inputCls} required value={score} onChange={(e) => setScore(e.target.value)} /></Field>
          <Field label="Remarks (optional)"><textarea className={inputCls} rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
          <button className={btn.primary} disabled={busy || !students.length}>{busy ? "Saving…" : "Add record"}</button>
        </form>
      }
    />
  );
}

// ---------- Certificates ----------

function CertificatesTab({ students }: { students: Student[] }) {
  const [rows, setRows] = useState<Certificate[] | null>(null);
  const [student, setStudent] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [expiresAt, setExpiresAt] = useState("");
  const [status, setStatus] = useState("issued");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setRows((await api<ListRes<"items", Certificate>>("/data/certificates", { query: { limit: 100 } })).items); }
    catch (e) { setError(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api("/data/certificates", { method: "POST", body: { student, year: Number(year), expiresAt: toIso(expiresAt), status, verified } });
      load();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this certificate?")) return;
    try { await api(`/data/certificates/${id}`, { method: "DELETE" }); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  return (
    <Section<Certificate>
      title="Certificate"
      error={error}
      loading={!rows}
      rows={rows}
      onDelete={remove}
      columns={[
        { label: "Certificate ID", render: (r) => r.certificateId },
        { label: "Student", render: (r) => studentLabel(r.student) },
        { label: "Year", render: (r) => r.year },
        { label: "Status", render: (r) => <Badge tone={r.status === "issued" ? "green" : r.status === "revoked" ? "red" : "amber"}>{r.status}</Badge> },
        { label: "Verified", render: (r) => (r.verified ? <Badge tone="green">Yes</Badge> : <Badge tone="gray">No</Badge>) },
        { label: "Expires", render: (r) => (r.expiresAt ? fmtDate(r.expiresAt) : "-") },
      ]}
      form={
        <form onSubmit={submit} className="space-y-3">
          <Field label="Student">
            <select className={inputCls} required value={student} onChange={(e) => setStudent(e.target.value)}>
              <option value="">Select…</option>
              {students.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Year"><input type="number" className={inputCls} required value={year} onChange={(e) => setYear(e.target.value)} /></Field>
          <Field label="Expires at (optional)"><input type="date" className={inputCls} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></Field>
          <Field label="Status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="issued">Issued</option>
              <option value="revoked">Revoked</option>
              <option value="reworked">Reworked</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} /> Verified
          </label>
          <button className={btn.primary} disabled={busy || !students.length}>{busy ? "Saving…" : "Issue certificate"}</button>
          <p className="text-xs text-slate-500">Certificate ID is generated automatically.</p>
        </form>
      }
    />
  );
}
