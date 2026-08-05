export type PublicInvoiceStatus =
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue";

export type InvoiceBusinessSettings = {
  business_name: string;
  business_address: string;
  billing_email: string;
  support_email: string;
  currency: string;
  timezone: string;
  is_gst_registered: boolean;
  gst_registration_number: string | null;
  payment_terms: string;
  footer_note: string;
};

export type InvoiceAccount = {
  account_code: string;
  payer_name: string;
  billing_email: string;
  phone: string | null;
  alternate_email: string | null;
  address: string | null;
};

export type InvoicePayment = {
  provider: string;
  provider_reference: string | null;
  payment_method: string | null;
  amount: number;
  currency: string;
  paid_at: string | null;
};

export type InvoiceDocumentItem = {
  id: string;
  item_type: string;
  description: string;
  student_name: string | null;
  quantity: number;
  unit_amount: number;
  discount_amount: number;
  line_total: number;
  lesson_dates: string[];
  billing_frequency: string | null;
  discount_description: string | null;
  discount_basis_lessons: number | null;
  discount_per_lesson: number | null;
};

export type InvoiceDocumentData = {
  invoice: {
    id: string;
    invoice_number: string;
    invoice_kind: string;
    billing_period: string | null;
    invoice_date: string;
    due_date: string;
    currency: string;
    status: PublicInvoiceStatus | "draft" | "review" | "void";
    subtotal: number;
    discount_total: number;
    credit_total: number;
    tax_total: number;
    total_amount: number;
    amount_paid: number;
    balance_due: number;
    issued_at: string | null;
    paid_at: string | null;
    public_token: string;
    public_link_enabled: boolean;
  };
  settings: InvoiceBusinessSettings;
  account: InvoiceAccount;
  items: InvoiceDocumentItem[];
  payments: InvoicePayment[];
  public_status: PublicInvoiceStatus;
  is_admin_preview: boolean;
};
