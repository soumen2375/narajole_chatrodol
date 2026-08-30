import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoEvent, EventType, EventStatus } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { ListSkeleton } from '@/components/ui/Skeleton';

const CATEGORY_SUGGESTIONS = [
  'Blood Donation Camp', 'Medical Camp', 'Relief Camp', 'Food Distribution', 'Education Camp',
  'Clothing Distribution', 'Awareness Campaign', 'Scholarship Distribution', 'Volunteer Meetup',
  'Cultural Program', 'Fundraising Event', 'Tree Plantation', 'Community Meeting', 'Emergency Relief',
];
const STATUSES: EventStatus[] = ['draft', 'planned', 'approved', 'live', 'completed', 'cancelled'];
const STATUS_COLOR: Record<EventStatus, string> = {
  draft: '#78716c', planned: '#1d4ed8', approved: '#0c756f', live: '#c2410c', completed: '#4d7c0f', cancelled: '#dc2626',
};

type FormType = 'general' | 'blood_donation' | 'relief_distribution';

const empty = {
  title: '', description: '', category: '', type: 'event' as EventType, status: 'planned' as EventStatus,
  event_date: new Date().toISOString().slice(0, 10), end_date: '', start_time: '', end_time: '',
  location: '', district: '', state: '', pincode: '', map_link: '', expected_participants: '', featured_image: '',
  form_type: 'general' as FormType,
  attendance_enabled: false, attendance_start_time: '', attendance_end_time: '',
};

