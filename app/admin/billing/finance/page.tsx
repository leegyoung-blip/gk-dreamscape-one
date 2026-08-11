import type { Metadata } from "next";
import BillingFinanceClient from "./BillingFinanceClient";

export const metadata: Metadata = {
  title: "Finance & Reconciliation | GKP Billing",
  description:
    "Guru Kids Pro and Dreamscape revenue, subscription and reconciliation reporting.",
};

export default function BillingFinancePage() {
  return <BillingFinanceClient />;
}
