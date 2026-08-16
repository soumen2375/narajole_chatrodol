import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://www.chhatradol.org';
const today = new Date().toISOString().split('T')[0];
const publicDir = path.resolve(__dirname, '../public');

// ── 1. STATIC PAGES ──────────────────────────────────────────────────────────
const STATIC_PAGES = [
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

// ── 2. PARSE EVENT SLUGS & IMAGES ───────────────────────────────────────────
const postsFilePath = path.resolve(__dirname, '../src/data/posts.ts');
let events = [];

if (fs.existsSync(postsFilePath)) {
  const content = fs.readFileSync(postsFilePath, 'utf-8');
  // Match post objects with slug, title, image, date
  const postBlocks = content.split(/\{\s*id:\s*['"]/g).slice(1);
  for (const block of postBlocks) {
    const slugMatch = block.match(/slug:\s*['"]([^'"]+)['"]/);
    const titleMatch = block.match(/title:\s*['"]([^'"]+)['"]/);
    const imgMatch = block.match(/featuredImage:\s*['"]([^'"]+)['"]/);
    const dateMatch = block.match(/publishedDate:\s*['"]([^'"]+)['"]/);

    if (slugMatch && slugMatch[1]) {
      const slug = slugMatch[1];
      const title = titleMatch ? titleMatch[1] : '';
      const img = imgMatch ? imgMatch[1] : '';
      const date = dateMatch ? dateMatch[1] : today;
      if (!events.some((e) => e.slug === slug)) {
        events.push({ slug, title, img, date });
      }
    }
  }
}

// Ensure default fallback events exist
const fallbackEvents = [
  {
    slug: 'regular-blood-donation-camp',
    title: 'Inspiration of the blood donation camp',
    img: '/assets/images/service/post-33-raktokotha-camp.jpg',
    date: '2026-05-18',
  },
  {
    slug: 'free-general-health-checkup',
    title: 'Free Health Check-up Camp Held in Narajole',
    img: '/assets/images/service/post-15-mental-care-home.jpg',
    date: '2026-05-20',
  },
  {
    slug: 'education-support-program',
    title: 'Study Materials Distributed to Students',
    img: '/assets/images/service/post-34-students-book-support.jpg',
    date: '2026-05-15',
  },
  {
    slug: 'world-blood-donor-day-2026',
    title: 'World Blood Donor Day 2026',
    img: '/assets/images/service/post-33-raktokotha-camp.jpg',
    date: '2026-06-14',
  },
];

for (const fb of fallbackEvents) {
  if (!events.some((e) => e.slug === fb.slug)) {
    events.push(fb);
  }
}

// ── 3. GENERATE SITEMAP FILES ───────────────────────────────────────────────

// A) sitemap-pages.xml
const sitemapPagesXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${STATIC_PAGES.map(
  (p) => `  <url>
    <loc>${SITE_URL}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
).join('\n')}
</urlset>`;

// B) sitemap-events.xml
const sitemapEventsXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${events
  .map(
    (ev) => `  <url>
    <loc>${SITE_URL}/events/${ev.slug}</loc>
    <lastmod>${ev.date || today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

// C) sitemap-images.xml
const sitemapImagesXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${SITE_URL}/</loc>
    <image:image>
      <image:loc>${SITE_URL}/assets/images/Chhatradol.jpg</image:loc>
      <image:title>Chhatradol Social Welfare Organisation Team</image:title>
    </image:image>
    <image:image>
      <image:loc>${SITE_URL}/assets/images/logo.png</image:loc>
      <image:title>Chhatradol Official Logo</image:title>
    </image:image>
  </url>
${events
  .filter((ev) => ev.img)
  .map(
    (ev) => `  <url>
    <loc>${SITE_URL}/events/${ev.slug}</loc>
    <image:image>
      <image:loc>${ev.img.startsWith('http') ? ev.img : `${SITE_URL}${ev.img}`}</image:loc>
      <image:title>${ev.title.replace(/[<>&'"]/g, '')}</image:title>
    </image:image>
  </url>`,
  )
  .join('\n')}
</urlset>`;

// D) sitemap-index.xml & sitemap.xml
const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap-pages.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-events.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-images.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;

// ── 4. WRITE FILES TO PUBLIC DIR ─────────────────────────────────────────────
fs.writeFileSync(path.join(publicDir, 'sitemap-pages.xml'), sitemapPagesXml.trim(), 'utf-8');
fs.writeFileSync(path.join(publicDir, 'sitemap-events.xml'), sitemapEventsXml.trim(), 'utf-8');
fs.writeFileSync(path.join(publicDir, 'sitemap-images.xml'), sitemapImagesXml.trim(), 'utf-8');
fs.writeFileSync(path.join(publicDir, 'sitemap-index.xml'), sitemapIndexXml.trim(), 'utf-8');
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapIndexXml.trim(), 'utf-8');

console.log(`✅ Generated Sitemap Index Architecture:
 - /sitemap.xml (Index pointing to sub-sitemaps)
 - /sitemap-index.xml (Alias)
 - /sitemap-pages.xml (${STATIC_PAGES.length} static pages)
 - /sitemap-events.xml (${events.length} event pages)
 - /sitemap-images.xml (${events.filter((e) => e.img).length + 2} indexed images)
`);
