export default function AdminCouponsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Coupons
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Promo codes for checkout discounts.
        </p>
      </div>

      <div className="surface-card rounded-2xl p-6">
        <p className="font-semibold">No coupons yet</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Loyalty point discounts are configured under Rewards. Promo coupons
          will appear here when they are added.
        </p>
      </div>
    </div>
  );
}
