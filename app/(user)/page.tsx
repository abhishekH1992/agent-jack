import { gql } from "@/lib/graphql";
import { PAGE_BY_SLUG, SITE_QUERY } from "@/lib/queries";
import { PageRenderer } from "@/components/page/PageRenderer";

export default async function HomePage() {
  let page: any = null;
  let siteName = "Agent Jack";

  try {
    const [pageData, siteData] = await Promise.all([
      gql<{ pageBySlug: any }>(PAGE_BY_SLUG, { slug: "home" }),
      gql<{ site: { name: string } | null }>(SITE_QUERY),
    ]);
    page = pageData.pageBySlug;
    siteName = siteData.site?.name || "Agent Jack";
  } catch {
    // API may be offline during first paint
  }

  if (!page) {
    return (
      <div className="page-shell py-10 text-sm text-[var(--muted)]">
        Home page is not configured yet. Add it in Admin → Pages.
      </div>
    );
  }

  return <PageRenderer page={page} siteName={siteName} showTitle={false} />;
}
