import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Attendance, CswoEvent, Member, QrSession } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { QRCodeCanvas } from 'qrcode.react';
import {
  QrCode, RefreshCw, Play, Square, Download, Users,
  CheckCircle2, XCircle, Clock, MapPin, ChevronDown,
  UserCheck, AlertTriangle, Search, MoreHorizontal,
} from 'lucide-react';

// ── palette ─────────────────────────────────────────────────────────────────
const TEAL   = '#0c756f';
const INK    = '#1c1917';
const INK2   = '#44403c';
const MUTED  = '#78716c';
const RULE   = '#e5dec9';
const PAPER  = '#faf6ef';
const GREEN  = '#16a34a';
const RED    = '#dc2626';
const AMBER  = '#d97706';

// ── helpers ──────────────────────────────────────────────────────────────────

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}


function StatCard({
  label, value, sub, color, icon,
}: {
  label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm"
      style={{ border: `1px solid ${RULE}` }}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div>
        <p className="text-[12px] font-medium" style={{ color: MUTED }}>{label}</p>
        <p className="text-2xl font-bold" style={{ color: INK }}>{value}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color }}>{sub}</p>}
      </div>
    </div>
  );
}

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
  const [qrSession, setQrSession] = useState<QrSession | null>(null);
  const [qrRefreshSecs, setQrRefreshSecs] = useState(30);
  const [showQR, setShowQR] = useState(false);
  const [search, setSearch] = useState('');
  const [selected_members, setSelectedMembers] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [countdown, setCountdown] = useState(30);

  const selectedEvent = events.find(e => e.id === selected) ?? null;
  const isLive = selectedEvent?.status === 'live';

  // ── load ─────────────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (selected) loadAtt(selected);
  }, [selected, loadAtt]);

  // ── live QR session ───────────────────────────────────────────────────────
  const loadQrSession = useCallback(async () => {
    if (!selected) return;
    const { data } = await supabase
      .from('cswo_event_qr_sessions')
      .select('*')
      .eq('event_id', selected)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setQrSession(data as QrSession | null);
  }, [selected]);

  useEffect(() => {
    if (isLive) {
      loadQrSession();
    } else {
      setQrSession(null);
    }
  }, [isLive, loadQrSession]);

  // Auto-refresh QR every 30 seconds when live
  useEffect(() => {
    if (qrTimerRef.current) clearInterval(qrTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!isLive || !showQR) return;

    setCountdown(qrRefreshSecs);
    qrTimerRef.current = setInterval(() => {
      generateNewQR();
      setCountdown(qrRefreshSecs);
    }, qrRefreshSecs * 1000);
    countdownRef.current = setInterval(() => {
      setCountdown(c => (c <= 1 ? qrRefreshSecs : c - 1));
    }, 1000);

    return () => {
      if (qrTimerRef.current) clearInterval(qrTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, showQR, qrRefreshSecs]);

  const generateNewQR = async () => {
    if (!selected || !me) return;
    // Deactivate old sessions
    await supabase.from('cswo_event_qr_sessions')
      .update({ is_active: false })
      .eq('event_id', selected);
    // Create new session with short token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + qrRefreshSecs * 1000 + 5000).toISOString();
    // Fix 5: Short payload {e, t} — smaller QR = faster scan
    const qrPayload = JSON.stringify({ e: selected, t: token });
    const { data } = await supabase.from('cswo_event_qr_sessions').insert({
      event_id: selected,
      session_token: token,
      expires_at: expiresAt,
      created_by: me.id,
      is_active: true,
    }).select().single();
    if (data) setQrSession({ ...(data as QrSession), session_token: qrPayload });
    setCountdown(qrRefreshSecs);
  };

  // ── start / stop attendance ───────────────────────────────────────────────
  const startAttendance = async () => {
    if (!selected) return;
    setBusy('start');
    await supabase.from('cswo_events').update({ status: 'live' }).eq('id', selected);
    setEvents(evs => evs.map(e => e.id === selected ? { ...e, status: 'live' } : e));
    await generateNewQR();
    setShowQR(true);
    setBusy(null);
  };

  const stopAttendance = async () => {
    if (!selected) return;
    if (!window.confirm(tr('Stop attendance? QR will be disabled.', 'উপস্থিতি বন্ধ করবেন? QR নিষ্ক্রিয় হবে।'))) return;
    setBusy('stop');
    await supabase.from('cswo_events').update({ status: 'completed' }).eq('id', selected);
    await supabase.from('cswo_event_qr_sessions').update({ is_active: false }).eq('event_id', selected);
    setEvents(evs => evs.map(e => e.id === selected ? { ...e, status: 'completed' } : e));
    setQrSession(null);
    setShowQR(false);
    if (qrTimerRef.current) clearInterval(qrTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setBusy(null);
  };

  // ── mark attendance ───────────────────────────────────────────────────────
  const mark = async (memberId: string, status: 'present' | 'absent' | 'volunteered') => {
    if (!selected) return;
    setBusy(memberId);
    await supabase.from('cswo_attendance').upsert(
      {
        event_id: selected,
        member_id: memberId,
        status,
        marked_by: me?.id,
        marked_type: 'ADMIN',
        check_in_time: status !== 'absent' ? new Date().toISOString() : null,
      },
      { onConflict: 'event_id,member_id' },
    );
    await loadAtt(selected);
    setBusy(null);
  };

  const clearMark = async (memberId: string) => {
    if (!selected) return;
    setBusy(memberId);
    await supabase.from('cswo_attendance').delete().eq('event_id', selected).eq('member_id', memberId);
    await loadAtt(selected);
    setBusy(null);
  };

  const bulkMark = async (status: 'present' | 'absent') => {
    if (!selected || selected_members.size === 0) return;
    setBulkBusy(true);
    await Promise.all([...selected_members].map(mid =>
      supabase.from('cswo_attendance').upsert(
        {
          event_id: selected, member_id: mid, status,
          marked_by: me?.id, marked_type: 'ADMIN',
          check_in_time: status === 'present' ? new Date().toISOString() : null,
        },
        { onConflict: 'event_id,member_id' },
      ),
    ));
    setSelectedMembers(new Set());
    await loadAtt(selected);
    setBulkBusy(false);
  };

  // ── export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const ev = selectedEvent;
    if (!ev) return;
    const header = ['Name', 'Member ID', 'Status', 'Check-in Time', 'Method', 'Location'];
    const rows = members.map(m => {
      const a = att[m.id];
      return [
        m.full_name,
        m.member_serial ? `CSWO-${String(m.member_serial).padStart(4, '0')}` : '',
        a ? a.status : 'absent',
        a?.check_in_time ? fmt.date(a.check_in_time) : '',
        a?.marked_type ?? '',
        a?.latitude ? `${a.latitude.toFixed(4)},${a.longitude?.toFixed(4)}` : '',
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

  // ── derived stats ─────────────────────────────────────────────────────────
  const total = members.length;
  const presentCount = Object.values(att).filter(a => a.status === 'present' || a.status === 'volunteered').length;
  const absentCount  = Object.values(att).filter(a => a.status === 'absent').length;
  const pendingCount = total - Object.keys(att).length;
  const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
  const recentCheckIns = Object.values(att)
    .filter(a => a.check_in_time)
    .sort((a, b) => new Date(b.check_in_time!).getTime() - new Date(a.check_in_time!).getTime())
    .slice(0, 5);

  const filtered = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (m.member_serial ? `CSWO-${String(m.member_serial).padStart(4, '0')}` : '').includes(search),
  );

  const pad = (n: number) => String(n).padStart(2, '0');
  const fmtTime = (s: string) => {
    const d = new Date(s);
    const h = d.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${pad(h % 12 || 12)}:${pad(d.getMinutes())} ${ampm}`;
  };

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedMembers(prev =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map(m => m.id)),
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200"
          style={{ borderTopColor: TEAL }} />
      </div>
    );
  }

  // qrSession.session_token stores the short JSON payload {e, t} set by generateNewQR
  const qrPayload = qrSession ? qrSession.session_token : '';

  return (
    <div style={{ background: PAPER, minHeight: '100vh' }} className="-m-4 sm:-m-6 p-4 sm:p-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: INK }}>
            {tr('Attendance Management', 'উপস্থিতি ব্যবস্থাপনা')}
          </h1>
          <p className="mt-0.5 text-[13px]" style={{ color: MUTED }}>
            {tr('Track member attendance using QR check-in or manual verification.', 'QR চেক-ইন বা ম্যানুয়ালি সদস্যদের উপস্থিতি ট্র্যাক করুন।')}
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
                  {ev.title} {ev.status === 'live' ? '🟢' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4" style={{ color: MUTED }} />
          </div>

          {/* Generate QR */}
          {isLive && (
            <button
              onClick={() => { setShowQR(v => !v); if (!showQR) generateNewQR(); }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold border"
              style={{ borderColor: TEAL, color: TEAL, background: '#fff' }}
            >
              <QrCode className="h-4 w-4" />
              {tr('Generate QR', 'QR তৈরি')}
            </button>
          )}

          {/* Start/Stop */}
          {!isLive ? (
            <button
              disabled={busy === 'start' || !selected}
              onClick={startAttendance}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-semibold text-white shadow-sm"
              style={{ background: GREEN }}
            >
              <Play className="h-4 w-4" fill="white" />
              {busy === 'start' ? tr('Starting…', 'শুরু হচ্ছে…') : tr('Start Attendance', 'উপস্থিতি শুরু')}
            </button>
          ) : (
            <button
              disabled={busy === 'stop'}
              onClick={stopAttendance}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-semibold text-white shadow-sm"
              style={{ background: RED }}
            >
              <Square className="h-4 w-4" fill="white" />
              {busy === 'stop' ? tr('Stopping…', 'বন্ধ হচ্ছে…') : tr('Stop Attendance', 'উপস্থিতি বন্ধ')}
            </button>
          )}

          {/* Export */}
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold"
            style={{ borderColor: RULE, color: INK2, background: '#fff' }}
          >
            <Download className="h-4 w-4" />
            {tr('Export', 'রপ্তানি')}
          </button>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={tr('Attendance Rate', 'উপস্থিতির হার')} value={`${rate}%`}
          sub={`+3% ${tr('vs last event', 'আগের অনুষ্ঠান থেকে')}`}
          color={TEAL} icon={<Users className="h-5 w-5" />} />
        <StatCard label={tr('Present', 'উপস্থিত')} value={presentCount}
          sub={`${rate}% ${tr('of total', 'মোটের')}`}
          color={GREEN} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label={tr('Absent', 'অনুপস্থিত')} value={absentCount}
          sub={total > 0 ? `${Math.round((absentCount / total) * 100)}% ${tr('of total', 'মোটের')}` : ''}
          color={RED} icon={<XCircle className="h-5 w-5" />} />
        <StatCard label={tr('Pending', 'অপেক্ষমান')} value={pendingCount}
          sub={tr('Needs action', 'পদক্ষেপ প্রয়োজন')}
          color={AMBER} icon={<Clock className="h-5 w-5" />} />
      </div>

      {/* ── Main 3-column grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Col 1: QR Check-in */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: `1px solid ${RULE}` }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-[15px]" style={{ color: INK }}>
                {tr('QR Check-in', 'QR চেক-ইন')}
              </h2>
              {isLive && (
                <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: 'rgba(22,163,74,0.1)', color: GREEN }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  LIVE
                </span>
              )}
            </div>
            <p className="mb-3 text-[12px]" style={{ color: MUTED }}>
              {isLive
                ? tr('Members can scan this QR to mark attendance', 'সদস্যরা উপস্থিতি দিতে এই QR স্ক্যান করতে পারেন')
                : tr('Start attendance session to generate QR', 'QR তৈরি করতে উপস্থিতি সেশন শুরু করুন')}
            </p>

            {showQR && qrPayload ? (
              <div className="flex flex-col items-center">
                <div className="relative">
                  <QRCodeCanvas
                    value={qrPayload}
                    size={210}
                    level="H"
                    includeMargin
                    style={{ borderRadius: 8 }}
                  />
                  <div className="absolute bottom-0 right-0 rounded-tl-lg rounded-br-lg px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ background: countdown <= 10 ? RED : TEAL }}>
                    {countdown}s
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-center" style={{ color: MUTED }}>
                  {tr('Refreshes every', 'প্রতি')} {qrRefreshSecs} {tr('seconds', 'সেকেন্ডে পরিবর্তন')}
                </p>
              </div>
            ) : (
              <div className="flex h-[180px] items-center justify-center rounded-xl"
                style={{ background: PAPER, border: `2px dashed ${RULE}` }}>
                <div className="text-center">
                  <QrCode className="mx-auto h-8 w-8 mb-2" style={{ color: RULE }} />
                  <p className="text-[12px]" style={{ color: MUTED }}>
                    {isLive ? tr('Click "Generate QR" above', '"QR তৈরি" ক্লিক করুন') : tr('Not started yet', 'এখনো শুরু হয়নি')}
                  </p>
                </div>
              </div>
            )}

            {/* Event info */}
            <div className="mt-4 space-y-2 text-[12.5px]" style={{ color: INK2 }}>
              {selectedEvent && (
                <>
                  <div className="flex items-center gap-2">
                    <QrCode className="h-3.5 w-3.5 shrink-0" style={{ color: TEAL }} />
                    <span className="font-medium">{selectedEvent.title}</span>
                  </div>
                  {(selectedEvent.start_time || selectedEvent.end_time) && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: TEAL }} />
                      <span>{selectedEvent.start_time} – {selectedEvent.end_time}</span>
                    </div>
                  )}
                  {selectedEvent.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: TEAL }} />
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: isLive ? GREEN : MUTED }} />
                    <span style={{ color: isLive ? GREEN : MUTED }}>
                      {isLive ? tr('Active', 'সক্রিয়') : tr(selectedEvent.status, selectedEvent.status)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {showQR && (
              <button
                onClick={() => { generateNewQR(); setCountdown(qrRefreshSecs); }}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full py-2 text-[13px] font-semibold border"
                style={{ borderColor: TEAL, color: TEAL }}
              >
                <RefreshCw className="h-4 w-4" />
                {tr('Refresh QR', 'QR রিফ্রেশ')}
              </button>
            )}

            {/* Refresh interval selector */}
            {isLive && (
              <div className="mt-3 flex items-center gap-2 text-[12px]" style={{ color: MUTED }}>
                <span>{tr('Auto-refresh:', 'স্বয়ংক্রিয়:')}</span>
                {[30, 60].map(s => (
                  <button key={s}
                    onClick={() => setQrRefreshSecs(s)}
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{
                      background: qrRefreshSecs === s ? TEAL : PAPER,
                      color: qrRefreshSecs === s ? '#fff' : MUTED,
                      border: `1px solid ${qrRefreshSecs === s ? TEAL : RULE}`,
                    }}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Col 2: Recent Check-ins */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: `1px solid ${RULE}` }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-[15px]" style={{ color: INK }}>
                {tr('Recent Check-ins', 'সাম্প্রতিক চেক-ইন')}
              </h2>
              <button className="text-[12px] font-semibold" style={{ color: TEAL }}>
                {tr('View all', 'সব দেখুন')}
              </button>
            </div>
            {recentCheckIns.length === 0 ? (
              <p className="py-8 text-center text-[13px]" style={{ color: MUTED }}>
                {tr('No check-ins yet', 'এখনো কোনো চেক-ইন নেই')}
              </p>
            ) : (
              <div className="space-y-2">
                {recentCheckIns.map(a => {
                  const m = members.find(mem => mem.id === a.member_id);
                  if (!m) return null;
                  const serial = m.member_serial ? `CSWO-${String(m.member_serial).padStart(4, '0')}` : '';
                  return (
                    <div key={a.id} className="flex items-center gap-3 rounded-xl p-2.5"
                      style={{ background: PAPER }}>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                        style={{ background: TEAL }}>
                        {m.full_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-[13px] font-semibold" style={{ color: INK }}>{m.full_name}</p>
                        <p className="text-[11px]" style={{ color: MUTED }}>{serial}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[12px]" style={{ color: MUTED }}>
                          {a.check_in_time ? fmtTime(a.check_in_time) : ''}
                        </span>
                        <CheckCircle2 className="h-4 w-4" style={{ color: GREEN }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bulk action links */}
            <div className="mt-3 flex flex-wrap gap-3 border-t pt-3" style={{ borderColor: RULE }}>
              {['Mark Present', 'Mark Absent', 'Mark Late', 'Manual Check-in'].map((lbl, i) => {
                const colors = [GREEN, RED, AMBER, TEAL];
                return (
                  <button key={lbl} className="flex items-center gap-1 text-[12px] font-semibold"
                    style={{ color: colors[i] }}>
                    {i === 0 && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {i === 1 && <XCircle className="h-3.5 w-3.5" />}
                    {i === 2 && <Clock className="h-3.5 w-3.5" />}
                    {i === 3 && <UserCheck className="h-3.5 w-3.5" />}
                    {tr(lbl, lbl)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Col 3: Today's Summary + Quick Actions */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: `1px solid ${RULE}` }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-[15px]" style={{ color: INK }}>
                {tr("Today's Event Summary", 'আজকের অনুষ্ঠানের সারসংক্ষেপ')}
              </h2>
              <Download className="h-4 w-4" style={{ color: MUTED }} />
            </div>
            {selectedEvent && (
              <div>
                <p className="text-[11px] uppercase tracking-wide mb-0.5" style={{ color: MUTED }}>Event</p>
                <p className="font-bold text-[15px] mb-3" style={{ color: INK }}>{selectedEvent.title}</p>
                {[
                  { label: tr('Total Members', 'মোট সদস্য'), value: total, color: INK },
                  { label: tr('Present', 'উপস্থিত'), value: presentCount, color: GREEN },
                  { label: tr('Absent', 'অনুপস্থিত'), value: absentCount, color: RED },
                  { label: tr('Pending', 'অপেক্ষমান'), value: pendingCount, color: AMBER },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-1.5 text-[13px]"
                    style={{ borderBottom: `1px solid ${RULE}` }}>
                    <span style={{ color: MUTED }}>{row.label}</span>
                    <span className="font-bold" style={{ color: row.color }}>{row.value}</span>
                  </div>
                ))}
                <div className="mt-2 flex items-center justify-between text-[13px]">
                  <span style={{ color: MUTED }}>{tr('Attendance Rate', 'উপস্থিতির হার')}</span>
                  <span className="rounded-full px-3 py-0.5 text-[12px] font-bold text-white"
                    style={{ background: rate >= 70 ? GREEN : rate >= 50 ? AMBER : RED }}>
                    {rate}%
                  </span>
                </div>
              </div>
            )}

            {/* Status indicators */}
            <div className="mt-4 space-y-2 border-t pt-3" style={{ borderColor: RULE }}>
              {[
                { label: tr('QR Status', 'QR স্ট্যাটাস'), active: isLive, val: isLive ? tr('Active', 'সক্রিয়') : tr('Inactive', 'নিষ্ক্রিয়') },
                { label: tr('Location Verification', 'অবস্থান যাচাই'), active: true, val: tr('Enabled', 'সক্রিয়') },
                { label: tr('Admin Override', 'অ্যাডমিন ওভাররাইড'), active: true, val: tr('Enabled', 'সক্রিয়') },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between text-[12.5px]">
                  <span style={{ color: INK2 }}>{item.label}</span>
                  <span className="flex items-center gap-1.5 font-semibold"
                    style={{ color: item.active ? GREEN : MUTED }}>
                    <span className={`h-1.5 w-1.5 rounded-full ${item.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    {item.val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: `1px solid ${RULE}` }}>
            <h2 className="mb-3 font-semibold text-[15px]" style={{ color: INK }}>
              {tr('Quick Actions', 'দ্রুত পদক্ষেপ')}
            </h2>
            {[
              { label: tr('View Attendance Report', 'উপস্থিতি রিপোর্ট'), icon: <Users className="h-4 w-4" /> },
              { label: tr('Export Attendance', 'উপস্থিতি রপ্তানি'), icon: <Download className="h-4 w-4" />, action: exportCSV },
              { label: tr('Attendance Settings', 'উপস্থিতি সেটিংস'), icon: <AlertTriangle className="h-4 w-4" /> },
              { label: tr('Manage Events', 'অনুষ্ঠান পরিচালনা'), icon: <QrCode className="h-4 w-4" /> },
            ].map(qa => (
              <button key={qa.label}
                onClick={qa.action}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-gray-50"
                style={{ color: INK2 }}>
                <div className="flex items-center gap-2.5">
                  <span style={{ color: TEAL }}>{qa.icon}</span>
                  {qa.label}
                </div>
                <span style={{ color: MUTED }}>›</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Member Table ─────────────────────────────────────────────────── */}
      <div className="mt-6 rounded-2xl bg-white shadow-sm" style={{ border: `1px solid ${RULE}` }}>
        {/* Table header */}
        <div className="flex flex-wrap items-center gap-3 border-b p-4" style={{ borderColor: RULE }}>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: MUTED }} />
            <input
              type="text"
              placeholder={tr('Search member...', 'সদস্য খুঁজুন...')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-full border py-2 pl-9 pr-4 text-[13px] outline-none"
              style={{ borderColor: RULE, color: INK }}
            />
          </div>
          {selected_members.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => bulkMark('present')}
                disabled={bulkBusy}
                className="rounded-full px-4 py-2 text-[12px] font-semibold text-white"
                style={{ background: GREEN }}
              >
                {tr('Mark Selected Present', 'নির্বাচিতদের উপস্থিত')}
              </button>
              <button
                onClick={() => bulkMark('absent')}
                disabled={bulkBusy}
                className="rounded-full border px-4 py-2 text-[12px] font-semibold"
                style={{ borderColor: RED, color: RED }}
              >
                {tr('Mark Selected Absent', 'নির্বাচিতদের অনুপস্থিত')}
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead style={{ background: PAPER }}>
              <tr>
                <th className="px-4 py-3 text-left">
                  <input type="checkbox"
                    checked={selected_members.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded accent-teal-700"
                  />
                </th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: MUTED }}>
                  {tr('Member', 'সদস্য')}
                </th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: MUTED }}>ID</th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: MUTED }}>
                  {tr('Location', 'অবস্থান')}
                </th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: MUTED }}>
                  {tr('Check-in Time', 'চেক-ইন সময়')}
                </th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: MUTED }}>
                  {t('common.status')}
                </th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: MUTED }}>
                  {tr('Actions', 'পদক্ষেপ')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, idx) => {
                const a = att[m.id];
                const serial = m.member_serial ? `CSWO-${String(m.member_serial).padStart(4, '0')}` : '—';
                const isPresentLike = a?.status === 'present' || a?.status === 'volunteered';
                const isAbsent = a?.status === 'absent';

                return (
                  <tr key={m.id}
                    style={{ background: idx % 2 === 0 ? '#fff' : PAPER, borderBottom: `1px solid ${RULE}` }}>
                    <td className="px-4 py-3">
                      <input type="checkbox"
                        checked={selected_members.has(m.id)}
                        onChange={() => toggleMember(m.id)}
                        className="h-4 w-4 rounded accent-teal-700"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                          style={{ background: TEAL }}>
                          {m.full_name[0]}
                        </div>
                        <span className="font-medium" style={{ color: INK }}>{m.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11.5px]" style={{ color: MUTED }}>{serial}</td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: MUTED }}>
                      {a?.distance_m != null
                        ? `${a.distance_m}m`
                        : m.address ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: INK2 }}>
                      {a?.check_in_time ? fmtTime(a.check_in_time) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {a ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold"
                          style={{
                            background: isPresentLike ? 'rgba(22,163,74,0.1)' : isAbsent ? 'rgba(220,38,38,0.1)' : 'rgba(217,119,6,0.1)',
                            color: isPresentLike ? GREEN : isAbsent ? RED : AMBER,
                          }}>
                          {isPresentLike
                            ? <><CheckCircle2 className="h-3 w-3" /> {tr('Present', 'উপস্থিত')}</>
                            : isAbsent
                              ? <><XCircle className="h-3 w-3" /> {tr('Absent', 'অনুপস্থিত')}</>
                              : <><Clock className="h-3 w-3" /> Late</>}
                        </span>
                      ) : (
                        <span className="text-[12px] italic" style={{ color: MUTED }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={busy === m.id}
                          onClick={() => mark(m.id, 'present')}
                          className="rounded-lg px-2.5 py-1 text-[11.5px] font-semibold text-white"
                          style={{ background: GREEN }}
                        >
                          {tr('P', 'উ')}
                        </button>
                        <button
                          disabled={busy === m.id}
                          onClick={() => mark(m.id, 'absent')}
                          className="rounded-lg px-2.5 py-1 text-[11.5px] font-semibold text-white"
                          style={{ background: RED }}
                        >
                          {tr('A', 'অ')}
                        </button>
                        {a && (
                          <button
                            disabled={busy === m.id}
                            onClick={() => clearMark(m.id)}
                            className="rounded-lg px-2 py-1 text-[11.5px]"
                            style={{ color: MUTED, border: `1px solid ${RULE}` }}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button className="rounded-lg p-1" style={{ color: MUTED }}>
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-[12px]"
          style={{ borderColor: RULE, color: MUTED }}>
          <label className="flex items-center gap-2">
            <input type="checkbox"
              checked={selected_members.size === filtered.length && filtered.length > 0}
              onChange={toggleAll}
              className="h-4 w-4 rounded accent-teal-700"
            />
            {tr('Select All', 'সব নির্বাচন')} · {selected_members.size} {tr('of', 'এর মধ্যে')} {filtered.length} {tr('selected', 'নির্বাচিত')}
          </label>
          {selected_members.size > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => bulkMark('present')}
                disabled={bulkBusy}
                className="rounded-full px-4 py-1.5 text-[12px] font-semibold text-white"
                style={{ background: GREEN }}
              >
                {tr('Mark Selected Present', 'উপস্থিত করুন')}
              </button>
              <button
                onClick={() => bulkMark('absent')}
                disabled={bulkBusy}
                className="rounded-full border px-4 py-1.5 text-[12px] font-semibold"
                style={{ borderColor: RED, color: RED, background: 'rgba(220,38,38,0.05)' }}
              >
                {tr('Mark Selected Absent', 'অনুপস্থিত করুন')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
