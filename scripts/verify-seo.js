import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const publicDir = path.resolve(rootDir, 'public');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedChecks++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('\n======================================================');
console.log('🔍 CHHATRADOL SOCIAL WELFARE ORGANISATION — SEO AUDIT');
console.log('======================================================\n');

// ── 1. ROBOTS.TXT AUDIT ──────────────────────────────────────────────────────
console.log('📋 1. Auditing robots.txt...');
const robotsPath = path.join(publicDir, 'robots.txt');
assert(fs.existsSync(robotsPath), 'public/robots.txt exists');
const robotsContent = fs.readFileSync(robotsPath, 'utf-8');

assert(robotsContent.includes('User-agent: *'), 'robots.txt specifies User-agent: *');
assert(robotsContent.includes('Allow: /'), 'robots.txt allows root path');
assert(robotsContent.includes('Disallow: /admin/'), 'robots.txt disallows /admin/');
assert(robotsContent.includes('Disallow: /member/'), 'robots.txt disallows /member/');
assert(robotsContent.includes('Disallow: /login'), 'robots.txt disallows /login');
assert(robotsContent.includes('Disallow: /admin-login'), 'robots.txt disallows /admin-login');
assert(robotsContent.includes('Sitemap: https://www.chhatradol.org/sitemap.xml'), 'robots.txt references official sitemap.xml');
assert(robotsContent.includes('Sitemap: https://www.chhatradol.org/sitemap-index.xml'), 'robots.txt references sitemap-index.xml');
assert(!robotsContent.includes('narajolechatrodol.org'), 'robots.txt has NO deprecated domain references');

// ── 2. SITEMAP ARCHITECTURE AUDIT ───────────────────────────────────────────
console.log('\n🗺️  2. Auditing Sitemap Index & Sub-Sitemaps...');

const sitemapFiles = [
  'sitemap.xml',
  'sitemap-index.xml',
  'sitemap-pages.xml',
  'sitemap-events.xml',
  'sitemap-images.xml',
];

for (const sf of sitemapFiles) {
  const pPub = path.join(publicDir, sf);
  const pDist = path.join(distDir, sf);
  assert(fs.existsSync(pPub), `public/${sf} exists`);
  assert(fs.existsSync(pDist), `dist/${sf} exists in production output`);

  const content = fs.readFileSync(pPub, 'utf-8');
  assert(content.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), `${sf} starts with valid XML declaration`);
  assert(!content.includes('undefined') && !content.includes('null'), `${sf} has no undefined/null tokens`);
  assert(content.includes('https://www.chhatradol.org'), `${sf} uses canonical https://www.chhatradol.org domain`);
}

