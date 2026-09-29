"use client";

import Guard from "@/components/Guard";
import AnnouncementForm from "@/components/AnnouncementForm";
import { PageHeader } from "@/components/ui";

export default function NewAnnouncementPage() {
  return (
    <Guard perm="announcements.create">
      <PageHeader title="New announcement" subtitle="Choose who should see it." />
      <AnnouncementForm />
    </Guard>
  );
}
