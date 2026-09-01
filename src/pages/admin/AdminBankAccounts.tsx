import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaPlus, FaBuildingColumns, FaWallet, FaTrash, FaPen } from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';
import type { CswoBankAccount, CswoBankTransaction, BankAccountType, LedgerDirection } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';

const INK = '#1c1a15';
const INK2 = '#5b5445';
const SOFT = '#7a7568';
const MUTED = '#a79f8c';
const RULE = '#f0e9d9';
const FIELD = '#ede5d3';
const BRAND = '#b93a08';
const BRAND_GRAD = 'linear-gradient(180deg,#d24a12,#b93a08)';
const GREEN = '#2f6b3f';
const PAPER = '#fffdf8';
const CREAM = '#fbf7ec';

// Bengali needs a serif that carries both scripts, so the display face stays
// Noto Serif Bengali rather than the Latin-only serif the mockup used.
const SERIF = '"Noto Serif Bengali", serif';

const ACCT_TYPES: BankAccountType[] = ['savings', 'current', 'cash', 'other'];

type AcctForm = {
  label: string; bank_name: string; account_name: string; account_number: string;
  ifsc: string; branch: string; account_type: BankAccountType; opening_balance: string; statement_balance: string; is_active: boolean; note: string;
};
const EMPTY_ACCT: AcctForm = { label: '', bank_name: '', account_name: '', account_number: '', ifsc: '', branch: '', account_type: 'savings', opening_balance: '', statement_balance: '', is_active: true, note: '' };

// Every statement line is posted by the ledger sync triggers (migrations
// 0034/0058), which stamp a machine reference: `DON-<uuid>`, `EXP-<uuid>`, etc.
// The prefix is the only thing that tells us which ledger record a line mirrors.
const SYSTEM_REF = /^(DON|CON|EXP|PAY)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SOURCE_BY_PREFIX = { DON: 'donation', CON: 'contribution', EXP: 'expense', PAY: 'payroll' } as const;
type TxnSource = 'other' | (typeof SOURCE_BY_PREFIX)[keyof typeof SOURCE_BY_PREFIX];
const SOURCES: TxnSource[] = ['donation', 'contribution', 'expense', 'payroll', 'other'];

function sourceOf(t: CswoBankTransaction): TxnSource {
  const m = SYSTEM_REF.exec(t.reference || '');
  if (!m) return 'other';
  return SOURCE_BY_PREFIX[m[1].toUpperCase() as keyof typeof SOURCE_BY_PREFIX];
}

type Filters = { from: string; to: string; direction: 'all' | LedgerDirection; source: 'all' | TxnSource };
const EMPTY_FILTERS: Filters = { from: '', to: '', direction: 'all', source: 'all' };

const GRID = '112px minmax(0,1fr) 104px 96px 108px 108px';

