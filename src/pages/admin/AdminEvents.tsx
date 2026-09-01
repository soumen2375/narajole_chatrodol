import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

// ─── Design tokens (from the Admin Events canvas) ────────────────────────────
const E = {
  panel: '#FBF7EC',
  card: '#FFFDF8',
  ink: '#1C1A15',
  ink2: '#5B5445',
  muted: '#7A7568',
  meta: '#6F6A5C',
  faint: '#A79F8C',
  line: '#F0E9D9',
  line2: '#EDE5D3',
  line3: '#E9E0CB',
  seg: '#F1EADA',
  segLine: '#E7DECB',
  danger: '#B93A08',
  dangerLine: '#F0D9CC',
};
const ORANGE = 'linear-gradient(180deg,#D24A12,#B93A08)';
const GREEN = 'linear-gradient(180deg,#387C4A,#245735)';
const SERIF = "'Source Serif 4', 'Noto Serif Bengali', Georgia, serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

// The canvas defines pills for Live and Completed; the rest stay in its palette.
const PILL: Record<EventStatus, string> = {
  draft: '#847D6C', planned: '#3F6FA8', approved: '#2F6B3F',
  live: '#C4410E', completed: '#2F6B3F', cancelled: '#A8281C',
};

type SortKey = 'newest' | 'oldest' | 'attendance' | 'attendanceLow' | 'az' | 'za';
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

  // Toolbar state
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'completed'>('all');
  const [range, setRange] = useState('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [pendingDelete, setPendingDelete] = useState<CswoEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: att }] = await Promise.all([
      supabase.from('cswo_events').select('*').order('event_date', { ascending: false }),
      supabase.from('cswo_attendance').select('event_id'),
    ]);
    setEvents((data ?? []) as CswoEvent[]);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('cswo_events').delete().eq('id', pendingDelete.id);
    setDeleting(false);
    if (error) { alert(tr('Could not delete: ', 'মুছতে ব্যর্থ: ') + error.message); return; }
    setPendingDelete(null);
    await load();
  };

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Years actually present in the data, so the range filter never offers a dead option.
  const years = useMemo(
    () => [...new Set(events.map((e) => e.event_date.slice(0, 4)))].sort((a, b) => b.localeCompare(a)),
    [events],
  );

  const liveCount = events.filter((e) => e.status === 'live').length;
  const doneCount = events.filter((e) => e.status === 'completed').length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    const list = events.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (range === 'upcoming' && e.event_date < today) return false;
      if (range === 'past' && e.event_date >= today) return false;
      if (/^\d{4}$/.test(range) && !e.event_date.startsWith(range)) return false;
      if (!q) return true;
      return [e.title, e.event_code, e.location, e.category].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
    const at = (e: CswoEvent) => counts[e.id] ?? 0;
    const by: Record<SortKey, (a: CswoEvent, b: CswoEvent) => number> = {
      newest: (a, b) => b.event_date.localeCompare(a.event_date),
      oldest: (a, b) => a.event_date.localeCompare(b.event_date),
      attendance: (a, b) => at(b) - at(a),
      attendanceLow: (a, b) => at(a) - at(b),
      az: (a, b) => a.title.localeCompare(b.title),
      za: (a, b) => b.title.localeCompare(a.title),
    };
    return [...list].sort(by[sort]);
  }, [events, counts, query, statusFilter, range, sort]);

  const tagOf = (ev: CswoEvent) =>
    ev.form_type === 'blood_donation' ? { label: tr('Blood Donation', 'রক্তদান'), bg: '#FBD9D5', color: '#A8281C' }
    : ev.form_type === 'relief_distribution' ? { label: tr('Relief & Distribution', 'ত্রাণ ও বিতরণ'), bg: '#FBE6B8', color: '#7A5410' }
    : null;

  const field: React.CSSProperties = { background: E.card, border: `1px solid ${E.line2}`, boxShadow: '0 1px 2px rgba(28,26,21,.04)' };
  const selectStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: E.ink, fontWeight: 600, cursor: 'pointer', outline: 'none' };

  return (
    <div
      className="rounded-[24px] p-4 sm:p-5 lg:p-7"
      style={{ background: E.panel, color: E.ink, boxShadow: '0 1px 2px rgba(28,26,21,.04), 0 24px 60px -40px rgba(28,26,21,.45)' }}
    >
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="m-0 text-[23px] font-semibold leading-none tracking-[-.02em] sm:text-[26px] lg:text-[30px]" style={{ fontFamily: SERIF }}>
            {tr('Events & camps', 'অনুষ্ঠান ও শিবির')}
          </h1>
          <p className="m-0 text-[12.5px] sm:text-[13px]" style={{ color: E.muted }}>
            {tr(
              `${visible.length} of ${events.length} events · ${liveCount} live now`,
              `${fmt.num(events.length)}টির মধ্যে ${fmt.num(visible.length)}টি · ${fmt.num(liveCount)}টি চলমান`,
            )}
          </p>
        </div>
        <button
          onClick={() => { setForm(empty); setEditingId(null); setShowForm(true); }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[14px] px-5 py-2.5 text-[13.5px] font-bold text-white transition-transform active:scale-[.97] sm:w-auto sm:px-6 sm:py-3 sm:text-[14px]"
          style={{ background: ORANGE, color: '#FFF6EE', boxShadow: '0 14px 30px -14px rgba(185,58,8,.85), inset 0 1px 0 rgba(255,255,255,.22)' }}
        >
          <span className="text-[16px] leading-none">+</span> {tr('New', 'নতুন')}
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="mt-5 flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
        <div className="flex h-[42px] flex-1 items-center gap-2.5 rounded-[13px] px-3.5 lg:min-w-[230px]" style={field}>
          <span className="text-[15px]" style={{ color: E.faint }}>⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr('Search events, codes, venues…', 'অনুষ্ঠান, কোড, স্থান খুঁজুন…')}
            className="h-full min-w-0 flex-1 border-none bg-transparent text-[13.5px] outline-none"
            style={{ color: E.ink }}
          />
        </div>

        {/* Segmented status filter */}
        <div className="flex gap-1 overflow-x-auto rounded-[13px] p-1" style={{ background: E.seg, border: `1px solid ${E.segLine}` }}>
          {([
            { k: 'all' as const, label: tr('All', 'সব'), n: events.length },
            { k: 'live' as const, label: tr('Live', 'চলমান'), n: liveCount },
            { k: 'completed' as const, label: tr('Completed', 'সম্পন্ন'), n: doneCount },
          ]).map((f) => {
            const on = statusFilter === f.k;
            return (
              <button
                key={f.k}
                onClick={() => setStatusFilter(f.k)}
                className="shrink-0 whitespace-nowrap rounded-[10px] px-3.5 py-2 text-[12.5px] font-semibold transition-transform active:scale-[.96]"
                style={{ background: on ? E.card : 'transparent', color: on ? E.ink : '#847D6C', boxShadow: on ? '0 2px 8px -4px rgba(28,26,21,.45)' : 'none' }}
              >
                {f.label} <span className="text-[11.5px] opacity-60" style={{ fontFamily: MONO }}>{fmt.num(f.n)}</span>
              </button>
            );
          })}
        </div>

        {/* Date range + sort */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-[13px] px-3.5 py-2 lg:h-[42px] lg:flex-nowrap lg:py-0" style={field}>
          <span className="flex items-center gap-2.5">
          <span className="text-[11px] font-bold tracking-[.08em]" style={{ color: E.faint }}>{tr('DATE', 'তারিখ')}</span>
          <select value={range} onChange={(e) => setRange(e.target.value)} className="h-[32px] rounded-[10px] px-1 text-[13px]" style={selectStyle}>
            <option value="all">{tr('All dates', 'সব তারিখ')}</option>
            {years.map((y) => <option key={y} value={y}>{tr(`Year ${y}`, `সাল ${y}`)}</option>)}
            <option value="upcoming">{tr('Upcoming', 'আসন্ন')}</option>
            <option value="past">{tr('Past', 'অতীত')}</option>
          </select>
          </span>
          <span className="hidden h-6 w-px lg:block" style={{ background: E.line2 }} />
          <span className="flex items-center gap-2.5">
          <span className="text-[11px] font-bold tracking-[.08em]" style={{ color: E.faint }}>{tr('SORT', 'ক্রম')}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-[32px] rounded-[10px] px-1 text-[13px]" style={selectStyle}>
            <option value="newest">{tr('Newest first', 'নতুন আগে')}</option>
            <option value="oldest">{tr('Oldest first', 'পুরনো আগে')}</option>
            <option value="attendance">{tr('Attendance · high', 'উপস্থিতি · বেশি')}</option>
            <option value="attendanceLow">{tr('Attendance · low', 'উপস্থিতি · কম')}</option>
            <option value="az">{tr('Name A–Z', 'নাম A–Z')}</option>
            <option value="za">{tr('Name Z–A', 'নাম Z–A')}</option>
          </select>
          </span>
        </div>
      </div>

      {/* ── Create / edit form ── */}
      {showForm && (
        <form onSubmit={save} className="mt-6 space-y-4 rounded-[20px] p-4 sm:p-6" style={{ background: E.card, border: `1px solid ${E.line}` }}>
          <h2 className="text-[20px] font-semibold" style={{ fontFamily: SERIF }}>{editingId ? tr('Edit event', 'অনুষ্ঠান সম্পাদনা') : tr('New event / camp', 'নতুন অনুষ্ঠান/ক্যাম্প')}</h2>
          <input className="input" placeholder={tr('Title', 'শিরোনাম')} required value={form.title} onChange={set('title')} />
          <textarea className="input" rows={3} placeholder={tr('Description', 'বিবরণ')} value={form.description} onChange={set('description')} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: E.muted }}>{tr('Category', 'বিভাগ')}</label>
              <input className="input" list="ev-cats" placeholder={tr('e.g. Blood Donation Camp', 'যেমন রক্তদান শিবির')} value={form.category} onChange={set('category')} />
              <datalist id="ev-cats">{CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: E.muted }}>{tr('Type', 'ধরন')}</label>
              <select className="input" value={form.type} onChange={set('type')}>
                <option value="event">{tr('Event', 'অনুষ্ঠান')}</option>
                <option value="camp">{tr('Camp', 'ক্যাম্প')}</option>
                <option value="program">{tr('Programme', 'কর্মসূচি')}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: E.muted }}>{tr('Status', 'অবস্থা')}</label>
              <select className="input" value={form.status} onChange={set('status')}>
                {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: E.muted }}>{tr('Event Form Type', 'অনুষ্ঠানের ফর্ম ধরন')}</label>
              <select className="input" value={form.form_type} onChange={set('form_type')}>
                <option value="general">{tr('General', 'সাধারণ')}</option>
                <option value="blood_donation">{tr('Blood Donation Camp', 'রক্তদান শিবির')}</option>
                <option value="relief_distribution">{tr('Relief & Distribution', 'ত্রাণ ও বিতরণ')}</option>
              </select>
              <p className="mt-1 text-[11px]" style={{ color: E.faint }}>
                {tr('Determines which special sections appear in event management.', 'অনুষ্ঠান পরিচালনায় কোন বিশেষ বিভাগগুলি দেখাবে তা নির্ধারণ করে।')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div><label className="mb-1 block text-xs font-medium" style={{ color: E.muted }}>{tr('Start date', 'শুরুর তারিখ')}</label><input className="input" type="date" required value={form.event_date} onChange={set('event_date')} /></div>
            <div><label className="mb-1 block text-xs font-medium" style={{ color: E.muted }}>{tr('End date', 'শেষ তারিখ')}</label><input className="input" type="date" value={form.end_date} onChange={set('end_date')} /></div>
            <div><label className="mb-1 block text-xs font-medium" style={{ color: E.muted }}>{tr('Expected participants', 'প্রত্যাশিত অংশগ্রহণকারী')}</label><input className="input" type="number" value={form.expected_participants} onChange={set('expected_participants')} /></div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs font-medium" style={{ color: E.muted }}>{tr('Start time', 'শুরুর সময়')}</label><input className="input" type="time" value={form.start_time} onChange={set('start_time')} /></div>
            <div><label className="mb-1 block text-xs font-medium" style={{ color: E.muted }}>{tr('End time', 'শেষ সময়')}</label><input className="input" type="time" value={form.end_time} onChange={set('end_time')} /></div>
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
          <div className="space-y-3 rounded-xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[13px] font-semibold text-green-900">{tr('Attendance Window', 'উপস্থিতির উইন্ডো')}</p>
                <p className="mt-0.5 text-[11px] text-green-700">{tr('Members can only scan QR within this time window.', 'সদস্যরা কেবল এই সময়ের মধ্যে QR স্ক্যান করতে পারবেন।')}</p>
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.attendance_enabled}
                  onChange={(e) => setForm((f) => ({ ...f, attendance_enabled: e.target.checked }))}
                  className="h-4 w-4 rounded accent-green-700"
                />
                <span className="text-[13px] font-semibold text-green-900">{tr('Enable Attendance', 'উপস্থিতি চালু')}</span>
              </label>
            </div>
            {form.attendance_enabled && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-green-800">{tr('Attendance Opens', 'উপস্থিতি শুরু')}</label>
                  <input className="input" type="datetime-local" value={form.attendance_start_time} onChange={(e) => setForm((f) => ({ ...f, attendance_start_time: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-green-800">{tr('Attendance Closes', 'উপস্থিতি শেষ')}</label>
                  <input className="input" type="datetime-local" value={form.attendance_end_time} onChange={(e) => setForm((f) => ({ ...f, attendance_end_time: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? t('common.saving') : t('common.save')}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{t('common.cancel')}</button>
          </div>
        </form>
      )}

      {/* ── Event list ── */}
      <div className="mt-5 flex flex-col gap-2.5">
        {loading ? (
          <ListSkeleton rows={5} />
        ) : visible.length === 0 ? (
          <div className="rounded-[20px] px-5 py-14 text-center" style={{ background: E.card, border: `1px dashed #DDD3BC` }}>
            <div className="text-[18px] font-semibold sm:text-[20px]" style={{ fontFamily: SERIF }}>
              {events.length === 0 ? tr('No events yet', 'এখনো কোনো অনুষ্ঠান নেই') : tr('No events match that', 'কোনো অনুষ্ঠান মেলেনি')}
            </div>
            <div className="mt-1.5 text-[13px]" style={{ color: E.muted }}>
              {events.length === 0 ? tr('Create your first event to get started.', 'শুরু করতে প্রথম অনুষ্ঠান তৈরি করুন।') : tr('Try a different search or filter.', 'অন্য শব্দ বা ফিল্টার দিয়ে দেখুন।')}
            </div>
          </div>
        ) : visible.map((ev) => {
          const tag = tagOf(ev);
          return (
            <article
              key={ev.id}
              className="ev-card rounded-[16px] p-3.5 sm:p-[16px_20px]"
            >
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span
                      className="inline-flex shrink-0 items-center rounded-[7px] px-2.5 py-1 text-[11px] font-bold"
                      style={{ background: PILL[ev.status], color: '#FFF7F0', boxShadow: '0 6px 14px -10px rgba(28,26,21,.8)' }}
                    >
                      {statusLabel(ev.status)}
                    </span>
                    <h2 className="m-0 text-[15.5px] font-bold leading-[1.2] sm:text-[17px]" style={{ fontFamily: SERIF }}>{ev.title}</h2>
                    {ev.event_code && <span className="text-[10.5px]" style={{ fontFamily: MONO, color: E.faint }}>{ev.event_code}</span>}
                    {tag && (
                      <span className="rounded-[7px] px-2.5 py-1 text-[11px] font-bold" style={{ background: tag.bg, color: tag.color }}>{tag.label}</span>
                    )}
                  </div>
                  <p className="m-0 text-[12.5px] sm:text-[13px]" style={{ color: E.meta, textWrap: 'pretty' } as React.CSSProperties}>
                    {[ev.category || typeLabel(ev.type), fmt.date(ev.event_date), ev.location].filter(Boolean).join(' · ')}
                    {' · '}{tr('attendance', 'উপস্থিতি')}: {fmt.num(counts[ev.id] ?? 0)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
                  <Link
                    to={ev.id}
                    className="col-span-2 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full py-2 pl-2.5 pr-4 text-[13px] font-bold transition-transform active:scale-[.97] sm:col-auto"
                    style={{ background: GREEN, color: '#F2FBF4', boxShadow: '0 12px 26px -14px rgba(36,87,53,.85), inset 0 1px 0 rgba(255,255,255,.22)' }}
                  >
                    <span className="grid h-[20px] w-[20px] place-items-center rounded-full" style={{ background: 'rgba(255,255,255,.18)' }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.8 8h10" /><path d="M8.6 3.8 12.8 8l-4.2 4.2" /></svg>
                    </span>
                    {tr('Manage', 'পরিচালনা')}
                  </Link>
                  <button
                    onClick={() => startEdit(ev)}
                    className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold transition-transform active:scale-[.97]"
                    style={{ background: E.card, border: `1px solid ${E.line3}`, color: E.ink2 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11.2 2.6a1.7 1.7 0 0 1 2.4 2.4L6 12.6l-3.2.8.8-3.2z" /></svg>
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => setPendingDelete(ev)}
                    className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold transition-transform active:scale-[.97]"
                    style={{ background: E.card, border: `1px solid ${E.dangerLine}`, color: E.danger }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.8 4.3h10.4" /><path d="M6.3 4.3V3a.8.8 0 0 1 .8-.8h1.8a.8.8 0 0 1 .8.8v1.3" /><path d="M4.2 4.3l.6 8.2a1 1 0 0 0 1 .9h4.4a1 1 0 0 0 1-.9l.6-8.2" /></svg>
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* ── Delete confirmation ── */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-40 grid place-items-center p-4"
          style={{ background: 'rgba(28,26,21,.42)', backdropFilter: 'blur(6px)' }}
          onClick={() => !deleting && setPendingDelete(null)}
        >
          <div
            className="w-full max-w-[440px] rounded-[24px] p-6 sm:p-[30px]"
            style={{ background: E.card, boxShadow: '0 40px 80px -30px rgba(28,26,21,.6)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="m-0 mb-2.5 text-[22px] font-semibold sm:text-[24px]" style={{ fontFamily: SERIF }}>{tr('Delete this event?', 'অনুষ্ঠানটি মুছবেন?')}</h3>
            <p className="m-0 mb-6 text-[14.5px] leading-[1.55]" style={{ color: E.meta }}>
              {tr(
                `${pendingDelete.title} and its attendance records will be removed. This can't be undone.`,
                `${pendingDelete.title} এবং এর উপস্থিতি রেকর্ড মুছে যাবে। এটি ফেরানো যাবে না।`,
              )}
            </p>
            <div className="flex flex-col justify-end gap-2.5 sm:flex-row">
              <button
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                className="rounded-[14px] px-5 py-3 text-[14.5px] font-bold transition-transform active:scale-[.97] disabled:opacity-50"
                style={{ background: E.card, border: `1px solid ${E.segLine}`, color: E.ink }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-[14px] px-5 py-3 text-[14.5px] font-bold transition-transform active:scale-[.97] disabled:opacity-60"
                style={{ background: ORANGE, color: '#FFF6EE', boxShadow: '0 14px 26px -14px rgba(185,58,8,.85)' }}
              >
                {deleting ? tr('Deleting…', 'মুছে ফেলা হচ্ছে…') : tr('Delete event', 'অনুষ্ঠান মুছুন')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
