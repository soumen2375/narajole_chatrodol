import { useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FaFacebook, FaWhatsapp, FaXTwitter, FaLink } from 'react-icons/fa6';
import { usePosts } from '@/hooks/usePosts';
import { useT } from '@/i18n';
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
        className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
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
        className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
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
        className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        style={{ background: '#000' }}
      >
        <FaXTwitter className="h-3.5 w-3.5" />
        <span>X</span>
      </a>
      <button
        type="button"
        onClick={copy}
        title="Copy link"
        className="flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold shadow-sm transition-colors hover:bg-[color:var(--c-brand)] hover:text-white hover:border-[color:var(--c-brand)]"
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
      <div className="h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200/60">
        <img
          src={featuredImage || FALLBACK}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={onImgErr}
        />
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-700">
          {category || 'Events'}
        </span>
        <h4 className="mt-1 font-sans text-xs font-bold leading-snug text-slate-900 line-clamp-2 transition-colors group-hover:text-[#c2410c]">
          {title}
        </h4>
        <p className="mt-1 font-sans text-[11px] text-slate-400">{publishedDate}</p>
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
    return `https://narajolechatradol.vercel.app/events/${slugOrId}`;
  }, [post, id]);

  useEffect(() => {
    if (!post) return;
    const pageTitle = `${post.meta_title || post.title} | Narajole Chhatradol NGO`;
    document.title = pageTitle;
    const metaDesc =
      post.meta_description ||
      post.share_snippet ||
      post.content.replace(/<[^>]*>/g, '').slice(0, 160);
    const metaImg = post.og_image || post.featuredImage;
    const setMeta = (attrName: string, attrVal: string, contentVal: string) => {
      let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', contentVal);
    };
    setMeta('name', 'description', metaDesc);
    setMeta('property', 'og:title', post.meta_title || post.title);
    setMeta('property', 'og:description', metaDesc);
    setMeta('property', 'og:image', metaImg);
    setMeta('property', 'og:url', pageUrl);
  }, [post, pageUrl]);

  const related = useMemo(() => {
    if (!post) return [];
    const others = allPosts.filter(
      (p) => p.id !== post.id && p.slug !== post.slug && p.id !== id && p.slug !== id
    );
    const sameCat = others.filter((p) => p.category === post.category);
    const diffCat = others.filter((p) => p.category !== post.category);
    return [...sameCat, ...diffCat].slice(0, 4);
  }, [allPosts, post, id]);

  if (loading && !post) {
    return (
      <PageShell>
        <div className="mx-auto max-w-[1320px] px-6 py-32 md:px-10 space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-6 animate-pulse rounded"
              style={{ background: 'var(--c-rule)', width: `${80 - i * 15}%` }}
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
            className="rounded-full px-6 py-3 font-bengali text-[14px] font-semibold text-white"
            style={{ background: 'var(--c-brand)' }}
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
      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6 md:px-10 md:py-12">

          {/* ── Icon-style breadcrumb ── */}
          <nav className="mb-5 flex items-center gap-1.5">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-[12px] font-medium transition-colors hover:bg-orange-50"
              style={{ color: 'var(--c-ink-2)', background: 'rgba(194,65,12,0.06)' }}
            >
              {/* Home icon */}
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" style={{ color: 'var(--c-brand)' }}>
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h4a1 1 0 001-1v-3h2v3a1 1 0 001 1h4a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              <span>{bn ? 'হোম' : 'Home'}</span>
            </Link>
            {/* Chevron */}
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--c-muted)' }}>
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <Link
              to="/events"
              className="font-sans text-[12px] font-medium transition-colors hover:opacity-70"
              style={{ color: 'var(--c-ink-2)' }}
            >
              {bn ? 'অনুষ্ঠান' : 'Events'}
            </Link>
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--c-muted)' }}>
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="font-sans text-[12px] font-semibold" style={{ color: 'var(--c-brand)' }}>
              {post.category}
            </span>
          </nav>

          {/* ── Two-column grid: Article (8/12) + Sidebar (4/12) ── */}
          {/* Title and Related Stories header are both the first element in their column → same height */}
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">

            {/* ══ MAIN ARTICLE ══ */}
            <article className="lg:col-span-8 min-w-0">

              {/* 1. Title — first element so it aligns with Related Stories header */}
              <h1 className="font-serif text-[24px] font-extrabold leading-tight text-slate-900 sm:text-[30px] md:text-[36px]">
                {post.title}
              </h1>

              {/* 2. Author & Meta row */}
              <div
                className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-4 text-xs text-slate-500"
                style={{ borderColor: 'var(--c-rule)' }}
              >
                {post.author && (
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold text-white shadow-sm"
                      style={{ background: 'var(--c-brand)' }}
                    >
                      {post.author.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-700">{post.author}</span>
                  </div>
                )}
                <span>{formatDate(post.publishedDate, lang)}</span>
                <span>• {bn ? `${mins} মিনিট পড়া` : `${mins} min read`}</span>
              </div>

              {/* 4. Featured Image — inside article, always fully visible */}
              <figure className="my-5">
                {/* Outer wrapper: dark bg + overflow hidden for rounded corners */}
                <div
                  className="relative w-full overflow-hidden rounded-xl border border-slate-200/70 shadow-md"
                  style={{ background: '#0f0f0f' }}
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
                <figcaption className="mt-1.5 text-center font-sans text-[10.5px] italic text-slate-400">
                  {post.title}
                </figcaption>
              </figure>

              {/* 5. Share bar */}
              <div className="mb-5 pb-5 border-b" style={{ borderColor: 'var(--c-rule)' }}>
                <ShareBar title={post.title} url={pageUrl} />
              </div>

              {/* 6. Article body */}
              {isHtml ? (
                <div
                  className="prose prose-base max-w-none font-sans text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              ) : (
                <div className="space-y-4 font-sans">
                  {paragraphs.map((para, i) => (
                    <p key={i} className="text-[15px] leading-[1.9] text-slate-700">
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
                      className="rounded-full px-3 py-1 font-sans text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 8. Share bar bottom */}
              <div className="mt-7 border-t pt-5" style={{ borderColor: 'var(--c-rule)' }}>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                  {bn ? 'শেয়ার করুন' : 'Share this post'}
                </p>
                <ShareBar title={post.title} url={pageUrl} />
              </div>

              {/* 9. Feedback banner */}
              <div className="mt-7 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-orange-200/80 bg-orange-50/50 shadow-sm">
                <div>
                  <h4 className="font-serif text-base font-bold text-slate-900">
                    {bn ? 'অনুষ্ঠানে অংশ নিয়েছিলেন?' : 'Attended this Event?'}
                  </h4>
                  <p className="mt-1 font-sans text-xs text-slate-600">
                    {bn
                      ? 'অনুষ্ঠানটি কেমন লাগলো জানাতে আপনার মূল্যবান মতামত ও পরামর্শ দিন।'
                      : 'Let us know how it went. Share your valuable suggestions and review.'}
                  </p>
                </div>
                <Link
                  to={`/events/${post.id}/feedback`}
                  className="shrink-0 rounded-full px-6 py-2.5 font-sans text-xs font-bold text-white shadow-md transition-all hover:opacity-90"
                  style={{ background: 'var(--c-brand)' }}
                >
                  {bn ? 'মতামত দিন' : 'Give Feedback'}
                </Link>
              </div>

              {/* 10. Back link */}
              <div className="mt-8">
                <Link
                  to="/events"
                  className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-[#c2410c] transition-colors"
                >
                  <Icon.Arrow className="h-3 w-3 rotate-180" />
                  {bn ? 'সকল পোস্টে ফিরুন' : 'Back to all events'}
                </Link>
              </div>
            </article>

            {/* ══ SIDEBAR ══ */}
            <aside className="lg:col-span-4">
              <div className="sticky top-24 space-y-6">

                {/* Related Stories */}
                {related.length > 0 && (
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 shadow-sm">
                    <div
                      className="mb-4 flex items-center justify-between border-b pb-3"
                      style={{ borderColor: 'var(--c-rule)' }}
                    >
                      <h3 className="font-serif text-base font-bold text-slate-900">
                        {bn ? 'সম্পর্কিত পোস্ট' : 'Related Stories'}
                      </h3>
                      <Link
                        to="/events"
                        className="rounded-full bg-amber-100/80 px-3 py-1 font-sans text-[11px] font-bold text-amber-800 border border-amber-300/60 hover:bg-amber-200/80 transition-colors"
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

                {/* About org */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 shadow-sm text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-[#c2410c] mb-3">
                    <Icon.Heart className="h-6 w-6" />
                  </div>
                  <h4 className="font-serif text-base font-bold text-slate-900">
                    {bn ? 'ছাত্রদল' : 'Chhatradol SWO'}
                  </h4>
                  <p className="mt-2 font-sans text-xs leading-relaxed text-slate-600">
                    {bn
                      ? 'শিক্ষা, স্বাস্থ্য ও মানবিক সেবায় প্রতিশ্রুতিবদ্ধ একটি রেজিস্টার্ড পাবলিক চ্যারিটেবল ট্রাস্ট।'
                      : 'A registered public charitable trust committed to education, health and humanitarian service.'}
                  </p>
                  <Link
                    to="/about"
                    className="mt-4 inline-flex items-center gap-1.5 font-sans text-xs font-bold text-[#c2410c] hover:underline"
                  >
                    <span>{bn ? 'আমাদের সম্পর্কে' : 'About us'}</span>
                    <Icon.Arrow className="h-3 w-3" />
                  </Link>
                </div>

              </div>
            </aside>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
