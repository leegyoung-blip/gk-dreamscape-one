import type { Metadata } from "next";
import BillingAccountsClient from "./BillingAccountsClient";

export const metadata: Metadata = {
  title: "Billing Accounts | GKP Billing",
  description: "Manage Guru Kids Pro family billing accounts and enrolments.",
};

export default function BillingAccountsPage() {
  return <BillingAccountsClient />;
}
