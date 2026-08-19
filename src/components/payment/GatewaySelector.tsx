import { useState, useEffect } from 'react';
import type { PaymentGateway } from '@/types';
import { getGatewayMode, setGatewayMode, type GatewayMode } from '@/lib/payments';

// ── Gateway brand definitions ──────────────────────────────────────────────────

export interface GatewayOption {
  id: PaymentGateway;
  label: string;
  badge?: string;
  tagline: string;
  methods: string[];
  color: string;
  activeBorder: string;
  activeBg: string;
  logoSrc: string;
  logoAlt: string;
}

const GATEWAY_OPTIONS: GatewayOption[] = [
  {
    id: 'cashfree',
    label: 'Cashfree Payments',
    badge: 'Popular',
    tagline: 'Instant Zero-Fee UPI & Fast Checkout',
    methods: ['UPI', 'GPay', 'PhonePe', 'Cards', 'QR', 'NetBanking'],
    color: '#00A35C',
    activeBorder: '#00A35C',
    activeBg: 'rgba(0, 163, 92, 0.04)',
    logoSrc: '/assets/payment/cashfree.svg',
    logoAlt: 'Cashfree Payments',
  },
  {
    id: 'razorpay',
    label: 'Razorpay',
    badge: 'Trusted',
    tagline: 'All Indian Cards, UPI, NetBanking & Wallets',
    methods: ['UPI', 'Credit/Debit Cards', 'NetBanking', 'Wallets'],
    color: '#0c2340',
    activeBorder: '#0c2340',
    activeBg: 'rgba(12, 35, 64, 0.04)',
    logoSrc: '/assets/payment/razorpay.svg',
    logoAlt: 'Razorpay',
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface GatewaySelectorProps {
  /** Currently selected gateway */
  value: PaymentGateway;
  /** Called when user selects a different gateway */
  onChange: (gateway: PaymentGateway) => void;
  /** Bilingual label strings */
  lang?: 'en' | 'bn';
  /** Compact variant */
  compact?: boolean;
  /** Additional container className */
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function GatewaySelector({
  value,
  onChange,
  lang = 'en',
  compact = false,
  className = '',
}: GatewaySelectorProps) {
  const [mode, setMode] = useState<GatewayMode>(() => getGatewayMode());

  // React to admin mode changes
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ mode: GatewayMode }>).detail;
      setMode(detail.mode);
    };
    window.addEventListener('cswo:gateway-mode-change', handler);
    return () => window.removeEventListener('cswo:gateway-mode-change', handler);
  }, []);

  // Sync mode restrictions
  useEffect(() => {
    if (mode === 'razorpay' && value !== 'razorpay') onChange('razorpay');
    if (mode === 'cashfree' && value !== 'cashfree') onChange('cashfree');
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // When admin has locked gateway to a single provider, hide selector
  if (mode !== 'both') return null;

  const tr = (bn: string, en: string) => (lang === 'bn' ? bn : en);

  return (
    <div className={`select-none ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[11px] font-extrabold uppercase tracking-wider text-stone-500">
          {tr('পেমেন্ট গেটওয়ে নির্বাচন করুন', 'Select Payment Gateway')}
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {tr('নিরাপদ এনক্রিপশন', '256-Bit SSL Secured')}
        </span>
      </div>

      {/* Gateway selection cards */}
      <div className={`grid grid-cols-1 gap-3.5 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
        {GATEWAY_OPTIONS.map((gw) => {
          const active = value === gw.id;
          return (
            <div
              key={gw.id}
              onClick={() => onChange(gw.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onChange(gw.id);
              }}
              className={`group relative flex flex-col justify-between rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 hover:shadow-lg active:scale-[0.99] ${
                active
                  ? 'shadow-md ring-2 ring-offset-1'
                  : 'border-stone-200/80 bg-white hover:border-stone-300'
              }`}
              style={{
                borderColor: active ? gw.activeBorder : undefined,
                backgroundColor: active ? gw.activeBg : '#ffffff',
                boxShadow: active ? `0 8px 24px -6px ${gw.activeBorder}30` : undefined,
              }}
            >
              {/* Header row: Radio + Logo + Badge */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Radio Indicator */}
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150 ${
                      active ? 'border-transparent shadow-xs' : 'border-stone-300 bg-white group-hover:border-stone-400'
                    }`}
                    style={{ backgroundColor: active ? gw.color : undefined }}
                  >
                    {active ? (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    ) : null}
                  </span>

                  {/* Gateway Logo */}
                  <div className="flex h-10 items-center max-w-[140px] px-1">
                    <img
                      src={gw.logoSrc}
                      alt={gw.logoAlt}
                      className="max-h-7 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                    />
                  </div>
                </div>

                {/* Badge */}
                {gw.badge && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-2xs"
                    style={{
                      backgroundColor: active ? gw.color : '#f3f4f6',
                      color: active ? '#ffffff' : '#4b5563',
                    }}
                  >
                    {gw.badge}
                  </span>
                )}
              </div>

              {/* Tagline */}
              <p className="mt-3 text-[12px] font-semibold text-stone-600">
                {gw.tagline}
              </p>

              {/* Methods Pills */}
              <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-stone-100">
                {gw.methods.map((m) => (
                  <span
                    key={m}
                    className="inline-block rounded-md bg-stone-100/80 px-2 py-0.5 text-[10px] font-bold text-stone-600"
                  >
                    {m}
                  </span>
                ))}
              </div>

              {/* Active Selection Indicator */}
              {active && (
                <div
                  className="absolute -top-2.5 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-md"
                  style={{ backgroundColor: gw.color }}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Security footer */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500">
        <span className="flex items-center gap-1.5">
          <span>🔒</span>
          <span>
            {tr(
              'সব পেমেন্ট PCI-DSS কমপ্লায়েন্ট এবং 256-বিট এনক্রিপ্টেড।',
              'All transactions are PCI-DSS compliant and 256-bit encrypted.',
            )}
          </span>
        </span>
        <span className="font-mono text-[10px] font-bold text-stone-400">
          {value === 'cashfree' ? 'Cashfree Gateway' : 'Razorpay Gateway'}
        </span>
      </div>
    </div>
  );
}

// ── Admin Gateway Control Switch ────────────────────────────────────────────────

export interface AdminGatewaySwitchProps {
  className?: string;
}

export function AdminGatewaySwitch({ className = '' }: AdminGatewaySwitchProps) {
  const [mode, setMode] = useState<GatewayMode>(() => getGatewayMode());
  const [saved, setSaved] = useState(false);

  const handleChange = (next: GatewayMode) => {
    setMode(next);
    setGatewayMode(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const OPTIONS: Array<{ value: GatewayMode; label: string; desc: string; color: string }> = [
    {
      value: 'both',
      label: '🔀 User Choice (Both Active)',
      desc: 'Show Cashfree & Razorpay cards to donors & members',
      color: '#0c756f',
    },
    {
      value: 'cashfree',
      label: '💚 Cashfree Only',
      desc: 'All payments automatically route via Cashfree',
      color: '#00A35C',
    },
    {
      value: 'razorpay',
      label: '💙 Razorpay Only',
      desc: 'All payments automatically route via Razorpay',
      color: '#0c2340',
    },
  ];

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm ${className}`}
      style={{ borderColor: '#e5dec9' }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-black text-gray-900">Payment Gateway Routing</h3>
          <p className="text-[11.5px] text-gray-500 font-semibold mt-0.5">
            Admin master switch for donation & member checkout
          </p>
        </div>
        {saved && (
          <span className="rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-[11px] font-extrabold text-emerald-800 animate-fade-in">
            ✓ Active
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {OPTIONS.map((opt) => {
          const active = mode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleChange(opt.value)}
              className="flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-150 hover:shadow-xs active:scale-[0.99]"
              style={{
                borderColor: active ? opt.color : '#f3f4f6',
                background: active ? `${opt.color}08` : '#fafafa',
              }}
            >
              <span
                className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: active ? opt.color : '#d1d5db',
                  background: active ? opt.color : 'transparent',
                }}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <span className="flex-1">
                <span
                  className="block text-[13px] font-bold"
                  style={{ color: active ? opt.color : '#1f2937' }}
                >
                  {opt.label}
                </span>
                <span className="text-[11px] text-gray-400 font-semibold">{opt.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[10.5px] text-gray-400 font-semibold">
        Instant live sync: Public pages update immediately without page reload.
      </p>
    </div>
  );
}
