import { redirect } from "next/navigation";

export default function LegacyAccountingRedirect() {
  redirect("/admin/billing/gkp/accounting");
}
