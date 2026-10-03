import type { Metadata } from "next";
import BillingSettingsClient from "../../settings/BillingSettingsClient";

export const metadata: Metadata = {
  title: "Settings | Guru Kids Pro Billing",
  description: "Guru Kids Pro billing settings and invoice rules.",
};

export default function GuruKidsProBillingSettingsPage() {
  return <BillingSettingsClient />;
}
