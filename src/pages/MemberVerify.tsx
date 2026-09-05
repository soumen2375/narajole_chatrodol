import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, Phone, Droplet, CalendarDays, IdCard, ShieldX, ShieldQuestion } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { useFmt } from '@/lib/format';
import { useSEO } from '@/hooks/useSEO';
import { memberDisplayId } from '@/types';
import MemberAvatar from '@/components/ui/MemberAvatar';
import { FJ, SERIF_BN, fjVars } from './_field-journal';
import type { VerifiedMember } from '@/lib/memberQr';

/**
 * Public landing page for the QR printed on a member ID card.
 *
 * Anyone can reach it — that is the point of a verification code — so the data
 * comes from the `cswo_verify_member` RPC, which only ever returns the fields
 * that appear on the card itself.
 */
export default function MemberVerify() {
  const { token } = useParams<{ token: string }>();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [state, setState] = useState<'loading' | 'ok' | 'invalid' | 'error'>('loading');
  const [m, setM] = useState<VerifiedMember | null>(null);

  useSEO({
    title: tr('Member Verification', 'সদস্য যাচাই'),
    description: tr(
      'Verify a Chhatradol Social Welfare Organisation membership card.',
      'ছাত্রদল সোশ্যাল ওয়েলফেয়ার অর্গানাইজেশনের সদস্য কার্ড যাচাই করুন।',
    ),
    // A verification result is per-person and short-lived in value; keep it out
    // of search results.
    robots: 'noindex, nofollow',
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
        setState('invalid');
        return;
      }
      const { data, error } = await supabase.rpc('cswo_verify_member', { p_token: token });
      if (!alive) return;

      if (error) {
        setState('error');
        return;
      }
      const row = (data as VerifiedMember[] | null)?.[0] ?? null;
      setM(row);
      setState(row ? 'ok' : 'invalid');
    })();

    return () => { alive = false; };
  }, [token]);

  return (
    <div
      style={{ ...fjVars, background: FJ.bg, color: FJ.ink, fontFamily: '"DM Sans", "Noto Sans Bengali", sans-serif' }}
      className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12"
    >
      <div className="w-full max-w-[430px]">
        {state === 'loading' && <VerifyShellSkeleton />}

        {state === 'ok' && m && (
          <article
            className="overflow-hidden rounded-[26px] bg-white"
            style={{ border: `1px solid ${FJ.rule}`, boxShadow: '0 24px 60px rgba(13,77,61,.13)' }}
          >
            {/* Verified banner */}
            <div className="flex flex-col items-center gap-2 px-6 py-7 text-center text-white" style={{ background: FJ.brand }}>
              <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,.16)' }}>
                <BadgeCheck className="h-8 w-8" strokeWidth={2.2} />
              </span>
              <h1 className="text-[19px] font-extrabold" style={lang === 'bn' ? SERIF_BN : undefined}>
                {tr('Verified Successfully', 'সফলভাবে যাচাই হয়েছে')}
              </h1>
              <p className="text-[12px] font-medium text-white/80">
                {tr(
                  'This is a genuine member of Chhatradol Social Welfare Organisation.',
                  'ইনি ছাত্রদল সোশ্যাল ওয়েলফেয়ার অর্গানাইজেশনের প্রকৃত সদস্য।',
                )}
              </p>
            </div>

            {/* Photo + name */}
            <div className="flex flex-col items-center gap-3 px-6 pt-6">
              <MemberAvatar
                name={m.full_name}
                avatarUrl={m.avatar_url}
                size={104}
                style={{ boxShadow: `0 0 0 4px #fff, 0 0 0 6px ${FJ.brand}` }}
              />
              <div className="text-center">
                <h2 className="text-[20px] font-extrabold leading-tight" style={SERIF_BN}>{m.full_name}</h2>
                {m.designation && (
                  <p className="mt-1 text-[12.5px] font-bold uppercase tracking-[.1em]" style={{ color: FJ.brandLight }}>
                    {m.designation}
                  </p>
                )}
              </div>
            </div>

            {/* Details */}
            <dl className="mt-6 flex flex-col px-6 pb-6">
              <Row
                icon={<IdCard className="h-[17px] w-[17px]" />}
                label={tr('Member ID', 'সদস্য আইডি')}
                value={<span className="font-mono tracking-tight">{memberDisplayId(m)}</span>}
              />
              <Row
                icon={<Droplet className="h-[17px] w-[17px]" />}
                label={tr('Blood Group', 'রক্তের গ্রুপ')}
                value={
                  m.blood_group
                    ? <span className="rounded-md px-2 py-0.5 font-extrabold" style={{ background: '#fdeceb', color: FJ.blood }}>{m.blood_group}</span>
                    : <span style={{ color: FJ.faint }}>—</span>
                }
              />
              <Row
                icon={<Phone className="h-[17px] w-[17px]" />}
                label={tr('Mobile No', 'মোবাইল নম্বর')}
                value={
                  m.phone
                    ? <a href={`tel:${m.phone}`} className="font-semibold underline-offset-2 hover:underline" style={{ color: FJ.brand }}>{fmt.num(m.phone)}</a>
                    : <span style={{ color: FJ.faint }}>—</span>
                }
              />
              <Row
                icon={<CalendarDays className="h-[17px] w-[17px]" />}
                label={tr('Joining Date', 'যোগদানের তারিখ')}
                value={fmt.date(m.joined_at)}
                last
              />
            </dl>

            <VerifyFooter tr={tr} />
          </article>
        )}

        {(state === 'invalid' || state === 'error') && (
          <article
            className="overflow-hidden rounded-[26px] bg-white text-center"
            style={{ border: `1px solid ${FJ.rule}`, boxShadow: '0 24px 60px rgba(13,77,61,.13)' }}
          >
            <div className="flex flex-col items-center gap-2 px-6 py-7 text-white" style={{ background: state === 'invalid' ? FJ.red : FJ.ink2 }}>
              <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,.16)' }}>
                {state === 'invalid' ? <ShieldX className="h-8 w-8" strokeWidth={2.2} /> : <ShieldQuestion className="h-8 w-8" strokeWidth={2.2} />}
              </span>
              <h1 className="text-[19px] font-extrabold" style={lang === 'bn' ? SERIF_BN : undefined}>
                {state === 'invalid'
                  ? tr('Verification Failed', 'যাচাই ব্যর্থ হয়েছে')
                  : tr('Could Not Verify', 'যাচাই করা যায়নি')}
              </h1>
            </div>
            <p className="px-7 py-7 text-[13.5px] font-medium leading-relaxed" style={{ color: FJ.ink2 }}>
              {state === 'invalid'
                ? tr(
                    'This code does not match any active membership. The card may be expired, cancelled or not genuine.',
                    'এই কোডটি কোনো সক্রিয় সদস্যপদের সঙ্গে মেলেনি। কার্ডটি মেয়াদোত্তীর্ণ, বাতিল অথবা প্রকৃত নয়।',
                  )
                : tr(
                    'Something went wrong while checking this card. Please check your connection and scan again.',
                    'কার্ডটি যাচাই করার সময় সমস্যা হয়েছে। সংযোগ পরীক্ষা করে আবার স্ক্যান করুন।',
                  )}
            </p>
            <VerifyFooter tr={tr} />
          </article>
        )}
      </div>
    </div>
  );
}

