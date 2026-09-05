import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer, Search, QrCode, CheckSquare, Square, ExternalLink } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { useFmt } from '@/lib/format';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { memberDisplayId } from '@/types';
import { memberVerifyUrl } from '@/lib/memberQr';
import { idCardCss, idCardHtml, printIdCards, type IdCardMember } from '@/lib/idCard';

/** Canvas size behind each QR — 256px across a 16mm print is ~400dpi. */
const QR_PX = 256;

const CARD_FIELDS = 'id, full_name, avatar_url, blood_group, phone, designation, member_serial, joined_at, verify_token';

/**
 * Printable member ID cards.
 *
 * Each card carries the QR that opens `/verify/<token>`, so anyone can check a
 * card against the site. Cards are laid out nine to an A4 sheet in a print
 * window — see lib/idCard.ts, which owns the card markup for both this preview
 * and the printed sheet.
 */
export default function AdminMemberCards() {
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [members, setMembers] = useState<IdCardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // QR canvases are rendered offscreen once, harvested to data URLs, then dropped.
  const qrCanvases = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const [qrUrls, setQrUrls] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('cswo_members')
        .select(CARD_FIELDS)
        .eq('status', 'approved')
        .order('member_serial', { ascending: true });

      const rows = (data ?? []) as IdCardMember[];
      setMembers(rows);
      setSelected(new Set(rows.map((r) => r.id)));
      setLoading(false);
    })();
  }, []);

  // One pass after the offscreen canvases mount.
  useEffect(() => {
    if (!members.length || qrUrls.size) return;
    const id = window.setTimeout(() => {
      const next = new Map<string, string>();
      for (const m of members) {
        const canvas = qrCanvases.current.get(m.id);
        if (canvas) next.set(m.id, canvas.toDataURL('image/png'));
      }
      if (next.size) setQrUrls(next);
    }, 60);
    return () => window.clearTimeout(id);
  }, [members, qrUrls.size]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      m.full_name.toLowerCase().includes(q) ||
      (m.phone ?? '').toLowerCase().includes(q) ||
      memberDisplayId(m).toLowerCase().includes(q));
  }, [members, search]);

  const selectedList = useMemo(
    () => filtered.filter((m) => selected.has(m.id)),
    [filtered, selected],
  );

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const allShownSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id));

  const toggleAllShown = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allShownSelected) filtered.forEach((m) => next.delete(m.id));
    else filtered.forEach((m) => next.add(m.id));
    return next;
  });

  const handlePrint = useCallback(() => {
    const cards = selectedList
      .map((m) => {
        const qr = qrUrls.get(m.id);
        return qr ? idCardHtml(m, qr) : '';
      })
      .filter(Boolean);

    if (!cards.length) return;
    if (!printIdCards(cards)) {
      alert(tr(
        'Your browser blocked the print window. Allow pop-ups for this site and try again.',
        'ব্রাউজার প্রিন্ট উইন্ডো আটকে দিয়েছে। এই সাইটের জন্য পপ-আপ অনুমোদন করে আবার চেষ্টা করুন।',
      ));
    }
  }, [selectedList, qrUrls, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const qrReady = qrUrls.size > 0;

  const previewHtml = useMemo(
    () => selectedList.map((m) => idCardHtml(m, qrUrls.get(m.id) ?? '')).join(''),
    [selectedList, qrUrls],
  );

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      {/* Offscreen QR sources — one canvas per member, read once as PNG. */}
      {!qrReady && (
        <div aria-hidden style={{ position: 'absolute', left: -99999, top: 0 }}>
          {members.map((m) => (
            <QRCodeCanvas
              key={m.id}
              value={memberVerifyUrl(m.verify_token)}
              size={QR_PX}
              level="M"
              marginSize={4}
              ref={(el: HTMLCanvasElement | null) => {
                if (el) qrCanvases.current.set(m.id, el);
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <QrCode className="h-5 w-5 text-emerald-700" />
              {tr('Member ID cards', 'সদস্য পরিচয়পত্র')}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {tr(
                'Every card carries a QR code. Scanning it opens the public verification page for that member — name, photo, blood group, mobile, member ID and joining date.',
                'প্রতিটি কার্ডে একটি QR কোড থাকে। স্ক্যান করলে ওই সদস্যের যাচাই পাতা খোলে — নাম, ছবি, রক্তের গ্রুপ, মোবাইল, সদস্য আইডি ও যোগদানের তারিখ।',
              )}
            </p>
          </div>

          <button
            onClick={handlePrint}
            disabled={!qrReady || selectedList.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Printer className="h-4 w-4" />
            {tr('Print', 'প্রিন্ট')} {fmt.num(selectedList.length)} {tr('cards', 'কার্ড')}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr('Search name, mobile or member ID', 'নাম, মোবাইল বা সদস্য আইডি খুঁজুন')}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>

          <button
            onClick={toggleAllShown}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            {allShownSelected ? <CheckSquare className="h-4 w-4 text-emerald-700" /> : <Square className="h-4 w-4 text-gray-400" />}
            {allShownSelected ? tr('Clear selection', 'নির্বাচন বাতিল') : tr('Select all shown', 'সব নির্বাচন করুন')}
          </button>

          <span className="text-sm text-gray-500">
            {fmt.num(selectedList.length)} / {fmt.num(filtered.length)} {tr('selected', 'নির্বাচিত')}
          </span>
        </div>
      </div>

      {/* Pick list */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-wrap gap-2">
          {filtered.map((m) => {
            const on = selected.has(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${
                  on ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-gray-50 text-gray-500 ring-gray-200'
                }`}
              >
                {on ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                {m.full_name}
                <span className="font-mono text-[10px] opacity-70">{memberDisplayId(m)}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-2 py-6 text-sm text-gray-500">{tr('No members match your search.', 'কোনো সদস্য খুঁজে পাওয়া যায়নি।')}</p>
          )}
        </div>
      </div>

      {/* Preview — the same markup that goes to the printer */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">{tr('Preview', 'প্রিভিউ')}</h2>
          <p className="text-xs text-gray-500">
            {tr('Actual size · 54 × 85.6 mm (CR80) · 9 cards per A4 sheet', 'প্রকৃত মাপ · ৫৪ × ৮৫.৬ মি.মি. (CR80) · A4 প্রতি ৯টি কার্ড')}
          </p>
        </div>

        {!qrReady ? (
          <p className="py-10 text-center text-sm text-gray-500">{tr('Generating QR codes…', 'QR কোড তৈরি হচ্ছে…')}</p>
        ) : selectedList.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">{tr('Select at least one member.', 'অন্তত একজন সদস্য নির্বাচন করুন।')}</p>
        ) : (
          <>
            <style dangerouslySetInnerHTML={{ __html: idCardCss() }} />
            <div className="idcard-sheet" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-gray-500">
        <ExternalLink className="h-3.5 w-3.5" />
        {tr('A single card can also be printed from', 'একটি কার্ড এখান থেকেও প্রিন্ট করা যায়')}{' '}
        <Link to="/admin/members" className="font-semibold text-emerald-700 hover:underline">
          {tr('any member’s profile', 'যেকোনো সদস্যের প্রোফাইল')}
        </Link>
      </p>
    </div>
  );
}
