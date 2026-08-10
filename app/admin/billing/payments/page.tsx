import type { Metadata } from "next";
import BillingPaymentsClient from "./BillingPaymentsClient";

export const metadata: Metadata = {
  title: "Payments | GKP Billing",
  description: "Guru Kids Pro billing payments and reconciliation.",
};

export default function BillingPaymentsPage() {
  return <BillingPaymentsClient />;
}
