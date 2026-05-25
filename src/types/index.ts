export type MemberRole = 'admin' | 'member';
export type MemberStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type PostStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'scheduled' | 'archived' | 'trash';
export type EventType = 'event' | 'camp' | 'program';
export type AttendanceStatus = 'present' | 'absent' | 'volunteered';
export type PaymentStatus = 'created' | 'paid' | 'failed' | 'refunded';
export type ContributionStatus = 'paid' | 'unpaid' | 'pending';

export interface Member {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: MemberRole;
  status: MemberStatus;
  avatar_url: string | null;
  address: string | null;
  blood_group: string | null;
  bio: string | null;
  designation: string | null;
  skills: string[];
  expires_at: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
  member_serial: number | null;
  can_manage_posts: boolean;
  can_manage_events: boolean;
  can_manage_finance: boolean;
}

export function memberDisplayId(m: Pick<Member, 'member_serial'>): string {
  if (!m.member_serial) return 'CSWO-????';
  return 'CSWO-' + String(m.member_serial).padStart(4, '0');
}

export interface CswoPost {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  featured_image: string | null;
  author_id: string | null;
  author_name: string | null;
  published_date: string;
  slug: string | null;
  status: PostStatus;
  schedule_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  is_featured: boolean;
  is_sticky: boolean;
  og_title: string | null;
  og_image: string | null;
  share_snippet: string | null;
  created_at: string;
  updated_at: string;
}

export interface CswoCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface CswoEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  type: EventType;
  featured_image: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  event_id: string;
  member_id: string;
  status: AttendanceStatus;
  note: string | null;
  marked_by: string | null;
  marked_at: string;
  event?: CswoEvent;
  member?: Member;
}

export interface Donation {
  id: string;
  donor_name: string | null;
  donor_email: string | null;
  donor_phone: string | null;
  amount: number;
  currency: string;
  purpose: string | null;
  member_id: string | null;
  fund_id: string | null;
  campaign_id: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  status: PaymentStatus;
  is_anonymous: boolean;
  is_recurring: boolean;
  receipt_number: string | null;
  created_at: string;
  updated_at: string;
  member?: Member;
}

export interface MonthlyContribution {
  id: string;
  member_id: string;
  year: number;
  month: number;
  amount: number;
  status: ContributionStatus;
  paid_at: string | null;
  payment_method: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  receipt_number: string | null;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  member?: Member;
}

export type ExpenseStatus = 'draft' | 'approved';
export type CswoPaymentMethod = 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'online' | 'other';

export interface CswoFund {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  is_active: boolean;
  is_restricted: boolean;
  is_frozen: boolean;
  sort_order: number;
  created_at: string;
}

export type LedgerEntryType = 'donation' | 'contribution' | 'expense' | 'adjustment' | 'payroll' | 'grant';
export type LedgerDirection = 'credit' | 'debit';

export interface CswoLedgerEntry {
  id: string;
  entry_type: LedgerEntryType;
  source_id: string | null;
  fund_id: string | null;
  direction: LedgerDirection;
  amount: number;
  occurred_at: string;
  actor_id: string | null;
  note: string;
  created_at: string;
}

export interface CswoAuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface CswoExpense {
  id: string;
  fund_id: string;
  event_id: string | null;
  amount: number;
  currency: string;
  spent_on: string;
  vendor: string;
  description: string;
  payment_method: CswoPaymentMethod;
  receipt_image: string | null;
  recorded_by: string;
  approved_by: string | null;
  status: ExpenseStatus;
  created_at: string;
  updated_at: string;
  fund?: CswoFund;
}

export interface CswoBudget {
  id: string;
  fund_id: string;
  fiscal_year: string;
  allocated_amount: number;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface CswoCompliance {
  id: string;
  ckey: string;
  name_bn: string;
  name_en: string;
  authority: string;
  reg_number: string;
  issued_on: string | null;
  expiry_on: string | null;
  note: string;
  sort_order: number;
  updated_at: string;
  created_at: string;
}

export interface CswoDocument {
  id: string;
  title: string;
  category: string;
  file_url: string;
  file_type: string;
  uploaded_by: string | null;
  created_at: string;
}

export type BankAccountType = 'savings' | 'current' | 'cash' | 'other';
export interface CswoBankAccount {
  id: string;
  label: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  ifsc: string;
  branch: string;
  account_type: BankAccountType;
  opening_balance: number;
  is_active: boolean;
  note: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CswoBankTransaction {
  id: string;
  account_id: string;
  txn_date: string;
  description: string;
  reference: string;
  direction: LedgerDirection;
  amount: number;
  reconciled: boolean;
  note: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type GrantStatus = 'pending' | 'active' | 'completed' | 'closed';
export interface CswoGrant {
  id: string;
  grantor: string;
  title: string;
  reference: string;
  fund_id: string | null;
  sanctioned_amount: number;
  start_date: string | null;
  end_date: string | null;
  status: GrantStatus;
  contact_person: string;
  note: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TrancheStatus = 'expected' | 'received';
export interface CswoGrantTranche {
  id: string;
  grant_id: string;
  tranche_no: number;
  amount: number;
  received_on: string | null;
  status: TrancheStatus;
  reference: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export type NotificationKind = 'info' | 'finance' | 'approval' | 'member' | 'system';
export interface CswoNotification {
  id: string;
  recipient_id: string;
  title: string;
  body: string;
  kind: NotificationKind;
  link: string;
  is_read: boolean;
  created_at: string;
}

export type PayrollKind = 'salary' | 'honorarium' | 'stipend' | 'reimbursement';
export type PayrollStatus = 'pending' | 'paid' | 'cancelled';
export interface CswoPayroll {
  id: string;
  member_id: string | null;
  payee_name: string;
  designation: string;
  kind: PayrollKind;
  period: string;
  amount: number;
  fund_id: string | null;
  status: PayrollStatus;
  note: string;
  paid_on: string | null;
  created_by: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export type RefundStatus = 'requested' | 'approved' | 'processed' | 'rejected';
export interface CswoRefund {
  id: string;
  donation_id: string | null;
  amount: number;
  reason: string;
  status: RefundStatus;
  requested_by: string | null;
  approved_by: string | null;
  note: string;
  created_at: string;
  processed_at: string | null;
}

export interface CswoCampaign {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  goal_amount: number;
  fund_id: string | null;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
  description: string;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface VolunteerApplication {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  area_of_interest: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  created_at: string;
}
