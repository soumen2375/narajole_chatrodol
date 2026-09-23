import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { memberDisplayId } from '@/types';
import type { CswoAuditLog } from '@/types';
import { useFmt, formatCurrency, monthNames } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';
import {
  AlertTriangle,
  Bot,
  CalendarDays,
  ChevronDown,
  Download,
  Droplet,
  Info,
  Globe,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';

/**
 * Audit log, written for the people who read it: committee members checking
 * who did what, usually on a phone.
 *
 * Every entry is turned into a sentence ("Sayan Samanta removed the donation
 * from Subhadip Jana of ₹500") with the changed fields listed underneath as
 * "Status: registered → donated". Table names, UUIDs and JSON are still one
 * tap away under "Technical details" for whoever needs to trace a record.
 *
 * The log is fetched in 1,000-row pages until the chosen period is complete.
 * A single select stops at Supabase's row cap, which used to hide everything
 * older than the thousandth entry without saying so.
 */

// ── Palette (AA contrast on white) ───────────────────────────────────────────

const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#57534e';
const RULE = '#e7e5e4';
const BRAND = '#0c756f';
const PAPER = '#ffffff';
const CREAM = '#faf6ef';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c756f]';

// ── Vocabulary ───────────────────────────────────────────────────────────────

type Area = 'money' | 'people' | 'events' | 'blood' | 'website';
type Kind = 'added' | 'changed' | 'removed';

const AREAS: Record<Area, { en: string; bn: string; icon: LucideIcon; fg: string; bg: string }> = {
  money: { en: 'Money', bn: 'অর্থ', icon: Wallet, fg: '#0e6f4a', bg: '#e8f6ee' },
  people: { en: 'Members', bn: 'সদস্য', icon: Users, fg: '#1a5fd0', bg: '#eef4ff' },
  events: { en: 'Events', bn: 'অনুষ্ঠান', icon: CalendarDays, fg: '#7c3aed', bg: '#f3eefe' },
  blood: { en: 'Blood camp', bn: 'রক্তদান', icon: Droplet, fg: '#b91c1c', bg: '#fdecec' },
  website: { en: 'Website', bn: 'ওয়েবসাইট', icon: Globe, fg: '#b45309', bg: '#fdf3e3' },
};

/** What each table holds, in words. `area` decides the filter it falls under. */
const ENTITIES: Record<string, { en: string; bn: string; area: Area }> = {
  cswo_donations: { en: 'donation', bn: 'অনুদান', area: 'money' },
  cswo_monthly_contributions: { en: 'monthly dues payment', bn: 'মাসিক চাঁদা', area: 'money' },
  cswo_expenses: { en: 'expense', bn: 'খরচ', area: 'money' },
  cswo_bank_transactions: { en: 'bank / cash entry', bn: 'ব্যাংক / নগদ এন্ট্রি', area: 'money' },
  cswo_bank_accounts: { en: 'bank account', bn: 'ব্যাংক অ্যাকাউন্ট', area: 'money' },
  cswo_refunds: { en: 'refund', bn: 'ফেরত', area: 'money' },
  cswo_funds: { en: 'fund', bn: 'ফান্ড', area: 'money' },
  cswo_grants: { en: 'grant', bn: 'অনুদান প্রকল্প', area: 'money' },
  cswo_payroll: { en: 'payroll entry', bn: 'বেতন এন্ট্রি', area: 'money' },
  cswo_campaigns: { en: 'campaign', bn: 'প্রচারাভিযান', area: 'money' },
  cswo_budgets: { en: 'budget', bn: 'বাজেট', area: 'money' },
  cswo_members: { en: 'member', bn: 'সদস্য', area: 'people' },
  cswo_events: { en: 'event', bn: 'অনুষ্ঠান', area: 'events' },
  cswo_attendance: { en: 'attendance', bn: 'উপস্থিতি', area: 'events' },
  attendance: { en: 'attendance', bn: 'উপস্থিতি', area: 'events' },
  cswo_event_certificates: { en: 'event certificate', bn: 'অনুষ্ঠানের সার্টিফিকেট', area: 'events' },
  cswo_event_documents: { en: 'event document', bn: 'অনুষ্ঠানের নথি', area: 'events' },
  cswo_blood_donors: { en: 'blood donor', bn: 'রক্তদাতা', area: 'blood' },
  cswo_blood_banks: { en: 'blood bank', bn: 'ব্লাড ব্যাংক', area: 'blood' },
  cswo_posts: { en: 'post', bn: 'পোস্ট', area: 'website' },
  cswo_gallery: { en: 'gallery photo', bn: 'গ্যালারির ছবি', area: 'website' },
  cswo_categories: { en: 'category', bn: 'ক্যাটাগরি', area: 'website' },
};

const entityOf = (e: string) =>
  ENTITIES[e] ?? { en: e.replace(/^cswo_/, '').replace(/_/g, ' '), bn: e.replace(/^cswo_/, '').replace(/_/g, ' '), area: 'website' as Area };

const FIELD_LABELS: Record<string, [string, string]> = {
  amount: ['Amount', 'পরিমাণ'],
  status: ['Status', 'অবস্থা'],
  purpose: ['Purpose', 'উদ্দেশ্য'],
  donor_name: ['Donor name', 'দাতার নাম'],
  donor_email: ['Donor email', 'দাতার ইমেল'],
  donor_phone: ['Donor mobile', 'দাতার মোবাইল'],
  is_anonymous: ['Anonymous', 'নাম গোপন'],
  is_recurring: ['Monthly donor', 'মাসিক দাতা'],
  payment_method: ['Payment method', 'পেমেন্ট পদ্ধতি'],
  payment_gateway: ['Payment gateway', 'পেমেন্ট গেটওয়ে'],
  cashfree_payment_id: ['Cashfree payment ID', 'Cashfree পেমেন্ট আইডি'],
  razorpay_payment_id: ['Razorpay payment ID', 'Razorpay পেমেন্ট আইডি'],
  receipt_number: ['Receipt no.', 'রসিদ নং'],
  receipt_email_status: ['Receipt email', 'রসিদ ইমেল'],
  receipt_email_sent_at: ['Receipt emailed at', 'রসিদ পাঠানোর সময়'],
  receipt_email_error: ['Receipt email error', 'রসিদ ইমেল ত্রুটি'],
  paid_at: ['Paid at', 'পরিশোধের সময়'],
  month: ['Month', 'মাস'],
  year: ['Year', 'বছর'],
  title: ['Title', 'শিরোনাম'],
  name: ['Name', 'নাম'],
  full_name: ['Name', 'নাম'],
  email: ['Email', 'ইমেল'],
  phone: ['Mobile', 'মোবাইল'],
  role: ['Role', 'ভূমিকা'],
  designation: ['Designation', 'পদ'],
  member_serial: ['Member serial', 'সদস্য ক্রমিক'],
  joined_at: ['Joined on', 'যোগদানের তারিখ'],
  can_manage_posts: ['Can manage posts', 'পোস্ট পরিচালনা'],
  can_manage_events: ['Can manage events', 'অনুষ্ঠান পরিচালনা'],
  can_manage_finance: ['Can manage finance', 'অর্থ পরিচালনা'],
  description: ['Description', 'বিবরণ'],
  vendor: ['Paid to', 'প্রাপক'],
  spent_on: ['Spent on', 'খরচের তারিখ'],
  txn_date: ['Date', 'তারিখ'],
  direction: ['In / out', 'জমা / খরচ'],
  reference: ['Reference', 'রেফারেন্স'],
  reconciled: ['Reconciled', 'মিলানো হয়েছে'],
  account_id: ['Account', 'অ্যাকাউন্ট'],
  bank_account_id: ['Account', 'অ্যাকাউন্ট'],
  label: ['Label', 'লেবেল'],
  is_default: ['Default account', 'ডিফল্ট অ্যাকাউন্ট'],
  is_active: ['Active', 'সক্রিয়'],
  event_id: ['Event', 'অনুষ্ঠান'],
  member_id: ['Member', 'সদস্য'],
  admin_id: ['Marked by', 'চিহ্নিত করেছেন'],
  recorded_by: ['Recorded by', 'নথিভুক্ত করেছেন'],
  approved_by: ['Approved by', 'অনুমোদন করেছেন'],
  created_by: ['Created by', 'তৈরি করেছেন'],
  marked_by: ['Marked by', 'চিহ্নিত করেছেন'],
  marked_type: ['Marked via', 'চিহ্নিত মাধ্যম'],
  attendance_method: ['Marked via', 'চিহ্নিত মাধ্যম'],
  attendance_time: ['Time', 'সময়'],
  check_in_time: ['Check-in time', 'চেক-ইন সময়'],
  device_info: ['Device', 'ডিভাইস'],
  units: ['Units', 'ইউনিট'],
  blood_group: ['Blood group', 'রক্তের গ্রুপ'],
  age: ['Age', 'বয়স'],
  gender: ['Gender', 'লিঙ্গ'],
  address: ['Address', 'ঠিকানা'],
  aadhar: ['Aadhaar', 'আধার'],
  donor_code: ['Donor code', 'দাতা কোড'],
  hemoglobin: ['Hemoglobin', 'হিমোগ্লোবিন'],
  weight: ['Weight', 'ওজন'],
  note: ['Note', 'নোট'],
  category: ['Category', 'বিভাগ'],
  category_en: ['Category (English)', 'বিভাগ (ইংরেজি)'],
  category_bn: ['Category (Bengali)', 'বিভাগ (বাংলা)'],
  alt_en: ['Caption (English)', 'ক্যাপশন (ইংরেজি)'],
  alt_bn: ['Caption (Bengali)', 'ক্যাপশন (বাংলা)'],
  schedule_at: ['Scheduled for', 'নির্ধারিত সময়'],
  start_date: ['Start date', 'শুরুর তারিখ'],
  end_date: ['End date', 'শেষের তারিখ'],
  recipient_name: ['Recipient', 'প্রাপক'],
  recipient_type: ['Recipient type', 'প্রাপকের ধরন'],
  cert_code: ['Certificate code', 'সার্টিফিকেট কোড'],
  is_restricted: ['Restricted', 'সীমাবদ্ধ'],
  avatar_url: ['Profile photo', 'প্রোফাইল ছবি'],
  src: ['Image', 'ছবি'],
  file_url: ['File', 'ফাইল'],
};

