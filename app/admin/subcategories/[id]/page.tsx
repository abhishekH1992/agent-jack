"use client";

import { useParams } from "next/navigation";
import { SubcategoryEditor } from "@/components/admin/SubcategoryEditor";

export default function AdminEditSubcategoryPage() {
  const params = useParams<{ id: string }>();
  return <SubcategoryEditor subcategoryId={params.id} />;
}
