import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { startPayment, type UnifiedPaymentResult } from '@/lib/payments';
import { loadCashfreeScript } from '@/lib/cashfree';

// ════════════════════════════════════════════════════════════════
//  WelcomePopup — Anandadhara 2026 entry modal.
//
//  Two layouts, straight from the approved designs:
//
//    ≤ 860px  "mobile"   step 0 = full poster + DONATE image button
//                        step 1 = white form card (amount + donor)
//    > 860px  "desktop"  one card: poster on the left, amount +
//                        donor pane on the right
//
//  "Donate ₹X" opens Cashfree straight from the popup — no detour
//  through /donate. Desktop gets the Cashfree modal in place; phones
//  and in-app webviews get the hosted full-page checkout and come
//  back through /payment-return (see getCashfreeRedirectTarget in
//  lib/cashfree.ts). On success the donor lands on /donate with the
//  existing receipt modal already open.
//
//  The mock's fake "ধন্যবাদ" screen is deliberately NOT reproduced —
//  it thanked the donor before any money moved.
//
//  Poster  : /assets/images/anandadhara-2026-popup-poster.jpg
//  Button  : /assets/images/donate-button.png
//  Fonts   : Hind Siliguri (Bengali) · Barlow (English)
//  Dismiss : ✕, backdrop click, Escape
//
//  To retire: remove <WelcomePopup /> from PublicLayout.
//  To refresh: swap POSTER + STORAGE_KEY.
// ════════════════════════════════════════════════════════════════

const POSTER      = '/assets/images/anandadhara-2026-popup-poster.jpg';
const DONATE_BTN  = '/assets/images/donate-button.png';
const STORAGE_KEY = 'chhatradol.popup.anandadhara-2026.v4';
const OPEN_DELAY  = 900;
const HIDE_ON     = ['/donate', '/payment-return'];

const PRESETS    = [300, 500, 1000, 2000, 5000, 10000];
const DEFAULT_IX = 2;          // ₹1,000
const MIN_AMOUNT = 100;
const DESKTOP_MQ = '(min-width: 861px)';

/** Tags every rupee raised here to the campaign, so reports can split it out. */
const PURPOSE = 'Anandadhara 2026';

const inr = (n: number) => n.toLocaleString('en-IN');

/** The id the donor can match against their bank/UPI statement. */
const txnId = (res: UnifiedPaymentResult): string | undefined =>
  res.gateway === 'cashfree'
    ? res.result.payment?.paymentId || undefined
    : res.result.razorpay_payment_id || undefined;

const payMethod = (res: UnifiedPaymentResult): string =>
  res.gateway === 'cashfree' ? res.result.payment_method || 'Cashfree Payments' : 'Razorpay';

