import type { Metadata } from "next";
import BillingProgrammesClient from "./BillingProgrammesClient";

export const metadata: Metadata = {
  title: "Programmes | GKP Billing",
  description: "Manage Guru Kids Pro programmes and standard billing fees.",
};

export default function BillingProgrammesPage() {
  return <BillingProgrammesClient />;
}
