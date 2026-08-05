import type { Metadata } from "next";
import BillingInvoicesClient from "./BillingInvoicesClient";

export const metadata: Metadata = {
  title: "GKP Invoices | Dreamscape One",
  description: "Generate and review Guru Kids Pro tuition invoices.",
};

export default function BillingInvoicesPage() {
  return <BillingInvoicesClient />;
}
