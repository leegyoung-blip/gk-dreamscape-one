import type { Metadata } from "next";
import BillingAccountsClient from "../../accounts/BillingAccountsClient";

export const metadata: Metadata = {
  title: "Billing Accounts | Guru Kids Pro",
  description: "Guru Kids Pro family billing accounts and student enrolments.",
};

export default function GuruKidsProBillingAccountsPage() {
  return <BillingAccountsClient />;
}
