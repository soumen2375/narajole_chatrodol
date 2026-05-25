import { useCallback, useEffect, useState } from 'react';
import { FaReceipt, FaRotateLeft, FaSackDollar, FaCircleCheck } from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
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

type Kind = 'expense' | 'refund' | 'payroll';
interface Item {
  id: string;
  kind: Kind;
  title: string;
  sub: string;
  amount: number;
  date: string;
}

const KIND_META: Record<Kind, { icon: typeof FaReceipt; color: string }> = {
  expense: { icon: FaReceipt, color: '#b45309' },
  refund: { icon: FaRotateLeft, color: '#1d4ed8' },
  payroll: { icon: FaSackDollar, color: '#7c3aed' },
};

export default function AdminApprovals() {
  const { member: me } = useAuth();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [eR, rR, pR] = await Promise.all([
      supabase.from('cswo_expenses').select('id,amount,description,vendor,spent_on,created_at').eq('status', 'draft'),
      supabase.from('cswo_refunds').select('id,amount,reason,created_at,donation:cswo_donations(donor_name,is_anonymous)').eq('status', 'requested'),
      supabase.from('cswo_payroll').select('id,amount,kind,period,payee_name,created_at,member:cswo_members!member_id(full_name)').eq('status', 'pending'),
    ]);
    const out: Item[] = [];
    for (const e of (eR.data ?? []) as { id: string; amount: number; description: string; vendor: string; spent_on: string; created_at: string }[]) {
      out.push({ id: e.id, kind: 'expense', title: e.description || e.vendor || tr('Expense', 'ব্যয়'), sub: e.vendor || '', amount: Number(e.amount), date: e.spent_on || e.created_at });
    }
    for (const r of (rR.data ?? []) as unknown as { id: string; amount: number; reason: string; created_at: string; donation: { donor_name: string | null; is_anonymous: boolean } | null }[]) {
      const who = r.donation?.is_anonymous ? tr('Anonymous', 'নাম গোপন') : (r.donation?.donor_name || tr('Donor', 'দাতা'));
      out.push({ id: r.id, kind: 'refund', title: `${tr('Refund', 'ফেরত')} · ${who}`, sub: r.reason || '', amount: Number(r.amount), date: r.created_at });
    }
    for (const p of (pR.data ?? []) as unknown as { id: string; amount: number; kind: string; period: string; payee_name: string; created_at: string; member: { full_name: string } | null }[]) {
      const who = p.member?.full_name || p.payee_name || tr('Staff', 'কর্মী');
      out.push({ id: p.id, kind: 'payroll', title: `${who} · ${p.kind}`, sub: p.period || '', amount: Number(p.amount), date: p.created_at });
    }
    out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setItems(out);
    setLoading(false);
  }, [lang]);
  useEffect(() => { load(); }, [load]);

  const checkBudgetExceeded = async (expenseId: string): Promise<{ exceeded: boolean; msg: string; frozen: boolean }> => {
    const { data: exp, error: expErr } = await supabase
      .from('cswo_expenses')
      .select('fund_id, amount, spent_on')
      .eq('id', expenseId)
      .single();

    if (expErr || !exp) {
      return { exceeded: false, msg: tr('Expense record not found.', 'ব্যয় রেকর্ড পাওয়া যায়নি।'), frozen: false };
    }

    const { fund_id: fundId, amount, spent_on: spentOn } = exp;

    const { data: fund, error: fundErr } = await supabase
      .from('cswo_funds')
      .select('*')
      .eq('id', fundId)
      .single();
    
    if (fundErr || !fund) {
      return { exceeded: false, msg: tr('Fund not found.', 'ফান্ড পাওয়া যায়নি।'), frozen: false };
    }
    if (fund.is_frozen) {
      return { exceeded: false, msg: tr('This fund is frozen. Spend/approval is blocked.', 'এই ফান্ডটি স্থগিত করা হয়েছে। নতুন ব্যয়/অনুমোদন নিষিদ্ধ।'), frozen: true };
    }

    const d = new Date(spentOn);
    const y = d.getFullYear();
    const fy = d.getMonth() >= 3 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;

    const { data: budget } = await supabase
      .from('cswo_budgets')
      .select('*')
      .eq('fund_id', fundId)
      .eq('fiscal_year', fy)
      .maybeSingle();

    if (!budget) {
      return { exceeded: false, msg: '', frozen: false };
    }

    const budgetLimit = Number(budget.allocated_amount);
    const startYear = parseInt(fy.split('-')[0]);
    const startDate = `${startYear}-04-01`;
    const endDate = `${startYear + 1}-03-31`;

    const { data: approvedExpenses } = await supabase
      .from('cswo_expenses')
      .select('amount')
      .eq('fund_id', fundId)
      .eq('status', 'approved')
      .gte('spent_on', startDate)
      .lte('spent_on', endDate);

    const totalSpent = (approvedExpenses ?? []).reduce((sum, item) => sum + Number(item.amount), 0);

    if (totalSpent + Number(amount) > budgetLimit) {
      const remaining = budgetLimit - totalSpent;
      return {
        exceeded: true,
        msg: tr(
          `Budget exceeded! Maximum allowed budget is ₹${budgetLimit.toLocaleString('en-IN')}. Current spent is ₹${totalSpent.toLocaleString('en-IN')} (Remaining: ₹${remaining.toLocaleString('en-IN')}).`,
          `বাজেট অতিক্রম করেছে! সর্বোচ্চ অনুমোদিত বাজেট ₹${budgetLimit.toLocaleString('en-IN')}। বর্তমান ব্যয় ₹${totalSpent.toLocaleString('en-IN')} (অবশিষ্ট: ₹${remaining.toLocaleString('en-IN')})।`
        ),
        frozen: false
      };
    }

    return { exceeded: false, msg: '', frozen: false };
  };

  const act = async (item: Item, action: 'approve' | 'reject') => {
    setBusy(item.id);
    if (item.kind === 'expense') {
      if (action === 'approve') {
        const res = await checkBudgetExceeded(item.id);
        if (res.frozen) {
          alert(res.msg);
          setBusy(null);
          return;
        }
        if (res.exceeded) {
          const ok = window.confirm(res.msg + "\n\n" + tr("Do you still want to approve this expense?", "আপনি কি তবুও এই ব্যয়টি অনুমোদন করতে চান?"));
          if (!ok) {
            setBusy(null);
            return;
          }
        }
        await supabase.from('cswo_expenses').update({ status: 'approved', approved_by: me?.id }).eq('id', item.id);
      } else {
        const reason = window.prompt(tr('Why is this expense rejected?', 'এই ব্যয়টি কেন প্রত্যাখ্যাত হলো?'));
        if (reason === null) {
          setBusy(null);
          return;
        }
        await supabase.from('cswo_expenses').update({ status: 'rejected', rejection_reason: reason.trim(), approved_by: me?.id }).eq('id', item.id);
      }
    } else if (item.kind === 'refund') {
      await supabase.from('cswo_refunds').update({ status: action === 'approve' ? 'approved' : 'rejected', approved_by: me?.id }).eq('id', item.id);
    } else {
      if (action === 'approve') await supabase.from('cswo_payroll').update({ status: 'paid', paid_on: new Date().toISOString().slice(0, 10), approved_by: me?.id, updated_at: new Date().toISOString() }).eq('id', item.id);
      else await supabase.from('cswo_payroll').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', item.id);
    }
    setBusy(null);
    setItems((arr) => arr.filter((x) => x.id !== item.id));
  };

  const approveLabel = (k: Kind) => k === 'payroll' ? tr('Mark paid', 'পরিশোধিত') : tr('Approve', 'অনুমোদন');
  const rejectLabel = (k: Kind) => k === 'expense' ? tr('Discard', 'বাতিল') : k === 'payroll' ? tr('Cancel', 'বাতিল') : tr('Reject', 'প্রত্যাখ্যান');
  const kindLabel = (k: Kind) => ({ expense: tr('Expense', 'ব্যয়'), refund: tr('Refund', 'ফেরত'), payroll: tr('Payroll', 'বেতন') }[k]);

  const count = (k: Kind) => items.filter((i) => i.kind === k).length;

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Finance', 'অর্থ')} · {tr('Workflow', 'কর্মপ্রবাহ')}</div>
        <h1 className="mt-1.5 text-[28px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Approvals', 'অনুমোদন')}</h1>
        <p className="mt-1 text-[13.5px]" style={{ color: INK2 }}>{tr('Everything waiting on you — draft expenses, refund requests and pending payroll — in one queue.', 'আপনার অপেক্ষায় থাকা সবকিছু — খসড়া ব্যয়, ফেরত অনুরোধ ও অপেক্ষমাণ বেতন — এক সারিতে।')}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label={tr('Expenses', 'ব্যয়')} value={fmt.num(count('expense'))} color={KIND_META.expense.color} />
        <Stat label={tr('Refunds', 'ফেরত')} value={fmt.num(count('refund'))} color={KIND_META.refund.color} />
        <Stat label={tr('Payroll', 'বেতন')} value={fmt.num(count('payroll'))} color={KIND_META.payroll.color} />
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[8px] py-16" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <FaCircleCheck className="h-9 w-9" style={{ color: GREEN }} />
          <p className="mt-3 text-[15px] font-semibold" style={{ color: INK }}>{tr('All caught up', 'সব সম্পন্ন')}</p>
          <p className="mt-1 text-[13px]" style={{ color: MUTED }}>{tr('Nothing is awaiting approval.', 'অনুমোদনের অপেক্ষায় কিছু নেই।')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[8px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          {items.map((item, i) => {
            const meta = KIND_META[item.kind];
            const Icon = meta.icon;
            return (
              <div key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5" style={{ borderTop: i === 0 ? undefined : `1px solid ${RULE}` }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: CREAM }}><Icon className="h-3.5 w-3.5" style={{ color: meta.color }} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: meta.color }}>{kindLabel(item.kind)}</span>
                    <span className="font-mono text-[10px]" style={{ color: MUTED }}>{fmt.date(item.date)}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[14px] font-semibold" style={{ color: INK }}>{item.title}</div>
                  {item.sub && <div className="truncate text-[12px]" style={{ color: INK2 }}>{item.sub}</div>}
                </div>
                <div className="text-[15px] font-bold" style={{ color: BRAND }}>{fmt.money(item.amount)}</div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => act(item, 'approve')} disabled={busy === item.id} className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: GREEN }}>{approveLabel(item.kind)}</button>
                  <button onClick={() => act(item, 'reject')} disabled={busy === item.id} className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-black/5 disabled:opacity-50" style={{ border: `1px solid ${RULE}`, color: INK2 }}>{rejectLabel(item.kind)}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[8px] p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{label}</div>
      <div className="mt-1.5 text-[24px] font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
