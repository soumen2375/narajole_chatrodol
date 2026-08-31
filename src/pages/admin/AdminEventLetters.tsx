/**
 * AdminEventLetters — the secretary's letterpad for an event.
 *
 * Writes an official letter on the CSWO letterhead, numbers it from the same
 * register the paper file uses ("3A/83", "3A/84", …), previews it at true A4
 * scale, and posts it to the addressee from info@chhatradol.org with the PDF
 * attached. The stamped copy that comes back is filed against the same number.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Download, FileSignature, Mail, Paperclip, Plus, Printer, Save, Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';
import LetterpadSheet from '@/components/admin/LetterpadSheet';
import {
  LETTER_TEMPLATES, emptyDraft, fetchLetterPdfUrl, fillTemplate, letterFileName,
  sendLetterEmail, unsupportedCharacters, type LetterDraft,
} from '@/lib/letterpad';
import type { CswoEvent, CswoEventLetter } from '@/types';

const TEAL = '#0c756f';
const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const PAPER = '#ffffff';
const CREAM = '#faf8f5';
const MAROON = '#8b0000';

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  draft: { bg: 'rgba(120,113,108,0.12)', fg: '#57534e', label: 'Draft' },
  issued: { bg: 'rgba(180,83,9,0.12)', fg: '#b45309', label: 'Issued' },
  sent: { bg: 'rgba(12,117,111,0.12)', fg: TEAL, label: 'Sent' },
};

function draftOf(letter: CswoEventLetter): LetterDraft {
  return {
    letter_date: letter.letter_date,
    to_name: letter.to_name,
    to_address: letter.to_address,
    to_email: letter.to_email,
    salutation: letter.salutation,
    subject: letter.subject,
    body: letter.body,
    closing: letter.closing,
    signatory_name: letter.signatory_name,
    signatory_role: letter.signatory_role,
    signatory_phone: letter.signatory_phone,
  };
}

export default function AdminEventLetters() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { member } = useAuth();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [event, setEvent] = useState<CswoEvent | null>(null);
  const [letters, setLetters] = useState<CswoEventLetter[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LetterDraft>(emptyDraft());
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [pages, setPages] = useState(1);
  const [confirmSend, setConfirmSend] = useState(false);
  /** Which pane the narrow layout is showing. Ignored from xl up. */
  const [tab, setTab] = useState<'write' | 'preview'>('write');

  const scanRef = useRef<HTMLInputElement>(null);
  const signRef = useRef<HTMLInputElement>(null);

  const selected = letters.find((l) => l.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    const [evR, lR] = await Promise.all([
      supabase.from('cswo_events').select('*').eq('id', id).maybeSingle(),
      supabase.from('cswo_event_letters').select('*').eq('event_id', id).order('created_at', { ascending: false }),
    ]);
    setEvent((evR.data ?? null) as CswoEvent | null);
    const rows = (lR.data ?? []) as CswoEventLetter[];
    setLetters(rows);
    setLoading(false);
    return rows;
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Selecting a letter loads it into the form; an unsaved edit is never
  // silently discarded.
  const select = (letter: CswoEventLetter) => {
    if (dirty && !window.confirm(tr('Discard unsaved changes to the open letter?', 'খোলা চিঠির অসংরক্ষিত পরিবর্তন বাতিল করবেন?'))) return;
    setSelectedId(letter.id);
    setDraft(draftOf(letter));
    setDirty(false);
    setMsg(null);
    setTab('write');
  };

  const edit = (patch: Partial<LetterDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };

  /** Creates the letter, which is where the register number is spent. */
  const createLetter = async (templateId: string) => {
    if (!event) return;
    setBusy('create'); setMsg(null);
    const template = LETTER_TEMPLATES.find((t) => t.id === templateId);
    const base = emptyDraft();
    const payload = {
      ...base,
      event_id: id,
      subject: template ? fillTemplate(template.subject, event) : '',
      body: template ? fillTemplate(template.body, event) : '',
      created_by: member?.id ?? null,
    };
    const { data, error } = await supabase
      .from('cswo_event_letters')
      .insert(payload)
      .select('*')
      .single();
    setBusy(null);
    if (error) { setMsg({ kind: 'err', text: error.message }); return; }
    const row = data as CswoEventLetter;
    setLetters((prev) => [row, ...prev]);
    setSelectedId(row.id);
    setDraft(draftOf(row));
    setDirty(false);
    setTab('write');
  };

  const save = async () => {
    if (!selected) return;
    setBusy('save'); setMsg(null);
    const { data, error } = await supabase
      .from('cswo_event_letters')
      .update({ ...draft, status: selected.status === 'sent' ? 'sent' : 'issued' })
      .eq('id', selected.id)
      .select('*')
      .single();
    setBusy(null);
    if (error) { setMsg({ kind: 'err', text: error.message }); return; }
    setLetters((prev) => prev.map((l) => (l.id === selected.id ? (data as CswoEventLetter) : l)));
    setDirty(false);
    setMsg({ kind: 'ok', text: tr('Letter saved.', 'চিঠি সংরক্ষিত হয়েছে।') });
  };

  const remove = async (letter: CswoEventLetter) => {
    if (!window.confirm(tr(
      `Delete letter ${letter.ref_no}? The register number is not reused.`,
      `${letter.ref_no} চিঠি মুছবেন? রেজিস্টার নম্বরটি আর ব্যবহার হবে না।`,
    ))) return;
    await supabase.from('cswo_event_letters').delete().eq('id', letter.id);
    if (selectedId === letter.id) { setSelectedId(null); setDirty(false); }
    await load();
  };

  /**
   * Renders on the server, so the file the office keeps is the same document
   * the addressee gets. An unsaved edit would not be in it, so it is saved
   * first rather than quietly rendering a stale letter.
   */
  const withPdf = async (action: 'download' | 'print') => {
    if (!selected) return;
    if (dirty) { setMsg({ kind: 'err', text: tr('Save the letter first — the PDF is rendered from the saved copy.', 'আগে চিঠি সংরক্ষণ করুন — সংরক্ষিত কপি থেকেই PDF তৈরি হয়।') }); return; }
    setBusy(action); setMsg(null);
    try {
      const url = await fetchLetterPdfUrl(selected.id);
      if (action === 'download') {
        const a = document.createElement('a');
        a.href = url;
        a.download = letterFileName(selected.ref_no);
        a.click();
      } else {
        // Printing goes through a hidden frame rather than a popup: a new tab
        // hands the PDF to the browser's own viewer, whose print dialog we
        // cannot open from here, and popup blockers eat the tab besides.
        const frame = document.createElement('iframe');
        frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
        frame.src = url;
        frame.onload = () => {
          try { frame.contentWindow?.print(); } catch { window.open(url, '_blank'); }
        };
        document.body.appendChild(frame);
        setTimeout(() => frame.remove(), 60_000);
      }
      // Give the browser time to take the blob before it is released.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    }
    setBusy(null);
  };

  const send = async () => {
    if (!selected) return;
    setConfirmSend(false);
    setBusy('send'); setMsg(null);
    try {
      const result = await sendLetterEmail(selected.id);
      setMsg({ kind: 'ok', text: tr(`Letter ${result.refNo} sent to ${result.sentTo}.`, `${result.refNo} চিঠি ${result.sentTo}-এ পাঠানো হয়েছে।`) });
      await load();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    }
    setBusy(null);
  };

  const uploadTo = async (file: File, field: 'signed_copy_url' | 'signature_url') => {
    if (!selected) return;
    setBusy(field); setMsg(null);
    const ext = file.name.split('.').pop() ?? 'png';
    const path = `event-letters/${id}/${selected.id}-${field}-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('cswo-media').upload(path, file);
    if (error) { setMsg({ kind: 'err', text: error.message }); setBusy(null); return; }
    const { data: { publicUrl } } = supabase.storage.from('cswo-media').getPublicUrl(data.path);
    const patch = field === 'signed_copy_url'
      ? { signed_copy_url: publicUrl, signed_copy_at: new Date().toISOString() }
      : { signature_url: publicUrl };
    await supabase.from('cswo_event_letters').update(patch).eq('id', selected.id);
    setBusy(null);
    await load();
  };

  if (loading) return <TableSkeleton rows={5} />;
  if (!event) return (
    <div className="py-16 text-center">
      <p style={{ color: MUTED }}>{tr('Event not found.', 'অনুষ্ঠান পাওয়া যায়নি।')}</p>
      <button onClick={() => navigate(-1)} className="mt-3 inline-flex items-center gap-1.5 font-semibold bg-transparent border-0 p-0 cursor-pointer" style={{ color: TEAL }}>
        <ArrowLeft className="h-4 w-4" /> {tr('Back', 'ফিরুন')}
      </button>
    </div>
  );

  const badChars = unsupportedCharacters(`${draft.subject}\n${draft.body}\n${draft.to_name}\n${draft.to_address}`);
  const canSend = !!selected && !dirty && draft.to_email.includes('@') && !!draft.subject.trim() && !!draft.body.trim();

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-[13px] font-medium cursor-pointer bg-transparent border-0 p-0 hover:opacity-80" style={{ color: MUTED }}>
        <ArrowLeft className="h-3.5 w-3.5" /> {tr('Back to event', 'অনুষ্ঠানে ফিরুন')}
      </button>

      <div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MAROON }}>
          <FileSignature className="h-3 w-3" /> {tr('Letterpad', 'লেটারপ্যাড')}
        </div>
        <h1 className="mt-1.5 text-[21px] sm:text-[26px] leading-tight break-words" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{event.title}</h1>
        <p className="mt-1 text-[13px]" style={{ color: INK2 }}>
          {tr(
            'Write an official letter on the organization letterhead, number it from the register, and post it from info@chhatradol.org.',
            'সংস্থার লেটারহেডে সরকারি চিঠি লিখুন, রেজিস্টার নম্বর দিন, আর info@chhatradol.org থেকে পাঠান।',
          )}
        </p>
      </div>

      {msg && (
        <div className="rounded-[6px] px-4 py-2.5 text-[13px]" style={msg.kind === 'ok'
          ? { background: 'rgba(12,117,111,0.1)', color: TEAL }
          : { background: 'rgba(194,65,12,0.1)', color: '#c2410c' }}>
          {msg.text}
        </div>
      )}

      {/* ── New letter ────────────────────────────────────────────────────── */}
      <div className="rounded-[10px] p-4 sm:p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{tr('Start a letter', 'নতুন চিঠি')}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {LETTER_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => createLetter(t.id)}
              disabled={busy === 'create'}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-stone-50 disabled:opacity-60"
              style={{ border: `1px solid ${RULE}`, color: INK2 }}
            >
              <Plus className="h-3 w-3" /> {t.label}
            </button>
          ))}
          <button
            onClick={() => createLetter('')}
            disabled={busy === 'create'}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: MAROON }}
          >
            <Plus className="h-3 w-3" /> {tr('Blank letter', 'ফাঁকা চিঠি')}
          </button>
        </div>
        <p className="mt-2.5 text-[12px]" style={{ color: MUTED }}>
          {tr('A register number is assigned as soon as the letter is created, exactly as in the paper file.',
              'কাগজের ফাইলের মতোই, চিঠি তৈরি হওয়ার সঙ্গে সঙ্গেই রেজিস্টার নম্বর বসে যায়।')}
        </p>
      </div>

      {/* ── Register ──────────────────────────────────────────────────────── */}
      <div className="rounded-[10px] p-4 sm:p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{tr('Letter register', 'চিঠির রেজিস্টার')}</div>
        {letters.length === 0 ? (
          <div className="py-10 text-center text-[13px]" style={{ color: MUTED }}>{tr('No letters yet.', 'এখনো কোনো চিঠি নেই।')}</div>
        ) : (
          <div className="mt-2">
            {letters.map((l) => {
              const s = STATUS_STYLE[l.status] ?? STATUS_STYLE.draft;
              return (
                <div key={l.id} className="flex items-start gap-2 py-2.5 sm:items-center sm:gap-3" style={{ borderTop: `1px solid ${RULE}` }}>
                  <button
                    onClick={() => select(l)}
                    className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] font-semibold" style={{ color: MAROON }}>{l.ref_no}</span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
                      {selectedId === l.id && <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEAL }}>{tr('open', 'খোলা')}</span>}
                    </div>
                    <div className="mt-0.5 truncate text-[13.5px] font-medium" style={{ color: INK }}>{l.subject || tr('(no subject)', '(বিষয় নেই)')}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>
                      {l.to_name || tr('no addressee', 'প্রাপক নেই')} · {fmt.date(l.letter_date)}
                      {l.sent_at ? ` · ${tr('sent to', 'পাঠানো')} ${l.sent_to}` : ''}
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    {l.signed_copy_url && (
                      <a href={l.signed_copy_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: TEAL }} aria-label={tr('Signed copy', 'স্বাক্ষরিত কপি')}>
                        <Paperclip className="h-3 w-3 shrink-0" /> <span className="hidden sm:inline">{tr('Signed copy', 'স্বাক্ষরিত কপি')}</span>
                      </a>
                    )}
                    <button onClick={() => remove(l)} className="rounded-full p-1.5 transition-colors hover:bg-black/5" style={{ color: MUTED }} aria-label={tr('Delete letter', 'চিঠি মুছুন')}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Compose + preview ─────────────────────────────────────────────── */}
      {selected && (
        <>
        {/* Below xl the two panes share the screen, so they take turns. The
            form alone is longer than a phone screen; stacking the sheet under
            it would bury the preview several scrolls down. */}
        <div className="flex gap-1 rounded-full p-1 xl:hidden" style={{ background: CREAM, border: `1px solid ${RULE}` }}>
          {([['write', tr('Write', 'লিখুন')], ['preview', tr('Preview', 'প্রিভিউ')]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className="flex-1 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors"
              style={tab === key
                ? { background: PAPER, color: MAROON, boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }
                : { background: 'transparent', color: MUTED }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,500px)]">
          <div
            className={`space-y-4 rounded-[10px] p-4 sm:p-5 ${tab === 'write' ? '' : 'hidden xl:block xl:space-y-4'}`}
            style={{ background: PAPER, border: `1px solid ${RULE}` }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{tr('Ref No.', 'রেফ নং')}</div>
                <div className="font-mono text-[15px] font-semibold" style={{ color: MAROON }}>{selected.ref_no}</div>
              </div>
              <input
                type="date"
                value={draft.letter_date}
                onChange={(e) => edit({ letter_date: e.target.value })}
                className="min-w-0 rounded-[6px] px-3 py-2 text-[13px] outline-none"
                style={{ border: `1px solid ${RULE}`, color: INK }}
              />
            </div>

            <Field label={tr('To (name / designation)', 'প্রাপক (নাম / পদ)')}>
              <input value={draft.to_name} onChange={(e) => edit({ to_name: e.target.value })} placeholder="The Headmaster of …" className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
            </Field>

            <Field label={tr('Address', 'ঠিকানা')} hint={tr('One line per line of the address.', 'ঠিকানার প্রতি লাইন আলাদা করে লিখুন।')}>
              <textarea rows={2} value={draft.to_address} onChange={(e) => edit({ to_address: e.target.value })} className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
            </Field>

            <Field label={tr('Recipient email', 'প্রাপকের ইমেল')} hint={tr('The letter is posted here from info@chhatradol.org.', 'info@chhatradol.org থেকে এখানেই চিঠি যাবে।')}>
              <input type="email" value={draft.to_email} onChange={(e) => edit({ to_email: e.target.value })} placeholder="headmaster@school.edu" className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr('Salutation', 'সম্বোধন')}>
                <input value={draft.salutation} onChange={(e) => edit({ salutation: e.target.value })} className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
              </Field>
              <Field label={tr('Closing', 'সমাপ্তি')}>
                <input value={draft.closing} onChange={(e) => edit({ closing: e.target.value })} className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
              </Field>
            </div>

            <Field label={tr('Subject', 'বিষয়')}>
              <textarea rows={2} value={draft.subject} onChange={(e) => edit({ subject: e.target.value })} className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
            </Field>

            <Field label={tr('Body', 'মূল অংশ')} hint={tr('Leave a blank line between paragraphs.', 'অনুচ্ছেদের মাঝে একটি ফাঁকা লাইন রাখুন।')}>
              <textarea rows={14} value={draft.body} onChange={(e) => edit({ body: e.target.value })} className="w-full rounded-[6px] px-3 py-2 text-[13px] leading-relaxed outline-none" style={{ border: `1px solid ${RULE}`, color: INK, fontFamily: '"Tinos", "Times New Roman", serif' }} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={tr('Signatory', 'স্বাক্ষরকারী')}>
                <input value={draft.signatory_name} onChange={(e) => edit({ signatory_name: e.target.value })} className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
              </Field>
              <Field label={tr('Role', 'পদ')}>
                <input value={draft.signatory_role} onChange={(e) => edit({ signatory_role: e.target.value })} className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
              </Field>
              <Field label={tr('Mobile', 'মোবাইল')}>
                <input value={draft.signatory_phone} onChange={(e) => edit({ signatory_phone: e.target.value })} className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
              </Field>
            </div>

            {badChars.length > 0 && (
              <div className="rounded-[6px] px-4 py-2.5 text-[12.5px]" style={{ background: 'rgba(180,83,9,0.1)', color: '#b45309' }}>
                {tr(
                  `The letterhead prints Latin script only. These characters will come out as “?”: ${badChars.slice(0, 12).join(' ')}`,
                  `লেটারহেডে শুধু ল্যাটিন হরফ ছাপা হয়। এই অক্ষরগুলি “?” হয়ে যাবে: ${badChars.slice(0, 12).join(' ')}`,
                )}
              </div>
            )}

            {pages > 1 && (
              <div className="text-[12px]" style={{ color: MUTED }}>
                {tr(`This letter runs to ${pages} sheets. Every sheet carries the letterhead.`,
                    `এই চিঠি ${pages} পাতায় যাবে। প্রতিটি পাতায় লেটারহেড থাকবে।`)}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={save} disabled={busy === 'save' || !dirty} className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: TEAL }}>
                <Save className="h-3.5 w-3.5" /> {busy === 'save' ? tr('Saving…', 'সংরক্ষণ…') : tr('Save', 'সংরক্ষণ')}
              </button>
              <button onClick={() => withPdf('download')} disabled={!!busy} className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-stone-50 disabled:opacity-50" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
                <Download className="h-3.5 w-3.5" /> {busy === 'download' ? tr('Rendering…', 'তৈরি হচ্ছে…') : tr('Download PDF', 'PDF নামান')}
              </button>
              <button onClick={() => withPdf('print')} disabled={!!busy} className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-stone-50 disabled:opacity-50" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
                <Printer className="h-3.5 w-3.5" /> {tr('Print', 'প্রিন্ট')}
              </button>
              <button onClick={() => setConfirmSend(true)} disabled={!canSend || !!busy} className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: MAROON }}>
                <Mail className="h-3.5 w-3.5" /> {busy === 'send' ? tr('Sending…', 'পাঠানো হচ্ছে…') : tr('Send by email', 'ইমেলে পাঠান')}
              </button>
            </div>
            {!canSend && (
              <p className="text-[12px]" style={{ color: MUTED }}>
                {dirty
                  ? tr('Save the letter to enable sending.', 'পাঠাতে হলে আগে চিঠি সংরক্ষণ করুন।')
                  : tr('A recipient email, a subject and a body are needed before sending.', 'পাঠানোর আগে প্রাপকের ইমেল, বিষয় ও মূল অংশ দরকার।')}
              </p>
            )}

            {/* Attachments */}
            <div className="space-y-2 rounded-[8px] p-4" style={{ background: CREAM }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{tr('Attachments', 'সংযুক্তি')}</div>

              <input ref={scanRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTo(f, 'signed_copy_url'); e.target.value = ''; }} />
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => scanRef.current?.click()} disabled={!!busy} className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors hover:bg-white disabled:opacity-50" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
                  <Paperclip className="h-3 w-3" /> {busy === 'signed_copy_url' ? tr('Uploading…', 'আপলোড…') : tr('Upload signed / received copy', 'স্বাক্ষরিত কপি আপলোড')}
                </button>
                {selected.signed_copy_url && (
                  <a href={selected.signed_copy_url} target="_blank" rel="noreferrer" className="text-[12px] font-semibold" style={{ color: TEAL }}>
                    {tr('View', 'দেখুন')} · {selected.signed_copy_at ? fmt.date(selected.signed_copy_at) : ''}
                  </a>
                )}
              </div>

              <input ref={signRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTo(f, 'signature_url'); e.target.value = ''; }} />
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => signRef.current?.click()} disabled={!!busy} className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors hover:bg-white disabled:opacity-50" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
                  <FileSignature className="h-3 w-3" /> {busy === 'signature_url' ? tr('Uploading…', 'আপলোড…') : tr('Replace signature image', 'স্বাক্ষরের ছবি বদলান')}
                </button>
                <span className="text-[12px]" style={{ color: MUTED }}>
                  {selected.signature_url ? tr('Custom signature in use.', 'কাস্টম স্বাক্ষর ব্যবহৃত হচ্ছে।') : tr("The secretary's signature is used by default.", 'সাধারণভাবে সম্পাদকের স্বাক্ষর ব্যবহার হয়।')}
                </span>
              </div>
            </div>
          </div>

          {/* Live preview.
              While the Write tab is up this collapses to zero height rather
              than `display: none`, so the sheet keeps its width and goes on
              measuring — otherwise the "runs to N sheets" line would be stale
              for anyone who never opened the Preview tab. */}
          <div
            className={`xl:sticky xl:top-4 xl:self-start ${
              tab === 'preview' ? '' : 'h-0 overflow-hidden xl:h-auto xl:overflow-visible'
            }`}
          >
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>
              {tr('Preview — A4', 'প্রিভিউ — A4')}
            </div>
            <LetterpadSheet
              draft={draft}
              refNo={selected.ref_no}
              signatureUrl={selected.signature_url || undefined}
              maxScale={0.62}
              onPageCount={setPages}
            />
          </div>
        </div>
        </>
      )}

      {/* ── Send confirmation ─────────────────────────────────────────────── */}
      {confirmSend && selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4" style={{ background: 'rgba(28,25,23,0.45)' }}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[12px] p-5 sm:p-6" style={{ background: PAPER }}>
            <h2 className="text-[17px] font-semibold" style={{ color: INK }}>{tr('Send this letter?', 'এই চিঠি পাঠাবেন?')}</h2>
            <dl className="mt-4 space-y-1.5 text-[13px]">
              <Row k={tr('From', 'প্রেরক')} v={'Chhatradol Social Welfare Organization <info@chhatradol.org>'} />
              <Row k={tr('To', 'প্রাপক')} v={`${draft.to_name} <${draft.to_email}>`} />
              <Row k="Bcc" v="info@chhatradol.org" />
              <Row k={tr('Attachment', 'সংযুক্তি')} v={letterFileName(selected.ref_no)} />
            </dl>
            <p className="mt-4 text-[12.5px]" style={{ color: MUTED }}>
              {tr('An email cannot be recalled once it leaves.', 'একবার পাঠানো হলে ইমেল আর ফেরানো যায় না।')}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => setConfirmSend(false)} className="rounded-full px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-stone-50" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
                {tr('Cancel', 'বাতিল')}
              </button>
              <button onClick={send} className="rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: MAROON }}>
                {tr('Send now', 'এখনই পাঠান')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{label}</div>
      {children}
      {hint && <p className="mt-1 text-[11.5px]" style={{ color: MUTED }}>{hint}</p>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>{k}</dt>
      <dd className="min-w-0 flex-1 break-words" style={{ color: INK2 }}>{v}</dd>
    </div>
  );
}
