"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import { usePagedSearch } from "@/lib/admin-list";
import {
  DELETE_TABLE,
  STORE_TABLE,
  TABLES_QUERY,
  UPDATE_TABLE,
} from "@/lib/queries";
import {
  AdminPagination,
  AdminSearchBar,
} from "@/components/admin/AdminListControls";

type TableRow = { id: string; name: string; isActive: boolean };

export default function AdminSettingsTablesPage() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<TableRow | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";

  const getSearchText = useCallback(
    (table: TableRow) =>
      [table.name, table.isActive ? "active" : "inactive"].join(" "),
    [],
  );
  const list = usePagedSearch(tables, getSearchText);

  async function load() {
    const data = await adminGql<{ tables: TableRow[] }>(TABLES_QUERY);
    setTables(data.tables);
    setSelected((current) =>
      current
        ? data.tables.find((t) => t.id === current.id) || null
        : current,
    );
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function addTable() {
    if (!name.trim()) return;
    try {
      await adminGql(STORE_TABLE, {
        input: { name: name.trim(), isActive: true },
      });
      setName("");
      await load();
      toast.success("Table created");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  }

  function startEdit(table: TableRow) {
    setEditingId(table.id);
    setEditName(table.name);
    setEditActive(table.isActive);
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return toast.error("Name is required");
    try {
      await adminGql(UPDATE_TABLE, {
        id,
        input: { name: editName.trim(), isActive: editActive },
      });
      setEditingId(null);
      await load();
      toast.success("Table updated");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  }

  async function removeTable(id: string) {
    try {
      await adminGql(DELETE_TABLE, { id });
      if (selected?.id === id) setSelected(null);
      if (editingId === id) setEditingId(null);
      await load();
      toast.success("Deleted");
    } catch (err: any) {
      toast.error(
        err.message?.includes("Foreign key")
          ? "This table has orders — deactivate it instead of deleting."
          : err.message || "Failed",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Tables
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Add, edit, or remove tables. Print a QR that opens `/t/[tableId]` and
          auto-selects the table at checkout.
        </p>
      </div>

      <div className="surface-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row">
        <input
          className="input"
          placeholder="Table name e.g. E1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTable();
          }}
        />
        <button className="btn btn-primary shrink-0" onClick={addTable}>
          Add table
        </button>
      </div>

      <div className="max-w-xl">
        <AdminSearchBar
          value={list.query}
          onChange={list.setQuery}
          placeholder="Search tables…"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          {list.total === 0 ? (
            <div className="surface-card rounded-2xl p-5 text-sm text-[var(--muted)]">
              {tables.length === 0
                ? "No tables yet. Add one to start taking QR orders."
                : "No matches for that search."}
            </div>
          ) : (
            list.pageItems.map((table) => (
              <div
                key={table.id}
                className="surface-card space-y-3 rounded-2xl p-4"
              >
                {editingId === table.id ? (
                  <div className="space-y-3">
                    <input
                      className="input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                      />
                      Active (shown at checkout)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="btn btn-primary !px-3 !py-2 text-sm"
                        onClick={() => saveEdit(table.id)}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-secondary !px-3 !py-2 text-sm"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{table.name}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {table.isActive ? "Active" : "Inactive"}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="btn btn-secondary !px-3 !py-2 text-sm"
                        onClick={() => setSelected(table)}
                      >
                        QR
                      </button>
                      <button
                        className="btn btn-secondary !px-3 !py-2 text-sm"
                        onClick={() => startEdit(table)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger !px-3 !py-2 text-sm"
                        onClick={() => removeTable(table.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <AdminPagination
            page={list.page}
            totalPages={list.totalPages}
            total={list.total}
            onPageChange={list.setPage}
          />
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
