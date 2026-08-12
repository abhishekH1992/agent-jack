import { Header } from "@/components/layout/Header";
import { StickyCartBar } from "@/components/layout/StickyCartBar";
import { gql } from "@/lib/graphql";
import { SITE_QUERY } from "@/lib/queries";

async function getSiteName() {
  try {
    const data = await gql<{ site: { name: string } | null }>(SITE_QUERY);
    return data.site?.name || "Agent Jack";
  } catch {
    return "Agent Jack";
  }
}

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteName = await getSiteName();
  return (
    <div className="min-h-screen">
      <Header siteName={siteName} />
      <main>{children}</main>
      <StickyCartBar />
    </div>
  );
}
