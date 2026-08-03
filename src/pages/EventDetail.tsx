import { useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FaFacebook, FaWhatsapp, FaXTwitter, FaLink } from 'react-icons/fa6';
import { usePosts } from '@/hooks/usePosts';
import { useT } from '@/i18n';
import { PageShell, Icon } from './_field-journal';

const FALLBACK = '/assets/images/Chhatradol.jpg';

const onImgErr = (e: React.SyntheticEvent<HTMLImageElement>) => {
  if (e.currentTarget.src !== window.location.origin + FALLBACK) {
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
      'We often come to you with requests to stand beside people in need. Most of the time, you have never let us down, and for that, we are truly grateful.\n\nAmong those who consider us their own and feel a sense of kinship with these spirited young volunteers, Subarna Patra Didi holds a special place.\n\nAs a nurse by profession, Didi dedicates her days to serving others. Year after year, she extends her support to our initiatives without hesitation. At our last blood donation camp, she responded to our request and came forward to donate blood herself.\n\n"The person who lovingly bandages the wounds of countless people every day gave us the opportunity, for once, to care for her in return. After her donation, we gently placed a bandage on her arm with the same affection and care that she shows to others. It was our small gesture of gratitude and love."\n\nAs the summer months often bring a shortage of blood supplies, we urge everyone to come forward and donate blood.\n\nDonate Blood. Save Lives. Be Someone\'s Hero.',
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
    <div className="flex flex-wrap items-center gap-2.5">
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${e(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on Facebook"
        className="flex h-9 items-center gap-2 rounded-full px-3.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        style={{ background: '#1877f2' }}
      >
        <FaFacebook className="h-4 w-4" />
        <span>Facebook</span>
      </a>
      <a
        href={`https://api.whatsapp.com/send?text=${e(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on WhatsApp"
        className="flex h-9 items-center gap-2 rounded-full px-3.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        style={{ background: '#25d366' }}
      >
        <FaWhatsapp className="h-4 w-4" />
        <span>WhatsApp</span>
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${e(title)}&url=${e(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on X / Twitter"
        className="flex h-9 items-center gap-2 rounded-full px-3.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        style={{ background: '#000' }}
      >
        <FaXTwitter className="h-4 w-4" />
        <span>X (Twitter)</span>
      </a>
      <button
        type="button"
        onClick={copy}
        title="Copy link"
        className="flex h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold shadow-sm transition-colors hover:bg-[color:var(--c-brand)] hover:text-white hover:border-[color:var(--c-brand)]"
        style={{ borderColor: 'var(--c-rule)', color: 'var(--c-ink-2)' }}
      >
        <FaLink className="h-3.5 w-3.5" />
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
        <p className="mt-1 font-sans text-[11px] text-slate-400">
          {publishedDate}
        </p>
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

  // Merge DB posts with DEFAULT_POSTS to ensure non-empty list
  const allPosts = useMemo(() => {
    if (dbPosts && dbPosts.length > 0) {
      const dbTitles = new Set(dbPosts.map((p) => p.title.toLowerCase()));
      const extraDefaults = DEFAULT_POSTS.filter((p) => !dbTitles.has(p.title.toLowerCase()));
      return [...dbPosts, ...extraDefaults];
    }
    return DEFAULT_POSTS;
  }, [dbPosts]);

  // Find target post by slug or id
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

  // Dynamic DOM Meta Tags & Title sync
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

  // Filter related stories (strictly excluding current post)
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
      {/* Hero Banner image */}
      <div className="relative h-[42vh] max-h-[460px] w-full overflow-hidden md:h-[50vh]">
        <img
          src={post.featuredImage || FALLBACK}
          alt={post.title}
          className="h-full w-full object-cover"
          onError={onImgErr}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg,rgba(28,25,23,0.10) 0%,rgba(28,25,23,0.52) 100%)',
          }}
        />
      </div>

      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-10 md:px-10">

          {/* Breadcrumb Navigation */}
          <nav
            className="mb-6 flex flex-wrap items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--c-muted)' }}
          >
            <Link
              to="/"
              className="hover:opacity-70 transition-opacity"
              style={{ color: 'var(--c-muted)' }}
            >
              {bn ? 'হোম' : 'Home'}
            </Link>
            <span>/</span>
            <Link
              to="/events"
              className="hover:opacity-70 transition-opacity"
              style={{ color: 'var(--c-muted)' }}
            >
              {bn ? 'অনুষ্ঠান' : 'Events'}
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--c-brand)' }}>{post.category}</span>
          </nav>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">

            {/* ── Main Article Content ────────────────────────────────── */}
            <article className="lg:col-span-8">
              {/* Category tag */}
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex items-center rounded-full px-3.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: 'rgba(194,65,12,0.1)', color: 'var(--c-brand)' }}
                >
                  {post.category}
                </span>
              </div>

              {/* Title */}
              <h1
                className="mt-4 font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight text-slate-900"
              >
                {post.title}
              </h1>

              {/* Author & Meta details */}
              <div
                className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-b pb-5"
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
                    <span
                      className="font-sans text-sm font-bold text-slate-800"
                    >
                      {post.author}
                    </span>
                  </div>
                )}
                <div className="font-sans text-xs text-slate-500">
                  {formatDate(post.publishedDate, lang)}
                </div>
                <div className="font-sans text-xs text-slate-500">
                  • {bn ? `${mins} মিনিট পড়া` : `${mins} min read`}
                </div>
              </div>

              {/* Share Bar Top */}
              <div className="mt-5 pb-6 border-b" style={{ borderColor: 'var(--c-rule)' }}>
                <ShareBar title={post.title} url={pageUrl} />
              </div>

              {/* Article Body */}
              {isHtml ? (
                <div
                  className="prose prose-lg mt-8 max-w-none font-sans text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              ) : (
                <div className="mt-8 space-y-5 font-sans text-slate-700">
                  {paragraphs.map((para, i) => (
                    <p key={i} className="text-base sm:text-lg leading-relaxed text-slate-700">
                      {para}
                    </p>
                  ))}
                </div>
              )}

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div
                  className="mt-10 flex flex-wrap gap-2 border-t pt-6"
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

              {/* Share Bar Bottom */}
              <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--c-rule)' }}>
                <p
                  className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-slate-400"
                >
                  {bn ? 'শেয়ার করুন' : 'Share this post'}
                </p>
                <ShareBar title={post.title} url={pageUrl} />
              </div>

              {/* Feedback Banner */}
              <div
                className="mt-8 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-orange-200/80 bg-orange-50/50 shadow-sm"
              >
                <div>
                  <h4 className="font-serif text-base font-bold text-slate-900">
                    {bn ? 'অনুষ্ঠানে অংশ নিয়েছিলেন?' : 'Attended this Event?'}
                  </h4>
                  <p className="mt-1 font-sans text-xs text-slate-600">
                    {bn
                      ? 'অনুষ্ঠানটি কেমন লাগলো জানাতে আপনার মূল্যবান মতামত ও পরামর্শ দিন।'
                      : 'Let us know how it went. Share your valuable suggestions and review.'}
                  </p>
                </div>
                <Link
                  to={`/events/${post.id}/feedback`}
                  className="shrink-0 rounded-full px-6 py-2.5 font-sans text-xs font-bold text-white shadow-md transition-all hover:bg-orange-700"
                  style={{ background: 'var(--c-brand)' }}
                >
                  {bn ? 'মতামত দিন' : 'Give Feedback'}
                </Link>
              </div>

              {/* Back Link */}
              <div className="mt-10">
                <Link
                  to="/events"
                  className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-[#c2410c] transition-colors"
                >
                  <Icon.Arrow className="h-3 w-3 rotate-180" />
                  {bn ? 'সকল পোস্টে ফিরুন' : 'Back to all events'}
                </Link>
              </div>
            </article>

            {/* ── Sidebar ─────────────────────────────────── */}
            <aside className="lg:col-span-4">
              <div className="sticky top-24 space-y-8">

                {/* Related stories */}
                {related.length > 0 && (
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-6 shadow-sm">
                    <div
                      className="mb-5 flex items-center justify-between border-b pb-3"
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

                {/* About org card */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-6 shadow-sm text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-[#c2410c] mb-3">
                    <Icon.Heart className="h-6 w-6" />
                  </div>
                  <h4 className="font-serif text-lg font-bold text-slate-900">
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
