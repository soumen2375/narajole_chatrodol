import { useEffect, useMemo, useState } from 'react';
import { Search, Phone, MapPin, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';

// ════════════════════════════════════════════════════════════════
//  AdminBloodDonors — global registry across all blood camps
// ════════════════════════════════════════════════════════════════

interface Donor {
  id: string; donor_code: string; name: string; age: number | null;
  gender: string; blood_group: string; phone: string; email: string;
  address: string; status: string; units: number;
  last_donation: string | null; created_at: string;
  event?: { title: string; event_date: string } | null;
}

const TEAL   = '#0c756f';
const RED    = '#b91c1c';
const INK    = '#1c1917';
const INK2   = '#44403c';
const MUTED  = '#78716c';
const RULE   = '#e7e5e4';
const PAPER  = '#ffffff';
const CREAM  = '#faf8f5';

const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

const BG_COLORS: Record<string, string> = {
  'A+':'#dc2626','A-':'#b91c1c','B+':'#1d4ed8','B-':'#1e40af',
  'AB+':'#7c3aed','AB-':'#6d28d9','O+':'#047857','O-':'#065f46',
};

function BgBadge({ g }: { g: string }) {
  const bg = BG_COLORS[g] ?? '#78716c';
  return <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: bg }}>{g || '?'}</span>;
}

export default function AdminBloodDonors() {
  const { lang } = useT();
  const fmt      = useFmt();
  const tr       = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [donors,  setDonors]  = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);

  /* filters */
  const [urgentGroup, setUrgentGroup] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(0);
  const PER_PAGE = 25;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('cswo_blood_donors')
        .select('*, event:cswo_events(title,event_date)')
        .order('created_at', { ascending: false });
      setDonors((data ?? []) as Donor[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const grp = urgentGroup || filterGroup;
    return donors.filter((d) => {
      if (grp && d.blood_group !== grp) return false;
      if (filterStatus && d.status !== filterStatus) return false;
      if (q && !`${d.name} ${d.phone} ${d.address} ${d.donor_code}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [donors, urgentGroup, filterGroup, filterStatus, search]);

  const pages  = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const shown  = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  /* group counts (for urgent mode) */
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    donors.forEach((d) => { if (d.blood_group) counts[d.blood_group] = (counts[d.blood_group] ?? 0) + 1; });
    return counts;
  }, [donors]);

  const urgentMatches = urgentGroup ? filtered.length : 0;

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
          {tr('All donors across all blood donation camps. Use Urgent Search to find available donors by blood group.', 'সমস্ত রক্তদান শিবিরের সমস্ত দাতার তালিকা। জরুরি অনুসন্ধান ব্যবহার করে রক্তগ্রুপ অনুযায়ী দাতা খুঁজুন।')}
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
            {tr('Find available donors by blood group instantly', 'রক্তগ্রুপ দিয়ে উপলব্ধ দাতা খুঁজুন')}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {BLOOD_GROUPS.filter(Boolean).map((g) => {
            const cnt = groupCounts[g] ?? 0;
            const active = urgentGroup === g;
            return (
              <button key={g} onClick={() => { setUrgentGroup(active ? '' : g); setFilterGroup(''); setPage(0); }}
                className="rounded-full px-3.5 py-2 text-[13px] font-bold transition-all"
                style={{ background: active ? BG_COLORS[g] : '#fff', color: active ? '#fff' : BG_COLORS[g] ?? MUTED, border: `2px solid ${BG_COLORS[g] ?? MUTED}` }}>
                {g} <span className="ml-1 font-mono text-[11px] opacity-80">({cnt})</span>
              </button>
            );
          })}
        </div>
        {urgentGroup && (
          <div className="mt-3 rounded-[8px] p-3" style={{ background: '#fff', border: `1px solid #fecaca` }}>
            <span className="font-semibold text-[14px]" style={{ color: RED }}>
              {urgentMatches} {tr('donor(s) available with blood group', 'জন দাতা উপলব্ধ, রক্তগ্রুপ')} {urgentGroup}
            </span>
            <div className="mt-1 text-[12px]" style={{ color: MUTED }}>
              {tr('Their contact details are listed in the table below.', 'নিচের তালিকায় তাদের যোগাযোগের তথ্য রয়েছে।')}
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
          {BLOOD_GROUPS.filter(Boolean).map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        {/* Status filter */}
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
          className="rounded-[8px] px-3 py-2 text-[13px] outline-none"
          style={{ border: `1px solid ${RULE}`, background: PAPER, color: INK2 }}>
          <option value="">{tr('All statuses', 'সব অবস্থা')}</option>
          {['registered','eligible','donated','rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="font-mono text-[11px] ml-auto" style={{ color: MUTED }}>
          {fmt.num(filtered.length)} {tr('donors', 'দাতা')}
        </span>
      </div>

      {/* ── TABLE ────────────────────────────────────────────── */}
      {loading ? <TableSkeleton rows={8} /> : (
        <>
          <div className="overflow-x-auto rounded-[10px]" style={{ border: `1px solid ${RULE}` }}>
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: CREAM }}>
                  {[
                    tr('Code', 'কোড'), tr('Name', 'নাম'), tr('Blood', 'রক্ত'),
                    tr('Age', 'বয়স'), tr('Phone', 'ফোন'), tr('Address', 'ঠিকানা'),
                    tr('Camp / Event', 'শিবির / অনুষ্ঠান'), tr('Status', 'অবস্থা'), tr('Times Donated', 'দানের সংখ্যা'),
                  ].map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((d) => (
                  <tr key={d.id} className="hover:bg-stone-50 transition-colors" style={{ borderTop: `1px solid ${RULE}` }}>
                    <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: MUTED }}>{d.donor_code || '—'}</td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: INK }}>{d.name}</td>
                    <td className="px-3 py-2.5"><BgBadge g={d.blood_group} /></td>
                    <td className="px-3 py-2.5" style={{ color: INK2 }}>{d.age ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      {d.phone ? (
                        <a href={`tel:${d.phone}`} className="inline-flex items-center gap-1 font-medium" style={{ color: TEAL }}>
                          <Phone className="h-3 w-3" />{d.phone}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 max-w-[180px] truncate" style={{ color: INK2 }} title={d.address}>
                      {d.address ? <><MapPin className="mr-1 inline h-3 w-3" />{d.address}</> : '—'}
                    </td>
                    <td className="px-3 py-2.5 max-w-[160px]" style={{ color: INK2 }}>
                      {d.event ? (
                        <div>
                          <div className="truncate font-medium" style={{ color: INK }}>{d.event.title}</div>
                          <div className="font-mono text-[10px]" style={{ color: MUTED }}>{fmt.date(d.event.event_date)}</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-full px-2 py-0.5 text-[11px] capitalize"
                        style={{
                          background: d.status === 'donated' ? '#dcfce7' : d.status === 'eligible' ? '#dbeafe' : d.status === 'rejected' ? '#fee2e2' : CREAM,
                          color: d.status === 'donated' ? '#15803d' : d.status === 'eligible' ? '#1d4ed8' : d.status === 'rejected' ? RED : INK2,
                        }}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold" style={{ color: d.units > 0 ? RED : MUTED }}>{d.units || '—'}</td>
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
                {tr('Page', 'পাতা')} {page + 1} / {pages}
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
    </div>
  );
}
