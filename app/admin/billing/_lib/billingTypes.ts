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
  status: EnrolmentStatus;
  invoice_description: string | null;
  created_at: string;
  updated_at: string;
};
