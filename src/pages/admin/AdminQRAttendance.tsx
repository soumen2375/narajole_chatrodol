import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Attendance, CswoEvent, Member } from '@/types';
import { useT } from '@/i18n';
import { QRCodeCanvas } from 'qrcode.react';
import {
  QrCode, Download, Users, CheckCircle2, XCircle, Clock,
  ChevronDown, UserCheck, Search, Printer, ToggleLeft, ToggleRight,
  RefreshCw, Shield, AlertTriangle,
} from 'lucide-react';

// ── palette ──────────────────────────────────────────────────────────────────
const TEAL  = '#0c756f';
const INK   = '#1c1917';
const INK2  = '#44403c';
const MUTED = '#78716c';
const RULE  = '#e5dec9';
const PAPER = '#faf6ef';
const GREEN = '#16a34a';
const RED   = '#dc2626';
const AMBER = '#d97706';

// ── helpers ───────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm" style={{ border: `1px solid ${RULE}` }}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}18`, color }}>{icon}</div>
      <div>
        <p className="text-[12px] font-medium" style={{ color: MUTED }}>{label}</p>
        <p className="text-2xl font-bold" style={{ color: INK }}>{value}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color }}>{sub}</p>}
      </div>
    </div>
  );
}

function fmtWindowTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function getWindowStatus(ev: CswoEvent): { label: string; color: string; icon: React.ReactNode } {
  if (!ev.attendance_enabled) return { label: 'Disabled', color: MUTED, icon: <XCircle className="h-4 w-4" /> };
  const now = Date.now();
  const start = ev.attendance_start_time ? new Date(ev.attendance_start_time).getTime() : null;
  const end   = ev.attendance_end_time   ? new Date(ev.attendance_end_time).getTime()   : null;
  if (start && now < start) return { label: 'Not Started', color: AMBER, icon: <Clock className="h-4 w-4" /> };
  if (end && now > end)     return { label: 'Closed',      color: RED,   icon: <XCircle className="h-4 w-4" /> };
  return { label: 'Open', color: GREEN, icon: <CheckCircle2 className="h-4 w-4" /> };
}

