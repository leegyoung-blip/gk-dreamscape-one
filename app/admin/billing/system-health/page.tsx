import type { Metadata } from "next";
import BillingSystemHealthClient from "./BillingSystemHealthClient";

export const metadata: Metadata = {
  title: "System Health | GKP Billing",
  description:
    "Production readiness, security posture and webhook health for Guru Kids Pro billing.",
};

export default function BillingSystemHealthPage() {
  return <BillingSystemHealthClient />;
}
