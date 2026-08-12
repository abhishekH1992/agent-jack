"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import { DELETE_TABLE, STORE_TABLE, TABLES_QUERY } from "@/lib/queries";

export default function AdminTablesPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  async function load() {
    const data = await adminGql<{ tables: any[] }>(TABLES_QUERY);
    setTables(data.tables);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function addTable() {
    if (!name.trim()) return;
    try {
      await adminGql(STORE_TABLE, { input: { name: name.trim(), isActive: true } });
      setName("");
      await load();
      toast.success("Table created");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  }

  async function removeTable(id: string) {
    try {
      await adminGql(DELETE_TABLE, { id });
      if (selected?.id === id) setSelected(null);
      await load();
      toast.success("Deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Tables & QR
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Print a QR that opens `/t/[tableId]` and auto-selects the table.
        </p>
      </div>

      <div className="surface-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row">
        <input
          className="input"
          placeholder="Table name e.g. E1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn btn-primary shrink-0" onClick={addTable}>
          Add table
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          {tables.map((table) => (
            <div
              key={table.id}
              className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
            >
              <div>
                <div className="font-semibold">{table.name}</div>
                <div className="text-xs text-[var(--muted)]">{table.id}</div>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary !px-3 !py-2 text-sm"
                  onClick={() => setSelected(table)}
                >
                  QR
                </button>
                <button
                  className="btn btn-danger !px-3 !py-2 text-sm"
                  onClick={() => removeTable(table.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="surface-card rounded-2xl p-5">
          {selected ? (
            <div className="text-center">
              <div className="mb-3 font-semibold">Table {selected.name}</div>
              <div className="mx-auto inline-block rounded-xl bg-white p-3">
                <QRCodeSVG value={`${origin}/t/${selected.id}`} size={180} />
              </div>
              <p className="mt-3 break-all text-xs text-[var(--muted)]">
                {origin}/t/{selected.id}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Select a table to preview its QR code.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
