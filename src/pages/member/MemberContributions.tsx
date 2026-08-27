import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { MonthlyContribution, PaymentGateway } from '@/types';
import { useFmt, formatDate } from '@/lib/format';
import { useT } from '@/i18n';
import { startPayment, getGatewayMode, gatewayLabel } from '@/lib/payments';
import { loadRazorpayScript } from '@/lib/razorpay';
import { loadCashfreeScript } from '@/lib/cashfree';
import { printReceipt } from '@/lib/receipt';
import GatewaySelector from '@/components/payment/GatewaySelector';
import {
  Check,
  X,
  Zap,
  RefreshCw,
  CreditCard,
  ShieldCheck,
  Download,
  ArrowRight,
} from 'lucide-react';

const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const DEFAULT_AMOUNT = 100;
const PRESETS = [100, 200, 500];

// ── Palette (matches the Member Donate design) ────────────────────────────────
const INK        = '#1C2116';
const MUTED      = '#8A9580';
const DEEP        = '#0B3A27';
const DEEP_2      = '#0E4C34';
const LEAF        = '#0D4A33';
const AMBER       = '#FFC629';
const ON_AMBER    = '#22270A';
const WASH        = '#F1F4E9';
const PALE        = '#FCFCF8';
const LINE        = 'rgba(28,33,22,0.16)';
const LINE_SOFT   = 'rgba(28,33,22,0.08)';
const CARD_SHADOW = '0 2px 10px rgba(28,33,22,0.05)';

const SERIF: React.CSSProperties = { fontFamily: 'Georgia, "Noto Serif", "Noto Serif Bengali", serif' };

