"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ensureCart, getCartId } from "@/lib/cart";
import { gql } from "@/lib/graphql";
import { GET_CART } from "@/lib/queries";

export type CartItem = {
  id: string;
  quantity: number;
  salePrice: number;
  menu?: {
    id: string;
    name: string;
    image?: string | null;
    pricingEnabled?: boolean;
  } | null;
  menuVariant?: { id: string; name: string } | null;
  combo?: { id: string; name: string; image?: string | null } | null;
  addons?: { id: string; menuAddon: { id: string; name: string; price: number } }[];
};

type Cart = {
  id: string;
  note?: string | null;
  tableId?: string | null;
  table?: { id: string; name: string } | null;
  items: CartItem[];
};

type CartContextValue = {
  cart: Cart | null;
  loading: boolean;
  refresh: () => Promise<void>;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const id = getCartId() || (await ensureCart());
      const data = await gql<{ getCart: Cart | null }>(GET_CART, { id });
      setCart(data.getCart);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const itemCount =
    cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <CartContext.Provider value={{ cart, loading, refresh, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