/** Plumbing fields that mean nothing to a reader. */
const HIDDEN_FIELDS = new Set([
  'id', 'created_at', 'updated_at', 'deleted_at', 'currency', 'donor_key',
  'receipt_email_message_id', 'receipt_email_attempts',
  'cashfree_order_id', 'razorpay_order_id', 'razorpay_signature',
  'latitude', 'longitude', 'distance_m', 'sort_order', 'content', 'slug',
]);

/** Changes to these on a member are permission changes — worth a second look. */
const PERMISSION_FIELDS = ['role', 'status', 'can_manage_posts', 'can_manage_events', 'can_manage_finance'];

/**
 * Where to look up a record's name when its log entry is an update (which only
 * stores the changed fields) and the period loaded has no insert to borrow it
 * from — e.g. a camp's donors, registered weeks before being marked donated.
 */
const NAME_SOURCES: Record<string, string> = {
  cswo_blood_donors: 'name',
  cswo_blood_banks: 'name',
  cswo_posts: 'title',
  cswo_gallery: 'alt_en',
  cswo_expenses: 'description',
  cswo_donations: 'donor_name',
  cswo_bank_transactions: 'description',
  cswo_event_certificates: 'recipient_name',
  cswo_event_documents: 'title',
};

/**
 * Stored codes shown as words. "created → pending" means nothing to a
 * committee member; "Awaiting payment → Processing" does.
 */
const VALUE_WORDS: Record<string, [string, string]> = {
  created: ['Awaiting payment', 'পেমেন্টের অপেক্ষায়'],
  pending: ['Processing', 'প্রক্রিয়াধীন'],
  paid: ['Paid', 'পরিশোধিত'],
  failed: ['Failed', 'ব্যর্থ'],
  refunded: ['Refunded', 'ফেরত দেওয়া'],
  cancelled: ['Cancelled', 'বাতিল'],
  sending: ['Sending', 'পাঠানো হচ্ছে'],
  sent: ['Sent', 'পাঠানো হয়েছে'],
  registered: ['Registered', 'নিবন্ধিত'],
  donated: ['Donated', 'রক্তদান করেছেন'],
  deferred: ['Deferred', 'স্থগিত'],
  approved: ['Approved', 'অনুমোদিত'],
  rejected: ['Rejected', 'প্রত্যাখ্যাত'],
  draft: ['Draft', 'খসড়া'],
  published: ['Published', 'প্রকাশিত'],
  present: ['Present', 'উপস্থিত'],
  online: ['Online', 'অনলাইন'],
  cash: ['Cash', 'নগদ'],
  upi: ['UPI', 'UPI'],
  qr: ['QR scan', 'QR স্ক্যান'],
  admin: ['Admin', 'অ্যাডমিন'],
  super_admin: ['Super admin', 'সুপার অ্যাডমিন'],
  executive_admin: ['Executive admin', 'এক্সিকিউটিভ অ্যাডমিন'],
  member: ['Member', 'সদস্য'],
  cashfree: ['Cashfree', 'Cashfree'],
  razorpay: ['Razorpay', 'Razorpay'],
  offline: ['Offline', 'অফলাইন'],
};

/** Fields whose values are codes rather than free text. */
const CODE_FIELDS = new Set([
  'status', 'payment_method', 'payment_gateway', 'receipt_email_status', 'role', 'marked_type',
  'attendance_method', 'recipient_type', 'gender', 'type', 'kind', 'account_type',
]);

const NAME_KEYS = ['title', 'full_name', 'name', 'donor_name', 'recipient_name', 'label', 'vendor', 'description'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}(T|\s|$)/;

type Changes = Record<string, { from: unknown; to: unknown }>;
type Snapshot = Record<string, unknown>;

interface Lookups {
  members: Record<string, { full_name: string; member_serial: number; email: string; role: string; blood_group: string | null }>;
  events: Record<string, string>;
  accounts: Record<string, string>;
  /** entity_id → the record's name, for updates that do not carry one. */
  records: Record<string, string>;
}

interface Entry {
  row: CswoAuditLog;
  area: Area;
  kind: Kind;
  attention: boolean;
  actorName: string | null;
  sentence: string;
  /** Name of the record acted on, when one is known. */
  name: string;
  ent: { en: string; bn: string; area: Area };
  /**
   * A finer label for what happened (e.g. 'payment_paid'), used to give the
   * line a specific sentence and to keep unlike changes out of one group.
   */
  tag: string;
  /** Members this change is about: the member edited, the payer, the attendee. */
  subjects: string[];
  changes: Changes | null;
  snapshot: Snapshot | null;
  searchText: string;
}

/** A feed line: one entry, or a run of near-identical ones collapsed together. */
type Item =
  | { type: 'one'; key: string; entry: Entry }
  | { type: 'group'; key: string; entries: Entry[] };

type Period = 'today' | '7d' | '30d' | '90d' | 'all';

