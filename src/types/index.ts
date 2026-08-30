export type MemberRole = 'admin' | 'member';
export type MemberStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type PostStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'scheduled' | 'archived' | 'trash';
export type EventType = 'event' | 'camp' | 'program';
export type AttendanceStatus = 'present' | 'absent' | 'volunteered';
export type PaymentStatus = 'created' | 'paid' | 'failed' | 'refunded';
export type ContributionStatus = 'paid' | 'unpaid' | 'pending';
export type PaymentGateway = 'razorpay' | 'cashfree' | 'offline';

// Admin-controlled gateway mode
export type GatewayMode = 'both' | 'razorpay' | 'cashfree';

export interface SiteSettings {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

// ── CMS Content Types ──────────────────────────────────────────────────────────
export type PostType =
  | 'general' | 'news' | 'blog' | 'story' | 'notice'
  | 'press_release' | 'program' | 'project' | 'campaign'
  | 'volunteer_story' | 'document' | 'report' | 'event';

export const POST_TYPE_LABELS: Record<PostType, string> = {
  general: 'General', news: 'News', blog: 'Blog', story: 'Story',
  notice: 'Notice', press_release: 'Press Release', program: 'Program',
  project: 'Project', campaign: 'Campaign', volunteer_story: 'Volunteer Story',
  document: 'Document', report: 'Report', event: 'Event',
};

export const POST_TYPE_ICONS: Record<PostType, string> = {
  general: '', news: '', blog: '', story: '', notice: '',
  press_release: '', program: '', project: '', campaign: '',
  volunteer_story: '', document: '', report: '', event: '',
};

export type PostVisibility = 'public' | 'members' | 'private';
export type ComputedEventStatus = 'upcoming' | 'ongoing' | 'past';

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
  // CMS Phase 1 extensions
  post_type: PostType;
  visibility: PostVisibility;
  excerpt: string | null;
  reading_time: number;
  view_count: number;
  language: string;
  deleted_at: string | null;
  canonical_url: string | null;
}

export interface CswoPostRevision {
  id: string;
  post_id: string;
  version: number;
  snapshot: Partial<CswoPost>;
  saved_by: string | null;
  saved_at: string;
  // joined
  saved_by_name?: string | null;
}

export interface CswoTag {
  id: string;
  name: string;
  slug: string;
  usage_count: number;
  created_at: string;
}

export interface CswoMedia {
  id: string;
  folder_id: string | null;
  filename: string;
  file_url: string;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  alt_text: string;
  caption: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface CswoMediaFolder {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  created_by: string | null;
}

export type ApprovalAction = 'submitted' | 'approved' | 'rejected' | 'changes_requested';

export interface CswoPostApproval {
  id: string;
  post_id: string;
  reviewer_id: string | null;
  action: ApprovalAction;
  notes: string;
  created_at: string;
  // joined
  reviewer_name?: string | null;
  post_title?: string | null;
}

export interface CswoPostAnalytics {
  id: string;
  post_id: string;
  view_date: string;
  view_count: number;
}

export interface CswoCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
}

export type EventStatus = 'draft' | 'planned' | 'approved' | 'live' | 'completed' | 'cancelled';
export interface CswoEvent {
  // CMS Phase 1 event extensions (injected before end of interface)
  post_id?: string | null;
  registration_link?: string | null;
  capacity?: number | null;
  registration_deadline?: string | null;
  is_free?: boolean;
  price?: number | null;
  banner_image?: string | null;
  timezone?: string;
  organizer?: string | null;
  computed_status?: ComputedEventStatus;
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
  category: string;
  event_code: string | null;
  status: EventStatus;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  district: string;
  state: string;
  pincode: string;
  map_link: string;
  expected_participants: number;
  form_type: 'general' | 'blood_donation' | 'relief_distribution';
  latitude: number | null;
  longitude: number | null;
  attendance_radius: number;
  // Simple static QR attendance fields
  attendance_qr_token: string | null;
  attendance_enabled: boolean;
  attendance_start_time: string | null;
  attendance_end_time: string | null;
}

