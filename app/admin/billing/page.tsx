import type { Metadata } from "next";
import BillingDashboardClient from "./BillingDashboardClient";

export const metadata: Metadata = {
  title: "GKP Billing | Dreamscape One",
  description: "Guru Kids Pro tuition billing administration.",
};

export default function BillingDashboardPage() {
  return <BillingDashboardClient />;
}
