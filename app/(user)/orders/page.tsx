import Link from "next/link";

export default function OrdersPage() {
  return (
    <div className="page-shell space-y-4 py-8 pb-32">
      <h1
        className="text-3xl md:text-4xl"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Order
      </h1>
      <p className="text-sm text-[var(--muted)]">
        Review your cart and check out from your table. Staff will update your
        order status after payment.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/cart" className="btn btn-primary !rounded-xl">
          View cart
        </Link>
        <Link href="/menu" className="btn btn-secondary !rounded-xl">
          Browse menu
        </Link>
      </div>
    </div>
  );
}
