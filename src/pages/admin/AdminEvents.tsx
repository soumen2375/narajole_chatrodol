import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoEvent, EventType } from '@/types';
import { formatDateBn } from '@/lib/format';
import Spinner from '@/components/ui/Spinner';

const TYPE_LABEL: Record<EventType, string> = { event: 'অনুষ্ঠান', camp: 'ক্যাম্প', program: 'কর্মসূচি' };

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
    const list = (data ?? []) as CswoEvent[];
    setEvents(list);
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
    if (editingId) {
      await supabase.from('cswo_events').update(payload).eq('id', editingId);
    } else {
      await supabase.from('cswo_events').insert({ ...payload, created_by: member.id });
    }
    setSaving(false);
    setShowForm(false);
    setForm(empty);
    setEditingId(null);
    await load();
  };

  const startEdit = (ev: CswoEvent) => {
    setForm({
      title: ev.title,
      description: ev.description ?? '',
      event_date: ev.event_date,
      location: ev.location ?? '',
      type: ev.type,
      featured_image: ev.featured_image ?? '',
    });
    setEditingId(ev.id);
    setShowForm(true);
  };

  const remove = async (id: string) => {
    if (!confirm('অনুষ্ঠানটি মুছে ফেলবেন? সংশ্লিষ্ট উপস্থিতিও মুছে যাবে।')) return;
    await supabase.from('cswo_events').delete().eq('id', id);
    await load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">অনুষ্ঠান ও ক্যাম্প</h1>
        <button
          onClick={() => {
            setForm(empty);
            setEditingId(null);
            setShowForm(true);
          }}
          className="btn-primary"
        >
          + নতুন
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="mb-6 space-y-4 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800">{editingId ? 'সম্পাদনা' : 'নতুন অনুষ্ঠান/ক্যাম্প'}</h2>
          <input className="input" placeholder="শিরোনাম" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <textarea className="input" rows={3} placeholder="বিবরণ" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <input className="input" type="date" required value={form.event_date} onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))} />
            <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as EventType }))}>
              <option value="event">অনুষ্ঠান</option>
              <option value="camp">ক্যাম্প</option>
              <option value="program">কর্মসূচি</option>
            </select>
            <input className="input" placeholder="স্থান" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          <input className="input" placeholder="ছবির URL (ঐচ্ছিক)" value={form.featured_image} onChange={(e) => setForm((f) => ({ ...f, featured_image: e.target.value }))} />
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'সংরক্ষণ…' : 'সংরক্ষণ করুন'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              বাতিল
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <Spinner />
      ) : events.length === 0 ? (
        <p className="text-gray-600">এখনও কোনো অনুষ্ঠান যোগ করা হয়নি।</p>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <div key={ev.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-blue-100 text-blue-800">{TYPE_LABEL[ev.type]}</span>
                  <h3 className="font-semibold text-gray-900">{ev.title}</h3>
                </div>
                <p className="text-sm text-gray-500">
                  {formatDateBn(ev.event_date)}
                  {ev.location ? ` · ${ev.location}` : ''} · উপস্থিতি: {counts[ev.id] ?? 0}
                </p>
              </div>
              <div className="flex gap-2 text-sm">
                <button onClick={() => startEdit(ev)} className="font-medium text-blue-600 hover:underline">
                  সম্পাদনা
                </button>
                <button onClick={() => remove(ev.id)} className="font-medium text-red-600 hover:underline">
                  মুছুন
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
