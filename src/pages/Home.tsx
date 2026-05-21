import { Link } from 'react-router-dom';
import {
  IMPACT_STATS, ORG, CORE_VALUES, PROGRAMS, TESTIMONIALS, SUCCESS_STORIES,
} from '@/data/content';
import { usePosts } from '@/hooks/usePosts';
import { useT } from '@/i18n';
import {
  PageShell, FJ, SectionHeader, GetInvolvedSection,
  SERIF_BN, SERIF_EN, Icon,
} from './_field-journal';

// ════════════════════════════════════════════════════════════════════
//  Home — Field Journal redesign
// ════════════════════════════════════════════════════════════════════

const STAT_ICONS = [Icon.Grad, Icon.Heart, Icon.Tree, Icon.Award];
const VALUE_ICONS: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  GraduationCap: Icon.Grad, Heart: Icon.Heart, Shield: Icon.Shield,
  Handshake: Icon.Hands, CheckCircle: Icon.Check,
};
const PROGRAM_ICONS = [Icon.Droplet, Icon.Shirt, Icon.Tree, Icon.Snow, Icon.Book, Icon.Package, Icon.Stetho, Icon.Users];
const PROGRAM_FOCUS = {
  bn: ['স্বাস্থ্য','মানবিক','পরিবেশ','মানবিক','শিক্ষা','ত্রাণ','স্বাস্থ্য','সমাজ'],
  en: ['Health','Humanitarian','Environment','Humanitarian','Education','Relief','Health','Society'],
};

const FALLBACK = '/assets/images/chatrodol.jpg';
const onImgErr = (e: React.SyntheticEvent<HTMLImageElement>) => {
  if (e.currentTarget.src !== window.location.origin + FALLBACK) e.currentTarget.src = FALLBACK;
};

