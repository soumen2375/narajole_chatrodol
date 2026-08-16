import { useEffect, useRef } from 'react';

const SITE_URL = 'https://www.chhatradol.org';
const SITE_NAME = 'Chhatradol Social Welfare Organisation';
const DEFAULT_IMAGE = `${SITE_URL}/assets/images/Chhatradol.jpg`;
const DEFAULT_TITLE = 'Chhatradol Social Welfare Organisation | NGO in West Bengal';
const DEFAULT_DESCRIPTION =
  'Chhatradol Social Welfare Organization a public charitable trust working for education, health, environment and relief of the poor in West Bengal.';

export interface SEOProps {
  /** Full page title — appended with brand if not already present */
  title?: string;
  /** Meta description (max ~160 chars) */
  description?: string;
  /** Canonical URL (absolute). Falls back to SITE_URL + current pathname */
  canonical?: string;
  /** Robots directive. Defaults to 'index, follow' */
  robots?: string;
  /** OG image (absolute URL or site-relative path) */
  ogImage?: string;
  /** OG type — defaults to 'website' */
  ogType?: string;
  /** Override OG title if different from page title */
  ogTitle?: string;
  /** Override OG description if different from meta description */
  ogDescription?: string;
}

/**
 * Sets `document.title`, meta tags (description, canonical, robots),
 * Open Graph, and Twitter card tags for the current page.
 *
 * Restores defaults on unmount so navigating away cleans up.
 */
export function useSEO(props: SEOProps) {
  const prevTitle = useRef(document.title);

  useEffect(() => {
    const {
      title,
      description,
      canonical,
      robots = 'index, follow',
      ogImage,
      ogType = 'website',
      ogTitle,
      ogDescription,
    } = props;

    // ── Title ────────────────────────────────────────────────────────────
    if (title) {
      document.title = title;
    }

    // ── Helper: upsert a <meta> tag ─────────────────────────────────────
    const setMeta = (attrName: string, attrVal: string, content: string) => {
      let el = document.querySelector(`meta[${attrName}="${attrVal}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // ── Helper: upsert a <link> tag ─────────────────────────────────────
    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    // ── Meta description ────────────────────────────────────────────────
    if (description) {
      setMeta('name', 'description', description);
    }

    // ── Robots ──────────────────────────────────────────────────────────
    setMeta('name', 'robots', robots);

    // ── Canonical ───────────────────────────────────────────────────────
    const canonicalUrl = canonical || `${SITE_URL}${window.location.pathname}`;
    setLink('canonical', canonicalUrl);

    // ── Resolve image to absolute URL ───────────────────────────────────
    const resolveImage = (img?: string): string => {
      if (!img) return DEFAULT_IMAGE;
      if (img.startsWith('http')) return img;
      return img.startsWith('/') ? `${SITE_URL}${img}` : `${SITE_URL}/${img}`;
    };

    const resolvedImage = resolveImage(ogImage);
    const resolvedTitle = ogTitle || title || DEFAULT_TITLE;
    const resolvedDesc = ogDescription || description || DEFAULT_DESCRIPTION;

    // ── Open Graph ──────────────────────────────────────────────────────
    setMeta('property', 'og:type', ogType);
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:title', resolvedTitle);
    setMeta('property', 'og:description', resolvedDesc);
    setMeta('property', 'og:image', resolvedImage);
    setMeta('property', 'og:locale', 'en_IN');

    // ── Twitter / X Card ────────────────────────────────────────────────
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:url', canonicalUrl);
    setMeta('name', 'twitter:title', resolvedTitle);
    setMeta('name', 'twitter:description', resolvedDesc);
    setMeta('name', 'twitter:image', resolvedImage);

    // ── Cleanup on unmount ──────────────────────────────────────────────
    return () => {
      document.title = prevTitle.current;
      // Restore default meta values
      setMeta('name', 'description', DEFAULT_DESCRIPTION);
      setMeta('name', 'robots', 'index, follow');
      setLink('canonical', `${SITE_URL}/`);
      setMeta('property', 'og:type', 'website');
      setMeta('property', 'og:url', `${SITE_URL}/`);
      setMeta('property', 'og:title', DEFAULT_TITLE);
      setMeta('property', 'og:description', DEFAULT_DESCRIPTION);
      setMeta('property', 'og:image', DEFAULT_IMAGE);
      setMeta('name', 'twitter:url', `${SITE_URL}/`);
      setMeta('name', 'twitter:title', DEFAULT_TITLE);
      setMeta('name', 'twitter:description', DEFAULT_DESCRIPTION);
      setMeta('name', 'twitter:image', DEFAULT_IMAGE);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.title,
    props.description,
    props.canonical,
    props.robots,
    props.ogImage,
    props.ogType,
    props.ogTitle,
    props.ogDescription,
  ]);
}