export default function AdminEvents() {
  const { member } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const typeLabel = (type: EventType) => (type === 'camp' ? tr('Camp', 'ক্যাম্প') : type === 'program' ? tr('Programme', 'কর্মসূচি') : tr('Event', 'অনুষ্ঠান'));
  const statusLabel = (s: EventStatus) => ({ draft: tr('Draft', 'খসড়া'), planned: tr('Planned', 'পরিকল্পিত'), approved: tr('Approved', 'অনুমোদিত'), live: tr('Live', 'চলমান'), completed: tr('Completed', 'সম্পন্ন'), cancelled: tr('Cancelled', 'বাতিল') }[s]);

  const [events, setEvents] = useState<CswoEvent[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: att }] = await Promise.all([
      supabase.from('cswo_events').select('*').order('event_date', { ascending: false }),
      supabase.from('cswo_attendance').select('event_id'),
    ]);

    const sorted = [...(data ?? [])].sort((a, b) => {
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

    setEvents(sorted as CswoEvent[]);
    const c: Record<string, number> = {};
    for (const row of att ?? []) c[row.event_id] = (c[row.event_id] ?? 0) + 1;
    setCounts(c);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    setSaving(true);
    const qrToken = editingId
      ? undefined  // don't overwrite existing token when editing
      : (form.attendance_enabled ? crypto.randomUUID() : undefined);
    const payload = {
      title: form.title, description: form.description || null, category: form.category,
      type: form.type, status: form.status, event_date: form.event_date, end_date: form.end_date || null,
      start_time: form.start_time || null, end_time: form.end_time || null,
      location: form.location || null, district: form.district, state: form.state, pincode: form.pincode,
      map_link: form.map_link, expected_participants: Number(form.expected_participants || 0),
      featured_image: form.featured_image || null,
      form_type: form.form_type,
      attendance_enabled: form.attendance_enabled,
      attendance_start_time: form.attendance_start_time || null,
      attendance_end_time: form.attendance_end_time || null,
      ...(qrToken ? { attendance_qr_token: qrToken } : {}),
    };
    if (editingId) {
      // When enabling attendance on an existing event with no QR token, generate one
      if (form.attendance_enabled) {
        const { data: existing } = await supabase.from('cswo_events').select('attendance_qr_token').eq('id', editingId).single();
        if (!existing?.attendance_qr_token) {
          (payload as Record<string, unknown>).attendance_qr_token = crypto.randomUUID();
        }
      }
      await supabase.from('cswo_events').update(payload).eq('id', editingId);
    } else {
      await supabase.from('cswo_events').insert({ ...payload, created_by: member.id });
    }
    setSaving(false); setShowForm(false); setForm(empty); setEditingId(null);
    await load();
  };

  const startEdit = (ev: CswoEvent) => {
    setForm({
      title: ev.title, description: ev.description ?? '', category: ev.category ?? '', type: ev.type, status: ev.status ?? 'planned',
      event_date: ev.event_date, end_date: ev.end_date ?? '', start_time: ev.start_time ?? '', end_time: ev.end_time ?? '',
      location: ev.location ?? '', district: ev.district ?? '', state: ev.state ?? '', pincode: ev.pincode ?? '',
      map_link: ev.map_link ?? '', expected_participants: ev.expected_participants ? String(ev.expected_participants) : '',
      featured_image: ev.featured_image ?? '',
      form_type: ev.form_type ?? 'general',
      attendance_enabled: ev.attendance_enabled ?? false,
      attendance_start_time: ev.attendance_start_time ? ev.attendance_start_time.slice(0, 16) : '',
      attendance_end_time: ev.attendance_end_time ? ev.attendance_end_time.slice(0, 16) : '',
    });
    setEditingId(ev.id); setShowForm(true);
  };
  const remove = async (id: string) => {
    if (!confirm(tr('Delete this event? Attendance, budget and volunteers will also be removed.', 'অনুষ্ঠানটি মুছবেন? উপস্থিতি, বাজেট ও স্বেচ্ছাসেবকও মুছে যাবে।'))) return;
    await supabase.from('cswo_events').delete().eq('id', id);
    await load();
  };

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('a.events')}</h1>
        <button onClick={() => { setForm(empty); setEditingId(null); setShowForm(true); }} className="btn-primary">{tr('+ New', '+ নতুন')}</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="mb-6 space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="font-semibold text-gray-800">{editingId ? tr('Edit event', 'অনুষ্ঠান সম্পাদনা') : tr('New event / camp', 'নতুন অনুষ্ঠান/ক্যাম্প')}</h2>
          <input className="input" placeholder={tr('Title', 'শিরোনাম')} required value={form.title} onChange={set('title')} />
          <textarea className="input" rows={3} placeholder={tr('Description', 'বিবরণ')} value={form.description} onChange={set('description')} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">{tr('Category', 'বিভাগ')}</label>
              <input className="input" list="ev-cats" placeholder={tr('e.g. Blood Donation Camp', 'যেমন রক্তদান শিবির')} value={form.category} onChange={set('category')} />
              <datalist id="ev-cats">{CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">{tr('Type', 'ধরন')}</label>
              <select className="input" value={form.type} onChange={set('type')}>
                <option value="event">{tr('Event', 'অনুষ্ঠান')}</option>
                <option value="camp">{tr('Camp', 'ক্যাম্প')}</option>
                <option value="program">{tr('Programme', 'কর্মসূচি')}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">{tr('Status', 'অবস্থা')}</label>
              <select className="input" value={form.status} onChange={set('status')}>
                {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
            </div>
          </div>

          {/* ── Form type ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                {tr('Event Form Type', 'অনুষ্ঠানের ফর্ম ধরন')}
              </label>
              <select className="input" value={form.form_type} onChange={set('form_type')}>
                <option value="general">{tr('General', 'সাধারণ')}</option>
                <option value="blood_donation">{tr('Blood Donation Camp', 'রক্তদান শিবির')}</option>
                <option value="relief_distribution">{tr('Relief & Distribution', 'ত্রাণ ও বিতরণ')}</option>
              </select>
              <p className="mt-1 text-[11px] text-gray-400">
                {tr('Determines which special sections appear in event management.', 'অনুষ্ঠান পরিচালনায় কোন বিশেষ বিভাগগুলি দেখাবে তা নির্ধারণ করে।')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">{tr('Start date', 'শুরুর তারিখ')}</label><input className="input" type="date" required value={form.event_date} onChange={set('event_date')} /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">{tr('End date', 'শেষ তারিখ')}</label><input className="input" type="date" value={form.end_date} onChange={set('end_date')} /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">{tr('Expected participants', 'প্রত্যাশিত অংশগ্রহণকারী')}</label><input className="input" type="number" value={form.expected_participants} onChange={set('expected_participants')} /></div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">{tr('Start time', 'শুরুর সময়')}</label><input className="input" type="time" value={form.start_time} onChange={set('start_time')} /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">{tr('End time', 'শেষ সময়')}</label><input className="input" type="time" value={form.end_time} onChange={set('end_time')} /></div>
          </div>

          <input className="input" placeholder={tr('Venue / location', 'স্থান / ভেন্যু')} value={form.location} onChange={set('location')} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <input className="input" placeholder={tr('District', 'জেলা')} value={form.district} onChange={set('district')} />
            <input className="input" placeholder={tr('State', 'রাজ্য')} value={form.state} onChange={set('state')} />
            <input className="input" placeholder={tr('Pincode', 'পিন কোড')} value={form.pincode} onChange={set('pincode')} />
          </div>
          <input className="input" placeholder={tr('Google Maps link (optional)', 'গুগল ম্যাপ লিংক (ঐচ্ছিক)')} value={form.map_link} onChange={set('map_link')} />
          <input className="input" placeholder={tr('Banner image URL (optional)', 'ব্যানার ছবির URL (ঐচ্ছিক)')} value={form.featured_image} onChange={set('featured_image')} />

          {/* ── Attendance Window ── */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[13px] text-green-900">{tr('Attendance Window', 'উপস্থিতির উইন্ডো')}</p>
                <p className="text-[11px] text-green-700 mt-0.5">{tr('Members can only scan QR within this time window.', 'সদস্যরা কেবল এই সময়ের মধ্যে QR স্ক্যান করতে পারবেন।')}</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.attendance_enabled}
                  onChange={e => setForm(f => ({ ...f, attendance_enabled: e.target.checked }))}
                  className="h-4 w-4 rounded accent-green-700"
                />
                <span className="text-[13px] font-semibold text-green-900">{tr('Enable Attendance', 'উপস্থিতি চালু')}</span>
              </label>
            </div>
            {form.attendance_enabled && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-green-800">{tr('Attendance Opens', 'উপস্থিতি শুরু')}</label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={form.attendance_start_time}
                    onChange={e => setForm(f => ({ ...f, attendance_start_time: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-green-800">{tr('Attendance Closes', 'উপস্থিতি শেষ')}</label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={form.attendance_end_time}
                    onChange={e => setForm(f => ({ ...f, attendance_end_time: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

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
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: STATUS_COLOR[ev.status] }}>{statusLabel(ev.status)}</span>
                  <h3 className="font-semibold text-gray-900">{ev.title}</h3>
                  {ev.event_code && <span className="font-mono text-[10px] text-gray-400">{ev.event_code}</span>}
                  {ev.form_type === 'blood_donation' && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                      {tr('Blood Donation', 'রক্তদান')}
                    </span>
                  )}
                  {ev.form_type === 'relief_distribution' && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: '#fef9c3', color: '#a16207' }}>
                      {tr('Relief & Distribution', 'ত্রাণ ও বিতরণ')}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-gray-500">
                  {ev.category || typeLabel(ev.type)} · {fmt.date(ev.event_date)}{ev.location ? ` · ${ev.location}` : ''} · {tr('attendance', 'উপস্থিতি')}: {fmt.num(counts[ev.id] ?? 0)}
                </p>
              </div>
              <div className="flex shrink-0 gap-3 text-sm">
                <Link to={ev.id} className="font-semibold inline-flex items-center gap-1" style={{ color: '#0c756f' }}>{tr('Manage', 'পরিচালনা')} <ArrowRight className="h-3.5 w-3.5" /></Link>
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
