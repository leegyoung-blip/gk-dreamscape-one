import type { Metadata } from "next";
import BillingSettingsClient from "./BillingSettingsClient";

export const metadata: Metadata = {
  title: "Settings | GKP Billing",
  description: "Guru Kids Pro billing settings.",
};

export default function BillingSettingsPage() {
  return <BillingSettingsClient />;
}
