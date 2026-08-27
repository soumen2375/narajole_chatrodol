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
  bg:        '#f4f9ea',
  paper:     '#ffffff',
  ink:       '#10241d',
  ink2:      '#4c5b54',
  muted:     '#5c6b64',
  rule:      'rgba(13,77,61,.14)',
  brand:     '#0d4d3d',
  brandDark: '#0a3b2f',
  brandLight:'#14614d',
  accent:    '#ffc800',
  yellow:    '#ffc800',
  red:       '#e2492e',
  blood:     '#8f2116',
  field:     '#fbfdf6',
  faint:     '#7d8f83',
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

// Headings are Archivo; Bengali glyphs fall through to Noto Serif Bengali.
export const SERIF_BN: React.CSSProperties = { fontFamily: 'Archivo, "Noto Serif Bengali", "DM Sans", sans-serif', letterSpacing: '-0.02em' };
export const SERIF_EN: React.CSSProperties = { fontFamily: 'Archivo, "DM Sans", sans-serif', letterSpacing: '-0.02em' };

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
    <div style={{ ...fjVars, background: FJ.bg, color: FJ.ink, fontFamily: '"DM Sans", "Noto Sans Bengali", sans-serif' }}>
      {children}
    </div>
  );
}

// ─────────────────── PageHero ───────────────────
export function PageHero({
  eyebrow,
  title,
  lede,
  image,
  imageAlt = '',
  titleClassName = '',
  scrim = 'soft',
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  /** Optional photo behind the hero — a green scrim keeps the text readable. */
  image?: string;
  imageAlt?: string;
  /** Extra classes on the h1 — for headlines that need a smaller phone size. */
  titleClassName?: string;
  /** 'strong' darkens the phone scrim, for heroes whose copy fills the frame. */
  scrim?: 'soft' | 'strong';
  children?: React.ReactNode;
}) {
  return (
    <section
      className={`page-hero relative overflow-hidden px-5 pb-14 pt-14 sm:px-8 md:pb-[86px] md:pt-[76px] ${
        image
          ? `flex items-end md:items-center md:min-h-[500px] ${
              scrim === 'strong' ? 'min-h-[560px]' : 'min-h-[470px]'
            }`
          : ''
      }`}
    >
      {image && (
        <>
          <img
            src={image}
            alt={imageAlt}
            className="page-hero-photo absolute inset-0 h-full w-full object-cover"
          />
          {/* Green scrim: near-solid over the copy, clearing towards the photo */}
          <div
            className={`page-hero-scrim absolute inset-0 ${scrim === 'strong' ? 'page-hero-scrim--strong' : ''}`}
            aria-hidden="true"
          />
        </>
      )}
      <div className="relative mx-auto w-full max-w-site">
        {eyebrow && (
          <div className="flex items-center gap-3">
            {/* The rule belongs to the photo-hero treatment; plain heroes keep
                the bare eyebrow they already had. */}
            {image && <span className="h-[2px] w-[30px] shrink-0 bg-site-yellow" aria-hidden="true" />}
            <div className="eyebrow-light">{eyebrow}</div>
          </div>
        )}
        <h1 className={`h-display mt-4 max-w-4xl text-white ${titleClassName}`} style={SERIF_BN}>{title}</h1>
        {lede && (
          <p
            className={`mt-4 font-dmsans text-[13.5px] leading-[1.7] text-white/85 sm:text-[15px] sm:leading-[1.75] md:text-[16px] md:leading-[1.8] ${
              image ? 'max-w-[520px]' : 'max-w-2xl'
            }`}
          >
            {lede}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

// ─────────────────── SectionHeader ───────────────────
export function SectionHeader({ eyebrow, title, kicker }: { eyebrow?: string; title: string; kicker?: string }) {
  return (
    <div className="mb-12">
      <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
          <h2 className="h-section" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>{title}</h2>
        </div>
        {kicker && (
          <p className="max-w-sm font-dmsans text-[15px] leading-[1.8]" style={{ color: 'var(--c-ink-2)' }}>{kicker}</p>
        )}
      </div>
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
      <div className="mx-auto max-w-site px-5 py-16 sm:px-8 md:py-20">
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
              className="group flex flex-col gap-5 rounded-card p-8"
              style={it.primary
                ? { background: 'var(--c-brand)', color: '#fff' }
                : { background: 'var(--c-paper)', border: '1px solid var(--c-rule)', color: 'var(--c-ink)' }}
            >
              <div className="flex items-center justify-between">
                <span className="font-dmmono text-[11px] uppercase tracking-[0.14em]" style={{ opacity: 0.6 }}>{it.tag} · {it.en}</span>
                <IIcon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" style={{ color: it.primary ? FJ.yellow : FJ.red }} />
              </div>
              <h3 className="h-card" style={SERIF_BN}>{it.title}</h3>
              <p className="flex-1 font-dmsans text-[14.5px] leading-[1.8]" style={{ opacity: 0.85 }}>{it.lead}</p>
              <Link
                to={it.to}
                className="inline-flex items-center gap-2 self-start pb-1 font-dmsans text-[13px] font-bold transition-all duration-300 group-hover:gap-3"
                style={{ borderBottom: `2px solid ${FJ.yellow}` }}
              >
                {it.cta} <Icon.Arrow className="h-3 w-3" />
              </Link>
            </article>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}
