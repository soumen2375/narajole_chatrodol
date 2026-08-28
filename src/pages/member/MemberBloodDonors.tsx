import { useEffect, useMemo, useState } from 'react';
import { Droplet, Search, Phone, MapPin, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { useFmt } from '@/lib/format';
import { ListSkeleton } from '@/components/ui/Skeleton';
import DonorDetailModal from '@/components/blood/DonorDetailModal';
import {
  buildDonorProfiles, normalizeDonorRows, DONOR_SELECT, ELIGIBILITY_MONTHS,
  type DonorProfile,
} from '@/lib/bloodDonors';

// ════════════════════════════════════════════════════════════════
//  MemberBloodDonors — donor directory (read-only).
//  One card per person, not per camp: rows from every camp are folded
//  together so a donor's full history and their 3-month eligibility
//  are visible at a glance. Tap a card for the full record.
// ════════════════════════════════════════════════════════════════

const BRAND  = '#0c756f';
const RED    = '#b91c1c';
const GREEN  = '#15803d';
const INK    = '#1c1917';
const INK2   = '#44403c';
const MUTED  = '#78716c';
const RULE   = '#e5dec9';
const CREAM  = '#faf8f5';
const SERIF  = { fontFamily: '"Noto Serif Bengali", "Noto Sans Bengali", serif' };

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;

type EligibilityFilter = 'all' | 'eligible' | 'waiting';

export default function MemberBloodDonors() {
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [donors, setDonors] = useState<DonorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [eligFilter, setEligFilter] = useState<EligibilityFilter>('all');
  const [selected, setSelected] = useState<DonorProfile | null>(null);

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
    return donors.filter((d) => {
      if (groupFilter && d.blood_group !== groupFilter) return false;
      if (eligFilter === 'eligible' && !d.eligible) return false;
      if (eligFilter === 'waiting' && d.eligible) return false;
      if (q && !`${d.name} ${d.phone} ${d.address}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [donors, search, groupFilter, eligFilter]);

  const eligibleCount = useMemo(() => donors.filter((d) => d.eligible).length, [donors]);

  // Blood group distribution — eligible vs. waiting, per group.
  const groupCounts = useMemo(() => {
    const map: Record<string, { total: number; eligible: number }> = {};
    for (const d of donors) {
      if (!d.blood_group) continue;
      const row = map[d.blood_group] ?? (map[d.blood_group] = { total: 0, eligible: 0 });
      row.total += 1;
      if (d.eligible) row.eligible += 1;
    }
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [donors]);

  const maxCount = groupCounts.length > 0 ? Math.max(...groupCounts.map(([, v]) => v.total)) : 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="font-mono text-[10px] font-extrabold uppercase tracking-widest" style={{ color: RED }}>
          {tr('MEMBER PANEL', 'সদস্য প্যানেল')}
        </p>
        <h1 className="mt-1 text-2xl font-bold" style={{ color: INK, ...SERIF }}>
          {tr('Blood Donor Directory', 'রক্তদাতা পরিচিতি')}
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: MUTED }}>
          {tr(
            `Everyone registered at our camps. A donor is eligible again ${ELIGIBILITY_MONTHS} months after their last donation — tap anyone for their full record.`,
            `আমাদের শিবিরে নিবন্ধিত সবাই। শেষ রক্তদানের ${ELIGIBILITY_MONTHS} মাস পর একজন দাতা আবার যোগ্য হন — বিস্তারিত দেখতে যেকোনো দাতার উপর চাপ দিন।`,
          )}
        </p>
      </div>

      {/* Blood group bar chart */}
      {groupCounts.length > 0 && (
        <div className="rounded-2xl border p-4" style={{ background: '#fff', borderColor: RULE }}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>
              {tr('Donors by Blood Group', 'রক্তের গ্রুপ অনুযায়ী দাতা')}
            </p>
            <p className="text-[11px]" style={{ color: MUTED }}>
              <span className="inline-block h-2 w-2 rounded-full align-middle" style={{ background: GREEN }} />{' '}
              {tr('eligible now', 'এখন যোগ্য')}
            </p>
          </div>
          <div className="space-y-2">
            {groupCounts.map(([group, v]) => (
              <div key={group} className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-right font-mono text-[12px] font-bold" style={{ color: RED }}>
                  {group}
                </span>
                <div className="relative flex-1 overflow-hidden rounded-full" style={{ background: CREAM, height: 14 }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((v.total / maxCount) * 100)}%`,
                      background: `linear-gradient(90deg, ${RED}, #ef4444)`,
                    }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((v.eligible / maxCount) * 100)}%`,
                      background: GREEN,
                      opacity: 0.85,
                    }}
                  />
                </div>
                <span className="w-14 text-right font-mono text-[11px] font-semibold" style={{ color: INK2 }}>
                  {fmt.num(v.eligible)}/{fmt.num(v.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: MUTED }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr('Search name, phone or address…', 'নাম, ফোন বা ঠিকানা খুঁজুন…')}
            className="w-full rounded-xl border py-2 pl-9 pr-3 text-[13px] outline-none"
            style={{ borderColor: RULE, color: INK }}
          />
        </div>
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="rounded-xl border px-3 py-2 text-[13px] outline-none"
          style={{ borderColor: RULE, color: INK2 }}
        >
          <option value="">{tr('All groups', 'সব গ্রুপ')}</option>
          {BLOOD_GROUPS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* Eligibility toggle */}
      <div className="flex flex-wrap gap-2">
        {([
          { k: 'all', label: tr('Everyone', 'সবাই'), color: INK2 },
          { k: 'eligible', label: tr('Eligible now', 'এখন যোগ্য'), color: GREEN },
          { k: 'waiting', label: tr('Waiting period', 'অপেক্ষমাণ'), color: '#c2410c' },
        ] as const).map((o) => {
          const active = eligFilter === o.k;
          return (
            <button
              key={o.k}
              onClick={() => setEligFilter(o.k)}
              className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all"
              style={{
                background: active ? o.color : '#fff',
                color: active ? '#fff' : o.color,
                border: `1.5px solid ${o.color}`,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4">
        {[
          { label: tr('Total donors', 'মোট দাতা'), value: donors.length, color: RED },
          { label: tr('Eligible now', 'এখন যোগ্য'), value: eligibleCount, color: GREEN },
          { label: tr('Showing', 'দেখাচ্ছে'), value: filtered.length, color: BRAND },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border px-5 py-3" style={{ background: '#fff', borderColor: RULE }}>
            <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>{s.label}</div>
            <div className="mt-0.5 text-[24px] font-black" style={{ color: s.color }}>{fmt.num(s.value)}</div>
          </div>
        ))}
      </div>

      {/* Donor cards */}
      {loading ? (
        <ListSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16" style={{ color: MUTED }}>
          <Droplet className="h-12 w-12 opacity-25" />
          <p className="text-xs font-bold uppercase tracking-widest">
            {tr('No donors found.', 'কোনো দাতা পাওয়া যায়নি।')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => (
            <button
              key={d.key}
              onClick={() => setSelected(d)}
              className="rounded-2xl border p-4 text-left transition-shadow hover:shadow-md"
              style={{ background: '#fff', borderColor: d.eligible ? 'rgba(21,128,61,0.35)' : RULE }}
            >
              <div className="flex items-start gap-3">
                {/* Blood group badge */}
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[13px] font-black text-white"
                  style={{ background: RED, ...SERIF }}
                >
                  {d.blood_group || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-bold" style={{ color: INK }}>{d.name}</p>
                    {d.donationCount > 1 && (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ background: 'rgba(185,28,28,0.08)', color: RED }}
                      >
                        {fmt.num(d.donationCount)}×
                      </span>
                    )}
                  </div>

                  {/* Eligibility line */}
                  <div className="mt-1 flex items-center gap-1 text-[11.5px] font-semibold"
                    style={{ color: d.eligible ? GREEN : '#c2410c' }}>
                    {d.eligible ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {d.eligible
                      ? tr('Eligible to donate', 'রক্তদানে যোগ্য')
                      : tr(
                          `Eligible in ${d.daysToWait} day(s)`,
                          `আর ${fmt.num(d.daysToWait)} দিনে যোগ্য`,
                        )}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px]" style={{ color: MUTED }}>
                    {d.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {d.phone}
                      </span>
                    )}
                    {d.address && (
                      <span className="flex min-w-0 items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{d.address}</span>
                      </span>
                    )}
                  </div>
                  {d.lastDonation && (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px]" style={{ color: MUTED }}>
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span className="shrink-0">{fmt.date(d.lastDonation)}</span>
                      {d.donations[0]?.event_title && (
                        <span className="truncate">· {d.donations[0].event_title}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <DonorDetailModal donor={selected} onClose={() => setSelected(null)} masked />}
    </div>
  );
}
