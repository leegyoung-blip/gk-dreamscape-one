import type { Metadata } from "next";
import BillingProgrammesClient from "../../programmes/BillingProgrammesClient";

export const metadata: Metadata = {
  title: "Programmes | Guru Kids Pro Billing",
  description: "Guru Kids Pro billing programme and fee templates.",
};

export default function GuruKidsProProgrammesPage() {
  return <BillingProgrammesClient />;
}
