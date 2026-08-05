import type { Metadata } from "next";
import InvoiceAdminPreviewClient from "./InvoiceAdminPreviewClient";

export const metadata: Metadata = {
  title: "Invoice Preview | GKP Billing",
  description: "Staff-only Guru Kids Pro invoice preview.",
  robots: {
    index: false,
    follow: false,
  },
};

type PreviewPageProps = {
  params: Promise<{
    invoiceId: string;
  }>;
};

export default async function InvoicePreviewPage({ params }: PreviewPageProps) {
  const { invoiceId } = await params;
  return <InvoiceAdminPreviewClient invoiceId={invoiceId} />;
}
