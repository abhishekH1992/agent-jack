"use client";

import Cookies from "js-cookie";
import { gql } from "./graphql";
import { CREATE_CART, GET_CART } from "./queries";

const CART_KEY = "cartId";
const TABLE_KEY = "tableId";
const GUEST_KEY = "guestId";
const SESSION_KEY = "bidSessionId";

export function getCartId() {
  return Cookies.get(CART_KEY) || null;
}

export function setCartId(id: string) {
  Cookies.set(CART_KEY, id, { expires: 1 });
}

export function clearCartId() {
  Cookies.remove(CART_KEY);
}

export function getTableId() {
  return Cookies.get(TABLE_KEY) || null;
}

export function setTableId(id: string) {
  Cookies.set(TABLE_KEY, id, { expires: 7 });
}

export function getGuestId() {
  let id = Cookies.get(GUEST_KEY);
  if (!id) {
    id = crypto.randomUUID();
    Cookies.set(GUEST_KEY, id, { expires: 30 });
  }
  return id;
}

export function getBidSessionId() {
  let id = Cookies.get(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    Cookies.set(SESSION_KEY, id, { expires: 1 });
  }
  return id;
}

export async function ensureCart() {
  const existing = getCartId();
  if (existing) {
    try {
      const data = await gql<{ getCart: { id: string } | null }>(GET_CART, {
        id: existing,
      });
      if (data.getCart) return data.getCart.id;
    } catch {
      // recreate
    }
  }

  const data = await gql<{ createCart: { id: string } }>(CREATE_CART, {
    input: {
      tableId: getTableId() || undefined,
      guestId: getGuestId(),
    },
  });
  setCartId(data.createCart.id);
  return data.createCart.id;
}

export function cartTotal(
  items: {
    quantity: number;
    salePrice: number;
    addons?: { menuAddon: { price: number } }[];
  }[],
) {
  return items.reduce((sum, item) => {
    const addons =
      item.addons?.reduce((s, a) => s + Number(a.menuAddon.price), 0) || 0;
    return sum + (Number(item.salePrice) + addons) * item.quantity;
  }, 0);
}

export function money(n: number) {
  return `$${n.toFixed(2)}`;
}
