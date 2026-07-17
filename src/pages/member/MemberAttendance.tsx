import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Attendance, CswoEvent } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { CheckCircle2, Clock, MapPin, ScanLine, X, Zap } from 'lucide-react';

// ── palette ───────────────────────────────────────────────────────────────────
const BRAND = '#0c756f';
const INK   = '#1c1917';
const MUTED = '#78716c';
const RULE  = '#e5dec9';
const GREEN = '#16a34a';
const RED   = '#dc2626';

// ── Attendance window checker ─────────────────────────────────────────────────
function checkWindow(ev: CswoEvent): { ok: boolean; msg: string } {
  if (!ev.attendance_enabled) return { ok: false, msg: 'Attendance is not enabled for this event.' };
  const now = Date.now();
  const s = ev.attendance_start_time ? new Date(ev.attendance_start_time).getTime() : null;
  const e = ev.attendance_end_time   ? new Date(ev.attendance_end_time).getTime()   : null;
  if (s && now < s) return { ok: false, msg: 'Attendance has not started yet.' };
  if (e && now > e) return { ok: false, msg: 'Attendance window has closed.' };
  return { ok: true, msg: '' };
}

// ── Full-screen camera scanner component ─────────────────────────────────────
function QRScannerOverlay({
  onScan, onClose,
}: {
  onScan: (text: string) => void;
  onClose: () => void;
}) {
  const divId = 'cswo-qr-div';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const [starting, setStarting] = useState(true);
  const [camErr, setCamErr] = useState('');
  const scannedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

        const qr = new Html5Qrcode(divId);
        scannerRef.current = qr;

        await qr.start(
          { facingMode: 'environment' },         // rear camera, no dropdown
          { fps: 15, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
          (decodedText: string) => {
            if (scannedRef.current) return;      // fire only once
            scannedRef.current = true;
            onScan(decodedText);
          },
          () => { /* per-frame failures are normal */ },
        );

        if (!cancelled) setStarting(false);
      } catch (err) {
        if (!cancelled) {
          setCamErr(err instanceof Error ? err.message : 'Camera error');
          setStarting(false);
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []); // eslint-disable-line

  return (
    // Dark fullscreen overlay
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#000',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', paddingTop: 'calc(16px + env(safe-area-inset-top))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(12,117,111,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ScanLine style={{ width: 20, height: 20, color: '#5de6dc' }} />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>Scan Attendance QR</p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: 0 }}>Point camera at the QR code</p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X style={{ width: 18, height: 18, color: '#fff' }} />
        </button>
      </div>

      {/* Camera area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* html5-qrcode renders the <video> here */}
        <div
          id={divId}
          style={{
            position: 'absolute', inset: 0,
            // Force the video to fill the container
          }}
        />

        {/* Scan frame overlay */}
        {!starting && !camErr && (
          <>
            {/* Dark vignette corners */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `
                radial-gradient(ellipse 70% 60% at 50% 50%, transparent 48%, rgba(0,0,0,0.55) 100%)
              `,
              pointerEvents: 'none',
            }} />

            {/* Corner brackets */}
            {[
              { top: '50%', left: '50%', transform: 'translate(-120px,-120px)', borderRadius: '6px 0 0 0', borderTop: '3px solid #5de6dc', borderLeft: '3px solid #5de6dc' },
              { top: '50%', left: '50%', transform: 'translate(80px,-120px)',   borderRadius: '0 6px 0 0', borderTop: '3px solid #5de6dc', borderRight: '3px solid #5de6dc' },
              { top: '50%', left: '50%', transform: 'translate(-120px,80px)',   borderRadius: '0 0 0 6px', borderBottom: '3px solid #5de6dc', borderLeft: '3px solid #5de6dc' },
              { top: '50%', left: '50%', transform: 'translate(80px,80px)',     borderRadius: '0 0 6px 0', borderBottom: '3px solid #5de6dc', borderRight: '3px solid #5de6dc' },
            ].map((style, i) => (
              <div key={i} style={{ position: 'absolute', width: 40, height: 40, pointerEvents: 'none', ...style }} />
            ))}

            {/* Animated scan line */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: 240, height: 2,
              marginLeft: -120,
              background: 'linear-gradient(90deg, transparent, #5de6dc, transparent)',
              boxShadow: '0 0 8px #5de6dc',
              animation: 'qrScanLine 2s ease-in-out infinite',
              pointerEvents: 'none',
            }} />
          </>
        )}

        {/* Starting spinner */}
        {starting && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.15)',
              borderTop: '3px solid #5de6dc',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>Starting camera…</p>
          </div>
        )}

        {/* Camera error */}
        {camErr && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 12, padding: 24,
          }}>
            <X style={{ width: 40, height: 40, color: '#f87171' }} />
            <p style={{ color: '#fca5a5', fontWeight: 600, fontSize: 15, margin: 0, textAlign: 'center' }}>
              Camera Error
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0, textAlign: 'center' }}>
              {camErr}
            </p>
            <button onClick={onClose}
              style={{
                marginTop: 8, padding: '10px 28px',
                background: BRAND, color: '#fff',
                border: 'none', borderRadius: 999, cursor: 'pointer',
                fontWeight: 600, fontSize: 14,
              }}>
              Close
            </button>
          </div>
        )}
      </div>

      {/* Bottom hint */}
      {!starting && !camErr && (
        <div style={{
          padding: '16px 24px',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
          textAlign: 'center',
          background: 'rgba(0,0,0,0.6)',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>
            🔒 Hold steady — auto-detects when QR is in frame
          </p>
        </div>
      )}

      {/* Keyframe styles injected inline */}
      <style>{`
        @keyframes qrScanLine {
          0%   { margin-top: -120px; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { margin-top: 120px; opacity: 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        /* Hide all html5-qrcode default UI chrome */
        #cswo-qr-div > img,
        #cswo-qr-div > div[style*="display: flex"] > div:not(:first-child),
        #cswo-qr-div > div > select,
        #cswo-qr-div > div > button,
        #cswo-qr-div__dashboard,
        #cswo-qr-div__dashboard_section,
        #cswo-qr-div__status_span,
        #cswo-qr-div__camera_permission_button { display: none !important; }
        /* Video fills full parent */
        #cswo-qr-div video {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 0 !important;
        }
        #cswo-qr-div { position: absolute !important; inset: 0 !important; }
      `}</style>
    </div>
  );
}

