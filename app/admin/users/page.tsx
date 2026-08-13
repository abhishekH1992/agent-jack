"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import { usePagedSearch } from "@/lib/admin-list";
import { ADMIN_USERS_QUERY } from "@/lib/queries";
import {
  AdminPagination,
  AdminSearchBar,
} from "@/components/admin/AdminListControls";

type AdminUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  createdAt: string;
  pointsBalance: number;
  stampsBalance: number;
  stampsRequired: number;
  readyCount: number;
  orderCount: number;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const getSearchText = useCallback(
    (user: AdminUser) =>
      [user.name, user.email, user.role].filter(Boolean).join(" "),
    [],
  );
  const list = usePagedSearch(users, getSearchText);

  useEffect(() => {
    adminGql<{ adminUsers: AdminUser[] }>(ADMIN_USERS_QUERY)
      .then((data) => setUsers(data.adminUsers))
      .catch((err) => toast.error(err.message || "Could not load users"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Users
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Member rewards and order history.
        </p>
      </div>

      <div className="max-w-xl">
        <AdminSearchBar
          value={list.query}
          onChange={list.setQuery}
          placeholder="Search by name or email…"
        />
      </div>

      {loading ? (
        <div className="surface-card rounded-2xl p-6 text-sm text-[var(--muted)]">
          Loading users…
        </div>
      ) : list.total === 0 ? (
        <div className="surface-card rounded-2xl p-6 text-sm text-[var(--muted)]">
          {users.length === 0
            ? "No signed-in users yet."
            : "No users match that search."}
        </div>
      ) : (
        <div className="surface-card overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Points</th>
                <th className="px-4 py-3">Stamps</th>
                <th className="px-4 py-3">Rewards ready</th>
                <th className="px-4 py-3">Orders</th>
              </tr>
            </thead>
            <tbody>
              {list.pageItems.map((user) => (
                <tr key={user.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="font-semibold hover:underline"
                    >
                      {user.name || "Unnamed"}
                    </Link>
                    {user.role === "admin" ? (
                      <span className="ml-2 text-[11px] font-bold uppercase text-[var(--muted)]">
                        admin
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {user.email || "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {user.pointsBalance}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {user.stampsBalance} / {user.stampsRequired}
                  </td>
                  <td className="px-4 py-3">
                    {user.readyCount > 0 ? (
                      <span className="font-bold text-[var(--brand)]">
                        {user.readyCount} free stamp
                        {user.readyCount === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{user.orderCount}</td>
                </tr>
              ))}
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
