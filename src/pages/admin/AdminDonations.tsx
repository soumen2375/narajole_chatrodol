import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Donation, PaymentGateway, CswoPaymentMethod } from '@/types';
import { useFmt, formatDate } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { printReceipt, printCertificate } from '@/lib/receipt';
import { useAuth } from '@/context/AuthContext';
import { AdminGatewaySwitch } from '@/components/payment/GatewaySelector';
import {
  DonationFields, emptyDonationDraft, donationToDraft, saveDonation, validateDonation, useMoneyRefs,
  type DonationDraft,
} from '@/components/finance/moneyForms';
import { gatewayLabel } from '@/lib/payments';
import {
  Search,
  Download,
  Plus,
  Trash2,
  X,
  RefreshCw,
  FileText,
  Mail,
  Phone,
  User,
  CalendarClock,
  CalendarDays,
  Heart,
  CreditCard,
  Hash,
  Gift,
  Award,
  Pencil,
  CheckCircle2,
  Clock,
  Globe,
  Banknote,
  type LucideIcon,
} from 'lucide-react';

/* ── Palette ─────────────────────────────────────────────────────────────── */
const PAPER = '#ffffff';
const RULE = '#e6e0d0';
const RULE_SOFT = '#f2eee3';
const INK = '#191713';
const INK2 = '#33302a';
const MUTED = '#8a8171';
const SOFT = '#9a9080';
const FIELD = '#f8f6f0';
const HEAD = 'linear-gradient(180deg,#faf7f0,#f4f1e8)';
const BRAND = '#e2560f';

const SERIF = '"Noto Serif Bengali", "Noto Serif", Georgia, serif';
const MONO = '"DM Mono", "Roboto Mono", ui-monospace, monospace';

const PAGE_SIZE = 25;

/* Status → pill + row accent */
const STATUS_STYLE: Record<string, { bg: string; fg: string; accent: string }> = {
  paid:     { bg: '#dcf5e8', fg: '#0e6f4a', accent: '#2fb37a' },
  created:  { bg: '#fdeecd', fg: '#92610a', accent: '#f0b429' },
  pending:  { bg: '#fdeecd', fg: '#92610a', accent: '#f0b429' },
  failed:   { bg: '#fde4e0', fg: '#a83218', accent: '#e2560f' },
  refunded: { bg: '#efece4', fg: '#6a6355', accent: '#b6ae9c' },
};
const statusStyle = (s: string) => STATUS_STYLE[s] ?? { bg: '#efece4', fg: '#6a6355', accent: '#b6ae9c' };

interface DonationRow extends Omit<Donation, 'member'> {
  member?: { full_name: string; email: string } | null;
  /** Which table the row came from. Monthly dues live in cswo_monthly_contributions. */
  source: 'donation' | 'dues';
  dues_month?: number;
  dues_year?: number;
}

/* Small action button used in the row + mobile card */
function ActionBtn({
  label, onClick, disabled, bg, border, fg, title, full,
}: {
  label: React.ReactNode; onClick: () => void; disabled?: boolean;
  bg: string; border: string; fg: string; title?: string; full?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center justify-center rounded-[7px] text-[11.5px] font-semibold transition-[filter] hover:brightness-95 disabled:opacity-50"
      style={{
        height: 27, padding: '0 7px', background: bg, border: `1px solid ${border}`,
        color: fg, whiteSpace: 'nowrap', flex: full ? '1 1 64px' : '0 1 auto',
      }}
    >
      {label}
    </button>
  );
}

