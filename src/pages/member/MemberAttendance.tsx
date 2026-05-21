import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Attendance, CswoEvent } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import Spinner from '@/components/ui/Spinner';

export default function MemberAttendance() {
  const { member } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const [events, setEvents] = useState<CswoEvent[]>([]);
  const [mine, setMine] = useState<Record<string, Attendance>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const typeLabel = (type: string) =>
    type === 'camp' ? tr('Camp', 'ক্যাম্প') : type === 'program' ? tr('Programme', 'কর্মসূচি') : tr('Event', 'অনুষ্ঠান');

  const load = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    const [ev, att] = await Promise.all([
      supabase.from('cswo_events').select('*').order('event_date', { ascending: false }),
      supabase.from('cswo_attendance').select('*').eq('member_id', member.id),
    ]);
    setEvents((ev.data ?? []) as CswoEvent[]);
    const map: Record<string, Attendance> = {};
    for (const a of (att.data ?? []) as Attendance[]) map[a.event_id] = a;
    setMine(map);
    setLoading(false);
  }, [member]);

  useEffect(() => {
    load();
  }, [load]);

  const mark = async (eventId: string, status: 'present' | 'volunteered') => {
    if (!member) return;
    setBusy(eventId);
    await supabase.from('cswo_attendance').upsert({ event_id: eventId, member_id: member.id, status }, { onConflict: 'event_id,member_id' });
    setBusy(null);
    await load();
  };

  const unmark = async (eventId: string) => {
    if (!member) return;
    setBusy(eventId);
    await supabase.from('cswo_attendance').delete().eq('event_id', eventId).eq('member_id', member.id);
    setBusy(null);
    await load();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{t('m.attendance')}</h1>
      <p className="mb-6 text-gray-600">{tr('Mark which events or camps you attended.', 'আপনি কোন অনুষ্ঠান বা ক্যাম্পে অংশ নিয়েছেন তা চিহ্নিত করুন।')}</p>

      {events.length === 0 ? (
        <p className="text-gray-600">{tr('No events or camps have been added yet.', 'এখনও কোনো অনুষ্ঠান বা ক্যাম্প যোগ করা হয়নি।')}</p>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const a = mine[ev.id];
            return (
              <div key={ev.id} className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="badge bg-blue-100 text-blue-800">{typeLabel(ev.type)}</span>
                    <h3 className="font-semibold text-gray-900">{ev.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500">{fmt.date(ev.event_date)}{ev.location ? ` · ${ev.location}` : ''}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {a ? (
                    <>
                      <span className="badge bg-green-100 text-green-800">
                        {a.status === 'volunteered' ? tr('Volunteered', 'স্বেচ্ছাসেবক ছিলাম') : tr('Attended', 'উপস্থিত ছিলাম')}
                      </span>
                      <button disabled={busy === ev.id} onClick={() => unmark(ev.id)} className="text-sm text-red-600 hover:underline">{t('common.remove')}</button>
                    </>
                  ) : (
                    <>
                      <button disabled={busy === ev.id} onClick={() => mark(ev.id, 'present')} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                        {tr('Attended', 'উপস্থিত ছিলাম')}
                      </button>
                      <button disabled={busy === ev.id} onClick={() => mark(ev.id, 'volunteered')} className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">
                        {tr('Volunteered', 'স্বেচ্ছাসেবা')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
