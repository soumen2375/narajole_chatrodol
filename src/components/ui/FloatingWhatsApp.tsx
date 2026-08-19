import { useState } from 'react';
import { startCashfreePayment } from '@/lib/cashfree';
import { printReceipt } from '@/lib/receipt';
import {
  FaWhatsapp,
  FaHeart,
  FaXmark,
  FaShieldHalved,
  FaStar,
  FaLock,
  FaChevronLeft,
  FaChevronRight,
  FaPencil,
  FaCheck,
  FaHandHoldingHeart,
  FaDownload,
  FaCircleCheck,
} from 'react-icons/fa6';
import { ORG } from '@/data/content';
import { useT } from '@/i18n';

/* ─── Amount presets starting from ₹500 ───────────────────── */
const AMOUNTS = [
  { value: 500,   label: 'Support' },
  { value: 1000,  label: 'Most Popular', star: true },
  { value: 2500,  label: 'Support' },
  { value: 5000,  label: 'Support' },
  { value: 10000, label: 'Support' },
];

type Screen = 'main' | 'payment' | 'details' | 'success';
type Tab    = 'donate' | 'enquiry';

interface SuccessData {
  paymentId: string;
  orderId: string;
  amount: number;
  date: string;
  name: string;
  email: string;
  phone: string;
  receiptNumber: string;
}

const CARD_BG = '#0e2d23';
const BORDER  = 'rgba(37, 211, 102, 0.25)';
const GREEN   = '#25d366';
const GREEN2  = '#128c7e';