export default function AdminQRAttendance() {
  const { member: me } = useAuth();
  const { lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [events,  setEvents]  = useState<CswoEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState('');
  const [att, setAtt] = useState<Record<string, Attendance>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [generatingQR, setGeneratingQR] = useState(false);
  const [togglingWindow, setTogglingWindow] = useState(false);
  const [manualModal, setManualModal] = useState<Member | null>(null);
  const [manualNote, setManualNote] = useState('');
  const [manualBusy, setManualBusy] = useState(false);

  const selectedEvent = events.find(e => e.id === selected) ?? null;
  const windowStatus  = selectedEvent ? getWindowStatus(selectedEvent) : null;

  // ── load ───────────────────────────────────────────────────────────────────
  const loadAtt = useCallback(async (eventId: string) => {
    const { data } = await supabase.from('cswo_attendance').select('*').eq('event_id', eventId);
    const map: Record<string, Attendance> = {};
    for (const a of (data ?? []) as Attendance[]) map[a.member_id] = a;
    setAtt(map);
  }, []);

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
        const aUp = a.event_date >= todayStr;
        const bUp = b.event_date >= todayStr;
        if (aUp && !bUp) return -1;
        if (!aUp && bUp) return 1;
        if (aUp && bUp) return a.event_date.localeCompare(b.event_date);
        return b.event_date.localeCompare(a.event_date);
      });
      const evList = sorted as CswoEvent[];
      setEvents(evList);
      setMembers((mem.data ?? []) as Member[]);
      if (evList.length) {
        setSelected(evList[0].id);
        await loadAtt(evList[0].id);
      }
      setLoading(false);
    };
    init();
  }, [loadAtt]);

  useEffect(() => { if (selected) loadAtt(selected); }, [selected, loadAtt]);

  // Realtime attendance subscription
  useEffect(() => {
    if (!selected) return;
    const channel = supabase
      .channel(`att-${selected}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cswo_attendance', filter: `event_id=eq.${selected}` }, () => {
        loadAtt(selected);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected, loadAtt]);

  // ── generate QR token ──────────────────────────────────────────────────────
  // Also auto-enables attendance so members can scan immediately
  const generateQR = async () => {
    if (!selected) return;
    setGeneratingQR(true);
    const token = crypto.randomUUID();
    await supabase.from('cswo_events')
      .update({ attendance_qr_token: token, attendance_enabled: true })
      .eq('id', selected);
    setEvents(evs => evs.map(e =>
      e.id === selected ? { ...e, attendance_qr_token: token, attendance_enabled: true } : e
    ));
    setGeneratingQR(false);
  };

  // ── toggle attendance enabled ──────────────────────────────────────────────
  const toggleAttendance = async () => {
    if (!selectedEvent) return;
    setTogglingWindow(true);
    const newEnabled = !selectedEvent.attendance_enabled;
    // If enabling and no QR token, generate one
    const updates: Record<string, unknown> = { attendance_enabled: newEnabled };
    if (newEnabled && !selectedEvent.attendance_qr_token) {
      updates.attendance_qr_token = crypto.randomUUID();
    }
    await supabase.from('cswo_events').update(updates).eq('id', selected);
    setEvents(evs => evs.map(e =>
      e.id === selected
        ? { ...e, attendance_enabled: newEnabled, attendance_qr_token: (updates.attendance_qr_token as string) ?? e.attendance_qr_token }
        : e
    ));
    setTogglingWindow(false);
  };

  // ── download QR as PNG ─────────────────────────────────────────────────────
  const downloadQR = () => {
    const canvas = document.getElementById('attendance-qr-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-qr-${selectedEvent?.title.replace(/\s+/g, '-') ?? 'event'}.png`;
    a.click();
  };

  // ── print QR ──────────────────────────────────────────────────────────────
  const printQR = () => {
    const canvas = document.getElementById('attendance-qr-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Attendance QR — ${selectedEvent?.title ?? ''}</title>
      <style>
        body { font-family: sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#fff; }
        img { width:320px; height:320px; }
        h2 { font-size:20px; margin:16px 0 4px; color:#1c1917; }
        p  { font-size:13px; color:#78716c; margin:4px 0; }
        .badge { display:inline-block; background:#0c756f; color:#fff; border-radius:999px; padding:4px 14px; font-size:12px; font-weight:600; margin-top:8px; }
      </style></head>
      <body>
        <img src="${dataUrl}" alt="QR Code" />
        <h2>${selectedEvent?.title ?? 'Event'}</h2>
        <p>${selectedEvent?.event_date ?? ''}</p>
        ${selectedEvent?.location ? `<p>${selectedEvent.location}</p>` : ''}
        <span class="badge">Scan to Mark Attendance</span>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  // ── manual mark ───────────────────────────────────────────────────────────
  const markManually = async (m: Member) => {
    if (!selected || !me) return;
    setManualBusy(true);
    await supabase.from('cswo_attendance').upsert(
      {
        event_id: selected,
        member_id: m.id,
        status: 'present',
        marked_by: me.id,
        marked_type: 'ADMIN',
        attendance_method: 'manual',
        check_in_time: new Date().toISOString(),
        note: manualNote || 'Manually marked by admin',
        device_info: `Admin: ${me.full_name}`,
      },
      { onConflict: 'event_id,member_id' },
    );
    // Audit
    await supabase.from('cswo_audit_log').insert({
      actor_id: me.id,
      action: 'attendance_manually_added',
      entity: 'attendance',
      entity_id: selected,
      detail: { event_id: selected, member_id: m.id, admin_id: me.id, note: manualNote },
    });
    await loadAtt(selected);
    setManualBusy(false);
    setManualModal(null);
    setManualNote('');
  };

  const clearMark = async (memberId: string) => {
    if (!selected) return;
    setBusy(memberId);
    await supabase.from('cswo_attendance').delete().eq('event_id', selected).eq('member_id', memberId);
    await loadAtt(selected);
    setBusy(null);
  };

  // ── export CSV ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const ev = selectedEvent;
    if (!ev) return;
    const header = ['Name', 'Membership ID', 'Phone', 'Attendance Time', 'Method'];
    const rows = members
      .filter(m => att[m.id])
      .map(m => {
        const a = att[m.id];
        return [
          m.full_name,
          m.member_serial ? `CSWO-${String(m.member_serial).padStart(4, '0')}` : '',
          m.phone ?? '',
          a?.check_in_time ? new Date(a.check_in_time).toLocaleString('en-IN') : '',
          a?.attendance_method ?? 'qr',
        ];
      });
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${ev.title.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── stats ──────────────────────────────────────────────────────────────────
  const total        = members.length;
  const presentCount = Object.values(att).filter(a => a.status === 'present' || a.status === 'volunteered').length;
  const absentCount  = total - presentCount;
  const rate         = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  const filtered = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (m.member_serial ? `CSWO-${String(m.member_serial).padStart(4, '0')}` : '').toLowerCase().includes(search.toLowerCase()),
  );

  const pad = (n: number) => String(n).padStart(2, '0');
  const fmtTime = (s: string) => {
    const d = new Date(s);
    const h = d.getHours();
    return `${pad(h % 12 || 12)}:${pad(d.getMinutes())} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200" style={{ borderTopColor: TEAL }} />
      </div>
    );
  }

  // Build QR payload
  const qrPayload = selectedEvent?.attendance_qr_token
    ? JSON.stringify({ eventId: selectedEvent.id, token: selectedEvent.attendance_qr_token })
    : null;

  return (
    <div style={{ background: PAPER, minHeight: '100vh' }} className="-m-4 sm:-m-6 p-4 sm:p-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: INK }}>
            {tr('QR Attendance Management', 'QR উপস্থিতি ব্যবস্থাপনা')}
          </h1>
          <p className="mt-0.5 text-[13px]" style={{ color: MUTED }}>
            {tr('Generate static QR codes · Members scan to mark attendance · No GPS required.',
              'স্থায়ী QR তৈরি করুন · সদস্যরা স্ক্যান করে উপস্থিতি দেন · GPS প্রয়োজন নেই।')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Event selector */}
          <div className="relative">
            <select
              className="appearance-none rounded-full border pl-4 pr-9 py-2 text-[13px] font-medium shadow-sm outline-none"
              style={{ borderColor: RULE, color: INK, background: '#fff' }}
              value={selected}
              onChange={e => setSelected(e.target.value)}
            >
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} {ev.attendance_enabled ? '🟢' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4" style={{ color: MUTED }} />
          </div>

          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold"
            style={{ borderColor: RULE, color: INK2, background: '#fff' }}
          >
            <Download className="h-4 w-4" />
            {tr('Export CSV', 'CSV রপ্তানি')}
          </button>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={tr('Attendance Rate', 'উপস্থিতির হার')} value={`${rate}%`}
          sub={`${presentCount} ${tr('of', 'এর মধ্যে')} ${total}`}
          color={TEAL} icon={<Users className="h-5 w-5" />} />
        <StatCard label={tr('Present', 'উপস্থিত')} value={presentCount}
          sub={`${rate}% ${tr('of total', 'মোটের')}`}
          color={GREEN} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label={tr('Absent', 'অনুপস্থিত')} value={absentCount}
          sub={total > 0 ? `${Math.round((absentCount / total) * 100)}% ${tr('of total', 'মোটের')}` : ''}
          color={RED} icon={<XCircle className="h-5 w-5" />} />
        <StatCard label={tr('Total Members', 'মোট সদস্য')} value={total}
          sub={tr('Registered', 'নিবন্ধিত')}
          color={AMBER} icon={<UserCheck className="h-5 w-5" />} />
      </div>

      {/* ── Main Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* ── QR Card (left, 2/5) ─────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm" style={{ border: `1px solid ${RULE}` }}>
            {/* Card header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-[16px]" style={{ color: INK }}>
                {tr('Attendance QR Code', 'উপস্থিতি QR কোড')}
              </h2>
              {windowStatus && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
                  style={{ background: `${windowStatus.color}18`, color: windowStatus.color }}>
                  {windowStatus.icon}
                  {windowStatus.label}
                </span>
              )}
            </div>

            {/* QR display */}
            {qrPayload ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative rounded-2xl p-3 shadow-inner" style={{ background: PAPER, border: `2px solid ${RULE}` }}>
                  <QRCodeCanvas
                    id="attendance-qr-canvas"
                    value={qrPayload}
                    size={260}
                    level="H"
                    includeMargin
                    style={{ borderRadius: 8, display: 'block' }}
                  />
                  {/* Static badge */}
                  <div className="absolute bottom-4 right-4 rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
                    style={{ background: TEAL }}>
                    STATIC
                  </div>
                </div>

                {/* Event info below QR */}
                <div className="w-full text-center">
                  <p className="font-bold text-[15px]" style={{ color: INK }}>{selectedEvent?.title}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
                    {tr('QR never changes for this event', 'এই অনুষ্ঠানের QR কখনো পরিবর্তন হয় না')}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex w-full gap-2">
                  <button onClick={downloadQR}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-white"
                    style={{ background: TEAL }}>
                    <Download className="h-4 w-4" />
                    {tr('Download', 'ডাউনলোড')}
                  </button>
                  <button onClick={printQR}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold border"
                    style={{ borderColor: TEAL, color: TEAL }}>
                    <Printer className="h-4 w-4" />
                    {tr('Print', 'প্রিন্ট')}
                  </button>
                </div>

                {/* Re-generate (with warning) */}
                <button onClick={() => {
                  if (window.confirm(tr(
                    'This will generate a NEW QR code. Old printed QR codes will no longer work. Continue?',
                    'এটি একটি নতুন QR কোড তৈরি করবে। পুরানো QR কোড আর কাজ করবে না। চালিয়ে যাবেন?'
                  ))) generateQR();
                }}
                  disabled={generatingQR}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-2 text-[12px] font-semibold border"
                  style={{ borderColor: RULE, color: MUTED }}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  {generatingQR ? tr('Generating…', 'তৈরি হচ্ছে…') : tr('Regenerate QR', 'QR পুনরায় তৈরি')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-52 w-52 items-center justify-center rounded-2xl"
                  style={{ background: PAPER, border: `2px dashed ${RULE}` }}>
                  <div className="text-center">
                    <QrCode className="mx-auto h-10 w-10 mb-2" style={{ color: RULE }} />
                    <p className="text-[12px]" style={{ color: MUTED }}>
                      {tr('No QR generated yet', 'এখনো কোনো QR নেই')}
                    </p>
                  </div>
                </div>
                <button onClick={generateQR} disabled={generatingQR}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-semibold text-white"
                  style={{ background: TEAL }}>
                  <QrCode className="h-4 w-4" />
                  {generatingQR ? tr('Generating…', 'তৈরি হচ্ছে…') : tr('Generate Attendance QR', 'উপস্থিতি QR তৈরি করুন')}
                </button>
              </div>
            )}

            {/* Attendance window toggle */}
            <div className="mt-4 rounded-xl p-3" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-[13px]" style={{ color: INK }}>
                    {tr('Attendance Window', 'উপস্থিতির সময়')}
                  </p>
                  {selectedEvent?.attendance_start_time && (
                    <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
                      {fmtWindowTime(selectedEvent.attendance_start_time)}
                      {' → '}
                      {fmtWindowTime(selectedEvent.attendance_end_time)}
                    </p>
                  )}
                </div>
                <button onClick={toggleAttendance} disabled={togglingWindow}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors"
                  style={{
                    background: selectedEvent?.attendance_enabled ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
                    color: selectedEvent?.attendance_enabled ? GREEN : RED,
                  }}>
                  {selectedEvent?.attendance_enabled
                    ? <><ToggleRight className="h-4 w-4" /> {tr('Enabled', 'চালু')}</>
                    : <><ToggleLeft className="h-4 w-4" /> {tr('Disabled', 'বন্ধ')}</>}
                </button>
              </div>
              {!selectedEvent?.attendance_start_time && (
                <p className="text-[11px]" style={{ color: MUTED }}>
                  {tr('No time window set — members can scan any time while attendance is enabled.',
                    'কোনো সময় নির্ধারিত নেই — উপস্থিতি চালু থাকলে যেকোনো সময় স্ক্যান করা যাবে।')}
                </p>
              )}
            </div>

            {/* Security note */}
            <div className="mt-3 flex items-start gap-2 rounded-xl p-3 text-[11.5px]"
              style={{ background: 'rgba(12,117,111,0.06)', color: TEAL }}>
              <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                {tr(
                  'QR is validated server-side. Token is stored in the database and verified on every scan.',
                  'QR সার্ভার-সাইডে যাচাই হয়। টোকেন ডেটাবেসে সংরক্ষিত এবং প্রতিটি স্ক্যানে যাচাই করা হয়।'
                )}
              </span>
            </div>
          </div>
        </div>

        {/* ── Member Table (right, 3/5) ────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden" style={{ border: `1px solid ${RULE}` }}>
            {/* Table toolbar */}
            <div className="flex flex-wrap items-center gap-3 border-b p-4" style={{ borderColor: RULE }}>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: MUTED }} />
                <input
                  type="text"
                  placeholder={tr('Search member…', 'সদস্য খুঁজুন…')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-full border py-2 pl-9 pr-4 text-[13px] outline-none"
                  style={{ borderColor: RULE, color: INK }}
                />
              </div>
              <span className="text-[12px]" style={{ color: MUTED }}>
                {presentCount} / {total} {tr('present', 'উপস্থিত')}
              </span>
            </div>

            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-[13px]">
                <thead style={{ background: PAPER, position: 'sticky', top: 0 }}>
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: MUTED }}>{tr('Member', 'সদস্য')}</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: MUTED }}>ID</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: MUTED }}>{tr('Time', 'সময়')}</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: MUTED }}>{tr('Method', 'পদ্ধতি')}</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: MUTED }}>{tr('Status', 'অবস্থা')}</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: MUTED }}>{tr('Actions', 'পদক্ষেপ')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, idx) => {
                    const a = att[m.id];
                    const serial = m.member_serial ? `CSWO-${String(m.member_serial).padStart(4, '0')}` : '—';
                    const isPresent = a?.status === 'present' || a?.status === 'volunteered';

                    return (
                      <tr key={m.id} style={{ background: idx % 2 === 0 ? '#fff' : PAPER, borderBottom: `1px solid ${RULE}` }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                              style={{ background: isPresent ? GREEN : TEAL }}>
                              {m.full_name[0]}
                            </div>
                            <span className="font-medium" style={{ color: INK }}>{m.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11.5px]" style={{ color: MUTED }}>{serial}</td>
                        <td className="px-4 py-3 text-[12px]" style={{ color: INK2 }}>
                          {a?.check_in_time ? fmtTime(a.check_in_time) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {a ? (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                              style={{ background: a.attendance_method === 'manual' ? 'rgba(217,119,6,0.1)' : 'rgba(12,117,111,0.1)', color: a.attendance_method === 'manual' ? AMBER : TEAL }}>
                              {a.attendance_method ?? 'qr'}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {a ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold"
                              style={{ background: isPresent ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)', color: isPresent ? GREEN : RED }}>
                              {isPresent ? <><CheckCircle2 className="h-3 w-3" /> {tr('Present', 'উপস্থিত')}</> : <><XCircle className="h-3 w-3" /> {tr('Absent', 'অনুপস্থিত')}</>}
                            </span>
                          ) : (
                            <span className="text-[12px] italic" style={{ color: MUTED }}>{tr('Not marked', 'চিহ্নিত নয়')}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isPresent && (
                              <button onClick={() => setManualModal(m)}
                                className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                                style={{ background: GREEN }}>
                                {tr('Mark', 'চিহ্নিত')}
                              </button>
                            )}
                            {a && (
                              <button onClick={() => clearMark(m.id)} disabled={busy === m.id}
                                className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                                style={{ borderColor: RED, color: RED }}>
                                {busy === m.id ? '…' : tr('Remove', 'মুছুন')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="py-10 text-center text-[13px]" style={{ color: MUTED }}>
                      {tr('No members found.', 'কোনো সদস্য পাওয়া যায়নি।')}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Manual Mark Modal ─────────────────────────────────────────────── */}
      {manualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${AMBER}18` }}>
                <AlertTriangle className="h-5 w-5" style={{ color: AMBER }} />
              </div>
              <div>
                <h3 className="font-bold text-[15px]" style={{ color: INK }}>
                  {tr('Manual Attendance Override', 'ম্যানুয়াল উপস্থিতি')}
                </h3>
                <p className="text-[12px]" style={{ color: MUTED }}>
                  {tr('This will be recorded in the audit log.', 'এটি অডিট লগে রেকর্ড হবে।')}
                </p>
              </div>
            </div>

            <div className="rounded-xl p-3 mb-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
              <p className="font-semibold text-[13px]" style={{ color: INK }}>{manualModal.full_name}</p>
              <p className="text-[12px] mt-0.5" style={{ color: MUTED }}>
                {manualModal.member_serial ? `CSWO-${String(manualModal.member_serial).padStart(4, '0')}` : ''} · {manualModal.phone ?? ''}
              </p>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-[12px] font-medium" style={{ color: INK2 }}>
                {tr('Reason (optional)', 'কারণ (ঐচ্ছিক)')}
              </label>
              <input
                type="text"
                className="w-full rounded-xl border px-3 py-2 text-[13px] outline-none"
                style={{ borderColor: RULE, color: INK }}
                placeholder={tr('e.g. Network issue, phone battery dead', 'যেমন: নেটওয়ার্ক সমস্যা, ফোন বন্ধ')}
                value={manualNote}
                onChange={e => setManualNote(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => markManually(manualModal)} disabled={manualBusy}
                className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-white"
                style={{ background: GREEN }}>
                {manualBusy ? tr('Marking…', 'চিহ্নিত হচ্ছে…') : tr('Mark Present', 'উপস্থিত চিহ্নিত করুন')}
              </button>
              <button onClick={() => { setManualModal(null); setManualNote(''); }}
                className="flex-1 rounded-xl border py-2.5 text-[13px] font-semibold"
                style={{ borderColor: RULE, color: INK2 }}>
                {tr('Cancel', 'বাতিল')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