export default function AdminDonations() {
  const { member: me } = useAuth();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gatewayFilter, setGatewayFilter] = useState<string>('all');
  const [kindFilter, setKindFilter] = useState<'all' | 'donation' | 'dues'>('all');
  /** 'all', 'none' for money not tied to an event, or an event id. */
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [onlyRecurring, setOnlyRecurring] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const pad = (n: number) => String(n).padStart(2, '0');
  const timeOf = (s: string) => {
    const d = new Date(s);
    return `${fmt.num(pad(d.getHours()))}:${fmt.num(pad(d.getMinutes()))}`;
  };
  const months = fmt.months();
  const shortDate = (s: string) => {
    const d = new Date(s);
    return `${fmt.num(d.getDate())} ${months[d.getMonth()].slice(0, 3)} ${fmt.num(d.getFullYear())}`;
  };
  const fyOf = (s: string) => {
    const d = new Date(s);
    const y = d.getFullYear();
    return d.getMonth() + 1 >= 4 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
  };
  const statusLabel = (s: string) => ({
    paid: tr('Paid', 'পরিশোধিত'),
    created: tr('Awaiting Payment', 'পেমেন্ট চলছে'),
    pending: tr('Pending', 'অপেক্ষমাণ'),
    failed: tr('Failed', 'ব্যর্থ'),
    refunded: tr('Refunded', 'ফেরত'),
  }[s] ?? s);

  const [regs, setRegs] = useState({ reg80g: '', reg12a: '', orgPan: '' });
  const { events, banks } = useMoneyRefs();

  // Manual donation modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [detail, setDetail] = useState<DonationRow | null>(null);
  const [draft, setDraft] = useState<DonationDraft>(emptyDonationDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    supabase.from('cswo_compliance').select('ckey,reg_number').then(({ data }) => {
      const m = Object.fromEntries(((data ?? []) as { ckey: string; reg_number: string }[]).map((r) => [r.ckey, r.reg_number]));
      setRegs({ reg80g: m['80g'] ?? '', reg12a: m['12a'] ?? '', orgPan: m['pan'] ?? '' });
    });
  }, []);

  const deleteDonation = async (id: string) => {
    if (!window.confirm(tr('Are you sure you want to delete this record?', 'আপনি কি নিশ্চিত যে এই রেকর্ডটি মুছে ফেলতে চান?'))) return;
    await supabase.from('cswo_donations').delete().eq('id', id);
    setDonations((ds) => ds.filter((d) => d.id !== id));
  };

  const handleCert = (d: DonationRow) => {
    const payId = d.cashfree_payment_id || d.razorpay_payment_id || undefined;
    printCertificate({
      receiptNumber: d.receipt_number ?? `DON-${d.id.slice(0, 8).toUpperCase()}`,
      name: d.is_anonymous ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক') : (d.donor_name ?? '—'),
      amount: Number(d.amount),
      date: formatDate(d.created_at, 'en'),
      fy: fyOf(d.created_at),
      purpose: d.purpose,
      paymentId: payId,
      reg80g: regs.reg80g,
      reg12a: regs.reg12a,
      orgPan: regs.orgPan,
    }, lang);
  };

  const loadDonations = useCallback(() => {
    setLoading(true);

    let dq = supabase
      .from('cswo_donations')
      .select('*, member:cswo_members(full_name,email)')
      .order('created_at', { ascending: false });
    if (statusFilter !== 'all') dq = dq.eq('status', statusFilter);
    if (gatewayFilter !== 'all') dq = dq.eq('payment_gateway', gatewayFilter);
    if (onlyRecurring) dq = dq.eq('is_recurring', true);
    if (dateFrom) dq = dq.gte('created_at', dateFrom);
    if (dateTo) dq = dq.lte('created_at', dateTo + 'T23:59:59');

    // Monthly dues are money in too, so they belong in this list. They live in
    // their own table, so they are mapped onto the same row shape.
    // The FK hint is required: this table has two foreign keys to cswo_members
    // (member_id and recorded_by), and a bare embed makes PostgREST reject the
    // whole query - which is why dues silently vanished from this list.
    let cq = supabase
      .from('cswo_monthly_contributions')
      .select('*, member:cswo_members!cswo_monthly_contributions_member_id_fkey(full_name,email)')
      .eq('status', 'paid')
      .order('paid_at', { ascending: false });
    if (dateFrom) cq = cq.gte('paid_at', dateFrom);
    if (dateTo) cq = cq.lte('paid_at', dateTo + 'T23:59:59');

    Promise.all([dq, cq]).then(([dR, cR]) => {
      const donationRows = ((dR.data ?? []) as DonationRow[]).map((d) => ({ ...d, source: 'donation' as const }));

      type Con = {
        id: string; member_id: string; year: number; month: number; amount: number;
        status: string; paid_at: string | null; created_at: string; payment_method: string | null;
        payment_gateway: string; receipt_number: string | null; note: string | null;
        member?: { full_name: string; email: string } | null;
      };
      const duesRows: DonationRow[] = ((cR.data ?? []) as Con[]).map((c) => ({
        id: c.id,
        donor_name: c.member?.full_name ?? tr('Member', 'সদস্য'),
        donor_email: c.member?.email ?? null,
        donor_phone: null,
        amount: c.amount,
        currency: 'INR',
        purpose: `${tr('Monthly donation', 'মাসিক অনুদান')} · ${months[Math.max(0, c.month - 1)]} ${c.year}`,
        member_id: c.member_id,
        event_id: null,
        payment_method: (c.payment_method ?? 'online') as CswoPaymentMethod,
        razorpay_order_id: null, razorpay_payment_id: null, razorpay_signature: null,
        cashfree_order_id: null, cashfree_payment_id: null,
        payment_gateway: (c.payment_gateway ?? 'offline') as PaymentGateway,
        status: 'paid',
        is_anonymous: false,
        is_recurring: true,
        receipt_number: c.receipt_number,
        created_at: c.paid_at ?? c.created_at,
        updated_at: c.paid_at ?? c.created_at,
        member: c.member ?? null,
        source: 'dues' as const,
        dues_month: c.month,
        dues_year: c.year,
      } as DonationRow));

      const merged = [...donationRows, ...duesRows]
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      setDonations(merged);
      setLoading(false);
    });
  }, [statusFilter, gatewayFilter, onlyRecurring, dateFrom, dateTo, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadDonations();
  }, [loadDonations]);

  const openAddDonation = () => {
    setEditingId(null);
    setDraft(emptyDonationDraft());
    setErr('');
    setShowAddModal(true);
  };

  const openEditDonation = (d: DonationRow) => {
    setEditingId(d.id);
    setDraft(donationToDraft(d));
    setErr('');
    setShowAddModal(true);
  };

  const saveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateDonation(draft, lang);
    if (problem) { setErr(problem); return; }
    setSaving(true);
    setErr('');
    try {
      await saveDonation(draft, me?.id ?? null, lang, editingId ?? undefined);
      setShowAddModal(false);
      setEditingId(null);
      setDraft(emptyDonationDraft());
      loadDonations();
    } catch (err: unknown) {
      setErr(err instanceof Error ? err.message : tr('Could not save.', 'সংরক্ষণ করা যায়নি।'));
    } finally {
      setSaving(false);
    }
  };

  const setRecurring = async (id: string, val: boolean) => {
    await supabase.from('cswo_donations').update({ is_recurring: val }).eq('id', id);
    setDonations((ds) => ds.map((d) => (d.id === id ? { ...d, is_recurring: val } : d)));
  };

  // Filter donations in memory by search query
  const filteredDonations = useMemo(() => {
    let base = kindFilter === 'all' ? donations : donations.filter((d) => d.source === kindFilter);
    // Monthly dues are never event-allocated, so picking an event drops them.
    if (eventFilter === 'none') base = base.filter((d) => !d.event_id);
    else if (eventFilter !== 'all') base = base.filter((d) => d.event_id === eventFilter);
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter((d) =>
      (d.donor_name && d.donor_name.toLowerCase().includes(q)) ||
      (d.donor_email && d.donor_email.toLowerCase().includes(q)) ||
      (d.donor_phone && d.donor_phone.includes(q)) ||
      (d.receipt_number && d.receipt_number.toLowerCase().includes(q)) ||
      (d.purpose && d.purpose.toLowerCase().includes(q))
    );
  }, [donations, searchQuery, kindFilter, eventFilter]);

  const paidRows = filteredDonations.filter((d) => d.status === 'paid');
  const total = paidRows.reduce((s, d) => s + Number(d.amount), 0);
  const avgGift = paidRows.length ? Math.round(total / paidRows.length) : 0;
  const recurringCount = filteredDonations.filter((d) => d.is_recurring).length;

  // Reset to page 1 whenever the result set changes shape
  useEffect(() => { setPage(1); }, [searchQuery, statusFilter, gatewayFilter, kindFilter, eventFilter, onlyRecurring, dateFrom, dateTo]);

  const pageCount = Math.max(1, Math.ceil(filteredDonations.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filteredDonations.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeFrom = filteredDonations.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(safePage * PAGE_SIZE, filteredDonations.length);

  const handleReceipt = (d: DonationRow) => {
    const gw = d.payment_gateway || (d.cashfree_payment_id ? 'cashfree' : (d.razorpay_payment_id ? 'razorpay' : 'offline'));
    printReceipt(
      {
        receiptNumber: d.receipt_number ?? `DON-${d.id.slice(0, 8).toUpperCase()}`,
        type: 'donation',
        name: d.is_anonymous ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক') : (d.donor_name ?? '—'),
        email: d.donor_email,
        amount: Number(d.amount),
        date: formatDate(d.created_at, 'en'),
        purpose: d.purpose,
        paymentMethod: gatewayLabel(gw),
        paymentId: d.cashfree_payment_id || d.razorpay_payment_id || undefined,
      },
      lang,
    );
  };

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const syncCashfreeStatus = async (d: DonationRow) => {
    setSyncingId(d.id);
    try {
      // Use cashfree_order_id — NOT cashfree_payment_id (they are different!)
      const orderId = d.cashfree_order_id || '';
      if (!orderId) {
        alert(tr(
          'Cashfree order ID not found on this record. Cannot sync.',
          'এই রেকর্ডে Cashfree অর্ডার আইডি নেই। সিঙ্ক করা সম্ভব নয়।',
        ));
        return;
      }
      const res = await fetch('/api/cashfree-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();
      if (data.status === 'paid' || data.success) {
        alert(tr('Payment verified and marked as Paid!', 'পেমেন্ট সফলভাবে যাচাই হয়েছে!'));
        loadDonations();
      } else {
        alert(tr(
          `Status in Cashfree: ${data.status || data.order_status || 'NOT PAID'}`,
          `ক্যাশফ্রি স্ট্যাটাস: ${data.status || data.order_status || 'NOT PAID'}`,
        ));
      }
    } catch {
      alert(tr('Sync failed. Please check network.', 'যাচাই ব্যর্থ হয়েছে।'));
    } finally {
      setSyncingId(null);
    }
  };

  const resendReceipt = async (d: DonationRow) => {
    if (!d.donor_email) {
      alert(tr('No email address on this record.', 'এই রেকর্ডে কোনো ইমেল নেই।'));
      return;
    }
    setResendingId(d.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch('/api/resend-payment-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: d.id, type: 'donation' }),
      });
      // A missing/failed endpoint answers with HTML, not JSON — report that
      // plainly instead of a misleading "network error".
      const raw = await res.text();
      let data: { success?: boolean; error?: string };
      try {
        data = JSON.parse(raw) as { success?: boolean; error?: string };
      } catch {
        alert(tr(
          `The receipt service did not respond correctly (HTTP ${res.status}).`,
          `রসিদ পরিষেবা সঠিকভাবে সাড়া দেয়নি (HTTP ${res.status})।`,
        ));
        return;
      }
      if (data.success) {
        alert(tr('Receipt sent successfully!', 'রসিদ সফলভাবে পাঠানো হয়েছে!'));
        loadDonations();
      } else {
        alert(data.error || tr('Unable to resend receipt.', 'রসিদ পাঠাতে সমস্যা হয়েছে।'));
      }
    } catch (e: unknown) {
      alert(tr(
        'Could not reach the receipt service: ' + (e instanceof Error ? e.message : 'unknown error'),
        'রসিদ পরিষেবায় পৌঁছানো যায়নি: ' + (e instanceof Error ? e.message : 'অজানা ত্রুটি'),
      ));
    } finally {
      setResendingId(null);
    }
  };

  const exportCSV = () => {
    const header = [
      tr('Date', 'তারিখ'),
      tr('Donor', 'দাতা'),
      tr('Email', 'ইমেল'),
      tr('Phone', 'ফোন'),
      tr('Amount (₹)', 'পরিমাণ (₹)'),
      tr('Gateway', 'গেটওয়ে'),
      tr('Purpose', 'উদ্দেশ্য'),
      tr('Status', 'অবস্থা'),
      tr('Receipt No.', 'রসিদ নং'),
      tr('Transaction ID', 'পেমেন্ট আইডি'),
    ];
    const rows = filteredDonations.map((d) => {
      const gw = d.payment_gateway || (d.cashfree_payment_id ? 'cashfree' : (d.razorpay_payment_id ? 'razorpay' : 'offline'));
      const payId = d.cashfree_payment_id || d.razorpay_payment_id || '';
      return [
        d.created_at.slice(0, 10),
        d.is_anonymous ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক') : (d.donor_name ?? ''),
        d.donor_email ?? '',
        d.donor_phone ?? '',
        d.amount,
        gatewayLabel(gw),
        d.purpose ?? '',
        d.status,
        d.receipt_number ?? '',
        payId,
      ];
    });
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cswo-donations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* Actions shared by the desktop row and the mobile card */
  const deleteDues = async (id: string) => {
    if (!window.confirm(tr('Remove this monthly donation record?', 'এই মাসিক অনুদানের রেকর্ড মুছবেন?'))) return;
    await supabase.from('cswo_monthly_contributions').delete().eq('id', id);
    setDonations((ds) => ds.filter((d) => d.id !== id));
  };

  /** Manual entries can be removed; gateway transactions are records of real
   *  money moving through a PSP and must not be deleted from the books. */
  const isManual = (d: DonationRow) => d.source === 'dues' || d.payment_gateway === 'offline';
  const modeLabel = (d: DonationRow) => (d.payment_method === 'cash' ? tr('Offline', 'অফলাইন') : tr('Online', 'অনলাইন'));

  const renderActions = (d: DonationRow, full: boolean) => (
    <div className="flex flex-wrap items-center gap-[5px]">
      <ActionBtn
        label={tr('View details', 'বিস্তারিত')} full={full}
        onClick={() => setDetail(d)}
        title={tr('Open this transaction', 'এই লেনদেনটি খুলুন')}
        bg={PAPER} border="#e0d8c6" fg="#43403a"
      />
    </div>
  );

  const monthlyBadge = (
    <span
      className="rounded-[3px] px-1 py-[1px] text-[8px] font-bold tracking-[.07em]"
      style={{ background: 'linear-gradient(180deg,#ffe9a8,#fdd971)', color: '#6d4d00' }}
    >
      {tr('MONTHLY', 'মাসিক')}
    </span>
  );

  const fieldStyle = {
    height: 36, background: FIELD, border: `1px solid ${RULE}`, borderRadius: 9,
    color: INK2, fontSize: 12.5, outline: 'none', minWidth: 0,
  } as const;

  return (
    <div
      className="relative flex flex-col gap-3 pb-10"
      style={{ color: INK, fontFamily: 'inherit' }}
    >
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="min-w-0 flex-[1_1_240px]">
          <h1
            className="m-0 text-[clamp(24px,3.4vw,34px)] font-semibold leading-[1.05] tracking-[-.025em]"
            style={{ fontFamily: SERIF }}
          >
            {tr('Donations', 'অনুদান')}
          </h1>
          <p className="mt-0.5 text-[12.5px]" style={{ color: '#7d7565' }}>
            {tr('Donor contributions, offline collections & certificates.', 'দাতাদের অনুদান, অফলাইন সংগ্রহ ও সার্টিফিকেট।')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openAddDonation}
            className="inline-flex items-center justify-center gap-[7px] rounded-[10px] text-[13px] font-semibold text-white transition-[filter] hover:brightness-110"
            style={{ height: 38, padding: '0 16px', background: 'linear-gradient(180deg,#e2560f,#b8400d)', boxShadow: '0 6px 15px -8px rgba(184,64,13,1)' }}
          >
            <Plus className="h-4 w-4" />
            {tr('Manual Donation', 'ম্যানুয়াল দান')}
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center justify-center gap-[7px] rounded-[10px] text-[13px] font-semibold transition-colors hover:bg-[#fbf8f1]"
            style={{ height: 38, padding: '0 16px', background: PAPER, border: '1px solid #d9d1c0', color: INK2 }}
          >
            <Download className="h-3.5 w-3.5" />
            {tr('Export CSV', 'CSV ডাউনলোড')}
          </button>
        </div>
      </div>

      {/* ── Stat cards + gateway routing ────────────────────────────────── */}
      <div className="flex flex-wrap gap-[clamp(9px,1.2vw,12px)]">
        <StatCard
          eyebrow={tr('TOTAL RAISED', 'মোট সংগৃহীত')}
          value={fmt.money(total)}
          sub={`${fmt.num(paidRows.length)} ${tr('paid contributions', 'সফল অনুদান')}`}
          bg="linear-gradient(158deg,#fff5ec 0%,#ffffff 60%)"
          border="#f0d9c2" bar="linear-gradient(180deg,#f59e0b,#c2410c)"
          eyebrowFg="#a1642f" valueFg="#c2410c"
        />
        <StatCard
          eyebrow={tr('TOTAL RECORDS', 'রেকর্ড সংখ্যা')}
          value={fmt.num(filteredDonations.length)}
          sub={tr('Matching current filters', 'নির্বাচিত ফিল্টার অনুযায়ী')}
          bg="linear-gradient(158deg,#eef4ff 0%,#ffffff 60%)"
          border="#d3ddf2" bar="linear-gradient(180deg,#60a5fa,#1e40af)"
          eyebrowFg="#4a6ba8" valueFg="#1e4f8f"
        />
        <StatCard
          eyebrow={tr('AVG. GIFT', 'গড় অনুদান')}
          value={fmt.money(avgGift)}
          sub={`${fmt.num(recurringCount)} ${tr('recurring donors', 'মাসিক দাতা')}`}
          bg="linear-gradient(158deg,#ecfaf3 0%,#ffffff 60%)"
          border="#c8e7d8" bar="linear-gradient(180deg,#3ee08f,#0e6f4a)"
          eyebrowFg="#2f7d5c" valueFg="#0e6f4a"
        />
        <div className="min-w-0 flex-[2_1_400px]">
          <AdminGatewaySwitch compact />
        </div>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-[7px] rounded-[14px] p-[9px]"
        style={{ background: PAPER, border: `1px solid ${RULE}` }}
      >
        <label
          className="flex min-w-0 flex-[2_1_230px] items-center gap-2 rounded-[9px] px-[11px]"
          style={{ height: 36, background: FIELD, border: `1px solid ${RULE}` }}
        >
          <Search className="h-3.5 w-3.5 shrink-0" style={{ color: '#a89e88' }} />
          <input
            type="text"
            placeholder={tr('Search donor, email, receipt…', 'দাতা, ইমেল বা রসিদ খুঁজুন…')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-w-0 flex-1 border-none bg-transparent text-[13px] outline-none"
            style={{ color: INK }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="shrink-0" style={{ color: '#a89e88' }}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>

        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as 'all' | 'donation' | 'dues')}
          className="flex-[1_1_130px] cursor-pointer px-2.5"
          style={fieldStyle}
        >
          <option value="all">{tr('All money in', 'সব আয়')}</option>
          <option value="donation">{tr('Donations', 'অনুদান')}</option>
          <option value="dues">{tr('Monthly donation', 'মাসিক অনুদান')}</option>
        </select>

        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="flex-[1_1_150px] cursor-pointer px-2.5"
          style={fieldStyle}
        >
          <option value="all">{tr('All events', 'সব অনুষ্ঠান')}</option>
          <option value="none">{tr('Not allocated', 'অনির্ধারিত')}</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex-[1_1_130px] cursor-pointer px-2.5"
          style={fieldStyle}
        >
          <option value="all">{tr('All Statuses', 'সব অবস্থা')}</option>
          <option value="paid">{tr('Paid', 'পরিশোধিত')}</option>
          <option value="created">{tr('Awaiting Payment', 'পেমেন্ট চলছে')}</option>
          <option value="failed">{tr('Failed', 'ব্যর্থ')}</option>
        </select>

        <select
          value={gatewayFilter}
          onChange={(e) => setGatewayFilter(e.target.value)}
          className="flex-[1_1_130px] cursor-pointer px-2.5"
          style={fieldStyle}
        >
          <option value="all">{tr('All Gateways', 'সব গেটওয়ে')}</option>
          <option value="cashfree">Cashfree</option>
          <option value="razorpay">Razorpay</option>
          <option value="offline">{tr('Offline', 'অফলাইন')}</option>
        </select>

        <label
          className="flex min-w-0 flex-[1_1_165px] cursor-pointer items-center gap-[7px] rounded-[9px] px-[11px] text-[12.5px] font-medium"
          style={{
            height: 36,
            border: `1px solid ${onlyRecurring ? '#f0c9a8' : RULE}`,
            background: onlyRecurring ? '#fff5ec' : FIELD,
            color: onlyRecurring ? '#a1642f' : INK2,
          }}
        >
          <input
            type="checkbox"
            checked={onlyRecurring}
            onChange={(e) => setOnlyRecurring(e.target.checked)}
            className="h-[15px] w-[15px]"
            style={{ accentColor: '#c2410c' }}
          />
          {tr('Recurring monthly', 'মাসিক অনুদান')}
        </label>

        <div className="flex min-w-0 flex-[1_1_220px] items-center gap-1.5">
          <input
            type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="min-w-0 flex-1 px-2.5" style={{ ...fieldStyle, fontSize: 12, color: '#5f594c' }}
          />
          <span className="shrink-0 text-[12px]" style={{ color: '#a89e88' }}>→</span>
          <input
            type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="min-w-0 flex-1 px-2.5" style={{ ...fieldStyle, fontSize: 12, color: '#5f594c' }}
          />
        </div>

        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="text-[12px] font-semibold hover:underline"
            style={{ color: BRAND }}
          >
            {tr('Clear dates', 'তারিখ মুছুন')}
          </button>
        )}
      </div>

      {/* ── Results ─────────────────────────────────────────────────────── */}
      {loading ? (
        <TableSkeleton rows={6} />
      ) : filteredDonations.length === 0 ? (
        <div
          className="rounded-[14px] px-5 py-8 text-center"
          style={{ background: PAPER, border: '1px dashed #d9d1c0' }}
        >
          <div className="mb-[3px] text-[19px] font-semibold" style={{ fontFamily: SERIF }}>
            {tr('No donations match these filters', 'এই ফিল্টারে কোনো অনুদান নেই')}
          </div>
          <div className="text-[12.5px]" style={{ color: MUTED }}>
            {tr('Try clearing the search or widening the date range.', 'সার্চ মুছে দেখুন বা তারিখের পরিসর বাড়ান।')}
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="flex flex-col gap-2 md:hidden">
            {pageRows.map((d) => {
              const st = statusStyle(d.status);
              return (
                <article
                  key={d.id}
                  className="flex flex-col gap-2 rounded-[12px] px-3 py-[11px]"
                  style={{ background: PAPER, border: `1px solid ${RULE}`, borderLeft: `3px solid ${st.accent}` }}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-[14px] font-bold tracking-[-.01em]">
                        <span className="truncate">
                          {d.is_anonymous ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক') : (d.donor_name || '—')}
                        </span>
                        {d.is_recurring && monthlyBadge}
                      </div>
                      <div className="mt-px truncate text-[11.5px]" style={{ color: SOFT }}>
                        {d.donor_email || d.donor_phone || ''}
                      </div>
                    </div>
                    <div className="shrink-0 text-[19px] font-bold tracking-[-.02em]" style={{ fontFamily: SERIF }}>
                      {fmt.money(Number(d.amount))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-[5px]">
                    <span className="rounded-full px-2 py-[3px] text-[10.5px] font-semibold" style={{ background: st.bg, color: st.fg }}>
                      {statusLabel(d.status)}
                    </span>
                    <span className="rounded-full px-2 py-[3px] text-[10.5px] font-semibold" style={{ background: '#f4f1e8', color: d.payment_method === 'cash' ? '#7a7263' : '#1a73e8' }}>
                      {modeLabel(d)}
                    </span>
                    {d.purpose && (
                      <span className="rounded-full px-2 py-[3px] text-[10.5px]" style={{ background: '#f4f1e8', color: '#6a6355' }}>
                        {d.purpose}
                      </span>
                    )}
                  </div>
                  <div
                    className="flex justify-between gap-2 pt-[7px] text-[10.5px]"
                    style={{ borderTop: '1px dashed #ebe5d8', color: SOFT, fontFamily: MONO }}
                  >
                    <span>{shortDate(d.created_at)} · {timeOf(d.created_at)}</span>
                    <span className="truncate">{d.receipt_number ?? '—'}</span>
                  </div>
                  {renderActions(d, true)}
                </article>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div
            className="hidden overflow-hidden rounded-[14px] md:block"
            style={{ background: PAPER, border: `1px solid ${RULE}`, boxShadow: '0 1px 2px rgba(60,50,30,.04)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: 900 }}>
                <thead>
                  <tr style={{ background: HEAD }}>
                    {[
                      { l: tr('DATE', 'তারিখ'), w: 96, a: 'left' },
                      { l: tr('DONOR', 'দাতা'), w: undefined, a: 'left' },
                      { l: tr('AMOUNT', 'পরিমাণ'), w: 104, a: 'right' },
                      { l: tr('PURPOSE', 'উদ্দেশ্য'), w: 168, a: 'left' },
                      { l: tr('STATUS', 'অবস্থা'), w: 130, a: 'left' },
                      { l: tr('RECEIPT', 'রসিদ'), w: 108, a: 'left' },
                      { l: tr('ACTIONS', 'কার্যক্রম'), w: 130, a: 'center' },
                    ].map((h) => (
                      <th
                        key={h.l}
                        className="whitespace-nowrap px-[13px] py-2 font-medium"
                        style={{
                          width: h.w, textAlign: h.a as 'left' | 'right' | 'center',
                          fontFamily: MONO, fontSize: 9.5, letterSpacing: '.13em',
                          color: MUTED, borderBottom: `1px solid ${RULE}`,
                        }}
                      >
                        {h.l}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((d) => {
                    const st = statusStyle(d.status);
                    return (
                      <tr
                        key={d.id}
                        className="transition-colors hover:bg-[#fdfbf5]"
                        style={{ borderBottom: `1px solid ${RULE_SOFT}`, boxShadow: `inset 3px 0 0 ${st.accent}` }}
                      >
                        <td className="whitespace-nowrap px-[13px] py-2 align-middle">
                          <div className="text-[12px] font-semibold">{shortDate(d.created_at)}</div>
                          <div style={{ fontFamily: MONO, fontSize: 10, color: '#a29886' }}>{timeOf(d.created_at)}</div>
                        </td>

                        <td className="overflow-hidden px-[13px] py-2 align-middle">
                          <div className="flex items-center gap-[5px] overflow-hidden text-[12.5px] font-semibold leading-[1.25]">
                            <span className="truncate">
                              {d.is_anonymous ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক') : (d.donor_name || '—')}
                            </span>
                            {d.is_recurring && monthlyBadge}
                          </div>
                          <div className="truncate text-[11px]" style={{ color: '#a29886' }}>
                            {d.donor_email || d.donor_phone || ''}
                            {d.member && <span> · {d.member.full_name}</span>}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-[13px] py-2 text-right align-middle">
                          <div className="text-[15.5px] font-bold tracking-[-.015em]" style={{ fontFamily: SERIF }}>
                            {fmt.money(Number(d.amount))}
                          </div>
                          <div
                            className="text-[9.5px] font-semibold uppercase"
                            style={{ color: d.payment_method === 'cash' ? '#7a7263' : '#1a73e8', letterSpacing: '.07em' }}
                          >
                            {modeLabel(d)}
                          </div>
                        </td>

                        <td className="overflow-hidden px-[13px] py-2 align-middle">
                          <span
                            title={d.purpose ?? ''}
                            className="inline-flex max-w-full items-center truncate rounded-full px-[9px] text-[11px]"
                            style={{ height: 22, background: '#f4f1e8', color: '#6a6355' }}
                          >
                            {d.purpose || '—'}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-[13px] py-2 align-middle">
                          <span
                            className="inline-flex items-center justify-center rounded-full px-2.5 text-[10.5px] font-semibold"
                            style={{ height: 22, background: st.bg, color: st.fg }}
                          >
                            {statusLabel(d.status)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-[13px] py-2 align-middle">
                          <span style={{ fontFamily: MONO, fontSize: 10.5, color: '#7a7263' }}>
                            {d.receipt_number ?? '—'}
                          </span>
                        </td>

                        <td className="px-[13px] py-1.5 align-middle">{renderActions(d, false)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer / pagination */}
            <div
              className="flex flex-wrap items-center justify-between gap-2 px-[13px] py-2"
              style={{ background: HEAD, borderTop: '1px solid #eee8db' }}
            >
              <div className="text-[11.5px]" style={{ color: MUTED }}>
                {tr(
                  `Showing ${rangeFrom}–${rangeTo} of ${filteredDonations.length} records`,
                  `${fmt.num(filteredDonations.length)}টির মধ্যে ${fmt.num(rangeFrom)}–${fmt.num(rangeTo)} দেখানো হচ্ছে`,
                )}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="rounded-[8px] text-[12px] transition-colors hover:bg-[#f4f1e8] disabled:opacity-40"
                  style={{ height: 30, padding: '0 12px', background: PAPER, border: '1px solid #e0d8c6', color: '#43403a' }}
                >
                  {tr('Previous', 'পূর্ববর্তী')}
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={safePage >= pageCount}
                  className="rounded-[8px] text-[12px] transition-colors hover:bg-[#f4f1e8] disabled:opacity-40"
                  style={{ height: 30, padding: '0 12px', background: PAPER, border: '1px solid #e0d8c6', color: '#43403a' }}
                >
                  {tr('Next', 'পরবর্তী')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* -- Transaction details -------------------------------------------- */}
      {detail && (() => {
        const d = detail;
        const gw = d.payment_gateway || (d.cashfree_payment_id ? 'cashfree' : (d.razorpay_payment_id ? 'razorpay' : 'offline'));
        const linkedEvent = events.find((ev) => ev.id === d.event_id) ?? null;
        const canSync = !!d.cashfree_order_id && d.status !== 'paid';
        const manual = isManual(d);
        const online = d.payment_method !== 'cash';
        const close = () => setDetail(null);
        const paid = d.status === 'paid';

        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4 animate-fade-in" onClick={close}>
            <div
              className="flex max-h-[94vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[22px] shadow-2xl sm:rounded-[22px]"
              style={{ background: PAPER, color: INK }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* header */}
              <div className="relative flex items-center gap-3 px-5 pb-3 pt-4" style={{ borderBottom: `1px solid ${RULE_SOFT}` }}>
                <span className="flex h-11 w-11 items-center justify-center rounded-[13px]" style={{ background: '#e8f6ee', color: '#0e6f4a' }}>
                  <FileText className="h-5 w-5" />
                </span>
                <h2 className="flex-1 text-[21px] font-bold tracking-[-.01em]" style={{ color: '#14312a' }}>
                  {tr('Transaction Details', 'লেনদেনের বিস্তারিত')}
                </h2>
                <button
                  onClick={close}
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[#f4f1e8]"
                  style={{ border: `1px solid ${RULE}`, color: MUTED }}
                  aria-label={tr('Close', 'বন্ধ')}
                >
                  <X className="h-4 w-4" />
                </button>
                <span className="absolute bottom-0 left-5 h-[3px] w-[52px] rounded-full" style={{ background: '#0e6f4a' }} />
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* amount banner */}
                <div className="px-5 py-6 text-center" style={{ background: 'linear-gradient(180deg,#f2fbf6 0%,#ffffff 100%)' }}>
                  <div className="text-[40px] font-extrabold leading-none tracking-[-.02em]" style={{ color: '#0e8552' }}>
                    +&nbsp;{fmt.money(Number(d.amount))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold" style={{ background: paid ? '#e3f6ec' : '#fdeecd', color: paid ? '#0e6f4a' : '#92610a' }}>
                      {paid ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                      {statusLabel(d.status)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold" style={{ background: online ? '#e8f0fe' : '#f2efe7', color: online ? '#1a5fd0' : '#6a6355', border: `1px solid ${online ? '#d3e0fa' : RULE}` }}>
                      {online ? <Globe className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
                      {modeLabel(d)}
                    </span>
                  </div>
                </div>

                {/* fields */}
                <div className="px-4 pb-4">
                  <div className="rounded-[16px] px-3" style={{ background: '#fbfaf7', border: `1px solid ${RULE_SOFT}` }}>
                    <DetailRow icon={User} tint="#eef4ff" fg="#1a5fd0" label={tr('Donor', 'দাতা')}
                      value={d.is_anonymous ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক') : (d.donor_name || '—')} />
                    <DetailRow icon={Mail} tint="#e8f6ee" fg="#0e6f4a" label={tr('Email', 'ইমেল')} value={d.donor_email || '—'} />
                    <DetailRow icon={Phone} tint="#e8f6ee" fg="#0e6f4a" label={tr('Mobile', 'মোবাইল')} value={d.donor_phone || '—'} />
                    <DetailRow icon={CalendarClock} tint="#eef4ff" fg="#1a5fd0" label={tr('Date & time', 'তারিখ ও সময়')}
                      value={shortDate(d.created_at) + ' · ' + timeOf(d.created_at)} />
                    <DetailRow icon={Heart} tint="#fdeef0" fg="#c2410c" label={tr('Purpose', 'উদ্দেশ্য')} value={d.purpose || '—'} />
                    <DetailRow icon={CreditCard} tint="#f2efe7" fg="#6a6355" label={tr('Payment gateway', 'পেমেন্ট গেটওয়ে')} value={gatewayLabel(gw)} />
                    {(d.cashfree_payment_id || d.razorpay_payment_id) && (
                      <DetailRow icon={Hash} tint="#f2efe7" fg="#6a6355" label={tr('Transaction ID', 'পেমেন্ট আইডি')}
                        value={d.cashfree_payment_id || d.razorpay_payment_id || '—'} mono />
                    )}
                    <DetailRow icon={FileText} tint="#e8f6ee" fg="#0e6f4a" label={tr('Receipt no.', 'রসিদ নং')} value={d.receipt_number || '—'} mono />
                    <DetailRow icon={Gift} tint="#fdf2e6" fg="#b57611" label={tr('Allocated to event', 'অনুষ্ঠানে বরাদ্দ')} last
                      value={linkedEvent
                        ? <a href={'/admin/events/' + linkedEvent.id} className="font-semibold hover:underline" style={{ color: BRAND }}>{linkedEvent.title}</a>
                        : <span style={{ color: MUTED }}>{tr('Not allocated — set it on the Ledger page', 'অনির্ধারিত — লেজার পাতায় ঠিক করুন')}</span>} />
                  </div>

                  {/* actions */}
                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {paid && (
                      <BigAction icon={FileText} title={tr('Receipt', 'রসিদ')} sub={tr('Download receipt', 'রসিদ ডাউনলোড')}
                        tone="green" onClick={() => handleReceipt(d)} />
                    )}
                    {paid && d.source !== 'dues' && (
                      <BigAction icon={Award} title={tr('80G certificate', '৮০জি সার্টিফিকেট')} sub={tr('Download 80G certificate', '৮০জি সার্টিফিকেট ডাউনলোড')}
                        tone="green" onClick={() => handleCert(d)} />
                    )}
                    {paid && d.donor_email && (
                      <BigAction icon={Mail}
                        title={resendingId === d.id ? tr('Sending…', 'পাঠানো হচ্ছে…') : tr('Email receipt', 'ইমেল রসিদ')}
                        sub={tr('Send receipt to email', 'ইমেলে রসিদ পাঠান')}
                        tone="plain" disabled={resendingId === d.id} onClick={() => resendReceipt(d)} />
                    )}
                    {canSync && (
                      <BigAction icon={RefreshCw} title={tr('Sync status', 'স্ট্যাটাস সিঙ্ক')} sub={tr('Check with the gateway', 'গেটওয়ে থেকে যাচাই')}
                        tone="blue" disabled={syncingId === d.id} spin={syncingId === d.id} onClick={() => syncCashfreeStatus(d)} />
                    )}
                    {d.source !== 'dues' && (
                      <BigAction icon={CalendarDays}
                        title={d.is_recurring ? tr('Unmark monthly', 'মাসিক বাতিল') : tr('Mark as monthly', 'মাসিক চিহ্নিত')}
                        sub={d.is_recurring ? tr('Remove from monthly records', 'মাসিক তালিকা থেকে সরান') : tr('Add to monthly records', 'মাসিক তালিকায় যোগ করুন')}
                        tone={d.is_recurring ? 'amber' : 'plain'}
                        onClick={() => { setRecurring(d.id, !d.is_recurring); setDetail({ ...d, is_recurring: !d.is_recurring }); }} />
                    )}
                    {manual && d.source !== 'dues' && (
                      <BigAction icon={Pencil} title={tr('Edit', 'সম্পাদনা')} sub={tr('Change this entry', 'এই এন্ট্রি বদলান')}
                        tone="plain" onClick={() => { openEditDonation(d); setDetail(null); }} />
                    )}
                  </div>

                  {manual && (
                    <div className="mt-2.5">
                      <BigAction
                        icon={Trash2} title={tr('Delete', 'মুছুন')} sub={tr('Remove this transaction', 'এই লেনদেনটি সরান')}
                        tone="danger" wide
                        onClick={() => {
                          if (d.source === 'dues') deleteDues(d.id); else deleteDonation(d.id);
                          setDetail(null);
                        }} />
                    </div>
                  )}
                  {!manual && (
                    <p className="mt-2.5 text-center text-[11.5px]" style={{ color: MUTED }}>
                      {tr('Gateway transactions cannot be deleted — they record money that actually moved.', 'গেটওয়ে লেনদেন মোছা যায় না — এটি প্রকৃত অর্থ চলাচলের রেকর্ড।')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Manual Donation Modal ───────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setShowAddModal(false)}>
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[16px] p-6 shadow-2xl"
            style={{ background: PAPER, border: `1px solid ${RULE}`, color: INK }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b pb-3" style={{ borderColor: RULE }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-[10px]"
                  style={{ background: '#fff5ec', color: BRAND, border: '1px solid #f0d9c2' }}
                >
                  <Plus className="h-5 w-5" />
                </div>
                <h2 className="text-[17px] font-semibold" style={{ fontFamily: SERIF }}>
                  {editingId ? tr('Edit Donation', 'অনুদান সম্পাদনা') : tr('Record Offline / Manual Donation', 'অফলাইন / ম্যানুয়াল অনুদান রেকর্ড')}
                </h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="rounded-lg p-1.5 hover:bg-[#f4f1e8]" style={{ color: MUTED }}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {err && (
              <p className="mb-4 rounded-[10px] px-3 py-2 text-xs font-semibold" style={{ background: '#fdf1ef', border: '1px solid #f3d7d1', color: '#b3341a' }}>
                {err}
              </p>
            )}

            <form onSubmit={saveManual} className="space-y-4">
              <DonationFields draft={draft} onChange={setDraft} events={events} banks={banks} />

              <div className="mt-5 flex justify-end gap-3 border-t pt-4" style={{ borderColor: RULE_SOFT }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-[10px] px-4 text-[13px] font-semibold hover:bg-[#fbf8f1]"
                  style={{ height: 38, background: PAPER, border: '1px solid #d9d1c0', color: INK2 }}
                >
                  {tr('Cancel', 'বাতিল')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-[10px] px-5 text-[13px] font-semibold text-white transition-[filter] hover:brightness-110 disabled:opacity-60"
                  style={{ height: 38, background: 'linear-gradient(180deg,#e2560f,#b8400d)', boxShadow: '0 6px 15px -8px rgba(184,64,13,1)' }}
                >
                  {saving ? tr('Saving…', 'সংরক্ষণ…') : editingId ? tr('Save changes', 'পরিবর্তন সংরক্ষণ') : tr('Save Donation', 'সংরক্ষণ করুন')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Presentational bits ──────────────────────────────────────────────────── */

function StatCard({
  eyebrow, value, sub, bg, border, bar, eyebrowFg, valueFg,
}: {
  eyebrow: string; value: string; sub: string;
  bg: string; border: string; bar: string; eyebrowFg: string; valueFg: string;
}) {
  return (
    <div
      className="relative flex min-w-0 flex-[1_1_175px] flex-col gap-px overflow-hidden rounded-[14px] px-3.5 py-3"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <div className="absolute bottom-0 left-0 top-0 w-[3px]" style={{ background: bar }} />
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', color: eyebrowFg }}>{eyebrow}</div>
      <div
        className="text-[clamp(26px,3.2vw,34px)] font-bold leading-[1.15] tracking-[-.025em]"
        style={{ fontFamily: SERIF, color: valueFg }}
      >
        {value}
      </div>
      <div className="text-[11px]" style={{ color: SOFT }}>{sub}</div>
    </div>
  );
}



function DetailRow({
  icon: Icon, tint, fg, label, value, mono, last,
}: {
  icon: LucideIcon; tint: string; fg: string; label: string;
  value: React.ReactNode; mono?: boolean; last?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: last ? 'none' : `1px solid ${RULE_SOFT}` }}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]" style={{ background: tint, color: fg }}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="w-[128px] shrink-0 text-[13px] leading-tight" style={{ color: '#5f594c' }}>{label}</span>
      <span className="shrink-0 text-[13px]" style={{ color: '#c8bfa9' }}>:</span>
      <span className="min-w-0 flex-1 break-words text-right text-[13.5px] font-semibold" style={{ color: INK, fontFamily: mono ? MONO : undefined }}>
        {value}
      </span>
    </div>
  );
}

const ACTION_TONES: Record<string, { bg: string; border: string; fg: string; sub: string }> = {
  green:  { bg: '#f1fbf5', border: '#c8e7d8', fg: '#0e6f4a', sub: '#5f9c81' },
  blue:   { bg: '#f2f7ff', border: '#d3e0fa', fg: '#1a5fd0', sub: '#7292c9' },
  amber:  { bg: '#fdf8ec', border: '#ecdcc0', fg: '#b57611', sub: '#a4915f' },
  danger: { bg: '#fdf2f1', border: '#f3d7d1', fg: '#c0392b', sub: '#c58a83' },
  plain:  { bg: '#ffffff', border: '#e0d8c6', fg: '#33302a', sub: '#9a9080' },
};

function BigAction({
  icon: Icon, title, sub, tone, onClick, disabled, wide, spin,
}: {
  icon: LucideIcon; title: string; sub: string; tone: keyof typeof ACTION_TONES;
  onClick: () => void; disabled?: boolean; wide?: boolean; spin?: boolean;
}) {
  const t = ACTION_TONES[tone];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 rounded-[13px] px-3.5 py-3 text-left transition-[filter] hover:brightness-[.98] disabled:opacity-60 ${wide ? 'w-full justify-center' : ''}`}
      style={{ background: t.bg, border: `1px solid ${t.border}` }}
    >
      <Icon className={`h-[18px] w-[18px] shrink-0 ${spin ? 'animate-spin' : ''}`} style={{ color: t.fg }} />
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-bold leading-tight" style={{ color: t.fg }}>{title}</span>
        <span className="mt-0.5 block truncate text-[11.5px]" style={{ color: t.sub }}>{sub}</span>
      </span>
    </button>
  );
}
