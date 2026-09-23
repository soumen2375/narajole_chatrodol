import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Handshake, Send, FlaskConical, Upload, FileText, Trash2, RefreshCw,
  CheckCircle2, AlertCircle, ImageIcon, ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MediaPickerModal from '@/components/admin/cms/MediaPickerModal';
import {
  DEFAULT_PITCH,
  PARTNER_CAMPAIGN,
  PROPOSAL_PDF_URL,
  buildPartnershipHtml,
  parseRecipients,
  personalisePartnership,
  type PartnerRecipient,
  type PartnershipPitch,
} from '@/lib/partnership';

const DRAFT_KEY = 'cswo-partnership-draft';
const MAX_PER_SEND = 50;
const PROPOSAL_PATH = 'partnership/anandadhara-2026-invitation-letter.pdf';
const STATUSES = ['sent', 'replied', 'partnered', 'declined', 'failed'] as const;

interface OutreachRow {
  id: string;
  company: string;
  contact_name: string;
  email: string;
  status: (typeof STATUSES)[number];
  error: string;
  sent_at: string;
}

interface Draft { pitch: PartnershipPitch; list: string }

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

type Notice = { kind: 'ok' | 'error'; text: string } | null;

const STATUS_STYLE: Record<OutreachRow['status'], string> = {
  sent: 'bg-blue-50 text-blue-700',
  replied: 'bg-amber-50 text-amber-800',
  partnered: 'bg-green-50 text-green-700',
  declined: 'bg-gray-100 text-gray-600',
  failed: 'bg-red-50 text-red-700',
};

