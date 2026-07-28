import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Donation } from '@/types';
import { useFmt, formatDate } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/ui/StatusBadge';
import { printReceipt, printCertificate } from '@/lib/receipt';
import { useAuth } from '@/context/AuthContext';

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
  const [onlyPaid, setOnlyPaid] = useState(true);
  const [onlyRecurring, setOnlyRecurring] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const pad = (n: number) => String(n).padStart(2, '0');
  const dtFull = (s: string) => { const d = new Date(s); return `${fmt.date(s)} · ${fmt.num(pad(d.getHours()))}:${fmt.num(pad(d.getMinutes()))}`; };
  const fyOf = (s: string) => { const d = new Date(s); const y = d.getFullYear(); return d.getMonth() + 1 >= 4 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`; };

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

  const handleCert = (d: DonationRow) => {
    printCertificate({
      receiptNumber: d.receipt_number ?? `DON-${d.id.slice(0, 8).toUpperCase()}`,
      name: d.is_anonymous ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক') : (d.donor_name ?? '—'),
      amount: Number(d.amount),
      date: formatDate(d.created_at, 'en'),
      fy: fyOf(d.created_at),
      purpose: d.purpose,
      paymentId: d.razorpay_payment_id,
      reg80g: regs.reg80g, reg12a: regs.reg12a, orgPan: regs.orgPan,
    }, lang);
  };

  const loadDonations = useCallback(() => {
    setLoading(true);
    let q = supabase
      .from('cswo_donations')
      .select('*, member:cswo_members(full_name,email)')
      .order('created_at', { ascending: false });
    if (onlyPaid) q = q.eq('status', 'paid');
    if (onlyRecurring) q = q.eq('is_recurring', true);
    if (dateFrom) q = q.gte('created_at', dateFrom);
    if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');
    q.then(({ data }) => {
      setDonations((data ?? []) as DonationRow[]);
      setLoading(false);
    });
  }, [onlyPaid, onlyRecurring, dateFrom, dateTo]);

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
      const payload = {
        donor_name: form.is_anonymous ? 'Anonymous' : form.donor_name.trim(),
        donor_email: form.donor_email.trim() || null,
        donor_phone: form.donor_phone.trim() || null,
        amount: Number(form.amount),
        currency: 'INR',
        purpose: form.purpose.trim() || 'General Donation',
        status: 'paid',
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
          is_anonymous: false,
          campaign_id: '',
          event_id: '',
          fund_id: '',
          bank_account_id: '',
        });
        loadDonations();
      }
    } catch (err: any) {
      setErr(err.message || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const setRecurring = async (id: string, val: boolean) => {
    await supabase.from('cswo_donations').update({ is_recurring: val }).eq('id', id);
    setDonations((ds) => ds.map((d) => (d.id === id ? { ...d, is_recurring: val } : d)));
  };

  const total = donations
    .filter((d) => d.status === 'paid')
    .reduce((s, d) => s + Number(d.amount), 0);

  const handleReceipt = (d: DonationRow) => {
    printReceipt(
      {
        receiptNumber: d.receipt_number ?? `DON-${d.id.slice(0, 8).toUpperCase()}`,
        type: 'donation',
        name: d.is_anonymous ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক') : (d.donor_name ?? '—'),
        email: d.donor_email,
        amount: Number(d.amount),
        date: formatDate(d.created_at, 'en'),
        purpose: d.purpose,
        paymentMethod: d.razorpay_payment_id ? 'Razorpay' : tr('Offline', 'অফলাইন'),
        paymentId: d.razorpay_payment_id,
      },
      lang,
    );
  };

  const exportCSV = () => {
    const header = [
      tr('Date', 'তারিখ'),
      tr('Donor', 'দাতা'),
      tr('Email', 'ইমেল'),
      tr('Amount (₹)', 'পরিমাণ (₹)'),
      tr('Purpose', 'উদ্দেশ্য'),
      tr('Status', 'অবস্থা'),
      tr('Receipt No.', 'রসিদ নং'),
      tr('Payment ID', 'পেমেন্ট আইডি'),
    ];
    const rows = donations.map((d) => [
      d.created_at.slice(0, 10),
      d.is_anonymous ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক') : (d.donor_name ?? ''),
      d.donor_email ?? '',
      d.amount,
      d.purpose ?? '',
      d.status,
      d.receipt_number ?? '',
      d.razorpay_payment_id ?? '',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cswo-donations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{t('a.donations')}</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">
            + {tr('Manual Donation', 'ম্যানুয়াল দান যোগ')}
          </button>
          <button onClick={exportCSV} className="btn-secondary text-sm">
            {tr('Export CSV', 'CSV ডাউনলোড')}
          </button>
        </div>
      </div>

      {/* stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">{tr('Total raised', 'মোট সংগৃহীত')}</p>
          <p className="text-2xl font-extrabold text-amber-600">{fmt.money(total)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">{tr('Records', 'রেকর্ড')}</p>
          <p className="text-2xl font-extrabold text-blue-600">{fmt.num(donations.length)}</p>
        </div>
      </div>

      {/* filters */}
      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={onlyPaid}
            onChange={(e) => setOnlyPaid(e.target.checked)}
          />
          {tr('Successful payments only', 'শুধুমাত্র সফল পেমেন্ট')}
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={onlyRecurring}
            onChange={(e) => setOnlyRecurring(e.target.checked)}
          />
          {tr('Recurring (monthly) only', 'শুধুমাত্র মাসিক')}
        </label>
        <div>
          <label className="mb-1 block text-xs text-gray-500">{tr('From', 'থেকে')}</label>
          <input
            type="date"
            className="input text-sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">{tr('To', 'পর্যন্ত')}</label>
          <input
            type="date"
            className="input text-sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="text-xs text-gray-500 hover:underline"
          >
            {tr('Clear dates', 'তারিখ মুছুন')}
          </button>
        )}
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : donations.length === 0 ? (
        <p className="text-gray-600">{tr('No donation records.', 'কোনো দান রেকর্ড নেই।')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">{t('common.date')}</th>
                <th className="px-4 py-3">{tr('Donor', 'দাতা')}</th>
                <th className="px-4 py-3">{t('common.amount')}</th>
                <th className="px-4 py-3">{t('donate.purpose')}</th>
                <th className="px-4 py-3">{tr('Campaign', 'ক্যাম্পেইন')}</th>
                <th className="px-4 py-3">{tr('Event', 'অনুষ্ঠান')}</th>
                <th className="px-4 py-3">{t('common.member')}</th>
                <th className="px-4 py-3">{t('common.status')}</th>
                <th className="px-4 py-3">{tr('Receipt No.', 'রসিদ নং')}</th>
                <th className="px-4 py-3">{tr('Actions', 'কার্যক্রম')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {donations.map((d) => (
                <tr key={d.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">{dtFull(d.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-medium text-gray-900">
                      {d.is_anonymous
                        ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক')
                        : d.donor_name || '—'}
                      {d.is_recurring && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                          {tr('Monthly', 'মাসিক')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {d.donor_email || d.donor_phone || ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{fmt.money(Number(d.amount))}</td>
                  <td className="px-4 py-3">{d.purpose || '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={d.campaign_id ?? ''}
                      onChange={(e) => setCampaign(d.id, e.target.value)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                    >
                      <option value="">—</option>
                      {campaigns.map((c) => <option key={c.id} value={c.id}>{lang === 'bn' ? c.name_bn : c.name_en}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={d.event_id ?? ''}
                      onChange={(e) => setEvent(d.id, e.target.value)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                    >
                      <option value="">—</option>
                      {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.member ? d.member.full_name : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {d.receipt_number ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {d.status === 'paid' && (
                        <button
                          onClick={() => handleReceipt(d)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {tr('Receipt', 'রসিদ')}
                        </button>
                      )}
                      {d.status === 'paid' && (
                        <button
                          onClick={() => handleCert(d)}
                          className="text-xs font-medium text-emerald-700 hover:underline"
                        >
                          {tr('80G Cert', '৮০জি')}
                        </button>
                      )}
                      <button
                        onClick={() => setRecurring(d.id, !d.is_recurring)}
                        className={`text-xs hover:underline ${d.is_recurring ? 'text-amber-600' : 'text-gray-500'}`}
                      >
                        {d.is_recurring ? tr('Unmark monthly', 'মাসিক বাতিল') : tr('Mark monthly', 'মাসিক চিহ্নিত')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[10px] p-6 shadow-xl bg-white text-gray-900" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-[18px] font-bold" style={{ fontFamily: '"Noto Serif Bengali", serif' }}>
              {tr('Add Manual Donation', 'ম্যানুয়াল দান যোগ করুন')}
            </h2>
            {err && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-[13px] text-red-600">{err}</p>}
            <form onSubmit={saveManual} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">{tr('Donor Name', 'দাতার নাম')}</label>
                  <input className="input" required={!form.is_anonymous} disabled={form.is_anonymous} placeholder={tr('Full name', 'পুরো নাম')} value={form.is_anonymous ? 'Anonymous' : form.donor_name} onChange={(e) => setForm((f) => ({ ...f, donor_name: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">{tr('Amount (₹) *', 'পরিমাণ (₹) *')}</label>
                  <input className="input" type="number" min={1} required placeholder={tr('Amount', 'পরিমাণ')} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">{tr('Donor Email', 'দাতার ইমেল')}</label>
                  <input className="input" type="email" placeholder={tr('Email', 'ইমেল')} value={form.donor_email} onChange={(e) => setForm((f) => ({ ...f, donor_email: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">{tr('Donor Phone', 'দাতার ফোন')}</label>
                  <input className="input" placeholder={tr('Phone number', 'ফোন নম্বর')} value={form.donor_phone} onChange={(e) => setForm((f) => ({ ...f, donor_phone: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">{tr('Purpose / Project', 'উদ্দেশ্য / প্রকল্প')}</label>
                  <input className="input" placeholder={tr('e.g., Blood Camp, Relief', 'যেমন: রক্তদান শিবির, ত্রাণ')} value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">{tr('Select Fund', 'ফান্ড সিলেক্ট করুন')}</label>
                  <select className="input" value={form.fund_id} onChange={(e) => setForm((f) => ({ ...f, fund_id: e.target.value }))}>
                    <option value="">—</option>
                    {funds.map((f) => <option key={f.id} value={f.id}>{lang === 'bn' ? f.name_bn : f.name_en}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">{tr('Select Bank Account', 'ব্যাংক অ্যাকাউন্ট')}</label>
                  <select className="input" value={form.bank_account_id} onChange={(e) => setForm((f) => ({ ...f, bank_account_id: e.target.value }))}>
                    <option value="">—</option>
                    {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.account_name} ({b.account_number.slice(-4)})</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">{tr('Select Campaign', 'ক্যাম্পেইন')}</label>
                  <select className="input" value={form.campaign_id} onChange={(e) => setForm((f) => ({ ...f, campaign_id: e.target.value }))}>
                    <option value="">—</option>
                    {campaigns.map((c) => <option key={c.id} value={c.id}>{lang === 'bn' ? c.name_bn : c.name_en}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">{tr('Select Event', 'অনুষ্ঠান')}</label>
                  <select className="input" value={form.event_id} onChange={(e) => setForm((f) => ({ ...f, event_id: e.target.value }))}>
                    <option value="">—</option>
                    {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="is_anon_man" checked={form.is_anonymous} onChange={(e) => setForm((f) => ({ ...f, is_anonymous: e.target.checked, donor_name: e.target.checked ? 'Anonymous' : '' }))} className="h-4 w-4 rounded border-gray-300 text-orange-600" />
                  <label htmlFor="is_anon_man" className="text-xs font-semibold text-gray-700 cursor-pointer">{tr('Make Anonymous', 'অজ্ঞাতনামা রাখুন')}</label>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-3 border-t pt-4" style={{ borderColor: 'var(--c-rule)' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="rounded-full border border-gray-300 px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50">{tr('Cancel', 'বাতিল')}</button>
                <button type="submit" disabled={saving} className="rounded-full px-5 py-2 text-[13px] font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-60">{saving ? tr('Saving…', 'সংরক্ষণ…') : tr('Save Donation', 'সংরক্ষণ করুন')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
