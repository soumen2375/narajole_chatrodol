import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Member } from '@/types';
import { memberDisplayId } from '@/types';
import { useT } from '@/i18n';

const BRAND = '#c2410c';
const INK   = '#1c1917';
const MUTED = '#78716c';
const RULE  = '#e7e5e4';
const SERIF = { fontFamily: '"Noto Serif Bengali", "Noto Sans Bengali", serif' };

function MemberCard({ m }: { m: Member }) {
  const initials = m.full_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div
      className="flex flex-col gap-3 rounded-xl p-5"
      style={{ background: '#fff', border: `1px solid ${RULE}`, boxShadow: '0 1px 6px rgba(28,25,23,0.05)' }}
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
            fontSize: 17, fontWeight: 700, border: `2px solid ${BRAND}`, flexShrink: 0, ...SERIF,
          }}>
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold" style={{ ...SERIF, color: INK, fontSize: 15 }}>{m.full_name}</div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: BRAND }}>{memberDisplayId(m)}</div>
        </div>
      </div>

      {m.designation && (
        <p className="text-[13px]" style={{ color: MUTED }}>{m.designation}</p>
      )}

      {m.blood_group && (
        <span
          className="w-fit rounded-full px-2.5 py-0.5 font-mono text-[11px]"
          style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}
        >
          ✦ {m.blood_group}
        </span>
      )}

      {m.skills && m.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {m.skills.map((s) => (
            <span
              key={s}
              className="rounded-full px-2.5 py-0.5 text-[11px]"
              style={{ background: 'rgba(194,65,12,0.07)', color: BRAND }}
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
        <h1 className="text-2xl font-bold" style={{ ...SERIF, color: INK }}>{t('m.directory')}</h1>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>
          {tr(`${members.length} approved members`, `${members.length} জন অনুমোদিত সদস্য`)}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          className="input min-w-[220px] flex-1 max-w-sm"
          placeholder={tr('Search by name or designation…', 'নাম বা পদবি দিয়ে খুঁজুন…')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
            <div key={i} className="h-36 animate-pulse rounded-xl" style={{ background: RULE }} />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="py-12 text-center text-sm" style={{ color: MUTED }}>{t('common.none')}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m) => <MemberCard key={m.id} m={m} />)}
        </div>
      )}
    </div>
  );
}
