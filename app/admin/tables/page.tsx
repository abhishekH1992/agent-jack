import { redirect } from "next/navigation";

export default function AdminTablesRedirect() {
  redirect("/admin/settings/tables");
}
