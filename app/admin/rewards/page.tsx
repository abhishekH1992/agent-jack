import { redirect } from "next/navigation";

export default function AdminRewardsRedirect() {
  redirect("/admin/settings/rewards");
}
