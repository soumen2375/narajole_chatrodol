import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wzquszbmbpkbhyythdrj.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cXVzemJtYnBrYmh5eXRoZHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzNjQyNTIsImV4cCI6MjA1Nzk0MDI1Mn0.39e9pB1_WcFn1c1V_jP6P6_sQ0K-17LpZ-V666J';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const SITE_URL = 'https://www.chhatradol.org';

interface StaticRoute {
  path: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
}

const STATIC_ROUTES: StaticRoute[] = [
  { path: '', changefreq: 'daily', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.8' },
  { path: '/programs', changefreq: 'weekly', priority: '0.9' },
  { path: '/events', changefreq: 'daily', priority: '0.9' },
  { path: '/gallery', changefreq: 'weekly', priority: '0.8' },
  { path: '/impacts', changefreq: 'monthly', priority: '0.8' },
  { path: '/volunteer', changefreq: 'weekly', priority: '0.9' },
  { path: '/donate', changefreq: 'weekly', priority: '0.9' },
  { path: '/blood-request', changefreq: 'daily', priority: '0.9' },
  { path: '/organise-blood-camp', changefreq: 'monthly', priority: '0.8' },
  { path: '/contact', changefreq: 'monthly', priority: '0.7' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/refunds', changefreq: 'yearly', priority: '0.3' },
  { path: '/shipping', changefreq: 'yearly', priority: '0.3' },
];

/** Hardcoded/default event fallback slugs if database has not populated yet */
const FALLBACK_EVENT_SLUGS = [
  'regular-blood-donation-camp',
  'free-general-health-checkup',
  'education-support-program',
  'world-blood-donor-day-2026',
];

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch dynamic posts/events from Supabase
    const { data: posts } = await supabase
      .from('cswo_posts')
      .select('slug, id, updated_at, published_date, status')
      .eq('status', 'published')
      .order('published_date', { ascending: false });

    const eventUrls: { loc: string; lastmod: string; priority: string; changefreq: string }[] = [];
    const seenSlugs = new Set<string>();

    if (posts && posts.length > 0) {
      for (const p of posts) {
        const slug = p.slug || p.id;
        if (!slug || seenSlugs.has(slug)) continue;
        seenSlugs.add(slug);

        const lastmod = p.updated_at
          ? new Date(p.updated_at).toISOString().split('T')[0]
          : p.published_date
          ? new Date(p.published_date).toISOString().split('T')[0]
          : today;

        eventUrls.push({
          loc: `${SITE_URL}/events/${slug}`,
          lastmod,
          priority: '0.8',
          changefreq: 'weekly',
        });
      }
    } else {
      // Fallback slugs
      for (const slug of FALLBACK_EVENT_SLUGS) {
        eventUrls.push({
          loc: `${SITE_URL}/events/${slug}`,
          lastmod: today,
          priority: '0.8',
          changefreq: 'weekly',
        });
      }
    }

    // 2. Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${STATIC_ROUTES.map(
  (route) => `  <url>
    <loc>${SITE_URL}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
).join('\n')}
${eventUrls
  .map(
    (ev) => `  <url>
    <loc>${ev.loc}</loc>
    <lastmod>${ev.lastmod}</lastmod>
    <changefreq>${ev.changefreq}</changefreq>
    <priority>${ev.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.statusCode = 200;
    res.end(xml);
  } catch (err: any) {
    console.error('Error generating sitemap:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Error generating sitemap');
  }
}
