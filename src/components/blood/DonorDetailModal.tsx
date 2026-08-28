import { useEffect } from 'react';
import { X, Phone, MapPin, Calendar, Droplet, CheckCircle2, Clock, IdCard } from 'lucide-react';
import { useT } from '@/i18n';
import { useFmt } from '@/lib/format';
import { formatAadhar, maskAadhar, type DonorProfile } from '@/lib/bloodDonors';

// ════════════════════════════════════════════════════════════════
//  DonorDetailModal — everything known about one donor, including
//  every camp they gave blood at and when they are next eligible.
//  `masked` hides all but the last 4 Aadhar digits (member panel).
// ════════════════════════════════════════════════════════════════

const TEAL  = '#0c756f';
const RED   = '#b91c1c';
const GREEN = '#15803d';
const INK   = '#1c1917';
const INK2  = '#44403c';
const MUTED = '#78716c';
const RULE  = '#e7e5e4';
const CREAM = '#faf8f5';
const SERIF = { fontFamily: '"Noto Serif Bengali", "Noto Sans Bengali", serif' };

export default function DonorDetailModal({
  donor,
  onClose,
  masked = false,
}: {
  donor: DonorProfile;
  onClose: () => void;
  masked?: boolean;
}) {
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const aadhar = masked ? maskAadhar(donor.aadhar) : formatAadhar(donor.aadhar);
  const genderLabel: Record<string, string> = {
    male: tr('Male', 'পুরুষ'), female: tr('Female', 'মহিলা'), other: tr('Other', 'অন্যান্য'),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[14px] shadow-xl"
        style={{ background: '#fff' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5" style={{ borderBottom: `1px solid ${RULE}` }}>
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[15px] font-black text-white"
            style={{ background: RED }}
          >
            {donor.blood_group || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[19px] font-bold" style={{ color: INK, ...SERIF }}>{donor.name}</h2>
            <div className="mt-0.5 font-mono text-[11px]" style={{ color: MUTED }}>
              {donor.donor_code || '—'}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-stone-100" aria-label={tr('Close', 'বন্ধ')}>
            <X className="h-4 w-4" style={{ color: MUTED }} />
          </button>
        </div>

        {/* Eligibility banner */}
        <div
          className="flex items-start gap-2.5 px-5 py-3.5"
          style={{ background: donor.eligible ? '#f0fdf4' : '#fff7ed' }}
        >
          {donor.eligible
            ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GREEN }} />
            : <Clock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#c2410c' }} />}
          <div className="text-[13px]">
            <div className="font-bold" style={{ color: donor.eligible ? GREEN : '#c2410c' }}>
              {donor.eligible
                ? tr('Eligible to donate', 'রক্তদানে যোগ্য')
                : tr('Not eligible yet', 'এখনো যোগ্য নন')}
            </div>
            <div className="mt-0.5" style={{ color: INK2 }}>
              {donor.eligible
                ? donor.lastDonation
                  ? tr(
                      `Last donated on ${fmt.date(donor.lastDonation)} — more than 3 months ago.`,
                      `শেষ দান ${fmt.date(donor.lastDonation)} — ৩ মাসের বেশি হয়ে গেছে।`,
                    )
                  : tr('No donation recorded at our camps yet.', 'আমাদের শিবিরে এখনো কোনো দান নথিভুক্ত নেই।')
                : tr(
                    `Donated on ${fmt.date(donor.lastDonation ?? '')}. Eligible again on ${fmt.date(donor.nextEligible ?? '')} — ${donor.daysToWait} day(s) to go.`,
                    `${fmt.date(donor.lastDonation ?? '')} তারিখে দান করেছেন। আবার যোগ্য হবেন ${fmt.date(donor.nextEligible ?? '')} — আর ${fmt.num(donor.daysToWait)} দিন।`,
                  )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 p-5">
          <Field label={tr('Full name', 'পুরো নাম')} value={donor.name} span />
          <Field label={tr('Age', 'বয়স')} value={donor.age != null ? fmt.num(donor.age) : '—'} />
          <Field label={tr('Gender', 'লিঙ্গ')} value={genderLabel[donor.gender] ?? '—'} />
          <Field
            label={tr('Mobile number', 'মোবাইল নম্বর')}
            value={donor.phone
              ? <a href={`tel:${donor.phone}`} className="inline-flex items-center gap-1 font-semibold" style={{ color: TEAL }}>
                  <Phone className="h-3 w-3" />{donor.phone}
                </a>
              : '—'}
          />
          <Field
            label={tr('Blood group', 'রক্তের গ্রুপ')}
            value={<span className="font-bold" style={{ color: RED }}>{donor.blood_group || '—'}</span>}
          />
          <Field
            label={tr('Address', 'ঠিকানা')}
            value={donor.address
              ? <span className="inline-flex items-start gap-1"><MapPin className="mt-0.5 h-3 w-3 shrink-0" />{donor.address}</span>
              : '—'}
            span
          />
          <Field
            label={tr('Aadhar number', 'আধার নম্বর')}
            value={aadhar
              ? <span className="inline-flex items-center gap-1 font-mono"><IdCard className="h-3.5 w-3.5" />{aadhar}</span>
              : '—'}
            span
          />
        </div>

        {/* Donation history */}
        <div className="px-5 pb-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: MUTED }}>
              {tr('Donation history', 'রক্তদানের ইতিহাস')}
            </span>
            <span className="text-[12px] font-semibold" style={{ color: RED }}>
              {fmt.num(donor.donationCount)} {tr('donation(s)', 'বার')} · {fmt.num(donor.totalUnits)} {tr('unit(s)', 'ইউনিট')}
            </span>
          </div>

          {donor.visits.length === 0 ? (
            <p className="py-3 text-center text-[13px]" style={{ color: MUTED }}>
              {tr('No camp records.', 'কোনো শিবিরের তথ্য নেই।')}
            </p>
          ) : (
            <ol className="space-y-2">
              {donor.visits.map((v) => {
                const donated = v.status === 'donated';
                return (
                  <li
                    key={v.id}
                    className="flex items-start gap-3 rounded-[10px] p-3"
                    style={{ background: CREAM, border: `1px solid ${RULE}` }}
                  >
                    <Droplet
                      className="mt-0.5 h-4 w-4 shrink-0"
                      style={{ color: donated ? RED : MUTED, fill: donated ? RED : 'transparent' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold" style={{ color: INK }}>
                        {v.event_title || tr('Untitled camp', 'নামহীন শিবির')}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px]" style={{ color: MUTED }}>
                        {v.event_date && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />{fmt.date(v.event_date)}
                          </span>
                        )}
                        <span
                          className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize"
                          style={{
                            background: donated ? '#dcfce7' : v.status === 'rejected' ? '#fee2e2' : '#e0e7ff',
                            color: donated ? GREEN : v.status === 'rejected' ? RED : '#3730a3',
                          }}
                        >
                          {v.status}
                        </span>
                        {v.units > 0 && (
                          <span style={{ color: RED }}>{fmt.num(v.units)} {tr('unit(s)', 'ইউনিট')}</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, span }: { label: string; value: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>{label}</div>
      <div className="mt-0.5 text-[13.5px]" style={{ color: INK2 }}>{value}</div>
    </div>
  );
}
