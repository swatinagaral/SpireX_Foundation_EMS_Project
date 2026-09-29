"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Guard from "@/components/Guard";
import AnnouncementForm from "@/components/AnnouncementForm";
import { Alert, Loading, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { errMsg } from "@/lib/format";
import type { Announcement } from "@/lib/types";

export default function EditAnnouncementPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<Announcement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ announcement: Announcement }>(`/announcements/${params.id}`)
      .then((r) => setItem(r.announcement))
      .catch((e) => setError(errMsg(e)));
  }, [params.id]);

  return (
    <Guard perm="announcements.update">
      <PageHeader title="Edit announcement" />
      {error && <Alert>{error}</Alert>}
      {!item && !error && <Loading />}
      {item && <AnnouncementForm initial={item} />}
    </Guard>
  );
}
