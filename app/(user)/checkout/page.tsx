import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export default function CheckoutPage() {
  return (
    <div className="page-shell py-6 pb-32 sm:py-8">
      <h1 className="font-display mb-2 text-3xl font-bold sm:text-4xl">
        Checkout
      </h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Almost there — confirm your table and we’ll send you to secure payment.
      </p>
      <CheckoutForm />
    </div>
  );
}
