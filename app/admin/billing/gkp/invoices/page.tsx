import type { Metadata } from "next";
import BillingInvoicesClient from "../../invoices/BillingInvoicesClient";

export const metadata: Metadata = {
  title: "Invoices | Guru Kids Pro Billing",
  description: "Prepare, review and issue Guru Kids Pro tuition invoices.",
};

export default function GuruKidsProInvoicesPage() {
  return <BillingInvoicesClient />;
}