// ── Success overlay ───────────────────────────────────────────────────────────
function SuccessOverlay({ eventTitle, time, onClose }: { eventTitle: string; time: string; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, padding: 32,
        maxWidth: 340, width: '100%', textAlign: 'center',
        animation: 'successPop 0.35s cubic-bezier(.34,1.56,.64,1)',
      }}>
        {/* Big animated check */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(22,163,74,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          position: 'relative',
        }}>
          <CheckCircle2 style={{ width: 48, height: 48, color: GREEN }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'rgba(22,163,74,0.15)',
            animation: 'ping 1s ease-out 1',
          }} />
        </div>

        <p style={{ color: GREEN, fontWeight: 800, fontSize: 22, margin: '0 0 4px' }}>
          ✓ Attendance Marked!
        </p>
        <p style={{ color: '#78716c', fontSize: 13, margin: '0 0 20px' }}>
          Your attendance has been recorded
        </p>

        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 14, padding: '14px 18px', marginBottom: 20,
        }}>
          <p style={{ color: '#15803d', fontSize: 12, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Event
          </p>
          <p style={{ color: INK, fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>{eventTitle}</p>
          <p style={{ color: '#78716c', fontSize: 12, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Clock style={{ width: 12, height: 12 }} /> {time}
          </p>
        </div>

        <button onClick={onClose} style={{
          width: '100%', padding: '12px 0',
          background: BRAND, color: '#fff',
          border: 'none', borderRadius: 14, cursor: 'pointer',
          fontWeight: 700, fontSize: 15,
        }}>
          Done
        </button>
      </div>
      <style>{`
        @keyframes successPop { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes ping { from { transform: scale(1); opacity: 0.5; } to { transform: scale(2); opacity: 0; } }
      `}</style>
    </div>
  );
}

// ── Error card ────────────────────────────────────────────────────────────────
function ErrorCard({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  const friendly: Record<string, string> = {
    'Attendance is not enabled for this event.':    'Attendance is not enabled for this event yet.',
    'Attendance has not started yet.':              'Attendance window hasn\'t opened yet.',
    'Attendance window has closed.':                'Attendance window has already closed.',
    'Attendance already recorded for this event.':  'You\'ve already marked attendance for this event.',
  };
  const display = friendly[msg] ?? msg;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, padding: 28,
        maxWidth: 340, width: '100%', textAlign: 'center',
        animation: 'successPop 0.3s ease',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: '#fef2f2', border: '2px solid #fecaca',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <X style={{ width: 32, height: 32, color: RED }} />
        </div>
        <p style={{ color: RED, fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>
          Cannot Mark Attendance
        </p>
        <p style={{ color: '#78716c', fontSize: 14, lineHeight: 1.5, margin: '0 0 24px' }}>
          {display}
        </p>
        <button onClick={onRetry} style={{
          width: '100%', padding: '13px 0',
          background: BRAND, color: '#fff',
          border: 'none', borderRadius: 14, cursor: 'pointer',
          fontWeight: 700, fontSize: 15, display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <ScanLine style={{ width: 18, height: 18 }} /> Scan Again
        </button>
      </div>
      <style>{`@keyframes successPop { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MemberAttendance() {
  const { member } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const isAdmin = member?.role === 'admin' || (member as unknown as { can_manage_events?: boolean })?.can_manage_events;

  const [events,  setEvents]  = useState<CswoEvent[]>([]);
  const [mine,    setMine]    = useState<Record<string, Attendance>>({});
  const [loading, setLoading] = useState(true);

  // UI states
  const [showScanner, setShowScanner] = useState(false);
  const [checking,    setChecking]    = useState(false);
  const [successEv,   setSuccessEv]   = useState<CswoEvent | null>(null);
  const [successTime, setSuccessTime] = useState('');
  const [errorMsg,    setErrorMsg]    = useState('');

  const load = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    const [ev, att] = await Promise.all([
      supabase.from('cswo_events').select('*').order('event_date', { ascending: false }),
      supabase.from('cswo_attendance').select('*').eq('member_id', member.id),
    ]);
    const sorted = [...(ev.data ?? [])].sort((a, b) => {
      const today = new Date().toISOString().slice(0, 10);
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (b.status === 'live' && a.status !== 'live') return 1;
      const aUp = a.event_date >= today, bUp = b.event_date >= today;
      if (aUp && !bUp) return -1;
      if (!aUp && bUp) return 1;
      if (aUp && bUp)  return a.event_date.localeCompare(b.event_date);
      return b.event_date.localeCompare(a.event_date);
    });
    setEvents(sorted as CswoEvent[]);
    const map: Record<string, Attendance> = {};
    for (const a of (att.data ?? []) as Attendance[]) map[a.event_id] = a;
    setMine(map);
    setLoading(false);
  }, [member]);

  useEffect(() => { load(); }, [load]);

  // ── QR scan handler ────────────────────────────────────────────────────────
  const handleScan = async (rawText: string) => {
    if (!member) return;
    setShowScanner(false);
    setChecking(true);

    try {
      // 1. Parse
      let qr: { eventId: string; token: string };
      try { qr = JSON.parse(rawText.trim()); }
      catch {
        setChecking(false);
        setErrorMsg('Invalid QR code. Please scan the attendance QR displayed at the event.');
        return;
      }

      if (!qr?.eventId || !qr?.token) {
        setChecking(false);
        setErrorMsg('QR code is malformed. Ask the organiser for the correct QR.');
        return;
      }

      // 2. Fast duplicate check
      if (mine[qr.eventId]) {
        setChecking(false);
        setErrorMsg('Attendance already recorded for this event.');
        return;
      }

      // 3. Fetch event
      const { data: evData } = await supabase
        .from('cswo_events').select('*').eq('id', qr.eventId).maybeSingle();
      if (!evData) {
        setChecking(false);
        setErrorMsg('Event not found.');
        return;
      }
      const ev = evData as CswoEvent;

      // 4. Token match
      if (!ev.attendance_qr_token || ev.attendance_qr_token !== qr.token) {
        setChecking(false);
        setErrorMsg('QR code is invalid. Please scan the official attendance QR shown at the event.');
        return;
      }

      // 5. Window check
      const win = checkWindow(ev);
      if (!win.ok) {
        setChecking(false);
        setErrorMsg(win.msg);
        return;
      }

      // 6. DB duplicate check (race condition guard)
      const { data: existing } = await supabase
        .from('cswo_attendance').select('id')
        .eq('event_id', qr.eventId).eq('member_id', member.id).maybeSingle();
      if (existing) {
        setChecking(false);
        setErrorMsg('Attendance already recorded for this event.');
        return;
      }

      // 7. ✅ Insert
      const now = new Date().toISOString();
      const { error: insErr } = await supabase.from('cswo_attendance').insert({
        event_id: qr.eventId, member_id: member.id,
        status: 'present', marked_type: 'QR', attendance_method: 'qr',
        check_in_time: now,
        device_info: navigator.userAgent.slice(0, 200),
      });

      if (insErr) {
        setChecking(false);
        setErrorMsg(insErr.code === '23505'
          ? 'Attendance already recorded for this event.'
          : 'Something went wrong. Please try again.');
        return;
      }

      setChecking(false);
      setSuccessEv(ev);
      setSuccessTime(new Date(now).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }));
      await load();

    } catch {
      setChecking(false);
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  const openScanner = () => {
    setErrorMsg('');
    setSuccessEv(null);
    setShowScanner(true);
  };

  if (loading) return <ListSkeleton rows={6} />;

  const openEvents = events.filter(ev => !mine[ev.id] && checkWindow(ev).ok);

  return (
    <div>
      {/* Checking spinner (full screen while validating) */}
      {checking && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            border: '4px solid rgba(255,255,255,0.15)',
            borderTop: '4px solid #5de6dc',
            animation: 'spin 0.7s linear infinite',
          }} />
          <p style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>Verifying QR…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Camera scanner */}
      {showScanner && <QRScannerOverlay onScan={handleScan} onClose={() => setShowScanner(false)} />}

      {/* Success overlay */}
      {successEv && (
        <SuccessOverlay
          eventTitle={successEv.title}
          time={successTime}
          onClose={() => setSuccessEv(null)}
        />
      )}

      {/* Error overlay */}
      {errorMsg && (
        <ErrorCard msg={errorMsg} onRetry={() => { setErrorMsg(''); openScanner(); }} />
      )}

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: INK }}>{t('m.attendance')}</h1>
          <p className="mt-0.5 text-[13px]" style={{ color: MUTED }}>
            {tr('Scan the event QR code to mark your attendance instantly.',
              'তাৎক্ষণিক উপস্থিতি দিতে অনুষ্ঠানের QR কোড স্ক্যান করুন।')}
          </p>
        </div>
        <button
          onClick={openScanner}
          style={{ background: BRAND }}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm"
        >
          <ScanLine className="h-4 w-4" />
          {tr('Scan Attendance QR', 'উপস্থিতি QR স্ক্যান করুন')}
        </button>
      </div>

      {/* ── Open attendance banner ───────────────────────────────────── */}
      {openEvents.length > 0 && (
        <div className="mb-5 rounded-2xl p-4"
          style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(22,163,74,0.18)' }}>
              <Zap className="h-4 w-4" style={{ color: GREEN }} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-[14px]" style={{ color: GREEN }}>
                {openEvents.length === 1
                  ? `"${openEvents[0].title}" — Attendance is OPEN!`
                  : `${openEvents.length} events are accepting attendance now!`}
              </p>
              <p className="mt-0.5 text-[12.5px]" style={{ color: '#166534' }}>
                {tr('Tap Scan → Point camera at QR → Done!',
                  'স্ক্যান চাপুন → QR-এ ক্যামেরা তাক করুন → সম্পন্ন!')}
              </p>
            </div>
            <button onClick={openScanner}
              className="shrink-0 rounded-full px-4 py-1.5 text-[12.5px] font-semibold text-white"
              style={{ background: GREEN }}>
              Scan Now
            </button>
          </div>
        </div>
      )}

      {/* ── Events list ─────────────────────────────────────────────── */}
      {events.length === 0 ? (
        <p className="text-gray-600">{tr('No events added yet.', 'এখনো কোনো অনুষ্ঠান নেই।')}</p>
      ) : (
        <div className="space-y-3">
          {events.map(ev => {
            const a = mine[ev.id];
            const windowOk = checkWindow(ev).ok;
            const isOpen   = ev.attendance_enabled && windowOk;

            return (
              <div key={ev.id}
                className="rounded-2xl bg-white p-4 shadow-sm"
                style={{
                  border: `1px solid ${isOpen ? 'rgba(22,163,74,0.25)' : RULE}`,
                  boxShadow: isOpen ? '0 0 0 2px rgba(22,163,74,0.07)' : undefined,
                }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {isOpen && (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                          style={{ background: 'rgba(22,163,74,0.1)', color: GREEN }}>
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                          Attendance Open
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
                          Checked in {new Date(a.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {a ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12.5px] font-bold"
                        style={{ background: 'rgba(22,163,74,0.1)', color: GREEN }}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {a.status === 'volunteered' ? 'Volunteered' : 'Attended'}
                      </span>
                    ) : isOpen ? (
                      <button onClick={openScanner}
                        className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-white"
                        style={{ background: BRAND }}>
                        <ScanLine className="h-3.5 w-3.5" />
                        {tr('Scan to Check In', 'চেক ইন করুন')}
                      </button>
                    ) : (
                      <span className="text-[12px] italic" style={{ color: MUTED }}>
                        {!ev.attendance_enabled ? 'Not enabled' : 'Closed'}
                      </span>
                    )}

                    {isAdmin && !a && (
                      <button onClick={async () => {
                        if (!member) return;
                        await supabase.from('cswo_attendance').insert({
                          event_id: ev.id, member_id: member.id,
                          status: 'present', marked_type: 'ADMIN',
                          attendance_method: 'admin',
                          check_in_time: new Date().toISOString(),
                          note: 'Manual mark by admin',
                        });
                        await load();
                      }}
                        className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-white"
                        style={{ background: '#d97706' }}>
                        Admin Mark
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
