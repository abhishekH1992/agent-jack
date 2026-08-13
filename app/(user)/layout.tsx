import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { gql } from "@/lib/graphql";
import { SITE_QUERY } from "@/lib/queries";

async function getSite() {
  try {
    const data = await gql<{
      site: { name?: string | null; logo?: string | null } | null;
    }>(SITE_QUERY);
    return {
      siteName: data.site?.name?.trim() || "Agent Jack",
      siteLogo: data.site?.logo?.trim() || null,
    };
  } catch {
    return { siteName: "Agent Jack", siteLogo: null };
  }
}

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { siteName, siteLogo } = await getSite();
  return (
    <div className="min-h-screen">
      <Header siteName={siteName} siteLogo={siteLogo} />
      <main>{children}</main>
      <BottomNav />
    </div>
  );
}