// ─── Payment confirmation modal (one month or many) ──────────────────────────
function ConfirmPayModal({
  monthNames,
  total,
  amountPerMonth,
  gateway,
  onGatewayChange,
  lang,
  onConfirm,
  onCancel,
  fmt,
  tr,
}: {
  monthNames: string[];
  total: number;
  amountPerMonth: number;
  gateway: PaymentGateway;
  onGatewayChange: (g: PaymentGateway) => void;
  lang: string;
  onConfirm: () => void;
  onCancel: () => void;
  fmt: ReturnType<typeof useFmt>;
  tr: (en: string, bn: string) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(11,58,39,0.55)' }}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[26px] bg-white p-6 shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: WASH, color: LEAF }}>
              <CreditCard className="h-5 w-5" />
            </div>
            <h3 className="text-[18px] font-bold" style={{ ...SERIF, color: INK }}>
              {tr('Confirm payment', 'পেমেন্ট নিশ্চিত করুন')}
            </h3>
          </div>
          <button onClick={onCancel} aria-label={tr('Close', 'বন্ধ')} className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-[13px] font-semibold" style={{ color: MUTED }}>
          {monthNames.length === 1
            ? tr(
                `1 month · ${fmt.money(amountPerMonth)}`,
                `১ মাস · ${fmt.money(amountPerMonth)}`,
              )
            : tr(
                `${monthNames.length} months · ${fmt.money(amountPerMonth)} each`,
                `${fmt.num(monthNames.length)} মাস · প্রতিটি ${fmt.money(amountPerMonth)}`,
              )}
        </p>

        <div className="mb-4 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
          {monthNames.map((nm) => (
            <span key={nm} className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: WASH, color: LEAF }}>
              {nm}
            </span>
          ))}
        </div>

        <div className="mb-4">
          <GatewaySelector value={gateway} onChange={onGatewayChange} lang={lang as 'en' | 'bn'} compact />
        </div>

        <div className="mb-5 flex items-start gap-2 rounded-2xl px-4 py-3 text-[12px]" style={{ background: WASH, color: '#3A4A33' }}>
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: LEAF }} />
          <div>
            <p className="mb-0.5 font-bold">{tr('Secure online payment', 'নিরাপদ অনলাইন পেমেন্ট')}</p>
            <p className="leading-relaxed">
              {monthNames.length === 1
                ? tr(
                    `${monthNames[0]} dues of ${fmt.money(total)} will be paid via ${gatewayLabel(gateway)}. Your receipt is emailed once it clears.`,
                    `${monthNames[0]} মাসের ${fmt.money(total)} টাকা ${gatewayLabel(gateway)}-এর মাধ্যমে পরিশোধ হবে। নিশ্চিত হলে রসিদ ইমেলে পাঠানো হবে।`,
                  )
                : tr(
                    `All ${monthNames.length} months are charged together as a single ${fmt.money(total)} payment via ${gatewayLabel(gateway)}.`,
                    `${fmt.num(monthNames.length)} মাসের চাঁদা একসাথে ${fmt.money(total)} টাকার একটি পেমেন্টে ${gatewayLabel(gateway)}-এর মাধ্যমে নেওয়া হবে।`,
                  )}
            </p>
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: DEEP, color: '#FFFFFF' }}>
          <span className="text-sm font-bold">{tr('Total to pay', 'মোট পরিশোধ')}</span>
          <span className="text-2xl font-bold" style={{ ...SERIF, color: AMBER }}>{fmt.money(total)}</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border py-3 text-sm font-bold transition-colors hover:bg-gray-50"
            style={{ borderColor: LINE, color: '#6E7A62' }}
          >
            {tr('Cancel', 'বাতিল')}
          </button>
          <button
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-bold transition-transform active:scale-[0.98]"
            style={{ background: AMBER, color: ON_AMBER }}
          >
            <Zap className="h-4 w-4" />
            {tr(`Pay ${fmt.money(total)}`, `${fmt.money(total)} পরিশোধ করুন`)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Auto Pay Settings Modal ──────────────────────────────────────────────────
function AutoPayModal({
  active,
  amount,
  gateway,
  onToggle,
  onGatewayChange,
  onSettleNow,
  onClose,
  currentDue,
  fmt,
  tr,
  lang,
}: {
  active: boolean;
  amount: number;
  gateway: PaymentGateway;
  onToggle: () => void;
  onGatewayChange: (g: PaymentGateway) => void;
  onSettleNow: () => void;
  onClose: () => void;
  currentDue: number;
  fmt: ReturnType<typeof useFmt>;
  tr: (en: string, bn: string) => string;
  lang: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(11,58,39,0.55)' }}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[26px] bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b pb-3" style={{ borderColor: LINE_SOFT }}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: WASH, color: LEAF }}>
              <RefreshCw className={`h-5 w-5 ${active ? 'animate-spin-slow' : ''}`} />
            </div>
            <div>
              <h3 className="text-[17px] font-bold" style={{ ...SERIF, color: INK }}>
                {tr('Auto pay', 'অটো-পে')}
              </h3>
              <p className="text-[12px] font-semibold" style={{ color: MUTED }}>
                {tr('Never miss a monthly contribution', 'কোনো মাসের চাঁদা আর মিস হবে না')}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label={tr('Close', 'বন্ধ')} className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className="mb-5 flex items-center justify-between rounded-2xl p-4"
          style={{ background: active ? WASH : '#F6F6F1' }}
        >
          <div>
            <p className="text-[13.5px] font-bold" style={{ color: INK }}>
              {active ? tr('Auto pay is on', 'অটো-পে চালু আছে') : tr('Auto pay is off', 'অটো-পে বন্ধ আছে')}
            </p>
            <p className="text-[11.5px] font-semibold" style={{ color: MUTED }}>
              {active
                ? tr(`${fmt.money(amount)} on the 1st of each month`, `প্রতি মাসের ১ তারিখে ${fmt.money(amount)}`)
                : tr('Turn it on to pay automatically', 'স্বয়ংক্রিয় পেমেন্টের জন্য চালু করুন')}
            </p>
          </div>
          <button
            onClick={onToggle}
            className="rounded-full px-4 py-2 text-xs font-bold transition-transform active:scale-95"
            style={active ? { background: '#FFFFFF', color: LEAF, border: `1px solid ${LINE}` } : { background: AMBER, color: ON_AMBER }}
          >
            {active ? tr('Turn off', 'বন্ধ করুন') : tr('Turn on', 'চালু করুন')}
          </button>
        </div>

        <div className="mb-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
            {tr('Preferred gateway', 'পছন্দের গেটওয়ে')}
          </p>
          <GatewaySelector value={gateway} onChange={onGatewayChange} lang={lang as 'en' | 'bn'} compact />
        </div>

        {currentDue > 0 && (
          <div className="mb-5 rounded-2xl p-4" style={{ background: PALE, border: `1px solid ${LINE}` }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12.5px] font-bold" style={{ color: INK }}>{tr('Pending right now', 'এখন বকেয়া')}</span>
              <span className="text-sm font-bold" style={{ ...SERIF, color: LEAF }}>{fmt.money(currentDue)}</span>
            </div>
            <button
              onClick={onSettleNow}
              className="flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold transition-transform active:scale-[0.98]"
              style={{ background: AMBER, color: ON_AMBER }}
            >
              <Zap className="h-4 w-4" />
              {tr(`Settle now (${fmt.money(currentDue)})`, `এখনই পরিশোধ করুন (${fmt.money(currentDue)})`)}
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full rounded-full border py-3 text-sm font-bold transition-colors hover:bg-gray-50"
          style={{ borderColor: LINE, color: '#6E7A62' }}
        >
          {tr('Close', 'বন্ধ করুন')}
        </button>
      </div>
    </div>
  );
}

// ─── Month card skeleton ──────────────────────────────────────────────────────
function MonthCardSkeleton() {
  return (
    <div className="flex min-h-[60px] animate-pulse flex-col justify-center rounded-[14px] px-2.5 py-2" style={{ background: '#FFFFFF', border: `1.5px solid ${LINE}` }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-20 rounded bg-gray-200" />
        <div className="h-[22px] w-[22px] rounded-full bg-gray-200" />
      </div>
      <div className="mb-2 h-6 w-16 rounded bg-gray-200" />
      <div className="h-3 w-14 rounded bg-gray-200" />
    </div>
  );
}

export default function MemberContributions() {
  const { member } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  const [year, setYear] = useState(currentYear);
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [customAmount, setCustomAmount] = useState('');
  const [rows, setRows] = useState<Record<number, MonthlyContribution>>({});
  const [loading, setLoading] = useState(true);
  const [earlierPayments, setEarlierPayments] = useState<MonthlyContribution[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<number[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [payingMonths, setPayingMonths] = useState<Set<number>>(new Set());

  const [autoPayActive, setAutoPayActive] = useState<boolean>(
    () => localStorage.getItem('cswo_auto_pay_active') === 'true',
  );

  // Which months a confirmation modal is currently asking about
  const [pendingBatch, setPendingBatch] = useState<number[] | null>(null);
  const [showAutoPayModal, setShowAutoPayModal] = useState(false);

  const [gateway, setGateway] = useState<PaymentGateway>(() =>
    getGatewayMode() === 'razorpay' ? 'razorpay' : 'cashfree',
  );

  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const months = fmt.months();

  useEffect(() => {
    void loadRazorpayScript();
    void loadCashfreeScript();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ─── Load data ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!member) return;
    setLoading(true);

    const { data: contribData } = await supabase
      .from('cswo_monthly_contributions')
      .select('*')
      .eq('member_id', member.id)
      .eq('year', year);

    const map: Record<number, MonthlyContribution> = {};
    for (const r of (contribData ?? []) as MonthlyContribution[]) map[r.month] = r;
    setRows(map);

    // Latest payments from other years, for the "earlier years" strip in history
    const { data: recentData } = await supabase
      .from('cswo_monthly_contributions')
      .select('*')
      .eq('member_id', member.id)
      .eq('status', 'paid')
      .neq('year', year)
      .order('paid_at', { ascending: false })
      .limit(5);

    setEarlierPayments((recentData ?? []) as MonthlyContribution[]);
    setLoading(false);
  }, [member, year]);

  useEffect(() => { void load(); }, [load]);

  // Clear stale selection whenever the year changes
  useEffect(() => { setSelected([]); }, [year]);

  // ─── Derived state ──────────────────────────────────────────────────────────
  const {
    paidMonths,
    dueMonths,
    futureMonths,
    lastDueMonth,
    totalDue,
    totalPaid,
    paidPct,
  } = useMemo(() => {
    const all = Array.from({ length: 12 }, (_, i) => i + 1);
    // Past years are fully due; a future year has nothing due yet.
    const lastDueMonth = year < currentYear ? 12 : year > currentYear ? 0 : currentMonth;

    const paidMonths = all.filter((m) => rows[m]?.status === 'paid');
    const dueMonths = all.filter((m) => m <= lastDueMonth && rows[m]?.status !== 'paid');
    const futureMonths = all.filter((m) => m > lastDueMonth && rows[m]?.status !== 'paid');

    const totalPaid = paidMonths.reduce((s, m) => s + Number(rows[m]?.amount ?? 0), 0);

    return {
      paidMonths,
      dueMonths,
      futureMonths,
      lastDueMonth,
      totalDue: dueMonths.length * amount,
      totalPaid,
      paidPct: Math.round((paidMonths.length / 12) * 100),
    };
  }, [rows, amount, year, currentYear, currentMonth]);

  const yearHistory = useMemo(
    () =>
      paidMonths
        .map((m) => rows[m])
        .sort((a, b) => new Date(b.paid_at ?? 0).getTime() - new Date(a.paid_at ?? 0).getTime()),
    [paidMonths, rows],
  );

  const isValidAmount = amount >= 10;
  const anyBusy = payingMonths.size > 0;
  const selectedTotal = selected.length * amount;
  const allDueSelected = dueMonths.length > 0 && dueMonths.every((m) => selected.includes(m));

  // ─── Amount handling ────────────────────────────────────────────────────────
  const pickPreset = (v: number) => {
    setAmount(v);
    setCustomAmount('');
  };

  const onCustomAmount = (raw: string) => {
    setCustomAmount(raw);
    const v = Number(raw);
    setAmount(raw.trim() === '' || Number.isNaN(v) ? DEFAULT_AMOUNT : v);
  };

  // ─── Selection ──────────────────────────────────────────────────────────────
  const toggleMonth = (m: number) => {
    if (rows[m]?.status === 'paid' || anyBusy) return;
    setSelected((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)));
  };

  const toggleSelectAllDue = () => {
    setSelected(allDueSelected ? [] : dueMonths);
  };

  // ─── Auto pay ───────────────────────────────────────────────────────────────
  const toggleAutoPay = () => {
    const next = !autoPayActive;
    setAutoPayActive(next);
    localStorage.setItem('cswo_auto_pay_active', String(next));
    showToast(
      next
        ? tr('Auto pay is on.', 'অটো-পে চালু করা হয়েছে।')
        : tr('Auto pay is off.', 'অটো-পে বন্ধ করা হয়েছে।'),
    );
  };

  // ─── Payment execution ──────────────────────────────────────────────────────
  // Online gateway only. Self-recorded UPI QR / bank transfer was removed from
  // the member side — a member marking their own month paid never touched a
  // gateway, so the treasurer records those in the admin panel instead.
  const executePayment = async (monthList: number[]) => {
    setPendingBatch(null);
    if (anyBusy || monthList.length === 0 || !isValidAmount || !member) return;

    setPayingMonths(new Set(monthList));
    setError('');

    try {
      // cashfree.ts / razorpay.ts pre-create one row per month
      // (sharing a single order id); the server-side verify/webhook marks them
      // paid and sends one combined receipt — nothing left to write here.
      // Must exceed the gateway polling window in src/lib/cashfree.ts (~3 min).
      const PAYMENT_TIMEOUT_MS = 200_000;

      const label =
        monthList.length === 1
          ? `Monthly dues — ${months[monthList[0] - 1]} ${year}`
          : `Monthly dues — ${monthList.length} months, ${year}`;

      const paymentPromise = startPayment({
        gateway,
        action: 'create_contribution_order',
        amount: monthList.length * Number(amount),
        memberId: member.id,
        year,
        ...(monthList.length === 1 ? { month: monthList[0] } : {}),
        months: monthList,
        donorName: member.full_name,
        donorEmail: member.email,
        donorPhone: member.phone ?? undefined,
        description: label,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                lang === 'bn'
                  ? 'পেমেন্ট যাচাইকরণে অনেক সময় লাগছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
                  : 'Payment verification is taking too long. Please try again.',
              ),
            ),
          PAYMENT_TIMEOUT_MS,
        ),
      );

      await Promise.race([paymentPromise, timeoutPromise]);

      showToast(
        monthList.length === 1
          ? tr(`${months[monthList[0] - 1]} paid. Thank you!`, `${months[monthList[0] - 1]} মাসের চাঁদা পরিশোধ হয়েছে। ধন্যবাদ!`)
          : tr(`${monthList.length} months paid. Thank you!`, `${fmt.num(monthList.length)} মাসের চাঁদা পরিশোধ হয়েছে। ধন্যবাদ!`),
      );
      setSelected([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment error';
      setError(msg === 'CANCELLED' ? t('pay.cancelled') : msg);
    } finally {
      setPayingMonths(new Set());
      await load();
    }
  };

  const startBatch = (monthList: number[]) => {
    if (monthList.length === 0 || !isValidAmount) return;
    setPendingBatch(monthList);
  };

  // ─── CSV export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const header = ['Month', 'Status', 'Amount (INR)', 'Paid At', 'Gateway', 'Receipt/Order ID'];
    const dataRows = monthsEn.map((nm, i) => {
      const month = i + 1;
      const row = rows[month];
      const paid = row?.status === 'paid';
      const gw = row?.payment_gateway || row?.payment_method;
      return [
        nm,
        paid ? 'Paid' : month <= lastDueMonth ? 'Pending' : 'Not due yet',
        paid ? String(row.amount) : String(amount),
        paid && row.paid_at ? new Date(row.paid_at).toLocaleString('en-US') : '—',
        paid && gw ? gatewayLabel(gw) : '—',
        paid ? (row.receipt_number || row.cashfree_order_id || row.razorpay_order_id || '—') : '—',
      ];
    });
    const csv = [header, ...dataRows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-donations-${year}-${(member?.full_name ?? 'member').replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(tr('Report downloaded.', 'রিপোর্ট ডাউনলোড হয়েছে।'));
  };

  const downloadReceipt = (row: MonthlyContribution) => {
    if (!row.receipt_number) return;
    printReceipt(
      {
        receiptNumber: row.receipt_number,
        type: 'contribution',
        name: member?.full_name ?? '',
        email: member?.email,
        amount: Number(row.amount),
        date: row.paid_at ? formatDate(row.paid_at, 'en') : '',
        month: monthsEn[row.month - 1],
        year: row.year,
        paymentMethod: gatewayLabel(row.payment_gateway || row.payment_method),
        paymentId: row.cashfree_payment_id || row.razorpay_payment_id || undefined,
      },
      lang,
    );
  };

  const years = [currentYear, currentYear - 1, currentYear - 2];
  const firstName = (member?.full_name ?? '').split(' ')[0] || tr('friend', 'বন্ধু');
  const dueMonthLabel = months[Math.max(0, lastDueMonth - 1)];

  // ─── Month card visual state ────────────────────────────────────────────────
  const monthCardStyle = (m: number) => {
    const row = rows[m];
    const paid = row?.status === 'paid';
    const isSelected = selected.includes(m);
    const isFuture = m > lastDueMonth;
    const busy = payingMonths.has(m);

    if (paid) {
      return {
        bg: '#F5F7F0', border: 'rgba(13,74,51,0.10)', dash: 'solid',
        text: '#A2AD96', sub: '#A2AD96',
        dotBg: '#DDE5D6', dotBorder: '#DDE5D6', dotText: '#7C8B6E',
        status: tr('PAID', 'পরিশোধিত'), mark: true,
      };
    }
    if (busy) {
      return {
        bg: '#FFFDF4', border: AMBER, dash: 'solid',
        text: INK, sub: '#A5670F',
        dotBg: AMBER, dotBorder: AMBER, dotText: ON_AMBER,
        status: tr('PROCESSING', 'চলছে'), mark: false,
      };
    }
    if (isSelected) {
      return {
        bg: DEEP_2, border: DEEP_2, dash: 'solid',
        text: '#FFFFFF', sub: 'rgba(255,255,255,0.72)',
        dotBg: AMBER, dotBorder: AMBER, dotText: ON_AMBER,
        status: tr('SELECTED', 'নির্বাচিত'), mark: true,
      };
    }
    if (isFuture) {
      return {
        bg: PALE, border: 'rgba(28,33,22,0.22)', dash: 'dashed',
        text: INK, sub: MUTED,
        dotBg: 'transparent', dotBorder: 'rgba(28,33,22,0.18)', dotText: ON_AMBER,
        status: tr('NOT DUE YET', 'এখনো বাকি নেই'), mark: false,
      };
    }
    return {
      bg: '#FFFFFF', border: LINE, dash: 'solid',
      text: INK, sub: MUTED,
      dotBg: 'transparent', dotBorder: 'rgba(28,33,22,0.18)', dotText: ON_AMBER,
      status: tr('PENDING', 'বকেয়া'), mark: false,
    };
  };

  return (
    <div className="relative flex flex-col gap-3 pb-24 lg:h-full lg:min-h-0 lg:gap-2.5 lg:pb-0" style={{ color: INK }}>
      {/* ── Toast ── */}
      {toastMessage && (
        <div
          className="fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 rounded-full px-5 py-3 text-[13px] font-bold text-white shadow-xl animate-fade-in"
          style={{ background: DEEP }}
        >
          <Check className="h-4 w-4 stroke-[3]" style={{ color: AMBER }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-3 lg:shrink-0">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] sm:text-[12px]" style={{ color: MUTED }}>
            {t('m.contributions')}
          </span>
          <h1 className="text-[clamp(21px,2.6vw,26px)] font-bold leading-tight tracking-tight" style={SERIF}>
            {tr(`Hello, ${firstName}`, `নমস্কার, ${firstName}`)}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="cursor-pointer rounded-full border bg-white px-3 py-2 text-[12.5px] font-bold shadow-sm outline-none focus:ring-2"
            style={{ borderColor: LINE, color: INK }}
          >
            {years.map((y) => (
              <option key={y} value={y}>{tr(`Year ${y}`, `${fmt.num(y)} সাল`)}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="rounded-full border px-4 py-2 text-[12.5px] font-bold transition-colors"
            style={{ borderColor: 'rgba(13,74,51,0.18)', background: showHistory ? WASH : '#FFFFFF', color: LEAF }}
          >
            {showHistory ? tr('Hide history', 'ইতিহাস লুকান') : tr('Payment history', 'পেমেন্ট ইতিহাস')}
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12.5px] font-bold transition-colors hover:bg-gray-50"
            style={{ borderColor: LINE, background: '#FFFFFF', color: INK }}
          >
            <Download className="h-4 w-4" style={{ color: MUTED }} />
            <span className="hidden sm:inline">{tr('Report', 'রিপোর্ট')}</span>
          </button>
        </div>
      </div>

      {/* ── Hero + amount/autopay column ── */}
      <div className="flex flex-wrap gap-3 lg:shrink-0">
        {/* Due hero */}
        <div
          className="relative flex min-w-[260px] flex-[1_1_360px] flex-col gap-3 overflow-hidden rounded-[20px] p-4 text-white sm:p-5"
          style={{ background: `linear-gradient(150deg, ${DEEP_2} 0%, ${DEEP} 100%)` }}
        >
          <div
            className="pointer-events-none absolute -right-[70px] -top-[90px] h-[280px] w-[280px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,198,41,0.16) 0%, rgba(255,198,41,0) 65%)' }}
          />

          <div className="relative flex flex-col gap-1.5">
            <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.66)' }}>
              {lastDueMonth === 0
                ? tr('Nothing due yet this year', 'এই বছর এখনো কিছু বাকি নেই')
                : tr(`Pending till ${dueMonthLabel} ${year}`, `${dueMonthLabel} ${fmt.num(year)} পর্যন্ত বকেয়া`)}
            </span>
            <div className="flex items-end gap-3">
              <span className="text-[clamp(30px,3.4vw,40px)] font-bold leading-none" style={SERIF}>{fmt.money(totalDue)}</span>
              <span className="pb-1.5 text-[12.5px]" style={{ color: 'rgba(255,255,255,0.62)' }}>
                {dueMonths.length === 1
                  ? tr('1 month due', '১ মাস বকেয়া')
                  : tr(`${dueMonths.length} months due`, `${fmt.num(dueMonths.length)} মাস বকেয়া`)}
              </span>
            </div>
          </div>

          <div className="relative flex flex-col gap-1.5">
            <div className="h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.16)' }}>
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{ width: `${paidPct}%`, background: AMBER }}
              />
            </div>
            <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {tr(`${paidMonths.length} of 12 months paid`, `১২ মাসের মধ্যে ${fmt.num(paidMonths.length)} মাস পরিশোধিত`)}
            </span>
          </div>

          {dueMonths.length > 0 ? (
            <button
              type="button"
              onClick={() => startBatch(dueMonths)}
              disabled={anyBusy || !isValidAmount}
              className="relative self-start rounded-full px-6 py-2.5 text-[14px] font-bold transition-transform hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: AMBER, color: ON_AMBER, boxShadow: '0 16px 34px -14px rgba(255,198,41,0.55)' }}
            >
              {anyBusy
                ? tr('Opening payment…', 'পেমেন্ট খুলছে…')
                : tr(`Pay all pending · ${fmt.money(totalDue)}`, `সব বকেয়া পরিশোধ · ${fmt.money(totalDue)}`)}
            </button>
          ) : (
            <div
              className="relative flex items-center gap-3 self-start rounded-full px-5 py-2.5"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)' }}
            >
              <span
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[15px] font-bold"
                style={{ background: AMBER, color: ON_AMBER }}
              >
                ✓
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px] font-bold">{tr('All dues cleared', 'সব বকেয়া পরিশোধিত')}</span>
                <span className="text-[11.5px]" style={{ color: 'rgba(255,255,255,0.62)' }}>
                  {tr('Thank you for staying with us', 'আমাদের সঙ্গে থাকার জন্য ধন্যবাদ')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Amount + auto pay */}
        <div className="flex min-w-[230px] flex-[1_1_250px] flex-col gap-3">
          <div className="flex flex-col gap-2 rounded-[18px] bg-white p-3.5" style={{ boxShadow: CARD_SHADOW }}>
            <span className="text-[13px] font-bold">{tr('Monthly amount', 'মাসিক পরিমাণ')}</span>

            {/* Value and presets share a row so the card stays short enough
                for the whole page to fit one screen. */}
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[24px] font-bold leading-none" style={{ ...SERIF, color: LEAF }}>
                  {fmt.money(amount)}
                </span>
                <span className="text-[12px]" style={{ color: MUTED }}>{tr('/ month', '/ মাস')}</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {PRESETS.map((p) => {
                  const on = amount === p && customAmount === '';
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => pickPreset(p)}
                      className="rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors"
                      style={{ borderColor: 'rgba(13,74,51,0.16)', background: on ? WASH : '#FFFFFF', color: LEAF }}
                    >
                      {fmt.money(p)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="flex items-center gap-2 rounded-xl px-3 py-1.5"
              style={{ border: `1.5px solid ${customAmount ? DEEP_2 : LINE}`, background: PALE }}
            >
              <span className="text-[12.5px] font-bold" style={{ color: MUTED }}>{tr('Other ₹', 'অন্য ₹')}</span>
              <input
                type="number"
                min={10}
                step={10}
                placeholder={tr('Enter amount', 'পরিমাণ লিখুন')}
                value={customAmount}
                onChange={(e) => onCustomAmount(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent text-[14.5px] font-bold outline-none"
                style={{ color: INK }}
              />
            </div>

            {!isValidAmount && (
              <p className="text-[12px] font-semibold" style={{ color: '#A5670F' }}>
                {tr('Minimum ₹10 per month.', 'প্রতি মাসে সর্বনিম্ন ১০ টাকা।')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-[18px] bg-white px-3.5 py-2.5" style={{ boxShadow: CARD_SHADOW }}>
            <button
              type="button"
              onClick={() => setShowAutoPayModal(true)}
              aria-label={tr('Auto pay settings', 'অটো-পে সেটিংস')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform active:scale-95"
              style={{ background: WASH, color: LEAF }}
            >
              <RefreshCw className={`h-5 w-5 ${autoPayActive ? 'animate-spin-slow' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setShowAutoPayModal(true)}
              className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
            >
              <span className="text-[13.5px] font-bold">{tr('Auto pay', 'অটো-পে')}</span>
              <span className="text-[11.5px] leading-snug" style={{ color: MUTED }}>
                {autoPayActive
                  ? tr('Runs on the 1st of each month', 'প্রতি মাসের ১ তারিখে চলবে')
                  : tr('Off — pay manually', 'বন্ধ — নিজে পরিশোধ করুন')}
              </span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={autoPayActive}
              aria-label={tr('Toggle auto pay', 'অটো-পে চালু/বন্ধ')}
              onClick={toggleAutoPay}
              className="relative h-[30px] w-[52px] shrink-0 rounded-full border-0 transition-colors duration-200"
              style={{ background: autoPayActive ? DEEP_2 : '#DCE0D2' }}
            >
              <span
                className="absolute top-[3px] h-6 w-6 rounded-full bg-white transition-[left] duration-200"
                style={{ left: autoPayActive ? '25px' : '3px', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── Payment history ── */}
      {showHistory && (
        <div className="flex flex-col gap-3 rounded-[22px] bg-white p-4 sm:p-5 lg:max-h-[42vh] lg:shrink-0 lg:overflow-y-auto" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[17px] font-bold" style={SERIF}>
                {tr(`Payment history · ${year}`, `পেমেন্ট ইতিহাস · ${fmt.num(year)}`)}
              </span>
              <span className="text-[13.5px]" style={{ color: MUTED }}>
                {yearHistory.length > 0
                  ? tr(
                      `${yearHistory.length} payments · ${fmt.money(totalPaid)} received`,
                      `${fmt.num(yearHistory.length)} টি পেমেন্ট · ${fmt.money(totalPaid)} গৃহীত`,
                    )
                  : tr('No payments recorded this year', 'এই বছর কোনো পেমেন্ট রেকর্ড নেই')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="rounded-full border px-[18px] py-2.5 text-[13.5px] font-semibold transition-colors hover:bg-gray-50"
              style={{ borderColor: LINE, color: '#6E7A62' }}
            >
              {tr('Close', 'বন্ধ')}
            </button>
          </div>

          <div className="flex flex-col">
            {yearHistory.map((h) => (
              <div
                key={h.id}
                className="flex flex-wrap items-center gap-3 border-t px-1 py-2.5"
                style={{ borderColor: LINE_SOFT }}
              >
                <span
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                  style={{ background: WASH, color: LEAF }}
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                </span>
                <div className="flex min-w-[160px] flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-bold">
                    {tr(`${months[h.month - 1]} dues`, `${months[h.month - 1]} মাসের চাঁদা`)}
                  </span>
                  <span className="text-[12.5px]" style={{ color: MUTED }}>
                    {h.paid_at ? fmt.date(h.paid_at) : '—'} · {gatewayLabel(h.payment_gateway || h.payment_method)}
                  </span>
                </div>
                {h.receipt_number && (
                  <span className="text-[12px] font-semibold tracking-wider" style={{ color: MUTED }}>
                    {h.receipt_number}
                  </span>
                )}
                <span className="min-w-[80px] text-right text-[18px] font-bold" style={{ ...SERIF, color: LEAF }}>
                  {fmt.money(Number(h.amount))}
                </span>
                {h.receipt_number ? (
                  <button
                    type="button"
                    onClick={() => downloadReceipt(h)}
                    className="flex items-center gap-1 text-[13px] font-bold hover:underline"
                    style={{ color: LEAF }}
                  >
                    {tr('Receipt', 'রসিদ')} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="text-[12px] font-semibold" style={{ color: MUTED }}>—</span>
                )}
              </div>
            ))}

            {yearHistory.length === 0 && (
              <p className="border-t py-6 text-center text-[13px] font-semibold" style={{ borderColor: LINE_SOFT, color: MUTED }}>
                {tr('Nothing here yet.', 'এখানে এখনো কিছু নেই।')}
              </p>
            )}
          </div>

          {earlierPayments.length > 0 && (
            <div className="flex flex-col gap-2 border-t pt-4" style={{ borderColor: LINE_SOFT }}>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
                {tr('Earlier years', 'আগের বছরগুলো')}
              </span>
              {earlierPayments.map((h) => (
                <div key={h.id} className="flex flex-wrap items-center justify-between gap-3 py-1.5">
                  <span className="text-[13.5px] font-semibold">
                    {months[h.month - 1]} {fmt.num(h.year)}
                    <span className="ml-2 text-[12px] font-medium" style={{ color: MUTED }}>
                      {gatewayLabel(h.payment_gateway || h.payment_method)}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-[15px] font-bold" style={{ ...SERIF, color: LEAF }}>
                      {fmt.money(Number(h.amount))}
                    </span>
                    {h.receipt_number && (
                      <button
                        type="button"
                        onClick={() => downloadReceipt(h)}
                        className="text-[12.5px] font-bold hover:underline"
                        style={{ color: LEAF }}
                      >
                        {tr('Receipt', 'রসিদ')}
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 12-month grid ── */}
      <div className="flex flex-col gap-2 rounded-[20px] bg-white p-3.5 lg:min-h-0 lg:flex-1" style={{ boxShadow: CARD_SHADOW }}>
        <div className="flex flex-wrap items-center justify-between gap-3 lg:shrink-0">
          <div className="flex flex-col gap-0.5">
            <span className="text-[16px] font-bold" style={SERIF}>
              {tr(`All 12 months · ${year}`, `১২ মাস · ${fmt.num(year)}`)}
            </span>
            <span className="text-[12px] leading-snug" style={{ color: MUTED }}>
              {lastDueMonth === 0
                ? tr('This year has not started yet — you can pay in advance.', 'এই বছর এখনো শুরু হয়নি — আগাম পরিশোধ করতে পারেন।')
                : tr(
                    `Dues run till ${dueMonthLabel}. Later months are open for advance payment.`,
                    `${dueMonthLabel} পর্যন্ত চাঁদা প্রযোজ্য। পরের মাসগুলো আগাম পরিশোধ করা যাবে।`,
                  )}
            </span>
          </div>

          {dueMonths.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAllDue}
              disabled={anyBusy}
              className="rounded-full border px-4 py-2 text-[12.5px] font-bold transition-colors disabled:opacity-50"
              style={{ borderColor: 'rgba(13,74,51,0.18)', background: '#FFFFFF', color: LEAF }}
            >
              {allDueSelected ? tr('Clear all', 'সব বাতিল') : tr('Select all pending', 'সব বকেয়া নির্বাচন')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-h-0 lg:flex-1 lg:auto-rows-fr lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => <MonthCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-h-0 lg:flex-1 lg:auto-rows-fr lg:grid-cols-4">
            {months.map((nm, i) => {
              const m = i + 1;
              const row = rows[m];
              const paid = row?.status === 'paid';
              const busy = payingMonths.has(m);
              const s = monthCardStyle(m);
              const shownAmount = paid ? Number(row.amount) : amount;

              // A paid month is a plain container, never a disabled <button>:
              // browsers swallow clicks inside a disabled button, which would
              // make the Receipt link on it dead.
              const cardProps = {
                className:
                  'flex min-h-[60px] flex-col justify-center gap-0.5 overflow-hidden rounded-[14px] px-2.5 py-2 text-left transition-all duration-150' +
                  (paid ? '' : ' enabled:hover:-translate-y-0.5 enabled:hover:shadow-lg disabled:cursor-default'),
                style: {
                  background: s.bg,
                  borderWidth: '1.5px',
                  borderStyle: s.dash,
                  borderColor: s.border,
                } as React.CSSProperties,
              };

              // Two rows, never three: the card has to stay legible when the
              // grid squashes it to fit the viewport. A paid month trades its
              // "PAID" caption for the receipt link — the greyed styling and
              // the tick already say it is paid.
              const body = (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-bold sm:text-[14px]" style={{ color: s.text }}>{nm}</span>
                    <span
                      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold sm:h-5 sm:w-5"
                      style={{ background: s.dotBg, border: `1.5px solid ${s.dotBorder}`, color: s.dotText }}
                    >
                      {busy ? (
                        <RefreshCw className="h-2.5 w-2.5 animate-spin" style={{ color: s.dotText }} />
                      ) : s.mark ? (
                        <Check className="h-2.5 w-2.5 stroke-[3]" style={{ color: s.dotText }} />
                      ) : null}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[15.5px] font-bold sm:text-[16px]" style={{ ...SERIF, color: s.text }}>
                      {fmt.money(shownAmount)}
                    </span>
                    {!(paid && row.receipt_number) && (
                      <span className="shrink-0 truncate text-[9.5px] font-semibold tracking-wider" style={{ color: s.sub }}>
                        {s.status}
                      </span>
                    )}
                  </div>
                </>
              );

              if (paid) {
                return (
                  <div key={m} {...cardProps}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-bold sm:text-[14px]" style={{ color: s.text }}>{nm}</span>
                      <span
                        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full sm:h-5 sm:w-5"
                        style={{ background: s.dotBg, border: `1.5px solid ${s.dotBorder}`, color: s.dotText }}
                      >
                        <Check className="h-2.5 w-2.5 stroke-[3]" style={{ color: s.dotText }} />
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[15.5px] font-bold sm:text-[16px]" style={{ ...SERIF, color: s.text }}>
                        {fmt.money(shownAmount)}
                      </span>
                      {row.receipt_number ? (
                        <button
                          type="button"
                          onClick={() => downloadReceipt(row)}
                          className="flex shrink-0 items-center gap-1 text-[10px] font-bold hover:underline"
                          style={{ color: LEAF }}
                        >
                          <Download className="h-3 w-3" />
                          {tr('Receipt', 'রসিদ')}
                        </button>
                      ) : (
                        <span className="shrink-0 text-[9.5px] font-semibold tracking-wider" style={{ color: s.sub }}>
                          {s.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMonth(m)}
                  disabled={anyBusy}
                  aria-pressed={selected.includes(m)}
                  aria-label={tr(
                    `${nm} ${year} — ${fmt.money(shownAmount)}, ${s.status.toLowerCase()}`,
                    `${nm} ${fmt.num(year)} — ${fmt.money(shownAmount)}, ${s.status}`,
                  )}
                  {...cardProps}
                >
                  {body}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[11px] lg:shrink-0" style={{ color: MUTED }}>
          <span className="flex items-center gap-[7px]">
            <span className="h-2 w-2 rounded-full" style={{ background: '#DDE5D6' }} />
            {tr('Paid', 'পরিশোধিত')}
          </span>
          <span className="flex items-center gap-[7px]">
            <span className="h-2 w-2 rounded-full" style={{ border: '1.5px solid rgba(28,33,22,0.3)' }} />
            {tr('Pending', 'বকেয়া')}
          </span>
          <span className="flex items-center gap-[7px]">
            <span className="h-2 w-2 rounded-full" style={{ border: '1.5px dashed rgba(28,33,22,0.3)' }} />
            {tr('Not due yet — pay in advance', 'এখনো বাকি নেই — আগাম দিন')}
          </span>
          {futureMonths.length > 0 && (
            <span className="ml-auto hidden text-[11px] font-semibold xl:inline" style={{ color: LEAF }}>
              {tr(
                `Tap any month to select it — advance payments are welcome.`,
                `যেকোনো মাসে ট্যাপ করে নির্বাচন করুন — আগাম পরিশোধ করা যায়।`,
              )}
            </span>
          )}
        </div>
      </div>

      {/* ── Floating selection bar ── */}
      {selected.length > 0 && !anyBusy && (
        <div
          className="fixed bottom-4 left-3 right-3 z-30 flex items-center justify-between gap-3 rounded-full py-2.5 pl-5 pr-2.5 text-white animate-fade-in sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:justify-start sm:gap-5 sm:py-3 sm:pl-6 sm:pr-3"
          style={{ background: DEEP, boxShadow: '0 22px 50px -18px rgba(11,58,39,0.7)' }}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[12.5px]" style={{ color: 'rgba(255,255,255,0.62)' }}>
              {selected.length === 1
                ? tr('1 month selected', '১ মাস নির্বাচিত')
                : tr(`${selected.length} months selected`, `${fmt.num(selected.length)} মাস নির্বাচিত`)}
            </span>
            <span className="text-[19px] font-bold leading-tight" style={SERIF}>{fmt.money(selectedTotal)}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelected([])}
            className="hidden rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors sm:block"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            {tr('Clear', 'বাতিল')}
          </button>
          <button
            type="button"
            onClick={() => startBatch(selected)}
            disabled={!isValidAmount}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-bold transition-transform hover:-translate-y-px active:scale-[0.98] disabled:opacity-60 sm:px-7 sm:py-3 sm:text-[15px]"
            style={{ background: AMBER, color: ON_AMBER }}
          >
            {tr('Pay now', 'এখনই পরিশোধ')} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Payment confirmation (one month or many, every screen size) ── */}
      {pendingBatch && (
        <ConfirmPayModal
          monthNames={pendingBatch.map((m) => months[m - 1])}
          total={pendingBatch.length * amount}
          amountPerMonth={amount}
          gateway={gateway}
          onGatewayChange={setGateway}
          lang={lang}
          onConfirm={() => void executePayment(pendingBatch)}
          onCancel={() => setPendingBatch(null)}
          fmt={fmt}
          tr={tr}
        />
      )}

      {showAutoPayModal && (
        <AutoPayModal
          active={autoPayActive}
          amount={amount}
          gateway={gateway}
          onToggle={toggleAutoPay}
          onGatewayChange={setGateway}
          onSettleNow={() => { setShowAutoPayModal(false); startBatch(dueMonths); }}
          onClose={() => setShowAutoPayModal(false)}
          currentDue={totalDue}
          fmt={fmt}
          tr={tr}
          lang={lang}
        />
      )}

      {/* ── Error / cancelled modal ── */}
      {error && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 animate-fade-in" style={{ background: 'rgba(11,58,39,0.6)' }}>
          <div className="relative my-auto w-full max-w-[420px] rounded-[26px] bg-white p-7 text-center shadow-2xl animate-scale-up">
            <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: '#F8EEDA' }}>
              <X className="h-7 w-7 stroke-[3]" style={{ color: '#A5670F' }} />
            </div>

            <h3 className="px-2 text-[21px] font-bold leading-snug" style={{ ...SERIF, color: INK }}>
              {error === t('pay.cancelled')
                ? tr('Payment cancelled', 'পেমেন্ট বাতিল হয়েছে')
                : tr('Payment did not go through', 'পেমেন্ট সম্পন্ন হয়নি')}
            </h3>

            {error !== t('pay.cancelled') && (
              <div className="mx-2 mt-3 rounded-2xl p-3" style={{ background: PALE, border: `1px solid ${LINE}` }}>
                <p className="break-words text-[12.5px] font-semibold leading-relaxed" style={{ color: '#6E7A62' }}>{error}</p>
              </div>
            )}

            <p className="mt-3 px-2 text-[13px] font-medium leading-relaxed" style={{ color: MUTED }}>
              {tr(
                'Nothing was charged. You can try again whenever you are ready.',
                'কোনো টাকা কাটা হয়নি। আপনি যেকোনো সময় আবার চেষ্টা করতে পারেন।',
              )}
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setError('')}
                className="flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-[13.5px] font-bold transition-transform active:scale-[0.98]"
                style={{ background: AMBER, color: ON_AMBER }}
              >
                <RefreshCw className="h-4 w-4" />
                {tr('Try again', 'আবার চেষ্টা করুন')}
              </button>
              <button
                type="button"
                onClick={() => setError('')}
                className="flex-1 rounded-full border py-3 text-[13.5px] font-bold transition-colors hover:bg-gray-50"
                style={{ borderColor: LINE, color: '#6E7A62' }}
              >
                {tr('Go back', 'ফিরে যান')}
              </button>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 border-t pt-5 text-[12px] font-semibold" style={{ borderColor: LINE_SOFT, color: MUTED }}>
              <ShieldCheck className="h-4 w-4" style={{ color: LEAF }} />
              {tr('Your details stay safe with us.', 'আপনার তথ্য আমাদের কাছে নিরাপদ।')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
