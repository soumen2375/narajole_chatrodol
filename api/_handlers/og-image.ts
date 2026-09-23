/**
 * /api/og-image?url=<encoded_image_url>
 *
 * Image proxy for Open Graph previews.
 * Fetches any image (e.g., from Supabase CDN) and re-serves it directly
 * from chhatradol.org so social crawlers (WhatsApp, Facebook, Telegram, etc.)
 * receive the image from a trusted, no-redirect HTTPS domain.
 *
 * WhatsApp requires the og:image to be served WITHOUT redirects.
 * Supabase storage sometimes redirects through its CDN, causing WhatsApp to
 * silently drop the image preview. This proxy eliminates that problem.
 */
import type { IncomingMessage, ServerResponse } from 'http';

const SITE_URL = 'https://www.chhatradol.org';
const FALLBACK_IMAGE_PATH = '/assets/images/og-default.jpg';

/** Allowed origin hosts — reject proxy abuse from random external URLs */
const ALLOWED_HOSTS = [
  'wzquszbmbpkbhyythdrj.supabase.co',
  'www.chhatradol.org',
  'chhatradol.org',
  'narajolechatradol.vercel.app',
];

function isAllowedUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const urlObj = new URL(
    req.url || '/',
    `http://${req.headers.host || 'localhost'}`,
  );
  const targetUrl = urlObj.searchParams.get('url') || '';

  // ── Validate target URL ──────────────────────────────────────────────────────
  if (!targetUrl || !isAllowedUrl(targetUrl)) {
    // Redirect to fallback instead of erroring so og:image still loads
    res.setHeader('Location', `${SITE_URL}${FALLBACK_IMAGE_PATH}`);
    res.statusCode = 302;
    res.end();
    return;
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Chhatradol-OGImageProxy/1.0 (+https://www.chhatradol.org)',
        Accept: 'image/jpeg,image/png,image/webp,image/*,*/*',
      },
      // 8 second timeout — WhatsApp gives up quickly
      signal: AbortSignal.timeout(8000),
    });

    if (!upstream.ok) {
      res.setHeader('Location', `${SITE_URL}${FALLBACK_IMAGE_PATH}`);
      res.statusCode = 302;
      res.end();
      return;
    }

    const contentType =
      upstream.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await upstream.arrayBuffer());

    // Serve directly from chhatradol.org — no redirect, correct Content-Type
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.statusCode = 200;
    res.end(buffer);
  } catch {
    // On any error (timeout, network, etc.) redirect to fallback
    res.setHeader('Location', `${SITE_URL}${FALLBACK_IMAGE_PATH}`);
    res.statusCode = 302;
    res.end();
  }
}