export default function FloatingWhatsApp() {
  const [open,        setOpen]        = useState(false);
  const [screen,      setScreen]      = useState<Screen>('main');
  const [tab,         setTab]         = useState<Tab>('donate');
  const [amount,      setAmount]      = useState<number>(500);
  const [custom,      setCustom]      = useState('');
  const [payMethod,   setPayMethod]   = useState<'upi' | 'whatsapp'>('upi');
  const [paying,      setPaying]      = useState(false);
  const [donor,       setDonor]       = useState({ name: '', email: '', phone: '' });
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const { lang } = useT();
  void lang;

  const finalAmount = custom ? Number(custom) || amount : amount;

  const donationMsg = `Hello, I would like to donate ₹${finalAmount} to support Chhatradol Social Welfare Organization. Please share the payment details and donation process with me. Thank you.`;
  const enquiryMsg  = `Hello Chhatradol Social Welfare Organization, I would like to get more information about your initiatives and social welfare activities.`;

  const waLink = (text: string) =>
    `https://wa.me/91${ORG.whatsappNumber}?text=${encodeURIComponent(text)}`;

  const close = () => { setOpen(false); setScreen('main'); setSuccessData(null); };

  const handleContinue = () => setScreen('payment');

  const handleMethodSelect = () => {
    if (payMethod === 'whatsapp') {
      window.open(waLink(donationMsg), '_blank');
      close();
    } else {
      setScreen('details');
    }
  };

  const handlePay = async () => {
    // UPI / Cards — open Cashfree checkout directly
    setPaying(true);
    try {
      const response = await startCashfreePayment({
        action: 'create_donation_order',
        amount: finalAmount,
        description: `Donation of ₹${finalAmount} to Chhatradol Social Welfare Organization`,
        donorName:  donor.name  || 'Anonymous',
        donorEmail: donor.email || undefined,
        donorPhone: donor.phone || undefined,
        isAnonymous: !donor.name,
      });

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const receiptNum = `DON-${response.payment.paymentId.slice(-8).toUpperCase()}`;

      setSuccessData({
        paymentId:     response.payment.paymentId,
        orderId:       response.order.orderId,
        amount:        finalAmount,
        date:          dateStr,
        name:          donor.name || 'Anonymous',
        email:         donor.email,
        phone:         donor.phone,
        receiptNumber: receiptNum,
      });
      setScreen('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg !== 'CANCELLED') {
        alert('Payment failed. Please try again or contact us on WhatsApp.');
      }
    } finally {
      setPaying(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!successData) return;
    printReceipt({
      receiptNumber: successData.receiptNumber,
      type: 'donation',
      name: successData.name,
      email: successData.email || null,
      amount: successData.amount,
      date: successData.date,
      purpose: 'General Donation — Chhatradol Social Welfare Organization',
      paymentMethod: 'Cashfree Payments',
      paymentId: successData.paymentId,
    }, 'en');
  };

  return (
    <>
      {/* ── FLOATING TRIGGER (RIGHT SIDE) ─────────────────────────── */}
      <div className="fixed bottom-[88px] right-5 sm:bottom-[96px] sm:right-6 z-50 flex items-center gap-3">
        <button
          onClick={() => setOpen(true)}
          aria-label="Support & Donate"
          className="group relative flex h-[54px] w-[54px] sm:h-[60px] sm:w-[60px] items-center justify-center rounded-full text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN2} 100%)`,
            boxShadow: `0 10px 32px -4px rgba(37, 211, 102, 0.65)`,
          }}
        >
          <span className="absolute -inset-2 rounded-full bg-emerald-400 opacity-30 animate-ping pointer-events-none" />
          <span
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full shadow"
            style={{ background: '#ef4444' }}
          >
            <FaHeart className="h-2.5 w-2.5 text-white" />
          </span>
          <FaWhatsapp className="relative z-10 h-7 w-7 sm:h-8 sm:w-8 transition-transform group-hover:rotate-6" />
        </button>
      </div>

      {/* ── OVERLAY (No Scrollbar & Responsive) ──────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.86)', backdropFilter: 'blur(10px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          {/* ════ SCREEN 1: MAIN DONATE ════ */}
          {screen === 'main' && (
            <div
              className="relative w-[92vw] max-w-[430px] flex flex-col rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] text-white my-auto transition-all"
              style={{
                background: 'linear-gradient(180deg, #0b291e 0%, #061913 100%)',
                border: `1.5px solid ${BORDER}`,
              }}
            >
              {/* Close button */}
              <button
                onClick={close}
                className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-10 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-white/70 hover:text-white transition-colors cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <FaXmark className="h-3.5 w-3.5" />
              </button>

              {/* Hero Header */}
              <div
                className="flex flex-col items-center pt-5 sm:pt-6 pb-3 sm:pb-4 px-5 text-center flex-shrink-0"
                style={{ background: `linear-gradient(180deg, #0e3729 0%, transparent 100%)` }}
              >
                <div className="relative mb-2">
                  <div
                    className="absolute inset-0 rounded-full blur-xl opacity-60"
                    style={{ background: `radial-gradient(circle, ${GREEN} 0%, transparent 70%)` }}
                  />
                  <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center">
                    <span className="text-3xl sm:text-4xl select-none" role="img" aria-label="hands with heart">🫶</span>
                    <span className="absolute -top-1 -right-1 text-base sm:text-lg select-none animate-bounce" style={{ animationDuration: '2s' }}>💛</span>
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-black font-serif tracking-tight text-white drop-shadow-md">
                  Support Our Cause
                </h2>
                <p className="mt-0.5 text-xs font-bold text-emerald-300">
                  Every contribution makes a difference 💛
                </p>

                {/* Tabs */}
                <div
                  className="mt-3 flex w-full gap-1 rounded-xl p-1"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {(['donate', 'enquiry'] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs sm:text-sm font-black transition-all cursor-pointer"
                      style={
                        tab === t
                          ? {
                              background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN2} 100%)`,
                              color: '#fff',
                              boxShadow: '0 4px 16px rgba(37,211,102,0.4)',
                            }
                          : { color: 'rgba(255,255,255,0.65)' }
                      }
                    >
                      {t === 'donate' ? (
                        <><FaHeart className="h-3 w-3 text-rose-300" /> Donate Now</>
                      ) : (
                        <><FaWhatsapp className="h-3.5 w-3.5 text-emerald-300" /> General Enquiry</>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Content Body */}
              <div className="px-4 sm:px-5 pb-5 pt-1 space-y-3.5 overflow-hidden">
                {tab === 'donate' ? (
                  <>
                    <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                      Choose an amount
                    </p>

                    {/* Amount Grid with Serif Font Matching User Screenshot */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {AMOUNTS.map((a) => {
                        const isSelected = !custom && amount === a.value;
                        return (
                          <button
                            key={a.value}
                            onClick={() => { setAmount(a.value); setCustom(''); }}
                            className="relative flex flex-col items-center justify-center rounded-2xl py-3.5 px-1.5 transition-all duration-200 cursor-pointer"
                            style={{
                              background: isSelected
                                ? 'linear-gradient(135deg, rgba(14, 52, 40, 0.95) 0%, rgba(9, 36, 27, 0.95) 100%)'
                                : CARD_BG,
                              border: isSelected ? `2px solid ${GREEN}` : `1.5px solid ${BORDER}`,
                              color: isSelected ? '#fff' : '#cbd5e1',
                              boxShadow: isSelected ? '0 0 18px rgba(37,211,102,0.25)' : 'none',
                            }}
                          >
                            {a.star && (
                              <span
                                className="absolute -top-1.5 -right-1.5 flex h-5.5 w-5.5 items-center justify-center rounded-full bg-amber-500 text-white shadow-md z-10 border border-amber-300"
                              >
                                <FaStar className="h-2.5 w-2.5 fill-current" />
                              </span>
                            )}
                            <span className="text-lg sm:text-xl font-serif font-black tracking-tight text-white">
                              ₹{a.value.toLocaleString('en-IN')}
                            </span>
                            <span className="mt-0.5 text-xs font-semibold text-slate-300">
                              {a.star ? 'Most Popular' : a.label}
                            </span>
                          </button>
                        );
                      })}

                      {/* Custom Tile with Serif Font */}
                      <button
                        onClick={() => document.getElementById('wa-custom-input')?.focus()}
                        className="flex flex-col items-center justify-center rounded-2xl py-3.5 px-1.5 transition-all duration-200 cursor-pointer"
                        style={{
                          background: custom ? 'rgba(14, 52, 40, 0.95)' : CARD_BG,
                          border: custom ? `2px solid ${GREEN}` : `1.5px solid ${BORDER}`,
                          color: custom ? '#fff' : '#cbd5e1',
                          boxShadow: custom ? '0 0 18px rgba(37,211,102,0.25)' : 'none',
                        }}
                      >
                        <div className="flex items-center gap-1 text-lg sm:text-xl font-serif font-black text-white">
                          <span>Custom</span>
                          <FaPencil className="h-3 w-3 text-slate-300" />
                        </div>
                        <span className="mt-0.5 text-xs font-semibold text-slate-300">Other Amount</span>
                      </button>
                    </div>

                    {/* Custom Amount Input */}
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-serif font-black text-emerald-400">
                        ₹
                      </span>
                      <input
                        id="wa-custom-input"
                        type="number"
                        min="1"
                        placeholder="Enter custom amount"
                        value={custom}
                        onChange={(e) => { setCustom(e.target.value); }}
                        className="w-full rounded-xl py-2.5 pl-8 pr-3 text-xs sm:text-sm font-extrabold text-white placeholder-slate-400 outline-none transition-all"
                        style={{
                          background: CARD_BG,
                          border: `1.5px solid ${custom ? GREEN : BORDER}`,
                        }}
                      />
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={handleContinue}
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-3 sm:py-3.5 text-sm sm:text-base font-black text-white shadow-xl transition-all hover:opacity-95 hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
                      style={{
                        background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN2} 100%)`,
                        boxShadow: '0 8px 24px rgba(37,211,102,0.45)',
                      }}
                    >
                      Continue to Payment <FaLock className="h-3.5 w-3.5" />
                    </button>

                    <p className="text-center text-[11px] font-bold flex items-center justify-center gap-1.5 text-slate-300">
                      <FaShieldHalved className="h-3 w-3 text-emerald-400" />
                      100% Secure • Trusted • Transparent
                    </p>
                  </>
                ) : (
                  /* ── ENQUIRY TAB ── */
                  <div className="space-y-3.5 pt-1">
                    <div
                      className="rounded-xl p-4"
                      style={{ background: CARD_BG, border: `1.5px solid ${BORDER}` }}
                    >
                      <h4 className="font-black text-xs sm:text-sm text-emerald-400 mb-1">
                        Chhatradol SWO Direct Helpline
                      </h4>
                      <p className="text-xs leading-relaxed text-slate-200 font-medium">
                        Have questions about our blood donation drives, education assistance, or volunteer opportunities? Reach us directly on WhatsApp.
                      </p>
                      <span
                        className="mt-3 inline-flex items-center gap-2 rounded-full px-3.5 py-1 font-mono text-xs sm:text-sm font-black text-emerald-300 border border-emerald-500/40"
                        style={{ background: 'rgba(37,211,102,0.18)' }}
                      >
                        <FaWhatsapp className="h-3.5 w-3.5" />
                        +91 {ORG.whatsappNumber}
                      </span>
                    </div>

                    <a
                      href={waLink(enquiryMsg)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={close}
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-3 sm:py-3.5 text-sm sm:text-base font-black text-white transition-all hover:opacity-95 shadow-xl"
                      style={{ background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN2} 100%)` }}
                    >
                      <FaWhatsapp className="h-4.5 w-4.5" />
                      Open WhatsApp Chat
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════ SCREEN 2: PAYMENT METHOD SELECTION ════ */}
          {screen === 'payment' && (
            <div
              className="relative w-[92vw] max-w-[430px] flex flex-col rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] text-white my-auto transition-all"
              style={{
                background: 'linear-gradient(180deg, #0b291e 0%, #061913 100%)',
                border: `1.5px solid ${BORDER}`,
              }}
            >
              {/* Top Navigation Row */}
              <div className="relative pt-2.5 px-4 pb-0.5 flex items-center justify-between flex-shrink-0">
                <button
                  onClick={() => setScreen('main')}
                  className="flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full transition-all hover:bg-slate-800/80 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                >
                  <FaChevronLeft className="h-2.5 w-2.5" /> Back
                </button>

                {/* Center Shield */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.3)]">
                  <FaShieldHalved className="h-3.5 w-3.5" />
                </div>

                <button
                  onClick={close}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-200 transition-colors hover:bg-slate-800/80 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                >
                  <FaXmark className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Title & Subtitle */}
              <div className="text-center pt-0.5 pb-1.5 px-4 flex-shrink-0">
                <h2 className="text-lg sm:text-xl font-serif font-black tracking-tight text-white drop-shadow-md">
                  Complete Your Donation
                </h2>
                <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-300">
                  <FaShieldHalved className="h-3 w-3 text-emerald-400" />
                  Your support helps us create real impact
                </p>
              </div>

              {/* Body Content */}
              <div className="px-4 pb-4 space-y-3 overflow-hidden">
                {/* "You are donating" Card */}
                <div
                  className="flex items-center justify-between rounded-2xl px-3.5 py-2.5"
                  style={{
                    background: 'linear-gradient(135deg, #0e3428 0%, #0a291f 100%)',
                    border: `1.5px solid rgba(37, 211, 102, 0.35)`,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 shadow-md"
                      style={{ background: 'rgba(37,211,102,0.20)', color: GREEN }}
                    >
                      <FaHandHoldingHeart className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-300">You are donating</p>
                      <p className="text-2xl sm:text-3xl font-serif font-black text-amber-400 leading-tight drop-shadow-md">
                        ₹{finalAmount.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setScreen('main')}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black transition-all hover:bg-emerald-900/60 cursor-pointer"
                    style={{
                      background: 'rgba(16,185,129,0.18)',
                      border: '1.5px solid rgba(16,185,129,0.4)',
                      color: '#86efac',
                    }}
                  >
                    <FaPencil className="h-2.5 w-2.5" /> Edit
                  </button>
                </div>

                {/* Section Title */}
                <p className="text-xs font-bold text-white pt-0.5">Choose a payment method</p>

                {/* Option 1: UPI Payment */}
                <button
                  onClick={() => setPayMethod('upi')}
                  className="w-full text-left rounded-2xl p-3 transition-all relative overflow-hidden cursor-pointer"
                  style={{
                    background: payMethod === 'upi'
                      ? 'linear-gradient(135deg, rgba(14, 52, 40, 0.95) 0%, rgba(9, 36, 27, 0.95) 100%)'
                      : CARD_BG,
                    border: payMethod === 'upi' ? `2px solid ${GREEN}` : `1.5px solid ${BORDER}`,
                    boxShadow: payMethod === 'upi' ? '0 0 20px rgba(37, 211, 102, 0.22)' : 'none',
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Official upi.svg Logo */}
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900/90 border border-slate-700/80 p-1.5 shadow">
                      <img src="/assets/payment/upi.svg" alt="UPI" className="h-6 w-auto max-w-[28px] max-h-[22px] object-contain flex-shrink-0" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm sm:text-base font-serif font-bold text-white truncate">
                            UPI Payment
                          </span>
                          <span
                            className="rounded-md px-2 py-0.5 text-[9.5px] font-bold whitespace-nowrap flex-shrink-0 shadow"
                            style={{ background: 'rgba(245,158,11,0.22)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.4)' }}
                          >
                            Recommended
                          </span>
                        </div>
                        {payMethod === 'upi' && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950 font-bold text-xs flex-shrink-0 shadow">
                            <FaCheck className="h-3 w-3 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mt-0.5 font-medium leading-snug">
                        Instant payment via any UPI app
                      </p>

                      {/* Official SVG App Logos Row: GPay, Paytm, PhonePe, UPI */}
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <div className="flex items-center justify-center px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 h-6">
                          <img src="/assets/payment/gpay.svg" alt="GPay" className="h-3.5 w-auto max-w-[36px] max-h-[14px] object-contain flex-shrink-0" />
                        </div>
                        <div className="flex items-center justify-center px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 h-6">
                          <img src="/assets/payment/paytm.svg" alt="Paytm" className="h-3.5 w-auto max-w-[36px] max-h-[14px] object-contain flex-shrink-0" />
                        </div>
                        <div className="flex items-center justify-center px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 h-6">
                          <img src="/assets/payment/phonepe.svg" alt="PhonePe" className="h-3.5 w-auto max-w-[36px] max-h-[14px] object-contain flex-shrink-0" />
                        </div>
                        <div className="flex items-center justify-center px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 h-6">
                          <img src="/assets/payment/upi.svg" alt="UPI" className="h-3 w-auto max-w-[32px] max-h-[12px] object-contain flex-shrink-0" />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Option 2: WhatsApp Payment Help */}
                <button
                  onClick={() => setPayMethod('whatsapp')}
                  className="w-full flex items-center gap-3 rounded-2xl p-3 text-left transition-all cursor-pointer"
                  style={{
                    background: payMethod === 'whatsapp'
                      ? 'linear-gradient(135deg, rgba(14, 52, 40, 0.95) 0%, rgba(9, 36, 27, 0.95) 100%)'
                      : CARD_BG,
                    border: payMethod === 'whatsapp' ? `2px solid ${GREEN}` : `1.5px solid ${BORDER}`,
                    boxShadow: payMethod === 'whatsapp' ? '0 0 20px rgba(37, 211, 102, 0.22)' : 'none',
                  }}
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                    <FaWhatsapp className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-serif font-bold text-white">
                      WhatsApp Payment Help
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5 font-medium leading-snug">
                      Chat with our team for payment help
                    </p>
                  </div>
                  {payMethod === 'whatsapp' ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950 font-bold text-xs flex-shrink-0 shadow">
                      <FaCheck className="h-3 w-3 stroke-[3]" />
                    </span>
                  ) : (
                    <FaChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  )}
                </button>

                {/* CTA Action Button */}
                <button
                  onClick={handleMethodSelect}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white shadow-xl transition-all hover:opacity-95 hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN2} 100%)`,
                    boxShadow: '0 8px 24px rgba(37,211,102,0.5)',
                  }}
                >
                  {payMethod === 'whatsapp' ? (
                    <><FaWhatsapp className="h-4.5 w-4.5" /> Continue via WhatsApp</>
                  ) : (
                    <><FaChevronRight className="h-3.5 w-3.5" /> Proceed with UPI Payment</>
                  )}
                </button>

                {/* 3 Trust Badges Text Line (No outer box/shadow) */}
                <p className="text-center text-[11px] font-bold flex items-center justify-center gap-2 text-slate-300 pt-0.5">
                  <span className="flex items-center gap-1"><FaShieldHalved className="h-3 w-3 text-emerald-400" /> 100% Secure</span>
                  <span className="text-slate-500">•</span>
                  <span className="flex items-center gap-1"><FaHandHoldingHeart className="h-3 w-3 text-emerald-400" /> Direct NGO</span>
                  <span className="text-slate-500">•</span>
                  <span className="flex items-center gap-1"><FaShieldHalved className="h-3 w-3 text-emerald-400" /> 80G Benefit</span>
                </p>
              </div>
            </div>
          )}

          {/* ════ SCREEN 3: DONOR DETAILS (FOR UPI PAYMENT) ════ */}
          {screen === 'details' && (
            <div
              className="relative w-[92vw] max-w-[430px] flex flex-col rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] text-white my-auto transition-all"
              style={{
                background: 'linear-gradient(180deg, #0b291e 0%, #061913 100%)',
                border: `1.5px solid ${BORDER}`,
              }}
            >
              {/* Top Navigation Row */}
              <div className="relative pt-2.5 px-4 pb-0.5 flex items-center justify-between flex-shrink-0">
                <button
                  onClick={() => setScreen('payment')}
                  className="flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full transition-all hover:bg-slate-800/80 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                >
                  <FaChevronLeft className="h-2.5 w-2.5" /> Back
                </button>

                {/* Center Shield */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.3)]">
                  <FaShieldHalved className="h-3.5 w-3.5" />
                </div>

                <button
                  onClick={close}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-200 transition-colors hover:bg-slate-800/80 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                >
                  <FaXmark className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Title & Subtitle */}
              <div className="text-center pt-0.5 pb-1.5 px-4 flex-shrink-0">
                <h2 className="text-lg sm:text-xl font-serif font-black tracking-tight text-white drop-shadow-md">
                  Donor Information
                </h2>
                <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-300">
                  <FaShieldHalved className="h-3 w-3 text-emerald-400" />
                  Your details will be used to generate your official receipt
                </p>
              </div>

              {/* Body Content */}
              <div className="px-4 pb-4 space-y-3 overflow-hidden">
                {/* "You are donating" Summary Card */}
                <div
                  className="flex items-center justify-between rounded-2xl px-3.5 py-2.5"
                  style={{
                    background: 'linear-gradient(135deg, #0e3428 0%, #0a291f 100%)',
                    border: `1.5px solid rgba(37, 211, 102, 0.35)`,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 shadow-md"
                      style={{ background: 'rgba(37,211,102,0.20)', color: GREEN }}
                    >
                      <FaHandHoldingHeart className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-300">Total Donation</p>
                      <p className="text-2xl sm:text-3xl font-serif font-black text-amber-400 leading-tight drop-shadow-md">
                        ₹{finalAmount.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setScreen('main')}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black transition-all hover:bg-emerald-900/60 cursor-pointer"
                    style={{
                      background: 'rgba(16,185,129,0.18)',
                      border: '1.5px solid rgba(16,185,129,0.4)',
                      color: '#86efac',
                    }}
                  >
                    <FaPencil className="h-2.5 w-2.5" /> Edit
                  </button>
                </div>

                {/* Donor Details Input Fields */}
                <div className="space-y-2">
                  <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">YOUR DETAILS <span className="normal-case text-slate-400 font-semibold">(for receipt)</span></p>
                  {[
                    { key: 'name',  placeholder: 'Full Name',    type: 'text' },
                    { key: 'email', placeholder: 'Email Address', type: 'email' },
                    { key: 'phone', placeholder: 'Mobile Number', type: 'tel' },
                  ].map(({ key, placeholder, type }) => (
                    <input
                      key={key}
                      type={type}
                      placeholder={placeholder}
                      value={donor[key as keyof typeof donor]}
                      onChange={(e) => setDonor(d => ({ ...d, [key]: e.target.value }))}
                      className="w-full rounded-xl py-2.5 px-3.5 text-xs font-semibold text-white placeholder-slate-500 outline-none transition-all"
                      style={{
                        background: CARD_BG,
                        border: `1.5px solid ${BORDER}`,
                      }}
                    />
                  ))}
                </div>

                {/* Final Pay Button */}
                <button
                  onClick={handlePay}
                  disabled={paying}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm sm:text-base font-black text-white shadow-xl transition-all hover:opacity-95 hover:scale-[1.01] active:scale-[0.98] cursor-pointer disabled:opacity-70 disabled:cursor-wait"
                  style={{
                    background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN2} 100%)`,
                    boxShadow: '0 8px 24px rgba(37,211,102,0.5)',
                  }}
                >
                  {paying ? (
                    <><span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Opening Gateway…</>
                  ) : (
                    <><FaLock className="h-3.5 w-3.5" /> Pay ₹{finalAmount.toLocaleString('en-IN')} Securely</>
                  )}
                </button>

                {/* 3 Trust Badges Text Line */}
                <p className="text-center text-[11px] font-bold flex items-center justify-center gap-2 text-slate-300 pt-0.5">
                  <span className="flex items-center gap-1"><FaShieldHalved className="h-3 w-3 text-emerald-400" /> 100% Secure</span>
                  <span className="text-slate-500">•</span>
                  <span className="flex items-center gap-1"><FaHandHoldingHeart className="h-3 w-3 text-emerald-400" /> Direct NGO</span>
                  <span className="text-slate-500">•</span>
                  <span className="flex items-center gap-1"><FaShieldHalved className="h-3 w-3 text-emerald-400" /> 80G Benefit</span>
                </p>
              </div>
            </div>
          )}

          {/* ════ SCREEN 4: PAYMENT SUCCESS ════ */}
          {screen === 'success' && successData && (
            <div
              className="relative w-[92vw] max-w-[430px] flex flex-col rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] text-white my-auto transition-all"
              style={{
                background: 'linear-gradient(180deg, #0b291e 0%, #061913 100%)',
                border: `1.5px solid ${BORDER}`,
              }}
            >
              {/* Close */}
              <button
                onClick={close}
                className="absolute top-3.5 right-3.5 z-10 flex h-7 w-7 items-center justify-center rounded-full text-white/70 hover:text-white transition-colors cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <FaXmark className="h-3.5 w-3.5" />
              </button>

              {/* Success Hero */}
              <div className="flex flex-col items-center pt-7 pb-4 px-5 text-center"
                style={{ background: 'linear-gradient(180deg, #0e3729 0%, transparent 100%)' }}
              >
                <div className="relative mb-3">
                  <div className="absolute inset-0 rounded-full blur-2xl opacity-50"
                    style={{ background: 'radial-gradient(circle, #25d366 0%, transparent 70%)' }} />
                  <FaCircleCheck className="relative h-14 w-14 text-emerald-400 drop-shadow-lg" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black font-serif tracking-tight text-white">
                  Payment Successful! 🎉
                </h2>
                <p className="mt-1 text-xs font-bold text-emerald-300">
                  Thank you for supporting Chhatradol SWO
                </p>
              </div>

              {/* Receipt Details Card */}
              <div className="px-4 pb-5 space-y-3">
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ border: `1.5px solid rgba(37,211,102,0.3)`, background: '#0a2318' }}
                >
                  {/* Amount highlight */}
                  <div className="px-4 py-3 text-center"
                    style={{ background: 'linear-gradient(135deg, #0e3428, #0a291f)', borderBottom: '1px solid rgba(37,211,102,0.15)' }}
                  >
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Donation Amount</p>
                    <p className="text-3xl sm:text-4xl font-black font-serif text-amber-400">
                      ₹{successData.amount.toLocaleString('en-IN')}
                    </p>
                  </div>

                  {/* Info rows */}
                  <div className="px-4 py-3 space-y-2">
                    {[
                      { label: 'Receipt No.',          value: successData.receiptNumber },
                      { label: 'Transaction ID',  value: successData.paymentId },
                      { label: 'Chhatradol Order ID',  value: successData.orderId.slice(0,20) + '…' },
                      { label: 'Date & Time',          value: successData.date },
                      ...(successData.name && successData.name !== 'Anonymous'
                        ? [{ label: 'Name',  value: successData.name }] : []),
                      ...(successData.email
                        ? [{ label: 'Email', value: successData.email }] : []),
                      ...(successData.phone
                        ? [{ label: 'Mobile', value: successData.phone }] : []),
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-start justify-between gap-3 text-xs">
                        <span className="text-slate-400 font-semibold flex-shrink-0 w-[38%]">{label}</span>
                        <span className="text-white font-bold text-right break-all leading-snug">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Download Receipt Button */}
                <button
                  onClick={handleDownloadReceipt}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white transition-all hover:opacity-90 hover:scale-[1.01] cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN2} 100%)`,
                    boxShadow: '0 8px 24px rgba(37,211,102,0.4)',
                  }}
                >
                  <FaDownload className="h-3.5 w-3.5" /> Download Receipt (PDF)
                </button>

                {/* Close / Done */}
                <button
                  onClick={close}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black text-slate-300 border transition-all hover:bg-slate-800/40 cursor-pointer"
                  style={{ border: `1.5px solid ${BORDER}` }}
                >
                  Close
                </button>

                <p className="text-center text-[10px] text-slate-500 font-medium">
                  A copy of your receipt can be downloaded above.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
