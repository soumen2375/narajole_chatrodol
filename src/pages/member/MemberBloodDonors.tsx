import { useEffect, useMemo, useState } from 'react';
import { Droplet, Search, Phone, MapPin, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { useFmt } from '@/lib/format';
import { ListSkeleton } from '@/components/ui/Skeleton';

// ════════════════════════════════════════════════════════════════
//  MemberBloodDonors — public blood donor registry (read-only)
// ════════════════════════════════════════════════════════════════

const BRAND  = '#0c756f';
const RED    = '#b91c1c';
const INK    = '#1c1917';
const INK2   = '#44403c';
const MUTED  = '#78716c';
const RULE   = '#e5dec9';
const CREAM  = '#faf8f5';
const SERIF  = { fontFamily: '"Noto Serif Bengali", "Noto Sans Bengali", serif' };

const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;

interface BloodDonorPublic {
  id: string;
  name: string;
  blood_group: string;
  phone: string;
  address: string;
  last_donation: string | null;
  status: string;
  units: number;
  event_id: string;
  event_title?: string;
  event_date?: string;
  times_donated?: number;
}

export default function MemberBloodDonors() {
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [donors, setDonors] = useState<BloodDonorPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('cswo_blood_donors')
        .select(`
          id, name, blood_group, phone, address, last_donation, status, units, event_id,
          event:cswo_events!event_id(title, event_date)
        `)
        .eq('status', 'donated')
        .order('name');

      type RawDonor = {
        id: string; name: string; blood_group: string; phone: string; address: string;
        last_donation: string | null; status: string; units: number; event_id: string;
        event: { title: string; event_date: string }[] | null;
      };

      const raw = (data ?? []) as unknown as RawDonor[];

      // Count times donated per name
      const nameCount: Record<string, number> = {};
      for (const d of raw) {
        nameCount[d.name.toLowerCase()] = (nameCount[d.name.toLowerCase()] || 0) + 1;
      }

      const enriched: BloodDonorPublic[] = raw.map((d) => ({
        ...d,
        event_title: Array.isArray(d.event) && d.event[0] ? d.event[0].title : '—',
        event_date:  Array.isArray(d.event) && d.event[0] ? d.event[0].event_date : '',
        times_donated: nameCount[d.name.toLowerCase()] ?? 1,
      }));

      setDonors(enriched);
      setLoading(false);
    })();
  }, []);


  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return donors.filter((d) => {
      if (groupFilter && d.blood_group !== groupFilter) return false;
      if (q && !d.name.toLowerCase().includes(q) && !(d.address ?? '').toLowerCase().includes(q) && !(d.phone ?? '').includes(q)) return false;
      return true;
    });
  }, [donors, search, groupFilter]);

  // Blood group distribution
  const groupCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of donors) {
      if (d.blood_group) map[d.blood_group] = (map[d.blood_group] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [donors]);

  const maxCount = groupCounts.length > 0 ? Math.max(...groupCounts.map(([, n]) => n)) : 1;

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
          {tr('Members who have donated blood at our camps.', 'আমাদের শিবিরে রক্তদানকারী সদস্যগণ।')}
        </p>
      </div>

      {/* Blood group bar chart */}
      {groupCounts.length > 0 && (
        <div className="rounded-2xl border p-4" style={{ background: '#fff', borderColor: RULE }}>
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>
            {tr('Donations by Blood Group', 'রক্তের গ্রুপ অনুযায়ী দান')}
          </p>
          <div className="space-y-2">
            {groupCounts.map(([group, count]) => (
              <div key={group} className="flex items-center gap-3">
                <span
                  className="w-10 shrink-0 text-right font-mono text-[12px] font-bold"
                  style={{ color: RED }}
                >
                  {group}
                </span>
                <div className="flex-1 overflow-hidden rounded-full" style={{ background: CREAM, height: 14 }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((count / maxCount) * 100)}%`,
                      background: `linear-gradient(90deg, ${RED}, #ef4444)`,
                    }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-[11px] font-semibold" style={{ color: INK2 }}>
                  {count}
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
          {BLOOD_GROUPS.filter(Boolean).map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4">
        {[
          { label: tr('Total donors', 'মোট দাতা'), value: donors.length, color: RED },
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
            <div
              key={d.id}
              className="rounded-2xl border p-4"
              style={{ background: '#fff', borderColor: RULE }}
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
                    {d.times_donated && d.times_donated > 1 && (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ background: 'rgba(185,28,28,0.08)', color: RED }}
                      >
                        {fmt.num(d.times_donated)}×
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px]" style={{ color: MUTED }}>
                    {d.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {d.phone}
                      </span>
                    )}
                    {d.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {d.address}
                      </span>
                    )}
                  </div>
                  {d.event_date && (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px]" style={{ color: MUTED }}>
                      <Calendar className="h-3 w-3" />
                      <span>{fmt.date(d.event_date)}</span>
                      {d.event_title && d.event_title !== '—' && (
                        <span className="truncate">· {d.event_title}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
