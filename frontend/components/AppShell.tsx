"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { can } from "@/lib/permissions";

const NAV = [
  { href: "/dashboard", label: "Dashboard", perm: null, icon: "🏠" },
  { href: "/users", label: "Users", perm: "users.manage", icon: "👤" },
  { href: "/announcements", label: "Announcements", perm: "announcements.read", icon: "📢" },
  { href: "/emails/compose", label: "Compose Email", perm: "emails.send", icon: "✉️" },
  { href: "/emails/history", label: "Email History", perm: "emails.history", icon: "🕘" },
  { href: "/templates", label: "Email Templates", perm: "emails.template", icon: "📄" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => setOpen(false), [path]);

  const loadUnread = useCallback(() => {
    if (!user || !can(user.role, "announcements.read")) return;
    api<{ unread: number }>("/announcements/unread-count").then((r) => setUnread(r.unread)).catch(() => {});
  }, [user]);

  useEffect(() => {
    loadUnread();
    window.addEventListener("ems:unread-changed", loadUnread);
    return () => window.removeEventListener("ems:unread-changed", loadUnread);
  }, [loadUnread, path]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading…</div>;
  }

  const items = NAV.filter((n) => !n.perm || can(user.role, n.perm));

  return (
    <div className="min-h-screen md:flex">
      {/* mobile top bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <span className="font-semibold text-indigo-700">EMS</span>
        <button onClick={() => setOpen((o) => !o)} className="rounded border border-slate-300 px-2 py-1 text-sm">
          ☰ Menu
        </button>
      </div>

      <aside
        className={`${open ? "block" : "hidden"} w-full shrink-0 border-r border-slate-200 bg-white md:block md:w-60`}
      >
        <div className="hidden px-5 py-5 text-xl font-bold text-indigo-700 md:block">EMS</div>
        <nav className="space-y-1 px-3 pb-4">
        
          {items.map((n) => {
            const active = path === n.href || path.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{n.icon} {n.label}</span>
                {n.href === "/announcements" && unread > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">{unread}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 px-4 py-4 text-sm">
          <div className="font-medium text-slate-800">{user.name}</div>
          <div className="text-xs capitalize text-slate-500">{user.role.replace("_", " ")}</div>
          <button onClick={logout} className="mt-3 text-xs font-medium text-red-600 hover:underline">
            Logout
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
