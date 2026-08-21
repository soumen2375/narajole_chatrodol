import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Donation, PaymentGateway } from '@/types';
import { useFmt, formatDate } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/ui/StatusBadge';
import { printReceipt, printCertificate } from '@/lib/receipt';
import { useAuth } from '@/context/AuthContext';
import { AdminGatewaySwitch } from '@/components/payment/GatewaySelector';
import { gatewayLabel, gatewayBadgeColor } from '@/lib/payments';
import {
  Search,
  Download,
  Plus,
  Trash2,
  Receipt,
  FileCheck,
  X,
  Repeat,
  RefreshCw,
} from 'lucide-react';

const RULE = '#e5dec9';
const SERIF = { fontFamily: '"Noto Serif Bengali", "Noto Sans Bengali", serif' };


interface DonationRow extends Omit<Donation, 'member'> {
  member?: { full_name: string; email: string } | null;
}

export default function AdminDonations() {
  const { member: me } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gatewayFilter, setGatewayFilter] = useState<string>('all');
  const [onlyRecurring, setOnlyRecurring] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const pad = (n: number) => String(n).padStart(2, '0');
  const dtFull = (s: string) => {
    const d = new Date(s);
    return `${fmt.date(s)} · ${fmt.num(pad(d.getHours()))}:${fmt.num(pad(d.getMinutes()))}`;
  };
  const fyOf = (s: string) => {
    const d = new Date(s);
    const y = d.getFullYear();
    return d.getMonth() + 1 >= 4 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
  };

  const [regs, setRegs] = useState({ reg80g: '', reg12a: '', orgPan: '' });
  const [campaigns, setCampaigns] = useState<{ id: string; name_en: string; name_bn: string }[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [funds, setFunds] = useState<{ id: string; name_en: string; name_bn: string }[]>([]);
  const [bankAccounts, setBankAccounts] = useState<{ id: string; account_name: string; account_number: string }[]>([]);

  // Manual donation modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    donor_name: '',
    donor_email: '',
    donor_phone: '',
    amount: '',
    purpose: tr('Donation', 'দান'),
    payment_method: 'Cash',
    is_anonymous: false,
    campaign_id: '',
    event_id: '',
    fund_id: '',
    bank_account_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    supabase.from('cswo_compliance').select('ckey,reg_number').then(({ data }) => {
      const m = Object.fromEntries(((data ?? []) as { ckey: string; reg_number: string }[]).map((r) => [r.ckey, r.reg_number]));
      setRegs({ reg80g: m['80g'] ?? '', reg12a: m['12a'] ?? '', orgPan: m['pan'] ?? '' });
    });
    supabase.from('cswo_campaigns').select('id,name_en,name_bn').eq('is_active', true).order('created_at', { ascending: false }).then(({ data }) => {
      setCampaigns((data ?? []) as { id: string; name_en: string; name_bn: string }[]);
    });
    supabase.from('cswo_events').select('id,title').order('event_date', { ascending: false }).then(({ data }) => {
      setEvents((data ?? []) as { id: string; title: string }[]);
    });
    supabase.from('cswo_funds').select('id,name_en,name_bn').eq('is_active', true).order('sort_order').then(({ data }) => {
      setFunds((data ?? []) as { id: string; name_en: string; name_bn: string }[]);
    });
    supabase.from('cswo_bank_accounts').select('id,account_name,account_number').eq('is_active', true).order('sort_order').then(({ data }) => {
      setBankAccounts((data ?? []) as { id: string; account_name: string; account_number: string }[]);
    });
  }, []);

  const setCampaign = async (id: string, campaignId: string) => {
    await supabase.from('cswo_donations').update({ campaign_id: campaignId || null }).eq('id', id);
    setDonations((ds) => ds.map((d) => (d.id === id ? { ...d, campaign_id: campaignId || null } : d)));
  };

  const setEvent = async (id: string, eventId: string) => {
    await supabase.from('cswo_donations').update({ event_id: eventId || null }).eq('id', id);
    setDonations((ds) => ds.map((d) => (d.id === id ? { ...d, event_id: eventId || null } : d)));
  };

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
    let q = supabase
      .from('cswo_donations')
      .select('*, member:cswo_members(full_name,email)')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (gatewayFilter !== 'all') q = q.eq('payment_gateway', gatewayFilter);
    if (onlyRecurring) q = q.eq('is_recurring', true);
    if (dateFrom) q = q.gte('created_at', dateFrom);
    if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');

    q.then(({ data }) => {
      setDonations((data ?? []) as DonationRow[]);
      setLoading(false);
    });
  }, [statusFilter, gatewayFilter, onlyRecurring, dateFrom, dateTo]);

  useEffect(() => {
    loadDonations();
  }, [loadDonations]);

  const saveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.donor_name.trim() && !form.is_anonymous) {
      setErr(tr('Donor name is required unless anonymous.', 'অজ্ঞাতনামা না হলে দাতার নাম আবশ্যক।'));
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setErr(tr('Please enter a valid amount.', 'সঠিক পরিমাণ লিখুন।'));
      return;
    }

    setSaving(true);
    setErr('');

    try {
      const receiptNumber = `CSWO-OFF-${Date.now().toString().slice(-8)}`;
      const payload = {
        donor_name: form.is_anonymous ? 'Anonymous' : form.donor_name.trim(),
        donor_email: form.donor_email.trim() || null,
        donor_phone: form.donor_phone.trim() || null,
        amount: Number(form.amount),
        currency: 'INR',
        purpose: form.purpose.trim() || 'General Donation',
        status: 'paid',
        payment_gateway: 'offline' as PaymentGateway,
        receipt_number: receiptNumber,
        is_anonymous: form.is_anonymous,
        campaign_id: form.campaign_id || null,
        event_id: form.event_id || null,
        fund_id: form.fund_id || null,
        bank_account_id: form.bank_account_id || null,
        member_id: me?.id || null,
      };

      const { error } = await supabase.from('cswo_donations').insert(payload);
      if (error) {
        setErr(error.message);
      } else {
        setShowAddModal(false);
        setForm({
          donor_name: '',
          donor_email: '',
          donor_phone: '',
          amount: '',
          purpose: tr('Donation', 'দান'),
          payment_method: 'Cash',
          is_anonymous: false,
          campaign_id: '',
          event_id: '',
          fund_id: '',
          bank_account_id: '',
        });
        loadDonations();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving';
      setErr(msg);
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
    if (!searchQuery.trim()) return donations;
    const q = searchQuery.toLowerCase();
    return donations.filter((d) =>
      (d.donor_name && d.donor_name.toLowerCase().includes(q)) ||
      (d.donor_email && d.donor_email.toLowerCase().includes(q)) ||
      (d.donor_phone && d.donor_phone.includes(q)) ||
      (d.receipt_number && d.receipt_number.toLowerCase().includes(q)) ||
      (d.purpose && d.purpose.toLowerCase().includes(q))
    );
  }, [donations, searchQuery]);

  const total = filteredDonations
    .filter((d) => d.status === 'paid')
    .reduce((s, d) => s + Number(d.amount), 0);

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

  const syncCashfreeStatus = async (d: DonationRow) => {
    setSyncingId(d.id);
    try {
      const orderId = d.cashfree_payment_id || `don_cf_${d.id}`;
      const res = await fetch('/api/cashfree-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(tr('Payment verified and marked as Paid!', 'পেমেন্ট সফলভাবে যাচাই হয়েছে!'));
        loadDonations();
      } else {
        alert(tr(`Status in Cashfree: ${data.order_status || 'NOT PAID'}`, `ক্যাশফ্রি স্ট্যাটাস: ${data.order_status || 'NOT PAID'}`));
      }
    } catch {
      alert(tr('Sync failed. Please check network.', 'যাচাই ব্যর্থ হয়েছে।'));
    } finally {
      setSyncingId(null);
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
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cswo-donations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative pb-10">
      {/* ── Page Header ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 font-bengali-serif">{t('a.donations')}</h1>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">
            {tr('Manage donor contributions, offline collections & certificates', 'অনুদান ব্যবস্থাপনা, অফলাইন অনুদান সংগ্রহ ও সার্টিফিকেট')}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm flex items-center gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            {tr('Manual Donation', 'ম্যানুয়াল দান যোগ')}
          </button>
          <button onClick={exportCSV} className="btn-secondary text-sm flex items-center gap-1.5 shadow-sm">
            <Download className="h-4 w-4" />
            {tr('Export CSV', 'CSV ডাউনলোড')}
          </button>
        </div>
      </div>

      {/* ── Top Grid: Stats & Gateway Configuration ── */}
      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:col-span-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-200/80 flex flex-col justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400">{tr('Total Raised', 'মোট সংগৃহীত')}</span>
            <p className="text-3xl font-black text-amber-600 mt-2">{fmt.money(total)}</p>
            <span className="text-[11px] text-stone-400 font-semibold mt-1">{filteredDonations.filter(d => d.status === 'paid').length} {tr('paid contributions', 'সফল অনুদান')}</span>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-200/80 flex flex-col justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400">{tr('Total Records', 'রেকর্ড সংখ্যা')}</span>
            <p className="text-3xl font-black text-blue-600 mt-2">{fmt.num(filteredDonations.length)}</p>
            <span className="text-[11px] text-stone-400 font-semibold mt-1">{tr('Matching current filters', 'নির্বাচিত ফিল্টার অনুযায়ী')}</span>
          </div>
        </div>
        <div className="lg:col-span-6">
          <AdminGatewaySwitch />
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-stone-200/80">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder={tr('Search by donor, email, phone, receipt...', 'দাতা, ইমেল, ফোন বা রসিদ দিয়ে খুঁজুন...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50/50 pl-10 pr-4 py-2 text-xs font-bold text-stone-800 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0c756f]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0c756f]"
        >
          <option value="all">{tr('All Statuses', 'সব অবস্থা')}</option>
          <option value="paid">{tr('Paid / Success', 'সফল')}</option>
          <option value="created">{tr('Pending', 'অপেক্ষমাণ')}</option>
          <option value="failed">{tr('Failed', 'ব্যর্থ')}</option>
        </select>

        {/* Gateway Filter */}
        <select
          value={gatewayFilter}
          onChange={(e) => setGatewayFilter(e.target.value)}
          className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0c756f]"
        >
          <option value="all">{tr('All Gateways', 'সব গেটওয়ে')}</option>
          <option value="cashfree">Cashfree</option>
          <option value="razorpay">Razorpay</option>
          <option value="offline">{tr('Offline', 'অফলাইন')}</option>
        </select>

        {/* Recurring Toggle */}
        <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer bg-stone-50 px-3 py-2 rounded-xl border border-stone-200">
          <input
            type="checkbox"
            checked={onlyRecurring}
            onChange={(e) => setOnlyRecurring(e.target.checked)}
            className="rounded text-[#0c756f]"
          />
          {tr('Recurring Monthly Only', 'শুধুমাত্র মাসিক অনুদান')}
        </label>

        {/* Date Filter */}
        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-stone-200 px-2.5 py-1.5 font-bold text-stone-700 bg-white"
          />
          <span className="text-stone-400 font-bold">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-stone-200 px-2.5 py-1.5 font-bold text-stone-700 bg-white"
          />
        </div>

        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="text-xs text-rose-600 font-bold hover:underline"
          >
            {tr('Clear dates', 'তারিখ মুছুন')}
          </button>
        )}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <TableSkeleton rows={6} />
      ) : filteredDonations.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center border border-stone-200 shadow-sm">
          <p className="text-sm font-bold text-stone-400">{tr('No donation records match the filters.', 'কোনো দান রেকর্ড পাওয়া যায়নি।')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm border border-stone-200/80">
          <table className="w-full text-xs text-left">
            <thead className="bg-stone-50/70 border-b border-stone-200/80 text-stone-600 font-bold">
              <tr>
                <th className="px-4 py-3.5">{t('common.date')}</th>
                <th className="px-4 py-3.5">{tr('Donor', 'দাতা')}</th>
                <th className="px-4 py-3.5">{t('common.amount')}</th>
                <th className="px-4 py-3.5">{tr('Gateway', 'গেটওয়ে')}</th>
                <th className="px-4 py-3.5">{t('donate.purpose')}</th>
                <th className="px-4 py-3.5">{tr('Campaign', 'ক্যাম্পেইন')}</th>
                <th className="px-4 py-3.5">{tr('Event', 'অনুষ্ঠান')}</th>
                <th className="px-4 py-3.5">{t('common.member')}</th>
                <th className="px-4 py-3.5">{t('common.status')}</th>
                <th className="px-4 py-3.5">{tr('Receipt No.', 'রসিদ নং')}</th>
                <th className="px-4 py-3.5 text-right">{tr('Actions', 'কার্যক্রম')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-semibold text-stone-800">
              {filteredDonations.map((d) => {
                const gw = d.payment_gateway || (d.cashfree_payment_id ? 'cashfree' : (d.razorpay_payment_id ? 'razorpay' : 'offline'));
                const col = gatewayBadgeColor(gw);
                return (
                  <tr key={d.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-stone-500">
                      {dtFull(d.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-bold text-stone-900">
                        {d.is_anonymous ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক') : (d.donor_name || '—')}
                        {d.is_recurring && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-black text-amber-800 uppercase">
                            {tr('Monthly', 'মাসিক')}
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] text-stone-400 font-medium">
                        {d.donor_email || d.donor_phone || ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-black text-stone-900 text-sm">
                      {fmt.money(Number(d.amount))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
                        style={{ background: `${col}15`, color: col }}
                      >
                        {gatewayLabel(gw)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-700 font-medium">{d.purpose || '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={d.campaign_id ?? ''}
                        onChange={(e) => setCampaign(d.id, e.target.value)}
                        className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-bold text-stone-700 focus:ring-1 focus:ring-[#0c756f]"
                      >
                        <option value="">—</option>
                        {campaigns.map((c) => <option key={c.id} value={c.id}>{lang === 'bn' ? c.name_bn : c.name_en}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={d.event_id ?? ''}
                        onChange={(e) => setEvent(d.id, e.target.value)}
                        className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-bold text-stone-700 focus:ring-1 focus:ring-[#0c756f]"
                      >
                        <option value="">—</option>
                        {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-stone-500 font-medium">
                      {d.member ? d.member.full_name : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-stone-500">
                      {d.receipt_number ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        {d.status !== 'paid' && (
                          <button
                            onClick={() => syncCashfreeStatus(d)}
                            disabled={syncingId === d.id}
                            title={tr('Verify & Sync with Cashfree', 'ক্যাশফ্রি থেকে যাচাই করুন')}
                            className="inline-flex items-center gap-1 font-bold text-sky-600 hover:text-sky-800 disabled:opacity-50"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${syncingId === d.id ? 'animate-spin' : ''}`} />
                            <span className="text-[11px]">{tr('Sync', 'সিঙ্ক')}</span>
                          </button>
                        )}
                        {d.status === 'paid' && (
                          <button
                            onClick={() => handleReceipt(d)}
                            title={tr('Download Receipt', 'রসিদ ডাউনলোড')}
                            className="inline-flex items-center gap-1 font-bold text-[#0c756f] hover:underline"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            {tr('Receipt', 'রসিদ')}
                          </button>
                        )}
                        {d.status === 'paid' && (
                          <button
                            onClick={() => handleCert(d)}
                            title={tr('80G Tax Certificate', '৮০জি সার্টিফিকেট')}
                            className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                          >
                            <FileCheck className="h-3.5 w-3.5" />
                            {tr('80G', '৮০জি')}
                          </button>
                        )}
                        <button
                          onClick={() => setRecurring(d.id, !d.is_recurring)}
                          title={d.is_recurring ? tr('Unmark Recurring', 'মাসিক বাতিল') : tr('Mark as Monthly', 'মাসিক চিহ্নিত')}
                          className={`p-1 transition-colors ${d.is_recurring ? 'text-amber-600' : 'text-stone-300 hover:text-stone-600'}`}
                        >
                          <Repeat className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteDonation(d.id)}
                          title={tr('Delete Record', 'রেকর্ড মুছুন')}
                          className="text-stone-400 hover:text-rose-600 transition-colors p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>

                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Manual Donation Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setShowAddModal(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-2xl bg-white text-gray-900 border border-stone-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b pb-3" style={{ borderColor: RULE }}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 border border-orange-200">
                  <Plus className="h-5 w-5" />
                </div>
                <h2 className="text-[17px] font-black text-stone-900 font-bengali-serif" style={SERIF}>
                  {tr('Record Offline / Manual Donation', 'অফলাইন / ম্যানুয়াল অনুদান রেকর্ড')}
                </h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {err && <p className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">{err}</p>}

            <form onSubmit={saveManual} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-700">{tr('Donor Name *', 'দাতার নাম *')}</label>
                  <input
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0c756f] disabled:opacity-50"
                    required={!form.is_anonymous}
                    disabled={form.is_anonymous}
                    placeholder={tr('Full name', 'পুরো নাম')}
                    value={form.is_anonymous ? 'Anonymous' : form.donor_name}
                    onChange={(e) => setForm((f) => ({ ...f, donor_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-700">{tr('Amount (₹) *', 'পরিমাণ (₹) *')}</label>
                  <input
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0c756f]"
                    type="number"
                    min={1}
                    required
                    placeholder={tr('Amount', 'পরিমাণ')}
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-700">{tr('Donor Email', 'দাতার ইমেল')}</label>
                  <input
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0c756f]"
                    type="email"
                    placeholder={tr('Email', 'ইমেল')}
                    value={form.donor_email}
                    onChange={(e) => setForm((f) => ({ ...f, donor_email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-700">{tr('Donor Phone', 'দাতার ফোন')}</label>
                  <input
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0c756f]"
                    placeholder={tr('Phone number', 'ফোন নম্বর')}
                    value={form.donor_phone}
                    onChange={(e) => setForm((f) => ({ ...f, donor_phone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-700">{tr('Payment Mode', 'পেমেন্ট মাধ্যম')}</label>
                  <select
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#0c756f]"
                    value={form.payment_method}
                    onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
                  >
                    <option value="Cash">{tr('Cash', 'নগদ')}</option>
                    <option value="Bank Transfer">{tr('Bank Transfer', 'ব্যাংক ট্রান্সফার')}</option>
                    <option value="Cheque">{tr('Cheque', 'চেক')}</option>
                    <option value="Direct UPI">{tr('Direct UPI', 'সরাসরি ইউপিআই')}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-700">{tr('Purpose / Project', 'উদ্দেশ্য / প্রকল্প')}</label>
                  <input
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0c756f]"
                    placeholder={tr('e.g. Relief Fund, Camp', 'যেমন: ত্রাণ ফান্ড, রক্তদান')}
                    value={form.purpose}
                    onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-700">{tr('Select Fund', 'ফান্ড সিলেক্ট করুন')}</label>
                  <select
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#0c756f]"
                    value={form.fund_id}
                    onChange={(e) => setForm((f) => ({ ...f, fund_id: e.target.value }))}
                  >
                    <option value="">—</option>
                    {funds.map((f) => <option key={f.id} value={f.id}>{lang === 'bn' ? f.name_bn : f.name_en}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-700">{tr('Deposit Bank Account', 'জমা হওয়া ব্যাংক')}</label>
                  <select
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#0c756f]"
                    value={form.bank_account_id}
                    onChange={(e) => setForm((f) => ({ ...f, bank_account_id: e.target.value }))}
                  >
                    <option value="">—</option>
                    {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.account_name} ({b.account_number.slice(-4)})</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_anon_man"
                  checked={form.is_anonymous}
                  onChange={(e) => setForm((f) => ({ ...f, is_anonymous: e.target.checked, donor_name: e.target.checked ? 'Anonymous' : '' }))}
                  className="h-4 w-4 rounded border-stone-300 text-[#0c756f]"
                />
                <label htmlFor="is_anon_man" className="text-xs font-bold text-stone-700 cursor-pointer">
                  {tr('Make Anonymous (Hide identity in public reports)', 'অজ্ঞাতনামা রাখুন')}
                </label>
              </div>

              <div className="mt-5 flex justify-end gap-3 border-t border-stone-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50"
                >
                  {tr('Cancel', 'বাতিল')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl px-5 py-2 text-xs font-extrabold text-white bg-[#0c756f] hover:bg-[#095a55] shadow-sm disabled:opacity-60"
                >
                  {saving ? tr('Saving…', 'সংরক্ষণ…') : tr('Save Donation', 'সংরক্ষণ করুন')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
