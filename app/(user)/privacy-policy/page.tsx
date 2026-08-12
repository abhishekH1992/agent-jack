import { PageRenderer } from "@/components/page/PageRenderer";
import { loadPageBySlug } from "@/lib/load-page";

export default async function PrivacyPolicyPage() {
  const { page, siteName } = await loadPageBySlug("privacy-policy");
  if (!page) {
    return (
      <div className="page-shell py-10 text-sm text-[var(--muted)]">
        Privacy Policy is not configured yet.
      </div>
    );
  }
  return <PageRenderer page={page} siteName={siteName} />;
}
