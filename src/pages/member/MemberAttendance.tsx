import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Attendance, CswoEvent } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { ListSkeleton } from '@/components/ui/Skeleton';
import {
  QrCode, MapPin, Clock, CheckCircle2, AlertTriangle, ScanLine,
  X, Navigation, Wifi, WifiOff, Camera,
} from 'lucide-react';

// ── palette ─────────────────────────────────────────────────────────────────
const BRAND = '#0c756f';
const INK   = '#1c1917';
const INK2  = '#44403c';
const MUTED = '#78716c';
const RULE  = '#e5dec9';
const PAPER = '#faf6ef';
const RED   = '#dc2626';
const GREEN = '#16a34a';
const AMBER = '#d97706';

// ── haversine distance (metres) ──────────────────────────────────────────────
function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ a }: { a?: Attendance }) {
  if (!a) return null;
  const isPresent = a.status === 'present' || a.status === 'volunteered';
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold"
      style={{
        background: isPresent ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
        color: isPresent ? GREEN : RED,
      }}>
      {isPresent
        ? <><CheckCircle2 className="h-3.5 w-3.5" /> {a.status === 'volunteered' ? 'Volunteered' : 'Attended'}</>
        : <><X className="h-3.5 w-3.5" /> Absent</>}
    </span>
  );
}

