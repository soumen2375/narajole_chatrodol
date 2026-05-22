// Field Journal — shared helpers & design tokens
// Every public page imports from here to keep the design system in one place.

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '@/i18n';
import {
  FaArrowRight, FaQuoteLeft, FaGraduationCap, FaHeart, FaTree,
  FaTrophy, FaDroplet, FaShirt, FaSnowflake, FaBook, FaBox,
  FaStethoscope, FaUsers, FaShield, FaHandshake, FaCircleCheck,
  FaPhone, FaEnvelope, FaLocationDot, FaArrowUp,
} from 'react-icons/fa6';

// ─────────────────── Palette ───────────────────
export const FJ = {
  bg:        '#faf6ef',
  paper:     '#ffffff',
  ink:       '#1c1917',
  ink2:      '#44403c',
  muted:     '#78716c',
  rule:      '#e7e5e4',
  brand:     '#c2410c',
  brandDark: '#9a3412',
  brandLight:'#ea580c',
  accent:    '#b45309',
} as const;

export const fjVars: React.CSSProperties = {
  '--c-bg':       FJ.bg,
  '--c-paper':    FJ.paper,
  '--c-ink':      FJ.ink,
  '--c-ink-2':    FJ.ink2,
  '--c-muted':    FJ.muted,
  '--c-rule':     FJ.rule,
  '--c-brand':    FJ.brand,
  '--c-brand-d':  FJ.brandDark,
  '--c-brand-l':  FJ.brandLight,
  '--c-accent':   FJ.accent,
} as React.CSSProperties;

export const SERIF_BN: React.CSSProperties = { fontFamily: '"Noto Serif Bengali", "Noto Sans Bengali", serif' };
export const SERIF_EN: React.CSSProperties = { fontFamily: '"Noto Serif", Georgia, serif' };

// ─────────────────── Icons (Font Awesome 6 via react-icons) ───────────────────
export const Icon = {
  Arrow:   FaArrowRight,
  Quote:   FaQuoteLeft,
  Grad:    FaGraduationCap,
  Heart:   FaHeart,
  Tree:    FaTree,
  Award:   FaTrophy,
  Droplet: FaDroplet,
  Shirt:   FaShirt,
  Snow:    FaSnowflake,
  Book:    FaBook,
  Package: FaBox,
  Stetho:  FaStethoscope,
  Users:   FaUsers,
  Shield:  FaShield,
  Hands:   FaHandshake,
  Check:   FaCircleCheck,
  Phone:   FaPhone,
  Mail:    FaEnvelope,
  Map:     FaLocationDot,
  ArrowUp: FaArrowUp,
};

// ─────────────────── Reveal utility ───────────────────
export function Reveal({ children, className = '', delay = 0, direction = 'up' }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'scale';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const cls = direction === 'left' ? 'reveal-left' : direction === 'right' ? 'reveal-right' : direction === 'scale' ? 'reveal-scale' : 'reveal';
  return (
    <div ref={ref} className={`${cls}${inView ? ' revealed' : ''} ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

export function RevealStagger({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal-stagger${inView ? ' revealed' : ''} ${className}`} style={style}>
      {children}
    </div>
  );
}

// ─────────────────── PageShell ───────────────────
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...fjVars, background: FJ.bg, color: FJ.ink, fontFamily: 'Roboto, "Noto Sans Bengali", sans-serif' }}>
      {children}
    </div>
  );
}

// ─────────────────── PageHero ───────────────────
export function PageHero({ title, lede }: { eyebrow?: string; title: string; lede?: string }) {
  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--c-bg)' }}>
      <div className="relative mx-auto grid max-w-[1320px] grid-cols-12 gap-8 px-6 pb-14 pt-16 md:px-10 md:pt-20">
        <div className="col-span-12 md:col-span-8">
          <h1 className="font-bengali text-[44px] leading-[1.05] md:text-[68px]" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>{title}</h1>
          {lede && (<p className="mt-6 max-w-2xl font-bengali text-[17px] leading-[1.7]" style={{ color: 'var(--c-ink-2)' }}>{lede}</p>)}
        </div>
        <div className="col-span-12 md:col-span-4" />
      </div>
      <div className="mx-auto h-px max-w-[1320px] px-6 md:px-10">
        <div className="h-px w-full" style={{ background: 'var(--c-rule)' }} />
      </div>
    </section>
  );
}

