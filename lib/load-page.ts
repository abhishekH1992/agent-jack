import { gql } from "@/lib/graphql";
import { PAGE_BY_SLUG, SITE_QUERY } from "@/lib/queries";

export async function loadPageBySlug(slug: string) {
  let page: any = null;
  let siteName = "Agent Jack";
  try {
    const [pageData, siteData] = await Promise.all([
      gql<{ pageBySlug: any }>(PAGE_BY_SLUG, { slug }),
      gql<{ site: { name: string } | null }>(SITE_QUERY),
    ]);
    page = pageData.pageBySlug;
    siteName = siteData.site?.name || "Agent Jack";
  } catch {
    // ignore
  }
  return { page, siteName };
}