export default function AdminBankAccounts() {
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [accounts, setAccounts] = useState<CswoBankAccount[]>([]);
  // `is_default` arrives with migration 0063. Until it does, hide the control
  // rather than offering a button whose only outcome is an error.
  const defaultsSupported = accounts.some((a) => a.is_default !== undefined);
  const [txns, setTxns] = useState<CswoBankTransaction[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showAcct, setShowAcct] = useState(false);
  const [editingAcct, setEditingAcct] = useState<CswoBankAccount | null>(null);
  const [acctForm, setAcctForm] = useState<AcctForm>(EMPTY_ACCT);
  const [savingAcct, setSavingAcct] = useState(false);
  const [acctErr, setAcctErr] = useState('');

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const load = useCallback(async () => {
    setLoading(true);
    const [aR, tR] = await Promise.all([
      supabase.from('cswo_bank_accounts').select('*').order('sort_order').order('created_at'),
      supabase.from('cswo_bank_transactions').select('*').order('txn_date', { ascending: false }).order('created_at', { ascending: false }),
    ]);
    const accs = (aR.data ?? []) as CswoBankAccount[];
    setAccounts(accs);
    setTxns((tR.data ?? []) as CswoBankTransaction[]);
    setSelectedId((cur) => cur && accs.some((a) => a.id === cur) ? cur : (accs[0]?.id ?? null));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const balanceOf = useCallback((acc: CswoBankAccount) => {
    const t = txns.filter((x) => x.account_id === acc.id);
    const cr = t.filter((x) => x.direction === 'credit').reduce((s, x) => s + Number(x.amount), 0);
    const db = t.filter((x) => x.direction === 'debit').reduce((s, x) => s + Number(x.amount), 0);
    return Number(acc.opening_balance) + cr - db;
  }, [txns]);

  const selected = accounts.find((a) => a.id === selectedId) ?? null;

  const selTxns = useMemo(() => {
    let t = txns.filter((x) => x.account_id === selectedId);
    if (filters.from) t = t.filter((x) => x.txn_date >= filters.from);
    if (filters.to) t = t.filter((x) => x.txn_date <= filters.to);
    if (filters.direction !== 'all') t = t.filter((x) => x.direction === filters.direction);
    if (filters.source !== 'all') t = t.filter((x) => sourceOf(x) === filters.source);
    return t;
  }, [txns, selectedId, filters]);

  // Totals for what the filters actually show, so a narrowed view still adds up.
  const filteredTotals = useMemo(() => ({
    cr: selTxns.filter((x) => x.direction === 'credit').reduce((s, x) => s + Number(x.amount), 0),
    db: selTxns.filter((x) => x.direction === 'debit').reduce((s, x) => s + Number(x.amount), 0),
  }), [selTxns]);
  const filtersActive = filters.from !== '' || filters.to !== '' || filters.direction !== 'all' || filters.source !== 'all';

  const selSummary = useMemo(() => {
    const t = txns.filter((x) => x.account_id === selectedId);
    const cr = t.filter((x) => x.direction === 'credit').reduce((s, x) => s + Number(x.amount), 0);
    const db = t.filter((x) => x.direction === 'debit').reduce((s, x) => s + Number(x.amount), 0);
    return { cr, db, balance: selected ? Number(selected.opening_balance) + cr - db : 0 };
  }, [txns, selectedId, selected]);

  const mask = (n: string) => (n && n.length > 4 ? `•••• ${n.slice(-4)}` : n || '—');
  const typeLabel = (t: BankAccountType) => ({ savings: tr('Savings', 'সঞ্চয়'), current: tr('Current', 'চলতি'), cash: tr('Cash', 'নগদ'), other: tr('Other', 'অন্যান্য') }[t]);
  const sourceLabel = (s: TxnSource) => ({
    donation: tr('Donation', 'অনুদান'),
    contribution: tr('Monthly dues', 'মাসিক চাঁদা'),
    expense: tr('Expense', 'ব্যয়'),
    payroll: tr('Payroll', 'বেতন'),
    other: tr('Other', 'অন্যান্য'),
  }[s]);
  const sourceTone = (s: TxnSource) => (
    s === 'donation' || s === 'contribution'
      ? { background: '#eaf3ec', color: GREEN }
      : s === 'other'
        ? { background: 'rgba(28,26,21,.06)', color: INK2 }
        : { background: '#fdf0e8', color: BRAND }
  );

  // txn_date is a plain date; the wall-clock moment lives on created_at.
  const timeOf = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : fmt.num(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  // Nominates which account unallocated money lands in. Cash and bank are
  // separate families, so a cash wallet and a bank account are each default in
  // their own lane — admin cash entries keep going to the wallet either way.
  const makeDefault = async (a: CswoBankAccount) => {
    const isCash = a.account_type === 'cash';
    const family = accounts.filter((x) => (x.account_type === 'cash') === isCash);
    const { error } = await supabase.from('cswo_bank_accounts').update({ is_default: false })
      .in('id', family.map((x) => x.id));
    if (!error) await supabase.from('cswo_bank_accounts').update({ is_default: true }).eq('id', a.id);
    if (error) {
      alert(tr(
        'Could not set the default account. If this says the column does not exist, migration 0063 has not been applied yet.',
        'ডিফল্ট অ্যাকাউন্ট সেট করা যায়নি। কলাম না থাকলে মাইগ্রেশন ০০৬৩ এখনো প্রয়োগ হয়নি।',
      ) + '\n\n' + error.message);
      return;
    }
    await load();
  };

  const openAddAcct = () => { setEditingAcct(null); setAcctForm(EMPTY_ACCT); setAcctErr(''); setShowAcct(true); };
  const openEditAcct = (a: CswoBankAccount) => {
    setEditingAcct(a);
    setAcctForm({ label: a.label, bank_name: a.bank_name, account_name: a.account_name, account_number: a.account_number, ifsc: a.ifsc, branch: a.branch, account_type: a.account_type, opening_balance: String(Number(a.opening_balance)), statement_balance: String(Number(a.statement_balance || 0)), is_active: a.is_active, note: a.note });
    setAcctErr(''); setShowAcct(true);
  };

  const saveAcct = async () => {
    if (!acctForm.label.trim()) { setAcctErr(tr('A label is required.', 'একটি লেবেল আবশ্যক।')); return; }
    setSavingAcct(true); setAcctErr('');
    const payload = {
      label: acctForm.label.trim(), bank_name: acctForm.bank_name.trim(), account_name: acctForm.account_name.trim(),
      account_number: acctForm.account_number.trim(), ifsc: acctForm.ifsc.trim(), branch: acctForm.branch.trim(),
      account_type: acctForm.account_type, opening_balance: Number(acctForm.opening_balance || 0), statement_balance: Number(acctForm.statement_balance || 0), is_active: acctForm.is_active, note: acctForm.note.trim(),
    };
    const { error } = editingAcct
      ? await supabase.from('cswo_bank_accounts').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingAcct.id)
      : await supabase.from('cswo_bank_accounts').insert(payload);
    setSavingAcct(false);
    if (error) { setAcctErr(error.message); return; }
    setShowAcct(false); await load();
  };

  const removeAcct = async (id: string) => {
    if (!window.confirm(tr('Delete this account and all its transactions?', 'এই অ্যাকাউন্ট ও এর সব লেনদেন মুছবেন?'))) return;
    await supabase.from('cswo_bank_accounts').delete().eq('id', id);
    await load();
  };

  if (loading) return <TableSkeleton rows={6} />;

  const discrepancy = selected ? selSummary.balance - Number(selected.statement_balance || 0) : 0;

  return (
    // DashboardShell already supplies the rounded cream page surface and its
    // padding — a second one here just nests a card inside an identical card.
    <div className="flex flex-col gap-[22px]" style={{ color: INK }}>
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex max-w-[720px] flex-col gap-2">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{tr('Finance', 'অর্থ')} · {tr('Banking', 'ব্যাংকিং')}</div>
          <h1 className="text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[38px]" style={{ color: INK, fontFamily: SERIF }}>{tr('Bank Accounts & Reconciliation', 'ব্যাংক অ্যাকাউন্ট ও মিলকরণ')}</h1>
          <p className="text-[14px]" style={{ color: SOFT }}>{tr('Online money sits in bank accounts; offline cash sits in the wallet. Every donation and expense lands in one of them automatically.', 'অনলাইন টাকা ব্যাংক অ্যাকাউন্টে, অফলাইন নগদ ওয়ালেটে। প্রতিটি অনুদান ও ব্যয় স্বয়ংক্রিয়ভাবে এদের একটিতে যায়।')}</p>
        </div>
        <button
          onClick={openAddAcct}
          className="inline-flex items-center gap-2.5 rounded-[16px] px-6 py-[15px] text-[15px] font-bold transition-[transform,filter] duration-200 hover:brightness-105 active:translate-y-px active:scale-[0.97]"
          style={{ background: BRAND_GRAD, color: '#fff6ee', boxShadow: '0 14px 30px -14px rgba(185,58,8,.85), inset 0 1px 0 rgba(255,255,255,.22)' }}
        >
          <FaPlus className="h-3.5 w-3.5" /> {tr('Add account', 'অ্যাকাউন্ট যোগ')}
        </button>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-[18px] lg:grid-cols-[minmax(230px,290px)_minmax(0,1fr)]">
        {/* Accounts list */}
        <div className="flex min-w-0 flex-col gap-2.5">
          {accounts.length === 0 && <p className="text-[13px]" style={{ color: MUTED }}>{tr('No accounts yet.', 'এখনো কোনো অ্যাকাউন্ট নেই।')}</p>}

          {([
            { key: 'bank', label: tr('Bank · online', 'ব্যাংক · অনলাইন'), icon: FaBuildingColumns, list: accounts.filter((a) => a.account_type !== 'cash') },
            { key: 'cash', label: tr('Wallet · offline cash', 'ওয়ালেট · অফলাইন নগদ'), icon: FaWallet, list: accounts.filter((a) => a.account_type === 'cash') },
          ] as const).filter((g) => g.list.length > 0).map((g) => (
            <div key={g.key} className="flex flex-col gap-2.5 [&:not(:first-child)]:mt-2">
              <div className="pl-1 font-mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{g.label}</div>
              {g.list.map((a) => {
                const active = a.id === selectedId;
                const Icon = g.icon;
                const bal = balanceOf(a);
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className="w-full rounded-[18px] px-[18px] py-4 text-left transition-[transform,box-shadow,border-color,background] duration-200 hover:-translate-y-0.5 active:translate-y-px active:scale-[0.985]"
                    style={{
                      background: active ? '#fff7f1' : PAPER,
                      border: `1.5px solid ${active ? '#e4a98a' : RULE}`,
                      boxShadow: active ? '0 18px 34px -26px rgba(185,58,8,.7)' : '0 1px 2px rgba(28,26,21,.04)',
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-[26px] w-[26px] place-items-center rounded-[9px]" style={{ background: active ? '#fbe3d5' : CREAM, color: active ? BRAND : INK2 }}>
                        <Icon className="h-[13px] w-[13px]" />
                      </span>
                      <span className="text-[18px] font-bold" style={{ color: INK, fontFamily: SERIF }}>{a.label}</span>
                      {!a.is_active && <span className="ml-auto font-mono text-[9px] uppercase" style={{ color: MUTED }}>{tr('inactive', 'নিষ্ক্রিয়')}</span>}
                    </div>
                    <div className="mt-2.5 font-mono text-[10.5px]" style={{ color: MUTED }}>
                      {a.account_type === 'cash' ? tr('Cash in hand', 'হাতে থাকা নগদ') : `${a.bank_name || '—'} · ${mask(a.account_number)}`}
                    </div>
                    <div className="mt-2 text-[23px] font-bold tracking-[-0.01em]" style={{ color: bal < 0 ? BRAND : GREEN }}>{fmt.money(bal)}</div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Selected account */}
        {selected ? (
          <div className="flex min-w-0 flex-col gap-[18px] rounded-[20px] px-[26px] py-6" style={{ background: PAPER, border: `1px solid ${RULE}`, boxShadow: '0 1px 2px rgba(28,26,21,.04), 0 18px 34px -30px rgba(28,26,21,.55)' }}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-[5px]">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-[26px] font-bold" style={{ color: INK, fontFamily: SERIF }}>{selected.label}</h2>
                  {defaultsSupported && selected.is_default && (
                    <span
                      className="rounded-[8px] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em]"
                      style={{ background: '#eaf3ec', color: GREEN }}
                      title={selected.account_type === 'cash' ? tr('Cash entries land here', 'নগদ এন্ট্রি এখানে যাবে') : tr('Online money lands here', 'অনলাইন অর্থ এখানে যাবে')}
                    >
                      {tr('Default', 'ডিফল্ট')}
                    </span>
                  )}
                </div>
                <div className="text-[13.5px]" style={{ color: SOFT }}>
                  {selected.account_name && <span>{selected.account_name} · </span>}{typeLabel(selected.account_type)}
                  {selected.ifsc && <span> · IFSC {selected.ifsc}</span>}{selected.branch && <span> · {selected.branch}</span>}
                </div>
                <div className="font-mono text-[11.5px]" style={{ color: MUTED }}>{tr('A/C', 'অ্যাকাউন্ট')} {mask(selected.account_number)}</div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {defaultsSupported && !selected.is_default && (
                  <button onClick={() => makeDefault(selected)} className="rounded-full px-4 py-2.5 text-[13.5px] font-bold transition-transform duration-200 active:scale-95" style={{ border: `1px solid #e9e0cb`, background: PAPER, color: INK2 }}>
                    {tr('Make default', 'ডিফল্ট করুন')}
                  </button>
                )}
                <button onClick={() => openEditAcct(selected)} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13.5px] font-bold transition-transform duration-200 active:scale-95" style={{ border: `1px solid #e9e0cb`, background: PAPER, color: INK2 }}>
                  <FaPen className="h-3 w-3" /> {tr('Edit', 'সম্পাদনা')}
                </button>
                <button onClick={() => removeAcct(selected.id)} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13.5px] font-bold transition-transform duration-200 active:scale-95" style={{ border: `1px solid #f0d9cc`, background: PAPER, color: BRAND }}>
                  <FaTrash className="h-3 w-3" /> {tr('Delete', 'মুছুন')}
                </button>
              </div>
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
              <Mini label={tr('Opening', 'প্রারম্ভিক')} value={fmt.money(Number(selected.opening_balance))} color={INK2} />
              <Mini label={tr('Credits', 'জমা')} value={fmt.money(selSummary.cr)} color={GREEN} />
              <Mini label={tr('Debits', 'খরচ')} value={fmt.money(selSummary.db)} color={BRAND} />
              <Mini label={tr('Balance', 'ব্যালেন্স')} value={fmt.money(selSummary.balance)} color={selSummary.balance < 0 ? BRAND : INK} />
            </div>

            {Math.abs(discrepancy) > 0.01 && (
              <div className="flex items-center gap-3.5 rounded-[16px] px-[18px] py-[15px]" style={{ background: '#fdf0e8', border: '1px solid #f3d6c7' }}>
                <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[10px] text-[15px] font-bold" style={{ background: '#f7dccc', color: BRAND }}>!</span>
                <div className="min-w-0 flex-1 text-[13.5px]" style={{ color: '#8e3208' }}>
                  {tr(
                    `Calculated balance (${fmt.money(selSummary.balance)}) is out of sync with the statement balance (${fmt.money(Number(selected.statement_balance || 0))}) by ${fmt.money(Math.abs(discrepancy))}.`,
                    `লেজার ব্যালেন্স (${fmt.money(selSummary.balance)}) ও ব্যাংক বিবরণী ব্যালেন্স (${fmt.money(Number(selected.statement_balance || 0))}) এর মধ্যে ${fmt.money(Math.abs(discrepancy))} অমিল রয়েছে।`,
                  )}
                </div>
                <span className="whitespace-nowrap rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.09em]" style={{ background: BRAND, color: '#fff6ee' }}>
                  {tr('Out of sync', 'সমন্বয়হীন')}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-[20px] p-10 text-center text-[13px]" style={{ background: PAPER, border: `1px solid ${RULE}`, color: MUTED }}>{tr('Add a bank account to begin.', 'শুরু করতে একটি ব্যাংক অ্যাকাউন্ট যোগ করুন।')}</div>
        )}
      </div>

      {/* Transactions */}
      {selected && (
        <div className="flex min-w-0 flex-col gap-3.5 rounded-[20px] px-[22px] pb-3 pt-5" style={{ background: PAPER, border: `1px solid ${RULE}`, boxShadow: '0 1px 2px rgba(28,26,21,.04)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3.5">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{tr('Transactions', 'লেনদেন')}</div>
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13.5px]">
              <span style={{ color: SOFT }}>{fmt.num(selTxns.length)} {tr('shown', 'দেখানো হচ্ছে')}</span>
              <span className="font-bold" style={{ color: GREEN }}>{tr('Credit', 'জমা')} {fmt.money(filteredTotals.cr)}</span>
              <span className="font-bold" style={{ color: BRAND }}>{tr('Debit', 'খরচ')} {fmt.money(filteredTotals.db)}</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5 rounded-[16px] px-3.5 py-3" style={{ background: CREAM, border: `1px solid ${RULE}` }}>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>{tr('From', 'থেকে')}</span>
            <input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} className="h-10 rounded-[11px] px-2.5 text-[13.5px] outline-none" style={{ border: `1px solid ${FIELD}`, background: PAPER, color: INK2 }} />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>{tr('To', 'পর্যন্ত')}</span>
            <input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} className="h-10 rounded-[11px] px-2.5 text-[13.5px] outline-none" style={{ border: `1px solid ${FIELD}`, background: PAPER, color: INK2 }} />

            <select value={filters.direction} onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value as Filters['direction'] }))} className="h-10 cursor-pointer rounded-[11px] px-2.5 text-[13.5px] font-semibold outline-none" style={{ border: `1px solid ${FIELD}`, background: PAPER, color: INK2 }}>
              <option value="all">{tr('Credit & debit', 'জমা ও খরচ')}</option>
              <option value="credit">{tr('Credit only', 'শুধু জমা')}</option>
              <option value="debit">{tr('Debit only', 'শুধু খরচ')}</option>
            </select>

            <select value={filters.source} onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value as Filters['source'] }))} className="h-10 cursor-pointer rounded-[11px] px-2.5 text-[13.5px] font-semibold outline-none" style={{ border: `1px solid ${FIELD}`, background: PAPER, color: INK2 }}>
              <option value="all">{tr('All types', 'সব ধরন')}</option>
              {SOURCES.map((s) => <option key={s} value={s}>{sourceLabel(s)}</option>)}
            </select>

            {filtersActive && (
              <button onClick={() => setFilters(EMPTY_FILTERS)} className="h-10 rounded-[11px] px-3.5 text-[13.5px] font-semibold transition-transform duration-200 active:scale-95" style={{ border: `1px solid ${FIELD}`, background: PAPER, color: BRAND }}>
                {tr('Reset', 'রিসেট')}
              </button>
            )}
          </div>

          {/* Ledger table */}
          <div className="min-w-0 max-h-[520px] overflow-auto">
            {/* Sticky within the scroll container, so the columns stay labelled. */}
            <div
              className="sticky top-0 z-10 grid gap-2.5 px-3.5 pb-2.5 pt-1 font-mono text-[10px] font-bold uppercase tracking-[0.13em]"
              style={{ gridTemplateColumns: GRID, minWidth: 700, color: INK2, background: PAPER, borderBottom: `1px solid ${RULE}` }}
            >
              <div>{tr('Date & time', 'তারিখ ও সময়')}</div>
              <div>{tr('Description', 'বিবরণ')}</div>
              <div>{tr('Type', 'ধরন')}</div>
              <div>{tr('Ref', 'রেফ')}</div>
              <div className="text-right">{tr('Debit', 'খরচ')}</div>
              <div className="text-right">{tr('Credit', 'জমা')}</div>
            </div>

            {selTxns.map((t) => {
              const src = sourceOf(t);
              return (
                <div
                  key={t.id}
                  className="grid items-center gap-2.5 rounded-[14px] px-3.5 py-3 transition-[background,transform] duration-200 hover:translate-x-0.5"
                  style={{ gridTemplateColumns: GRID, minWidth: 700, borderBottom: '1px solid #f5f0e3' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = CREAM; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="text-[12.5px] leading-[1.35]" style={{ color: '#6f6a5c' }}>
                    {fmt.date(t.txn_date)}
                    <br />
                    <span className="font-mono text-[10.5px]" style={{ color: MUTED }}>{timeOf(t.created_at)}</span>
                  </div>
                  <div className="min-w-0 truncate text-[14px] font-semibold" style={{ color: INK }} title={t.description}>{t.description || '—'}</div>
                  <div>
                    <span className="rounded-[8px] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em]" style={sourceTone(src)}>{sourceLabel(src)}</span>
                  </div>
                  <div className="min-w-0 truncate font-mono text-[10.5px]" style={{ color: MUTED }} title={t.reference}>{t.reference || '—'}</div>
                  <div className="text-right text-[14px] font-bold" style={{ color: t.direction === 'debit' ? BRAND : '#d8d2c2' }}>{t.direction === 'debit' ? fmt.money(Number(t.amount)) : '—'}</div>
                  <div className="text-right text-[14px] font-bold" style={{ color: t.direction === 'credit' ? GREEN : '#d8d2c2' }}>{t.direction === 'credit' ? fmt.money(Number(t.amount)) : '—'}</div>
                </div>
              );
            })}

            {selTxns.length === 0 && (
              <div className="px-5 py-14 text-center">
                <div className="text-[22px] font-semibold" style={{ color: INK, fontFamily: SERIF }}>
                  {filtersActive ? tr('No transactions match', 'কোনো লেনদেন মেলেনি') : tr('No transactions yet', 'এখনো কোনো লেনদেন নেই')}
                </div>
                <div className="mt-1.5 text-[14px]" style={{ color: SOFT }}>
                  {filtersActive ? tr('Adjust the filters above.', 'উপরের ফিল্টার বদলান।') : tr('Donations and expenses appear here automatically.', 'অনুদান ও ব্যয় এখানে স্বয়ংক্রিয়ভাবে দেখাবে।')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showAcct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAcct(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[20px] p-6 shadow-xl" style={{ background: PAPER }} onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-[22px] font-bold" style={{ color: INK, fontFamily: SERIF }}>{editingAcct ? tr('Edit account', 'অ্যাকাউন্ট সম্পাদনা') : tr('Add bank account', 'ব্যাংক অ্যাকাউন্ট যোগ')}</h2>
            {acctErr && <p className="mb-3 rounded-[10px] px-3 py-2 text-[13px]" style={{ background: '#fdf0e8', color: BRAND }}>{acctErr}</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input className="input sm:col-span-2" placeholder={tr('Label (e.g. SBI Main)', 'লেবেল (যেমন SBI Main)')} value={acctForm.label} onChange={(e) => setAcctForm((f) => ({ ...f, label: e.target.value }))} />
              <input className="input" placeholder={tr('Bank name', 'ব্যাংকের নাম')} value={acctForm.bank_name} onChange={(e) => setAcctForm((f) => ({ ...f, bank_name: e.target.value }))} />
              <input className="input" placeholder={tr('Account holder name', 'অ্যাকাউন্ট হোল্ডার')} value={acctForm.account_name} onChange={(e) => setAcctForm((f) => ({ ...f, account_name: e.target.value }))} />
              <input className="input" placeholder={tr('Account number', 'অ্যাকাউন্ট নম্বর')} value={acctForm.account_number} onChange={(e) => setAcctForm((f) => ({ ...f, account_number: e.target.value }))} />
              <input className="input" placeholder="IFSC" value={acctForm.ifsc} onChange={(e) => setAcctForm((f) => ({ ...f, ifsc: e.target.value }))} />
              <input className="input" placeholder={tr('Branch', 'শাখা')} value={acctForm.branch} onChange={(e) => setAcctForm((f) => ({ ...f, branch: e.target.value }))} />
              <select className="input" value={acctForm.account_type} onChange={(e) => setAcctForm((f) => ({ ...f, account_type: e.target.value as BankAccountType }))}>
                {ACCT_TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
              </select>
              <input className="input" type="number" placeholder={tr('Opening balance (₹)', 'প্রারম্ভিক ব্যালেন্স (₹)')} value={acctForm.opening_balance} onChange={(e) => setAcctForm((f) => ({ ...f, opening_balance: e.target.value }))} />
              <input className="input sm:col-span-2" type="number" placeholder={tr('Statement balance / Actual (₹)', 'স্টেটমেন্ট ব্যালেন্স / প্রকৃত (₹)')} value={acctForm.statement_balance} onChange={(e) => setAcctForm((f) => ({ ...f, statement_balance: e.target.value }))} />
              <textarea className="input resize-none sm:col-span-2" rows={2} placeholder={tr('Note', 'নোট')} value={acctForm.note} onChange={(e) => setAcctForm((f) => ({ ...f, note: e.target.value }))} />
              <label className="flex items-center gap-2 text-[13px] sm:col-span-2" style={{ color: INK2 }}>
                <input type="checkbox" checked={acctForm.is_active} onChange={(e) => setAcctForm((f) => ({ ...f, is_active: e.target.checked }))} /> {tr('Active', 'সক্রিয়')}
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowAcct(false)} className="rounded-full px-4 py-2.5 text-[13.5px] font-semibold" style={{ border: `1px solid #e9e0cb`, color: INK2 }}>{tr('Cancel', 'বাতিল')}</button>
              <button onClick={saveAcct} disabled={savingAcct} className="rounded-[13px] px-6 py-2.5 text-[13.5px] font-bold transition-[filter] hover:brightness-105 disabled:opacity-60" style={{ background: BRAND_GRAD, color: '#fff6ee', boxShadow: '0 12px 24px -14px rgba(185,58,8,.85)' }}>{savingAcct ? tr('Saving…', 'সংরক্ষণ…') : tr('Save', 'সংরক্ষণ')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="min-w-0 rounded-[16px] px-4 py-[15px] transition-transform duration-200 hover:-translate-y-0.5" style={{ background: CREAM, border: `1px solid ${RULE}` }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>{label}</div>
      <div className="mt-1.5 text-[22px] font-bold tracking-[-0.01em]" style={{ color }}>{value}</div>
    </div>
  );
}
