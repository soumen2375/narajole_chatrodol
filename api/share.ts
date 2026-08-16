import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wzquszbmbpkbhyythdrj.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cXVzemJtYnBrYmh5eXRoZHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzNjQyNTIsImV4cCI6MjA1Nzk0MDI1Mn0.39e9pB1_WcFn1c1V_jP6P6_sQ0K-17LpZ-V666J';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SITE_NAME = 'Chhatradol Social Welfare Organisation';
const SITE_URL = 'https://www.chhatradol.org';

/**
 * Default fallback OG image (served from our own domain, < 200KB, 1200×630 JPEG).
 * Used when no post image is available.
 */
const FALLBACK_IMAGE = `${SITE_URL}/assets/images/og-default.jpg`;

/** Static fallback posts dictionary for legacy/preset routes */
const FALLBACK_POSTS: Record<string, { title: string; image: string; content: string }> = {
  'regular-blood-donation-camp': {
    title: 'Inspiration of the blood donation camp',
    image: '/assets/images/service/post-33-raktokotha-camp.jpg',
    content: 'We often come to you with requests to stand beside people in need. Most of the time, you have never let us down, and for that, we are truly grateful.',
  },
  'inspiration-of-the-blood-donation-camp': {
    title: 'Inspiration of the blood donation camp',
    image: '/assets/images/service/post-33-raktokotha-camp.jpg',
    content: 'We often come to you with requests to stand beside people in need. Most of the time, you have never let us down, and for that, we are truly grateful.',
  },
  'free-general-health-checkup': {
    title: 'Free Health Check-up Camp Held in Narajole',
    image: '/assets/images/service/post-15-mental-care-home.jpg',
    content: 'Our free health check-up camp benefitted over 120 villagers with doctor consultations, diagnostic checkups, and free medicines.',
  },
  'education-support-program': {
    title: 'Study Materials Distributed to Students',
    image: '/assets/images/service/post-34-students-book-support.jpg',
    content: 'Distributed study materials, books, and stationery to 100+ underprivileged students in Paschim Medinipur.',
  },
  'world-blood-donor-day-2026': {
    title: 'World Blood Donor Day 2026',
    image: '/assets/images/service/post-33-raktokotha-camp.jpg',
    content: 'Join Chhatradol Social Welfare Organisation in celebrating World Blood Donor Day. Donate blood, save lives, and be a hero for someone in need.',
  },
};

/**
 * Resolve any image value to an absolute HTTPS URL,
 * then wrap Supabase CDN URLs in the /api/og-image proxy
 * so WhatsApp receives the image directly from chhatradol.org
 * without any intermediate redirects.
 *
 * NOTE: Do NOT HTML-escape the returned URL — it is used as-is in
 * the content="" attribute of <meta> tags and must remain a raw URL.
 */
function resolveOgImage(raw: string | null | undefined): string {
  const v = (raw || '').trim();
  if (!v) return FALLBACK_IMAGE;

  let absolute: string;
  if (v.startsWith('https://') || v.startsWith('http://')) {
    absolute = v;
  } else if (v.startsWith('/')) {
    absolute = `${SITE_URL}${v}`;
  } else {
    absolute = `${SITE_URL}/${v}`;
  }

  // If the image lives on chhatradol.org already, serve directly
  if (absolute.startsWith(SITE_URL)) return absolute;

  // For any external image (e.g., Supabase CDN) route through the proxy so
  // WhatsApp fetches it from chhatradol.org with no redirects
  return `${SITE_URL}/api/og-image?url=${encodeURIComponent(absolute)}`;
}

