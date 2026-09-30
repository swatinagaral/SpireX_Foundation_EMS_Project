export type Role = "super_admin" | "admin" | "hr" | "coordinator" | "employee" | "student";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  batches?: string[];
  programs?: string[];
  departments?: string[];
  createdAt?: string;
}

export interface Audience {
  all: boolean;
  roles: string[];
  batches: string[];
  programs: string[];
  departments: string[];
}

export type Priority = "low" | "medium" | "high" | "urgent";
export type AnnouncementStatus = "draft" | "published" | "archived";

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  priority: Priority;
  audience: Audience;
  isPinned: boolean;
  status: AnnouncementStatus;
  publishAt: string;
  expiresAt?: string;
  sendEmail: boolean;
  createdAt: string;
  createdBy?: { name: string; role: string } | null;
  isRead?: boolean;
  readCount?: number;
}

export type EmailStatus = "queued" | "sending" | "sent" | "failed" | "cancelled";

export interface EmailLog {
  _id: string;
  to: { email: string; name?: string };
  subject: string;
  html?: string;
  type: "single" | "bulk" | "automated" | "announcement";
  status: EmailStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  scheduledAt: string;
  sentAt?: string;
  createdAt: string;
  bulkId?: string;
  sentBy?: { name: string; role: string } | null;
}

export interface Template {
  _id: string;
  name: string;
  key: string;
  category: string;
  subject: string;
  body?: string;
  variables: string[];
  isActive: boolean;
}

export interface Paged {
  total: number;
  page: number;
  pages: number;
}
