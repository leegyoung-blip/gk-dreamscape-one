import type { Metadata } from "next";
import CompanyAccountingClient from "../../_components/CompanyAccountingClient";

export const metadata: Metadata = {
  title: "Guru Kids Pro Accounting | Billing Platform",
  description: "Guru Kids Pro company accounting and management reporting.",
};

export default function GuruKidsProAccountingPage() {
  return <CompanyAccountingClient companyCode="gkp" />;
}