/** Escape text for safe embedding in HTML attributes / text nodes. */
function esc(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string> },
  res: ServerResponse,
) {
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const rawParam = urlObj.searchParams.get('slug') || '';
  const cleanParam = rawParam.replace(/^db-/, '');

  let post: any = null;

  if (cleanParam) {
    // 1. Try fetching by slug from Supabase
    const { data: bySlug } = await supabase
      .from('cswo_posts')
      .select('id,title,slug,content,featured_image,og_image,og_title,meta_title,meta_description,share_snippet')
      .eq('slug', cleanParam)
      .maybeSingle();

    if (bySlug) {
      post = bySlug;
    } else {
      // 2. Try fetching by id
      const { data: byId } = await supabase
        .from('cswo_posts')
        .select('id,title,slug,content,featured_image,og_image,og_title,meta_title,meta_description,share_snippet')
        .eq('id', cleanParam)
        .maybeSingle();
      post = byId;
    }

    // 3. Fall back to static dictionary for hardcoded/legacy slugs
    if (!post) {
      const staticMatch = FALLBACK_POSTS[cleanParam] ?? FALLBACK_POSTS[cleanParam.toLowerCase()];
      if (staticMatch) {
        post = {
          title: staticMatch.title,
          featured_image: staticMatch.image,
          content: staticMatch.content,
          slug: cleanParam,
        };
      }
    }

    // 4. For DB posts that exist but have no featured_image, use slug-matched
    //    static fallback image if available (better than generic og-default.jpg)
    if (post && !post.og_image && !post.featured_image) {
      const staticMatch = FALLBACK_POSTS[cleanParam] ?? FALLBACK_POSTS[cleanParam.toLowerCase()];
      if (staticMatch) {
        post.featured_image = staticMatch.image;
      }
    }
  }

  // ── Text fields (HTML-escaped) ────────────────────────────────────────────────
  const title = esc(
    post?.og_title || post?.meta_title || post?.title ||
    'Chhatradol Social Welfare Organisation | NGO in West Bengal',
  );
  const description = esc(
    post?.share_snippet ||
    post?.meta_description ||
    (post?.content ? post.content.replace(/<[^>]*>/g, '').trim().slice(0, 160) : '') ||
    'Chhatradol Social Welfare Organization — a public charitable trust working for education, health, environment and relief of the poor in West Bengal.',
  );

  // ── Image URL — routed through /api/og-image proxy for WhatsApp compatibility
  const imageUrl = resolveOgImage(post?.og_image || post?.featured_image);

  // ── Canonical URL ─────────────────────────────────────────────────────────────
  const slug = post?.slug || cleanParam;
  const canonical = post ? `${SITE_URL}/events/${slug}` : SITE_URL;

  // ── JSON-LD Structured Data ──────────────────────────────────────────────────
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Event',
        'name': post?.title || title,
        'description': description,
        'url': canonical,
        'image': imageUrl,
        'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
        'eventStatus': 'https://schema.org/EventScheduled',
        'organizer': {
          '@type': 'Organization',
          'name': SITE_NAME,
          'url': SITE_URL
        },
        'location': {
          '@type': 'Place',
          'name': 'Narajole, Paschim Medinipur',
          'address': {
            '@type': 'PostalAddress',
            'addressRegion': 'West Bengal',
            'addressCountry': 'IN'
          }
        }
      },
      {
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Home',
            'item': SITE_URL
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': 'Events',
            'item': `${SITE_URL}/events`
          },
          {
            '@type': 'ListItem',
            'position': 3,
            'name': post?.title || title,
            'item': canonical
          }
        ]
      }
    ]
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>

  <!-- Primary Meta Tags -->
  <meta name="title" content="${title}">
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonical}">

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${esc(SITE_NAME)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:alt" content="${title}">

  <!-- Twitter / X Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${canonical}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:image:alt" content="${title}">

  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  ${JSON.stringify(jsonLd, null, 2)}
  </script>
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <img src="${imageUrl}" alt="${title}">
  <a href="${canonical}">${canonical}</a>
</body>
</html>`;

  // No caching — crawlers must always get fresh OG metadata
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.statusCode = 200;
  res.end(html);
}