// ─────────────────── SectionHeader ───────────────────
export function SectionHeader({ title, kicker }: { eyebrow?: string; title: string; kicker?: string }) {
  return (
    <div className="mb-14">
      <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h2 className="font-bengali text-[36px] leading-[1.1] md:text-[52px]" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>{title}</h2>
        </div>
        {kicker && (<p className="max-w-sm font-bengali text-[15px] leading-[1.7]" style={{ color: 'var(--c-ink-2)' }}>{kicker}</p>)}
      </div>
      <div className="mt-6 h-px w-full" style={{ background: 'var(--c-rule)' }} />
    </div>
  );
}

// ─────────────────── GetInvolvedSection ───────────────────
export function GetInvolvedSection() {
  const { lang } = useT();
  const bn = lang === 'bn';

  const items = [
    {
      tag: '01', en: 'Donate',
      title: bn ? 'অনুদান দিন' : 'Donate',
      to: '/donate',
      lead: bn ? 'এক টাকার অনুদানও কাউকে নতুন সম্ভাবনা দিতে পারে। সরাসরি অনলাইনে দান করুন।' : 'Even a small donation can open new possibilities for someone. Donate directly online.',
      cta: bn ? 'অনলাইনে দিন' : 'Donate now',
      IIcon: Icon.Heart, primary: true,
    },
    {
      tag: '02', en: 'Volunteer',
      title: bn ? 'স্বেচ্ছাসেবক হোন' : 'Volunteer',
      to: '/volunteer',
      lead: bn ? 'মাঠ-পর্যায়ে আমাদের সাথে যোগ দিন। আপনার সময় ও দক্ষতা পরিবর্তনের শক্তি।' : 'Join us on the ground. Your time and skills are a force for change.',
      cta: bn ? 'আবেদন করুন' : 'Apply now',
      IIcon: Icon.Hands, primary: false,
    },
    {
      tag: '03', en: 'Partner',
      title: bn ? 'অংশীদার হোন' : 'Partner with us',
      to: '/contact',
      lead: bn ? 'কর্পোরেট, প্রতিষ্ঠান বা স্কুলের সঙ্গে যৌথ কর্মসূচির জন্য আমাদের সাথে যোগাযোগ।' : 'Partner with us for joint programmes as a corporate, institution or school.',
      cta: bn ? 'যোগাযোগ করুন' : 'Get in touch',
      IIcon: Icon.Users, primary: false,
    },
  ];
  return (
    <section style={{ background: 'var(--c-bg)' }}>
      <div className="mx-auto max-w-[1320px] px-6 py-28 md:px-10">
        <Reveal>
          <SectionHeader
            eyebrow="Three Ways to Help"
            title={bn ? 'আপনিও সঙ্গী হোন' : 'Get Involved'}
            kicker={bn ? 'আমাদের কাজ এগিয়ে চলে আপনার মতো মানুষদের হাত ধরে। যেভাবেই হোক — সাথে থাকুন।' : 'Our work moves forward through people like you. Stay with us — in whatever way you can.'}
          />
        </Reveal>
        <RevealStagger className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {items.map(({ IIcon, ...it }) => (
            <article
              key={it.tag}
              className="card-lift group flex flex-col gap-6 rounded-[4px] p-8"
              style={it.primary
                ? { background: 'var(--c-brand)', color: '#fff' }
                : { background: 'var(--c-paper)', border: '1px solid var(--c-rule)', color: 'var(--c-ink)' }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ opacity: 0.6 }}>{it.tag} · {it.en}</span>
                <IIcon className="h-5 w-5 transition-transform duration-300 group-hover:scale-125" style={{ opacity: it.primary ? 0.9 : 0.7 }} />
              </div>
              <h3 className="font-bengali text-[32px] leading-tight" style={SERIF_BN}>{it.title}</h3>
              <p className="flex-1 font-bengali text-[14.5px] leading-[1.7]" style={{ opacity: 0.85 }}>{it.lead}</p>
              <Link to={it.to} className="inline-flex items-center gap-2 self-start border-b pb-0.5 font-bengali text-[13px] font-semibold transition-all duration-300 group-hover:gap-3.5" style={{ borderColor: 'currentColor' }}>
                {it.cta} <Icon.Arrow className="h-3.5 w-3.5" />
              </Link>
            </article>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}
