import { gql } from "@/lib/graphql";
import { BELTS_QUERY, CATEGORIES_QUERY, SITE_QUERY } from "@/lib/queries";
import { HomeClient } from "@/components/menu/HomeClient";
import { HomeBanner } from "@/components/layout/HomeBanner";

export default async function HomePage() {
  let belts: any[] = [];
  let categories: any[] = [];
  let banners: string[] = [];
  let siteName = "Agent Jack";

  try {
    const [beltData, catData, siteData] = await Promise.all([
      gql<{ belts: any[] }>(BELTS_QUERY, { isEnable: true }),
      gql<{ categories: any[] }>(CATEGORIES_QUERY),
      gql<{ site: { name: string; banners: string[] } | null }>(SITE_QUERY),
    ]);
    belts = beltData.belts;
    categories = catData.categories;
    banners = siteData.site?.banners || [];
    siteName = siteData.site?.name || "Agent Jack";
  } catch {
    // API may be offline during first paint
  }

  return (
    <div>
      <HomeBanner banners={banners} siteName={siteName} />
      <HomeClient belts={belts} categories={categories} />
    </div>
  );
}