const PAGE = 30;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAudit() {
  const { lang } = useT();
  const fmt = useFmt();
  const bn = lang === 'bn';
  const tr = useCallback((en: string, bnText: string) => (bn ? bnText : en), [bn]);

  const [rows, setRows] = useState<CswoAuditLog[]>([]);
  const [lookups, setLookups] = useState<Lookups>({ members: {}, events: {}, accounts: {}, records: {} });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [period, setPeriod] = useState<Period>('30d');
  const [query, setQuery] = useState('');
  const [area, setArea] = useState<Area | 'all'>('all');
  const [kind, setKind] = useState<Kind | 'all'>('all');
  // 'all' | 'people' | 'system' | a member id.
  const [who, setWho] = useState<string>('all');
  // For a chosen member: changes they made, or changes made about them.
  const [scope, setScope] = useState<'by' | 'about'>('by');
  const selectedMember = who !== 'all' && who !== 'people' && who !== 'system' ? who : null;
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [visible, setVisible] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    let since: string | null = null;
    if (period !== 'all') {
      const d = new Date();
      if (period === 'today') d.setHours(0, 0, 0, 0);
      else d.setDate(d.getDate() - (period === '7d' ? 7 : period === '30d' ? 30 : 90));
      since = d.toISOString();
    }

    const all: CswoAuditLog[] = [];
    for (let from = 0; ; from += 1000) {
      let q = supabase.from('cswo_audit_log').select('*').order('created_at', { ascending: false }).range(from, from + 999);
      if (since) q = q.gte('created_at', since);
      const { data, error } = await q;
      if (error) { setLoadError(error.message); break; }
      all.push(...((data ?? []) as CswoAuditLog[]));
      if (!data || data.length < 1000) break;
    }

    const [m, e, a] = await Promise.all([
      supabase.from('cswo_members').select('id, full_name, member_serial, email, role, blood_group'),
      supabase.from('cswo_events').select('id, title'),
      supabase.from('cswo_bank_accounts').select('id, label'),
    ]);

    // Names for updated records, fetched per table in chunks the URL can carry.
    const wanted: Record<string, Set<string>> = {};
    for (const r of all) {
      if (r.action === 'update' && r.entity_id && NAME_SOURCES[r.entity]) {
        (wanted[r.entity] ??= new Set()).add(r.entity_id);
      }
    }
    const records: Record<string, string> = {};
    await Promise.all(Object.entries(wanted).flatMap(([table, ids]) => {
      const list = [...ids];
      const col = NAME_SOURCES[table];
      const chunks: string[][] = [];
      for (let i = 0; i < list.length; i += 150) chunks.push(list.slice(i, i + 150));
      return chunks.map(async (chunk) => {
        const { data } = await supabase.from(table).select(`id, ${col}`).in('id', chunk);
        for (const rec of (data ?? []) as unknown as Array<Record<string, unknown>>) {
          const v = rec[col];
          if (typeof v === 'string' && v.trim()) records[String(rec.id)] = v.trim();
        }
      });
    }));

    setLookups({
      members: Object.fromEntries((m.data ?? []).map((r) => [r.id, r])),
      events: Object.fromEntries((e.data ?? []).map((r) => [r.id, r.title])),
      accounts: Object.fromEntries((a.data ?? []).map((r) => [r.id, r.label])),
      records,
    });
    setRows(all);
    setVisible(PAGE);
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // ── Formatting ─────────────────────────────────────────────────────────────
  // Built from `lang`, not the `fmt` object, which is new on every render and
  // would rebuild every entry on each keystroke in the search box.
  const money = useCallback((v: unknown) => formatCurrency(Number(v), lang), [lang]);

  const fieldLabel = useCallback((k: string) => {
    const l = FIELD_LABELS[k];
    if (l) return bn ? l[1] : l[0];
    const s = k.replace(/_/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [bn]);

  const formatValue = useCallback((key: string, v: unknown): string => {
    if (v === null || v === undefined || v === '') return tr('(empty)', '(খালি)');
    if (typeof v === 'boolean') return v ? tr('Yes', 'হ্যাঁ') : tr('No', 'না');
    if (Array.isArray(v)) return v.length ? v.map(String).join(', ') : tr('(none)', '(নেই)');
    if (typeof v === 'object') return JSON.stringify(v);
    if (key === 'amount' || key.endsWith('_amount') || key.endsWith('_balance')) return money(v);
    if (key === 'aadhar') { const s = String(v); return s.length > 4 ? `XXXX XXXX ${s.slice(-4)}` : s; }
    if (key === 'month' && Number(v) >= 1 && Number(v) <= 12) return monthNames(lang)[Number(v) - 1];
    if (key === 'direction') return v === 'credit' ? tr('Money in', 'জমা') : v === 'debit' ? tr('Money out', 'খরচ') : String(v);

    const s = String(v);
    if (UUID_RE.test(s)) {
      const m = lookups.members[s];
      if (m) return m.full_name;
      if (lookups.events[s]) return lookups.events[s];
      if (lookups.accounts[s]) return lookups.accounts[s];
      return `#${s.slice(0, 8)}`;
    }
    if (ISO_RE.test(s)) {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) {
        const dateOnly = s.length <= 10;
        return d.toLocaleString(bn ? 'bn-IN' : 'en-IN', dateOnly
          ? { day: 'numeric', month: 'short', year: 'numeric' }
          : { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
      }
    }
    if (CODE_FIELDS.has(key)) {
      const w = VALUE_WORDS[s.toLowerCase()];
      if (w) return bn ? w[1] : w[0];
      const t = s.toLowerCase().replace(/_/g, ' ');
      return t.charAt(0).toUpperCase() + t.slice(1);
    }
    const plain = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return plain.length > 140 ? `${plain.slice(0, 137)}…` : plain;
  }, [tr, money, lang, lookups, bn]);

  // ── Turn raw rows into readable entries ──────────────────────────────────────
  const entries = useMemo<Entry[]>(() => {
    // Updates only record what changed, so the record's name is usually not
    // in them. Borrow it from any insert/delete of the same record we loaded.
    const knownName: Record<string, string> = {};
    for (const r of rows) {
      const snap = (r.detail?.new ?? r.detail?.deleted) as Snapshot | undefined;
      if (!snap || !r.entity_id || knownName[r.entity_id]) continue;
      for (const k of NAME_KEYS) {
        if (typeof snap[k] === 'string' && (snap[k] as string).trim()) { knownName[r.entity_id] = (snap[k] as string).trim(); break; }
      }
    }
    // Which member a record belongs to (dues, attendance), for updates that
    // only carry the changed fields.
    const memberOf: Record<string, string> = {};
    for (const r of rows) {
      const snap = (r.detail?.new ?? r.detail?.deleted ?? r.detail) as Snapshot | undefined;
      if (r.entity_id && typeof snap?.member_id === 'string') memberOf[r.entity_id] = snap.member_id;
    }

    return rows.map((row) => {
      const ent = entityOf(row.entity);
      const detail = row.detail ?? {};
      const changes = (detail.changes as Changes | undefined) ?? null;
      const snapshot = ((detail.new ?? detail.deleted) as Snapshot | undefined)
        ?? (changes ? null : (Object.keys(detail).length ? (detail as Snapshot) : null));

      const kind: Kind = row.action === 'delete' ? 'removed'
        : row.action === 'update' || row.action.includes('.') ? 'changed'
          : 'added';

      const actor = row.actor_id ? lookups.members[row.actor_id] : null;
      const actorName = actor?.full_name ?? (row.actor_id ? tr('A former member', 'প্রাক্তন সদস্য') : null);

      // Name of the record the action was on.
      let name = '';
      if (snapshot) {
        for (const k of NAME_KEYS) {
          if (typeof snapshot[k] === 'string' && (snapshot[k] as string).trim()) { name = (snapshot[k] as string).trim(); break; }
        }
      }
      if (!name && row.entity_id) {
        name = knownName[row.entity_id]
          ?? lookups.records[row.entity_id]
          ?? lookups.members[row.entity_id]?.full_name
          ?? lookups.events[row.entity_id]
          ?? lookups.accounts[row.entity_id]
          ?? '';
      }
      const ownerId = (typeof snapshot?.member_id === 'string' ? snapshot.member_id : null)
        ?? (row.entity_id ? memberOf[row.entity_id] : undefined) ?? null;
      // Dues and similar records have no name of their own; the member's is the useful one.
      if (!name && ownerId) name = lookups.members[ownerId]?.full_name ?? '';
      if (name.length > 70) name = `${name.slice(0, 67)}…`;

      const subjects = [
        ...(row.entity === 'cswo_members' && row.entity_id ? [row.entity_id] : []),
        ...(ownerId ? [ownerId] : []),
      ];

      const amount = snapshot?.amount != null ? money(snapshot.amount) : '';
      const who = actorName ?? tr('The website', 'ওয়েবসাইট');
      const quotedName = name ? `“${name}”` : '';

      let sentence: string;
      let tag = `${row.entity}:${row.action}`;
      const to = (f: string) => (changes && f in changes ? String(changes[f].to ?? '') : null);
      const isPayment = row.entity === 'cswo_donations' || row.entity === 'cswo_monthly_contributions';
      const onlyReceiptFields = !!changes && Object.keys(changes).every((k) => k.startsWith('receipt_email'));
      const isAttendance = row.entity === 'attendance' || (row.entity === 'cswo_attendance' && kind === 'added');
      if (isPayment && kind === 'changed' && to('status') === 'paid') {
        tag = 'payment_paid';
        sentence = row.actor_id
          ? tr(`${who} marked the payment from ${quotedName || 'a donor'} as paid`, `${who} ${quotedName || 'একজন দাতার'} পেমেন্ট পরিশোধিত হিসেবে চিহ্নিত করেছেন`)
          : tr(`Online payment from ${quotedName || 'a donor'} was confirmed`, `${quotedName || 'একজন দাতার'} অনলাইন পেমেন্ট নিশ্চিত হয়েছে`);
      } else if (isPayment && kind === 'changed' && to('status') === 'failed') {
        tag = 'payment_failed';
        sentence = tr(`Payment from ${quotedName || 'a donor'} failed`, `${quotedName || 'একজন দাতার'} পেমেন্ট ব্যর্থ হয়েছে`);
      } else if (isPayment && kind === 'changed' && to('status') === 'pending') {
        tag = 'payment_pending';
        sentence = tr(`Payment from ${quotedName || 'a donor'} is being processed`, `${quotedName || 'একজন দাতার'} পেমেন্ট প্রক্রিয়াধীন`);
      } else if (isPayment && kind === 'changed' && onlyReceiptFields) {
        const st = to('receipt_email_status');
        tag = `receipt_${st ?? 'other'}`;
        sentence = st === 'sent'
          ? tr(`Receipt emailed to ${quotedName || 'the donor'}`, `${quotedName || 'দাতাকে'} রসিদ ইমেল করা হয়েছে`)
          : st === 'failed'
            ? tr(`Receipt email to ${quotedName || 'the donor'} failed`, `${quotedName || 'দাতাকে'} রসিদ ইমেল ব্যর্থ হয়েছে`)
            : tr(`Sending the receipt to ${quotedName || 'the donor'}`, `${quotedName || 'দাতাকে'} রসিদ পাঠানো হচ্ছে`);
      } else if (row.entity === 'cswo_monthly_contributions' && kind === 'added' && snapshot) {
        // Dues are always someone's own; say whose and for which month.
        tag = 'dues_added';
        const m = Number(snapshot.month);
        const period = m >= 1 && m <= 12 ? ` ${monthNames(lang)[m - 1]} ${snapshot.year ?? ''}`.trimEnd() : '';
        const amt = amount ? ` ${amount}` : '';
        sentence = row.actor_id && row.actor_id === ownerId
          ? tr(`${who} started paying monthly dues of${amt}${period ? ` for${period}` : ''}`, `${who}${period ? `${period}-এর` : ''}${amt} মাসিক চাঁদা দেওয়া শুরু করেছেন`)
          : tr(`${who} recorded monthly dues of${amt} from ${quotedName || 'a member'}${period ? ` for${period}` : ''}`, `${who} ${quotedName || 'একজন সদস্যের'}${period ? `${period}-এর` : ''}${amt} মাসিক চাঁদা নথিভুক্ত করেছেন`);
      } else if (isPayment && kind === 'added' && !row.actor_id) {
        tag = 'payment_started';
        sentence = tr(
          `${quotedName || 'Someone'} started an online payment${amount ? ` of ${amount}` : ''}`,
          `${quotedName || 'একজন'} ${amount ? `${amount} ` : ''}অনলাইন পেমেন্ট শুরু করেছেন`,
        );
      } else if (row.entity === 'cswo_blood_donors' && kind === 'changed' && to('status') === 'donated') {
        tag = 'blood_donated';
        sentence = tr(`${who} recorded that ${quotedName || 'a donor'} donated blood`, `${who} নথিভুক্ত করেছেন যে ${quotedName || 'একজন দাতা'} রক্তদান করেছেন`);
      } else if (isAttendance && snapshot) {
        const person = lookups.members[String(snapshot.member_id)]?.full_name ?? tr('a member', 'একজন সদস্য');
        const event = lookups.events[String(snapshot.event_id)] ?? tr('an event', 'একটি অনুষ্ঠান');
        const via = row.action === 'attendance_qr_scan' || snapshot.attendance_method === 'qr' || snapshot.marked_type === 'QR'
          ? tr(' by QR scan', ' QR স্ক্যানে') : '';
        sentence = tr(`${who} marked ${person} present at ${event}${via}`, `${who} ${event}-এ ${person}-কে${via} উপস্থিত চিহ্নিত করেছেন`);
      } else {
        const verbEn = kind === 'added' ? 'added' : kind === 'removed' ? 'removed' : 'updated';
        const verbBn = kind === 'added' ? 'যোগ করেছেন' : kind === 'removed' ? 'মুছে ফেলেছেন' : 'পরিবর্তন করেছেন';
        const quoted = name ? ` “${name}”` : '';
        const ofAmt = amount ? tr(` of ${amount}`, ` (${amount})`) : '';
        sentence = tr(`${who} ${verbEn} the ${ent.en}${quoted}${ofAmt}`, `${who} ${ent.bn}${quoted}${ofAmt} ${verbBn}`);
        if (row.entity === 'cswo_members' && changes && PERMISSION_FIELDS.some((f) => f in changes)) {
          sentence = tr(`${who} changed the access of${quoted || ' a member'}`, `${who}${quoted || ' একজন সদস্যের'} অনুমতি পরিবর্তন করেছেন`);
        }
      }

      const attention = kind === 'removed'
        || row.entity === 'cswo_bank_accounts'
        || (row.entity === 'cswo_members' && !!changes && PERMISSION_FIELDS.some((f) => f in changes))
        || row.action.includes('.');

      const searchText = [
        sentence, actorName ?? '', actor ? memberDisplayId(actor) : '', ent.en, ent.bn, row.entity, row.entity_id ?? '', row.id,
        JSON.stringify(detail),
      ].join(' ').toLowerCase();

      return { row, area: ent.area, kind, attention, actorName, sentence, name, ent, tag, subjects, changes, snapshot, searchText };
    });
  }, [rows, lookups, tr, money, lang]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (area !== 'all' && e.area !== area) return false;
      if (kind !== 'all' && e.kind !== kind) return false;
      if (who === 'people' && !e.row.actor_id) return false;
      if (who === 'system' && e.row.actor_id) return false;
      if (who !== 'all' && who !== 'people' && who !== 'system') {
        if (scope === 'by' ? e.row.actor_id !== who : !e.subjects.includes(who)) return false;
      }
      if (attentionOnly && !e.attention) return false;
      if (q && !e.searchText.includes(q)) return false;
      return true;
    });
  }, [entries, query, area, kind, who, scope, attentionOnly]);

  // Filters change what "more" means, so start from the top again.
  useEffect(() => { setVisible(PAGE); }, [query, area, kind, who, scope, attentionOnly, period]);

  // Bulk work (a camp's donors marked "donated" one after another, a payment
  // run, an import) lands as dozens of near-identical entries. Consecutive
  // entries by the same person, on the same kind of record, doing the same
  // thing within 15 minutes of each other collapse into one expandable line.
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    let run: Entry[] = [];
    const flush = () => {
      if (run.length >= 3) out.push({ type: 'group', key: `g-${run[0].row.id}`, entries: run });
      else for (const e of run) out.push({ type: 'one', key: e.row.id, entry: e });
      run = [];
    };
    for (const e of filtered) {
      const prev = run[run.length - 1];
      const same = !!prev
        && prev.row.actor_id === e.row.actor_id
        && prev.row.entity === e.row.entity
        && prev.row.action === e.row.action
        && prev.tag === e.tag
        && dayKey(prev.row.created_at) === dayKey(e.row.created_at)
        && Math.abs(Date.parse(prev.row.created_at) - Date.parse(e.row.created_at)) <= 15 * 60e3;
      if (!same) flush();
      run.push(e);
    }
    flush();
    return out;
  }, [filtered]);

  const shown = items.slice(0, visible);

  const days = useMemo(() => {
    const out: Array<{ key: string; label: string; count: number; items: Item[] }> = [];
    const today = dayKey(new Date().toISOString());
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yesterday = dayKey(y.toISOString());
    for (const it of shown) {
      const at = it.type === 'one' ? it.entry.row.created_at : it.entries[0].row.created_at;
      const key = dayKey(at);
      let d = out[out.length - 1];
      if (!d || d.key !== key) {
        const label = key === today ? tr('Today', 'আজ')
          : key === yesterday ? tr('Yesterday', 'গতকাল')
            : new Date(at).toLocaleDateString(bn ? 'bn-IN' : 'en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        d = { key, label, count: 0, items: [] };
        out.push(d);
      }
      d.items.push(it);
      d.count += it.type === 'one' ? 1 : it.entries.length;
    }
    return out;
  }, [shown, tr, bn]);

  const stats = useMemo(() => ({
    total: entries.length,
    people: new Set(entries.map((e) => e.row.actor_id).filter(Boolean)).size,
    attention: entries.filter((e) => e.attention).length,
    system: entries.filter((e) => !e.row.actor_id).length,
  }), [entries]);

  // Everyone who appears in the period, busiest first, then the rest A–Z.
  const people = useMemo(() => {
    const made: Record<string, number> = {};
    const about: Record<string, number> = {};
    for (const e of entries) {
      if (e.row.actor_id) made[e.row.actor_id] = (made[e.row.actor_id] ?? 0) + 1;
      for (const id of e.subjects) about[id] = (about[id] ?? 0) + 1;
    }
    return Object.entries(lookups.members)
      .map(([id, m]) => ({ id, name: m.full_name, made: made[id] ?? 0, about: about[id] ?? 0 }))
      .sort((a, b) => b.made - a.made || a.name.localeCompare(b.name));
  }, [entries, lookups]);

  // What the chosen member did (or had done to them) in the period, ignoring
  // the other filters, so the summary does not shrink as you narrow the list.
  const personStats = useMemo(() => {
    if (!selectedMember) return null;
    const list = entries.filter((e) => (scope === 'by' ? e.row.actor_id === selectedMember : e.subjects.includes(selectedMember)));
    const byArea: Partial<Record<Area, number>> = {};
    for (const e of list) byArea[e.area] = (byArea[e.area] ?? 0) + 1;
    return {
      total: list.length,
      added: list.filter((e) => e.kind === 'added').length,
      changed: list.filter((e) => e.kind === 'changed').length,
      removed: list.filter((e) => e.kind === 'removed').length,
      attention: list.filter((e) => e.attention).length,
      last: list[0]?.row.created_at ?? null,
      areas: (Object.entries(byArea) as Array<[Area, number]>).sort((a, b) => b[1] - a[1]),
    };
  }, [entries, selectedMember, scope]);

  const filtersActive = !!query || area !== 'all' || kind !== 'all' || who !== 'all' || attentionOnly;
  const clearFilters = () => { setQuery(''); setArea('all'); setKind('all'); setWho('all'); setAttentionOnly(false); };

  // ── CSV ────────────────────────────────────────────────────────────────────
  const exportCsv = () => {
    const cell = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const head = ['Date & time', 'Who', 'Member ID', 'Area', 'What happened', 'Changes', 'Needs attention', 'Table', 'Record ID', 'Log ID'];
    const lines = filtered.map((e) => {
      const actor = e.row.actor_id ? lookups.members[e.row.actor_id] : null;
      const changes = e.changes
        ? Object.entries(e.changes).filter(([k]) => !HIDDEN_FIELDS.has(k))
          .map(([k, v]) => `${fieldLabel(k)}: ${formatValue(k, v.from)} -> ${formatValue(k, v.to)}`).join('; ')
        : '';
      return [
        new Date(e.row.created_at).toLocaleString('en-IN'),
        e.actorName ?? 'System (automatic)',
        actor ? memberDisplayId(actor) : '',
        AREAS[e.area].en,
        e.sentence,
        changes,
        e.attention ? 'Yes' : 'No',
        e.row.entity,
        e.row.entity_id ?? '',
        e.row.id,
      ].map((x) => cell(String(x))).join(',');
    });
    // BOM so Excel reads ₹ and Bengali text as UTF-8.
    const blob = new Blob(['﻿' + [head.map(cell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const periodLabel: Record<Period, string> = {
    today: tr('Today', 'আজ'),
    '7d': tr('Last 7 days', 'গত ৭ দিন'),
    '30d': tr('Last 30 days', 'গত ৩০ দিন'),
    '90d': tr('Last 3 months', 'গত ৩ মাস'),
    all: tr('All time', 'সব সময়'),
  };
  const kindLabel: Record<Kind, string> = {
    added: tr('Added', 'যোগ'), changed: tr('Changed', 'পরিবর্তন'), removed: tr('Removed', 'মুছে ফেলা'),
  };
  const personName = (id: string) => lookups.members[id]?.full_name ?? tr('A former member', 'প্রাক্তন সদস্য');
  const whoText = (w: string) => w === 'people' ? tr('Done by people', 'ব্যক্তি দ্বারা')
    : w === 'system' ? tr('Automatic', 'স্বয়ংক্রিয়')
      : scope === 'by' ? tr(`By ${personName(w)}`, `${personName(w)} করেছেন`) : tr(`About ${personName(w)}`, `${personName(w)} সম্পর্কে`);
  const n = (v: number) => (bn ? fmt.num(v) : v.toLocaleString('en-IN'));
  const countIn = (pred: (e: Entry) => boolean) => n(entries.filter(pred).length);

  // What is currently narrowing the list, each removable on its own.
  const activeTags: Array<{ key: string; label: string; clear: () => void }> = [
    ...(query ? [{ key: 'q', label: `“${query}”`, clear: () => setQuery('') }] : []),
    ...(area !== 'all' ? [{ key: 'a', label: bn ? AREAS[area].bn : AREAS[area].en, clear: () => setArea('all') }] : []),
    ...(kind !== 'all' ? [{ key: 'k', label: kindLabel[kind], clear: () => setKind('all') }] : []),
    ...(who !== 'all' ? [{ key: 'w', label: whoText(who), clear: () => setWho('all') }] : []),
    ...(attentionOnly ? [{ key: 't', label: tr('Needs attention', 'মনোযোগ প্রয়োজন'), clear: () => setAttentionOnly(false) }] : []),
  ];

  const toggleWho = (w: 'people' | 'system') => setWho(who === w ? 'all' : w);

  return (
    // `relative` keeps the screen-reader-only labels inside this page. Without
    // a positioned ancestor they are placed against the whole document, escape
    // the admin panel's scroll area, and make the browser window scroll too.
    <div className="relative space-y-4" style={{ color: INK }}>
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-[22px] font-bold leading-tight sm:text-[24px]" style={{ fontFamily: '"Noto Serif Bengali", serif' }}>
            <ShieldCheck className="h-5 w-5 shrink-0" style={{ color: BRAND }} aria-hidden />
            {tr('Audit log', 'অডিট লগ')}
          </h1>
          <p className="mt-0.5 text-[13.5px]" style={{ color: INK2 }}>
            {tr('Who changed what, and when. Entries cannot be edited or deleted.', 'কে কী বদলেছেন এবং কখন। এন্ট্রি সম্পাদনা বা মোছা যায় না।')}
          </p>
          <details className="group mt-1 text-[13px]">
            <summary className={`inline-flex min-h-[28px] cursor-pointer select-none items-center gap-1 rounded font-semibold underline decoration-dotted underline-offset-2 ${FOCUS}`} style={{ color: BRAND }}>
              <Info className="h-3.5 w-3.5" aria-hidden /> {tr('How to read this log', 'কীভাবে পড়বেন')}
            </summary>
            <ul className="mt-2 max-w-2xl space-y-1.5 rounded-xl p-3 leading-relaxed" style={{ background: PAPER, border: `1px solid ${RULE}`, color: INK2 }}>
              <li>{tr('Each line says who did what. Tap it to see exactly what changed, old value → new value.', 'প্রতিটি লাইনে কে কী করেছেন লেখা আছে। কী বদলেছে (পুরনো → নতুন) দেখতে ট্যাপ করুন।')}</li>
              <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <LegendIcon kind="added" /> {tr('added', 'যোগ')}
                <LegendIcon kind="changed" /> {tr('changed', 'পরিবর্তন')}
                <LegendIcon kind="removed" /> {tr('removed', 'মুছে ফেলা')}
              </li>
              <li>{tr('A number on the icon means several similar changes made together, like a whole blood camp. Tap to see each one.', 'আইকনে সংখ্যা মানে একসাথে করা একই ধরনের একাধিক পরিবর্তন। প্রতিটি দেখতে ট্যাপ করুন।')}</li>
              <li><b>{tr('Automatic', 'স্বয়ংক্রিয়')}</b>{tr(': done by the website itself, e.g. confirming online payments and emailing receipts.', ': ওয়েবসাইট নিজে করেছে, যেমন অনলাইন পেমেন্ট নিশ্চিত করা ও রসিদ পাঠানো।')}</li>
              <li><b>{tr('Attention', 'মনোযোগ')}</b>{tr(': something was deleted, someone’s access changed, or a bank account was edited. Worth a second look.', ': কিছু মুছে ফেলা হয়েছে, কারো অনুমতি বদলেছে, বা ব্যাংক অ্যাকাউন্ট সম্পাদিত হয়েছে। একবার যাচাই করে নিন।')}</li>
              <li>{tr('Pick a member under “Person” to see everything they changed, or everything changed about them.', '“ব্যক্তি” থেকে একজন সদস্য বেছে নিন: তিনি কী বদলেছেন, বা তাঁর সম্পর্কে কী বদলেছে দেখতে।')}</li>
            </ul>
          </details>
        </div>
        <div className="flex gap-2">
          <IconButton onClick={load} disabled={loading} label={tr('Refresh', 'রিফ্রেশ')}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'motion-safe:animate-spin' : ''}`} aria-hidden />
          </IconButton>
          <IconButton onClick={exportCsv} disabled={!filtered.length} label={tr('Download CSV', 'CSV ডাউনলোড')}>
            <Download className="h-4 w-4" aria-hidden />
          </IconButton>
        </div>
      </header>

      {/* Summary: each tile is also a one-tap filter */}
      <section aria-label={tr('Summary', 'সারসংক্ষেপ')} className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat value={n(stats.total)} label={tr(`changes · ${periodLabel[period].toLowerCase()}`, `পরিবর্তন · ${periodLabel[period]}`)}
          pressed={!filtersActive} onClick={clearFilters} />
        <Stat value={n(stats.people)} label={tr('people made changes', 'জন পরিবর্তন করেছেন')}
          pressed={who === 'people'} onClick={() => toggleWho('people')} />
        <Stat value={n(stats.attention)} label={tr('need attention', 'মনোযোগ প্রয়োজন')} tone="warn"
          pressed={attentionOnly} onClick={() => setAttentionOnly(!attentionOnly)} />
        <Stat value={n(stats.system)} label={tr('automatic', 'স্বয়ংক্রিয়')}
          pressed={who === 'system'} onClick={() => toggleWho('system')} />
      </section>

      {/* Filter bar: pinned while scrolling on tablets and up */}
      <section
        aria-label={tr('Filters', 'ফিল্টার')}
        className="z-10 space-y-2.5 rounded-2xl p-3 md:sticky md:top-0"
        style={{ background: PAPER, border: `1px solid ${RULE}`, boxShadow: '0 6px 18px -12px rgba(0,0,0,.25)' }}
      >
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <label className="relative block xl:min-w-[260px] xl:flex-1">
            <span className="sr-only">{tr('Search the log', 'লগে খুঁজুন')}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: MUTED }} aria-hidden />
            <input
              type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={tr('Search name, amount, receipt no…', 'নাম, পরিমাণ, রসিদ নং খুঁজুন…')}
              className={`min-h-[40px] w-full rounded-xl pl-9 pr-3 text-[14px] ${FOCUS}`}
              style={{ border: `1px solid ${RULE}`, background: CREAM, color: INK }}
            />
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:flex">
            <FilterSelect label={tr('Area', 'বিভাগ')} value={area} onChange={(v) => setArea(v as Area | 'all')}>
              <option value="all">{tr('All areas', 'সব বিভাগ')} ({n(entries.length)})</option>
              {(Object.keys(AREAS) as Area[]).map((a) => (
                <option key={a} value={a}>{bn ? AREAS[a].bn : AREAS[a].en} ({countIn((e) => e.area === a)})</option>
              ))}
            </FilterSelect>
            <FilterSelect label={tr('Type of change', 'পরিবর্তনের ধরন')} value={kind} onChange={(v) => setKind(v as Kind | 'all')}>
              <option value="all">{tr('All types', 'সব ধরন')}</option>
              {(Object.keys(kindLabel) as Kind[]).map((k) => (
                <option key={k} value={k}>{kindLabel[k]} ({countIn((e) => e.kind === k)})</option>
              ))}
            </FilterSelect>
            <FilterSelect label={tr('Person', 'ব্যক্তি')} value={who} onChange={setWho}>
              <option value="all">{tr('Everyone', 'সবাই')}</option>
              <option value="people">{tr('People only', 'শুধু ব্যক্তি')} ({countIn((e) => !!e.row.actor_id)})</option>
              <option value="system">{tr('Automatic (website)', 'স্বয়ংক্রিয় (ওয়েবসাইট)')} ({countIn((e) => !e.row.actor_id)})</option>
              <optgroup label={tr('A member', 'একজন সদস্য')}>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.made ? ` (${n(p.made)})` : ''}
                  </option>
                ))}
              </optgroup>
            </FilterSelect>
            <FilterSelect label={tr('Period', 'সময়কাল')} value={period} onChange={(v) => setPeriod(v as Period)} neutral>
              {(Object.keys(periodLabel) as Period[]).map((p) => <option key={p} value={p}>{periodLabel[p]}</option>)}
            </FilterSelect>
            <button
              type="button" onClick={() => setAttentionOnly(!attentionOnly)} aria-pressed={attentionOnly}
              className={`col-span-2 inline-flex min-h-[40px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-[13.5px] font-semibold sm:col-span-1 ${FOCUS}`}
              style={attentionOnly
                ? { background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' }
                : { background: PAPER, color: INK2, border: `1px solid ${RULE}` }}
            >
              <AlertTriangle className="h-4 w-4" aria-hidden />
              {tr('Needs attention', 'মনোযোগ প্রয়োজন')}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
          <span role="status" aria-live="polite" className="font-semibold" style={{ color: MUTED }}>
            {loading
              ? tr('Loading…', 'লোড হচ্ছে…')
              : filtersActive
                ? tr(`${n(filtered.length)} of ${n(entries.length)} changes`, `${n(entries.length)}টির মধ্যে ${n(filtered.length)}টি`)
                : tr(`${n(entries.length)} changes · ${periodLabel[period]}`, `${n(entries.length)}টি পরিবর্তন · ${periodLabel[period]}`)}
          </span>
          {activeTags.map((t) => (
            <button
              key={t.key} type="button" onClick={t.clear}
              aria-label={tr(`Remove filter: ${t.label}`, `ফিল্টার সরান: ${t.label}`)}
              className={`inline-flex min-h-[30px] items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1.5 font-semibold ${FOCUS}`}
              style={{ background: '#e6f2f1', color: BRAND }}
            >
              {t.label} <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ))}
          {activeTags.length > 1 && (
            <button type="button" onClick={clearFilters} className={`min-h-[30px] rounded-full px-2 font-bold underline ${FOCUS}`} style={{ color: BRAND }}>
              {tr('Clear all', 'সব মুছুন')}
            </button>
          )}
        </div>
      </section>

      {selectedMember && personStats && (
        <PersonPanel
          name={personName(selectedMember)}
          memberId={lookups.members[selectedMember] ? memberDisplayId(lookups.members[selectedMember]) : null}
          role={lookups.members[selectedMember]?.role ?? null}
          scope={scope} setScope={setScope}
          counts={{ by: people.find((p) => p.id === selectedMember)?.made ?? 0, about: people.find((p) => p.id === selectedMember)?.about ?? 0 }}
          stats={personStats} area={area} setArea={setArea} period={periodLabel[period]}
          onClose={() => setWho('all')}
          tr={tr} bn={bn} n={n}
        />
      )}

      {loadError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl p-3 text-[14px]" style={{ background: '#fdecec', color: '#991b1b' }}>
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          {tr('Some entries could not be loaded: ', 'কিছু এন্ট্রি লোড করা যায়নি: ')}{loadError}
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl px-5 py-10 text-center" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <Search className="mx-auto h-7 w-7" style={{ color: MUTED }} aria-hidden />
          <p className="mt-2 text-[15px] font-semibold">{tr('Nothing matches these filters.', 'এই ফিল্টারে কিছু পাওয়া যায়নি।')}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {filtersActive && (
              <button type="button" onClick={clearFilters} className={`min-h-[38px] rounded-full px-4 text-[14px] font-bold ${FOCUS}`} style={{ color: BRAND, border: `1px solid ${RULE}` }}>
                {tr('Clear filters', 'ফিল্টার মুছুন')}
              </button>
            )}
            {period !== 'all' && (
              <button type="button" onClick={() => setPeriod('all')} className={`min-h-[38px] rounded-full px-4 text-[14px] font-semibold ${FOCUS}`} style={{ color: INK2, border: `1px solid ${RULE}` }}>
                {tr('Search all time', 'সব সময়ের মধ্যে খুঁজুন')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {days.map((d) => (
            <section key={d.key} aria-labelledby={`day-${d.key}`}>
              <h2 id={`day-${d.key}`} className="mb-1.5 flex items-baseline justify-between px-1 text-[12.5px] font-bold uppercase tracking-[0.05em]" style={{ color: MUTED }}>
                <span>{d.label}</span>
                <span className="font-semibold normal-case tracking-normal">{tr(`${n(d.count)} ${d.count === 1 ? 'change' : 'changes'}`, `${n(d.count)}টি পরিবর্তন`)}</span>
              </h2>
              <ul className="overflow-hidden rounded-2xl" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
                {d.items.map((it, i) => (
                  <li key={it.key} style={{ borderTop: i === 0 ? undefined : `1px solid ${RULE}` }}>
                    {it.type === 'one' ? (
                      <EntryRow
                        entry={it.entry} open={open === it.entry.row.id}
                        onToggle={() => setOpen(open === it.entry.row.id ? null : it.entry.row.id)}
                        tr={tr} bn={bn} fieldLabel={fieldLabel} formatValue={formatValue} lookups={lookups}
                      />
                    ) : (
                      <GroupRow
                        entries={it.entries} open={openGroup === it.key}
                        onToggle={() => setOpenGroup(openGroup === it.key ? null : it.key)}
                        openEntry={open} setOpenEntry={setOpen}
                        tr={tr} bn={bn} n={n} fieldLabel={fieldLabel} formatValue={formatValue} lookups={lookups}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {visible < items.length && (
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button" onClick={() => setVisible((v) => v + PAGE)}
                className={`min-h-[42px] w-full rounded-full px-6 text-[14px] font-bold sm:w-auto ${FOCUS}`}
                style={{ background: INK, color: CREAM }}
              >
                {tr('Show older changes', 'আগের পরিবর্তন দেখুন')}
              </button>
              <span className="text-[12.5px]" style={{ color: MUTED }}>
                {tr(`${n(items.length - visible)} more lines`, `আরও ${n(items.length - visible)}টি লাইন`)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function pluralEn(noun: string): string {
  if (noun === 'attendance') return 'attendance records';
  if (noun === 'bank / cash entry') return 'bank / cash entries';
  if (/[^aeiou]y$/.test(noun)) return `${noun.slice(0, -1)}ies`;
  return `${noun}s`;
}

function IconButton({ onClick, disabled, label, children }: {
  onClick: () => void; disabled?: boolean; label: string; children: ReactNode;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      className={`inline-flex min-h-[38px] items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold disabled:opacity-50 ${FOCUS}`}
      style={{ border: `1px solid ${RULE}`, color: INK2, background: PAPER }}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function Stat({ value, label, tone, onClick, pressed }: {
  value: string; label: string; tone?: 'warn'; onClick: () => void; pressed: boolean;
}) {
  const warn = tone === 'warn';
  const fg = warn ? '#92400e' : INK;
  return (
    <button
      type="button" onClick={onClick} aria-pressed={pressed}
      className={`flex items-baseline gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${FOCUS}`}
      style={{
        background: pressed ? (warn ? '#fef3c7' : '#e6f2f1') : (warn ? '#fffbeb' : PAPER),
        border: `1px solid ${pressed ? (warn ? '#f59e0b' : BRAND) : (warn ? '#fde68a' : RULE)}`,
      }}
    >
      <span className="shrink-0 whitespace-nowrap text-[20px] font-extrabold leading-none tabular-nums" style={{ color: fg }}>{value}</span>
      <span className="min-w-0 text-[12.5px] font-semibold leading-tight" style={{ color: warn ? '#92400e' : MUTED }}>{label}</span>
    </button>
  );
}

function FilterSelect({ label, value, onChange, children, neutral }: {
  label: string; value: string; onChange: (v: string) => void; children: ReactNode; neutral?: boolean;
}) {
  const id = useId();
  const active = !neutral && value !== 'all';
  return (
    <div className="min-w-0 xl:w-[150px]">
      <label htmlFor={id} className="sr-only">{label}</label>
      <select
        id={id} value={value} onChange={(e) => onChange(e.target.value)} title={label}
        className={`min-h-[40px] w-full cursor-pointer truncate rounded-xl px-2.5 text-[13.5px] font-semibold ${FOCUS}`}
        style={{
          background: active ? '#e6f2f1' : PAPER,
          color: active ? BRAND : INK,
          border: `1px solid ${active ? BRAND : RULE}`,
        }}
      >
        {children}
      </select>
    </div>
  );
}

const KIND_STYLE: Record<Kind, { icon: LucideIcon; fg: string; bg: string }> = {
  added: { icon: Plus, fg: '#0e6f4a', bg: '#e3f6ec' },
  changed: { icon: Pencil, fg: '#92610a', bg: '#fdf3e0' },
  removed: { icon: Trash2, fg: '#b91c1c', bg: '#fdecec' },
};

function LegendIcon({ kind }: { kind: Kind }) {
  const k = KIND_STYLE[kind];
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full" style={{ background: k.bg, color: k.fg }} aria-hidden>
      <k.icon className="h-3.5 w-3.5" />
    </span>
  );
}

const ROLE_WORDS: Record<string, [string, string]> = {
  super_admin: ['Super admin', 'সুপার অ্যাডমিন'],
  executive_admin: ['Executive admin', 'এক্সিকিউটিভ অ্যাডমিন'],
  admin: ['Admin', 'অ্যাডমিন'],
  member: ['Member', 'সদস্য'],
};

/**
 * Shown when one member is picked: who they are, the two ways to look at
 * them (what they changed / what was changed about them), and a breakdown
 * whose area buttons narrow the list below.
 */
function PersonPanel({ name, memberId, role, scope, setScope, counts, stats, area, setArea, period, onClose, tr, bn, n }: {
  name: string; memberId: string | null; role: string | null;
  scope: 'by' | 'about'; setScope: (s: 'by' | 'about') => void;
  counts: { by: number; about: number };
  stats: { total: number; added: number; changed: number; removed: number; attention: number; last: string | null; areas: Array<[Area, number]> };
  area: Area | 'all'; setArea: (a: Area | 'all') => void; period: string;
  onClose: () => void; tr: RowProps['tr']; bn: boolean; n: (v: number) => string;
}) {
  const initials = name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const roleWord = role ? (ROLE_WORDS[role] ? (bn ? ROLE_WORDS[role][1] : ROLE_WORDS[role][0]) : role) : null;
  const tabs: Array<{ key: 'by' | 'about'; label: string }> = [
    { key: 'by', label: tr(`Changes made by ${name.split(' ')[0]} (${n(counts.by)})`, `${name.split(' ')[0]} যা বদলেছেন (${n(counts.by)})`) },
    { key: 'about', label: tr(`Changes about ${name.split(' ')[0]} (${n(counts.about)})`, `${name.split(' ')[0]} সম্পর্কে (${n(counts.about)})`) },
  ];
  return (
    <section aria-label={tr(`Activity of ${name}`, `${name}-এর কার্যকলাপ`)} className="rounded-2xl p-3 sm:p-4" style={{ background: PAPER, border: `1px solid ${BRAND}40` }}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white" style={{ background: BRAND }} aria-hidden>{initials}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-bold leading-tight">{name}</div>
          <div className="mt-0.5 text-[12.5px]" style={{ color: MUTED }}>
            {[memberId, roleWord].filter(Boolean).join(' · ')}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label={tr('Show everyone again', 'আবার সবাইকে দেখান')}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${FOCUS}`} style={{ border: `1px solid ${RULE}`, color: MUTED }}>
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div role="group" aria-label={tr('What to show', 'কী দেখাবেন')} className="mt-3 grid grid-cols-1 gap-1 rounded-xl p-1 sm:inline-grid sm:grid-cols-2" style={{ background: CREAM }}>
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setScope(t.key)} aria-pressed={scope === t.key}
            className={`min-h-[36px] rounded-lg px-3 text-[13.5px] font-semibold ${FOCUS}`}
            style={scope === t.key ? { background: PAPER, color: INK, boxShadow: '0 1px 3px rgba(0,0,0,.12)' } : { color: MUTED }}>
            {t.label}
          </button>
        ))}
      </div>

      {stats.total === 0 ? (
        <p className="mt-3 text-[14px]" style={{ color: INK2 }}>
          {scope === 'by'
            ? tr(`${name} made no changes in this period (${period.toLowerCase()}). Try a longer period.`, `এই সময়ে (${period}) ${name} কোনো পরিবর্তন করেননি। আরও বড় সময়কাল বেছে নিন।`)
            : tr(`Nothing about ${name} was changed in this period (${period.toLowerCase()}).`, `এই সময়ে (${period}) ${name} সম্পর্কে কিছু বদলায়নি।`)}
        </p>
      ) : (
        <>
          <p className="mt-3 text-[14px] leading-relaxed" style={{ color: INK2 }}>
            {scope === 'by'
              ? tr(`In ${period.toLowerCase()}, ${name} made `, `${period}-এ ${name} `)
              : tr(`In ${period.toLowerCase()}, there were `, `${period}-এ ${name} সম্পর্কে `)}
            <b style={{ color: INK }}>{tr(`${n(stats.total)} ${stats.total === 1 ? 'change' : 'changes'}`, `${n(stats.total)}টি পরিবর্তন`)}</b>
            {scope === 'about' ? tr(` about ${name}`, '') : ''}
            {tr(': ', ': ')}
            {tr(`${n(stats.added)} added, ${n(stats.changed)} changed, ${n(stats.removed)} removed.`, `${n(stats.added)}টি যোগ, ${n(stats.changed)}টি পরিবর্তন, ${n(stats.removed)}টি মুছে ফেলা।`)}
            {stats.attention > 0 && (
              <span style={{ color: '#92400e' }}> {tr(`${n(stats.attention)} need attention.`, `${n(stats.attention)}টি মনোযোগ প্রয়োজন।`)}</span>
            )}
            {stats.last && (
              <> {tr('Last: ', 'সর্বশেষ: ')}{new Date(stats.last).toLocaleString(bn ? 'bn-IN' : 'en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}.</>
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={tr('Filter by area', 'বিভাগ অনুযায়ী ফিল্টার')}>
            {stats.areas.map(([a, count]) => {
              const A = AREAS[a];
              const on = area === a;
              return (
                <button key={a} type="button" onClick={() => setArea(on ? 'all' : a)} aria-pressed={on}
                  className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${FOCUS}`}
                  style={{ background: on ? A.fg : A.bg, color: on ? '#fff' : A.fg }}>
                  <A.icon className="h-3.5 w-3.5" aria-hidden /> {bn ? A.bn : A.en} <span className="opacity-80">{n(count)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

interface RowProps {
  tr: (en: string, bn: string) => string;
  bn: boolean;
  fieldLabel: (k: string) => string;
  formatValue: (k: string, v: unknown) => string;
  lookups: Lookups;
}

const timeOf = (iso: string, bn: boolean) =>
  new Date(iso).toLocaleTimeString(bn ? 'bn-IN' : 'en-IN', { hour: 'numeric', minute: '2-digit' });

/** Area, automatic and attention badges. */
function Badges({ area, automatic, attention, tr, bn }: {
  area: Area; automatic: boolean; attention: boolean; tr: RowProps['tr']; bn: boolean;
}) {
  const a = AREAS[area];
  return (
    <>
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold" style={{ background: a.bg, color: a.fg }}>
        <a.icon className="h-3 w-3" aria-hidden /> {bn ? a.bn : a.en}
      </span>
      {automatic && (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold" style={{ background: '#f3eefe', color: '#6d28d9' }}>
          <Bot className="h-3 w-3" aria-hidden /> {tr('Automatic', 'স্বয়ংক্রিয়')}
        </span>
      )}
      {attention && (
        <span
          title={tr('Something was deleted, someone’s access changed, or a bank account was edited', 'কিছু মুছে ফেলা, অনুমতি পরিবর্তন বা ব্যাংক অ্যাকাউন্ট সম্পাদনা')}
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-bold" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}
        >
          <AlertTriangle className="h-3 w-3" aria-hidden /> {tr('Attention', 'মনোযোগ')}
        </span>
      )}
    </>
  );
}

/**
 * One line of the feed. On phones: icon, sentence, then time and badges
 * underneath. From `sm` up: a fixed time column, the sentence, and the badges
 * at the right, so a row is a single scan.
 */
function RowButton({ open, onToggle, controls, kind, time, dateTime, sentence, sub, badges, count, tr }: {
  open: boolean; onToggle: () => void; controls: string; kind: Kind; time: string; dateTime: string;
  sentence: string; sub: string | null; badges: ReactNode; count?: number; tr: RowProps['tr'];
}) {
  // A group's sub-line already carries its time range, so phones skip the repeat.
  const mobileTime = count === undefined;
  const k = KIND_STYLE[kind];
  const KindIcon = k.icon;
  return (
    <button
      type="button" onClick={onToggle} aria-expanded={open} aria-controls={controls}
      className={`grid w-full grid-cols-[32px_minmax(0,1fr)_20px] items-start gap-x-3 px-3 py-2.5 text-left transition-colors hover:bg-stone-50 sm:grid-cols-[64px_32px_minmax(0,1fr)_auto_20px] sm:items-center sm:px-4 ${FOCUS} focus-visible:-outline-offset-2`}
    >
      <time dateTime={dateTime} className="hidden text-[13px] tabular-nums sm:block" style={{ color: MUTED }}>{time}</time>
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full" style={{ background: k.bg, color: k.fg }} aria-hidden>
        <KindIcon className="h-4 w-4" />
        {count !== undefined && (
          <span className="absolute -bottom-1 -right-1.5 min-w-[18px] rounded-full px-1 text-center text-[10.5px] font-bold leading-[18px] text-white" style={{ background: k.fg }}>
            {count}
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-[14.5px] font-semibold leading-snug" style={{ color: INK }}>{sentence}</span>
        {sub && <span className="mt-0.5 block text-[13px] leading-snug" style={{ color: INK2 }}>{sub}</span>}
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[12.5px] sm:hidden" style={{ color: MUTED }}>
          {mobileTime && <time dateTime={dateTime}>{time}</time>}
          {badges}
        </span>
      </span>
      <span className="hidden flex-wrap justify-end gap-1.5 sm:flex">{badges}</span>
      <ChevronDown className={`mt-1.5 h-5 w-5 transition-transform motion-reduce:transition-none sm:mt-0 ${open ? 'rotate-180' : ''}`} style={{ color: MUTED }} aria-hidden />
      <span className="sr-only">{open ? tr('Hide details', 'বিস্তারিত লুকান') : tr('Show details', 'বিস্তারিত দেখুন')}</span>
    </button>
  );
}

function changedSummary(names: string[], tr: RowProps['tr']): string | null {
  if (!names.length) return null;
  const head = names.slice(0, 4).join(', ');
  return tr('Changed: ', 'পরিবর্তিত: ') + head + (names.length > 4 ? tr(` and ${names.length - 4} more`, ` ও আরও ${names.length - 4}টি`) : '');
}

function EntryRow({ entry: e, open, onToggle, tr, bn, fieldLabel, formatValue, lookups }: RowProps & {
  entry: Entry; open: boolean; onToggle: () => void;
}) {
  const panelId = useId();
  const changeRows = e.changes ? Object.entries(e.changes).filter(([key]) => !HIDDEN_FIELDS.has(key)) : [];
  const actor = e.row.actor_id ? lookups.members[e.row.actor_id] : null;
  return (
    <>
      <RowButton
        open={open} onToggle={onToggle} controls={panelId} kind={e.kind}
        time={timeOf(e.row.created_at, bn)} dateTime={e.row.created_at}
        sentence={e.sentence}
        sub={e.kind === 'changed' ? changedSummary(changeRows.map(([k]) => fieldLabel(k)), tr) : null}
        badges={<Badges area={e.area} automatic={!e.row.actor_id} attention={e.attention} tr={tr} bn={bn} />}
        tr={tr}
      />
      {open && (
        <div id={panelId} className="px-3 pb-3 pl-[56px] sm:pl-[128px] sm:pr-4">
          <EntryDetails entry={e} tr={tr} bn={bn} fieldLabel={fieldLabel} formatValue={formatValue}
            actorId={actor ? memberDisplayId(actor) : null} />
        </div>
      )}
    </>
  );
}

function GroupRow({ entries, open, onToggle, openEntry, setOpenEntry, tr, bn, n, fieldLabel, formatValue, lookups }: RowProps & {
  entries: Entry[]; open: boolean; onToggle: () => void;
  openEntry: string | null; setOpenEntry: (id: string | null) => void; n: (v: number) => string;
}) {
  const panelId = useId();
  const first = entries[0];
  const count = entries.length;
  const who = first.actorName ?? tr('The website', 'ওয়েবসাইট');
  const isAttendance = first.row.entity === 'attendance' || (first.row.entity === 'cswo_attendance' && first.kind === 'added');
  const c = n(count);

  // Runs of a specific event read as that event, not as "updated N records".
  const byTag: Record<string, string> = {
    blood_donated: tr(`${who} recorded ${count} blood donations`, `${who} ${c}টি রক্তদান নথিভুক্ত করেছেন`),
    payment_paid: first.row.actor_id
      ? tr(`${who} marked ${count} payments as paid`, `${who} ${c}টি পেমেন্ট পরিশোধিত চিহ্নিত করেছেন`)
      : tr(`${count} online payments were confirmed`, `${c}টি অনলাইন পেমেন্ট নিশ্চিত হয়েছে`),
    payment_pending: tr(`${count} payments started processing`, `${c}টি পেমেন্ট প্রক্রিয়াধীন`),
    payment_failed: tr(`${count} payments failed`, `${c}টি পেমেন্ট ব্যর্থ হয়েছে`),
    payment_started: tr(`${count} online payments were started`, `${c}টি অনলাইন পেমেন্ট শুরু হয়েছে`),
    receipt_sent: tr(`${count} receipts were emailed`, `${c}টি রসিদ ইমেল করা হয়েছে`),
    receipt_sending: tr(`Sending ${count} receipts`, `${c}টি রসিদ পাঠানো হচ্ছে`),
    receipt_failed: tr(`${count} receipt emails failed`, `${c}টি রসিদ ইমেল ব্যর্থ হয়েছে`),
  };

  const sentence = byTag[first.tag] ?? (isAttendance
    ? tr(`${who} marked ${count} members present`, `${who} ${c} জন সদস্যকে উপস্থিত চিহ্নিত করেছেন`)
    : tr(
      `${who} ${first.kind === 'added' ? 'added' : first.kind === 'removed' ? 'removed' : 'updated'} ${count} ${pluralEn(first.ent.en)}`,
      `${who} ${c}টি ${first.ent.bn} ${first.kind === 'added' ? 'যোগ করেছেন' : first.kind === 'removed' ? 'মুছে ফেলেছেন' : 'পরিবর্তন করেছেন'}`,
    ));

  const fields = new Set<string>();
  for (const e of entries) for (const k of Object.keys(e.changes ?? {})) if (!HIDDEN_FIELDS.has(k)) fields.add(k);

  // Newest first, so the run reads earliest–latest from the last entry.
  const range = `${timeOf(entries[count - 1].row.created_at, bn)}–${timeOf(first.row.created_at, bn)}`;

  return (
    <>
      <RowButton
        open={open} onToggle={onToggle} controls={panelId} kind={first.kind} count={count}
        time={timeOf(first.row.created_at, bn)} dateTime={first.row.created_at}
        sentence={sentence}
        sub={[range, changedSummary([...fields].map(fieldLabel), tr)].filter(Boolean).join(' · ')}
        badges={<Badges area={first.area} automatic={!first.row.actor_id} attention={entries.some((e) => e.attention)} tr={tr} bn={bn} />}
        tr={tr}
      />
      {open && (
        <ul id={panelId} aria-label={sentence} className="mx-3 mb-3 overflow-hidden rounded-xl sm:ml-[128px] sm:mr-4" style={{ border: `1px solid ${RULE}`, background: '#fcfbf9' }}>
          {entries.map((e, i) => (
            <li key={e.row.id} style={{ borderTop: i === 0 ? undefined : `1px solid ${RULE}` }}>
              <SubRow entry={e} open={openEntry === e.row.id}
                onToggle={() => setOpenEntry(openEntry === e.row.id ? null : e.row.id)}
                tr={tr} bn={bn} fieldLabel={fieldLabel} formatValue={formatValue} lookups={lookups} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * A single entry inside an expanded group. The group line already says who
 * did what to which kind of record, so this line only names the record and,
 * for an update, what changed on it.
 */
function SubRow({ entry: e, open, onToggle, tr, bn, fieldLabel, formatValue, lookups }: RowProps & {
  entry: Entry; open: boolean; onToggle: () => void;
}) {
  const panelId = useId();
  const actor = e.row.actor_id ? lookups.members[e.row.actor_id] : null;
  const changes = e.changes ? Object.entries(e.changes).filter(([k]) => !HIDDEN_FIELDS.has(k)) : [];
  const isAttendance = e.row.entity === 'attendance' || e.row.entity === 'cswo_attendance';
  const label = isAttendance ? e.sentence : (e.name || tr('(unnamed record)', '(নামহীন রেকর্ড)'));
  const detail = changes.slice(0, 2)
    .map(([k, v]) => `${fieldLabel(k)}: ${formatValue(k, v.from)} → ${formatValue(k, v.to)}`).join(' · ')
    + (changes.length > 2 ? ' …' : '');
  return (
    <>
      <button
        type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId}
        className={`flex w-full items-center gap-3 px-3 py-1.5 text-left text-[13.5px] hover:bg-stone-50 ${FOCUS} focus-visible:-outline-offset-2`}
      >
        <time dateTime={e.row.created_at} className="w-[64px] shrink-0 whitespace-nowrap tabular-nums" style={{ color: MUTED }}>{timeOf(e.row.created_at, bn)}</time>
        <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:gap-3">
          <span className="font-semibold" style={{ color: INK }}>{label}</span>
          {detail && <span className="min-w-0 text-[13px]" style={{ color: INK2 }}>{detail}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} style={{ color: MUTED }} aria-hidden />
      </button>
      {open && (
        <div id={panelId} className="px-3 pb-3">
          <EntryDetails entry={e} tr={tr} bn={bn} fieldLabel={fieldLabel} formatValue={formatValue}
            actorId={actor ? memberDisplayId(actor) : null} />
        </div>
      )}
    </>
  );
}

function EntryDetails({ entry: e, tr, bn, fieldLabel, formatValue, actorId }: Omit<RowProps, 'lookups'> & {
  entry: Entry; actorId: string | null;
}) {
  const changeRows = e.changes ? Object.entries(e.changes).filter(([key]) => !HIDDEN_FIELDS.has(key)) : [];
  const snapRows = !e.changes && e.snapshot
    ? Object.entries(e.snapshot).filter(([key, v]) => !HIDDEN_FIELDS.has(key) && v !== null && v !== '' && typeof v !== 'object')
    : [];
  const rowCls = 'grid grid-cols-1 gap-0.5 px-3 py-2 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-3';

  return (
    <div className="space-y-2">
      {changeRows.length > 0 && (
        <dl aria-label={tr('What changed', 'কী বদলেছে')} className="divide-y overflow-hidden rounded-xl" style={{ border: `1px solid ${RULE}`, background: PAPER }}>
          {changeRows.map(([key, v]) => (
            <div key={key} className={rowCls} style={{ borderColor: RULE }}>
              <dt className="text-[13px] font-semibold" style={{ color: MUTED }}>{fieldLabel(key)}</dt>
              <dd className="flex flex-wrap items-center gap-x-2 gap-y-1 break-words text-[14px]">
                <span className="rounded px-1.5 py-0.5 line-through decoration-1" style={{ background: '#fdecec', color: '#991b1b' }}>
                  <span className="sr-only">{tr('from ', 'আগে ')}</span>{formatValue(key, v.from)}
                </span>
                <span aria-hidden style={{ color: MUTED }}>→</span>
                <span className="rounded px-1.5 py-0.5 font-semibold" style={{ background: '#e3f6ec', color: '#14532d' }}>
                  <span className="sr-only">{tr('to ', 'পরে ')}</span>{formatValue(key, v.to)}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      {snapRows.length > 0 && (
        <dl
          aria-label={e.kind === 'removed' ? tr('What was removed', 'কী মুছে ফেলা হয়েছে') : tr('Details recorded', 'নথিভুক্ত বিবরণ')}
          className="grid overflow-hidden rounded-xl md:grid-cols-2"
          style={{ border: `1px solid ${RULE}`, background: PAPER }}
        >
          {snapRows.map(([key, v]) => (
            <div key={key} className={`${rowCls} border-t md:[&:nth-child(-n+2)]:border-t-0 [&:first-child]:border-t-0`} style={{ borderColor: RULE }}>
              <dt className="text-[13px] font-semibold" style={{ color: MUTED }}>{fieldLabel(key)}</dt>
              <dd className="break-words text-[14px]" style={{ color: INK }}>{formatValue(key, v)}</dd>
            </div>
          ))}
        </dl>
      )}

      {changeRows.length === 0 && snapRows.length === 0 && (
        <p className="text-[13.5px]" style={{ color: MUTED }}>{tr('No further details were recorded for this change.', 'এই পরিবর্তনের আর কোনো বিবরণ নথিভুক্ত হয়নি।')}</p>
      )}

      <details className="rounded-xl text-[13px]" style={{ background: CREAM, border: `1px solid ${RULE}` }}>
        <summary className={`min-h-[36px] cursor-pointer select-none px-3 py-2 font-semibold ${FOCUS}`} style={{ color: INK2 }}>
          {tr('Technical details', 'কারিগরি বিবরণ')}
        </summary>
        <dl className="grid grid-cols-1 gap-x-3 gap-y-1 px-3 pb-3 sm:grid-cols-[140px_minmax(0,1fr)]" style={{ color: INK2 }}>
          <dt style={{ color: MUTED }}>{tr('Exact time', 'সঠিক সময়')}</dt>
          <dd>{new Date(e.row.created_at).toLocaleString(bn ? 'bn-IN' : 'en-IN', { dateStyle: 'full', timeStyle: 'medium' })}</dd>
          <dt style={{ color: MUTED }}>{tr('Done by', 'কে করেছেন')}</dt>
          <dd>{e.actorName ?? tr('System (automatic)', 'সিস্টেম (স্বয়ংক্রিয়)')}{actorId ? ` · ${actorId}` : ''}</dd>
          <dt style={{ color: MUTED }}>{tr('Table · action', 'টেবিল · অ্যাকশন')}</dt>
          <dd className="break-all font-mono text-[12px]">{e.row.entity} · {e.row.action}</dd>
          {e.row.entity_id && (
            <>
              <dt style={{ color: MUTED }}>{tr('Record ID', 'রেকর্ড আইডি')}</dt>
              <dd className="break-all font-mono text-[12px]">{e.row.entity_id}</dd>
            </>
          )}
          <dt style={{ color: MUTED }}>{tr('Log ID', 'লগ আইডি')}</dt>
          <dd className="break-all font-mono text-[12px]">{e.row.id}</dd>
        </dl>
      </details>
    </div>
  );
}
