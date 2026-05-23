import { useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FaFacebook, FaWhatsapp, FaXTwitter, FaLink } from 'react-icons/fa6';
import { usePosts } from '@/hooks/usePosts';
import { useT } from '@/i18n';
import { PageShell, SERIF_BN, Icon } from './_field-journal';

const FALLBACK = '/assets/images/chatrodol.jpg';
const onImgErr = (e: React.SyntheticEvent<HTMLImageElement>) => {
  if (e.currentTarget.src !== window.location.origin + FALLBACK) e.currentTarget.src = FALLBACK;
};

function readingMinutes(text: string) {
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 200));
}

function formatDate(dateStr: string, lang: 'bn' | 'en') {
  try {
    const d = new Date(dateStr);
    return lang === 'bn'
      ? d.toLocaleDateString('bn-IN', { year: 'numeric', month: 'long', day: 'numeric' })
      : d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ─── Social share bar ────────────────────────────────────────────────
function ShareBar({ title, url }: { title: string; url: string }) {
  const e = encodeURIComponent;
  const copy = () => navigator.clipboard?.writeText(url).catch(() => {});
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${e(url)}`}
        target="_blank" rel="noopener noreferrer"
        title="Share on Facebook"
        className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-opacity hover:opacity-80"
        style={{ background: '#1877f2' }}
      >
        <FaFacebook className="h-[17px] w-[17px]" />
      </a>
      <a
        href={`https://wa.me/?text=${e(title + ' ' + url)}`}
        target="_blank" rel="noopener noreferrer"
        title="Share on WhatsApp"
        className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-opacity hover:opacity-80"
        style={{ background: '#25d366' }}
      >
        <FaWhatsapp className="h-[17px] w-[17px]" />
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${e(title)}&url=${e(url)}`}
        target="_blank" rel="noopener noreferrer"
        title="Share on X / Twitter"
        className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-opacity hover:opacity-80"
        style={{ background: '#000' }}
      >
        <FaXTwitter className="h-[17px] w-[17px]" />
      </a>
      <button
        type="button" onClick={copy}
        title="Copy link"
        className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:bg-[color:var(--c-brand)] hover:text-white hover:border-[color:var(--c-brand)]"
        style={{ borderColor: 'var(--c-rule)', color: 'var(--c-ink-2)' }}
      >
        <FaLink className="h-[15px] w-[15px]" />
      </button>
    </div>
  );
}

// ─── Related story card ──────────────────────────────────────────────
function RelatedCard({ id, title, featuredImage, category, publishedDate }: {
  id: string; title: string; featuredImage: string; category: string; publishedDate: string;
}) {
  return (
    <Link to={`/events/${id}`} className="group flex gap-3">
      <div className="w-20 flex-shrink-0 overflow-hidden rounded-[3px]">
        <img
          src={featuredImage || FALLBACK} alt={title}
          className="aspect-square h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          onError={onImgErr}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--c-brand)' }}>{category}</div>
        <p className="mt-1 font-bengali text-[13.5px] leading-snug line-clamp-3 group-hover:text-[color:var(--c-brand)] transition-colors" style={{ color: 'var(--c-ink)' }}>
          {title}
        </p>
        <div className="mt-1 font-mono text-[10px]" style={{ color: 'var(--c-muted)' }}>{publishedDate}</div>
      </div>
    </Link>
  );
}

// ════════════════════════════════════════════════════════════════════
export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { posts, loading } = usePosts();
  const { lang } = useT();
  const navigate = useNavigate();
  const bn = lang === 'bn';

  const post = useMemo(() => posts.find((p) => p.id === id), [posts, id]);

  // Inject SEO meta tags into <head> while this post is mounted
  useEffect(() => {
    if (!post) return;
    const prev = document.title;
    document.title = post.meta_title || post.title;

    const setMeta = (name: string, prop: string, content: string) => {
      let el = document.head.querySelector(`meta[${name}="${prop}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.setAttribute(name, prop); document.head.appendChild(el); }
      el.setAttribute('content', content);
      return el;
    };

    const ogImage = post.og_image || post.featuredImage;
    const desc = post.meta_description || (post.content.replace(/<[^>]+>/g, '').trim().slice(0, 160));
    const shareDesc = post.share_snippet || desc;

    const metas = [
      setMeta('name', 'description', desc),
      setMeta('property', 'og:title', post.meta_title || post.title),
      setMeta('property', 'og:description', shareDesc),
      setMeta('property', 'og:image', ogImage),
      setMeta('property', 'og:type', 'article'),
    ];

    return () => {
      document.title = prev;
      metas.forEach((el) => el.removeAttribute('content'));
    };
  }, [post]);

  const related = useMemo(() => {
    if (!post) return [];
    return posts.filter((p) => p.id !== id && p.category === post.category).slice(0, 5);
  }, [posts, post, id]);

  if (loading && !post) {
    return (
      <PageShell>
        <div className="mx-auto max-w-[1320px] px-6 py-32 md:px-10 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 animate-pulse rounded" style={{ background: 'var(--c-rule)', width: `${80 - i * 15}%` }} />
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
          <button onClick={() => navigate('/events')} className="rounded-full px-6 py-3 font-bengali text-[14px] font-semibold text-white" style={{ background: 'var(--c-brand)' }}>
            {bn ? 'ফিরে যান' : 'Back to Events'}
          </button>
        </div>
      </PageShell>
    );
  }

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const mins = readingMinutes(post.content);
  const isHtml = post.content.trim().startsWith('<');
  const paragraphs = isHtml ? [] : post.content.split('\n').filter(Boolean);

  return (
    <PageShell>
      {/* Hero image */}
      <div className="relative h-[42vh] max-h-[460px] w-full overflow-hidden md:h-[50vh]">
        <img src={post.featuredImage || FALLBACK} alt={post.title} className="h-full w-full object-cover" onError={onImgErr} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(28,25,23,0.10) 0%,rgba(28,25,23,0.52) 100%)' }} />
      </div>

      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-10 md:px-10">

          {/* Breadcrumb */}
          <nav className="mb-6 flex flex-wrap items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: 'var(--c-muted)' }}>
            <Link to="/" className="hover:opacity-70 transition-opacity" style={{ color: 'var(--c-muted)' }}>{bn ? 'হোম' : 'Home'}</Link>
            <span>/</span>
            <Link to="/events" className="hover:opacity-70 transition-opacity" style={{ color: 'var(--c-muted)' }}>{bn ? 'অনুষ্ঠান' : 'Events'}</Link>
            <span>/</span>
            <span style={{ color: 'var(--c-brand)' }}>{post.category}</span>
          </nav>

          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">

            {/* ── Article ────────────────────────────────── */}
            <article className="lg:col-span-8">
              {/* Category chip */}
              <span className="inline-flex items-center rounded-full px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ background: 'rgba(194,65,12,0.08)', color: 'var(--c-brand)' }}>
                {post.category}
              </span>

              {/* Title */}
              <h1 className="mt-4 font-bengali text-[30px] leading-[1.13] md:text-[42px]" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>
                {post.title}
              </h1>

              {/* Meta */}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-b pb-5" style={{ borderColor: 'var(--c-rule)' }}>
                {post.author && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold text-white" style={{ background: 'var(--c-brand)' }}>
                      {post.author.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bengali text-[13.5px] font-medium" style={{ color: 'var(--c-ink)' }}>{post.author}</span>
                  </div>
                )}
                <div className="font-mono text-[11px]" style={{ color: 'var(--c-muted)' }}>
                  {formatDate(post.publishedDate, lang)}
                </div>
                <div className="font-mono text-[11px]" style={{ color: 'var(--c-muted)' }}>
                  {bn ? `${mins} মিনিট পড়া` : `${mins} min read`}
                </div>
              </div>

              {/* Share — top */}
              <div className="mt-5 pb-6 border-b" style={{ borderColor: 'var(--c-rule)' }}>
                <ShareBar title={post.title} url={pageUrl} />
              </div>

              {/* Body */}
              {isHtml ? (
                <div
                  className="prose prose-lg mt-8 max-w-none font-bengali"
                  style={{ color: 'var(--c-ink-2)' }}
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              ) : (
                <div className="mt-8 space-y-5">
                  {paragraphs.map((para, i) => (
                    <p key={i} className="font-bengali text-[16px] leading-[1.88]" style={{ color: 'var(--c-ink-2)' }}>
                      {para}
                    </p>
                  ))}
                </div>
              )}

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="mt-10 flex flex-wrap gap-2 border-t pt-6" style={{ borderColor: 'var(--c-rule)' }}>
                  {post.tags.map((tag) => (
                    <span key={tag} className="rounded-full px-3 py-1 font-bengali text-[12px]" style={{ background: 'var(--c-bg)', color: 'var(--c-ink-2)', border: '1px solid var(--c-rule)' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Share — bottom */}
              <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--c-rule)' }}>
                <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                  {bn ? 'শেয়ার করুন' : 'Share this post'}
                </p>
                <ShareBar title={post.title} url={pageUrl} />
              </div>

              {/* Back */}
              <div className="mt-10">
                <Link to="/events" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-opacity hover:opacity-60" style={{ color: 'var(--c-muted)' }}>
                  <Icon.Arrow className="h-3 w-3 rotate-180" />
                  {bn ? 'সকল পোস্টে ফিরুন' : 'Back to all posts'}
                </Link>
              </div>
            </article>

            {/* ── Sidebar ─────────────────────────────────── */}
            <aside className="lg:col-span-4">
              <div className="sticky top-8 space-y-8">

                {/* Related stories */}
                {related.length > 0 && (
                  <div className="rounded-[3px] border p-6" style={{ borderColor: 'var(--c-rule)', background: 'var(--c-bg)' }}>
                    <h3 className="mb-5 border-b pb-3 font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-ink)', borderColor: 'var(--c-rule)' }}>
                      {bn ? 'সম্পর্কিত পোস্ট' : 'Related Stories'}
                    </h3>
                    <div className="space-y-5">
                      {related.map((r) => (
                        <RelatedCard key={r.id} id={r.id} title={r.title} featuredImage={r.featuredImage} category={r.category} publishedDate={r.publishedDate} />
                      ))}
                    </div>
                  </div>
                )}

                {/* About org */}
                <div className="rounded-[3px] border p-6" style={{ borderColor: 'var(--c-rule)', background: 'var(--c-bg)' }}>
                  <p className="font-bengali text-[15px] font-semibold" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>
                    {bn ? 'নাড়াজোল ছাত্রদল' : 'Narajole Chhatradol'}
                  </p>
                  <p className="mt-2 font-bengali text-[13px] leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>
                    {bn
                      ? 'শিক্ষা, স্বাস্থ্য ও মানবিক সেবায় প্রতিশ্রুতিবদ্ধ একটি রেজিস্টার্ড পাবলিক চ্যারিটেবল ট্রাস্ট।'
                      : 'A registered public charitable trust committed to education, health and humanitarian service.'}
                  </p>
                  <Link to="/about" className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: 'var(--c-brand)' }}>
                    {bn ? 'আমাদের সম্পর্কে' : 'About us'} <Icon.Arrow className="h-3 w-3" />
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
