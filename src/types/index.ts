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
  joined_at: string;
  created_at: string;
  updated_at: string;
  member_serial: number | null;
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
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  status: PaymentStatus;
  is_anonymous: boolean;
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
  sort_order: number;
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
