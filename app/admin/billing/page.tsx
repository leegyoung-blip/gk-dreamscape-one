import type { Metadata } from "next";
import BillingPlatformLandingClient from "./BillingPlatformLandingClient";

export const metadata: Metadata = {
  title: "Billing Platform | Dreamscape One",
  description:
    "Shared billing administration for Guru Kids Pro and Dreamscape One.",
};

export default function BillingDashboardPage() {
  return <BillingPlatformLandingClient />;
}
