import type { Metadata } from "next";
import DreamscapeWorkspaceClient from "./DreamscapeWorkspaceClient";

export const metadata: Metadata = {
  title: "Dreamscape One Billing | Billing Platform",
  description: "Dreamscape One subscription billing administration.",
};

export default function DreamscapeBillingOverviewPage() {
  return <DreamscapeWorkspaceClient view="overview" />;
}
