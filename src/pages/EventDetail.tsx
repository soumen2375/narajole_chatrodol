import { useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FaFacebook, FaWhatsapp, FaXTwitter, FaLink, FaHeart, FaHandHoldingHeart, FaEnvelope } from 'react-icons/fa6';
import { usePosts } from '@/hooks/usePosts';
import { useT } from '@/i18n';
import { useSEO } from '@/hooks/useSEO';
import { injectEventSchema, removeEventSchema } from '@/lib/structuredData';
import { PageShell, Icon } from './_field-journal';

const FALLBACK = '/assets/images/Chhatradol.jpg';

const onImgErr = (e: React.SyntheticEvent<HTMLImageElement>) => {
  if (!e.currentTarget.src.includes('Chhatradol')) {
    e.currentTarget.src = FALLBACK;
  }
};

function readingMinutes(text: string) {
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 200));
}

function formatDate(dateStr: string, lang: 'bn' | 'en') {
  try {
    const d = new Date(dateStr);
    return lang === 'bn'
      ? d.toLocaleDateString('bn-IN', { year: 'numeric', month: 'long', day: 'numeric' })
      : d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export interface EventPost {
  id: string;
  title: string;
  category: string;
  publishedDate: string;
  featuredImage: string;
  author?: string;
  slug?: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  share_snippet?: string;
  og_image?: string;
  tags?: string[];
}

// Default Fallback Posts list so single event & related posts always render cleanly
const DEFAULT_POSTS: EventPost[] = [
  {
    id: 'free-general-health-checkup',
    title: 'Free Health Check-up Camp Held in Narajole',
    category: 'Events',
    publishedDate: '2026-05-20',
    featuredImage: '/assets/images/service/post-15-mental-care-home.jpg',
    author: 'Admin',
    slug: 'free-general-health-checkup',
    content:
      'Our free health check-up camp benefitted over 120 villagers with doctor consultations, diagnostic checkups, and free medicines. Thank you to all healthcare volunteers and community donors.',
  },
  {
    id: 'regular-blood-donation-camp',
    title: 'Inspiration of the blood donation camp',
    category: 'Events',
    publishedDate: '2026-05-18',
    featuredImage: '/assets/images/service/post-33-raktokotha-camp.jpg',
    author: 'Sayan Samanta',
    slug: 'regular-blood-donation-camp',
    content:
      "We often come to you with requests to stand beside people in need. Most of the time, you have never let us down, and for that, we are truly grateful.\n\nAmong those who consider us their own and feel a sense of kinship with these spirited young volunteers, Subarna Patra Didi holds a special place.\n\nAs a nurse by profession, Didi dedicates her days to serving others. Year after year, she extends her support to our initiatives without hesitation. At our last blood donation camp, she responded to our request and came forward to donate blood herself.\n\n\"The person who lovingly bandages the wounds of countless people every day gave us the opportunity, for once, to care for her in return. After her donation, we gently placed a bandage on her arm with the same affection and care that she shows to others. It was our small gesture of gratitude and love.\"\n\nAs the summer months often bring a shortage of blood supplies, we urge everyone to come forward and donate blood.\n\nDonate Blood. Save Lives. Be Someone's Hero.",
  },
  {
    id: 'education-support-program',
    title: 'Study Materials Distributed to Students',
    category: 'Events',
    publishedDate: '2026-05-15',
    featuredImage: '/assets/images/service/post-34-students-book-support.jpg',
    author: 'Admin',
    slug: 'education-support-program',
    content:
      'Distributed study materials, books, and stationery to 100+ underprivileged students in Paschim Medinipur.',
  },
  {
    id: 'tree-plantation-drive',
    title: 'Tree Plantation Drive Completed in Paschim Medinipur',
    category: 'Events',
    publishedDate: '2026-05-10',
    featuredImage: '/assets/images/impacts/tree_plantations.jpg',
    author: 'Admin',
    slug: 'tree-plantation-drive',
    content:
      'Planted 150+ trees and committed to a cleaner, greener tomorrow in Paschim Medinipur.',
  },
  {
    id: 'winter-clothes-distribution',
    title: 'Winter Warmth & Clothing Distribution Drive',
    category: 'Events',
    publishedDate: '2026-05-04',
    featuredImage: '/assets/images/service/post-20-winter-clothes.jpg',
    author: 'Admin',
    slug: 'winter-clothes-distribution',
    content:
      'Distributed warm clothes and blankets to senior citizens and needy families in rural villages.',
  },
  {
    id: 'community-awareness-workshop',
    title: 'Community Awareness & Youth Guidance Workshop',
    category: 'Events',
    publishedDate: '2026-04-28',
    featuredImage: '/assets/images/service/post-35-stop-child-marriage.jpg',
    author: 'Admin',
    slug: 'community-awareness-workshop',
    content:
      'Organized community workshops promoting social awareness, health, and youth guidance.',
  },
];

// ─── Social share bar ────────────────────────────────────────────────
function ShareBar({ title, url }: { title: string; url: string }) {
  const e = encodeURIComponent;
  const copy = () => navigator.clipboard?.writeText(url).catch(() => {});
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${e(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on Facebook"
        className="flex min-h-[44px] items-center gap-2 rounded-full px-5 font-dmsans text-[12px] font-bold text-white transition-opacity hover:opacity-90"
        style={{ background: '#1877f2' }}
      >
        <FaFacebook className="h-3.5 w-3.5" />
        <span>Facebook</span>
      </a>
      <a
        href={`https://api.whatsapp.com/send?text=${e(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on WhatsApp"
        className="flex min-h-[44px] items-center gap-2 rounded-full px-5 font-dmsans text-[12px] font-bold text-white transition-opacity hover:opacity-90"
        style={{ background: '#25d366' }}
      >
        <FaWhatsapp className="h-3.5 w-3.5" />
        <span>WhatsApp</span>
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${e(title)}&url=${e(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on X / Twitter"
        className="flex min-h-[44px] items-center gap-2 rounded-full px-5 font-dmsans text-[12px] font-bold text-white transition-opacity hover:opacity-90"
        style={{ background: '#000' }}
      >
        <FaXTwitter className="h-3.5 w-3.5" />
        <span>X</span>
      </a>
      <button
        type="button"
        onClick={copy}
        title="Copy link"
        className="flex min-h-[44px] items-center gap-2 rounded-full border px-5 font-dmsans text-[12px] font-bold transition-colors hover:bg-[color:var(--c-brand)] hover:text-white hover:border-[color:var(--c-brand)]"
        style={{ borderColor: 'var(--c-rule)', color: 'var(--c-ink-2)' }}
      >
        <FaLink className="h-3 w-3" />
        <span>Copy Link</span>
      </button>
    </div>
  );
}

// ─── Related story card ──────────────────────────────────────────────
function RelatedCard({
  id,
  slug,
  title,
  featuredImage,
  category,
  publishedDate,
}: {
  id: string;
  slug?: string;
  title: string;
  featuredImage: string;
  category: string;
  publishedDate: string;
}) {
  const linkTarget = slug || id.replace(/^db-/, '');
  return (
    <Link to={`/events/${linkTarget}`} className="group flex items-start gap-3 transition-all">
      <div className="img-zoom h-16 w-20 flex-shrink-0 overflow-hidden rounded-[18px] bg-[#eef4e7]">
        <img
          src={featuredImage || FALLBACK}
          alt={title}
          className="h-full w-full object-cover"
          onError={onImgErr}
        />
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-dmmono text-[10px] font-medium uppercase tracking-[0.14em] text-site-red">
          {category || 'Events'}
        </span>
        <h4 className="mt-1 line-clamp-2 font-archivo text-[13px] font-bold leading-snug text-site-ink transition-colors group-hover:text-site-green">
          {title}
        </h4>
        <p className="mt-1 font-dmsans text-[11px] text-site-faint">{publishedDate}</p>
      </div>
    </Link>
  );
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { posts: dbPosts, loading } = usePosts();
  const { lang } = useT();
  const navigate = useNavigate();
  const bn = lang === 'bn';

  const allPosts = useMemo(() => {
    if (dbPosts && dbPosts.length > 0) {
      const dbTitles = new Set(dbPosts.map((p) => p.title.toLowerCase()));
      const extraDefaults = DEFAULT_POSTS.filter((p) => !dbTitles.has(p.title.toLowerCase()));
      return [...dbPosts, ...extraDefaults];
    }
    return DEFAULT_POSTS;
  }, [dbPosts]);

  const post = useMemo(() => {
    if (!id) return undefined;
    const cleanId = id.replace(/^db-/, '');
    return allPosts.find(
      (p) => p.slug === id || p.slug === cleanId || p.id === id || p.id === cleanId
    );
  }, [allPosts, id]);

  const pageUrl = useMemo(() => {
    const slugOrId = post?.slug || id?.replace(/^db-/, '') || id || '';
    return `https://www.chhatradol.org/events/${slugOrId}`;
  }, [post, id]);

  const seoTitle = useMemo(() => {
    if (!post) return 'Social Welfare Events & Campaigns | Chhatradol Social Welfare Organisation';
    return `${post.meta_title || post.title} | Chhatradol Social Welfare Organisation`;
  }, [post]);

  const seoDesc = useMemo(() => {
    if (!post) return 'Social welfare initiatives and events organised by Chhatradol Social Welfare Organisation.';
    return (
      post.meta_description ||
      post.share_snippet ||
      post.content.replace(/<[^>]*>/g, '').trim().slice(0, 160)
    );
  }, [post]);

  useSEO({
    title: seoTitle,
    description: seoDesc,
    canonical: pageUrl,
    ogImage: post?.og_image || post?.featuredImage,
    ogType: 'article',
    ogTitle: post?.meta_title || post?.title,
    ogDescription: seoDesc,
  });

  useEffect(() => {
    if (!post) return;
    injectEventSchema({
      name: post.title,
      startDate: post.publishedDate || new Date().toISOString(),
      description: seoDesc,
      image: post.featuredImage,
      url: pageUrl,
      location: 'Narajole, Paschim Medinipur, West Bengal',
    });

    return () => {
      removeEventSchema();
    };
  }, [post, pageUrl, seoDesc]);

  const related = useMemo(() => {
    if (!post) return [];
    const sameCat = allPosts.filter(
      (p) => p.category === post.category && p.id !== post.id && p.slug !== post.slug && p.id !== id && p.slug !== id
    );
    return sameCat.slice(0, 4);
  }, [allPosts, post, id]);

  const recentStories = useMemo(() => {
    if (!post) return [];
    const relatedIds = new Set(related.map((r) => r.id));
    const others = allPosts.filter(
      (p) => p.id !== post.id && p.slug !== post.slug && p.id !== id && p.slug !== id && !relatedIds.has(p.id)
    );
    return (others.length > 0 ? others : allPosts.filter((p) => p.id !== post.id)).slice(0, 4);
  }, [allPosts, post, id, related]);

  if (loading && !post) {
    return (
      <PageShell>
        <div className="mx-auto max-w-site space-y-4 px-5 py-32 sm:px-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-6 animate-pulse rounded-full"
              style={{ background: '#eef4e7', width: `${80 - i * 15}%` }}
            />
          ))}
        </div>
      </PageShell>
    );
  }

  if (!post) {
    return (
      <PageShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5">
          <p className="font-bengali text-[20px]" style={{ color: 'var(--c-ink-2)' }}>
            {bn ? 'পোস্টটি পাওয়া যায়নি।' : 'Post not found.'}
          </p>
          <button
            onClick={() => navigate('/events')}
            className="btn-green font-bengali text-[14px]"
          >
            {bn ? 'ফিরে যান' : 'Back to Events'}
          </button>
        </div>
      </PageShell>
    );
  }

  const mins = readingMinutes(post.content);
  const isHtml = post.content.trim().startsWith('<');
  const paragraphs = !isHtml ? post.content.split('\n').filter(Boolean) : [];

  return (
    <PageShell>
      {/* ── Green hero band: breadcrumb, category, title and meta row ── */}
      <section className="page-hero px-5 pb-14 pt-10 sm:px-8 md:pb-16 md:pt-12">
        <div className="mx-auto w-full max-w-site">

          {/* ── Icon-style breadcrumb ── */}
          <nav className="flex flex-wrap items-center gap-1.5">
            <Link
              to="/"
              className="flex min-h-[36px] items-center gap-1.5 rounded-full bg-white/10 px-4 font-dmsans text-[12px] font-medium text-white/85 transition-colors hover:text-site-yellow"
            >
              {/* Home icon */}
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-site-yellow">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h4a1 1 0 001-1v-3h2v3a1 1 0 001 1h4a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              <span>{bn ? 'হোম' : 'Home'}</span>
            </Link>
            {/* Chevron */}
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 flex-shrink-0 text-white/40">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <Link
              to="/events"
              className="font-dmsans text-[12px] font-medium text-white/75 transition-colors hover:text-site-yellow"
            >
              {bn ? 'অনুষ্ঠান' : 'Events'}
            </Link>
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 flex-shrink-0 text-white/40">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="font-dmsans text-[12px] font-bold text-site-yellow">
              {post.category}
            </span>
          </nav>

          {/* 1. Title */}
          <h1 className="h-display mt-6 max-w-4xl text-white">
            {post.title}
          </h1>

          {/* 2. Author & Meta row */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-dmsans text-[13px] text-white/65">
            {post.author && (
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-dmmono text-[12px] font-bold text-site-ink"
                  style={{ background: 'var(--yellow)' }}
                >
                  {post.author.charAt(0).toUpperCase()}
                </span>
                <span className="font-bold text-white">{post.author}</span>
              </div>
            )}
            <span>{formatDate(post.publishedDate, lang)}</span>
            <span>• {bn ? `${mins} মিনিট পড়া` : `${mins} min read`}</span>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-site px-5 py-12 sm:px-8 md:py-16">

          {/* ── Two-column grid: Article (8/12) + Sidebar (4/12) ── */}
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">

            {/* ══ MAIN ARTICLE ══ */}
            <article className="min-w-0 lg:col-span-8">

              {/* 4. Featured Image — inside article, always fully visible */}
              <figure className="mb-7">
                {/* Outer wrapper: dark bg + overflow hidden for rounded corners */}
                <div
                  className="relative w-full overflow-hidden rounded-panel"
                  style={{ background: 'var(--green-2)' }}
                >
                  {/* Blurred backdrop — fills letterbox areas with artistic blur */}
                  <img
                    src={post.featuredImage || FALLBACK}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ filter: 'blur(22px) brightness(0.30)', transform: 'scale(1.12)' }}
                    onError={onImgErr}
                  />
                  {/* Main image — object-contain so no cropping ever happens */}
                  <img
                    src={post.featuredImage || FALLBACK}
                    alt={post.title}
                    className="relative mx-auto block w-full object-contain"
                    style={{ maxHeight: '500px', minHeight: '180px' }}
                    onError={onImgErr}
                  />
                </div>
                <figcaption className="mono-label mt-3 block text-center">
                  {post.title}
                </figcaption>
              </figure>

              {/* 5. Share bar */}
              <div className="mb-8 border-b pb-8" style={{ borderColor: 'var(--c-rule)' }}>
                <ShareBar title={post.title} url={pageUrl} />
              </div>

              {/* 6. Article body */}
              {isHtml ? (
                <div
                  className="prose prose-base max-w-none font-dmsans leading-[1.9] text-site-soft"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              ) : (
                <div className="space-y-4 font-dmsans">
                  {paragraphs.map((para, i) => (
                    <p key={i} className="text-[15.5px] leading-[1.9] text-site-soft">
                      {para}
                    </p>
                  ))}
                </div>
              )}

              {/* 7. Tags */}
              {post.tags && post.tags.length > 0 && (
                <div
                  className="mt-8 flex flex-wrap gap-2 border-t pt-5"
                  style={{ borderColor: 'var(--c-rule)' }}
                >
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="chip-static"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 8. Share bar bottom */}
              <div className="mt-7 border-t pt-5" style={{ borderColor: 'var(--c-rule)' }}>
                <p className="eyebrow mb-4">
                  {bn ? 'শেয়ার করুন' : 'Share this post'}
                </p>
                <ShareBar title={post.title} url={pageUrl} />
              </div>

              {/* 10. NGO Action Conversion CTA (Green Background) */}
              <div className="green-card mt-10">
                <h4 className="h-card text-white">
                  {bn ? 'আপনি কীভাবে সাহায্য করতে পারেন?' : 'How You Can Support Us'}
                </h4>
                <p className="mt-3 font-dmsans text-[14.5px] leading-[1.8] text-white/70">
                  {bn
                    ? 'আমাদের রক্তদান শিবির, শিক্ষা কর্মসূচি ও অন্যান্য সমাজসেবামূলক কাজে আপনার সক্রিয় অংশগ্রহণ আমাদের আরও মানুষকে সেবা করতে সাহায্য করে।'
                    : 'Your support helps us reach more families in need through blood donation camps, education initiatives, and healthcare support.'}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    to="/donate"
                    className="btn-yellow text-[14px]"
                  >
                    <FaHeart className="h-3.5 w-3.5" />
                    <span>{bn ? 'দান করুন' : 'Donate'}</span>
                  </Link>
                  <Link
                    to="/volunteer"
                    className="btn-ghost-light text-[14px]"
                  >
                    <FaHandHoldingHeart className="h-3.5 w-3.5" />
                    <span>{bn ? 'স্বেচ্ছাসেবক হিসেবে যোগ দিন' : 'Volunteer With Us'}</span>
                  </Link>
                  <Link
                    to="/contact"
                    className="btn-ghost-light text-[14px]"
                  >
                    <FaEnvelope className="h-3.5 w-3.5" />
                    <span>{bn ? 'যোগাযোগ' : 'Contact Us'}</span>
                  </Link>
                </div>
              </div>

              {/* 11. Interactive Back Button */}
              <div className="mt-10 pt-2">
                <Link
                  to="/events"
                  className="chip group px-6 text-[13.5px] font-bold"
                >
                  <Icon.Arrow className="h-3 w-3 rotate-180 transition-transform duration-200 group-hover:-translate-x-1" />
                  <span>{bn ? 'সকল ইভেন্টে ফিরুন' : 'Back to all events'}</span>
                </Link>
              </div>
            </article>

            {/* ══ SIDEBAR ══ */}
            <aside className="lg:col-span-4">
              <div className="sticky top-[92px] space-y-6">

                {/* Related Stories */}
                {related.length > 0 && (
                  <div className="soft-card p-6">
                    <div
                      className="mb-5 flex items-center justify-between gap-3 border-b pb-4"
                      style={{ borderColor: 'var(--c-rule)' }}
                    >
                      <h3 className="font-archivo text-[17px] font-bold text-site-ink">
                        {bn ? 'সম্পর্কিত পোস্ট' : 'Related Stories'}
                      </h3>
                      <Link
                        to="/events"
                        className="shrink-0 rounded-full border border-site-line bg-site-cream px-4 py-2 font-dmsans text-[11px] font-bold text-site-green transition-colors hover:bg-site-yellow hover:text-site-ink"
                      >
                        {bn ? 'সব দেখুন' : 'View all'}
                      </Link>
                    </div>
                    <div className="space-y-4">
                      {related.map((r) => (
                        <RelatedCard
                          key={r.id}
                          id={r.id}
                          slug={r.slug}
                          title={r.title}
                          featuredImage={r.featuredImage}
                          category={r.category}
                          publishedDate={r.publishedDate}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* About org (in between Related Stories and Recent Stories) */}
                <div className="capsule-card">
                  <span className="mx-auto mb-4 flex h-[78px] w-[78px] items-center justify-center rounded-full bg-site-cream text-site-green">
                    <Icon.Heart className="h-7 w-7" />
                  </span>
                  <h4 className="font-archivo text-[17px] font-bold text-site-ink">
                    {bn ? 'ছাত্রদল' : 'Chhatradol SWO'}
                  </h4>
                  <p className="mt-3 font-dmsans text-[12.5px] leading-[1.7] text-site-muted">
                    {bn
                      ? 'শিক্ষা, স্বাস্থ্য ও মানবিক সেবায় প্রতিশ্রুতিবদ্ধ একটি রেজিস্টার্ড পাবলিক চ্যারিটেবল ট্রাস্ট।'
                      : 'A registered public charitable trust committed to education, health and humanitarian service.'}
                  </p>
                  <Link
                    to="/about"
                    className="btn-tertiary mt-5 gap-1.5"
                  >
                    <span>{bn ? 'আমাদের সম্পর্কে' : 'About us'}</span>
                    <Icon.Arrow className="h-3 w-3" />
                  </Link>
                </div>

                {/* Recent Stories */}
                {recentStories.length > 0 && (
                  <div className="soft-card p-6">
                    <div
                      className="mb-5 flex items-center justify-between gap-3 border-b pb-4"
                      style={{ borderColor: 'var(--c-rule)' }}
                    >
                      <h3 className="font-archivo text-[17px] font-bold text-site-ink">
                        {bn ? 'সাম্প্রতিক পোস্ট' : 'Recent Stories'}
                      </h3>
                      <Link
                        to="/events"
                        className="shrink-0 rounded-full border border-site-line bg-site-cream px-4 py-2 font-dmsans text-[11px] font-bold text-site-green transition-colors hover:bg-site-yellow hover:text-site-ink"
                      >
                        {bn ? 'সব দেখুন' : 'View all'}
                      </Link>
                    </div>
                    <div className="space-y-4">
                      {recentStories.map((r) => (
                        <RelatedCard
                          key={r.id}
                          id={r.id}
                          slug={r.slug}
                          title={r.title}
                          featuredImage={r.featuredImage}
                          category={r.category}
                          publishedDate={r.publishedDate}
                        />
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </aside>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
