import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import { useFmt, formatDate } from '@/lib/format';
import { printReceipt } from '@/lib/receipt';
import {
  DonationFields, ExpenseFields, emptyDonationDraft, emptyExpenseDraft,
  saveDonation, saveExpense, validateDonation, validateExpense, useMoneyRefs,
  PAPER, RULE, INK, INK2, MUTED, GREEN, BRAND, SERIF, MONO,
  type DonationDraft, type ExpenseDraft,
} from './moneyForms';
import { Plus, X, ArrowDownLeft, ArrowUpRight, Check, ChevronLeft, Loader2, Printer } from 'lucide-react';

type Direction = 'in' | 'out';
type Step = 'direction' | 'form' | 'done';

interface Saved {
  direction: Direction;
  amount: number;
  who: string;
  receiptNumber: string;
  date: string;
  purpose: string;
  method: string;
}

/* ── Public entry point: the button that opens the sheet ─────────────────── */
export default function RecordMoneyButton({ onSaved }: { onSaved?: () => void }) {
  const { lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-full text-[13px] font-semibold text-white transition-[filter] hover:brightness-110"
        style={{ height: 38, padding: '0 18px', background: 'linear-gradient(180deg,#e2560f,#b8400d)', boxShadow: '0 6px 15px -8px rgba(184,64,13,1)' }}
      >
        <Plus className="h-4 w-4" />
        {tr('Record Money', 'টাকা রেকর্ড')}
      </button>
      {open && <RecordMoneySheet onClose={() => setOpen(false)} onSaved={onSaved} />}
    </>
  );
}

