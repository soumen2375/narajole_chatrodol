import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Attendance, AttendanceStatus, CswoEvent, Member } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';

export default function AdminAttendance() {
  const { member: me } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const [events, setEvents] = useState<CswoEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState('');
  const [att, setAtt] = useState<Record<string, Attendance>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const [ev, mem] = await Promise.all([
        supabase.from('cswo_events').select('*').order('event_date', { ascending: false }),
        supabase.from('cswo_members').select('*').eq('status', 'approved').order('full_name'),
      ]);
      
      const sorted = [...(ev.data ?? [])].sort((a, b) => {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (a.status === 'live' && b.status !== 'live') return -1;
        if (b.status === 'live' && a.status !== 'live') return 1;

        const aIsUpcoming = a.event_date >= todayStr;
        const bIsUpcoming = b.event_date >= todayStr;

        if (aIsUpcoming && !bIsUpcoming) return -1;
        if (!aIsUpcoming && bIsUpcoming) return 1;

        if (aIsUpcoming && bIsUpcoming) {
          return a.event_date.localeCompare(b.event_date);
        }

        return b.event_date.localeCompare(a.event_date);
      });

      const evList = sorted as CswoEvent[];
      setEvents(evList);
      setMembers((mem.data ?? []) as Member[]);
      if (evList.length) setSelected(evList[0].id);
      setLoading(false);
    };
    init();
  }, []);

  const loadAttendance = useCallback(async (eventId: string) => {
    const { data } = await supabase.from('cswo_attendance').select('*').eq('event_id', eventId);
    const map: Record<string, Attendance> = {};
    for (const a of (data ?? []) as Attendance[]) map[a.member_id] = a;
    setAtt(map);
  }, []);

  useEffect(() => {
    if (selected) loadAttendance(selected);
  }, [selected, loadAttendance]);

  const mark = async (memberId: string, status: AttendanceStatus) => {
    if (!selected) return;
    setBusy(memberId);
    await supabase.from('cswo_attendance').upsert({ event_id: selected, member_id: memberId, status, marked_by: me?.id }, { onConflict: 'event_id,member_id' });
    await loadAttendance(selected);
    setBusy(null);
  };
  const clear = async (memberId: string) => {
    if (!selected) return;
    setBusy(memberId);
    await supabase.from('cswo_attendance').delete().eq('event_id', selected).eq('member_id', memberId);
    await loadAttendance(selected);
    setBusy(null);
  };

  if (loading) return <TableSkeleton rows={6} />;

  const presentCount = Object.values(att).filter((a) => a.status !== 'absent').length;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('a.attendance')}</h1>

      {events.length === 0 ? (
        <p className="text-gray-600">{tr('Create an event or camp first.', 'প্রথমে একটি অনুষ্ঠান/ক্যাম্প তৈরি করুন।')}</p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="min-w-[240px] flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">{tr('Event / camp', 'অনুষ্ঠান / ক্যাম্প')}</label>
              <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title} ({fmt.date(ev.event_date)})</option>)}
              </select>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{tr('Present', 'উপস্থিত')}</p>
              <p className="text-2xl font-bold text-green-600">{fmt.num(presentCount)}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3">{t('common.member')}</th>
                  <th className="px-4 py-3">{t('common.status')}</th>
                  <th className="px-4 py-3">{tr('Mark', 'চিহ্নিত করুন')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.map((m) => {
                  const a = att[m.id];
                  return (
                    <tr key={m.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{m.full_name}</td>
                      <td className="px-4 py-3">
                        {a ? (
                          <span className="badge bg-green-100 text-green-800">{a.status === 'volunteered' ? tr('Volunteer', 'স্বেচ্ছাসেবক') : a.status === 'absent' ? tr('Absent', 'অনুপস্থিত') : tr('Present', 'উপস্থিত')}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button disabled={busy === m.id} onClick={() => mark(m.id, 'present')} className="rounded bg-blue-600 px-2.5 py-1 text-xs text-white hover:bg-blue-700">{tr('Present', 'উপস্থিত')}</button>
                          <button disabled={busy === m.id} onClick={() => mark(m.id, 'volunteered')} className="rounded bg-green-600 px-2.5 py-1 text-xs text-white hover:bg-green-700">{tr('Volunteer', 'স্বেচ্ছাসেবক')}</button>
                          <button disabled={busy === m.id} onClick={() => mark(m.id, 'absent')} className="rounded bg-gray-500 px-2.5 py-1 text-xs text-white hover:bg-gray-600">{tr('Absent', 'অনুপস্থিত')}</button>
                          {a && <button disabled={busy === m.id} onClick={() => clear(m.id)} className="rounded bg-red-100 px-2.5 py-1 text-xs text-red-700 hover:bg-red-200">{t('common.remove')}</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