// ─────────────────── 1. HERO — full-bleed ───────────────────
function Hero() {
  const { lang, t } = useT();
  const bn = lang === 'bn';
  return (
    <section
      className="relative flex min-h-[92vh] items-center overflow-hidden"
      style={{ background: FJ.ink }}
    >
      <img
        src="/assets/images/chatrodol.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        onError={onImgErr}
      />
      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(110deg, rgba(28,25,23,0.88) 0%, rgba(28,25,23,0.60) 50%, rgba(28,25,23,0.25) 100%)' }}
      />

      <div className="relative mx-auto w-full max-w-[1320px] px-6 pb-16 pt-24 md:px-10 md:py-28">
        <div className="animate-fade-in-up max-w-[640px]">
          <h1 className="font-bengali text-[52px] leading-[1.05] text-white md:text-[76px] lg:text-[92px]" style={SERIF_BN}>
            {bn ? ORG.shortBn : ORG.shortEn}
          </h1>
          <div className="mt-3 text-[22px] italic text-white/85 md:text-[30px]" style={SERIF_EN}>
            — {bn ? ORG.taglineBn : ORG.taglineEn}
          </div>

          <p className="mt-6 max-w-lg font-bengali text-[15px] leading-[1.7] text-white/80 md:text-[17px]">
            {bn
              ? 'শিক্ষা, স্বাস্থ্য, পরিবেশ ও দরিদ্রসেবা — সাত বছর ধরে নাড়াজোলের প্রতিটি মানুষের পাশে।'
              : 'Education, health, environment and service to the poor — seven years of standing by every person in Narajole.'}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/donate"
              className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-bengali text-[14px] font-semibold text-white transition-all hover:-translate-y-[1px]"
              style={{ background: 'var(--c-brand)', boxShadow: '0 10px 28px -10px rgba(194,65,12,0.65)' }}
            >
              {t('nav.donate')}
              <Icon.Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/volunteer"
              className="inline-flex items-center rounded-full border border-white/35 px-7 py-3.5 font-bengali text-[14px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              {t('nav.volunteer')}
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/20 pt-5">
            {[
              { k: 'Established', v: ORG.established },
              { k: 'Programs',    v: '8+' },
              { k: 'Location',    v: 'Narajole · WB' },
            ].map((row) => (
              <div key={row.k}>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">{row.k}</div>
                <div className="mt-1 font-bengali text-[13.5px] font-medium text-white/90">{row.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Est. stamp */}
      <div
        className="absolute right-8 top-8 hidden rotate-[6deg] rounded-md px-3 py-2 text-center shadow-lg md:block"
        style={{ background: 'rgba(250,246,239,0.95)', border: '1px dashed var(--c-brand)' }}
      >
        <div className="text-[22px] leading-none" style={{ ...SERIF_EN, color: FJ.ink }}>Est. {ORG.established}</div>
        <div className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.18em]" style={{ color: FJ.brand }}>Public Charitable Trust</div>
      </div>
    </section>
  );
}

// ─────────────────── 2. MISSION ───────────────────
function Mission() {
  const { lang } = useT();
  const bn = lang === 'bn';
  return (
    <section style={{ background: 'var(--c-paper)' }}>
      <div className="mx-auto max-w-[1320px] px-6 py-24 md:px-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col justify-center">
            <div className="mb-4 inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--c-brand)' }} />
              Our Mission
            </div>
            <h2 className="font-bengali text-[38px] leading-[1.08] md:text-[54px]" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>
              {bn ? <>একসাথে গড়ছি <br /><span style={{ ...SERIF_EN, fontStyle: 'italic', color: 'var(--c-brand)' }}>উজ্জ্বল</span> ভবিষ্যৎ।</> : <>Building a <span style={{ ...SERIF_EN, fontStyle: 'italic', color: 'var(--c-brand)' }}>brighter</span> future, together.</>}
            </h2>
            <p className="mt-7 font-bengali text-[16px] leading-[1.7]" style={{ color: 'var(--c-ink-2)' }}>
              {bn
                ? '২০১৯ সালে নাড়াজোলের একদল তরুণ ছাত্রছাত্রীর হাত ধরে শুরু হয়েছিল আমাদের পথচলা। আজ আমরা একটি রেজিস্টার্ড পাবলিক চ্যারিটেবল ট্রাস্ট, যা পশ্চিম মেদিনীপুরের প্রান্তিক মানুষের পাশে নিরলসভাবে কাজ করে।'
                : 'Our journey began in 2019, led by a group of young students from Narajole. Today we are a registered public charitable trust, tirelessly working beside the marginalised people of Paschim Medinipur.'}
            </p>
            <p className="mt-4 font-bengali text-[16px] leading-[1.7]" style={{ color: 'var(--c-ink-2)' }}>
              {bn
                ? <>আমাদের বিশ্বাস — <em>প্রতিটি জীবন গুরুত্বপূর্ণ, প্রতিটি প্রচেষ্টা মূল্যবান</em>।</>
                : <>We believe — <em>every life matters, every effort is valuable</em>.</>}
            </p>
            <div className="mt-8">
              <Link to="/about" className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-bengali text-[14px] font-semibold text-white transition-all hover:-translate-y-[1px]" style={{ background: 'var(--c-ink)' }}>
                {bn ? 'আমাদের সম্পূর্ণ গল্প' : 'Our full story'} <Icon.Arrow className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div>
            <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>Core Values</div>
            <ul className="divide-y" style={{ borderColor: 'var(--c-rule)' }}>
              {CORE_VALUES.map((v) => {
                const VIcon = VALUE_ICONS[(v as unknown as { icon: string }).icon] || Icon.Check;
                return (
                  <li key={v.label.bn} className="flex items-start gap-4 py-5" style={{ borderColor: 'var(--c-rule)' }}>
                    <VIcon className="mt-1 h-5 w-5 flex-shrink-0" style={{ color: 'var(--c-brand)' }} />
                    <div>
                      <div className="font-bengali text-[19px] leading-tight" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>{v.label[lang]}</div>
                      <p className="mt-1 font-bengali text-[13.5px] leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>{v.text[lang]}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────── 3. IMPACT ───────────────────
function Impact() {
  const { lang } = useT();
  const bn = lang === 'bn';
  return (
    <section style={{ background: 'var(--c-bg)' }}>
      <div className="mx-auto max-w-[1320px] px-6 py-24 md:px-10">
        <SectionHeader
          eyebrow="Impact · 2019–2026"
          title={bn ? 'আমাদের কার্যক্রমের প্রভাব' : 'The impact of our work'}
          kicker={bn ? 'সাত বছর ধরে শিক্ষা, স্বাস্থ্য ও পরিবেশের জন্য নিরলস কাজের ফলাফল।' : 'Results of seven years of tireless work in education, health and the environment.'}
        />
        <div className="stagger-children grid grid-cols-2 gap-px lg:grid-cols-4" style={{ background: 'var(--c-rule)' }}>
          {IMPACT_STATS.map((stat, i) => {
            const SIcon = STAT_ICONS[i % STAT_ICONS.length];
            return (
              <div key={stat.label.bn} className="group p-8" style={{ background: 'var(--c-bg)' }}>
                <SIcon className="h-5 w-5" style={{ color: 'var(--c-brand)', opacity: 0.8 }} />
                <div className="mt-5 font-bengali text-[56px] leading-[0.95] md:text-[68px]" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>
                  {stat.value[lang]}
                </div>
                <p className="mt-3 font-bengali text-[14px] leading-snug" style={{ color: 'var(--c-ink-2)' }}>{stat.label[lang]}</p>
                <span className="mt-5 block h-[2px] w-10 origin-left transition-transform duration-500 group-hover:scale-x-[3]" style={{ background: 'var(--c-brand)' }} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────── 4. PROGRAMS GRID ───────────────────
function ProgramsGrid() {
  const { lang, t } = useT();
  const bn = lang === 'bn';
  return (
    <section style={{ background: 'var(--c-paper)' }}>
      <div className="mx-auto max-w-[1320px] px-6 py-24 md:px-10">
        <SectionHeader
          eyebrow="What We Do · 08 Programs"
          title={t('programs.title')}
          kicker={bn ? 'শিক্ষা, স্বাস্থ্য, পরিবেশ ও মানবিক সহায়তা — আট ধরনের কর্মসূচির মাধ্যমে আমরা সমাজের পাশে।' : 'Education, health, environment and humanitarian support — eight programmes standing with society.'}
        />
        <div className="stagger-children grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: 'var(--c-rule)' }}>
          {PROGRAMS.map((p, i) => {
            const PIcon = PROGRAM_ICONS[i % PROGRAM_ICONS.length];
            const focus = PROGRAM_FOCUS[lang][i % PROGRAM_FOCUS[lang].length];
            return (
              <article key={p.title.bn} className="card-lift group flex flex-col gap-4 p-7" style={{ background: 'var(--c-paper)' }}>
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors group-hover:bg-[color:var(--c-brand)] group-hover:text-white" style={{ borderColor: 'var(--c-rule)', color: 'var(--c-brand)' }}>
                  <PIcon className="h-5 w-5" />
                </div>
                <div>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ background: 'rgba(194,65,12,0.08)', color: 'var(--c-brand)' }}>
                    {focus}
                  </span>
                  <h3 className="mt-3 font-bengali text-[19px] leading-snug" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>{p.title[lang]}</h3>
                </div>
                <p className="flex-1 font-bengali text-[13.5px] leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>{p.description[lang]}</p>
                <Link to="/programs" className="mt-1 inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: 'var(--c-brand)' }}>
                  {bn ? 'বিস্তারিত' : 'Details'} <Icon.Arrow className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </Link>
              </article>
            );
          })}
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t pt-6 md:flex-row md:items-center" style={{ borderColor: 'var(--c-rule)' }}>
          <p className="font-bengali text-[15px] leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>
            {bn ? 'প্রতিটি কর্মসূচি স্থানীয় সম্প্রদায়ের সক্রিয় অংশগ্রহণে পরিচালিত হয়।' : 'Every programme is run with the active participation of local communities.'}
          </p>
          <Link to="/programs" className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-bengali text-[14px] font-semibold text-white transition-all hover:-translate-y-[1px]" style={{ background: 'var(--c-brand)' }}>
            {bn ? 'সকল কর্মসূচি দেখুন' : 'See all programmes'} <Icon.Arrow className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─────────────────── 5. FEATURED STORY ───────────────────
function FeaturedStory() {
  const { lang } = useT();
  const bn = lang === 'bn';
  const story = SUCCESS_STORIES[0];
  return (
    <section style={{ background: 'var(--c-ink)' }}>
      <div className="mx-auto max-w-[1320px] px-6 py-24 md:px-10">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[3px]">
            <img
              src={story.img || FALLBACK}
              alt={story.title[lang]}
              className="h-full w-full object-cover"
              onError={onImgErr}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 50%, rgba(28,25,23,0.55))' }} />
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/60">Impact Story</div>
            <h2 className="mt-4 font-bengali text-[34px] leading-[1.1] text-white md:text-[50px]" style={SERIF_BN}>
              {story.title[lang]}
            </h2>
            <div className="mt-7 flex items-start gap-4">
              <Icon.Quote className="h-9 w-9 flex-shrink-0" style={{ color: 'var(--c-brand-l)' }} />
              <p className="font-bengali text-[17px] italic leading-[1.7] text-white/85">
                {story.summary[lang]}
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/impacts" className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-bengali text-[14px] font-semibold text-white transition-all hover:-translate-y-[1px]" style={{ background: 'var(--c-brand)' }}>
                {bn ? 'সকল গল্প পড়ুন' : 'Read all stories'} <Icon.Arrow className="h-3.5 w-3.5" />
              </Link>
              <Link to="/volunteer" className="inline-flex items-center rounded-full border border-white/30 px-7 py-3.5 font-bengali text-[14px] font-semibold text-white transition-colors hover:bg-white/5">
                {bn ? 'স্বেচ্ছাসেবক হোন' : 'Volunteer'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────── 6. LATEST NEWS ───────────────────
function Latest() {
  const { lang } = useT();
  const bn = lang === 'bn';
  const { posts } = usePosts();
  const [featured, ...rest] = posts.slice(0, 3);
  if (!featured) return null;

  return (
    <section style={{ background: 'var(--c-bg)' }}>
      <div className="mx-auto max-w-[1320px] px-6 py-24 md:px-10">
        <SectionHeader
          eyebrow="Latest from the Field"
          title={bn ? 'সর্বশেষ খবর ও অনুষ্ঠান' : 'Latest news & events'}
          kicker={bn ? 'মাঠ-পর্যায় থেকে সরাসরি — আমাদের সাম্প্রতিক কর্মসূচি ও অনুষ্ঠান।' : 'Straight from the ground — our latest programmes and events.'}
        />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <article className="group lg:col-span-7">
            <div className="img-zoom overflow-hidden rounded-[3px]">
              <img
                src={featured.featuredImage || FALLBACK}
                alt={featured.title}
                className="aspect-[16/10] w-full object-cover"
                onError={onImgErr}
              />
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--c-muted)' }}>
              <span style={{ color: 'var(--c-brand)' }}>Featured</span>
              <span style={{ color: 'var(--c-rule)' }}>·</span>
              <span>{featured.category}</span>
              <span style={{ color: 'var(--c-rule)' }}>·</span>
              <span>{featured.publishedDate}</span>
            </div>
            <h3 className="mt-3 font-bengali text-[26px] leading-[1.15] md:text-[34px]" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>
              {featured.title}
            </h3>
            <p className="mt-3 font-bengali text-[15px] leading-[1.7]" style={{ color: 'var(--c-ink-2)' }}>
              {featured.content.split('\n')[0].slice(0, 180)}…
            </p>
            <Link to="/events" className="mt-5 inline-flex items-center gap-2 font-bengali text-[14px] font-semibold" style={{ color: 'var(--c-brand)' }}>
              {bn ? 'পুরো গল্প পড়ুন' : 'Read full story'} <Icon.Arrow className="h-3.5 w-3.5" />
            </Link>
          </article>

          <div className="flex flex-col divide-y lg:col-span-5" style={{ borderColor: 'var(--c-rule)' }}>
            {rest.map((post, i) => (
              <article key={post.id} className={`group flex gap-5 ${i === 0 ? 'pb-7' : 'py-7'}`} style={{ borderColor: 'var(--c-rule)' }}>
                <div className="w-28 flex-shrink-0 overflow-hidden rounded-[3px] sm:w-36">
                  <img
                    src={post.featuredImage || FALLBACK}
                    alt={post.title}
                    className="aspect-square h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    onError={onImgErr}
                  />
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: 'var(--c-brand)' }}>{post.category}</div>
                  <h4 className="mt-2 font-bengali text-[17px] leading-snug" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>
                    {post.title}
                  </h4>
                  <p className="mt-2 line-clamp-2 font-bengali text-[13px] leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>
                    {post.content.split('\n')[0].slice(0, 110)}…
                  </p>
                </div>
              </article>
            ))}
            <Link to="/events" className="group flex items-center justify-between pt-6" style={{ borderColor: 'var(--c-rule)' }}>
              <div className="font-bengali text-[18px]" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>
                {bn ? 'সকল খবর ও ইভেন্ট →' : 'All news & events →'}
              </div>
              <Icon.Arrow className="h-5 w-5 transition-transform group-hover:translate-x-1" style={{ color: 'var(--c-brand)' }} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────── 7. TESTIMONIALS ───────────────────
function Testimonials() {
  const { lang } = useT();
  const bn = lang === 'bn';
  return (
    <section style={{ background: 'var(--c-paper)' }}>
      <div className="mx-auto max-w-[1320px] px-6 py-24 md:px-10">
        <SectionHeader
          eyebrow="Voices from the Community"
          title={bn ? 'তাঁদের কথায়' : 'In their words'}
          kicker={bn ? 'যাঁদের জীবনে পরিবর্তন এসেছে — তাঁদের অভিজ্ঞতা।' : 'Experiences of those whose lives have changed.'}
        />
        <div className="stagger-children grid grid-cols-1 gap-px md:grid-cols-3" style={{ background: 'var(--c-rule)' }}>
          {TESTIMONIALS.map((t) => (
            <article key={t.author.bn} className="card-lift flex flex-col gap-6 p-8" style={{ background: 'var(--c-paper)' }}>
              <Icon.Quote className="h-9 w-9" style={{ color: 'var(--c-brand)' }} />
              <blockquote className="flex-1 font-bengali text-[16px] italic leading-[1.75]" style={{ color: 'var(--c-ink)' }}>
                {t.quote[lang]}
              </blockquote>
              <div className="flex items-center gap-3 border-t pt-5" style={{ borderColor: 'var(--c-rule)' }}>
                <div className="flex h-11 w-11 items-center justify-center rounded-full font-bengali text-[14px] font-semibold" style={{ background: 'var(--c-brand)', color: '#fff' }}>
                  {t.author[lang].charAt(0)}
                </div>
                <div>
                  <div className="font-bengali text-[16px]" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>{t.author[lang]}</div>
                  <div className="font-bengali text-[12.5px]" style={{ color: 'var(--c-muted)' }}>{t.role[lang]}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════
export default function Home() {
  return (
    <PageShell>
      <Hero />
      <Mission />
      <Impact />
      <ProgramsGrid />
      <FeaturedStory />
      <Latest />
      <Testimonials />
      <GetInvolvedSection />
    </PageShell>
  );
}
