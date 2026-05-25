import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Member } from '@/types';
import { memberDisplayId } from '@/types';
import { useT } from '@/i18n';
import { Droplet, Search } from 'lucide-react';

const BRAND  = '#0c756f'; // Deep Teal
const INK    = '#000201'; // Charcoal Black
const MUTED  = '#7a7c7b'; // Charcoal Muted
const RULE   = '#e5dec9'; // Warm Border
const SERIF  = { fontFamily: '"Noto Serif Bengali", "Noto Sans Bengali", serif' };

function MemberCard({ m }: { m: Member }) {
  const initials = m.full_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-5 border shadow-sm card-lift"
      style={{ background: '#fff', borderColor: RULE }}
    >
      <div className="flex items-center gap-3">
        {m.avatar_url ? (
          <img
            src={m.avatar_url}
            alt={m.full_name}
            style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${BRAND}`, flexShrink: 0 }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: BRAND, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, border: `2px solid ${BRAND}`, flexShrink: 0, ...SERIF,
          }}>
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-extrabold" style={{ ...SERIF, color: INK, fontSize: 14.5 }}>{m.full_name}</div>
          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider opacity-60 font-semibold" style={{ color: BRAND }}>{memberDisplayId(m)}</div>
        </div>
      </div>

      {m.designation && (
        <p className="text-xs font-semibold" style={{ color: MUTED }}>{m.designation}</p>
      )}

      {m.blood_group && (
        <span
          className="w-fit rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold bg-red-50 text-red-600 flex items-center gap-1 border border-red-100"
        >
          <Droplet className="h-3 w-3 fill-red-600" /> {m.blood_group}
        </span>
      )}

      {m.skills && m.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {m.skills.map((s) => (
            <span
              key={s}
              className="rounded-full px-2.5 py-0.5 text-[9.5px] font-bold border"
              style={{ background: 'rgba(12,117,111,0.05)', color: BRAND, borderColor: 'rgba(12,117,111,0.1)' }}
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MemberDirectory() {
  const { t, lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');

  useEffect(() => {
    supabase
      .from('cswo_members')
      .select('*')
      .eq('status', 'approved')
      .order('member_serial', { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        setMembers((data ?? []) as Member[]);
        setLoading(false);
      });
  }, []);

  const allSkills = [...new Set(members.flatMap((m) => m.skills ?? []))].sort();
  const q = search.trim().toLowerCase();

  const shown = members.filter((m) => {
    if (q && !m.full_name.toLowerCase().includes(q) && !(m.designation ?? '').toLowerCase().includes(q)) return false;
    if (skillFilter && !(m.skills ?? []).includes(skillFilter)) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-bengali-serif" style={{ color: INK }}>{t('m.directory')}</h1>
        <p className="text-xs font-semibold mt-0.5" style={{ color: MUTED }}>
          {tr(`${members.length} approved members`, `${members.length} জন অনুমোদিত সদস্য`)}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 opacity-45" style={{ color: INK }} />
          <input
            className="input pl-9"
            placeholder={tr('Search by name or designation…', 'নাম বা পদবি দিয়ে খুঁজুন…')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {allSkills.length > 0 && (
          <select className="input min-w-[180px]" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)}>
            <option value="">{tr('All skills', 'সব দক্ষতা')}</option>
            {allSkills.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl" style={{ background: '#f1ede4' }} />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="py-12 text-center text-xs font-semibold" style={{ color: MUTED }}>{t('common.none')}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m) => <MemberCard key={m.id} m={m} />)}
        </div>
      )}
    </div>
  );
}
