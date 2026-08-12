"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Modal, useOverlayState } from "@heroui/react";
import toast from "react-hot-toast";
import { ensureCart, money } from "@/lib/cart";
import { gql } from "@/lib/graphql";
import { ADD_CART_ITEM } from "@/lib/queries";
import { useCart } from "@/components/cart/CartProvider";
import { ExpandableDescription } from "@/components/menu/ExpandableDescription";

type Variant = { id: string; name: string; price: number };
type Addon = { id: string; name: string; price: number };

export type ModalMenu = {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
  fixedPrice: number;
  currentPrice?: number | null;
  lowestPrice?: number | null;
  highestPrice?: number | null;
  step?: number | null;
  pricingEnabled: boolean;
  variants: Variant[];
  addons: Addon[];
};

export function ItemModal({
  menu,
  isOpen,
  onClose,
}: {
  menu: ModalMenu | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { refresh } = useCart();
  const state = useOverlayState({
    isOpen,
    onOpenChange: (open) => {
      if (!open) onClose();
    },
  });
  const [placement, setPlacement] = useState<"bottom" | "center">("bottom");
  const [variantId, setVariantId] = useState("");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () =>
      setPlacement(window.innerWidth <= 768 ? "bottom" : "center");
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    if (!menu) return;
    setVariantId(menu.variants[0]?.id || "");
    setAddonIds([]);
    setQty(1);
  }, [menu]);

  const selectedVariant = menu?.variants.find((v) => v.id === variantId);
  const addonTotal =
    menu?.addons
      .filter((a) => addonIds.includes(a.id))
      .reduce((s, a) => s + Number(a.price), 0) || 0;

  const unit = useMemo(() => {
    if (!menu) return 0;
    return Number(selectedVariant?.price ?? menu.fixedPrice);
  }, [menu, selectedVariant]);

  async function addToCart() {
    if (!menu) return;
    setBusy(true);
    try {
      const cartId = await ensureCart();
      await gql(ADD_CART_ITEM, {
        input: {
          cartId,
          menuId: menu.id,
          menuVariantId: variantId || undefined,
          quantity: qty,
          salePrice: unit,
          addonIds,
        },
      });
      await refresh();
      toast.success("Added to cart — nice pick!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Could not add item");
    } finally {
      setBusy(false);
    }
  }

  function toggleAddon(id: string) {
    setAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  if (!menu || menu.pricingEnabled) return null;

  return (
    <Modal state={state}>
      <Modal.Backdrop isDismissable variant="blur">
        <Modal.Container placement={placement} size="md" scroll="inside">
          <Modal.Dialog className="rounded-t-2xl bg-white sm:rounded-2xl">
            <Modal.Header className="border-b border-[var(--line)] pr-12">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--brand-soft)]">
                  {menu.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={menu.image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#ffedd5,#fdba74)] px-1 text-center text-[10px] font-bold uppercase leading-tight text-[var(--brand)]">
                      {menu.name.slice(0, 8)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Modal.Heading className="truncate font-display text-xl font-bold">
                    {menu.name}
                  </Modal.Heading>
                </div>
              </div>
              <Modal.CloseTrigger className="absolute right-2 top-2 min-h-11 min-w-11" />
            </Modal.Header>
            <Modal.Body className="space-y-4 py-4">
              {menu.description ? (
                <ExpandableDescription text={menu.description} lines={3} />
              ) : null}

              {menu.variants.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Options
                  </h3>
                  <div className="space-y-2">
                    {menu.variants.map((v) => (
                      <label
                        key={v.id}
                        className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-3 py-3 transition duration-150 active:bg-[var(--brand-soft)]"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="variant"
                            checked={variantId === v.id}
                            onChange={() => setVariantId(v.id)}
                            className="h-4 w-4 accent-[var(--brand)]"
                          />
                          {v.name}
                        </span>
                        <span className="font-medium">
                          {money(Number(v.price))}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {menu.addons.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Add-ons
                  </h3>
                  <div className="space-y-2">
                    {menu.addons.map((a) => (
                      <label
                        key={a.id}
                        className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-3 py-3 transition duration-150 active:bg-[var(--brand-soft)]"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={addonIds.includes(a.id)}
                            onChange={() => toggleAddon(a.id)}
                            className="h-4 w-4 accent-[var(--brand)]"
                          />
                          {a.name}
                        </span>
                        <span>+{money(Number(a.price))}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    isIconOnly
                    className="min-h-11 min-w-11 bg-[var(--cta)] text-white"
                    onPress={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    −
                  </Button>
                  <span className="w-8 text-center font-semibold">{qty}</span>
                  <Button
                    isIconOnly
                    className="min-h-11 min-w-11 bg-[var(--cta)] text-white"
                    onPress={() => setQty((q) => q + 1)}
                  >
                    +
                  </Button>
                </div>
                <div className="text-xl font-bold">
                  {money((unit + addonTotal) * qty)}
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer className="safe-bottom">
              <Button
                className="min-h-12 w-full bg-[var(--cta)] font-semibold text-white"
                isDisabled={busy}
                onPress={addToCart}
              >
                {busy ? "Adding…" : "Add to cart"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
