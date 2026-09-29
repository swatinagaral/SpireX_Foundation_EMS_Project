"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { errMsg } from "@/lib/format";
import { Alert, btn, Field, inputCls } from "@/components/ui";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(name.trim(), email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-indigo-700">Create account</h1>
          <p className="text-sm text-slate-500">New accounts are created as students. An admin can change your role.</p>
        </div>
        {error && <Alert>{error}</Alert>}
        <Field label="Full name">
          <input className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" hint="At least 8 characters">
          <input className={inputCls} type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <button className={`${btn.primary} w-full`} disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
        <p className="text-center text-sm text-slate-500">
          Already have an account? <Link href="/login" className="font-medium text-indigo-600 hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
