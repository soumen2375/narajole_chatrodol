/**
 * The two money forms, defined once.
 *
 * A donation recorded from the Finance dashboard and one recorded from the
 * Donations page are the same transaction, so they are the same form — same
 * fields, same validation, same insert. Ditto expenses. Anything that needs to
 * change about how money is entered changes here, once.
 */
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import type { CswoPaymentMethod, PaymentGateway } from '@/types';
import { Camera, Check, Loader2 } from 'lucide-react';

/* ── Shared look ─────────────────────────────────────────────────────────── */
export const PAPER = '#ffffff';
export const RULE = '#e6e0d0';
export const INK = '#191713';
export const INK2 = '#33302a';
export const MUTED = '#8a8171';
export const FIELD = '#f8f6f0';
export const GREEN = '#0e6f4a';
export const BRAND = '#c2410c';
export const SERIF = '"Noto Serif Bengali", "Noto Serif", Georgia, serif';
export const MONO = '"DM Mono", "Roboto Mono", ui-monospace, monospace';

export const inputStyle = {
  height: 44, background: FIELD, border: `1px solid ${RULE}`, borderRadius: 10,
  color: INK, fontSize: 15, outline: 'none', width: '100%', padding: '0 12px',
} as const;

export const todayISO = () => new Date().toISOString().slice(0, 10);

/** Chosen date + current clock time, resolved locally so back-dated entries
 *  land in the right ledger period. */
export const stampFor = (date: string) =>
  new Date(`${date}T${new Date().toTimeString().slice(0, 8)}`).toISOString();

export interface EventOpt { id: string; title: string }
export interface BankOpt { id: string; label: string; account_name: string; account_number: string }

/** Events and online bank accounts, loaded once per form. */
export function useMoneyRefs() {
  const [events, setEvents] = useState<EventOpt[]>([]);
  const [banks, setBanks] = useState<BankOpt[]>([]);
  useEffect(() => {
    supabase.from('cswo_events').select('id,title').order('event_date', { ascending: false })
      .then(({ data }) => setEvents((data ?? []) as EventOpt[]));
    // The cash wallet is not a destination you pick — cash routes there itself.
    supabase.from('cswo_bank_accounts').select('id,label,account_name,account_number,account_type')
      .eq('is_active', true).neq('account_type', 'cash').order('sort_order')
      .then(({ data }) => setBanks((data ?? []) as BankOpt[]));
  }, []);
  return { events, banks };
}

/* ── Small building blocks ───────────────────────────────────────────────── */
export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[10px] font-semibold uppercase" style={{ fontFamily: MONO, letterSpacing: '.12em', color: MUTED }}>
      {children}
    </label>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px]" style={{ color: MUTED }}>{children}</p>;
}