/* ── The sheet: direction → form → done ──────────────────────────────────── */
function RecordMoneySheet({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const { member: me } = useAuth();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const { events, banks } = useMoneyRefs();

  const [step, setStep] = useState<Step>('direction');
  const [direction, setDirection] = useState<Direction>('in');
  const [donation, setDonation] = useState<DonationDraft>(emptyDonationDraft);
  const [expense, setExpense] = useState<ExpenseDraft>(emptyExpenseDraft);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState<Saved | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  /* Money IN goes straight to the donation form; Money OUT to the expense form. */
  const pick = (d: Direction) => {
    setDirection(d);
    setErr('');
    if (d === 'in') setDonation(emptyDonationDraft());
    else setExpense(emptyExpenseDraft());
    setStep('form');
  };

  const save = async () => {
    const problem = direction === 'in'
      ? validateDonation(donation, lang)
      : validateExpense(expense, lang);
    if (problem) { setErr(problem); return; }

    setSaving(true);
    setErr('');
    try {
      if (direction === 'in') {
        const r = await saveDonation(donation, me?.id ?? null, lang);
        setSaved({ direction, amount: r.amount, who: r.name, receiptNumber: r.receiptNumber, date: r.date, purpose: r.purpose, method: r.method });
      } else {
        const r = await saveExpense(expense, me!.id, lang);
        setSaved({ direction, amount: r.amount, who: r.vendor || tr('Expense', 'ব্যয়'), receiptNumber: '', date: r.date, purpose: r.note, method: r.method });
      }
      setStep('done');
      onSaved?.();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : tr('Could not save.', 'সংরক্ষণ করা যায়নি।'));
    } finally {
      setSaving(false);
    }
  };

  const printSavedReceipt = () => {
    if (!saved || saved.direction !== 'in') return;
    printReceipt({
      receiptNumber: saved.receiptNumber,
      type: 'donation',
      name: saved.who,
      amount: saved.amount,
      date: formatDate(saved.date, 'en'),
      purpose: saved.purpose,
      paymentMethod: saved.method,
    }, lang);
  };

  const amountNow = direction === 'in' ? donation.amount : expense.amount;

  const stepTitle = step === 'direction'
    ? tr('Record Money', 'টাকা রেকর্ড')
    : step === 'form'
      ? (direction === 'in' ? tr('Donation', 'অনুদান') : tr('Expense', 'ব্যয়'))
      : tr('Recorded', 'রেকর্ড হয়েছে');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] shadow-2xl sm:rounded-[16px]"
        style={{ background: PAPER, color: INK }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: RULE }}>
          {step === 'form' && (
            <button onClick={() => { setErr(''); setStep('direction'); }} className="rounded-lg p-1.5 hover:bg-[#f4f1e8]" style={{ color: MUTED }} aria-label={tr('Back', 'পিছনে')}>
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <h2 className="flex-1 text-[17px] font-semibold" style={{ fontFamily: SERIF }}>{stepTitle}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-[#f4f1e8]" style={{ color: MUTED }} aria-label={tr('Close', 'বন্ধ')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {err && (
            <p className="mb-3 rounded-[10px] px-3 py-2 text-[12.5px] font-semibold" style={{ background: '#fdf1ef', border: '1px solid #f3d7d1', color: '#b3341a' }}>
              {err}
            </p>
          )}

          {step === 'direction' && (
            <div className="grid grid-cols-2 gap-3">
              <BigChoice
                icon={ArrowDownLeft} label={tr('Money IN', 'টাকা আসছে')} hint={tr('Record a donation', 'অনুদান রেকর্ড করুন')}
                fg={GREEN} bg="linear-gradient(158deg,#ecfaf3 0%,#ffffff 65%)" border="#c8e7d8"
                onClick={() => pick('in')}
              />
              <BigChoice
                icon={ArrowUpRight} label={tr('Money OUT', 'টাকা যাচ্ছে')} hint={tr('Record an expense', 'ব্যয় রেকর্ড করুন')}
                fg={BRAND} bg="linear-gradient(158deg,#fff5ec 0%,#ffffff 65%)" border="#f0d9c2"
                onClick={() => pick('out')}
              />
            </div>
          )}

          {step === 'form' && (direction === 'in'
            ? <DonationFields draft={donation} onChange={setDonation} events={events} banks={banks} />
            : <ExpenseFields draft={expense} onChange={setExpense} events={events} banks={banks} />
          )}

          {step === 'done' && saved && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: saved.direction === 'in' ? '#ecfaf3' : '#fff5ec', color: saved.direction === 'in' ? GREEN : BRAND }}
              >
                <Check className="h-7 w-7" />
              </span>
              <div>
                <div className="text-[28px] font-bold" style={{ fontFamily: SERIF, color: saved.direction === 'in' ? GREEN : BRAND }}>
                  {saved.direction === 'in' ? '+' : '−'}{fmt.money(saved.amount)}
                </div>
                <div className="mt-0.5 text-[13.5px]" style={{ color: INK2 }}>{saved.who}</div>
                {saved.receiptNumber && (
                  <div className="mt-1 text-[11px]" style={{ fontFamily: MONO, color: MUTED }}>{saved.receiptNumber}</div>
                )}
              </div>
              <p className="text-[12.5px]" style={{ color: MUTED }}>
                {tr(
                  `Saved to the ledger and the ${saved.method.toLowerCase() === 'cash' || saved.method === 'নগদ' ? 'wallet' : 'bank'}.`,
                  'লেজার ও ব্যালেন্সে যুক্ত হয়েছে।',
                )}
              </p>

              <div className="mt-1 flex w-full flex-col gap-2">
                {saved.direction === 'in' && (
                  <button
                    onClick={printSavedReceipt}
                    className="flex w-full items-center justify-center gap-2 rounded-[10px] text-[14px] font-semibold text-white"
                    style={{ height: 46, background: 'linear-gradient(180deg,#e2560f,#b8400d)' }}
                  >
                    <Printer className="h-4 w-4" /> {tr('Print / share receipt', 'রসিদ প্রিন্ট / শেয়ার')}
                  </button>
                )}
                <button
                  onClick={() => { setSaved(null); setErr(''); setStep('direction'); }}
                  className="w-full rounded-[10px] text-[14px] font-semibold"
                  style={{ height: 46, background: PAPER, border: `1px solid ${RULE}`, color: INK2 }}
                >
                  {tr('Record another', 'আরেকটি রেকর্ড করুন')}
                </button>
                <button onClick={onClose} className="w-full text-[13px] font-semibold" style={{ height: 36, color: MUTED }}>
                  {tr('Done', 'শেষ')}
                </button>
              </div>
            </div>
          )}
        </div>

        {step === 'form' && (
          <div className="border-t p-4" style={{ borderColor: RULE, background: '#fbf9f4' }}>
            <button
              onClick={save} disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] text-[15px] font-semibold text-white transition-[filter] hover:brightness-110 disabled:opacity-60"
              style={{ height: 48, background: direction === 'in' ? 'linear-gradient(180deg,#12855a,#0b5c3d)' : 'linear-gradient(180deg,#e2560f,#b8400d)' }}
            >
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {tr('Saving…', 'সংরক্ষণ…')}</>
                : <>{direction === 'in' ? tr('Record donation', 'অনুদান রেকর্ড করুন') : tr('Record expense', 'ব্যয় রেকর্ড করুন')}{amountNow ? ` · ${fmt.money(Number(amountNow) || 0)}` : ''}</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BigChoice({
  icon: Icon, label, hint, fg, bg, border, onClick,
}: {
  icon: typeof ArrowDownLeft; label: string; hint: string;
  fg: string; bg: string; border: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-[14px] p-4 text-left transition-[filter] hover:brightness-[0.98]"
      style={{ background: bg, border: `1px solid ${border}`, minHeight: 128 }}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: PAPER, color: fg }}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-[16px] font-bold" style={{ color: fg }}>{label}</span>
      <span className="text-[11.5px] leading-snug" style={{ color: MUTED }}>{hint}</span>
    </button>
  );
}
