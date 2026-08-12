"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { API_URL } from "@/lib/config";
import { money } from "@/lib/cart";
import { adminGql } from "@/lib/admin";
import { ADMIN_FORCE, LIQUOR_MENUS } from "@/lib/queries";

export default function AdminPricingPage() {
  const [menus, setMenus] = useState<any[]>([]);

  async function load() {
    const data = await adminGql<{ menus: any[] }>(LIQUOR_MENUS);
    setMenus(data.menus);
  }

  useEffect(() => {
    load().catch(console.error);
    const socket = io(API_URL, { transports: ["websocket", "polling"] });
    socket.on(
      "price:update",
      (payload: {
        menuId: string;
        currentPrice: number;
        lowestPrice: number;
        highestPrice: number;
      }) => {
        setMenus((prev) =>
          prev.map((menu) =>
            menu.id === payload.menuId
              ? {
                  ...menu,
                  currentPrice: payload.currentPrice,
                  lowestPrice: payload.lowestPrice,
                  highestPrice: payload.highestPrice,
                }
              : menu,
          ),
        );
      },
    );
    return () => {
      socket.disconnect();
    };
  }, []);

  async function force(menuId: string, action: string) {
    try {
      await adminGql(ADMIN_FORCE, { menuId, action });
      toast.success(action.replace("_", " ").toLowerCase());
      await load();
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
          Liquor pricing
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Force max, force cool-down, or pause bidding per item.
        </p>
      </div>

      <div className="grid gap-4">
        {menus.map((menu) => (
          <div
            key={menu.id}
            className="surface-card flex flex-col gap-4 rounded-2xl p-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div
                className="text-xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {menu.name}
              </div>
              <div className="mt-1 text-2xl text-[var(--ink)] font-bold">
                {money(Number(menu.currentPrice ?? menu.fixedPrice))}
              </div>
              <div className="text-xs text-[var(--muted)]">
                Min {money(Number(menu.lowestPrice))} · Max{" "}
                {money(Number(menu.highestPrice))} · Step{" "}
                {money(Number(menu.step || 0.5))} ·{" "}
                {menu.pricingEnabled ? "Live" : "Paused"}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn btn-primary !px-3 !py-2 text-sm"
                onClick={() => force(menu.id, "FORCE_MAX")}
              >
                Force max
              </button>
              <button
                className="btn btn-secondary !px-3 !py-2 text-sm"
                onClick={() => force(menu.id, "FORCE_COOLDOWN")}
              >
                Force cool-down
              </button>
              <button
                className="btn btn-secondary !px-3 !py-2 text-sm"
                onClick={() =>
                  force(menu.id, menu.pricingEnabled ? "PAUSE" : "RESUME")
                }
              >
                {menu.pricingEnabled ? "Pause" : "Resume"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
