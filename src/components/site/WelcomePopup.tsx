import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ════════════════════════════════════════════════════════════════
//  WelcomePopup — Full-poster campaign modal with blinking DONATE
//  button. No form — clicking Donate goes straight to /donate.
//
//  Poster  : /assets/images/anandadhara-2026-poster.jpg
//  Fonts   : Hind Siliguri (Bengali) · Barlow (English)
//  Dismiss : × button (top-right), backdrop click, Escape key,
//            "পরে দেখব" link
//
//  To retire: remove <WelcomePopup /> from PublicLayout.
//  To refresh: swap POSTER + STORAGE_KEY.
// ════════════════════════════════════════════════════════════════

const POSTER      = '/assets/images/anandadhara-2026-poster.jpg';
const STORAGE_KEY = 'chhatradol.popup.anandadhara-2026.v3';
const OPEN_DELAY  = 900;
const HIDE_ON     = ['/donate', '/payment-return'];

export default function WelcomePopup() {
  const navigate      = useNavigate();
  const { pathname }  = useLocation();
  const [open, setOpen] = useState(false);

  /* ── Open once per session ── */
  useEffect(() => {
    if (HIDE_ON.includes(pathname)) return;
    try { if (sessionStorage.getItem(STORAGE_KEY)) return; } catch { /* private mode */ }
    const t = setTimeout(() => setOpen(true), OPEN_DELAY);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setOpen(false);
  };

  const donate = () => { dismiss(); navigate('/donate'); };

  /* ── Keyboard + scroll lock ── */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* ── Google Fonts ── */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Barlow:wght@700;800&display=swap"
      />

      {/* ── Backdrop ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-popup-title"
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 70,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
          background: 'rgba(10,7,7,.88)',
          animation: 'wpFadeIn .3s ease both',
        }}
      >
        {/* ── Modal wrapper ── */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 480,
            animation: 'wpPopIn .38s cubic-bezier(.2,.9,.25,1) both',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Close button — outside card top-right ── */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            id="welcome-popup-close"
            style={{
              position: 'absolute', top: -14, right: -14, zIndex: 10,
              width: 44, height: 44,
              border: '3px solid #fff', borderRadius: '50%',
              background: '#0f4436', color: '#fff',
              fontSize: 18, lineHeight: 1, cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(0,0,0,.4)',
              transition: 'transform .2s ease, background .2s ease',
              fontFamily: 'sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background   = '#1a6b53';
              e.currentTarget.style.transform    = 'rotate(90deg) scale(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background   = '#0f4436';
              e.currentTarget.style.transform    = 'none';
            }}
          >
            ✕
          </button>

          {/* ── Card ── */}
          <div style={{
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0,0,0,.6)',
            position: 'relative',
            background: '#000',
          }}>

            {/* ── Poster image (full-width) ── */}
            <img
              id="welcome-popup-poster"
              src={POSTER}
              alt="আনন্দধারা ২০২৬ — ছাত্রদলের দুঃস্থ শিশুদের নতুন পোশাক, পঠন সামগ্রী ও খাবার বিতরণ"
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
                maxHeight: '72vh',
                objectFit: 'cover',
                objectPosition: 'center top',
              }}
            />

            {/* ── Bottom action band ── */}
            <div style={{
              background: 'linear-gradient(0deg, rgba(10,7,7,.97) 0%, rgba(10,7,7,.82) 70%, transparent 100%)',
              padding: '32px 24px 22px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
              marginTop: -72,
              position: 'relative',
            }}>

              {/* ── Blinking DONATE NOW button ── */}
              <button
                id="popup-donate-btn"
                type="button"
                onClick={donate}
                style={{
                  width: '100%',
                  maxWidth: 340,
                  padding: '18px 32px',
                  border: 'none',
                  borderRadius: 999,
                  background: '#FFC800',
                  color: '#14231d',
                  fontFamily: "'Barlow', 'Hind Siliguri', sans-serif",
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: '.04em',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  animation: 'wpDonateBlink 1.6s ease-in-out infinite',
                  boxShadow: '0 0 0 0 rgba(255,200,0,.7)',
                  transition: 'transform .15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <span style={{ fontSize: 22 }}>❤️</span>
                Donate Now
                <span style={{ fontSize: 18 }}>→</span>
              </button>


            </div>
          </div>
        </div>
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes wpFadeIn    { from { opacity:0 } to { opacity:1 } }
        @keyframes wpPopIn     { from { opacity:0; transform:translateY(24px) scale(.95) } to { opacity:1; transform:none } }
        @keyframes wpDonateBlink {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,200,0,.75); opacity:1; }
          50%      { box-shadow: 0 0 0 16px rgba(255,200,0,0); opacity:.9; }
        }
        /* Mobile: reduce max-height so the button is always visible */
        @media (max-width: 480px) {
          #welcome-popup-poster { max-height: 58vh !important; }
        }
        @media (max-width: 360px) {
          #welcome-popup-poster { max-height: 50vh !important; }
        }
      `}</style>
    </>
  );
}
