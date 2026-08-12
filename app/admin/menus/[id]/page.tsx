"use client";

import { useParams } from "next/navigation";
import { MenuEditor } from "@/components/admin/MenuEditor";

export default function AdminEditMenuPage() {
  const params = useParams<{ id: string }>();
  return <MenuEditor menuId={params.id} />;
}
