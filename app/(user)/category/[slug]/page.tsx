import { notFound } from "next/navigation";
import Link from "next/link";
import { gql } from "@/lib/graphql";
import { CATEGORY_BY_SLUG } from "@/lib/queries";
import { CategoryClient } from "@/components/menu/CategoryClient";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let category = null;
  try {
    const data = await gql<{ categoryBySlug: any }>(CATEGORY_BY_SLUG, { slug });
    category = data.categoryBySlug;
  } catch {
    category = null;
  }
  if (!category) notFound();

  return (
    <div className="page-shell py-6 sm:py-8">
      <Link
        href="/#menu"
        className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--brand)]"
      >
        ← Menu
      </Link>
      <h1 className="font-display mb-2 text-3xl font-bold sm:text-4xl">
        {category.name}
      </h1>
      <p className="mb-6 text-sm text-[var(--muted)] sm:mb-8">
        Pick a section, customise with variants and add-ons — or bid on the tap.
      </p>
      <CategoryClient category={category} />
    </div>
  );
}
