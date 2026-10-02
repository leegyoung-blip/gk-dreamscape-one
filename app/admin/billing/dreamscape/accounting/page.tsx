import type { Metadata } from "next";
import CompanyAccountingClient from "../../_components/CompanyAccountingClient";

export const metadata: Metadata = {
  title: "Dreamscape One Accounting | Billing Platform",
  description: "Dreamscape One subscription accounting and management reporting.",
};

export default function DreamscapeAccountingPage() {
  return <CompanyAccountingClient companyCode="dreamscape" />;
}