function Row({ icon, label, value, last = false }: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 py-3"
      style={last ? undefined : { borderBottom: `1px solid ${FJ.rule}` }}
    >
      <dt className="flex items-center gap-2.5 text-[12.5px] font-bold uppercase tracking-[.08em]" style={{ color: FJ.muted }}>
        <span style={{ color: FJ.brandLight }}>{icon}</span>
        {label}
      </dt>
      <dd className="text-right text-[14px] font-bold" style={{ color: FJ.ink }}>{value}</dd>
    </div>
  );
}

function VerifyFooter({ tr }: { tr: (en: string, bn: string) => string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-5 text-center" style={{ background: FJ.field, borderTop: `1px solid ${FJ.rule}` }}>
      <img
        src="/assets/images/logo.png"
        alt=""
        className="rounded-full object-cover"
        style={{ width: 32, height: 32 }}
      />
      <Link to="/" className="text-[12.5px] font-extrabold" style={{ color: FJ.brand }}>
        Chhatradol Social Welfare Organisation
      </Link>
      <p className="text-[11px] font-medium" style={{ color: FJ.faint }}>
        {tr('Scanned from an official member ID card', 'অফিসিয়াল সদস্য পরিচয়পত্র থেকে স্ক্যান করা হয়েছে')}
      </p>
    </div>
  );
}

function VerifyShellSkeleton() {
  return (
    <div className="overflow-hidden rounded-[26px] bg-white" style={{ border: `1px solid ${FJ.rule}` }}>
      <div className="h-[132px] animate-pulse" style={{ background: FJ.brand, opacity: .35 }} />
      <div className="flex flex-col items-center gap-3 p-6">
        <div className="h-[104px] w-[104px] animate-pulse rounded-full" style={{ background: FJ.rule }} />
        <div className="h-4 w-40 animate-pulse rounded" style={{ background: FJ.rule }} />
        <div className="mt-3 w-full space-y-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-4 w-full animate-pulse rounded" style={{ background: FJ.rule }} />)}
        </div>
      </div>
    </div>
  );
}
