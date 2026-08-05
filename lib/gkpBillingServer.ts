import { createClient } from "@supabase/supabase-js";
import { buildInvoiceDocument } from "@/app/invoice/_lib/buildInvoiceDocument";
import type { InvoiceDocumentData } from "@/app/invoice/_lib/invoiceTypes";

const PUBLIC_INVOICE_STATUSES = [
  "issued",
  "partially_paid",
  "paid",
  "overdue",
] as const;

export function createBillingServiceClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Billing server configuration is incomplete. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the Vercel project.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function isInvoicePublicToken(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function loadPublicInvoiceDocument(
  publicToken: string,
): Promise<InvoiceDocumentData | null> {
  if (!isInvoicePublicToken(publicToken)) return null;

  const client = createBillingServiceClient();

  const { data: invoice, error: invoiceError } = await client
    .from("gkp_billing_invoices")
    .select(
      "id,invoice_number,account_id,invoice_kind,billing_period,invoice_date,due_date,currency,status,subtotal,discount_total,credit_total,tax_total,total_amount,amount_paid,balance_due,issued_at,paid_at,public_token,public_link_enabled",
    )
    .eq("public_token", publicToken)
    .eq("public_link_enabled", true)
    .in("status", [...PUBLIC_INVOICE_STATUSES])
    .maybeSingle();

  if (invoiceError) {
    console.error("Public invoice lookup failed", invoiceError);
    return null;
  }

  if (!invoice) return null;

  const [settingsResult, accountResult, itemsResult, paymentsResult] =
    await Promise.all([
      client
        .from("gkp_billing_settings")
        .select(
          "business_name,business_address,billing_email,support_email,currency,timezone,is_gst_registered,gst_registration_number,payment_terms,footer_note",
        )
        .eq("id", true)
        .maybeSingle(),
      client
        .from("gkp_billing_accounts")
        .select(
          "account_code,payer_name,billing_email,phone,alternate_email,address",
        )
        .eq("id", invoice.account_id)
        .maybeSingle(),
      client
        .from("gkp_billing_invoice_items")
        .select(
          "id,student_id,item_type,description,quantity,unit_amount,discount_amount,line_total,sort_order,metadata,created_at",
        )
        .eq("invoice_id", invoice.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      client
        .from("gkp_billing_payments")
        .select(
          "provider,provider_reference,payment_method,amount,currency,paid_at",
        )
        .eq("invoice_id", invoice.id)
        .eq("status", "succeeded")
        .order("paid_at", { ascending: true }),
    ]);

  const firstError =
    settingsResult.error ||
    accountResult.error ||
    itemsResult.error ||
    paymentsResult.error;

  if (firstError || !settingsResult.data || !accountResult.data) {
    console.error("Public invoice data failed", firstError);
    return null;
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
    ? await client
        .from("gkp_billing_students")
        .select("id,full_name")
        .in("id", studentIds)
    : { data: [], error: null };

  if (studentsResult.error) {
    console.error("Public invoice student lookup failed", studentsResult.error);
    return null;
  }

  const document = buildInvoiceDocument({
    invoice,
    settings: settingsResult.data,
    account: accountResult.data,
    items,
    students: studentsResult.data || [],
    payments: paymentsResult.data || [],
    isAdminPreview: false,
  });

  const { error: viewError } = await client.rpc(
    "gkp_record_invoice_public_view",
    { p_public_token: publicToken },
  );

  if (viewError) {
    console.warn("Invoice view could not be recorded", viewError.message);
  }

  return document;
}
