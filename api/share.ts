import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wzquszbmbpkbhyythdrj.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cXVzemJtYnBrYmh5eXRoZHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzNjQyNTIsImV4cCI6MjA1Nzk0MDI1Mn0.39e9pB1_WcFn1c1V_jP6P6_sQ0K-17LpZ-V666J';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Transforms a Supabase Storage public URL to use Supabase's image
 * rendering endpoint at 1200×630 (landscape) for large WhatsApp / Facebook
 * rich-link card previews.
 *
 * Original:  …/storage/v1/object/public/bucket/path.jpg
 * Rendered:  …/storage/v1/render/image/public/bucket/path.jpg?width=1200&height=630&resize=cover&format=webp
 *
 * If the URL is not a Supabase Storage URL the original is returned unchanged.
 */
function makeOgImage(url: string): string {
  if (!url) return url;
  try {
    // Only transform Supabase storage URLs
    if (url.includes('supabase.co/storage/v1/object/public/')) {
      const transformed = url.replace(
        '/storage/v1/object/public/',
        '/storage/v1/render/image/public/'
      );
      const sep = transformed.includes('?') ? '&' : '?';
      return `${transformed}${sep}width=1200&height=630&resize=cover&format=webp`;
    }
    // For non-Supabase images, return as-is (they're already served externally)
    return url;
  } catch {
    return url;
  }
}

export default async function handler(req: IncomingMessage & { query?: Record<string, string> }, res: ServerResponse) {
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const rawParam = urlObj.searchParams.get('slug') || '';
  const cleanParam = rawParam.replace(/^db-/, '');

  let post: any = null;

  if (cleanParam) {
    const { data: bySlug } = await supabase
      .from('cswo_posts')
      .select('*')
      .eq('slug', cleanParam)
      .maybeSingle();

    if (bySlug) {
      post = bySlug;
    } else {
      const { data: byId } = await supabase
        .from('cswo_posts')
        .select('*')
        .eq('id', cleanParam)
        .maybeSingle();
      post = byId;
    }
  }

  const siteName = 'Chhatradol Social Welfare Organisation';
  const siteUrl = 'https://www.chhatradol.org';

  const title = post?.og_title || post?.meta_title || post?.title || 'Chhatradol Social Welfare Organisation | NGO in West Bengal';
  const description =
    post?.share_snippet ||
    post?.meta_description ||
    (post?.content ? post.content.replace(/<[^>]*>/g, '').slice(0, 160) : '') ||
    'Chhatrodol Social Welfare Organization — a public charitable trust working for education, health, environment and relief of the poor in West Bengal.';

  // Resolve raw image URL
  let rawImage = post?.og_image || post?.featured_image || `${siteUrl}/assets/images/Chhatradol.jpg`;
  if (rawImage.startsWith('/')) {
    rawImage = `${siteUrl}${rawImage}`;
  }

  // Transform to 1200×630 landscape for large WhatsApp / Facebook card
  const image = makeOgImage(rawImage);

  const slug = post?.slug || cleanParam;
  // Support both /events/ and /posts/ paths
  const canonicalUrl = post
    ? `${siteUrl}/events/${slug}`
    : `${siteUrl}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>

  <!-- Primary Meta Tags -->
  <meta name="title" content="${escapeHtml(title)}">
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">

  <!-- Open Graph / Facebook / WhatsApp (1200×630 landscape = large card) -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${escapeHtml(siteName)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:secure_url" content="${escapeHtml(image)}">
  <meta property="og:image:type" content="image/webp">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="en_IN">

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${escapeHtml(canonicalUrl)}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">

  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalUrl)}">
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" width="1200" height="630" />
  <script>window.location.href = "${escapeHtml(canonicalUrl)}";</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.statusCode = 200;
  res.end(html);
}

function escapeHtml(str: string) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


