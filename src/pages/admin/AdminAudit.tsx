import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaMagnifyingGlass } from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';
import type { CswoAuditLog } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';

const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const CREAM = '#faf6ef';
const PAPER = '#ffffff';

interface AuditRow extends CswoAuditLog { actor?: { full_name: string } | null }

export default function AdminAudit() {
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState('');
  const [search, setSearch] = useState('');

  const pad = (n: number) => String(n).padStart(2, '0');
  const dtFull = (s: string) => { const d = new Date(s); return `${fmt.date(s)} · ${fmt.num(pad(d.getHours()))}:${fmt.num(pad(d.getMinutes()))}`; };

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('cswo_audit_log').select('*, actor:cswo_members(full_name)').order('created_at', { ascending: false }).limit(500);
    if (entity) q = q.eq('entity', entity);
    const { data } = await q;
    setRows((data ?? []) as AuditRow[]);
    setLoading(false);
  }, [entity]);
  useEffect(() => { load(); }, [load]);

  const entities = useMemo(() => Array.from(new Set(rows.map((r) => r.entity))).sort(), [rows]);
  const filtered = useMemo(() => {
    const qq = search.trim().toLowerCase();
    return qq ? rows.filter((r) => r.action.toLowerCase().includes(qq) || r.entity.toLowerCase().includes(qq)) : rows;
  }, [rows, search]);

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Governance', 'সুশাসন')} · {tr('Audit log', 'অডিট লগ')}</div>
        <h1 className="mt-1.5 text-[28px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Audit Trail', 'অডিট ট্রেইল')}</h1>
        <p className="mt-1 text-[13.5px]" style={{ color: INK2 }}>{tr('A record of who changed what across finance — budgets, expenses, funds and more.', 'অর্থ সংক্রান্ত কে কী পরিবর্তন করেছে তার নথি — বাজেট, ব্যয়, ফান্ড ইত্যাদি।')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 rounded-[8px] p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <select value={entity} onChange={(e) => setEntity(e.target.value)} className="rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
          <option value="">{tr('All entities', 'সব এন্টিটি')}</option>
          {entities.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <div className="relative min-w-[200px] flex-1">
          <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: MUTED }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr('Search action…', 'অ্যাকশন খুঁজুন…')} className="w-full rounded-[6px] py-2 pl-9 pr-3 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
        </div>
      </div>

      {loading ? <TableSkeleton rows={10} /> : (
        <div className="overflow-x-auto rounded-[8px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <table className="w-full text-[13px]">
            <thead><tr style={{ borderBottom: `1px solid ${RULE}` }}>
              {[tr('Date & time', 'তারিখ ও সময়'), tr('Actor', 'ব্যবহারকারী'), tr('Action', 'অ্যাকশন'), tr('Entity', 'এন্টিটি'), tr('Detail', 'বিবরণ')].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MUTED }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${RULE}` }}>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px]" style={{ color: MUTED }}>{dtFull(r.created_at)}</td>
                  <td className="px-4 py-3" style={{ color: INK }}>{r.actor?.full_name ?? tr('System', 'সিস্টেম')}</td>
                  <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 font-mono text-[11px]" style={{ background: CREAM, color: INK2, border: `1px solid ${RULE}` }}>{r.action}</span></td>
                  <td className="px-4 py-3" style={{ color: INK2 }}>{r.entity}</td>
                  <td className="max-w-[320px] truncate px-4 py-3 font-mono text-[11px]" style={{ color: MUTED }}>{Object.keys(r.detail || {}).length ? JSON.stringify(r.detail) : '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-[13px]" style={{ color: MUTED }}>{tr('No audit entries yet.', 'এখনো কোনো অডিট এন্ট্রি নেই।')}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