export default function WelcomePopup() {
  const navigate     = useNavigate();
  const { pathname } = useLocation();

  const [open, setOpen]       = useState(false);
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches
  );

  /* Mobile only: 0 = poster, 1 = form. Desktop shows everything at once. */
  const [step, setStep] = useState(0);

  const [sel, setSel]     = useState(DEFAULT_IX);
  const [custom, setCustom] = useState('');
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  /* ── Open once per session ── */
  useEffect(() => {
    if (HIDE_ON.includes(pathname)) return;
    try { if (sessionStorage.getItem(STORAGE_KEY)) return; } catch { /* private mode */ }
    const t = setTimeout(() => setOpen(true), OPEN_DELAY);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Track the breakpoint so the right layout renders ── */
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const onChange = () => { setDesktop(mq.matches); setStep(0); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /* ── Warm the Cashfree SDK the moment the poster shows, so the
        checkout opens instantly when the donor taps Donate ── */
  useEffect(() => {
    if (open) void loadCashfreeScript();
  }, [open]);

  // Closing mid-checkout would tear the SDK's host element out of the DOM
  // while an order is live, so every dismiss path is inert while paying.
  const dismiss = () => {
    if (paying) return;
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setOpen(false);
  };

  /* ── Derived values (same rules as the design) ── */
  const customVal = parseInt(custom.replace(/\D/g, '') || '0', 10);
  const amount    = customVal > 0 ? customVal : PRESETS[sel];
  const digits    = phone.replace(/\D/g, '');
  const nameOk    = name.trim().length > 1;
  const phoneOk   = digits.length === 10;
  const amountOk  = amount >= MIN_AMOUNT;

  const emailVal = email.trim();
  const emailOk  = !emailVal || /\S+@\S+\.\S+/.test(emailVal);
  const ready    = nameOk && phoneOk && amountOk && emailOk;

  let hint = '';
  let hintColor = '#8d857c';
  if (payError)                 { hint = payError; hintColor = '#c0392b'; }
  else if (paying)              { hint = 'পেমেন্ট উইন্ডো খোলা হচ্ছে…'; }
  else if (phone && !phoneOk)   { hint = '১০ ডিজিটের মোবাইল নম্বর দিন'; hintColor = '#c0392b'; }
  else if (emailVal && !emailOk){ hint = 'সঠিক ইমেল ঠিকানা দিন'; hintColor = '#c0392b'; }
  else if (!amountOk)           { hint = `সর্বনিম্ন ₹${inr(MIN_AMOUNT)}`; hintColor = '#c0392b'; }
  else if (nameOk && phoneOk)   { hint = 'পেমেন্ট সুরক্ষিত · 80G রসিদ পাবেন'; }

  /* ── Open Cashfree straight from the popup ──
     Desktop: the SDK draws its checkout modal over this one.
     Phones / in-app webviews: lib/cashfree.ts redirects the whole page to
     the hosted checkout, so the await below never resolves — the donor
     comes back through /payment-return instead. */
  const submit = async () => {
    if (!ready || paying) return;
    setPaying(true);
    setPayError('');
    try {
      const res = await startPayment({
        gateway: 'cashfree',
        action: 'create_donation_order',
        amount,
        purpose: PURPOSE,
        description: 'আনন্দধারা ২০২৬ — Narajole Chhatradol',
        donorName: name.trim(),
        donorEmail: emailVal,
        donorPhone: digits,
        isAnonymous: false,
        isRecurring: false,
      });

      // Paid. Hand the receipt to /donate, which already owns the success
      // modal, confetti, receipt print and the "email me a copy" action.
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
      setPaying(false);
      setOpen(false);
      navigate('/donate', {
        state: {
          cswoReceipt: {
            receiptNumber: res.result.receipt_number || `CSWO-DON-${Date.now().toString().slice(-8).toUpperCase()}`,
            amount,
            date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
            name: name.trim(),
            purpose: PURPOSE,
            paymentMethod: payMethod(res),
            transactionId: txnId(res),
          },
        },
      });
    } catch (err: unknown) {
      console.error('WelcomePopup payment failure:', err);
      const msg = err instanceof Error ? err.message : '';
      // Gateway copy ("Payment not completed or failed.") is worth showing;
      // transport noise ("Failed to fetch", "NetworkError…") is not.
      const usable = msg && msg.length < 120 && !/fetch|network|undefined|null|\[object/i.test(msg);
      setPayError(
        msg === 'CANCELLED'
          ? 'পেমেন্ট বাতিল করা হয়েছে। আবার চেষ্টা করুন।'
          : msg === 'PAYMENT_FAILED' || msg === 'CASHFREE_LOAD_FAILED' || !usable
            ? 'পেমেন্ট শুরু করা গেল না। অনুগ্রহ করে আবার চেষ্টা করুন।'
            : msg
      );
      setPaying(false);
    }
  };

  /* ── Keyboard + scroll lock ── */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, paying]);

  // Never sit on top of the donate/return pages — the poster must not cover
  // the receipt modal the donor just earned.
  if (!open || HIDE_ON.includes(pathname)) return null;

  /* ── Shared pieces ─────────────────────────────────────────── */

  const chipStyle = (on: boolean, big: boolean): React.CSSProperties => ({
    padding: big ? '17px 8px' : '15px 8px',
    borderRadius: 12,
    fontSize: big ? 16 : 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background .16s ease, border-color .16s ease, color .16s ease',
    background: on ? '#ed1d25' : '#fff',
    border: `1.5px solid ${on ? '#ed1d25' : big ? '#e9e4dc' : '#ece5dd'}`,
    color: on ? '#fff' : big ? '#14110e' : '#20180f',
  });

  const fieldStyle = (bad: boolean, big: boolean): React.CSSProperties => ({
    width: '100%',
    fontSize: big ? 16 : 15,
    padding: big ? '17px 18px' : '15px 18px',
    borderRadius: 12,
    background: big ? '#f4f1ec' : '#faf7f3',
    color: big ? '#14110e' : '#20180f',
    transition: 'border-color .18s ease',
    border: `1.5px solid ${bad ? '#e8a9a9' : big ? '#f4f1ec' : '#ece5dd'}`,
  });

  const ctaLabel = paying ? 'Processing…' : `Donate ₹${inr(amount)}`;
  const ctaLive  = ready && !paying;

  const ctaStyle = (big: boolean): React.CSSProperties => ({
    width: '100%',
    marginTop: big ? 16 : 14,
    padding: big ? 18 : 17,
    border: 'none',
    borderRadius: 14,
    fontSize: 17,
    fontWeight: 800,
    transition: 'background .18s ease, box-shadow .18s ease',
    ...(ctaLive
      ? { background: '#ed1d25', color: '#fff', cursor: 'pointer', boxShadow: '0 10px 22px rgba(237,29,37,.32)' }
      : big
        ? { background: '#f7dcdd', color: '#c98f92', cursor: 'not-allowed', boxShadow: 'none' }
        : { background: '#f6d7d8', color: '#c08e90', cursor: 'not-allowed', boxShadow: 'none' }),
  });

  const amountChips = (big: boolean) => (
    PRESETS.map((v, i) => {
      const on = customVal <= 0 && sel === i;
      return (
        <button
          key={v}
          type="button"
          className="wp-chip"
          onClick={() => { setSel(i); setCustom(''); }}
          style={chipStyle(on, big)}
        >
          ₹{inr(v)}
        </button>
      );
    })
  );

  const donorFields = (big: boolean) => (
    <>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Full name *"
        style={fieldStyle(name.length > 0 && !nameOk, big)}
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        inputMode="numeric"
        placeholder="Mobile number *"
        style={fieldStyle(phone.length > 0 && !phoneOk, big)}
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email (optional — for 80G receipt)"
        style={fieldStyle(false, big)}
      />
    </>
  );

  const closeRound = (
    <button
      type="button"
      onClick={dismiss}
      aria-label="Close"
      className="wp-close-round"
      style={{
        position: 'absolute', top: -14, right: -14, zIndex: 5,
        width: 44, height: 44,
        border: '3px solid #fff', borderRadius: '50%',
        background: '#ed1d25', color: '#fff',
        fontSize: 19, lineHeight: 1, cursor: 'pointer',
        boxShadow: '0 8px 20px rgba(0,0,0,.35)',
        transition: 'transform .18s ease, background .18s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      ✕
    </button>
  );

  const bn = "'Hind Siliguri', sans-serif";

  /* ── Layouts ───────────────────────────────────────────────── */

  const posterStep = (
    <div style={{
      position: 'relative', boxSizing: 'border-box', minHeight: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 16px',
    }}>
      <div style={{
        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 16, width: '100%', maxWidth: 420, maxHeight: 'calc(100vh - 56px)',
        animation: 'wpPopIn .35s cubic-bezier(.2,.9,.25,1) both',
      }}>
        <div style={{ position: 'relative', flex: 1, minHeight: 0, aspectRatio: '1000 / 1271', margin: '0 auto' }}>
          <img
            src={POSTER}
            alt="আনন্দধারা ২০২৬ — শারদীয়ার আগমনে মেদিনীপুর, ঝাড়গ্রাম জেলার দুঃস্থ শিশুদের নতুন পোশাক, পঠন সামগ্রী ও কিছু খাবার বিতরণের উৎসব"
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }}
          />
          <button
            type="button"
            onClick={() => setStep(1)}
            aria-label="Donate now"
            style={{
              position: 'absolute', left: '3%', top: '63.8%', width: '42.5%', height: '9.6%',
              border: 'none', borderRadius: 999, background: 'transparent', cursor: 'pointer',
            }}
          />
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="wp-close-soft"
            style={{
              position: 'absolute', top: 12, right: 12, zIndex: 5,
              width: 38, height: 38, border: 'none', borderRadius: '50%',
              background: 'rgba(20,14,10,.5)', color: '#fff', fontSize: 16, lineHeight: 1,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .18s ease',
            }}
          >
            ✕
          </button>
        </div>

        <button
          type="button"
          onClick={() => setStep(1)}
          aria-label="Donate"
          className="wp-donate-img"
          style={{ flex: 'none', border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
        >
          <img src={DONATE_BTN} alt="Donate" style={{ display: 'block', width: 250, maxWidth: '66vw' }} />
        </button>
      </div>
    </div>
  );

  const formStep = (
    <div style={{
      position: 'relative', minHeight: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px',
    }}>
      <div
        style={{ position: 'relative', width: '100%', maxWidth: 470, animation: 'wpPopIn .3s cubic-bezier(.2,.9,.25,1) both' }}
        onClick={(e) => e.stopPropagation()}
      >
        {closeRound}

        <div className="wp-pane" style={{ background: '#fff', borderRadius: 20, padding: '26px 28px', boxShadow: '0 30px 70px rgba(0,0,0,.5)' }}>
          <div style={{ animation: 'wpRiseIn .28s ease both' }}>
            <div style={{ fontFamily: bn, fontSize: 14, fontWeight: 600, color: '#ed1d25', marginBottom: 4 }}>
              আনন্দধারা – ২০২৬
            </div>
            <h2 style={{ margin: '0 0 6px', fontFamily: bn, fontSize: 28, lineHeight: 1.2, fontWeight: 700, color: '#14110e' }}>
              একটি পোশাকের দায়িত্ব নিন
            </h2>
            <p style={{ margin: '0 0 20px', fontFamily: bn, fontSize: 15, lineHeight: 1.5, color: '#6b6058' }}>
              মেদিনীপুর ও ঝাড়গ্রামের দুঃস্থ শিশুদের নতুন পোশাক, পঠন সামগ্রী ও খাবার বিতরণের উৎসব।
            </p>

            <div style={{ fontSize: 14, fontWeight: 700, color: '#14110e', marginBottom: 10 }}>Choose an amount</div>
            <div className="wp-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginBottom: 12 }}>
              {amountChips(true)}
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                inputMode="numeric"
                placeholder="Other amount (₹)"
                style={fieldStyle(false, true)}
              />
              {donorFields(true)}
            </div>

            <button type="button" onClick={submit} disabled={!ctaLive} style={ctaStyle(true)}>
              {ctaLabel}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12, minHeight: 18 }}>
              <button
                type="button"
                onClick={() => setStep(0)}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: 14, fontWeight: 700, color: '#8d857c', cursor: 'pointer' }}
              >
                ← Back
              </button>
              <span style={{ fontFamily: bn, fontSize: 12.5, textAlign: 'right', color: hintColor }}>{hint}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const desktopCard = (
    <div style={{
      position: 'relative', minHeight: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px',
    }}>
      <div
        style={{ position: 'relative', width: '100%', maxWidth: 900, animation: 'wpPopIn .35s cubic-bezier(.2,.9,.25,1) both' }}
        onClick={(e) => e.stopPropagation()}
      >
        {closeRound}

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          alignItems: 'stretch', background: '#fff', borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 30px 70px rgba(0,0,0,.5)',
        }}>
          <img
            className="wp-poster"
            src={POSTER}
            alt="আনন্দধারা ২০২৬ campaign poster"
            style={{ display: 'block' }}
          />

          <div style={{ padding: '26px 28px 24px' }}>
            <div style={{ animation: 'wpRiseIn .28s ease both' }}>
              <div style={{ fontFamily: bn, fontSize: 13.5, fontWeight: 600, color: '#ed1d25', letterSpacing: '.04em', marginBottom: 6 }}>
                আনন্দধারা – ২০২৬
              </div>
              <h2 style={{ margin: '0 0 4px', fontFamily: bn, fontSize: 25, lineHeight: 1.25, fontWeight: 700, color: '#20180f' }}>
                একটি পোশাকের দায়িত্ব নিন
              </h2>
              <p style={{ margin: '0 0 16px', fontFamily: bn, fontSize: 14.5, lineHeight: 1.45, color: '#6b6058' }}>
                মেদিনীপুর ও ঝাড়গ্রামের দুঃস্থ শিশুদের নতুন পোশাক, পঠন সামগ্রী ও খাবার বিতরণের উৎসব। 
              </p>

              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#20180f', marginBottom: 8 }}>Choose an amount</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 9, marginBottom: 9 }}>
                {amountChips(false)}
              </div>
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                inputMode="numeric"
                placeholder="Other amount (₹)"
                style={fieldStyle(false, false)}
              />

              <div style={{ display: 'grid', gap: 9, marginTop: 9 }}>
                {donorFields(false)}
              </div>

              <button type="button" onClick={submit} disabled={!ctaLive} style={ctaStyle(false)}>
                {ctaLabel}
              </button>
              <div style={{ minHeight: 18, marginTop: 9, fontFamily: bn, fontSize: 12.5, color: hintColor, textAlign: 'center' }}>
                {hint}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Campaign fonts ── */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Barlow:wght@400;500;600;700;800&display=swap"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="আনন্দধারা ২০২৬"
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 70,
          overflowX: 'hidden', overflowY: 'auto',
          background: 'rgba(10,7,7,.86)',
          fontFamily: "'Barlow', Helvetica, Arial, sans-serif",
          animation: 'wpFadeIn .3s ease both',
        }}
      >
        <div style={{ minHeight: '100%' }} onClick={(e) => e.stopPropagation()}>
          {desktop ? desktopCard : (step === 0 ? posterStep : formStep)}
        </div>
      </div>

      <style>{`
        @keyframes wpFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes wpPopIn  { from { opacity:0; transform:translateY(20px) scale(.97) } to { opacity:1; transform:none } }
        @keyframes wpRiseIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }

        [role="dialog"] .wp-poster {
          width:100%; height:100%; min-height:100%;
          object-fit:cover; object-position:center top; background:#f7f3ee;
        }
        [role="dialog"] input, [role="dialog"] button {
          box-sizing:border-box; min-width:0; max-width:100%; font-family:inherit;
        }
        [role="dialog"] input::placeholder { color:#b3aca4; }
        [role="dialog"] input:focus { outline:none; border-color:#ed1d25 !important; }

        .wp-chip:hover { border-color:#ed1d25 !important; }
        .wp-close-round:hover { background:#c0141b !important; transform:rotate(90deg); }
        .wp-close-soft:hover { background:#ed1d25 !important; }
        .wp-donate-img { transition:transform .18s ease; }
        .wp-donate-img:hover { transform:scale(1.04); }

        /* The DONATE button is the only call to action on the mobile poster
           step, so it pulses to earn a tap. The animation rides on the <img>,
           not the <button>, so the hover scale above still wins. drop-shadow
           (not box-shadow) hugs the pill's alpha instead of boxing it. */
        @keyframes wpDonateBlink {
          0%, 100% { transform:scale(1);    opacity:1;   filter:drop-shadow(0 0 0 rgba(237,29,37,0)); }
          50%      { transform:scale(1.05); opacity:.92; filter:drop-shadow(0 0 16px rgba(237,29,37,.9)); }
        }
        .wp-donate-img img { animation:wpDonateBlink 1.5s ease-in-out infinite; will-change:transform, filter; }
        @media (prefers-reduced-motion: reduce) {
          .wp-donate-img img { animation:none; }
        }

        @media (max-width:560px) {
          .wp-grid { grid-template-columns:repeat(2, minmax(0,1fr)) !important; }
          .wp-pane { padding:22px 20px 24px !important; }
        }
      `}</style>
    </>
  );
}
