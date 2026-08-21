import { useState } from 'react';
import type { PaymentGateway } from '@/types';
import {
  CreditCard,
  QrCode,
  Building2,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  Lock,
  CheckCircle2
} from 'lucide-react';

export type PaymentMethodType = 'gateway' | 'qr' | 'bank';

export interface UniversalPaymentCenterProps {
  amount: number;
  gateway: PaymentGateway;
  onGatewayChange: (gw: PaymentGateway) => void;
  methodType: PaymentMethodType;
  onMethodTypeChange: (type: PaymentMethodType) => void;
  donorName?: string;
  donorEmail?: string;
  donorPhone?: string;
  utrRef: string;
  onUtrRefChange: (val: string) => void;
  lang?: 'en' | 'bn';
  className?: string;
}

export const BANK_DETAILS = {
  accountName: 'CHHATRADOL SOCIAL WELFARE ORGANIZATION',
  accountNumber: '50200123995352',
  ifsc: 'HDFC0002593',
  bankName: 'HDFC Bank',
  branch: 'Daspur / Narajole Branch',
  accountType: 'Current Account',
  upiId: 'chhatradol@hdfcbank',
};

export default function UniversalPaymentCenter({
  amount,
  gateway,
  onGatewayChange,
  methodType,
  onMethodTypeChange,
  donorName: _donorName = '',
  donorEmail: _donorEmail = '',
  donorPhone: _donorPhone = '',
  utrRef,
  onUtrRefChange,
  lang = 'en',
  className = '',
}: UniversalPaymentCenterProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const tr = (bn: string, en: string) => (lang === 'bn' ? bn : en);

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const amountFmt = (amount || 0).toLocaleString('en-IN');
  const upiDeepLink = `upi://pay?pa=${BANK_DETAILS.accountNumber}@hdfcbank&pn=CHHATRADOL%20SOCIAL%20WELFARE%20ORGANIZATION&am=${amount || 100}&cu=INR&tn=Donation`;

  return (
    <div className={`select-none ${className}`}>
      {/* ── 5. Payment Method Header (Clean Responsive) ── */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-[#0c756f] text-white shadow-xs shrink-0">
          <CreditCard className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
        </div>
        <div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 font-bengali-serif leading-tight">
            <span className="text-[#0c756f]">5. </span>
            {tr('পেমেন্টের মাধ্যম', 'Payment Method')}
          </h3>
          <p className="text-xs sm:text-[13px] font-semibold text-stone-500 mt-0.5">
            {tr('একটি নিরাপদ ও সুবিধাজনক পেমেন্ট মাধ্যম বেছে নিন', 'Choose a secure and convenient payment option')}
          </p>
        </div>
      </div>

      {/* ── Top 3 Method Tabs (Auto-Fitting & Responsive) ── */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[#f8fafc] border border-stone-200/90 shadow-2xs">
        {/* Tab 1: Online Gateway */}
        <button
          type="button"
          onClick={() => onMethodTypeChange('gateway')}
          className={`group relative flex items-center gap-3 p-3 rounded-xl text-left font-bold transition-all duration-200 ${
            methodType === 'gateway'
              ? 'bg-white text-stone-900 shadow-sm border border-stone-200/80'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
          }`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
              methodType === 'gateway'
                ? 'bg-emerald-50 text-[#0c756f] border border-emerald-200/80'
                : 'bg-stone-100 text-stone-500'
            }`}
          >
            <CreditCard className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[13px] font-black leading-tight truncate">
              {tr('অনলাইন গেটওয়ে', 'Online Gateway')}
            </span>
            <span className="block text-[10.5px] font-medium text-stone-400 mt-0.5 truncate">
              {tr('নিরাপদে অনলাইনে পে করুন', 'Pay securely online')}
            </span>
          </div>
          {methodType === 'gateway' && (
            <span className="absolute bottom-0 left-4 right-4 h-[2.5px] rounded-full bg-[#00a35c]" />
          )}
        </button>

        {/* Tab 2: Direct UPI QR Code */}
        <button
          type="button"
          onClick={() => onMethodTypeChange('qr')}
          className={`group relative flex items-center gap-3 p-3 rounded-xl text-left font-bold transition-all duration-200 ${
            methodType === 'qr'
              ? 'bg-white text-stone-900 shadow-sm border border-stone-200/80'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
          }`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
              methodType === 'qr'
                ? 'bg-emerald-50 text-[#0c756f] border border-emerald-200/80'
                : 'bg-stone-100 text-stone-500'
            }`}
          >
            <QrCode className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[13px] font-black leading-tight truncate">
              {tr('সরাসরি UPI QR', 'Direct UPI QR')}
            </span>
            <span className="block text-[10.5px] font-medium text-stone-400 mt-0.5 truncate">
              {tr('স্ক্যান করে দ্রুত পেমেন্ট', 'Scan & Pay instantly')}
            </span>
          </div>
          {methodType === 'qr' && (
            <span className="absolute bottom-0 left-4 right-4 h-[2.5px] rounded-full bg-[#00a35c]" />
          )}
        </button>

        {/* Tab 3: Direct Bank Transfer */}
        <button
          type="button"
          onClick={() => onMethodTypeChange('bank')}
          className={`group relative flex items-center gap-3 p-3 rounded-xl text-left font-bold transition-all duration-200 ${
            methodType === 'bank'
              ? 'bg-white text-stone-900 shadow-sm border border-stone-200/80'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
          }`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
              methodType === 'bank'
                ? 'bg-emerald-50 text-[#0c756f] border border-emerald-200/80'
                : 'bg-stone-100 text-stone-500'
            }`}
          >
            <Building2 className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[13px] font-black leading-tight truncate">
              {tr('ব্যাংক ট্রান্সফার', 'Bank Transfer')}
            </span>
            <span className="block text-[10.5px] font-medium text-stone-400 mt-0.5 truncate">
              {tr('ম্যানুয়াল ব্যাংক ট্রান্সফার', 'Manual bank transfer')}
            </span>
          </div>
          {methodType === 'bank' && (
            <span className="absolute bottom-0 left-4 right-4 h-[2.5px] rounded-full bg-[#00a35c]" />
          )}
        </button>
      </div>

      {/* ── View 1: Online Gateway Cards ── */}
      {methodType === 'gateway' && (
        <div className="space-y-5 animate-fade-in">
          {/* Subheader: SELECT PAYMENT GATEWAY + 256-Bit SSL */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="font-mono text-[11px] sm:text-[11.5px] font-extrabold uppercase tracking-wider text-stone-800">
                {tr('পেমেন্ট গেটওয়ে নির্বাচন করুন', 'SELECT PAYMENT GATEWAY')}
              </span>
              <div className="h-[2px] w-6 bg-[#00a35c] mt-0.5 rounded-full" />
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-800 shadow-2xs shrink-0 whitespace-nowrap">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>{tr('256-বিট SSL সুরক্ষিত', '256-Bit SSL Secured')}</span>
            </div>
          </div>

          {/* Cards Grid: Cashfree & Razorpay (Responsive Multi-Column) */}
            <div className="grid grid-cols-1 gap-4">
            {/* ── Cashfree Card ── */}
            <button
              type="button"
              role="radio"
              aria-checked={gateway === 'cashfree'}
              onClick={() => onGatewayChange('cashfree')}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 p-4 w-full text-left cursor-pointer transition-all duration-200 ${
                gateway === 'cashfree'
                  ? 'border-[#00a35c] bg-white shadow-md ring-2 ring-emerald-500/20'
                  : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm'
              }`}
            >
              {/* Green Corner Ribbon on Active */}
              {gateway === 'cashfree' && (
                <div className="absolute top-0 right-0 h-9 w-9 overflow-hidden z-10">
                  <div className="absolute transform rotate-45 bg-[#00a35c] text-white font-bold text-[8px] py-0.5 right-[-32px] top-[10px] w-[100px] text-center shadow-xs flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                </div>
              )}

              <div>
                {/* Header row: Radio + Logo + Popular Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Radio */}
                    <span
                      className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                        gateway === 'cashfree'
                          ? 'border-[#00a35c] bg-white'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {gateway === 'cashfree' && (
                        <span className="h-2 w-2 rounded-full bg-[#00a35c]" />
                      )}
                    </span>

                    {/* Official Cashfree Logo */}
                    <div className="flex items-center h-7 max-w-[130px] shrink-0">
                      <img
                        src="/assets/payment/cashfree.svg"
                        alt="Cashfree Payments"
                        className="h-6 w-auto max-w-full object-contain"
                      />
                    </div>
                  </div>

                  <span className="shrink-0 whitespace-nowrap rounded-full bg-[#00a35c] px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide text-white shadow-2xs">
                    ★ {tr('জনপ্রিয়', 'POPULAR')}
                  </span>
                </div>

                {/* Heading & Subtitle */}
                <div className="mt-3">
                  <h4 className="text-[13.5px] font-black text-stone-900 leading-snug">
                    {tr('তাত্ক্ষণিক জিরো-ফি UPI ও দ্রুত চেকআউট', 'Instant Zero-Fee UPI & Fast Checkout')}
                  </h4>
                  <p className="text-[11px] text-stone-500 font-semibold mt-0.5 leading-relaxed">
                    {tr(
                      'জিরো অতিরিক্ত চার্জ এবং বিদ্যুৎ গতির চেকআউটের অভিজ্ঞতা নিন।',
                      'Experience seamless payments with zero extra charges and lightning-fast checkout.',
                    )}
                  </p>
                </div>

                {/* 6 Method Pill Badges */}
                <div className="mt-3.5 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[
                    { name: 'UPI', icon: '/assets/payment/upi.svg' },
                    { name: 'GPay', icon: '/assets/payment/gpay.svg' },
                    { name: 'PhonePe', icon: '/assets/payment/phonepe.svg' },
                    { name: 'Cards', icon: '/assets/payment/mastercard.svg' },
                    { name: 'QR', icon: '/assets/payment/upi.svg' },
                    { name: 'NetBanking', icon: '/assets/payment/rupay.svg' },
                  ].map((m) => (
                    <div
                      key={m.name}
                      className="flex flex-col items-center justify-center rounded-lg border border-stone-100 bg-[#f8fafc] py-1.5 px-1 text-center min-h-[42px]"
                    >
                      <img src={m.icon} alt={m.name} className="h-3.5 w-auto object-contain mb-0.5" />
                      <span className="text-[8.5px] font-bold text-stone-600 leading-none truncate max-w-full">
                        {m.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Trust Tagline */}
              <div className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50/80 px-2 py-1.5 text-[10px] font-bold text-emerald-800 border border-emerald-100/70">
                <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                <span className="truncate">PCI-DSS Compliant · 256-bit Encrypted · 100% Secure</span>
              </div>
            </button>
          </div>

          {/* ── Security Priority Banner (Exact Mockup) ── */}
          <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-emerald-50/70 p-3.5 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <div>
                <h5 className="text-[12.5px] font-black text-stone-900 leading-tight">
                  {tr('আপনার নিরাপত্তা আমাদের সর্বোচ্চ অগ্রাধিকার', 'Your Security is Our Priority')}
                </h5>
                <p className="text-[11px] text-stone-600 font-medium mt-0.5 leading-snug">
                  {tr(
                    'সমস্ত লেনদেন সম্পূর্ণ PCI-DSS কমপ্লায়েন্ট এবং 256-বিট এনক্রিপশনের মাধ্যমে সুরক্ষিত।',
                    'All transactions are PCI-DSS compliant and 256-bit encrypted for your protection.',
                  )}
                </p>
              </div>
            </div>

            {/* Shield graphic badge */}
            <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
        </div>
      )}

      {/* ── View 2: Direct UPI QR Code ── */}
      {methodType === 'qr' && (
        <div className="rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm animate-fade-in">
          <div className="flex flex-col md:flex-row items-center gap-5">
            <div className="relative flex flex-col items-center rounded-2xl border border-stone-200 bg-gradient-to-b from-stone-50 to-white p-4 shadow-sm shrink-0 text-center max-w-[200px]">
              <div className="mb-2 w-full rounded-lg bg-[#581c87] py-1 text-[10px] font-black text-white uppercase tracking-wider">
                Chhatradol Trust
              </div>
              <p className="text-[11px] font-extrabold text-stone-600 mb-2">
                {tr('স্ক্যান করে পেমেন্ট করুন', 'Scan to pay')}
              </p>
              
              <div className="overflow-hidden rounded-xl border border-stone-200 bg-white p-2 shadow-2xs">
                <img
                  src="/assets/payment/cswo-qr.png"
                  alt="Chhatradol Social Welfare Organization UPI QR Code"
                  className="h-36 w-36 object-contain rounded-lg"
                />
              </div>

              <p className="mt-2 text-[9px] font-bold text-stone-400">
                Together, we build a better tomorrow
              </p>

              <div className="mt-2 flex items-center justify-center gap-1 opacity-85">
                <span className="text-[8px] font-bold text-stone-400">Powered By</span>
                <img src="/assets/payment/cashfree.svg" alt="Cashfree" className="h-3 w-auto" />
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-between w-full">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">
                    ✓
                  </span>
                  <h4 className="text-sm sm:text-base font-black text-stone-900">
                    {tr('যেকোনো UPI অ্যাপ দিয়ে স্ক্যান করুন', 'Scan with Any UPI App')}
                  </h4>
                </div>
                
                <p className="mt-1 text-xs text-stone-500 font-semibold leading-relaxed">
                  {tr(
                    'Google Pay, PhonePe, Paytm, BHIM বা যেকোনো ব্যাংকিং অ্যাপ থেকে উপরের QR কোডটি স্ক্যান করে পেমেন্ট সম্পন্ন করুন।',
                    'Open GPay, PhonePe, Paytm, BHIM, or any banking app to scan the QR code and complete your contribution.',
                  )}
                </p>

                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5">
                  <span className="text-xs font-bold text-amber-800">{tr('পরিশোধের পরিমাণ:', 'Amount to pay:')}</span>
                  <span className="text-sm sm:text-base font-black text-amber-900">₹{amountFmt}</span>
                </div>

                <div className="mt-3 block sm:hidden">
                  <a
                    href={upiDeepLink}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0c756f] py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#095a55]"
                  >
                    <Smartphone className="h-4 w-4" />
                    {tr('সরাসরি UPI অ্যাপে খুলুন', 'Open in UPI App')}
                  </a>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100">
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {tr('পেমেন্টের UTR / রেফারেন্স নম্বর দিন (রসিদের জন্য) *', 'Enter UPI Ref / UTR No. (For instant receipt) *')}
                </label>
                <input
                  type="text"
                  placeholder={tr('যেমন: 12-সংখ্যার UTR বা ট্রানজাকশন আইডি', 'e.g. 12-digit UTR or Transaction ID')}
                  value={utrRef}
                  onChange={(e) => onUtrRefChange(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3 py-2 text-xs font-bold text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0c756f]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── View 3: Direct Bank Transfer ── */}
      {methodType === 'bank' && (
        <div className="rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm animate-fade-in">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                <Building2 className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-stone-900">
                  {tr('সংস্থার অফিশিয়াল ব্যাংক বিবরণ', 'Official Bank Account Details')}
                </h4>
                <p className="text-[10.5px] text-stone-400 font-semibold">
                  {tr('NEFT, RTGS, IMPS বা নেট ব্যাংকিং এর মাধ্যমে পাঠান', 'Direct transfer via NEFT, RTGS, IMPS, or NetBanking')}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[9.5px] font-black text-blue-700">
              HDFC Bank
            </span>
          </div>

          <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 text-xs font-semibold text-stone-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1.5 border-b border-stone-200/60">
              <span className="text-stone-400 font-bold uppercase text-[9.5px] tracking-wider">
                {tr('অ্যাকাউন্টের নাম', 'Account Name')}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-stone-900 text-right text-[11px] sm:text-xs">
                  {BANK_DETAILS.accountName}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('name', BANK_DETAILS.accountName)}
                  className="rounded-md p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60"
                  title="Copy Account Name"
                >
                  {copiedKey === 'name' ? <Check className="h-3 w-3 text-emerald-600 stroke-[3]" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-stone-200/60">
              <span className="text-stone-400 font-bold uppercase text-[9.5px] tracking-wider">
                {tr('অ্যাকাউন্ট নম্বর', 'Account Number')}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs sm:text-sm font-black text-[#0c756f]">
                  {BANK_DETAILS.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('acc', BANK_DETAILS.accountNumber)}
                  className="flex items-center gap-1 rounded-md bg-stone-200/60 px-2 py-0.5 text-[9.5px] font-black text-stone-700 hover:bg-stone-300"
                >
                  {copiedKey === 'acc' ? <Check className="h-3 w-3 text-emerald-600 stroke-[3]" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedKey === 'acc' ? tr('কপি হয়েছে!', 'Copied!') : tr('কপি', 'Copy')}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-stone-200/60">
              <span className="text-stone-400 font-bold uppercase text-[9.5px] tracking-wider">
                {tr('IFSC কোড', 'RTGS / NEFT IFSC')}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs sm:text-sm font-black text-stone-900">
                  {BANK_DETAILS.ifsc}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('ifsc', BANK_DETAILS.ifsc)}
                  className="flex items-center gap-1 rounded-md bg-stone-200/60 px-2 py-0.5 text-[9.5px] font-black text-stone-700 hover:bg-stone-300"
                >
                  {copiedKey === 'ifsc' ? <Check className="h-3 w-3 text-emerald-600 stroke-[3]" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedKey === 'ifsc' ? tr('কপি হয়েছে!', 'Copied!') : tr('কপি', 'Copy')}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1">
              <span className="text-stone-400 font-bold uppercase text-[9.5px] tracking-wider">
                {tr('ব্যাংক ও শাখা', 'Bank & Branch')}
              </span>
              <span className="font-bold text-stone-800 text-[11px] sm:text-xs">
                {BANK_DETAILS.bankName} · {BANK_DETAILS.branch}
              </span>
            </div>
          </div>

          <div className="mt-3.5">
            <label className="block text-xs font-bold text-stone-700 mb-1">
              {tr('ব্যাংক ট্রানজাকশন / UTR রেফারেন্স নম্বর দিন *', 'Bank Transaction / UTR Ref Number *')}
            </label>
            <input
              type="text"
              placeholder={tr('ট্রান্সফারের পর ব্যাংক থেকে প্রাপ্ত UTR নম্বর লিখুন', 'Enter UTR number received from your bank')}
              value={utrRef}
              onChange={(e) => onUtrRefChange(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3 py-2 text-xs font-bold text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0c756f]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
