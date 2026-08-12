"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Modal, Spinner, useOverlayState } from "@heroui/react";
import toast from "react-hot-toast";
import { ensureCart, getBidSessionId, money } from "@/lib/cart";
import { gql } from "@/lib/graphql";
import { DELETE_CART_ITEM, PLACE_BID } from "@/lib/queries";
import { useCart } from "@/components/cart/CartProvider";

export type BidMenu = {
  id: string;
  name: string;
  image?: string | null;
  currentPrice?: number | null;
  lowestPrice?: number | null;
  highestPrice?: number | null;
  step?: number | null;
  fixedPrice: number;
};

type Msg = { role: "user" | "assistant"; content: string };

function opener(name: string) {
  return `Kia ora — ${name} is on the board. Float a bid and let’s see if we can get it poured your way.`;
}

function lastAssistantReply(messages: Msg[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return messages[i].content;
  }
  return "";
}

function sanitizeAmountInput(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) return null;
  if (parts[1] && parts[1].length > 2) {
    return `${parts[0]}.${parts[1].slice(0, 2)}`;
  }
  if (cleaned === "" || /^\d*\.?\d{0,2}$/.test(cleaned)) return cleaned;
  return null;
}

function parseAmount(text: string): number | null {
  if (!text.trim()) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function QtyStepper({
  qty,
  onChange,
  disabled,
}: {
  qty: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        isIconOnly
        aria-label="Decrease quantity"
        isDisabled={disabled}
        className="min-h-11 min-w-11 bg-[var(--cta)] text-white"
        onPress={() => onChange(Math.max(1, qty - 1))}
      >
        −
      </Button>
      <span className="w-8 text-center font-semibold tabular-nums">{qty}</span>
      <Button
        isIconOnly
        aria-label="Increase quantity"
        isDisabled={disabled}
        className="min-h-11 min-w-11 bg-[var(--cta)] text-white"
        onPress={() => onChange(Math.min(99, qty + 1))}
      >
        +
      </Button>
    </div>
  );
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
  const [amountText, setAmountText] = useState("");
  const [qty, setQty] = useState(1);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [dealReady, setDealReady] = useState(false);
  const [pendingCartItemId, setPendingCartItemId] = useState<string | null>(
    null,
  );
  const [failCount, setFailCount] = useState(0);
  const [liveOffer, setLiveOffer] = useState<number | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const min = Number(menu?.lowestPrice ?? menu?.fixedPrice ?? 0);
  const max = Number(menu?.highestPrice ?? menu?.fixedPrice ?? 0);
  const step = Number(menu?.step ?? 0.5) || 0.5;
  const offerMode = liveOffer != null && !dealReady;

  useEffect(() => {
    const sync = () =>
      setPlacement(window.innerWidth <= 768 ? "bottom" : "center");
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    if (!menu || !isOpen) return;
    const floor = Number(menu.lowestPrice ?? menu.fixedPrice ?? 0);
    setAmountText(floor.toFixed(2));
    setQty(1);
    setDealReady(false);
    setPendingCartItemId(null);
    setFailCount(0);
    setLiveOffer(null);
    setMessages([{ role: "assistant", content: opener(menu.name) }]);
  }, [menu, isOpen]);

  useEffect(() => {
    if (!isOpen || offerMode) return;
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, busy, isOpen, offerMode]);

  function clampAmount(n: number) {
    return Number(Math.min(max, Math.max(min, n)).toFixed(2));
  }

  function bump(delta: number) {
    const current = parseAmount(amountText);
    const base = current == null || current < min ? min : current;
    setAmountText(clampAmount(base + delta).toFixed(2));
  }

  function onAmountChange(raw: string) {
    const next = sanitizeAmountInput(raw);
    if (next != null) setAmountText(next);
  }

  function onAmountBlur() {
    const n = parseAmount(amountText);
    if (n == null || n < min) {
      setAmountText(min.toFixed(2));
      return;
    }
    if (n > max) {
      setAmountText(max.toFixed(2));
      return;
    }
    setAmountText(n.toFixed(2));
  }

  function resolvedBidAmount() {
    const n = parseAmount(amountText);
    if (n == null) return min;
    return clampAmount(n);
  }

  async function runBid(
    bidAmount: number,
    mode: "chat" | "offer" | "buyNow" = "chat",
  ) {
    if (!menu) return;
    const amount = clampAmount(bidAmount);
    if (amount < min || amount > max) {
      toast.error(
        `Bid must be between NZD ${min.toFixed(2)} and ${max.toFixed(2)}`,
      );
      setAmountText(min.toFixed(2));
      return;
    }
    setBusy(true);
    if (mode === "chat") {
      setMessages((m) => [
        ...m,
        {
          role: "user",
          content: `Bid NZD ${amount.toFixed(2)} × ${qty}`,
        },
      ]);
    }
    try {
      const cartId = await ensureCart();
      const nextFails = mode === "chat" ? failCount + 1 : failCount;
      const data = await gql<{
        placeBid: {
          success: boolean;
          failCount: number;
          offerLivePrice: boolean;
          message: string;
          currentPrice: number;
          cartItem?: { id: string } | null;
        };
      }>(PLACE_BID, {
        menuId: menu.id,
        amount,
        cartId,
        sessionId: getBidSessionId(),
        chatAttempt: mode === "chat" ? nextFails : undefined,
        lastReply: mode === "chat" ? lastAssistantReply(messages) : undefined,
        quantity: qty,
      });

      if (data.placeBid.success) {
        setLiveOffer(null);
        await refresh();

        if (mode === "buyNow") {
          toast.success(`Added ${qty} × ${menu.name} at ${money(amount)}`);
          onClose();
          return;
        }

        setDealReady(true);
        setPendingCartItemId(data.placeBid.cartItem?.id || null);
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.placeBid.message },
        ]);
        return;
      }

      if (mode === "chat") {
        setFailCount(nextFails);
        if (nextFails >= 3) {
          setLiveOffer(Number(data.placeBid.currentPrice));
          return;
        }
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.placeBid.message },
        ]);
      } else {
        toast.error("Couldn’t complete that — try again.");
      }
    } catch (err: any) {
      toast.error(err.message || "Bid failed");
      if (mode === "chat") {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: "Whoa — something spilled. Try that bid again.",
          },
        ]);
      }
    } finally {
      setBusy(false);
    }
  }

  async function placeBid() {
    onAmountBlur();
    await runBid(resolvedBidAmount(), "chat");
  }

  async function buyNow() {
    await runBid(max, "buyNow");
  }

  async function acceptLiveOffer() {
    if (liveOffer == null) return;
    await runBid(liveOffer, "offer");
  }

  async function declineLiveOffer() {
    setLiveOffer(null);
    setFailCount(0);
    setMessages((m) => [
      ...m,
      { role: "user", content: "Not this round." },
      {
        role: "assistant",
        content: `All good — ${menu?.name} isn’t going anywhere. Whenever you’re ready, float another bid.`,
      },
    ]);
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
      { role: "user", content: "Nah, not this round." },
      {
        role: "assistant",
        content: `Sweet as — ${menu?.name} will wait. Come back for another crack whenever you like.`,
      },
    ]);
  }

  if (!menu) return null;

  return (
    <Modal state={state}>
      <Modal.Backdrop isDismissable variant="blur">
        <Modal.Container
          placement={placement}
          size="md"
          scroll="inside"
          className="sm:max-w-md"
        >
          <Modal.Dialog className="overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
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
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    From {money(min)} · Buy now {money(max)}
                  </p>
                </div>
              </div>
              <Modal.CloseTrigger className="absolute right-2 top-2 min-h-11 min-w-11" />
            </Modal.Header>

            <Modal.Body className="bg-[var(--page)] !p-0">
              <div
                ref={chatScrollRef}
                className="min-h-[24vh] max-h-[36vh] space-y-2 overflow-y-auto px-4 py-4 sm:min-h-[22vh]"
              >
                {offerMode ? (
                  <div className="flex h-full min-h-[20vh] flex-col items-center justify-center gap-2 px-2 text-center">
                    <p className="text-sm text-[var(--muted)]">
                      Three goes — here’s a clear offer
                    </p>
                    <p className="font-display text-4xl font-bold text-[var(--brand)]">
                      {money(liveOffer!)}
                    </p>
                    <p className="text-sm text-[var(--ink)]">Qty {qty}</p>
                  </div>
                ) : (
                  <>
                    {messages.map((m, i) => (
                      <div
                        key={i}
                        className={
                          m.role === "assistant"
                            ? "bid-bubble-ai"
                            : "bid-bubble-user"
                        }
                      >
                        {m.content}
                      </div>
                    ))}
                    {busy ? (
                      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                        <Spinner size="sm" /> Thinking…
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </Modal.Body>

            <Modal.Footer className="safe-bottom !block">
              {/* Single child — HeroUI footer is a row by default */}
              <div className="flex w-full flex-col gap-3">
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
                ) : offerMode ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <QtyStepper
                        qty={qty}
                        onChange={setQty}
                        disabled={busy}
                      />
                      <div className="text-xl font-bold">
                        {money(liveOffer!)}
                      </div>
                    </div>
                    <div className="flex w-full gap-2">
                      <Button
                        variant="secondary"
                        className="min-h-12 flex-1"
                        onPress={declineLiveOffer}
                        isDisabled={busy}
                      >
                        Decline
                      </Button>
                      <Button
                        className="min-h-12 flex-1 bg-[var(--cta)] font-semibold text-white"
                        onPress={acceptLiveOffer}
                        isDisabled={busy}
                      >
                        {busy ? "…" : "Accept offer"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[var(--muted)]">
                        Qty
                      </span>
                      <QtyStepper
                        qty={qty}
                        onChange={setQty}
                        disabled={busy}
                      />
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[var(--muted)]">
                          Your bid
                        </span>
                        <span className="text-xs text-[var(--muted)]">
                          {money(min)} – {money(max)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          isIconOnly
                          aria-label="Decrease bid"
                          isDisabled={busy}
                          variant="secondary"
                          className="min-h-11 min-w-11 border border-[var(--line)]"
                          onPress={() => bump(-step)}
                        >
                          −
                        </Button>
                        <div className="relative min-w-0 flex-1">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--muted)]">
                            $
                          </span>
                          <input
                            className="bid-input h-11 w-full rounded-xl border border-[var(--line)] bg-white py-2 pl-7 pr-3 text-center text-xl font-bold tabular-nums outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(234,88,12,0.18)]"
                            inputMode="decimal"
                            value={amountText}
                            onChange={(e) => onAmountChange(e.target.value)}
                            onBlur={onAmountBlur}
                            disabled={busy}
                            aria-label="Bid amount"
                          />
                        </div>
                        <Button
                          isIconOnly
                          aria-label="Increase bid"
                          isDisabled={busy}
                          variant="secondary"
                          className="min-h-11 min-w-11 border border-[var(--line)]"
                          onPress={() => bump(step)}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <Button
                      className="min-h-12 w-full bg-[var(--brand)] font-semibold text-white"
                      onPress={placeBid}
                      isDisabled={busy}
                    >
                      {busy ? "Bidding…" : "Place bid"}
                    </Button>
                    <Button
                      variant="secondary"
                      className="min-h-12 w-full border border-[var(--cta)] font-semibold text-[var(--cta)]"
                      onPress={buyNow}
                      isDisabled={busy}
                    >
                      {busy
                        ? "Adding…"
                        : `Buy now · ${money(max)} × ${qty}`}
                    </Button>
                  </>
                )}
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
