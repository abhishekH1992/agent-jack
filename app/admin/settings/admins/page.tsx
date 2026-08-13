"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import { usePagedSearch } from "@/lib/admin-list";
import { isSuperAdminRole, roleLabel } from "@/lib/roles";
import { ADMINS_QUERY, DELETE_ADMIN, STORE_ADMIN } from "@/lib/queries";
import {
  AdminPagination,
  AdminSearchBar,
} from "@/components/admin/AdminListControls";

type AdminRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  createdAt: string;
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function AdminSettingsAdminsPage() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const getSearchText = useCallback(
    (admin: AdminRow) =>
      [admin.name, admin.email, admin.role].filter(Boolean).join(" "),
    [],
  );
  const list = usePagedSearch(admins, getSearchText);

  async function load() {
    const data = await adminGql<{ admins: AdminRow[] }>(ADMINS_QUERY);
    setAdmins(data.admins);
  }

  useEffect(() => {
    load()
      .catch((err) => toast.error(err.message || "Could not load admins"))
      .finally(() => setLoading(false));
  }, []);

  async function addAdmin() {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      return toast.error("Name, email, and password are required");
    }
    setSaving(true);
    try {
      await adminGql(STORE_ADMIN, { input: form });
      setForm(emptyForm);
      await load();
      toast.success("Admin created");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeAdmin(admin: AdminRow) {
    if (isSuperAdminRole(admin.role)) return;
    if (!confirm(`Remove admin access for ${admin.email || admin.name}?`)) {
      return;
    }
    setRemovingId(admin.id);
    try {
      await adminGql(DELETE_ADMIN, { id: admin.id });
      await load();
      toast.success("Admin removed");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Admin
        </h1>
        <p className="text-sm text-[var(--muted)]">
          People who can sign in to the admin panel. Superadmin cannot be
          deleted.
        </p>
      </div>

      <div className="surface-card space-y-3 rounded-2xl p-4">
        <h2 className="font-semibold">Create admin</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="input"
            placeholder="Name"
            autoComplete="off"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Email"
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <input
            className="input sm:col-span-2"
            placeholder="Password (min 8 characters)"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") addAdmin();
            }}
          />
        </div>
        <button
          className="btn btn-primary"
          disabled={saving}
          onClick={addAdmin}
        >
          {saving ? "Creating…" : "Create admin"}
        </button>
      </div>

      <div className="max-w-xl">
        <AdminSearchBar
          value={list.query}
          onChange={list.setQuery}
          placeholder="Search admins…"
        />
      </div>

      {loading ? (
        <div className="surface-card rounded-2xl p-6 text-sm text-[var(--muted)]">
          Loading admins…
        </div>
      ) : list.total === 0 ? (
        <div className="surface-card rounded-2xl p-6 text-sm text-[var(--muted)]">
          {admins.length === 0
            ? "No admins yet."
            : "No admins match that search."}
        </div>
      ) : (
        <div className="surface-card overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Added</th>
                <th className="px-4 py-3 text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {list.pageItems.map((admin) => {
                const locked = isSuperAdminRole(admin.role);
                return (
                  <tr
                    key={admin.id}
                    className="border-b border-[var(--line)] last:border-0"
                  >
                    <td className="px-4 py-3 font-semibold">
                      {admin.name || "Unnamed"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {admin.email || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                        {roleLabel(admin.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {formatWhen(admin.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {locked ? (
                        <span className="text-xs text-[var(--muted)]">
                          Cannot delete
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="text-sm font-semibold text-[var(--danger)] disabled:opacity-50"
                          disabled={removingId === admin.id}
                          onClick={() => removeAdmin(admin)}
                        >
                          {removingId === admin.id ? "Removing…" : "Delete"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 pb-4">
            <AdminPagination
              page={list.page}
              totalPages={list.totalPages}
              total={list.total}
              onPageChange={list.setPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
