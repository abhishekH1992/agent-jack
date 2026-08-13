"use client";

import { useParams } from "next/navigation";
import { PageEditor } from "@/components/admin/PageEditor";

export default function AdminEditPagePage() {
  const params = useParams<{ id: string }>();
  return <PageEditor pageId={params.id} />;
}
