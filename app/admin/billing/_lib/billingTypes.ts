export type BillingFrequency =
  | "monthly"
  | "termly"
  | "one_off"
  | "per_lesson";

export type AccountStatus = "active" | "inactive" | "archived";

export type StudentStatus =
  | "active"
  | "inactive"
  | "graduated"
  | "archived";

export type EnrolmentStatus =
  | "active"
  | "paused"
  | "ended"
  | "cancelled";

export type InvoiceStatus =
  | "draft"
  | "review"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void";

export type InvoiceItemType =
  | "programme_fee"
  | "registration_fee"
  | "materials_fee"
  | "deposit"
  | "discount"
  | "credit"
  | "other";

export type BillingAccountOverview = {
  id: string;
  account_code: string;
  payer_name: string;
  billing_email: string;
  phone: string | null;
  default_due_day: number;
  status: AccountStatus;
  student_count: number;
  active_enrolment_count: number;
  recurring_monthly_total: number | string;
  latest_invoice_date: string | null;
  created_at: string;
  updated_at: string;
};

export type BillingAccount = {
  id: string;
  account_code: string;
  payer_name: string;
  billing_email: string;
  phone: string | null;
  alternate_email: string | null;
  address: string | null;
  default_due_day: number;
  status: AccountStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BillingStudent = {
  id: string;
  account_id: string;
  dreamscape_user_id: string | null;
  student_code: string;
  full_name: string;
  preferred_name: string | null;
  date_of_birth: string | null;
  school: string | null;
  academic_level: string | null;
  status: StudentStatus;
  joined_on: string | null;
  left_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BillingProgramme = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  default_fee: number | string;
  billing_frequency: BillingFrequency;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BillingEnrolment = {
  id: string;
  student_id: string;
  programme_id: string;
  start_date: string;
  end_date: string | null;
  agreed_fee: number | string;
  billing_frequency: BillingFrequency;
  standard_discount_amount: number | string;
  discount_description: string | null;
  discount_basis_lessons: number;
  regular_weekday: number | null;
  regular_start_time: string | null;
  status: EnrolmentStatus;
  invoice_description: string | null;
  created_at: string;
  updated_at: string;
};

export type BillingInvoiceOverview = {
  id: string;
  invoice_number: string;
  account_id: string;
  batch_id: string | null;
  invoice_kind: string;
  billing_period: string | null;
  invoice_date: string;
  due_date: string;
  currency: string;
  status: InvoiceStatus;
  subtotal: number | string;
  discount_total: number | string;
  credit_total: number | string;
  tax_total: number | string;
  total_amount: number | string;
  amount_paid: number | string;
  balance_due: number | string;
  public_token: string;
  public_link_enabled: boolean;
  public_link_last_rotated_at: string | null;
  public_link_last_viewed_at: string | null;
  public_link_view_count: number | string;
  issued_at: string | null;
  paid_at: string | null;
  hitpay_payment_request_id: string | null;
  hitpay_payment_status: string | null;
  hitpay_payment_environment: "sandbox" | "production" | null;
  hitpay_payment_request_created_at: string | null;
  hitpay_qr_expiry: string | null;
  hitpay_requested_amount: number | string | null;
  hitpay_last_webhook_at: string | null;
  successful_payment_total: number | string;
  overpayment_amount: number | string;
  created_at: string;
  updated_at: string;
  account_code: string;
  payer_name: string;
  billing_email: string;
  phone: string | null;
  item_count: number;
  student_count: number;
  lesson_count: number;
};

export type BillingInvoiceItem = {
  id: string;
  invoice_id: string;
  student_id: string | null;
  enrolment_id: string | null;
  item_type: InvoiceItemType;
  description: string;
  quantity: number | string;
  unit_amount: number | string;
  discount_amount: number | string;
  line_total: number | string;
  sort_order: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type BillingInvoiceBatch = {
  id: string;
  billing_period: string;
  status: "draft" | "issued" | "void";
  generated_invoice_count: number;
  generated_item_count: number;
  skipped_account_count: number;
  generated_at: string;
  issued_at: string | null;
};

export type NonTeachingDate = {
  id: string;
  closure_date: string;
  description: string;
  created_at: string;
};

export type LessonOccurrenceOverview = {
  id: string;
  enrolment_id: string;
  lesson_date: string;
  start_time: string | null;
  status: "scheduled" | "cancelled" | "replacement" | "extra";
  is_billable: boolean;
  source: "generated" | "manual";
  is_locked: boolean;
  notes: string | null;
  student_id: string;
  programme_id: string;
  regular_weekday: number | null;
  account_id: string;
  student_name: string;
  student_code: string;
  programme_name: string;
  programme_code: string;
  payer_name: string;
  account_code: string;
};
