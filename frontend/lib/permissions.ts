import type { Role } from "./types";

// Mirror of backend/config/permission.js (only used to show/hide UI; the backend enforces the real rules)
const permissions: Record<Role, string[]> = {
  super_admin: ["*"],
  admin: [
    "announcements.create", "announcements.read", "announcements.update", "announcements.delete",
    "emails.send", "emails.bulk", "emails.template", "emails.history",
    "reports.view", "reports.export",
  ],
  hr: [
    "announcements.create", "announcements.read", "announcements.update",
    "emails.send", "emails.template", "emails.history",
    "reports.view", "reports.export",
  ],
  coordinator: [
    "announcements.create", "announcements.read", "announcements.update",
    "emails.send", "emails.bulk", "emails.history",
    "reports.view",
  ],
  employee: ["announcements.read", "reports.view"],
  student: ["announcements.read"],
};

export const can = (role: Role | undefined, perm: string): boolean => {
  if (!role) return false;
  const list = permissions[role] || [];
  return list.includes("*") || list.includes(perm);
};

export const ROLES: Role[] = ["super_admin", "admin", "hr", "coordinator", "employee", "student"];
export const ORG_WIDE: Role[] = ["super_admin", "admin", "hr"];
