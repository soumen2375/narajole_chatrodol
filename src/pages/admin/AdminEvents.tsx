import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoEvent, EventType } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { ListSkeleton } from '@/components/ui/Skeleton';

const empty = {
  title: '',
  description: '',
  event_date: new Date().toISOString().slice(0, 10),
  location: '',
  type: 'event' as EventType,
  featured_image: '',
};

export default function AdminEvents() {
  const { member } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const typeLabel = (type: EventType) => (type === 'camp' ? tr('Camp', 'ক্যাম্প') : type === 'program' ? tr('Programme', 'কর্মসূচি') : tr('Event', 'অনুষ্ঠান'));
  const [events, setEvents] = useState<CswoEvent[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('cswo_events').select('*').order('event_date', { ascending: false });
    setEvents((data ?? []) as CswoEvent[]);
    const { data: att } = await supabase.from('cswo_attendance').select('event_id');
    const c: Record<string, number> = {};
    for (const row of att ?? []) c[row.event_id] = (c[row.event_id] ?? 0) + 1;
    setCounts(c);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || null,
      event_date: form.event_date,
      location: form.location || null,
      type: form.type,
      featured_image: form.featured_image || null,
    };
    if (editingId) await supabase.from('cswo_events').update(payload).eq('id', editingId);
    else await supabase.from('cswo_events').insert({ ...payload, created_by: member.id });
    setSaving(false);
    setShowForm(false);
    setForm(empty);
    setEditingId(null);
    await load();
  };

  const startEdit = (ev: CswoEvent) => {
    setForm({ title: ev.title, description: ev.description ?? '', event_date: ev.event_date, location: ev.location ?? '', type: ev.type, featured_image: ev.featured_image ?? '' });
    setEditingId(ev.id);
    setShowForm(true);
  };
  const remove = async (id: string) => {
    if (!confirm(tr('Delete this event? Attendance will also be removed.', 'অনুষ্ঠানটি মুছে ফেলবেন? সংশ্লিষ্ট উপস্থিতিও মুছে যাবে।'))) return;
    await supabase.from('cswo_events').delete().eq('id', id);
    await load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('a.events')}</h1>
        <button onClick={() => { setForm(empty); setEditingId(null); setShowForm(true); }} className="btn-primary">{tr('+ New', '+ নতুন')}</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="mb-6 space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="font-semibold text-gray-800">{editingId ? tr('Edit', 'সম্পাদনা') : tr('New event / camp', 'নতুন অনুষ্ঠান/ক্যাম্প')}</h2>
          <input className="input" placeholder={tr('Title', 'শিরোনাম')} required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <textarea className="input" rows={3} placeholder={tr('Description', 'বিবরণ')} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <input className="input" type="date" required value={form.event_date} onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))} />
            <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as EventType }))}>
              <option value="event">{tr('Event', 'অনুষ্ঠান')}</option>
              <option value="camp">{tr('Camp', 'ক্যাম্প')}</option>
              <option value="program">{tr('Programme', 'কর্মসূচি')}</option>
            </select>
            <input className="input" placeholder={tr('Location', 'স্থান')} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          <input className="input" placeholder={tr('Image URL (optional)', 'ছবির URL (ঐচ্ছিক)')} value={form.featured_image} onChange={(e) => setForm((f) => ({ ...f, featured_image: e.target.value }))} />
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? t('common.saving') : t('common.save')}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{t('common.cancel')}</button>
          </div>
        </form>
      )}

      {loading ? (
        <ListSkeleton rows={5} />
      ) : events.length === 0 ? (
        <p className="text-gray-600">{tr('No events added yet.', 'এখনও কোনো অনুষ্ঠান যোগ করা হয়নি।')}</p>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <div key={ev.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-blue-100 text-blue-800">{typeLabel(ev.type)}</span>
                  <h3 className="font-semibold text-gray-900">{ev.title}</h3>
                </div>
                <p className="text-sm text-gray-500">{fmt.date(ev.event_date)}{ev.location ? ` · ${ev.location}` : ''} · {tr('attendance', 'উপস্থিতি')}: {fmt.num(counts[ev.id] ?? 0)}</p>
              </div>
              <div className="flex gap-2 text-sm">
                <button onClick={() => startEdit(ev)} className="font-medium text-blue-600 hover:underline">{t('common.edit')}</button>
                <button onClick={() => remove(ev.id)} className="font-medium text-red-600 hover:underline">{t('common.delete')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
