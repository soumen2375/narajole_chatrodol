import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaPlus, FaBuildingColumns, FaWallet, FaTrash, FaCheck } from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoBankAccount, CswoBankTransaction, BankAccountType, LedgerDirection } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';

const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const BRAND = '#c2410c';
const GREEN = '#4d7c0f';
const PAPER = '#ffffff';
const CREAM = '#faf6ef';

const ACCT_TYPES: BankAccountType[] = ['savings', 'current', 'cash', 'other'];

type AcctForm = {
  label: string; bank_name: string; account_name: string; account_number: string;
  ifsc: string; branch: string; account_type: BankAccountType; opening_balance: string; statement_balance: string; is_active: boolean; note: string;
};
const EMPTY_ACCT: AcctForm = { label: '', bank_name: '', account_name: '', account_number: '', ifsc: '', branch: '', account_type: 'savings', opening_balance: '', statement_balance: '', is_active: true, note: '' };

type TxnForm = { txn_date: string; description: string; reference: string; direction: LedgerDirection; amount: string; note: string };
const today = () => new Date().toISOString().slice(0, 10);
const emptyTxn = (): TxnForm => ({ txn_date: today(), description: '', reference: '', direction: 'debit', amount: '', note: '' });

export default function AdminBankAccounts() {
  const { member: me } = useAuth();
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

  const [txnForm, setTxnForm] = useState<TxnForm>(emptyTxn());
  const [savingTxn, setSavingTxn] = useState(false);
  const [showOnlyUnrec, setShowOnlyUnrec] = useState(false);

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
    if (showOnlyUnrec) t = t.filter((x) => !x.reconciled);
    return t;
  }, [txns, selectedId, showOnlyUnrec]);

  const selSummary = useMemo(() => {
    const t = txns.filter((x) => x.account_id === selectedId);
    const cr = t.filter((x) => x.direction === 'credit').reduce((s, x) => s + Number(x.amount), 0);
    const db = t.filter((x) => x.direction === 'debit').reduce((s, x) => s + Number(x.amount), 0);
    const unrec = t.filter((x) => !x.reconciled).length;
    return { cr, db, unrec, balance: selected ? Number(selected.opening_balance) + cr - db : 0 };
  }, [txns, selectedId, selected]);

  const mask = (n: string) => (n && n.length > 4 ? `•••• ${n.slice(-4)}` : n || '—');
  const typeLabel = (t: BankAccountType) => ({ savings: tr('Savings', 'সঞ্চয়'), current: tr('Current', 'চলতি'), cash: tr('Cash', 'নগদ'), other: tr('Other', 'অন্যান্য') }[t]);

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

  const addTxn = async () => {
    if (!selectedId || !txnForm.amount || Number(txnForm.amount) <= 0) return;
    setSavingTxn(true);
    await supabase.from('cswo_bank_transactions').insert({
      account_id: selectedId, txn_date: txnForm.txn_date, description: txnForm.description.trim(),
      reference: txnForm.reference.trim(), direction: txnForm.direction, amount: Number(txnForm.amount), note: txnForm.note.trim(), created_by: me?.id,
    });
    setTxnForm(emptyTxn());
    setSavingTxn(false);
    await load();
  };

  const toggleReconcile = async (t: CswoBankTransaction) => {
    setTxns((arr) => arr.map((x) => x.id === t.id ? { ...x, reconciled: !x.reconciled } : x));
    await supabase.from('cswo_bank_transactions').update({ reconciled: !t.reconciled, updated_at: new Date().toISOString() }).eq('id', t.id);
  };

  const removeTxn = async (id: string) => {
    await supabase.from('cswo_bank_transactions').delete().eq('id', id);
    await load();
  };

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Finance', 'অর্থ')} · {tr('Banking', 'ব্যাংকিং')}</div>
          <h1 className="mt-1.5 text-[28px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Bank Accounts & Reconciliation', 'ব্যাংক অ্যাকাউন্ট ও মিলকরণ')}</h1>
          <p className="mt-1 text-[13.5px]" style={{ color: INK2 }}>{tr('Online money sits in the bank accounts; offline cash sits in the wallet. Every donation and expense lands in one of them automatically.', 'অনলাইন টাকা ব্যাংক অ্যাকাউন্টে, অফলাইন নগদ ওয়ালেটে। প্রতিটি অনুদান ও ব্যয় স্বয়ংক্রিয়ভাবে এদের একটিতে যায়।')}</p>
        </div>
        <button onClick={openAddAcct} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: BRAND }}><FaPlus className="h-3 w-3" /> {tr('Add account', 'অ্যাকাউন্ট যোগ')}</button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        {/* Accounts list */}
        <div className="space-y-5">
          {accounts.length === 0 && <p className="text-[13px]" style={{ color: MUTED }}>{tr('No accounts yet.', 'এখনো কোনো অ্যাকাউন্ট নেই।')}</p>}

          {([
            { key: 'bank', label: tr('Bank · online', 'ব্যাংক · অনলাইন'), icon: FaBuildingColumns, list: accounts.filter((a) => a.account_type !== 'cash') },
            { key: 'cash', label: tr('Wallet · offline cash', 'ওয়ালেট · অফলাইন নগদ'), icon: FaWallet, list: accounts.filter((a) => a.account_type === 'cash') },
          ] as const).filter((g) => g.list.length > 0).map((g) => (
            <div key={g.key} className="space-y-3">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{g.label}</div>
              {g.list.map((a) => {
                const active = a.id === selectedId;
                const Icon = g.icon;
                return (
                  <button key={a.id} onClick={() => setSelectedId(a.id)} className="w-full rounded-[8px] p-4 text-left transition-shadow" style={{ background: active ? CREAM : PAPER, border: `1px solid ${active ? BRAND : RULE}` }}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" style={{ color: BRAND }} />
                      <span className="font-semibold" style={{ color: INK }}>{a.label}</span>
                      {!a.is_active && <span className="ml-auto font-mono text-[9px] uppercase" style={{ color: MUTED }}>{tr('inactive', 'নিষ্ক্রিয়')}</span>}
                    </div>
                    <div className="mt-1 font-mono text-[10px]" style={{ color: MUTED }}>
                      {a.account_type === 'cash' ? tr('Cash in hand', 'হাতে থাকা নগদ') : `${a.bank_name || '—'} · ${mask(a.account_number)}`}
                    </div>
                    <div className="mt-2 text-[17px] font-bold" style={{ color: balanceOf(a) < 0 ? BRAND : GREEN }}>{fmt.money(balanceOf(a))}</div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Selected account */}
        {selected ? (
          <div className="space-y-4">
            <div className="rounded-[8px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-bold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{selected.label}</h2>
                  <div className="mt-1 text-[12px]" style={{ color: INK2 }}>
                    {selected.account_name && <span>{selected.account_name} · </span>}{typeLabel(selected.account_type)}
                    {selected.ifsc && <span> · IFSC {selected.ifsc}</span>}{selected.branch && <span> · {selected.branch}</span>}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px]" style={{ color: MUTED }}>{tr('A/C', 'অ্যাকাউন্ট')} {mask(selected.account_number)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium">
                  {!defaultsSupported ? null : selected.is_default ? (
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]"
                      style={{ background: 'rgba(77,124,15,0.12)', color: GREEN }}
                      title={selected.account_type === 'cash'
                        ? tr('Cash entries land here', 'নগদ এন্ট্রি এখানে যাবে')
                        : tr('Online money lands here', 'অনলাইন অর্থ এখানে যাবে')}
                    >
                      {tr('Default', 'ডিফল্ট')}
                    </span>
                  ) : (
                    <button onClick={() => makeDefault(selected)} className="hover:underline" style={{ color: INK2 }}>
                      {tr('Make default', 'ডিফল্ট করুন')}
                    </button>
                  )}
                  <button onClick={() => openEditAcct(selected)} style={{ color: BRAND }} className="hover:underline">{tr('Edit', 'সম্পাদনা')}</button>
                  <button onClick={() => removeAcct(selected.id)} className="text-red-600 hover:underline">{tr('Delete', 'মুছুন')}</button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Mini label={tr('Opening', 'প্রারম্ভিক')} value={fmt.money(Number(selected.opening_balance))} color={INK2} />
                <Mini label={tr('Credits', 'জমা')} value={fmt.money(selSummary.cr)} color={GREEN} />
                <Mini label={tr('Debits', 'খরচ')} value={fmt.money(selSummary.db)} color={BRAND} />
                <Mini label={tr('Balance', 'ব্যালেন্স')} value={fmt.money(selSummary.balance)} color={selSummary.balance < 0 ? BRAND : INK} />
              </div>
              
              {/* Reconciliation Panel / Discrepancy Alert */}
              {Math.abs(selSummary.balance - Number(selected.statement_balance || 0)) > 0.01 && (
                <div className="mt-4 rounded-[6px] p-3 flex items-center justify-between border text-[13px] font-semibold" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[16px]">⚠️</span>
                    <span>
                      {tr(
                        `Discrepancy Alert: Calculated balance (${fmt.money(selSummary.balance)}) is out of sync with statement balance (${fmt.money(Number(selected.statement_balance || 0))}) by ${fmt.money(Math.abs(selSummary.balance - Number(selected.statement_balance || 0)))}.`,
                        `অমিল সতর্কতা: লেজার ব্যালেন্স (${fmt.money(selSummary.balance)}) এবং ব্যাংক বিবরণী ব্যালেন্স (${fmt.money(Number(selected.statement_balance || 0))}) এর মধ্যে ${fmt.money(Math.abs(selSummary.balance - Number(selected.statement_balance || 0)))} অমিল রয়েছে।`
                      )}
                    </span>
                  </div>
                  <span className="rounded bg-red-100 px-2 py-0.5 text-[11.5px] font-bold uppercase tracking-wide shrink-0" style={{ color: '#991b1b' }}>
                    {tr('Out of Sync', 'সমন্বয়হীন')}
                  </span>
                </div>
              )}
              {selSummary.unrec > 0 && <div className="mt-3 text-[12px]" style={{ color: MUTED }}>{fmt.num(selSummary.unrec)} {tr('unreconciled entries', 'অমিলিত এন্ট্রি')}</div>}
            </div>

            {/* Add transaction */}
            <div className="rounded-[8px] p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{tr('Add statement line', 'স্টেটমেন্ট লাইন যোগ')}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input type="date" value={txnForm.txn_date} onChange={(e) => setTxnForm((f) => ({ ...f, txn_date: e.target.value }))} className="rounded-[6px] px-2 py-1.5 text-[12.5px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }} />
                <input value={txnForm.description} onChange={(e) => setTxnForm((f) => ({ ...f, description: e.target.value }))} placeholder={tr('Description', 'বিবরণ')} className="min-w-[150px] flex-1 rounded-[6px] px-2 py-1.5 text-[12.5px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
                <input value={txnForm.reference} onChange={(e) => setTxnForm((f) => ({ ...f, reference: e.target.value }))} placeholder={tr('Ref / UTR', 'রেফ / UTR')} className="w-28 rounded-[6px] px-2 py-1.5 text-[12.5px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }} />
                <select value={txnForm.direction} onChange={(e) => setTxnForm((f) => ({ ...f, direction: e.target.value as LedgerDirection }))} className="rounded-[6px] px-2 py-1.5 text-[12.5px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
                  <option value="debit">{tr('Debit', 'খরচ')}</option>
                  <option value="credit">{tr('Credit', 'জমা')}</option>
                </select>
                <input type="number" value={txnForm.amount} onChange={(e) => setTxnForm((f) => ({ ...f, amount: e.target.value }))} placeholder={tr('Amount', 'পরিমাণ')} className="w-28 rounded-[6px] px-2 py-1.5 text-[12.5px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
                <button onClick={addTxn} disabled={savingTxn || !txnForm.amount} className="rounded-full px-4 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: BRAND }}>{tr('Add', 'যোগ')}</button>
              </div>
            </div>

            {/* Transactions */}
            <div className="overflow-hidden rounded-[8px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${RULE}` }}>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{tr('Transactions', 'লেনদেন')}</span>
                <label className="flex items-center gap-2 text-[12px]" style={{ color: INK2 }}>
                  <input type="checkbox" checked={showOnlyUnrec} onChange={(e) => setShowOnlyUnrec(e.target.checked)} /> {tr('Unreconciled only', 'শুধু অমিলিত')}
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-[13px]">
                  <thead><tr style={{ borderBottom: `1px solid ${RULE}` }}>
                    {[tr('Date', 'তারিখ'), tr('Description', 'বিবরণ'), tr('Ref', 'রেফ'), tr('Debit', 'খরচ'), tr('Credit', 'জমা'), tr('Reconciled', 'মিলিত'), ''].map((h, i) => (
                      <th key={i} className="px-3 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {selTxns.map((t) => (
                      <tr key={t.id} style={{ borderBottom: `1px solid ${RULE}`, background: t.reconciled ? 'rgba(77,124,15,0.04)' : undefined }}>
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px]" style={{ color: MUTED }}>{fmt.date(t.txn_date)}</td>
                        <td className="px-3 py-2.5" style={{ color: INK }}>{t.description || '—'}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: MUTED }}>{t.reference || '—'}</td>
                        <td className="px-3 py-2.5 font-semibold" style={{ color: t.direction === 'debit' ? BRAND : MUTED }}>{t.direction === 'debit' ? fmt.money(Number(t.amount)) : ''}</td>
                        <td className="px-3 py-2.5 font-semibold" style={{ color: t.direction === 'credit' ? GREEN : MUTED }}>{t.direction === 'credit' ? fmt.money(Number(t.amount)) : ''}</td>
                        <td className="px-3 py-2.5">
                          <button onClick={() => toggleReconcile(t)} className="flex h-5 w-5 items-center justify-center rounded-[5px] transition-colors" style={{ background: t.reconciled ? GREEN : 'transparent', border: `1px solid ${t.reconciled ? GREEN : RULE}` }}>
                            {t.reconciled && <FaCheck className="h-2.5 w-2.5 text-white" />}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-right"><button onClick={() => removeTxn(t.id)} className="rounded-full p-1.5 transition-colors hover:bg-black/5" style={{ color: MUTED }}><FaTrash className="h-3 w-3" /></button></td>
                      </tr>
                    ))}
                    {selTxns.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-[13px]" style={{ color: MUTED }}>{tr('No transactions.', 'কোনো লেনদেন নেই।')}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[8px] p-10 text-center text-[13px]" style={{ background: PAPER, border: `1px solid ${RULE}`, color: MUTED }}>{tr('Add a bank account to begin.', 'শুরু করতে একটি ব্যাংক অ্যাকাউন্ট যোগ করুন।')}</div>
        )}
      </div>

      {showAcct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAcct(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[10px] p-6 shadow-xl" style={{ background: PAPER }} onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-[18px] font-bold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{editingAcct ? tr('Edit account', 'অ্যাকাউন্ট সম্পাদনা') : tr('Add bank account', 'ব্যাংক অ্যাকাউন্ট যোগ')}</h2>
            {acctErr && <p className="mb-3 rounded px-3 py-2 text-[13px]" style={{ background: 'rgba(194,65,12,0.1)', color: BRAND }}>{acctErr}</p>}
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
              <button onClick={() => setShowAcct(false)} className="rounded-full px-4 py-2 text-[13px] font-medium" style={{ border: `1px solid ${RULE}`, color: INK2 }}>{tr('Cancel', 'বাতিল')}</button>
              <button onClick={saveAcct} disabled={savingAcct} className="rounded-full px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: BRAND }}>{savingAcct ? tr('Saving…', 'সংরক্ষণ…') : tr('Save', 'সংরক্ষণ')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[6px] p-2.5" style={{ background: CREAM }}>
      <div className="font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{label}</div>
      <div className="mt-0.5 text-[15px] font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
