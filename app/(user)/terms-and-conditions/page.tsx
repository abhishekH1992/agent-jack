import { PageRenderer } from "@/components/page/PageRenderer";
import { loadPageBySlug } from "@/lib/load-page";

export default async function TermsPage() {
  const { page, siteName } = await loadPageBySlug("terms-and-conditions");
  if (!page) {
    return (
      <div className="page-shell py-10 text-sm text-[var(--muted)]">
        Terms and Conditions are not configured yet.
      </div>
    );
  }
  return <PageRenderer page={page} siteName={siteName} />;
}