// Check sitemap-index structure
const indexContent = fs.readFileSync(path.join(publicDir, 'sitemap-index.xml'), 'utf-8');
assert(indexContent.includes('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), 'sitemap-index.xml has valid <sitemapindex> tag');
assert(indexContent.includes('/sitemap-pages.xml'), 'sitemap-index.xml links to sitemap-pages.xml');
assert(indexContent.includes('/sitemap-events.xml'), 'sitemap-index.xml links to sitemap-events.xml');
assert(indexContent.includes('/sitemap-images.xml'), 'sitemap-index.xml links to sitemap-images.xml');

// Check sitemap-pages
const pagesContent = fs.readFileSync(path.join(publicDir, 'sitemap-pages.xml'), 'utf-8');
const requiredStaticRoutes = [
  'https://www.chhatradol.org',
  'https://www.chhatradol.org/about',
  'https://www.chhatradol.org/programs',
  'https://www.chhatradol.org/events',
  'https://www.chhatradol.org/gallery',
  'https://www.chhatradol.org/impacts',
  'https://www.chhatradol.org/volunteer',
  'https://www.chhatradol.org/donate',
  'https://www.chhatradol.org/blood-request',
  'https://www.chhatradol.org/organise-blood-camp',
  'https://www.chhatradol.org/contact',
  'https://www.chhatradol.org/terms',
  'https://www.chhatradol.org/privacy',
];
for (const r of requiredStaticRoutes) {
  assert(pagesContent.includes(`<loc>${r}</loc>`), `sitemap-pages.xml contains canonical URL: ${r}`);
}

// Check sitemap-events
const eventsContent = fs.readFileSync(path.join(publicDir, 'sitemap-events.xml'), 'utf-8');
const sampleEvents = [
  'regular-blood-donation-camp',
  'free-general-health-checkup',
  'education-support-program',
];
for (const se of sampleEvents) {
  assert(eventsContent.includes(`/events/${se}`), `sitemap-events.xml contains event URL: /events/${se}`);
}

// Check sitemap-images
const imagesContent = fs.readFileSync(path.join(publicDir, 'sitemap-images.xml'), 'utf-8');
assert(imagesContent.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'), 'sitemap-images.xml has Google image sitemap schema namespace');
assert(imagesContent.includes('<image:image>'), 'sitemap-images.xml has <image:image> tags');
assert(imagesContent.includes('<image:title>'), 'sitemap-images.xml has <image:title> tags');

// ── 3. STATIC HTML AUDIT (dist/index.html) ──────────────────────────────────
console.log('\n📄 3. Auditing dist/index.html (Static SEO & GA4)...');
const indexPath = path.join(distDir, 'index.html');
assert(fs.existsSync(indexPath), 'dist/index.html exists');
const htmlContent = fs.readFileSync(indexPath, 'utf-8');

assert(htmlContent.includes('<title>Chhatradol Social Welfare Organisation'), 'HTML has primary Brand Title');
assert(htmlContent.includes('name="description"'), 'HTML has meta description');
assert(htmlContent.includes('rel="canonical" href="https://www.chhatradol.org/"'), 'HTML has canonical tag');
assert(htmlContent.includes('property="og:site_name" content="Chhatradol Social Welfare Organisation"'), 'HTML has og:site_name');
assert(htmlContent.includes('property="og:image"'), 'HTML has og:image');
assert(htmlContent.includes('name="twitter:card" content="summary_large_image"'), 'HTML has twitter:card');
assert(htmlContent.includes('googletagmanager.com/gtag/js?id='), 'HTML includes Google Analytics (GA4) script');
assert(htmlContent.includes('gtag('), 'HTML initializes gtag config');

// ── 4. STRUCTURED DATA (JSON-LD) AUDIT ──────────────────────────────────────
console.log('\n🏷️  4. Auditing Structured Data (JSON-LD)...');
assert(htmlContent.includes('type="application/ld+json"'), 'dist/index.html has JSON-LD script tag');

// Extract and parse JSON-LD
const jsonLdMatch = htmlContent.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert(Boolean(jsonLdMatch), 'Extracted JSON-LD block from HTML');
if (jsonLdMatch) {
  try {
    const parsedLd = JSON.parse(jsonLdMatch[1]);
    assert(parsedLd['@context'] === 'https://schema.org', 'JSON-LD context is https://schema.org');
    assert(Array.isArray(parsedLd['@graph']), 'JSON-LD uses @graph schema array');

    const orgSchema = parsedLd['@graph'].find((item) => item['@type'] === 'Organization');
    assert(Boolean(orgSchema), 'Organization schema exists in graph');
    if (orgSchema) {
      assert(orgSchema.name === 'Chhatradol Social Welfare Organisation', 'Organization name is accurate');
      assert(orgSchema.url === 'https://www.chhatradol.org', 'Organization url is https://www.chhatradol.org');
      assert(Boolean(orgSchema.logo), 'Organization logo is specified');
      assert(Boolean(orgSchema.address), 'Organization postal address is specified');
      assert(Array.isArray(orgSchema.sameAs) && orgSchema.sameAs.length >= 4, 'Organization sameAs social profiles array contains official links');
    }

    const webSiteSchema = parsedLd['@graph'].find((item) => item['@type'] === 'WebSite');
    assert(Boolean(webSiteSchema), 'WebSite schema exists in graph');
    if (webSiteSchema) {
      assert(webSiteSchema.url === 'https://www.chhatradol.org', 'WebSite url is https://www.chhatradol.org');
      assert(webSiteSchema.name === 'Chhatradol Social Welfare Organisation', 'WebSite name is accurate');
    }
  } catch (err) {
    assert(false, `JSON-LD failed JSON parse: ${err.message}`);
  }
}

// ── 5. SERVERLESS SHARE BOT AUDIT (api/share.ts) ─────────────────────────────
console.log('\n🤖 5. Auditing api/share.ts (Bot Crawler SSR & Rich Data)...');
const sharePath = path.join(rootDir, 'api', 'share.ts');
assert(fs.existsSync(sharePath), 'api/share.ts exists');
const shareContent = fs.readFileSync(sharePath, 'utf-8');
assert(shareContent.includes("'@type': 'Event'"), 'api/share.ts injects Event schema');
assert(shareContent.includes("'@type': 'BreadcrumbList'"), 'api/share.ts injects BreadcrumbList schema');
assert(shareContent.includes("'@type': 'Organization'"), 'api/share.ts references Organization schema');
assert(shareContent.includes('<meta property="og:image"'), 'api/share.ts serves OG image for crawlers');

// ── 6. VERIFY ROUTE SEO METADATA CONFIG (src/data/seoConfig.ts) ─────────────
console.log('\n🌐 6. Auditing Centralized Route SEO Config...');
const configPath = path.join(rootDir, 'src', 'data', 'seoConfig.ts');
assert(fs.existsSync(configPath), 'src/data/seoConfig.ts exists');
const configContent = fs.readFileSync(configPath, 'utf-8');

const routesToCheck = [
  '/',
  '/about',
  '/programs',
  '/events',
  '/gallery',
  '/impacts',
  '/contact',
  '/volunteer',
  '/donate',
  '/blood-request',
  '/organise-blood-camp',
  '/terms',
  '/privacy',
  '/refunds',
  '/shipping',
  '/login',
  '/admin-login',
  '/404',
];

for (const r of routesToCheck) {
  assert(configContent.includes(`'${r}'`), `seoConfig.ts defines metadata for route: ${r}`);
}

console.log('\n======================================================');
console.log(`🏁 AUDIT COMPLETE: ${passedChecks}/${totalChecks} PASSED (${failedChecks} failures)`);
console.log('======================================================\n');

if (failedChecks > 0) {
  process.exit(1);
}
