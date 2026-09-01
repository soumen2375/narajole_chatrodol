import { useEffect, useMemo, useState } from 'react';
import { Search, Phone, MapPin, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';
import DonorDetailModal from '@/components/blood/DonorDetailModal';
import {
  buildDonorProfiles, normalizeDonorRows, DONOR_SELECT, ELIGIBILITY_MONTHS,
  type DonorProfile,
} from '@/lib/bloodDonors';

// ════════════════════════════════════════════════════════════════
//  AdminBloodDonors — one row per person across every blood camp.
//  Urgent search narrows by group; the eligibility filter hides
//  anyone who donated within the last 3 months. Click a row for the
//  full record and the donor's camp-by-camp history.
// ════════════════════════════════════════════════════════════════

const TEAL   = '#0c756f';
const RED    = '#b91c1c';
const GREEN  = '#15803d';
const INK    = '#1c1917';
const INK2   = '#44403c';
const MUTED  = '#78716c';
const RULE   = '#e7e5e4';
const PAPER  = '#ffffff';
const CREAM  = '#faf8f5';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const BG_COLORS: Record<string, string> = {
  'A+':'#dc2626','A-':'#b91c1c','B+':'#1d4ed8','B-':'#1e40af',
  'AB+':'#7c3aed','AB-':'#6d28d9','O+':'#047857','O-':'#065f46',
};

function BgBadge({ g }: { g: string }) {
  const bg = BG_COLORS[g] ?? '#78716c';
  return <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: bg }}>{g || '?'}</span>;
}

type EligibilityFilter = 'all' | 'eligible' | 'waiting';

