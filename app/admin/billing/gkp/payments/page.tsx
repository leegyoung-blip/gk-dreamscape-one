import type { Metadata } from "next";
import BillingPaymentsClient from "../../payments/BillingPaymentsClient";

export const metadata: Metadata = {
  title: "Payments | Guru Kids Pro Billing",
  description: "Reconcile Guru Kids Pro tuition payments and refunds.",
};

export default function GuruKidsProPaymentsPage() {
  return <BillingPaymentsClient />;
}
