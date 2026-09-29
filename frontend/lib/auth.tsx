"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { api, clearToken, getToken, setToken } from "./api";
import type { User } from "./types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api<{ user: User }>("/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const loadMe = useCallback(async () => {
    const r = await api<{ user: User }>("/auth/me");
    setUser(r.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const r = await api<{ token: string }>("/auth/login", { method: "POST", body: { email, password } });
      setToken(r.token);
      await loadMe();
    },
    [loadMe]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const r = await api<{ token: string }>("/auth/register", { method: "POST", body: { name, email, password } });
      setToken(r.token);
      await loadMe();
    },
    [loadMe]
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    window.location.href = "/login";
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}

// For pages inside the protected layout (AppShell only renders them when logged in)
export function useUser(): User {
  return useAuth().user as User;
}
