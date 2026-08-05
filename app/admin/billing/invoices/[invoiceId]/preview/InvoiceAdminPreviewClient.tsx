"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import InvoiceDocument from "@/app/invoice/_components/InvoiceDocument";
import { buildInvoiceDocument } from "@/app/invoice/_lib/buildInvoiceDocument";
import type { InvoiceDocumentData } from "@/app/invoice/_lib/invoiceTypes";

type PreviewStatus = "checking" | "loading" | "ready" | "locked" | "error";

export default function InvoiceAdminPreviewClient({
  invoiceId,
}: {
  invoiceId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<PreviewStatus>("checking");
  const [message, setMessage] = useState("");
  const [document, setDocument] = useState<InvoiceDocumentData | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPreview() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (userError) {
        setMessage(userError.message);
        setStatus("error");
        return;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      const accessResult = await supabase.rpc("gkp_is_billing_staff");

      if (!active) return;

      if (accessResult.error) {
        setMessage(accessResult.error.message);
        setStatus("error");
        return;
      }

      if (!Boolean(accessResult.data)) {
        setStatus("locked");
        return;
      }

      setStatus("loading");

      const invoiceResult = await supabase
        .from("gkp_billing_invoices")
        .select(
          "id,invoice_number,account_id,invoice_kind,billing_period,invoice_date,due_date,currency,status,subtotal,discount_total,credit_total,tax_total,total_amount,amount_paid,balance_due,issued_at,paid_at,public_token,public_link_enabled",
        )
        .eq("id", invoiceId)
        .maybeSingle();

      if (!active) return;

      if (invoiceResult.error || !invoiceResult.data) {
        setMessage(invoiceResult.error?.message || "Invoice not found.");
        setStatus("error");
        return;
      }

      const invoice = invoiceResult.data;
      const [settingsResult, accountResult, itemsResult, paymentsResult] =
        await Promise.all([
          supabase
            .from("gkp_billing_settings")
            .select(
              "business_name,business_address,billing_email,support_email,currency,timezone,is_gst_registered,gst_registration_number,payment_terms,footer_note",
            )
            .eq("id", true)
            .maybeSingle(),
          supabase
            .from("gkp_billing_accounts")
            .select(
              "account_code,payer_name,billing_email,phone,alternate_email,address",
            )
            .eq("id", invoice.account_id)
            .maybeSingle(),
          supabase
            .from("gkp_billing_invoice_items")
            .select(
              "id,student_id,item_type,description,quantity,unit_amount,discount_amount,line_total,sort_order,metadata,created_at",
            )
            .eq("invoice_id", invoice.id)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
          supabase
            .from("gkp_billing_payments")
            .select(
              "provider,provider_reference,payment_method,amount,currency,paid_at",
            )
            .eq("invoice_id", invoice.id)
            .eq("status", "succeeded")
            .order("paid_at", { ascending: true }),
        ]);

      if (!active) return;

      const firstError =
        settingsResult.error ||
        accountResult.error ||
        itemsResult.error ||
        paymentsResult.error;

      if (firstError || !settingsResult.data || !accountResult.data) {
        setMessage(firstError?.message || "Invoice records are incomplete.");
        setStatus("error");
        return;
      }

      const items = itemsResult.data || [];
      const studentIds = Array.from(
        new Set(
          items
            .map((item) => item.student_id)
            .filter((value): value is string => Boolean(value)),
        ),
      );

      const studentsResult = studentIds.length
        ? await supabase
            .from("gkp_billing_students")
            .select("id,full_name")
            .in("id", studentIds)
        : { data: [], error: null };

      if (!active) return;

      if (studentsResult.error) {
        setMessage(studentsResult.error.message);
        setStatus("error");
        return;
      }

      setDocument(
        buildInvoiceDocument({
          invoice,
          settings: settingsResult.data,
          account: accountResult.data,
          items,
          students: studentsResult.data || [],
          payments: paymentsResult.data || [],
          isAdminPreview: true,
        }),
      );
      setStatus("ready");
    }

    void loadPreview();

    return () => {
      active = false;
    };
  }, [invoiceId, router]);

  if (status === "ready" && document) {
    return (
      <div>
        <div className="fixed bottom-4 left-4 z-50 print:hidden">
          <Link
            href="/admin/billing/invoices"
            className="inline-flex min-h-11 items-center rounded-full border border-[#d7c9ae] bg-white px-5 text-sm font-bold text-[#17233a] shadow-lg"
          >
            ← Back to invoices
          </Link>
        </div>
        <InvoiceDocument data={document} />
      </div>
    );
  }

  if (status === "locked") {
    return <PreviewMessage title="Access restricted" text="Billing staff access is required." />;
  }

  if (status === "error") {
    return <PreviewMessage title="Preview unavailable" text={message} />;
  }

  return (
    <PreviewMessage
      title="Preparing invoice preview"
      text={status === "checking" ? "Checking billing access…" : "Loading invoice records…"}
    />
  );
}

function PreviewMessage({ title, text }: { title: string; text: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#efe9de] p-6 text-[#17233a]">
      <section className="max-w-lg rounded-[2rem] border border-[#d7cdbb] bg-white p-8 text-center shadow-[0_24px_70px_rgba(21,35,59,0.1)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#15233b] text-sm font-black text-[#e8c474]">
          GKP
        </div>
        <h1 className="mt-5 text-2xl font-semibold">{title}</h1>
        <p className="mt-3 leading-7 text-[#6f685c]">{text}</p>
        <Link
          href="/admin/billing/invoices"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#15233b] px-5 text-sm font-bold text-white"
        >
          Return to invoices
        </Link>
      </section>
    </main>
  );
}
