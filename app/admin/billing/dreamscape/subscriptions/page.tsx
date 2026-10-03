import { redirect } from "next/navigation";

export default function LegacyDreamscapeSubscriptionsRedirect() {
  redirect("/admin/billing/dreamscape/subscribers");
}
