"use client";

import { ReactNode } from "react";
import { useUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Alert } from "./ui";

// Shows the page only if the user has (any of) the permission(s)
export default function Guard({ perm, children }: { perm: string | string[]; children: ReactNode }) {
  const user = useUser();
  const list = Array.isArray(perm) ? perm : [perm];
  if (!list.some((p) => can(user.role, p))) {
    return <Alert type="error">Access denied. You do not have permission to open this page.</Alert>;
  }
  return <>{children}</>;
}
