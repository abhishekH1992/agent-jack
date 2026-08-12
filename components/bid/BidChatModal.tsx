"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Modal, Spinner, useOverlayState } from "@heroui/react";
import toast from "react-hot-toast";
import { ensureCart, getBidSessionId } from "@/lib/cart";
import { gql } from "@/lib/graphql";
import { DELETE_CART_ITEM, PLACE_BID } from "@/lib/queries";
import { useCart } from "@/components/cart/CartProvider";

export type BidMenu = {
  id: string;
  name: string;
  currentPrice?: number | null;
  lowestPrice?: number | null;
  highestPrice?: number | null;
  step?: number | null;
  fixedPrice: number;
};

type Msg = { role: "user" | "assistant"; content: string };

function opener(name: string) {
  return `Hey legend — ${name} is up for grabs. Put a bid on the bar and we’ll see if the room’s thirsty tonight.`;
}

export function BidChatModal({
  menu,
  isOpen,
  onClose,
}: {
  menu: BidMenu | null;
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
  const [amount, setAmount] = useState(0);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [dealReady, setDealReady] = useState(false);
  const [pendingCartItemId, setPendingCartItemId] = useState<string | null>(null);

  const min = Number(menu?.lowestPrice ?? menu?.fixedPrice ?? 0);
  const max = Number(menu?.highestPrice ?? menu?.fixedPrice ?? 0);
  const step = Number(menu?.step ?? 0.5);

  useEffect(() => {
    const sync = () =>
      setPlacement(window.innerWidth <= 768 ? "bottom" : "center");
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    if (!menu || !isOpen) return;
    // Start bid near mid-range so live current price is not revealed
    const start = Number(
      (
        (Number(menu.lowestPrice ?? menu.fixedPrice) +
          Number(menu.highestPrice ?? menu.fixedPrice)) /
        2
      ).toFixed(2),
    );
    setAmount(start);
    setDealReady(false);
    setPendingCartItemId(null);
    setMessages([{ role: "assistant", content: opener(menu.name) }]);
  }, [menu, isOpen]);

  const amountLabel = useMemo(() => amount.toFixed(2), [amount]);

  function bump(delta: number) {
    const next = Number((amount + delta).toFixed(2));
    if (next < min) return toast.error(`Lower than NZD ${min.toFixed(2)}`);
    if (next > max) return toast.error(`Higher than NZD ${max.toFixed(2)}`);
    setAmount(next);
  }

  function onAmountChange(raw: string) {
    if (raw === "" || /^\d*\.?\d{0,2}$/.test(raw)) {
      setAmount(raw === "" ? 0 : Number(raw));
    }
  }

  async function placeBid() {
    if (!menu) return;
    if (amount < min || amount > max) {
      toast.error(`Bid must be between NZD ${min.toFixed(2)} and ${max.toFixed(2)}`);
      return;
    }
    setBusy(true);
    setMessages((m) => [
      ...m,
      { role: "user", content: `You placed a bid for NZD ${amountLabel}` },
    ]);
    try {
      const cartId = await ensureCart();
      const data = await gql<{
        placeBid: {
          success: boolean;
          failCount: number;
          message: string;
          currentPrice: number;
          cartItem?: { id: string } | null;
        };
      }>(PLACE_BID, {
        menuId: menu.id,
        amount,
        cartId,
        sessionId: getBidSessionId(),
      });

      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.placeBid.message },
      ]);

      if (data.placeBid.success) {
        setDealReady(true);
        setPendingCartItemId(data.placeBid.cartItem?.id || null);
        await refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Bid failed");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Whoa — something spilled. Try that bid again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function acceptDeal() {
    await refresh();
    toast.success("Locked in — added to cart");
    onClose();
  }

  async function declineDeal() {
    if (pendingCartItemId) {
      try {
        await gql(DELETE_CART_ITEM, { id: pendingCartItemId });
        await refresh();
      } catch {
        // ignore
      }
    }
    setPendingCartItemId(null);
    setDealReady(false);
    setMessages((m) => [
      ...m,
      {
        role: "user",
        content: "Nah, not this round.",
      },
      {
        role: "assistant",
        content: `No stress — ${menu?.name} is still in play. Take another shot when you’re ready.`,
      },
    ]);
  }

  if (!menu) return null;

  return (
    <Modal state={state}>
      <Modal.Backdrop isDismissable variant="blur">
        <Modal.Container
          placement={placement}
          size="lg"
          scroll="inside"
          className="sm:max-w-xl"
        >
          <Modal.Dialog className="rounded-t-2xl bg-white sm:rounded-2xl">
            <Modal.Header className="flex flex-col items-start gap-1 border-b border-[var(--line)] pr-12">
              <Modal.Heading className="font-display text-xl font-bold">
                {menu.name}
              </Modal.Heading>
              <p className="text-xs text-[var(--muted)]">
                Min: NZD {min.toFixed(2)} · Max: NZD {max.toFixed(2)}
              </p>
              <Modal.CloseTrigger className="absolute right-2 top-2 min-h-11 min-w-11" />
            </Modal.Header>

            <Modal.Body className="min-h-[42vh] max-h-[62vh] space-y-2 bg-[var(--page)] py-4 sm:min-h-[40vh]">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "assistant" ? "bid-bubble-ai" : "bid-bubble-user"
                  }
                >
                  {m.content}
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <Spinner size="sm" /> Thinking…
                </div>
              )}
            </Modal.Body>

            <Modal.Footer className="safe-bottom border-t border-[var(--line)] bg-white">
              {dealReady ? (
                <div className="flex w-full gap-2">
                  <Button
                    variant="secondary"
                    className="min-h-12 flex-1 border border-rose-200 text-rose-600"
                    onPress={declineDeal}
                  >
                    Decline
                  </Button>
                  <Button
                    className="min-h-12 flex-1 bg-[var(--cta)] font-semibold text-white"
                    onPress={acceptDeal}
                  >
                    Accept
                  </Button>
                </div>
              ) : (
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-2">
                    <Button
                      isIconOnly
                      className="min-h-11 min-w-11 bg-[var(--cta)] text-white"
                      onPress={() => bump(-step)}
                      isDisabled={busy}
                    >
                      −
                    </Button>
                    <div className="relative flex-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">
                        NZD
                      </span>
                      <input
                        className="bid-input min-h-11 w-full rounded-xl border border-[var(--line)] bg-white py-2.5 pl-12 pr-3 text-center text-lg font-semibold outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(234,88,12,0.18)]"
                        inputMode="decimal"
                        value={amountLabel}
                        onChange={(e) => onAmountChange(e.target.value)}
                        disabled={busy}
                      />
                    </div>
                    <Button
                      isIconOnly
                      className="min-h-11 min-w-11 bg-[var(--cta)] text-white"
                      onPress={() => bump(step)}
                      isDisabled={busy}
                    >
                      +
                    </Button>
                  </div>
                  <Button
                    className="min-h-12 bg-[var(--brand)] font-bold text-white sm:min-w-36"
                    onPress={placeBid}
                    isDisabled={busy}
                  >
                    {busy ? "Bidding…" : "Place bid"}
                  </Button>
                </div>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