export default function AdminBloodDonors() {
  const { lang } = useT();
  const fmt      = useFmt();
  const tr       = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [donors,  setDonors]  = useState<DonorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DonorProfile | null>(null);

  /* filters */
  const [urgentGroup, setUrgentGroup] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [eligFilter, setEligFilter]   = useState<EligibilityFilter>('all');
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(0);
  const PER_PAGE = 25;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('cswo_blood_donors')
        .select(DONOR_SELECT)
        .order('created_at', { ascending: false });
      setDonors(buildDonorProfiles(normalizeDonorRows(data)));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const grp = urgentGroup || filterGroup;
    return donors.filter((d) => {
      if (grp && d.blood_group !== grp) return false;
      if (eligFilter === 'eligible' && !d.eligible) return false;
      if (eligFilter === 'waiting' && d.eligible) return false;
      if (q && !`${d.name} ${d.phone} ${d.address} ${d.donor_code ?? ''} ${d.aadhar}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [donors, urgentGroup, filterGroup, eligFilter, search]);

  const pages  = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const shown  = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  /* group counts (for urgent mode) — total and eligible-right-now */
  const groupCounts = useMemo(() => {
    const counts: Record<string, { total: number; eligible: number }> = {};
    donors.forEach((d) => {
      if (!d.blood_group) return;
      const row = counts[d.blood_group] ?? (counts[d.blood_group] = { total: 0, eligible: 0 });
      row.total += 1;
      if (d.eligible) row.eligible += 1;
    });
    return counts;
  }, [donors]);

  const eligibleCount = useMemo(() => donors.filter((d) => d.eligible).length, [donors]);
  const urgentEligible = urgentGroup ? filtered.filter((d) => d.eligible).length : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: TEAL }}>
          {tr('Events · Blood', 'অনুষ্ঠান · রক্ত')}
        </div>
        <h1 className="mt-1 text-[26px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>
          {tr('Blood Donor Registry', 'রক্তদাতা তালিকা')}
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: MUTED }}>
          {tr(
            `One entry per donor across all camps. Anyone who has not given blood in the last ${ELIGIBILITY_MONTHS} months counts as eligible. Click a row for the full record.`,
            `সব শিবির মিলিয়ে প্রতি দাতার একটি এন্ট্রি। গত ${ELIGIBILITY_MONTHS} মাসে যিনি রক্ত দেননি তিনি যোগ্য। বিস্তারিত দেখতে সারিতে ক্লিক করুন।`,
          )}
        </p>
      </div>

      {/* ── URGENT SEARCH PANEL ───────────────────────────────── */}
      <div className="rounded-[12px] p-5" style={{ background: '#fff7f7', border: `1.5px solid #fecaca` }}>
        <div className="flex flex-wrap items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: RED }} />
          <span className="font-semibold text-[14px]" style={{ color: RED }}>
            {tr('Urgent Blood Search', 'জরুরি রক্ত অনুসন্ধান')}
          </span>
          <span className="text-[12.5px]" style={{ color: MUTED }}>
            {tr('Eligible donors first — the green number is who can donate today', 'যোগ্য দাতা আগে — সবুজ সংখ্যাটি আজ যারা দিতে পারবেন')}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {BLOOD_GROUPS.map((g) => {
            const c = groupCounts[g] ?? { total: 0, eligible: 0 };
            const active = urgentGroup === g;
            return (
              <button key={g} onClick={() => { setUrgentGroup(active ? '' : g); setFilterGroup(''); setPage(0); }}
                className="rounded-full px-3.5 py-2 text-[13px] font-bold transition-all"
                style={{ background: active ? BG_COLORS[g] : '#fff', color: active ? '#fff' : BG_COLORS[g] ?? MUTED, border: `2px solid ${BG_COLORS[g] ?? MUTED}` }}>
                {g}{' '}
                <span className="ml-1 font-mono text-[11px]" style={{ color: active ? '#bbf7d0' : GREEN }}>{fmt.num(c.eligible)}</span>
                <span className="font-mono text-[11px] opacity-70">/{fmt.num(c.total)}</span>
              </button>
            );
          })}
        </div>
        {urgentGroup && (
          <div className="mt-3 rounded-[8px] p-3" style={{ background: '#fff', border: `1px solid #fecaca` }}>
            <span className="font-semibold text-[14px]" style={{ color: GREEN }}>
              {fmt.num(urgentEligible)} {tr('donor(s) can donate now', 'জন দাতা এখনই দিতে পারবেন')}
            </span>
            <span className="text-[13px]" style={{ color: MUTED }}>
              {' '}({fmt.num(filtered.length)} {tr('total with group', 'জন মোট, গ্রুপ')} {urgentGroup})
            </span>
            <div className="mt-1 text-[12px]" style={{ color: MUTED }}>
              {tr('Switch the filter to “Eligible now” to hide donors still in their waiting period.', 'অপেক্ষমাণ দাতাদের লুকাতে ফিল্টার “এখন যোগ্য”-তে বদলান।')}
            </div>
          </div>
        )}
      </div>

      {/* ── FILTERS ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: MUTED }} />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder={tr('Name, phone, address…', 'নাম, ফোন, ঠিকানা…')}
            className="rounded-[8px] py-2 pl-9 pr-3 text-[13px] outline-none w-56"
            style={{ border: `1px solid ${RULE}`, background: PAPER }} />
        </div>
        {/* Blood group filter */}
        <select value={filterGroup} onChange={(e) => { setFilterGroup(e.target.value); setUrgentGroup(''); setPage(0); }}
          className="rounded-[8px] px-3 py-2 text-[13px] outline-none"
          style={{ border: `1px solid ${RULE}`, background: PAPER, color: INK2 }}>
          <option value="">{tr('All groups', 'সব গ্রুপ')}</option>
          {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        {/* Eligibility filter */}
        <select value={eligFilter} onChange={(e) => { setEligFilter(e.target.value as EligibilityFilter); setPage(0); }}
          className="rounded-[8px] px-3 py-2 text-[13px] font-semibold outline-none"
          style={{ border: `1px solid ${RULE}`, background: PAPER, color: eligFilter === 'eligible' ? GREEN : eligFilter === 'waiting' ? '#c2410c' : INK2 }}>
          <option value="all">{tr('Everyone', 'সবাই')}</option>
          <option value="eligible">{tr('Eligible now', 'এখন যোগ্য')}</option>
          <option value="waiting">{tr('Waiting period', 'অপেক্ষমাণ')}</option>
        </select>
        <span className="font-mono text-[11px] ml-auto" style={{ color: MUTED }}>
          {fmt.num(filtered.length)} {tr('donors', 'দাতা')} · <span style={{ color: GREEN }}>{fmt.num(eligibleCount)} {tr('eligible', 'যোগ্য')}</span>
        </span>
      </div>

      {/* ── TABLE ────────────────────────────────────────────── */}
      {loading ? <TableSkeleton rows={8} /> : (
        <>
          <div className="overflow-x-auto rounded-[10px]" style={{ border: `1px solid ${RULE}` }}>
            <table className="w-full min-w-[1100px] text-[13px]">
              <thead>
                <tr style={{ background: CREAM }}>
                  {[
                    tr('Code', 'কোড'), tr('Name', 'নাম'), tr('Blood', 'রক্ত'),
                    tr('Age/Sex', 'বয়স/লিঙ্গ'), tr('Mobile', 'মোবাইল'), tr('Address', 'ঠিকানা'),
                    tr('Last donation', 'শেষ দান'), tr('Eligibility', 'যোগ্যতা'), tr('Camps', 'শিবির'),
                  ].map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((d) => (
                  <tr key={d.key} onClick={() => setSelected(d)}
                    className="cursor-pointer hover:bg-stone-50 transition-colors" style={{ borderTop: `1px solid ${RULE}` }}>
                    <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: MUTED }}>{d.donor_code || '—'}</td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: INK }}>{d.name}</td>
                    <td className="px-3 py-2.5"><BgBadge g={d.blood_group} /></td>
                    <td className="px-3 py-2.5" style={{ color: INK2 }}>
                      {d.age != null ? fmt.num(d.age) : '—'}{d.gender ? ` / ${d.gender[0].toUpperCase()}` : ''}
                    </td>
                    <td className="px-3 py-2.5">
                      {d.phone ? (
                        <a href={`tel:${d.phone}`} onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 font-medium" style={{ color: TEAL }}>
                          <Phone className="h-3 w-3" />{d.phone}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 max-w-[180px] truncate" style={{ color: INK2 }} title={d.address}>
                      {d.address ? <><MapPin className="mr-1 inline h-3 w-3" />{d.address}</> : '—'}
                    </td>
                    <td className="px-3 py-2.5 max-w-[160px]" style={{ color: INK2 }}>
                      {d.lastDonation ? (
                        <div>
                          <div className="font-mono text-[11px]" style={{ color: INK }}>{fmt.date(d.lastDonation)}</div>
                          <div className="truncate text-[11px]" style={{ color: MUTED }}>{d.donations[0]?.event_title || '—'}</div>
                        </div>
                      ) : <span style={{ color: MUTED }}>{tr('Never', 'কখনো নয়')}</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          background: d.eligible ? '#dcfce7' : '#ffedd5',
                          color: d.eligible ? GREEN : '#c2410c',
                        }}>
                        {d.eligible ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {d.eligible
                          ? tr('Eligible', 'যোগ্য')
                          : tr(`${d.daysToWait}d left`, `আর ${fmt.num(d.daysToWait)} দিন`)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold" style={{ color: d.donationCount > 0 ? RED : MUTED }}>
                      {d.donationCount > 0 ? fmt.num(d.donationCount) : '—'}
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-10 text-center text-[13px]" style={{ color: MUTED }}>
                    {tr('No donors match your search.', 'অনুসন্ধানে কোনো দাতা পাওয়া যায়নি।')}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                className="rounded-full px-4 py-1.5 text-[12.5px] font-semibold disabled:opacity-40"
                style={{ border: `1px solid ${RULE}`, color: INK2 }}>
                ← {tr('Prev', 'আগে')}
              </button>
              <span className="font-mono text-[12px]" style={{ color: MUTED }}>
                {tr('Page', 'পাতা')} {fmt.num(page + 1)} / {fmt.num(pages)}
              </span>
              <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page === pages - 1}
                className="rounded-full px-4 py-1.5 text-[12.5px] font-semibold disabled:opacity-40"
                style={{ border: `1px solid ${RULE}`, color: INK2 }}>
                {tr('Next', 'পরে')} →
              </button>
            </div>
          )}
        </>
      )}

      {selected && <DonorDetailModal donor={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
