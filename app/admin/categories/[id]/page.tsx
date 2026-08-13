"use client";

import { useParams } from "next/navigation";
import { CategoryEditor } from "@/components/admin/CategoryEditor";

export default function AdminEditCategoryPage() {
  const params = useParams<{ id: string }>();
  return <CategoryEditor categoryId={params.id} />;
}
