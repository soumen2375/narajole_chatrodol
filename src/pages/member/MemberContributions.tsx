import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { MonthlyContribution } from '@/types';
import { useFmt, formatDate } from '@/lib/format';

const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
import { useT } from '@/i18n';
import { startRazorpayPayment } from '@/lib/razorpay';
import { printReceipt } from '@/lib/receipt';
import {
  Calendar,
  AlertCircle,
  Wallet,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRight,
  Lock,
  ShieldCheck,
  Award,
  Heart,
  Download,
  Settings,
  Receipt,
  History,
  Sparkles,
  CreditCard,
  Check
} from 'lucide-react';

const DEFAULT_AMOUNT = 100;

const RULE   = '#e5dec9'; // Warm Border
const SERIF  = { fontFamily: '"Noto Serif Bengali", "Noto Sans Bengali", serif' };

// ─── Circular Progress for Year Summary ─────────────────────────────────────────
function CircularProgress({ pct, size = 110 }: { pct: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = '#10b981'; // Green color representing paid
  const remainingColor = '#ef4444'; // Red color representing due
  
  return (
    <div className="relative flex items-center justify-center select-none">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1ede4" strokeWidth={10} />
        {/* Due/remaining track (drawn full and then overwritten by paid) */}
        {pct < 100 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={remainingColor} strokeWidth={10} />
        )}
        {/* Paid track (drawn dynamically) */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-[19px] font-black text-gray-900 leading-none">{pct}%</span>
        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Completed</span>
      </div>
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function MonthCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-20 rounded bg-gray-200" />
        <div className="h-5 w-14 rounded-full bg-gray-200" />
      </div>
      <div className="h-10 w-full rounded-xl bg-gray-200" />
    </div>
  );
}

// ─── Pay-All info modal ───────────────────────────────────────────────────────
function PayAllModal({
  months,
  totalDue,
  amountPerMonth,
  onConfirm,
  onCancel,
  fmt,
  tr,
}: {
  months: string[];
  totalDue: number;
  amountPerMonth: number;
  onConfirm: () => void;
  onCancel: () => void;
  fmt: ReturnType<typeof useFmt>;
  tr: (en: string, bn: string) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border" style={{ borderColor: RULE }}>
        <div className="mb-2 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-[#0c756f]">
            <CreditCard className="h-5 w-5" />
          </div>
          <h3 className="text-[18px] font-bold text-gray-900">
            {tr('Pay All Pending Dues', 'সব বকেয়া চাঁদা পরিশোধ')}
          </h3>
        </div>
        <p className="mb-4 text-[13px] text-gray-500 font-semibold">
          {tr(`${months.length} month(s) · ${fmt.money(amountPerMonth)} each`, `${fmt.num(months.length)} মাস · প্রতিটি ${fmt.money(amountPerMonth)}`)}
        </p>

        {/* Month pills */}
        <div className="mb-4 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
          {months.map((nm) => (
            <span key={nm} className="rounded-full bg-rose-50 border border-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700">{nm}</span>
          ))}
        </div>

        {/* Info box */}
        <div className="mb-5 rounded-xl border border-emerald-150 bg-emerald-50/60 px-4 py-3 text-[12px] text-emerald-800 flex items-start gap-2">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <p className="font-bold mb-0.5">{tr('Single Secure Transaction', 'একক নিরাপদ লেনদেন')}</p>
            <p className="leading-relaxed opacity-95">
              {tr(
                `All pending dues (${months.length} months) will be charged in a single secure payment of ${fmt.money(totalDue)} via Razorpay.`,
                `সব বকেয়া চাঁদা (${months.length} মাস) একটি একক নিরাপদ পেমেন্টে মোট ${fmt.money(totalDue)} টাকা Razorpay-এর মাধ্যমে পরিশোধ করা হবে।`,
              )}
            </p>
          </div>
        </div>

        {/* Total */}
        <div className="mb-5 flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3 border border-rose-100">
          <span className="text-sm font-bold text-rose-750">{tr('Total to pay', 'মোট পরিশোধ')}</span>
          <span className="text-2xl font-black text-rose-750">{fmt.money(totalDue)}</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {tr('Cancel', 'বাতিল')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-655 py-2.5 text-sm font-extrabold text-white hover:bg-red-700 active:scale-[0.98] transition-all shadow-md"
          >
            {tr(`Pay ${fmt.money(totalDue)}`, `${fmt.money(totalDue)} পরিশোধ করুন`)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MemberContributions() {
  const { member } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [rows, setRows] = useState<Record<number, MonthlyContribution>>({});
  const [loading, setLoading] = useState(true);
  const [recentPayments, setRecentPayments] = useState<MonthlyContribution[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Per-month busy set (for individual payments)
  const [payingMonths, setPayingMonths] = useState<Set<number>>(new Set());
  // Auto Pay simulation
  const [autoPayActive, setAutoPayActive] = useState<boolean>(() => {
    return localStorage.getItem('cswo_auto_pay_active') === 'true';
  });
  // Pay-All modal visibility
  const [showPayAllModal, setShowPayAllModal] = useState(false);
  const [error, setError] = useState('');

  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const months = fmt.months();

  const pad = (n: number) => String(n).padStart(2, '0');
  const dtFull = (s: string) => {
    const d = new Date(s);
    return `${fmt.date(s)} · ${fmt.num(pad(d.getHours()))}:${fmt.num(pad(d.getMinutes()))}`;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ─── Load data ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    
    // Fetch contribution rows for selected year
    const { data: contribData } = await supabase
      .from('cswo_monthly_contributions')
      .select('*')
      .eq('member_id', member.id)
      .eq('year', year);
      
    const map: Record<number, MonthlyContribution> = {};
    for (const r of (contribData ?? []) as MonthlyContribution[]) map[r.month] = r;
    setRows(map);

    // Fetch 5 most recent payments across all years
    const { data: recentData } = await supabase
      .from('cswo_monthly_contributions')
      .select('*')
      .eq('member_id', member.id)
      .eq('status', 'paid')
      .order('paid_at', { ascending: false })
      .limit(5);
    
    setRecentPayments((recentData ?? []) as MonthlyContribution[]);
    setLoading(false);
  }, [member, year]);

  useEffect(() => { load(); }, [load]);

  // ─── Derived stats ───────────────────────────────────────────────────────
  const { paidCount, unpaidDueMonths, totalDue, totalPaid, pctCompleted } = useMemo(() => {
    const paidCount = Object.values(rows).filter((r) => r.status === 'paid').length;
    // All unpaid months in the year are considered "due"
    const unpaidDueMonths = Array.from({ length: 12 }, (_, i) => i + 1).filter(
      (mo) => rows[mo]?.status !== 'paid',
    );
    const totalDue = unpaidDueMonths.length * amount;
    const totalPaid = Object.values(rows)
      .filter((r) => r.status === 'paid')
      .reduce((s, r) => s + Number(r.amount), 0);
    const pctCompleted = Math.round((paidCount / 12) * 100);
    return { paidCount, unpaidDueMonths, totalDue, totalPaid, pctCompleted };
  }, [rows, amount]);

  const isValidAmount = amount >= 10;
  const anyBusy = payingMonths.size > 0;

  // ─── Toggle Auto Pay ─────────────────────────────────────────────────────
  const toggleAutoPay = () => {
    const nextState = !autoPayActive;
    setAutoPayActive(nextState);
    localStorage.setItem('cswo_auto_pay_active', String(nextState));
    if (nextState) {
      showToast(tr('Simulated Auto Pay enabled successfully!', 'অটো পে সফলভাবে সক্রিয় করা হয়েছে!'));
    } else {
      showToast(tr('Simulated Auto Pay disabled.', 'অটো পে নিষ্ক্রিয় করা হয়েছে।'));
    }
  };

  // ─── Pay single month ────────────────────────────────────────────────────
  const pay = async (month: number) => {
    if (anyBusy) return;
    setPayingMonths((prev) => new Set(prev).add(month));
    setError('');
    try {
      await startRazorpayPayment({
        action: 'create_contribution_order',
        amount: Number(amount),
        year,
        month,
        donorName: member?.full_name,
        donorEmail: member?.email,
        donorPhone: member?.phone ?? undefined,
        description: `Monthly dues — ${months[month - 1]} ${year}`,
      });
      
      setRows((prev) => ({
        ...prev,
        [month]: {
          ...(prev[month] ?? ({} as MonthlyContribution)),
          member_id: member?.id ?? '',
          year,
          month,
          amount,
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: 'online',
        } as MonthlyContribution,
      }));
      showToast(tr(`Payment for ${months[month - 1]} completed!`, `${months[month - 1]} মাসের পেমেন্ট সফল হয়েছে!`));
    } catch (err) {
      setError(err instanceof Error && err.message === 'CANCELLED' ? t('pay.cancelled') : t('pay.failed'));
    } finally {
      setPayingMonths((prev) => {
        const next = new Set(prev);
        next.delete(month);
        return next;
      });
      await load();
    }
  };

  // ─── Pay All: single transaction bulk payment ───────────────────────────
  const runPayAll = async () => {
    setShowPayAllModal(false);
    if (unpaidDueMonths.length === 0 || !isValidAmount) return;
    setError('');
    
    // Set all pending months as active/paying in local UI
    setPayingMonths(new Set(unpaidDueMonths));
    try {
      await startRazorpayPayment({
        action: 'create_contribution_order',
        amount: Number(amount),
        year,
        months: unpaidDueMonths, // Bulk list of months
        donorName: member?.full_name,
        donorEmail: member?.email,
        donorPhone: member?.phone ?? undefined,
        description: `${tr('All dues payment', 'সব বকেয়া পরিশোধ')} — ${unpaidDueMonths.length} ${tr('months', 'মাস')}`,
      });

      // Snackily update local rows for instant UI feedback
      setRows((prev) => {
        const next = { ...prev };
        for (const m of unpaidDueMonths) {
          next[m] = {
            ...(next[m] ?? ({} as MonthlyContribution)),
            member_id: member?.id ?? '',
            year,
            month: m,
            amount,
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_method: 'online',
          } as MonthlyContribution;
        }
        return next;
      });

      showToast(tr('All pending monthly dues paid successfully!', 'সব বকেয়া চাঁদা সফলভাবে পরিশোধ করা হয়েছে!'));
    } catch (err) {
      setError(err instanceof Error && err.message === 'CANCELLED' ? t('pay.cancelled') : t('pay.failed'));
    } finally {
      setPayingMonths(new Set());
      await load(); // sync receipts
    }
  };

  // ─── Export CSV Report ────────────────────────────────────────────────────
  const exportCSV = () => {
    const tr = (en: string, _bn: string) => en;
    const header = [tr('Month', 'মাস'), tr('Status', 'অবস্থা'), tr('Amount (₹)', 'পরিমাণ (₹)'), tr('Paid At', 'পরিশোধের তারিখ'), tr('Method', 'পদ্ধতি'), tr('Receipt/Order ID', 'রসিদ/অর্ডার আইডি')];
    const dataRows = monthsEn.map((nm, i) => {
      const month = i + 1;
      const row = rows[month];
      const paid = row?.status === 'paid';
      return [
        nm,
        paid ? tr('Paid', 'পরিশোধিত') : tr('Due', 'বকেয়া'),
        paid ? String(row.amount) : String(amount),
        paid && row.paid_at ? new Date(row.paid_at).toLocaleString('en-US') : '—',
        paid && row.payment_method ? row.payment_method : '—',
        paid && (row.receipt_number || row.razorpay_order_id) ? (row.receipt_number || row.razorpay_order_id) : '—'
      ];
    });
    const csv = [header, ...dataRows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-donations-${year}-${member?.full_name?.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    const { lang } = useT();
    const currentTr = (en: string, bn: string) => (lang === 'en' ? en : bn);
    showToast(currentTr('Report downloaded successfully!', 'রিপোর্ট সফলভাবে ডাউনলোড করা হয়েছে!'));
  };

  const years = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="relative pb-10">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-2xl bg-gray-900 px-5 py-3 text-[13px] font-bold text-white shadow-xl animate-fade-in border border-gray-800">
          <Check className="h-4.5 w-4.5 text-emerald-400 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Pay-All confirmation modal */}
      {showPayAllModal && (
        <PayAllModal
          months={unpaidDueMonths.map((mo) => months[mo - 1])}
          totalDue={totalDue}
          amountPerMonth={amount}
          onConfirm={runPayAll}
          onCancel={() => setShowPayAllModal(false)}
          fmt={fmt}
          tr={tr}
        />
      )}

      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b pb-6" style={{ borderColor: RULE }}>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[#0c756f] border border-emerald-100 shadow-sm shrink-0">
            <Heart className="h-6 w-6 fill-[#0c756f]/10" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-950 font-bengali-serif" style={SERIF}>
              {t('m.contributions')}
            </h1>
            <p className="text-[13px] text-gray-500 font-bold mt-0.5">
              {tr('Track your monthly contributions and help us build a better society.', 'আপনার মাসিক অনুদান ট্র্যাক করুন এবং আমাদের সমাজ গড়তে সাহায্য করুন।')}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          <select 
            className="rounded-xl border px-3 py-2 text-sm font-bold text-gray-700 bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0c756f] shadow-sm transition-all"
            style={{ borderColor: RULE }}
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {fmt.num(y)}
              </option>
            ))}
          </select>
          
          {totalDue > 0 && (
            <button
              onClick={() => setShowPayAllModal(true)}
              disabled={anyBusy || !isValidAmount}
              className="flex items-center gap-2 rounded-xl bg-[#0c756f] px-5 py-2 text-sm font-extrabold text-white shadow hover:bg-[#0a625d] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard className="h-4.5 w-4.5" />
              {tr(`Pay All Due (${fmt.money(totalDue)})`, `সব বকেয়া পরিশোধ (${fmt.money(totalDue)})`)}
            </button>
          )}
          
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-xl border px-5 py-2 text-sm font-extrabold text-gray-700 bg-white hover:bg-gray-50 active:scale-[0.98] shadow-sm transition-all"
            style={{ borderColor: RULE }}
          >
            <Download className="h-4.5 w-4.5 text-gray-500" />
            {tr('Download Report', 'রিপোর্ট ডাউনলোড')}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3.5 text-sm text-red-805 border border-red-200 shadow-sm animate-shake">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-650 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">{error}</p>
            <button onClick={() => setError('')} className="mt-1 text-xs font-bold text-red-650 hover:underline">
              {tr('Dismiss', 'বন্ধ করুন')}
            </button>
          </div>
        </div>
      )}

      {/* ── Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (Stats + Month cards + Bottom Banner) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Metrics row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Total Paid Card */}
            <div className="rounded-2xl bg-white p-5 border shadow-sm flex flex-col justify-between relative overflow-hidden" style={{ borderColor: RULE }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{tr('Total Paid', 'মোট পরিশোধিত')}</p>
                  <p className="text-2xl font-black text-gray-950 mt-1">
                    {fmt.num(paidCount)} <span className="text-xs font-bold text-gray-400">/ 12</span>
                  </p>
                  <p className="text-[11px] text-gray-400 font-bold mt-0.5">{tr('Months', 'মাস')}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600 border border-green-100">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${(paidCount / 12) * 100}%` }} />
              </div>
            </div>

            {/* Total Due Card */}
            <div className="rounded-2xl bg-white p-5 border shadow-sm flex flex-col justify-between relative overflow-hidden" style={{ borderColor: RULE }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{tr('Total Due', 'মোট বকেয়া')}</p>
                  <p className="text-2xl font-black text-red-650 mt-1">
                    {fmt.money(totalDue)}
                  </p>
                  <p className="text-[11px] text-red-400 font-bold mt-0.5">{fmt.num(unpaidDueMonths.length)} {tr('months pending', 'মাস বাকি')}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-red-650 border border-rose-100">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${(unpaidDueMonths.length / 12) * 100}%` }} />
              </div>
            </div>

            {/* Total Contributed Card */}
            <div className="rounded-2xl bg-white p-5 border shadow-sm flex flex-col justify-between relative overflow-hidden" style={{ borderColor: RULE }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{tr('Total Contributed', 'মোট অবদান')}</p>
                  <p className="text-2xl font-black text-blue-700 mt-1">
                    {fmt.money(totalPaid)}
                  </p>
                  <p className="text-[11px] text-blue-400 font-bold mt-0.5">{tr('This year', 'এই বছর')}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${(paidCount / 12) * 100}%` }} />
              </div>
            </div>

            {/* Auto Pay Card */}
            <div className="rounded-2xl bg-white p-5 border shadow-sm flex flex-col justify-between relative overflow-hidden" style={{ borderColor: RULE }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{tr('Auto Pay', 'অটো পে')}</p>
                  <p className={`text-xl font-black mt-1 ${autoPayActive ? 'text-green-700' : 'text-amber-750'}`}>
                    {autoPayActive ? tr('Active', 'সক্রিয়') : tr('Inactive', 'নিষ্ক্রিয়')}
                  </p>
                  <button 
                    onClick={toggleAutoPay} 
                    className="text-[11px] text-gray-400 hover:text-[#0c756f] font-bold mt-1 inline-block underline"
                  >
                    {autoPayActive ? tr('Disable auto pay', 'নিষ্ক্রিয় করুন') : tr('Enable auto pay', 'সক্রিয় করুন')}
                  </button>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <RefreshCw className={`h-5 w-5 ${autoPayActive ? 'animate-spin-slow' : ''}`} />
                </div>
              </div>
              <div className="mt-4 w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${autoPayActive ? 'bg-green-600' : 'bg-amber-500'}`} style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          {/* Dues configuration setting card */}
          <div className="bg-white rounded-2xl p-4 border shadow-sm flex items-center justify-between" style={{ borderColor: RULE }}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 border border-gray-150 text-gray-400">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-gray-800">{tr('Monthly Dues Config', 'মাসিক চাঁদা নির্ধারণ')}</p>
                <p className="text-[11px] text-gray-400 font-semibold">{tr('Adjust the default monthly amount as required.', 'প্রয়োজনানুযায়ী মাসিক চাঁদার পরিমাণ পরিবর্তন করুন।')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-500">₹</span>
              <input
                type="number" 
                min={10} 
                className="w-24 rounded-xl border px-3 py-1.5 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0c756f] text-center"
                style={{ borderColor: RULE }}
                value={amount}
                onChange={(e) => { const v = Number(e.target.value); setAmount(Number.isNaN(v) ? 0 : v); }}
              />
            </div>
          </div>

          {/* Contribution Overview month grid section */}
          <div>
            <div className="mb-4 flex items-center justify-between border-b pb-2" style={{ borderColor: RULE }}>
              <h2 className="text-md font-bold text-gray-900">{tr('Your Contribution Overview', 'আপনার অবদান পর্যালোচনা')}</h2>
              <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                {tr('Selected Year Dues', 'নির্বাচিত বছরের চাঁদা')}
              </span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 12 }).map((_, i) => <MonthCardSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {months.map((nm, i) => {
                  const month = i + 1;
                  const row = rows[month];
                  const paid = row?.status === 'paid';
                  const isBusy = payingMonths.has(month);

                  if (paid) {
                    // ── Paid Month Card ──
                    return (
                      <div key={month} className="rounded-2xl border bg-gradient-to-br from-green-50/50 to-emerald-50/30 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-[180px]" style={{ borderColor: '#bbf7d0' }}>
                        <div>
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 text-[14px]">{nm}</h3>
                            <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-extrabold text-white uppercase tracking-wider">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                              {tr('Paid', 'পরিশোধিত')}
                            </span>
                          </div>
                          
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                            <p className="text-[20px] font-black text-emerald-800 leading-none">
                              {fmt.money(Number(row.amount))}
                            </p>
                          </div>
                          {row.paid_at && (
                            <p className="text-[10px] text-gray-400 font-bold mt-2">
                              {tr(`Paid on ${fmt.date(row.paid_at)}`, `${fmt.date(row.paid_at)} এ পরিশোধিত`)}
                            </p>
                          )}
                        </div>

                        {row.receipt_number && (
                          <button
                            onClick={() =>
                              printReceipt(
                                {
                                  receiptNumber: row.receipt_number!,
                                  type: 'contribution',
                                  name: member?.full_name ?? '',
                                  email: member?.email,
                                  amount: Number(row.amount),
                                  date: row.paid_at ? formatDate(row.paid_at, 'en') : '',
                                  month: monthsEn[i],
                                  year,
                                  paymentMethod: row.payment_method ?? undefined,
                                  paymentId: row.razorpay_payment_id ?? undefined,
                                },
                                lang,
                              )
                            }
                            className="mt-3 flex items-center gap-1.5 text-[11px] font-extrabold text-[#0c756f] hover:underline transition-all active:scale-95 text-left w-fit select-none"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {tr('Receipt', 'রসিদ')}
                          </button>
                        )}
                      </div>
                    );
                  }

                  if (isBusy) {
                    // ── Processing Month Card ──
                    return (
                      <div key={month} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm animate-pulse flex flex-col justify-between h-[180px]">
                        <div>
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 text-[14px]">{nm}</h3>
                            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1">
                              <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                              {tr('Processing', 'চলছে')}
                            </span>
                          </div>
                          <div className="mt-4 flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                            <p className="text-[12px] text-amber-700 font-bold">{tr('Opening Razorpay…', 'পেমেন্ট খুলছে…')}</p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // ── Unpaid / Due Month Card ──
                  return (
                    <div key={month} className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-[180px]" style={{ borderColor: RULE }}>
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-gray-900 text-[14px]">{nm}</h3>
                          <span className="rounded-full bg-rose-50 border border-rose-100 px-2 py-0.5 text-[9px] font-extrabold text-rose-700 uppercase tracking-wider">
                            {tr('Due', 'বকেয়া')}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                            <Clock className="h-4 w-4" />
                          </div>
                          <p className="text-[18px] font-black text-gray-900 leading-none">
                            {fmt.money(amount)}
                          </p>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold mt-2">
                          {tr('Dues pending', 'চাঁদা বকেয়া রয়েছে')}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => pay(month)}
                        disabled={anyBusy || !isValidAmount}
                        className="mt-3 w-full rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold py-2 text-[12.5px] transition-all flex items-center justify-center gap-1 select-none active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {tr('Pay Now', 'পরিশোধ করুন')}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Thank You Banner */}
          <div className="rounded-2xl border bg-gradient-to-r from-emerald-50/50 to-green-50/30 p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shadow-sm relative overflow-hidden" style={{ borderColor: '#bbf7d0' }}>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-[#0c756f] border border-emerald-200 shrink-0">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="font-extrabold text-gray-900 text-[14px]">
                  {tr('Thank you for being a part of our mission.', 'আমাদের মিশনের অংশ হওয়ার জন্য আপনাকে ধন্যবাদ।')}
                </p>
                <p className="text-[12px] text-gray-500 font-semibold mt-0.5">
                  {tr('Your small monthly contribution brings a big change in someone\'s life.', 'আপনার ক্ষুদ্র মাসিক চাঁদা অন্যের জীবনে বড় পরিবর্তন আনতে সাহায্য করে।')}
                </p>
              </div>
            </div>
            
            <button
              onClick={toggleAutoPay}
              className="shrink-0 rounded-xl border border-[#0c756f]/30 hover:border-[#0c756f] bg-white px-5 py-2.5 text-[12.5px] font-bold text-[#0c756f] shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 select-none"
            >
              <Settings className="h-4 w-4" />
              {tr('Set Auto Pay', 'অটো পে চালু করুন')}
            </button>
          </div>
        </div>

        {/* Sidebar Column (Year Summary, Quick Actions, Recent Payments) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Year Summary Card */}
          <div className="rounded-2xl bg-white p-5 border shadow-sm" style={{ borderColor: RULE }}>
            <h3 className="text-sm font-bold text-gray-900 mb-4 border-b pb-2 select-none" style={{ borderColor: RULE }}>
              {tr('Year Summary', 'বাৎসরিক সারসংক্ষেপ')}
            </h3>
            <div className="flex items-center gap-5">
              <CircularProgress pct={pctCompleted} />
              
              <div className="flex-1 flex flex-col gap-2 text-xs select-none">
                <div className="flex items-center justify-between font-bold text-gray-800">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span>{tr('Paid', 'পরিশোধিত')}</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-black text-gray-900">{fmt.money(totalPaid)}</span>
                    <span className="text-[10px] text-gray-400 font-bold">{fmt.num(paidCount)} {tr('months', 'মাস')}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between font-bold text-gray-800 border-t pt-2" style={{ borderColor: '#f1ede4' }}>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span>{tr('Due', 'বকেয়া')}</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-black text-red-650">{fmt.money(totalDue)}</span>
                    <span className="text-[10px] text-red-400 font-bold">{fmt.num(unpaidDueMonths.length)} {tr('months', 'মাস')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between font-black text-gray-900 border-t pt-2 text-[13px]" style={{ borderColor: '#e5dec9' }}>
                  <span>{tr('Total Expected', 'সর্বমোট প্রত্যাশিত')}</span>
                  <span>{fmt.money(12 * amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="rounded-2xl bg-white p-5 border shadow-sm" style={{ borderColor: RULE }}>
            <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-2 select-none" style={{ borderColor: RULE }}>
              {tr('Quick Actions', 'দ্রুত সমাধান')}
            </h3>
            <div className="flex flex-col gap-2.5">
              {totalDue > 0 ? (
                <button
                  onClick={() => setShowPayAllModal(true)}
                  disabled={anyBusy || !isValidAmount}
                  className="flex items-center gap-3 rounded-xl border border-rose-100 hover:bg-rose-50/50 p-3 text-left transition-all active:scale-[0.98] select-none"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 shrink-0">
                    <Heart className="h-4.5 w-4.5 fill-rose-100" />
                  </div>
                  <div>
                    <p className="text-[12.5px] font-extrabold text-gray-850">{tr('Pay All Due', 'সব বকেয়া পরিশোধ')}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{tr('Clear all pending months', 'সব বকেয়া মাস ক্লিয়ার করুন')}</p>
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/40 p-3 text-left opacity-60 cursor-not-allowed select-none">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-400 shrink-0">
                    <CheckCircle2 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[12.5px] font-bold text-gray-500">{tr('All Paid Up!', 'সব পরিশোধিত!')}</p>
                    <p className="text-[10px] text-gray-400 font-semibold">{tr('No dues remaining this year', 'এই বছর কোনো বকেয়া নেই')}</p>
                  </div>
                </div>
              )}

              <button
                onClick={toggleAutoPay}
                className="flex items-center gap-3 rounded-xl border border-green-150 hover:bg-green-50/40 p-3 text-left transition-all active:scale-[0.98] select-none"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600 shrink-0">
                  <RefreshCw className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[12.5px] font-extrabold text-gray-850">{tr('Set Auto Pay', 'অটো পে সক্রিয়করণ')}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{tr('Never miss a contribution', 'অনুদান কখনো মিস করবেন না')}</p>
                </div>
              </button>

              <button
                onClick={exportCSV}
                className="flex items-center gap-3 rounded-xl border border-blue-100 hover:bg-blue-50/30 p-3 text-left transition-all active:scale-[0.98] select-none"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <Receipt className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[12.5px] font-extrabold text-gray-850">{tr('Payment History', 'পেমেন্ট ইতিহাস')}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{tr('View all your payments', 'সব পেমেন্ট বিবরণ দেখুন')}</p>
                </div>
              </button>

              {recentPayments.length > 0 && recentPayments[0].receipt_number ? (
                <button
                  onClick={() => {
                    const r = recentPayments[0];
                    printReceipt(
                      {
                        receiptNumber: r.receipt_number!,
                        type: 'contribution',
                        name: member?.full_name ?? '',
                        email: member?.email,
                        amount: Number(r.amount),
                        date: r.paid_at ? formatDate(r.paid_at, 'en') : '',
                        month: monthsEn[r.month - 1],
                        year: r.year,
                        paymentMethod: r.payment_method ?? undefined,
                        paymentId: r.razorpay_payment_id ?? undefined,
                      },
                      lang,
                    );
                  }}
                  className="flex items-center gap-3 rounded-xl border border-purple-100 hover:bg-purple-50/30 p-3 text-left transition-all active:scale-[0.98] select-none"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 shrink-0">
                    <Download className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[12.5px] font-extrabold text-gray-850">{tr('Download Receipt', 'রসিদ ডাউনলোড')}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{tr('Get latest payment receipt', 'সবশেষ পেমেন্ট রসিদ নিন')}</p>
                  </div>
                </button>
              ) : null}
            </div>
          </div>

          {/* Recent Payments Card */}
          <div className="rounded-2xl bg-white p-5 border shadow-sm" style={{ borderColor: RULE }}>
            <div className="flex items-center justify-between border-b pb-2 mb-3 select-none" style={{ borderColor: RULE }}>
              <h3 className="text-sm font-bold text-gray-900">
                {tr('Recent Payments', 'সাম্প্রতিক পেমেন্ট')}
              </h3>
              <button onClick={exportCSV} className="text-[11px] text-[#0c756f] hover:underline font-bold">
                {tr('View all', 'সব দেখুন')}
              </button>
            </div>
            
            {recentPayments.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 font-semibold text-center select-none">
                {tr('No recent payments found.', 'কোনো সাম্প্রতিক পেমেন্ট পাওয়া যায়নি।')}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {recentPayments.map((rp) => (
                  <div key={rp.id} className="flex items-center justify-between text-xs py-2 border-b last:border-b-0" style={{ borderColor: '#f1ede4' }}>
                    <div className="select-none">
                      <p className="font-extrabold text-gray-900">
                        {fmt.money(Number(rp.amount))} <span className="text-gray-300 font-normal">·</span> {months[rp.month - 1]} {rp.year}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                        {rp.paid_at ? dtFull(rp.paid_at) : ''} · {rp.payment_method === 'razorpay' ? 'Razorpay' : rp.payment_method || 'Online'}
                      </p>
                    </div>
                    
                    <span className="rounded-full bg-green-50 border border-green-100 px-2.5 py-0.5 text-[10px] font-extrabold text-green-700 uppercase tracking-wide shrink-0 select-none">
                      {tr('Success', 'সফল')}
                    </span>
                  </div>
                ))}
                
                <button
                  onClick={exportCSV}
                  className="mt-2 text-center text-[11px] text-gray-400 font-bold hover:text-[#0c756f] flex items-center justify-center gap-1 select-none"
                >
                  <History className="h-3.5 w-3.5" />
                  {tr('See full history', 'সম্পূর্ণ ইতিহাস দেখুন')}
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Feature Highlights (badges) ── */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t select-none" style={{ borderColor: RULE }}>
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 border shadow-sm" style={{ borderColor: RULE }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[12.5px] font-extrabold text-gray-800">{tr('Secure Payments', 'নিরাপদ পেমেন্ট')}</p>
            <p className="text-[10px] text-gray-400 font-semibold">{tr('100% secure & encrypted payments', '১০০% নিরাপদ ও এনক্রিপ্টেড পেমেন্ট')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 border shadow-sm" style={{ borderColor: RULE }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600 border border-green-100 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[12.5px] font-extrabold text-gray-800">{tr('Trusted Organization', 'বিশ্বস্ত সংস্থা')}</p>
            <p className="text-[10px] text-gray-400 font-semibold">{tr('Your money is used transparently', 'আপনার ফান্ডের স্বচ্ছ ব্যবহার নিশ্চিত')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 border shadow-sm" style={{ borderColor: RULE }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[12.5px] font-extrabold text-gray-800">{tr('Tax Benefits', 'কর ছাড়ের সুবিধা')}</p>
            <p className="text-[10px] text-gray-400 font-semibold">{tr('Eligible for 80G tax exemption', '৮০জি ইনকাম ট্যাক্স ছাড়ের যোগ্য')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 border shadow-sm" style={{ borderColor: RULE }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
            <Heart className="h-5 w-5 fill-rose-50" />
          </div>
          <div>
            <p className="text-[12.5px] font-extrabold text-gray-850">{tr('Make Impact', 'প্রভাব সৃষ্টি করুন')}</p>
            <p className="text-[10px] text-gray-400 font-semibold">{tr('Real change in real lives', 'বাস্তব জীবনে বাস্তব পরিবর্তন আনুন')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