function AmountField({ value, onChange, accent }: { value: string; onChange: (v: string) => void; accent: string }) {
  const { lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  return (
    <div>
      <Label>{tr('Amount', 'পরিমাণ')} *</Label>
      <div className="flex items-center gap-2 rounded-[10px] px-3" style={{ height: 56, background: FIELD, border: `1px solid ${RULE}` }}>
        <span className="text-[22px] font-semibold" style={{ color: MUTED }}>₹</span>
        <input
          type="number" inputMode="decimal" min={1}
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-full border-none bg-transparent text-[26px] font-bold outline-none"
          style={{ fontFamily: SERIF, color: accent }}
        />
      </div>
    </div>
  );
}

/** Cash or Online. Online needs a bank account; cash goes to the wallet. */
function PaidByField({
  paidBy, bankId, banks, accent, tint, onPaidBy, onBank,
}: {
  paidBy: PaidBy; bankId: string; banks: BankOpt[]; accent: string; tint: string;
  onPaidBy: (v: PaidBy) => void; onBank: (v: string) => void;
}) {
  const { lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  return (
    <div>
      <Label>{tr('Cash or online', 'নগদ না অনলাইন')}</Label>
      <div className="grid grid-cols-2 gap-2">
        {([
          { v: 'cash' as PaidBy, l: tr('Cash', 'নগদ'), h: tr('goes to wallet', 'ওয়ালেটে যাবে') },
          { v: 'online' as PaidBy, l: tr('Online', 'অনলাইন'), h: tr('goes to bank', 'ব্যাংকে যাবে') },
        ]).map((o) => {
          const on = paidBy === o.v;
          return (
            <button
              key={o.v} type="button" onClick={() => onPaidBy(o.v)}
              className="rounded-[10px] px-2 text-[13.5px] font-semibold transition-colors"
              style={{
                height: 44,
                border: `1.5px solid ${on ? accent : RULE}`,
                background: on ? tint : FIELD,
                color: on ? accent : INK2,
              }}
            >
              {o.l}
              <span className="ml-1.5 text-[10.5px] font-normal" style={{ color: MUTED }}>{o.h}</span>
            </button>
          );
        })}
      </div>
      {paidBy === 'online' && (
        <select value={bankId} onChange={(e) => onBank(e.target.value)} style={{ ...inputStyle, marginTop: 8 }}>
          <option value="">{tr('— Choose bank account —', '— ব্যাংক অ্যাকাউন্ট বাছুন —')}</option>
          {banks.map((b) => (
            <option key={b.id} value={b.id}>{b.label}{b.account_number ? ` (${b.account_number.slice(-4)})` : ''}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function EventField({ value, onChange, events }: { value: string; onChange: (v: string) => void; events: EventOpt[] }) {
  const { lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  return (
    <div>
      <Label>{tr('Allocate to event', 'অনুষ্ঠানে বরাদ্দ')}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        <option value="">{tr('— Not allocated —', '— অনির্ধারিত —')}</option>
        {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
      </select>
      <Hint>{tr('Optional. Can also be changed later on the Ledger page.', 'ঐচ্ছিক। পরে লেজার পাতাতেও বদলানো যাবে।')}</Hint>
    </div>
  );
}

export type PaidBy = 'cash' | 'online';
const METHOD: Record<PaidBy, CswoPaymentMethod> = { cash: 'cash', online: 'online' };

/* ── Donation ────────────────────────────────────────────────────────────── */
export interface DonationDraft {
  amount: string;
  donor_name: string;
  donor_email: string;
  donor_phone: string;
  date: string;
  paidBy: PaidBy;
  bank_account_id: string;
  event_id: string;
  note: string;
  /** Kept when editing so an existing receipt number is not reissued. */
  receipt_number?: string;
}

export const emptyDonationDraft = (): DonationDraft => ({
  amount: '', donor_name: '', donor_email: '', donor_phone: '',
  date: todayISO(), paidBy: 'cash', bank_account_id: '', event_id: '', note: '',
});

/** Turn a stored donation row back into a draft the shared form can edit. */
export function donationToDraft(d: {
  amount: number; donor_name: string | null; donor_email: string | null;
  donor_phone: string | null; created_at: string; payment_method: CswoPaymentMethod;
  bank_account_id?: string | null; event_id: string | null; purpose: string | null;
  receipt_number: string | null;
}): DonationDraft {
  return {
    amount: String(d.amount),
    donor_name: d.donor_name ?? '',
    donor_email: d.donor_email ?? '',
    donor_phone: d.donor_phone ?? '',
    date: d.created_at.slice(0, 10),
    paidBy: d.payment_method === 'cash' ? 'cash' : 'online',
    bank_account_id: d.bank_account_id ?? '',
    event_id: d.event_id ?? '',
    note: d.purpose ?? '',
    receipt_number: d.receipt_number ?? undefined,
  };
}

export function DonationFields({
  draft, onChange, events, banks,
}: {
  draft: DonationDraft; onChange: (d: DonationDraft) => void;
  events: EventOpt[]; banks: BankOpt[];
}) {
  const { lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const set = <K extends keyof DonationDraft>(k: K, v: DonationDraft[K]) => onChange({ ...draft, [k]: v });

  return (
    <div className="flex flex-col gap-3.5">
      <AmountField value={draft.amount} onChange={(v) => set('amount', v)} accent={GREEN} />

      <div>
        <Label>{tr('Donor name', 'দাতার নাম')} *</Label>
        <input value={draft.donor_name} onChange={(e) => set('donor_name', e.target.value)}
          placeholder={tr('Full name', 'পুরো নাম')} style={inputStyle} />
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <Label>{tr('Donor email', 'দাতার ইমেল')}</Label>
          <input type="email" value={draft.donor_email} onChange={(e) => set('donor_email', e.target.value)}
            placeholder={tr('Email', 'ইমেল')} style={inputStyle} />
        </div>
        <div>
          <Label>{tr('Donor mobile', 'দাতার মোবাইল')}</Label>
          <input value={draft.donor_phone} onChange={(e) => set('donor_phone', e.target.value)}
            placeholder={tr('Phone number', 'ফোন নম্বর')} style={inputStyle} />
        </div>
      </div>

      <div>
        <Label>{tr('Date', 'তারিখ')}</Label>
        <input type="date" value={draft.date} max={todayISO()} onChange={(e) => set('date', e.target.value)} style={inputStyle} />
      </div>

      <PaidByField
        paidBy={draft.paidBy} bankId={draft.bank_account_id} banks={banks}
        accent={GREEN} tint="#ecfaf3"
        onPaidBy={(v) => onChange({ ...draft, paidBy: v, bank_account_id: v === 'cash' ? '' : draft.bank_account_id })}
        onBank={(v) => set('bank_account_id', v)}
      />

      <EventField value={draft.event_id} onChange={(v) => set('event_id', v)} events={events} />

      <div>
        <Label>{tr('Notes', 'নোট')}</Label>
        <input value={draft.note} onChange={(e) => set('note', e.target.value)}
          placeholder={tr('What was it for?', 'কীসের জন্য?')} style={inputStyle} />
      </div>
    </div>
  );
}

export interface SavedDonation { receiptNumber: string; name: string; amount: number; date: string; purpose: string; method: string; }

export function validateDonation(d: DonationDraft, lang: 'en' | 'bn'): string | null {
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  if (!Number(d.amount) || Number(d.amount) <= 0) return tr('Enter a valid amount.', 'সঠিক পরিমাণ লিখুন।');
  if (!d.donor_name.trim()) return tr('Enter the donor’s name.', 'দাতার নাম লিখুন।');
  if (d.paidBy === 'online' && !d.bank_account_id) return tr('Choose which bank account received it.', 'কোন ব্যাংক অ্যাকাউন্টে এসেছে বাছুন।');
  return null;
}

/** Pass `existingId` to edit a manual donation instead of recording a new one. */
export async function saveDonation(d: DonationDraft, meId: string | null, lang: 'en' | 'bn', existingId?: string): Promise<SavedDonation> {
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const receiptNumber = d.receipt_number || `CSWO-OFF-${Date.now().toString().slice(-8)}`;
  const purpose = d.note.trim() || tr('Donation', 'দান');

  const payload = {
    donor_name: d.donor_name.trim(),
    donor_email: d.donor_email.trim() || null,
    donor_phone: d.donor_phone.trim() || null,
    amount: Number(d.amount),
    currency: 'INR',
    purpose,
    status: 'paid',
    payment_gateway: 'offline' as PaymentGateway,
    payment_method: METHOD[d.paidBy],
    receipt_number: receiptNumber,
    is_anonymous: false,
    event_id: d.event_id || null,
    bank_account_id: d.paidBy === 'online' ? (d.bank_account_id || null) : null,
    member_id: meId,
    created_at: stampFor(d.date),
  };
  const { error } = existingId
    ? await supabase.from('cswo_donations').update(payload).eq('id', existingId)
    : await supabase.from('cswo_donations').insert(payload);
  if (error) throw new Error(error.message);

  return {
    receiptNumber, name: d.donor_name.trim(), amount: Number(d.amount), date: d.date, purpose,
    method: d.paidBy === 'cash' ? tr('Cash', 'নগদ') : tr('Online', 'অনলাইন'),
  };
}

/* ── Expense ─────────────────────────────────────────────────────────────── */
export interface ExpenseDraft {
  amount: string;
  vendor: string;
  date: string;
  paidBy: PaidBy;
  bank_account_id: string;
  event_id: string;
  note: string;
  receipt_image: string;
}

export const emptyExpenseDraft = (): ExpenseDraft => ({
  amount: '', vendor: '', date: todayISO(), paidBy: 'cash',
  bank_account_id: '', event_id: '', note: '', receipt_image: '',
});

export function ExpenseFields({
  draft, onChange, events, banks,
}: {
  draft: ExpenseDraft; onChange: (d: ExpenseDraft) => void;
  events: EventOpt[]; banks: BankOpt[];
}) {
  const { lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const set = <K extends keyof ExpenseDraft>(k: K, v: ExpenseDraft[K]) => onChange({ ...draft, [k]: v });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [upErr, setUpErr] = useState('');

  const upload = async (file: File) => {
    setUploading(true); setUpErr('');
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `expense-receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from('cswo-media').upload(path, file);
    if (error) { setUpErr(tr('Upload failed: ', 'আপলোড ব্যর্থ: ') + error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('cswo-media').getPublicUrl(data.path);
    set('receipt_image', publicUrl);
    setUploading(false);
  };

  return (
    <div className="flex flex-col gap-3.5">
      <AmountField value={draft.amount} onChange={(v) => set('amount', v)} accent={BRAND} />

      <div>
        <Label>{tr('Paid to', 'কাকে দেওয়া হল')}</Label>
        <input value={draft.vendor} onChange={(e) => set('vendor', e.target.value)}
          placeholder={tr('Vendor / person', 'দোকান / ব্যক্তি')} style={inputStyle} />
      </div>

      <div>
        <Label>{tr('Date', 'তারিখ')}</Label>
        <input type="date" value={draft.date} max={todayISO()} onChange={(e) => set('date', e.target.value)} style={inputStyle} />
      </div>

      <PaidByField
        paidBy={draft.paidBy} bankId={draft.bank_account_id} banks={banks}
        accent={BRAND} tint="#fff5ec"
        onPaidBy={(v) => onChange({ ...draft, paidBy: v, bank_account_id: v === 'cash' ? '' : draft.bank_account_id })}
        onBank={(v) => set('bank_account_id', v)}
      />

      <EventField value={draft.event_id} onChange={(v) => set('event_id', v)} events={events} />

      <div>
        <Label>{tr('Notes', 'নোট')}</Label>
        <input value={draft.note} onChange={(e) => set('note', e.target.value)}
          placeholder={tr('What was bought?', 'কী কেনা হল?')} style={inputStyle} />
      </div>

      <div>
        <Label>{tr('Photo of the bill', 'বিলের ছবি')}</Label>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
        <button
          type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] text-[13.5px] font-semibold disabled:opacity-60"
          style={{ height: 44, border: `1px dashed ${draft.receipt_image ? '#c8e7d8' : RULE}`, background: draft.receipt_image ? '#ecfaf3' : FIELD, color: draft.receipt_image ? GREEN : INK2 }}
        >
          {uploading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> {tr('Uploading…', 'আপলোড হচ্ছে…')}</>
            : draft.receipt_image
              ? <><Check className="h-4 w-4" /> {tr('Photo attached — tap to replace', 'ছবি যুক্ত — বদলাতে চাপুন')}</>
              : <><Camera className="h-4 w-4" /> {tr('Take / choose a photo', 'ছবি তুলুন বা বাছুন')}</>}
        </button>
        {upErr && <Hint>{upErr}</Hint>}
      </div>
    </div>
  );
}

export function validateExpense(d: ExpenseDraft, lang: 'en' | 'bn'): string | null {
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  if (!Number(d.amount) || Number(d.amount) <= 0) return tr('Enter a valid amount.', 'সঠিক পরিমাণ লিখুন।');
  if (!d.date) return tr('Pick a date.', 'তারিখ বাছুন।');
  if (d.paidBy === 'online' && !d.bank_account_id) return tr('Choose which bank account paid it.', 'কোন ব্যাংক অ্যাকাউন্ট থেকে গেছে বাছুন।');
  return null;
}

export interface SavedExpense { vendor: string; amount: number; date: string; note: string; method: string; }

/** Pass `existingId` to edit an expense instead of recording a new one. */
export async function saveExpense(d: ExpenseDraft, meId: string, lang: 'en' | 'bn', existingId?: string): Promise<SavedExpense> {
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  // Recorded means spent — it reaches the ledger and the wallet/bank at once.
  const payload = {
    event_id: d.event_id || null,
    amount: Number(d.amount),
    spent_on: d.date,
    vendor: d.vendor.trim(),
    description: d.note.trim(),
    payment_method: METHOD[d.paidBy],
    receipt_image: d.receipt_image.trim() || null,
    status: 'approved',
    recorded_by: meId,
    approved_by: meId,
    bank_account_id: d.paidBy === 'online' ? (d.bank_account_id || null) : null,
  };
  const { error } = existingId
    ? await supabase.from('cswo_expenses').update(payload).eq('id', existingId)
    : await supabase.from('cswo_expenses').insert(payload);
  if (error) throw new Error(error.message);

  return {
    vendor: d.vendor.trim(), amount: Number(d.amount), date: d.date, note: d.note.trim(),
    method: d.paidBy === 'cash' ? tr('Cash', 'নগদ') : tr('Online', 'অনলাইন'),
  };
}

/** Turn a stored expense row back into a draft the shared form can edit. */
export function expenseToDraft(e: {
  amount: number; spent_on: string; vendor: string; description: string;
  payment_method: CswoPaymentMethod; receipt_image: string | null;
  bank_account_id: string | null; event_id: string | null;
}): ExpenseDraft {
  return {
    amount: String(e.amount),
    vendor: e.vendor ?? '',
    date: e.spent_on,
    paidBy: e.payment_method === 'cash' ? 'cash' : 'online',
    bank_account_id: e.bank_account_id ?? '',
    event_id: e.event_id ?? '',
    note: e.description ?? '',
    receipt_image: e.receipt_image ?? '',
  };
}