export type EventBudgetStatus = 'planned' | 'approved' | 'paid';
export interface CswoEventBudgetItem {
  id: string;
  event_id: string;
  category: string;
  planned: number;
  approved: number;
  actual: number;
  vendor: string;
  status: EventBudgetStatus;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface CswoEventVolunteer {
  id: string;
  event_id: string;
  member_id: string | null;
  name: string;
  role: string;
  phone: string;
  department: string;
  shift: string;
  attended: boolean;
  note: string;
  created_at: string;
  updated_at: string;
}

export type AttendanceMarkedType = 'QR' | 'ADMIN' | 'MANUAL' | 'SYSTEM';
export type AttendanceMethod = 'qr' | 'manual' | 'admin';

export interface Attendance {
  id: string;
  event_id: string;
  member_id: string;
  status: AttendanceStatus;
  note: string | null;
  marked_by: string | null;
  marked_at: string;
  marked_type: AttendanceMarkedType;
  check_in_time: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_m: number | null;
  // Simple QR attendance fields
  attendance_method: AttendanceMethod;
  device_info: string | null;
  event?: CswoEvent;
  member?: Member;
}

export interface QrSession {
  id: string;
  event_id: string;
  session_token: string;
  expires_at: string;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
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
  event_id: string | null;
  payment_method: CswoPaymentMethod;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  cashfree_order_id: string | null;
  cashfree_payment_id: string | null;
  payment_gateway: PaymentGateway;
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
  cashfree_order_id: string | null;
  cashfree_payment_id: string | null;
  payment_gateway: PaymentGateway;
  receipt_number: string | null;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  member?: Member;
}

export type ExpenseStatus = 'draft' | 'approved' | 'rejected';
export type CswoPaymentMethod = 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'online' | 'other';

export type LedgerEntryType = 'donation' | 'contribution' | 'expense' | 'adjustment';
export type LedgerDirection = 'credit' | 'debit';

export interface CswoLedgerEntry {
  id: string;
  entry_type: LedgerEntryType;
  source_id: string | null;
  event_id: string | null;
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
  rejection_reason?: string | null;
  bank_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = 'draft' | 'unpaid' | 'partial' | 'paid' | 'cancelled';

export interface CswoInvoiceItem {
  id: string;
  invoice_id: string;
  sort_order: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  created_at: string;
}

export interface CswoInvoice {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  bill_to_name: string;
  bill_to_email: string;
  bill_to_phone: string;
  bill_to_address: string;
  issue_date: string;
  due_date: string | null;
  event_id: string | null;
  payment_method: CswoPaymentMethod;
  bank_account_id: string | null;
  payment_ref: string;
  subtotal: number;
  discount: number;
  round_off: number;
  total: number;
  amount_paid: number;
  notes: string;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  items?: CswoInvoiceItem[];
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
  file_url: string;
  file_type: string;
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
  statement_balance: number;
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

export type BloodGroup = '' | 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';
export type DonorStatus = 'registered' | 'donated' | 'rejected';
export interface CswoBloodDonor {
  id: string;
  event_id: string;
  donor_code: string | null;
  name: string;
  age: number | null;
  gender: '' | 'male' | 'female' | 'other';
  blood_group: BloodGroup;
  phone: string;
  address: string;
  aadhar: string;
  /** Generated in Postgres: aadhar -> phone -> name. Same person across camps. */
  donor_key: string;
  member_id: string | null;
  status: DonorStatus;
  units: number;
  created_at: string;
  updated_at: string;
}

export interface CswoBloodBank {
  id: string;
  event_id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  license_no: string;
  team_size: number;
  beds: number;
  ambulance: boolean;
  generator: boolean;
  equipment: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface CswoEventInventory {
  id: string;
  event_id: string;
  item: string;
  category: string;
  variant: string;
  qty_required: number;
  qty_available: number;
  unit_cost: number;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface CswoEventBeneficiary {
  id: string;
  event_id: string;
  beneficiary_code: string | null;
  name: string;
  age: number | null;
  gender: '' | 'male' | 'female' | 'other';
  phone: string;
  address: string;
  family_size: number;
  income_category: string;
  id_proof: string;
  verified: boolean;
  inventory_id: string | null;
  item_received: string;
  quantity: number;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface CswoEventDocument {
  id: string;
  event_id: string;
  title: string;
  category: string;
  file_url: string;
  file_type: string;
  uploaded_by: string | null;
  created_at: string;
}

export type CertRecipientType = 'participant' | 'winner' | 'volunteer' | 'donor' | 'custom';
export interface CswoEventCertificate {
  id: string;
  event_id: string;
  cert_code: string | null;
  recipient_name: string;
  recipient_type: CertRecipientType;
  category: string;
  position: string;
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
  category: string;
  is_read: boolean;
  is_starred: boolean;
  admin_reply: string;
  replied_at: string | null;
  replied_by: string | null;
}
