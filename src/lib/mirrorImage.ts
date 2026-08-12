/**
 * mirrorImage.ts
 *
 * Detects URLs from CDN hosts that block hotlinking or expire (Facebook, Instagram,
 * WhatsApp, Twitter/X, etc.) and re-uploads the image to Supabase Storage so we
 * always store a permanent, publicly accessible URL.
 *
 * Usage:
 *   const permanentUrl = await mirrorExternalImage(url, onProgress);
 *   // Returns the original url unchanged if it is already a safe/permanent URL.
 */

import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/imageCompression';

/** CDN hostname patterns known to expire or block cross-origin hotlinking. */
const BLOCKED_HOSTS = [
  'fbcdn.net',       // Facebook / Instagram CDN
  'scontent',        // Facebook scontent subdomains
  'cdninstagram.com',
  'instagram.com',
  'pbs.twimg.com',   // Twitter/X images
  'ton.twimg.com',
  'twimg.com',
  'media.giphy.com',
  'whatsapp.net',
];

export function isBlockedCdnUrl(url: string): boolean {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return BLOCKED_HOSTS.some((h) => hostname.includes(h));
  } catch {
    return false;
  }
}

export type MirrorProgress =
  | { stage: 'fetching' }
  | { stage: 'uploading' }
  | { stage: 'done'; url: string }
  | { stage: 'error'; message: string };

/**
 * If `url` is from a known expiring/blocked CDN, fetches it via a CORS proxy,
 * compresses it, uploads to Supabase `post-images` bucket, and returns the
 * permanent public URL.
 *
 * If `url` is already safe (Supabase, relative path, etc.) it is returned as-is.
 */
export async function mirrorExternalImage(
  url: string,
  onProgress?: (p: MirrorProgress) => void,
): Promise<string> {
  if (!url.trim()) return url;

  // Already stored in Supabase — safe
  if (url.includes('supabase.co/storage')) return url;
  // Relative path — safe
  if (url.startsWith('/')) return url;
  // Not a known-bad host — return as-is (trust user)
  if (!isBlockedCdnUrl(url)) return url;

  try {
    // ── 1. Fetch via CORS proxy ──────────────────────────────────────────
    onProgress?.({ stage: 'fetching' });

    // Try direct fetch first (works if server has CORS open).
    // If that fails due to CORS, fall back to a public CORS proxy.
    let blob: Blob | null = null;
    let fetchError: string | null = null;

    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      blob = await res.blob();
    } catch (err) {
      fetchError = String(err);
    }

    // Fallback: use allorigins CORS proxy
    if (!blob) {
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
        blob = await res.blob();
        fetchError = null;
      } catch (err) {
        fetchError = String(err);
      }
    }

    if (!blob || fetchError) {
      onProgress?.({ stage: 'error', message: `Could not fetch image: ${fetchError}` });
      return url; // Return original — SmartImage fallback will handle display
    }

    // ── 2. Compress & upload to Supabase ────────────────────────────────
    onProgress?.({ stage: 'uploading' });

    const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
    const file = new File([blob], `mirrored.${ext}`, { type: blob.type });
    const compressed = await compressImage(file, 'post');

    const path = `posts/mirror-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from('post-images').upload(path, compressed);

    if (upErr) {
      onProgress?.({ stage: 'error', message: `Upload failed: ${upErr.message}` });
      return url;
    }

    const permanentUrl = supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
    onProgress?.({ stage: 'done', url: permanentUrl });
    return permanentUrl;
  } catch (err) {
    onProgress?.({ stage: 'error', message: String(err) });
    return url;
  }
}