export default function AdminPartnerships() {
  const saved = useMemo(loadDraft, []);
  const [pitch, setPitch] = useState<PartnershipPitch>(() => ({ ...DEFAULT_PITCH, ...(saved?.pitch ?? {}) }));
  const [list, setList] = useState(saved?.list ?? '');
  const [history, setHistory] = useState<OutreachRow[]>([]);
  const [allowRepeat, setAllowRepeat] = useState(false);
  const [sending, setSending] = useState<'test' | 'all' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop');
  const [picker, setPicker] = useState(false);
  const [pdfStamp, setPdfStamp] = useState(0);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ pitch, list })); } catch { /* private mode */ }
  }, [pitch, list]);

  const recipients = useMemo(() => parseRecipients(list), [list]);
  const invited = useMemo(
    () => new Set(history.filter((h) => h.status !== 'failed').map((h) => h.email.toLowerCase())),
    [history],
  );
  const fresh = recipients.filter((r) => allowRepeat || !invited.has(r.email.toLowerCase()));

  const html = useMemo(() => buildPartnershipHtml(pitch, { assetBase: window.location.origin }), [pitch]);
  const sample: PartnerRecipient = useMemo(
    () => recipients[0] ?? { company: 'Sample Company Ltd.', name: '', email: '' },
    [recipients],
  );
  const previewHtml = useMemo(() => personalisePartnership(html, sample), [html, sample]);

  const loadHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from('cswo_partner_outreach')
      .select('id,company,contact_name,email,status,error,sent_at')
      .eq('campaign', PARTNER_CAMPAIGN)
      .order('sent_at', { ascending: false })
      .limit(500);
    if (error) setNotice({ kind: 'error', text: `Could not load the outreach register: ${error.message}` });
    else setHistory((data ?? []) as OutreachRow[]);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const set = <K extends keyof PartnershipPitch>(key: K, value: PartnershipPitch[K]) =>
    setPitch((p) => ({ ...p, [key]: value }));

  const removeRecipient = (email: string) =>
    setList((l) => l.split(/\r?\n/).filter((line) => !line.toLowerCase().includes(email.toLowerCase())).join('\n'));

  const uploadProposal = async (file: File) => {
    if (file.type !== 'application/pdf') return setNotice({ kind: 'error', text: 'Choose a PDF file.' });
    setUploading(true);
    setNotice(null);
    // The bucket allows delete and insert but not overwrite, so replace in two steps.
    await supabase.storage.from('cswo-media').remove([PROPOSAL_PATH]);
    const { error } = await supabase.storage.from('cswo-media')
      .upload(PROPOSAL_PATH, file, { contentType: 'application/pdf', cacheControl: '60' });
    setUploading(false);
    if (error) return setNotice({ kind: 'error', text: `Upload failed: ${error.message}` });
    setPdfStamp(Date.now());
    setNotice({ kind: 'ok', text: 'Proposal PDF replaced. Emails now link to (and can attach) the new file.' });
  };

  const send = async (test: boolean) => {
    if (!test) {
      if (!fresh.length) return setNotice({ kind: 'error', text: 'No new companies to invite. Add some, or tick “send again”.' });
      if (fresh.length > MAX_PER_SEND) return setNotice({ kind: 'error', text: `Send to at most ${MAX_PER_SEND} companies at a time.` });
      const names = fresh.slice(0, 8).map((r) => `• ${r.company || r.email}`).join('\n');
      const more = fresh.length > 8 ? `\n…and ${fresh.length - 8} more` : '';
      if (!window.confirm(`Send the Anandadhara 2026 partnership invitation to ${fresh.length} ${fresh.length === 1 ? 'company' : 'companies'}?\n\n${names}${more}\n\nEach gets its own email from info@chhatradol.org. This cannot be undone.`)) return;
    }
    setSending(test ? 'test' : 'all');
    setNotice(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Your session has expired. Please sign in again.');
      const res = await fetch('/api/send-partnership', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: pitch.subject,
          html: buildPartnershipHtml(pitch),
          recipients: test ? recipients.slice(0, 1) : fresh,
          attachProposal: pitch.attachProposal,
          test,
          allowRepeat,
        }),
      });
      const out = await res.json().catch(() => ({ error: 'Could not read the server response' }));
      if (!res.ok) throw new Error(out.error || `Send failed (${res.status})`);
      const failed = (out.failed ?? []) as { email: string; error?: string }[];
      const skipped = (out.skipped ?? []) as string[];
      setNotice({
        kind: failed.length ? 'error' : 'ok',
        text: test
          ? `Test sent to your own email, addressed to ${sample.name || `${sample.company || 'your organisation'} Team`}.`
          : `Sent to ${out.sent} ${out.sent === 1 ? 'company' : 'companies'}.` +
            (skipped.length ? ` Skipped ${skipped.length} already invited.` : '') +
            (failed.length ? ` ${failed.length} failed: ${failed.map((f) => `${f.email} (${f.error})`).join('; ')}` : ''),
      });
      if (!test) await loadHistory();
    } catch (e) {
      setNotice({ kind: 'error', text: (e as Error).message });
    }
    setSending(null);
  };

  const updateStatus = async (row: OutreachRow, status: OutreachRow['status']) => {
    setHistory((h) => h.map((r) => (r.id === row.id ? { ...r, status } : r)));
    const { error } = await supabase.from('cswo_partner_outreach').update({ status }).eq('id', row.id);
    if (error) {
      setNotice({ kind: 'error', text: `Could not update ${row.company || row.email}: ${error.message}` });
      loadHistory();
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    history.forEach((h) => { c[h.status] = (c[h.status] ?? 0) + 1; });
    return c;
  }, [history]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Handshake className="h-6 w-6" /> Partnership Outreach
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Invite companies and brands to partner with Anandadhara 2026. Each receives a personal email with the CSR proposal.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(['sent', 'replied', 'partnered', 'declined', 'failed'] as const).map((s) => (
          <div key={s} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-xs capitalize text-gray-500">{s === 'sent' ? 'Invited' : s}</p>
            <p className="text-2xl font-extrabold text-gray-900">{counts[s] ?? 0}</p>
          </div>
        ))}
      </div>

      {notice && (
        <div className={`mb-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${notice.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
          {notice.kind === 'ok' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span className="break-words">{notice.text}</span>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_660px]">
        <div className="space-y-5">
          {/* ── Companies ─────────────────────────────────────────── */}
          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-1 font-semibold text-gray-900">1. Companies to invite</h2>
            <p className="mb-2 text-xs text-gray-500">
              One per line: <code className="rounded bg-gray-100 px-1">Company, Contact person, email</code>. The contact person is optional.
            </p>
            <textarea rows={6} className="input w-full font-mono text-xs" value={list}
              placeholder={'Tata Steel, Ms. Priya Sen, csr@tatasteel.example\nAmul, , partnerships@amul.example'}
              onChange={(e) => setList(e.target.value)} />
            {recipients.length > 0 && (
              <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-gray-50 text-gray-500">
                    <tr><th className="px-3 py-2">Company</th><th className="px-3 py-2">Addressed to</th><th className="px-3 py-2">Email</th><th /></tr>
                  </thead>
                  <tbody>
                    {recipients.map((r) => {
                      const done = invited.has(r.email.toLowerCase());
                      return (
                        <tr key={r.email} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-medium text-gray-900">{r.company || <span className="text-gray-400">—</span>}</td>
                          <td className="px-3 py-2">{r.name || `${r.company || 'Your organisation'} Team`}</td>
                          <td className="px-3 py-2">
                            {r.email}
                            {done && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800">already invited</span>}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button onClick={() => removeRecipient(r.email)} className="rounded p-1 text-red-500 hover:bg-red-50" title="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <label className="mt-3 flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={allowRepeat} onChange={(e) => setAllowRepeat(e.target.checked)} />
              Send again to companies already invited
            </label>
          </section>

          {/* ── Letter ────────────────────────────────────────────── */}
          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-3 font-semibold text-gray-900">2. The letter</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-gray-600">Subject</span>
                <input className="input w-full text-sm" value={pitch.subject} onChange={(e) => set('subject', e.target.value)} />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-gray-600">Opening (after “Dear …,”). Use {'{{company}}'} for the company name.</span>
                <textarea rows={7} className="input w-full text-sm" value={pitch.opening} onChange={(e) => set('opening', e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Signed by</span>
                <input className="input w-full text-sm" value={pitch.senderName} onChange={(e) => set('senderName', e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Designation</span>
                <input className="input w-full text-sm" value={pitch.senderRole} onChange={(e) => set('senderRole', e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Phone</span>
                <input className="input w-full text-sm" value={pitch.senderPhone} onChange={(e) => set('senderPhone', e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Email</span>
                <input className="input w-full text-sm" value={pitch.senderEmail} onChange={(e) => set('senderEmail', e.target.value)} />
              </label>
              <div className="flex items-center gap-3 sm:col-span-2">
                <img src={pitch.poster} alt="" className="h-16 w-12 rounded object-cover ring-1 ring-gray-200" />
                <input className="input min-w-0 flex-1 text-xs" value={pitch.poster} onChange={(e) => set('poster', e.target.value)} />
                <button onClick={() => setPicker(true)} className="btn-secondary inline-flex items-center gap-1 text-sm">
                  <ImageIcon className="h-4 w-4" /> Poster
                </button>
              </div>
              <button onClick={() => setPitch(DEFAULT_PITCH)} className="justify-self-start text-xs text-gray-500 underline sm:col-span-2">
                Reset the letter to the default wording
              </button>
            </div>
          </section>

          {/* ── Invitation Letter & Proposal ─────────────────────────── */}
          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-2 font-semibold text-gray-900">3. Official Invitation Letter & Proposal</h2>
            <div className="flex flex-wrap items-center gap-2">
              <a href={`${PROPOSAL_PDF_URL}?v=${pdfStamp}`} target="_blank" rel="noreferrer"
                className="btn-secondary inline-flex items-center gap-1.5 text-sm">
                <FileText className="h-4 w-4" /> View Letter PDF <ExternalLink className="h-3 w-3" />
              </a>
              <label className={`btn-secondary inline-flex cursor-pointer items-center gap-1.5 text-sm ${uploading ? 'opacity-60' : ''}`}>
                <Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Replace PDF'}
                <input type="file" accept="application/pdf" className="hidden" disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProposal(f); e.target.value = ''; }} />
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={pitch.attachProposal} onChange={(e) => set('attachProposal', e.target.checked)} />
              Attach the official letter copy (PDF) to each email (it is always linked)
            </label>
            <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Each company email links to and attaches the official 2-page CSWO invitation letter (Ref. 3A/125), containing the YouTube video link and the Anandadhara 2026 campaign poster.
            </p>
          </section>

          {/* ── Send ──────────────────────────────────────────────── */}
          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-1 font-semibold text-gray-900">4. Send</h2>
            <p className="mb-3 text-xs text-gray-500">
              From info@chhatradol.org, one email per company, with a copy to the office. Up to {MAX_PER_SEND} per send.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => send(true)} disabled={!!sending} className="btn-secondary inline-flex items-center gap-1.5 text-sm">
                <FlaskConical className="h-4 w-4" /> {sending === 'test' ? 'Sending…' : 'Send test to me'}
              </button>
              <button onClick={() => send(false)} disabled={!!sending || !fresh.length} className="btn-primary inline-flex items-center gap-1.5 text-sm">
                <Send className="h-4 w-4" />
                {sending === 'all' ? 'Sending…' : `Send to ${fresh.length} ${fresh.length === 1 ? 'company' : 'companies'}`}
              </button>
            </div>
          </section>

          {/* ── Register ──────────────────────────────────────────── */}
          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Outreach register</h2>
              <button onClick={loadHistory} className="rounded p-1 text-gray-500 hover:bg-gray-100" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
            </div>
            {history.length ? (
              <div className="max-h-96 overflow-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-gray-50 text-gray-500">
                    <tr><th className="px-3 py-2">Company</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Sent</th><th className="px-3 py-2">Status</th></tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{h.company || '—'}</div>
                          {h.contact_name && <div className="text-gray-500">{h.contact_name}</div>}
                        </td>
                        <td className="px-3 py-2">{h.email}{h.error && <div className="text-red-600">{h.error}</div>}</td>
                        <td className="whitespace-nowrap px-3 py-2">{new Date(h.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                        <td className="px-3 py-2">
                          <select value={h.status} onChange={(e) => updateStatus(h, e.target.value as OutreachRow['status'])}
                            className={`rounded-full border-0 px-2 py-1 text-xs capitalize ${STATUS_STYLE[h.status]}`}>
                            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No invitations sent yet.</p>
            )}
          </section>
        </div>

        {/* ── Preview ────────────────────────────────────────────── */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-2 text-xs text-gray-500">
              <span className="min-w-0 truncate">
                <b className="text-gray-700">Preview</b> · as {sample.company || 'your organisation'} sees it
              </span>
              <div className="flex shrink-0 overflow-hidden rounded-full ring-1 ring-gray-200">
                {(['desktop', 'phone'] as const).map((d) => (
                  <button key={d} onClick={() => setDevice(d)}
                    className={`px-3 py-1 capitalize ${device === d ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-center bg-gray-100">
              <iframe title="Partnership invitation preview" srcDoc={previewHtml}
                className="h-[80vh] border-0 bg-white"
                style={{ width: device === 'phone' ? 375 : '100%' }} />
            </div>
          </div>
        </div>
      </div>

      <MediaPickerModal open={picker} onClose={() => setPicker(false)}
        onSelect={(url) => { set('poster', url); setPicker(false); }} title="Choose the poster" />
    </div>
  );
}
