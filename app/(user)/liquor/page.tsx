import { PageRenderer } from "@/components/page/PageRenderer";
import { loadPageBySlug } from "@/lib/load-page";

export default async function LiquorPage() {
  const { page, siteName } = await loadPageBySlug("liquor");
  if (!page) {
    return (
      <div className="page-shell py-10 text-sm text-[var(--muted)]">
        Liquor page is not configured yet. Create a page with slug{" "}
        <code>liquor</code> in Admin → Pages.
      </div>
    );
  }
  return <PageRenderer page={page} siteName={siteName} />;
}
