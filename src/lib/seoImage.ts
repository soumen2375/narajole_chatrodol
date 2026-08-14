/**
 * seoImage.ts
 *
 * Utilities for generating SEO-friendly image file names upon upload
 * and executing cross-origin photo downloads preserving the saved SEO filename.
 */

/**
 * Converts text or filename to a clean, SEO-optimized slug.
 */
export function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Builds a clean SEO-friendly file path / filename for storage upload.
 * Example:
 *  buildSeoFileName({ originalName: 'DSC_0042.JPG', contextTitle: 'Blood Camp 2025', folder: 'posts' })
 *  -> 'posts/blood-camp-2025-dsc-0042-a7b9.jpg'
 */
export function buildSeoFileName(options: {
  originalName?: string;
  contextTitle?: string;
  folder?: string;
  fallbackPrefix?: string;
}): string {
  const { originalName = '', contextTitle = '', folder = 'posts', fallbackPrefix = 'image' } = options;

  let ext = 'jpg';
  let baseName = '';

  if (originalName) {
    const parts = originalName.split('.');
    if (parts.length > 1) {
      ext = parts.pop()?.toLowerCase() ?? 'jpg';
      baseName = parts.join('.');
    } else {
      baseName = originalName;
    }
  }

  const cleanTitleSlug = contextTitle ? slugifyText(contextTitle) : '';
  const cleanBaseSlug = baseName ? slugifyText(baseName) : '';

  let namePart = '';
  if (cleanTitleSlug && cleanBaseSlug && cleanTitleSlug !== cleanBaseSlug) {
    namePart = `${cleanTitleSlug}-${cleanBaseSlug}`;
  } else if (cleanTitleSlug) {
    namePart = cleanTitleSlug;
  } else if (cleanBaseSlug) {
    namePart = cleanBaseSlug;
  } else {
    namePart = slugifyText(fallbackPrefix) || 'photo';
  }

  // Cap length
  namePart = namePart.slice(0, 90);

  // Short random suffix to avoid storage collisions while keeping SEO filename intact
  const uniqueSuffix = Math.random().toString(36).slice(2, 6);
  const finalFileName = `${namePart}-${uniqueSuffix}.${ext}`;

  return folder ? `${folder.replace(/\/$/, '')}/${finalFileName}` : finalFileName;
}

/**
 * Extracts or generates a clean filename from an image URL or title fallback.
 */
export function getSeoFileNameFromUrl(url: string, fallbackTitle?: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split('/');
    const last = segments.pop();
    if (last && last.includes('.')) {
      return decodeURIComponent(last);
    }
  } catch {
    /* relative path or simple url */
    if (url.includes('/') && url.includes('.')) {
      const parts = url.split('/');
      const last = parts.pop();
      if (last && last.includes('.')) return decodeURIComponent(last);
    }
  }

  const extMatch = url.match(/\.(jpg|jpeg|png|webp|gif|svg|avif)/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
  const cleanTitle = fallbackTitle ? slugifyText(fallbackTitle) : 'narajole-chatrodol-photo';
  return `${cleanTitle}.${ext}`;
}

/**
 * Triggers direct browser download of an image (working across origins),
 * ensuring the saved file uses the specified SEO filename.
 */
export async function downloadSeoImage(imageUrl: string, preferredFileName?: string): Promise<void> {
  if (!imageUrl) return;

  const targetFileName = preferredFileName || getSeoFileNameFromUrl(imageUrl);

  try {
    const res = await fetch(imageUrl, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = targetFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (err) {
    // Fallback if CORS prevents blob fetch: open in new tab or fallback link
    console.warn('Cross-origin direct download failed, falling back to window open:', err);
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = targetFileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
