"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { setTableId } from "@/lib/cart";

export default function TableBindPage() {
  const params = useParams<{ tableId: string }>();
  const router = useRouter();

  useEffect(() => {
    if (params.tableId) {
      setTableId(params.tableId);
      router.replace("/");
    }
  }, [params.tableId, router]);

  return (
    <div className="page-shell flex min-h-screen items-center justify-center">
      <div className="surface-card rounded-2xl p-8 text-center">
        <p className="text-[var(--muted)]">Setting your table…</p>
      </div>
    </div>
  );
}
