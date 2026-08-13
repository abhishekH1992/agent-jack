import Link from "next/link";
import { SuccessRewards } from "@/components/checkout/SuccessRewards";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; session_id?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="page-shell flex min-h-[70vh] items-center justify-center py-10 pb-32">
      <div className="surface-card w-full max-w-md p-6 text-center sm:p-8">
        <div className="mx-auto mb-4 w-fit rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
          Order received
        </div>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          You’re all set
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          Payment confirmed. The kitchen and bar have your table order — sit
          back and enjoy.
        </p>
        <SuccessRewards orderId={params.orderId} sessionId={params.session_id} />
        <Link
          href="/"
          className="mt-6 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-[var(--brand)] px-6 text-sm font-semibold text-white sm:w-auto"
        >
          Back to menu
        </Link>
      </div>
    </div>
  );
}