export default function MemberAttendance() {
  const { member } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const typeLabel = (type: string) =>
    type === 'camp' ? tr('Camp', 'ক্যাম্প') : type === 'program' ? tr('Programme', 'কর্মসূচি') : tr('Event', 'অনুষ্ঠান');

  // Fix 4: secretary/admin can bypass GPS — regular members cannot
  const isSecretary = (member?.role as string) === 'secretary' || member?.role === 'admin'
    || member?.designation?.toLowerCase().includes('secretary');

  // ── state ────────────────────────────────────────────────────────────────
  const [events, setEvents] = useState<CswoEvent[]>([]);
  const [mine, setMine] = useState<Record<string, Attendance>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // QR Modal
  const [qrOpen, setQrOpen] = useState(false);
  const [qrStatus, setQrStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [qrMsg, setQrMsg] = useState('');
  const [verifyStep, setVerifyStep] = useState<'location' | 'scan' | 'done'>('location');

  // Camera scanning state
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const scannerDivId = 'cswo-qr-reader';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  // GPS
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'getting' | 'got' | 'error'>('idle');
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState('');

  // Distance result
  const [distanceResult, setDistanceResult] = useState<{
    distance: number; radius: number; ok: boolean;
  } | null>(null);

  // ── load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    const [ev, att] = await Promise.all([
      supabase.from('cswo_events').select('*').order('event_date', { ascending: false }),
      supabase.from('cswo_attendance').select('*').eq('member_id', member.id),
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
    setEvents(sorted as CswoEvent[]);
    const map: Record<string, Attendance> = {};
    for (const a of (att.data ?? []) as Attendance[]) map[a.event_id] = a;
    setMine(map);
    setLoading(false);
  }, [member]);

  useEffect(() => { load(); }, [load]);

  // ── GPS ───────────────────────────────────────────────────────────────────
  const getGPS = (): Promise<{ lat: number; lng: number }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('GPS not supported')); return; }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });

  const handleGetLocation = async () => {
    setGpsStatus('getting');
    setGpsError('');
    try {
      const pos = await getGPS();
      setUserPos(pos);
      setGpsStatus('got');
      setVerifyStep('scan');
    } catch (e) {
      setGpsStatus('error');
      setGpsError(e instanceof Error ? e.message : 'GPS error');
    }
  };

  // ── camera QR scanner (html5-qrcode) ─────────────────────────────────────
  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* ignore */ }
      try { scannerRef.current.clear(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  const startScanner = async () => {
    setScannerError('');
    setScannerActive(true);
    try {
      const { Html5QrcodeScanner } = await import('html5-qrcode');
      const scanner = new Html5QrcodeScanner(
        scannerDivId,
        { fps: 10, qrbox: { width: 220, height: 220 }, rememberLastUsedCamera: true },
        false,
      );
      scannerRef.current = scanner;
      scanner.render(
        async (decodedText: string) => {
          // Stop scanner first, then process
          await stopScanner();
          await handleQrSubmit(decodedText);
        },
        () => { /* ignore QR scan errors (unfocused frames) */ },
      );
    } catch (err) {
      setScannerError(err instanceof Error ? err.message : 'Camera error');
      setScannerActive(false);
    }
  };

  // Clean up scanner when modal closes
  useEffect(() => {
    return () => { stopScanner(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── QR submit (called by camera scan or manual text) ─────────────────────
  const handleQrSubmit = async (rawText: string) => {
    if (!member) return;
    setQrStatus('checking');
    setQrMsg('');
    setDistanceResult(null);

    try {
      // Fix 5: Parse short payload {e, t}
      let qrData: { e: string; t: string };
      try {
        qrData = JSON.parse(rawText.trim());
      } catch {
        setQrStatus('error');
        setQrMsg(tr('Invalid QR code. Please scan the live QR displayed at the event.', 'অবৈধ QR কোড। অনুষ্ঠানে প্রদর্শিত লাইভ QR স্ক্যান করুন।'));
        return;
      }

      if (!qrData.e || !qrData.t) {
        setQrStatus('error');
        setQrMsg(tr('QR code is malformed. Ask the organiser for a fresh code.', 'QR কোড ত্রুটিপূর্ণ। আয়োজকের কাছ থেকে নতুন কোড নিন।'));
        return;
      }

      if (mine[qrData.e]) {
        setQrStatus('error');
        setQrMsg(tr('You have already checked in for this event.', 'আপনি ইতিমধ্যে এই অনুষ্ঠানে চেক-ইন করেছেন।'));
        return;
      }

      // Fix 4: Regular members MUST have GPS — no bypass allowed
      if (!userPos && !isSecretary) {
        setQrStatus('error');
        setQrMsg(tr('Please get your GPS location first before scanning.', 'স্ক্যান করার আগে আপনার GPS অবস্থান নিন।'));
        setVerifyStep('location');
        return;
      }

      // Fetch event from DB
      const { data: eventData } = await supabase
        .from('cswo_events')
        .select('*')
        .eq('id', qrData.e)
        .maybeSingle();

      if (!eventData) {
        setQrStatus('error');
        setQrMsg(tr('Event not found.', 'অনুষ্ঠান পাওয়া যায়নি।'));
        return;
      }

      if (eventData.status !== 'live') {
        setQrStatus('error');
        setQrMsg(tr('Attendance is not active for this event.', 'এই অনুষ্ঠানে উপস্থিতি এখনো সক্রিয় নয়।'));
        return;
      }

      // Validate QR session from DB — get the latest active session for this event
      const { data: sessionData } = await supabase
        .from('cswo_event_qr_sessions')
        .select('*')
        .eq('event_id', qrData.e)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sessionData) {
        setQrStatus('error');
        setQrMsg(tr('QR session has expired. Ask the organiser to refresh the code.', 'QR সেশন মেয়াদ শেষ। আয়োজককে কোড রিফ্রেশ করতে বলুন।'));
        return;
      }

      // Fix 3: Verify token matches DB — prevents forged QR codes
      if (sessionData.session_token !== qrData.t) {
        setQrStatus('error');
        setQrMsg(tr('QR code is invalid or has been replaced. Please scan the latest QR.', 'QR কোড অবৈধ বা পরিবর্তিত হয়েছে। সর্বশেষ QR স্ক্যান করুন।'));
        return;
      }

      // GPS location check against event venue
      const ev = eventData as CswoEvent;
      const radius = ev.attendance_radius ?? 200;
      let distanceM = 0;

      if (ev.latitude && ev.longitude && userPos) {
        distanceM = Math.round(calcDistance(userPos.lat, userPos.lng, ev.latitude, ev.longitude));
        const locationOk = distanceM <= radius;
        setDistanceResult({ distance: distanceM, radius, ok: locationOk });

        if (!locationOk && !isSecretary) {
          setQrStatus('error');
          setQrMsg(tr(
            `You are ${distanceM}m from the venue. You must be within ${radius}m to check in.`,
            `আপনি ভেন্যু থেকে ${distanceM}মি দূরে। চেক-ইন করতে ${radius}মি এর মধ্যে থাকতে হবে।`,
          ));
          return;
        }
      }

      // ✅ All checks passed — mark attendance
      await supabase.from('cswo_attendance').upsert(
        {
          event_id: qrData.e,
          member_id: member.id,
          status: 'present',
          marked_type: 'QR',
          check_in_time: new Date().toISOString(),
          latitude: userPos?.lat ?? null,
          longitude: userPos?.lng ?? null,
          distance_m: distanceM || null,
        },
        { onConflict: 'event_id,member_id' },
      );

      setQrStatus('success');
      setVerifyStep('done');
      setQrMsg(tr('✓ Check-in successful!', '✓ চেক-ইন সফল!'));
      await load();
      setTimeout(() => { closeQrModal(); }, 3000);
    } catch {
      setQrStatus('error');
      setQrMsg(tr('Something went wrong. Please try again.', 'সমস্যা হয়েছে। আবার চেষ্টা করুন।'));
    }
  };

  // Secretary-only manual mark
  const mark = async (eventId: string, status: 'present' | 'volunteered') => {
    if (!member || !isSecretary) return;
    setBusy(eventId);
    await supabase.from('cswo_attendance').upsert(
      { event_id: eventId, member_id: member.id, status, marked_type: 'ADMIN', check_in_time: new Date().toISOString() },
      { onConflict: 'event_id,member_id' },
    );
    setBusy(null);
    await load();
  };

  const unmark = async (eventId: string) => {
    if (!member || !isSecretary) return;
    setBusy(eventId);
    await supabase.from('cswo_attendance').delete().eq('event_id', eventId).eq('member_id', member.id);
    setBusy(null);
    await load();
  };

  const openQrModal = () => {
    setQrOpen(true);
    setQrStatus('idle');
    setQrMsg('');
    setVerifyStep('location');
    setGpsStatus('idle');
    setUserPos(null);
    setDistanceResult(null);
    setScannerActive(false);
    setScannerError('');
  };

  const closeQrModal = async () => {
    await stopScanner();
    setQrOpen(false);
    setQrStatus('idle');
    setQrMsg('');
    setVerifyStep('location');
    setGpsStatus('idle');
    setDistanceResult(null);
  };

  if (loading) return <ListSkeleton rows={6} />;

  const liveEvents = events.filter(e => e.status === 'live' && !mine[e.id]);

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: INK }}>{t('m.attendance')}</h1>
          <p className="mt-0.5 text-[13px]" style={{ color: MUTED }}>
            {tr('Scan the QR at a live event to check in. GPS verification required.',
              'চেক-ইন করতে লাইভ অনুষ্ঠানে QR স্ক্যান করুন। GPS যাচাই আবশ্যক।')}
          </p>
        </div>
        <button
          onClick={openQrModal}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm"
          style={{ background: BRAND }}
        >
          <ScanLine className="h-4 w-4" />
          {tr('Scan QR to Check In', 'QR স্ক্যান করুন')}
        </button>
      </div>

      {/* ── Live event banner ────────────────────────────────────────────── */}
      {liveEvents.length > 0 && (
        <div className="mb-5 rounded-2xl p-4"
          style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}>
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(22,163,74,0.15)' }}>
              <Wifi className="h-4 w-4" style={{ color: GREEN }} />
            </span>
            <div className="flex-1">
              <p className="font-bold text-[14px]" style={{ color: GREEN }}>
                {liveEvents.length === 1
                  ? tr(`"${liveEvents[0].title}" is LIVE — Attendance open!`, `"${liveEvents[0].title}" লাইভ — উপস্থিতি খোলা!`)
                  : tr(`${liveEvents.length} events are live now!`, `${liveEvents.length}টি অনুষ্ঠান এখন লাইভ!`)}
              </p>
              <p className="mt-0.5 text-[12.5px]" style={{ color: '#166534' }}>
                {tr('Open camera → Scan QR at venue → Check in instantly.',
                  'ক্যামেরা খুলুন → ভেন্যুতে QR স্ক্যান করুন → তাৎক্ষণিক চেক-ইন।')}
              </p>
            </div>
            <button
              onClick={openQrModal}
              className="shrink-0 rounded-full px-4 py-1.5 text-[12.5px] font-semibold text-white"
              style={{ background: GREEN }}
            >
              {tr('Check In Now', 'এখন চেক ইন')}
            </button>
          </div>
        </div>
      )}

      {/* ── QR Modal ─────────────────────────────────────────────────────── */}
      {qrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: RULE }}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: `${BRAND}18` }}>
                  <QrCode className="h-5 w-5" style={{ color: BRAND }} />
                </div>
                <div>
                  <h2 className="font-bold text-[16px]" style={{ color: INK }}>
                    {tr('QR Check-in', 'QR চেক-ইন')}
                  </h2>
                  <p className="text-[11.5px]" style={{ color: MUTED }}>
                    {tr('GPS verify → Camera → Done', 'GPS → ক্যামেরা → সম্পন্ন')}
                  </p>
                </div>
              </div>
              <button onClick={closeQrModal} className="rounded-full p-1.5 hover:bg-gray-100">
                <X className="h-5 w-5" style={{ color: MUTED }} />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4">

              {/* Step indicators */}
              <div className="flex items-center gap-1.5">
                {[
                  { key: 'location', label: tr('Location', 'অবস্থান') },
                  { key: 'scan', label: tr('Scan QR', 'QR স্ক্যান') },
                  { key: 'done', label: tr('Done', 'সম্পন্ন') },
                ].map((step, i) => {
                  const active = verifyStep === step.key;
                  const done = (step.key === 'location' && (verifyStep === 'scan' || verifyStep === 'done'))
                    || (step.key === 'scan' && verifyStep === 'done');
                  return (
                    <div key={step.key} className="flex items-center gap-1.5">
                      {i > 0 && (
                        <div className="h-px w-8" style={{ background: done ? GREEN : RULE }} />
                      )}
                      <div className="flex items-center gap-1.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold"
                          style={{
                            background: done ? GREEN : active ? BRAND : RULE,
                            color: (done || active) ? '#fff' : MUTED,
                          }}>
                          {done ? '✓' : i + 1}
                        </div>
                        <span className="text-[11.5px] font-medium hidden sm:inline"
                          style={{ color: active ? BRAND : done ? GREEN : MUTED }}>
                          {step.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Step 1: Location ─────────────────────────────────── */}
              <div className="rounded-xl p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <Navigation className="h-4 w-4" style={{ color: gpsStatus === 'got' ? GREEN : BRAND }} />
                  <span className="font-semibold text-[13px]" style={{ color: INK }}>
                    {tr('Step 1: Verify Your Location', 'ধাপ ১: আপনার অবস্থান যাচাই করুন')}
                  </span>
                  {gpsStatus === 'got' && <CheckCircle2 className="h-4 w-4" style={{ color: GREEN }} />}
                </div>

                {gpsStatus === 'idle' && (
                  <button
                    onClick={handleGetLocation}
                    className="w-full rounded-xl py-3 text-[13px] font-semibold text-white"
                    style={{ background: BRAND }}
                  >
                    {tr('Get My Location', 'আমার অবস্থান নিন')}
                  </button>
                )}
                {gpsStatus === 'getting' && (
                  <div className="flex items-center gap-2 justify-center py-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200"
                      style={{ borderTopColor: BRAND }} />
                    <p className="text-[13px]" style={{ color: MUTED }}>{tr('Getting location…', 'অবস্থান পাওয়া যাচ্ছে…')}</p>
                  </div>
                )}
                {gpsStatus === 'got' && userPos && (
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: 'rgba(22,163,74,0.08)' }}>
                    <MapPin className="h-4 w-4 shrink-0" style={{ color: GREEN }} />
                    <p className="text-[12.5px] font-semibold" style={{ color: GREEN }}>
                      {tr('Location verified', 'অবস্থান যাচাই হয়েছে')} · {userPos.lat.toFixed(5)}, {userPos.lng.toFixed(5)}
                    </p>
                  </div>
                )}
                {gpsStatus === 'error' && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 rounded-lg px-3 py-2"
                      style={{ background: 'rgba(220,38,38,0.06)' }}>
                      <WifiOff className="h-4 w-4 shrink-0" style={{ color: RED }} />
                      <p className="text-[12px]" style={{ color: RED }}>
                        {gpsError || tr('Could not get location.', 'অবস্থান পাওয়া যায়নি।')}
                      </p>
                    </div>
                    {/* Fix 4: Secretary/admin can skip GPS, regular members cannot */}
                    {isSecretary ? (
                      <div className="flex gap-2">
                        <button onClick={handleGetLocation}
                          className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white"
                          style={{ background: BRAND }}>
                          {tr('Retry', 'আবার চেষ্টা')}
                        </button>
                        <button onClick={() => setVerifyStep('scan')}
                          className="rounded-lg border px-3 py-1.5 text-[12px] font-semibold"
                          style={{ borderColor: RULE, color: INK2 }}>
                          {tr('Skip (Admin only)', 'এড়িয়ে যান (শুধু অ্যাডমিন)')}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[11.5px] mb-2" style={{ color: MUTED }}>
                          {tr('GPS location is required to check in. Please enable location access in your browser settings.',
                            'চেক-ইন করতে GPS অবস্থান আবশ্যক। আপনার ব্রাউজার সেটিংসে লোকেশন অ্যাক্সেস চালু করুন।')}
                        </p>
                        <button onClick={handleGetLocation}
                          className="w-full rounded-xl py-2.5 text-[13px] font-semibold text-white"
                          style={{ background: BRAND }}>
                          {tr('Try Again', 'আবার চেষ্টা করুন')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Distance result */}
              {distanceResult && (
                <div className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{
                    background: distanceResult.ok ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
                    border: `1px solid ${distanceResult.ok ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
                  }}>
                  <MapPin className="h-5 w-5 shrink-0" style={{ color: distanceResult.ok ? GREEN : RED }} />
                  <p className="font-semibold text-[13px]"
                    style={{ color: distanceResult.ok ? GREEN : RED }}>
                    {distanceResult.ok
                      ? tr(`✓ ${distanceResult.distance}m from venue — within ${distanceResult.radius}m limit`,
                        `✓ ভেন্যু থেকে ${distanceResult.distance}মি — ${distanceResult.radius}মি সীমার মধ্যে`)
                      : tr(`✗ ${distanceResult.distance}m away — must be within ${distanceResult.radius}m`,
                        `✗ ${distanceResult.distance}মি দূরে — ${distanceResult.radius}মি এর মধ্যে থাকতে হবে`)}
                  </p>
                </div>
              )}

              {/* ── Step 2: Camera Scanner ───────────────────────────── */}
              {(verifyStep === 'scan' || verifyStep === 'done') && (
                <div className="rounded-xl p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="h-4 w-4" style={{ color: BRAND }} />
                    <span className="font-semibold text-[13px]" style={{ color: INK }}>
                      {tr('Step 2: Scan QR Code', 'ধাপ ২: QR কোড স্ক্যান করুন')}
                    </span>
                  </div>
                  <p className="text-[12px] mb-3" style={{ color: MUTED }}>
                    {tr('Point your camera at the QR displayed at the event venue.',
                      'অনুষ্ঠানস্থলে প্রদর্শিত QR-এ ক্যামেরা তাক করুন।')}
                  </p>

                  {!scannerActive ? (
                    <button
                      onClick={startScanner}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-semibold text-white"
                      style={{ background: BRAND }}
                    >
                      <Camera className="h-4 w-4" />
                      {tr('Open Camera', 'ক্যামেরা খুলুন')}
                    </button>
                  ) : (
                    <button
                      onClick={stopScanner}
                      className="mb-3 w-full inline-flex items-center justify-center gap-2 rounded-xl py-2 text-[12px] font-semibold border"
                      style={{ borderColor: RULE, color: INK2 }}
                    >
                      {tr('Close Camera', 'ক্যামেরা বন্ধ')}
                    </button>
                  )}

                  {/* html5-qrcode renders into this div */}
                  <div id={scannerDivId} className={scannerActive ? 'mt-2 rounded-xl overflow-hidden' : 'hidden'} />

                  {scannerError && (
                    <p className="mt-2 text-[12px] rounded-lg px-3 py-2"
                      style={{ background: 'rgba(220,38,38,0.08)', color: RED }}>
                      {scannerError}
                    </p>
                  )}
                </div>
              )}

              {/* Status message */}
              {qrMsg && (
                <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-[13px]"
                  style={{
                    background: qrStatus === 'success' ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
                    color: qrStatus === 'success' ? GREEN : RED,
                    border: `1px solid ${qrStatus === 'success' ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
                  }}>
                  {qrStatus === 'success'
                    ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    : qrStatus === 'checking'
                      ? <div className="h-4 w-4 mt-0.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
                  <span>{qrMsg}</span>
                </div>
              )}

              {qrStatus === 'checking' && !qrMsg && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200"
                    style={{ borderTopColor: BRAND }} />
                  <p className="text-[13px]" style={{ color: MUTED }}>{tr('Verifying…', 'যাচাই হচ্ছে…')}</p>
                </div>
              )}

              {/* Success state */}
              {verifyStep === 'done' && qrStatus === 'success' && (
                <div className="flex flex-col items-center py-3 gap-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full"
                    style={{ background: 'rgba(22,163,74,0.1)' }}>
                    <CheckCircle2 className="h-10 w-10" style={{ color: GREEN }} />
                  </div>
                  <p className="font-bold text-[15px]" style={{ color: GREEN }}>
                    {tr('Check-in Successful!', 'চেক-ইন সফল!')}
                  </p>
                  <p className="text-[12px]" style={{ color: MUTED }}>
                    {tr('Closing automatically…', 'স্বয়ংক্রিয়ভাবে বন্ধ হচ্ছে…')}
                  </p>
                </div>
              )}

              <p className="text-center text-[11px]" style={{ color: MUTED }}>
                🔒 {tr('QR codes rotate every 30–60 seconds. GPS + valid token required.',
                  'QR কোড ৩০-৬০ সেকেন্ডে পরিবর্তিত হয়। GPS + বৈধ টোকেন প্রয়োজন।')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Events list ──────────────────────────────────────────────────── */}
      {events.length === 0 ? (
        <p className="text-gray-600">{tr('No events have been added yet.', 'এখনো কোনো অনুষ্ঠান যোগ করা হয়নি।')}</p>
      ) : (
        <div className="space-y-3">
          {events.map(ev => {
            const a = mine[ev.id];
            const isLive = ev.status === 'live';

            return (
              <div key={ev.id}
                className="rounded-2xl bg-white p-4 shadow-sm"
                style={{
                  border: `1px solid ${isLive ? 'rgba(22,163,74,0.25)' : RULE}`,
                  boxShadow: isLive ? '0 0 0 2px rgba(22,163,74,0.08)' : undefined,
                }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="badge bg-blue-100 text-blue-800">{typeLabel(ev.type)}</span>
                      {isLive && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                          style={{ background: 'rgba(22,163,74,0.1)', color: GREEN }}>
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping inline-block" />
                          LIVE
                        </span>
                      )}
                      {a?.marked_type && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-mono" style={{ color: MUTED }}>
                          {a.marked_type}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-[15px]" style={{ color: INK }}>{ev.title}</h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[12.5px]" style={{ color: MUTED }}>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {fmt.date(ev.event_date)}
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {ev.location}
                        </span>
                      )}
                      {a?.check_in_time && (
                        <span className="flex items-center gap-1 font-medium" style={{ color: GREEN }}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {tr('Checked in', 'চেক ইন')} {new Date(a.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {a ? (
                      <>
                        <StatusBadge a={a} />
                        {isSecretary && (
                          <button
                            disabled={busy === ev.id}
                            onClick={() => unmark(ev.id)}
                            className="rounded-full border px-3 py-1 text-[12px] font-semibold"
                            style={{ borderColor: RED, color: RED }}
                          >
                            {t('common.remove')}
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        {isLive ? (
                          <button
                            onClick={openQrModal}
                            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-white"
                            style={{ background: BRAND }}
                          >
                            <ScanLine className="h-3.5 w-3.5" />
                            {tr('Scan to Check In', 'স্ক্যান করুন')}
                          </button>
                        ) : (
                          <span className="text-[12.5px] italic" style={{ color: MUTED }}>
                            {tr('Attendance not started', 'উপস্থিতি শুরু হয়নি')}
                          </span>
                        )}
                        {isSecretary && (
                          <>
                            <button disabled={busy === ev.id} onClick={() => mark(ev.id, 'present')}
                              className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-white"
                              style={{ background: GREEN }}>
                              {tr('Mark Present', 'উপস্থিত')}
                            </button>
                            <button disabled={busy === ev.id} onClick={() => mark(ev.id, 'volunteered')}
                              className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-white"
                              style={{ background: AMBER }}>
                              {tr('Volunteer', 'স্বেচ্ছাসেবক')}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Secretary info note */}
      {isSecretary && (
        <div className="mt-4 rounded-xl px-4 py-3 text-[12.5px]"
          style={{ background: 'rgba(12,117,111,0.06)', color: BRAND, border: '1px solid rgba(12,117,111,0.15)' }}>
          &#9432; {tr(
            'As Secretary/Admin you can manually mark/remove attendance, and GPS bypass is available to you.',
            'সেক্রেটারি/অ্যাডমিন হিসেবে আপনি ম্যানুয়ালি উপস্থিতি দিতে ও মুছতে পারেন। GPS বাইপাসও আপনার জন্য উপলব্ধ।',
          )}
        </div>
      )}
    </div>
  );
}
