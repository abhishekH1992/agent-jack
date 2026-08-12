import { PageRenderer } from "@/components/page/PageRenderer";
import { loadPageBySlug } from "@/lib/load-page";

export default async function MenuPage() {
  const { page, siteName } = await loadPageBySlug("menu");
  if (!page) {
    return (
      <div className="page-shell py-10 text-sm text-[var(--muted)]">
        Menu page is not configured yet. Create a page with slug{" "}
        <code>menu</code> in Admin → Pages.
      </div>
    );
  }
  return <PageRenderer page={page} siteName={siteName} />;
}
