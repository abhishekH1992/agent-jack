"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import { CLERK_ENABLED } from "@/lib/config";
import { CartProvider } from "@/components/cart/CartProvider";
import { ClerkUserSync } from "@/components/auth/ClerkUserSync";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const inner = (
    <CartProvider>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#111111",
            color: "#FFD700",
            borderRadius: "12px",
          },
        }}
      />
    </CartProvider>
  );

  if (!CLERK_ENABLED) return inner;

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#FFD700",
          colorBackground: "#FAFAF7",
          colorText: "#141414",
        },
      }}
    >
      <ClerkUserSync />
      {inner}
    </ClerkProvider>
  );
}
