import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Newspaper, RefreshCw, Download, Copy, Send, FlaskConical, Plus, Trash2,
  ArrowUp, ArrowDown, ImageIcon, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MediaPickerModal from '@/components/admin/cms/MediaPickerModal';
import {
  FRAMES,
  DEFAULT_WORD_LIMIT,
  NEWSLETTER_SECTIONS,
  buildNewsletterHtml,
  newsletterFileName,
  photoFrames,
  type FrameKey,
  type NewsletterCrop,
  type NewsletterIssue,
  type NewsletterItem,
  type NewsletterPoster,
  type NewsletterSectionKey,
} from '@/lib/newsletter';

// ── Source material ─────────────────────────────────────────────────────────

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  category: string | null;
  status: string;
  featured_image: string | null;
  banner_image: string | null;
}
interface PostRow {
  id: string;
  title: string;
  slug: string | null;
  content: string | null;
  excerpt: string | null;
  published_date: string;
  featured_image: string | null;
  category: string | null;
}
interface GalleryRow { src: string; category_en: string | null; sub_category_en: string | null }

/** A post or an event, flattened to what a newsletter story needs. */
interface Source {
  key: string;
  kind: 'post' | 'event';
  date: string;
  title: string;
  body: string;
  image: string;
  link: string;
  category: string;
  upcoming: boolean;
}

const DRAFT_KEY = 'cswo-newsletter-draft';
const DEFAULT_HERO = '/assets/images/Chhatradol4.jpg';
/** This season's campaign poster — the first picture a reader sees. */
const DEFAULT_POSTER: NewsletterPoster = {
  image: '/assets/images/anandadhara-2026-poster-en.jpg',
  title: 'Anandadhara 2026 — A Festival of Giving',
  text: "This Durga Puja, Chhatradol's 7th-year initiative brings new clothes, educational materials and food to underprivileged children across Medinipur and Jhargram. Sponsor a few sets of clothes and share the joy of the festival with a child who would otherwise go without.",
  link: '/donate',
};
const FALLBACK_IMAGE = '/assets/images/og-default.jpg';
/** Organisation photos to stand in when an event has none, so a month of
 *  photo-less events does not print the same picture five times. */
const STAND_IN_IMAGES = [
  '/assets/images/IMG_20251208_203806.jpg',
  '/assets/images/about/about-hero.jpg',
  '/assets/images/IMG_20251208_204041.jpg',
  '/assets/images/about/about.jpg',
  FALLBACK_IMAGE,
];

/** Local calendar date — toISOString() would shift IST midnight back a day. */
function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "September-2026" */
function monthLabelFor(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.toLocaleDateString('en-IN', { month: 'long' })}-${d.getFullYear()}`;
}

/** Event titles are typed in capitals; the newsletter reads better in title case. */
function titleCase(s: string): string {
  const t = s.trim();
  if (t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|[\s(–-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
}

/** Post HTML → plain paragraphs, cut to a newsletter-sized story. */
function htmlToText(html: string, max = 900): string {
  const doc = new DOMParser().parseFromString(
    html.replace(/<\/(p|div|h\d|li)>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n'),
    'text/html',
  );
  const text = (doc.body.textContent ?? '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*/g, '\n\n').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('।'));
  return (stop > max * 0.5 ? cut.slice(0, stop + 1) : `${cut.trim()}…`).trim();
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;
}

function sectionFor(src: Source): NewsletterSectionKey {
  const c = `${src.category} ${src.title}`.toLowerCase();
  if (src.upcoming) return 'upcoming';
  if (/blood|রক্ত|health|eye|medical/.test(c)) return 'community';
  if (/cloth|tree|plant|education|school|ushnota|anandadhara|ichchepuron/.test(c)) return 'programs';
  if (/meeting|registration|member|website/.test(c)) return 'members';
  return 'highlights';
}

let idSeq = 0;
const newId = () => `nl-${Date.now().toString(36)}-${(idSeq++).toString(36)}`;

function toItem(src: Source, section: NewsletterSectionKey): NewsletterItem {
  return { id: newId(), section, title: src.title, body: src.body, image: src.image, link: src.link };
}

// ── Photo cropping ──────────────────────────────────────────────────────────
//
// Gmail and Outlook ignore object-fit, so a photo only fills its frame in the
// inbox if the file already has the frame's shape. Each photo is cropped here
// to the exact frame at 2× and uploaded; the email points at the crops.

/** Short stable name for a source URL, so re-sending reuses the same files. */
function hashKey(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}

async function cropPhoto(src: string, frame: FrameKey): Promise<string> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  await img.decode();

  const { w, h } = FRAMES[frame];
  const canvas = document.createElement('canvas');
  canvas.width = w * 2;
  // h 0 means "keep the photo's proportions": resize only, crop nothing.
  canvas.height = h ? h * 2 : Math.round((w * 2 * img.naturalHeight) / img.naturalWidth);
  const target = canvas.width / canvas.height;
  const ratio = img.naturalWidth / img.naturalHeight;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  let sx = 0;
  let sy = 0;
  if (ratio > target) {
    sw = sh * target;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = sw / target;
    // Tall photos keep their upper part — faces and poster titles live there.
    sy = (img.naturalHeight - sh) * 0.3;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the photo'))), 'image/jpeg', 0.84));
  const path = `newsletter/${hashKey(src)}-${frame}-${w}x${h}.jpg`;
  const { error } = await supabase.storage.from('post-images')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) throw new Error(error.message);
  return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
}

/** Crops every photo the issue shows that has not been cropped for that frame yet. */
async function prepareCrops(issue: NewsletterIssue): Promise<{ crops: Record<string, NewsletterCrop>; failed: string[] }> {
  const crops: Record<string, NewsletterCrop> = { ...(issue.crops ?? {}) };
  const failed: string[] = [];
  const jobs: { src: string; frame: FrameKey }[] = [];
  for (const [src, frames] of photoFrames(issue)) {
    for (const frame of frames) {
      // A crop made before a frame changed size has the old size in its name.
      const { w, h } = FRAMES[frame];
      if (!crops[src]?.[frame]?.includes(`-${frame}-${w}x${h}.jpg`)) jobs.push({ src, frame });
    }
  }
  await Promise.all(jobs.map(async ({ src, frame }) => {
    try {
      const url = await cropPhoto(src, frame);
      crops[src] = { ...crops[src], [frame]: url };
    } catch {
      failed.push(src);
    }
  }));
  return { crops, failed: [...new Set(failed)] };
}

// ── Draft persistence ───────────────────────────────────────────────────────

interface Draft { from: string; to: string; issue: NewsletterIssue }

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  return { from: isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: isoDate(now) };
}

function emptyIssue(to: string): NewsletterIssue {
  const monthLabel = monthLabelFor(to);
  return {
    issueNo: '01',
    monthLabel,
    subject: `Chhatradol Newsletter | ${monthLabel.replace('-', ' ')}`,
    heroImage: DEFAULT_HERO,
    poster: DEFAULT_POSTER,
    intro: '',
    items: [],
  };
}

// ── Page ────────────────────────────────────────────────────────────────────

type Notice = { kind: 'ok' | 'error'; text: string } | null;

export default function AdminNewsletter() {
  const saved = useMemo(loadDraft, []);
  const [range, setRange] = useState(() => (saved ? { from: saved.from, to: saved.to } : defaultRange()));
  // Drafts saved before posters existed have no `poster` key: give them this
  // season's. A draft whose poster was removed on purpose keeps `null`.
  const [issue, setIssue] = useState<NewsletterIssue>(() =>
    saved?.issue
      ? { ...saved.issue, poster: saved.issue.poster === undefined ? DEFAULT_POSTER : saved.issue.poster }
      : emptyIssue(defaultRange().to));
  const [pool, setPool] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null); // item id, or 'hero'
  const [addKey, setAddKey] = useState('');
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop');

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...range, issue })); } catch { /* private mode */ }
  }, [range, issue]);

  // The preview loads logo and icons from this server so they show before a
  // deploy; what is sent always points at the public site.
  const previewHtml = useMemo(
    () => buildNewsletterHtml(issue, { assetBase: window.location.origin }),
    [issue],
  );
  const [preparing, setPreparing] = useState(false);

  /** Crops the photos, keeps the crops in the draft, and returns the final HTML. */
  const finalHtml = async (): Promise<string> => {
    setPreparing(true);
    try {
      const { crops, failed } = await prepareCrops(issue);
      const ready = { ...issue, crops };
      setIssue(ready);
      if (failed.length) {
        setNotice({ kind: 'error', text: `${failed.length} photo(s) could not be cropped and are used as they are: ${failed.join(', ')}` });
      }
      return buildNewsletterHtml(ready);
    } finally {
      setPreparing(false);
    }
  };

  /** Reads every recent post and event once; the range only decides the defaults. */
  const loadPool = useCallback(async (): Promise<Source[]> => {
    const since = isoDate(new Date(Date.now() - 400 * 86_400_000));
    const [ev, po, ga] = await Promise.all([
      supabase.from('cswo_events')
        .select('id,title,description,event_date,location,category,status,featured_image,banner_image')
        .gte('event_date', since).neq('status', 'cancelled').order('event_date', { ascending: false }),
      supabase.from('cswo_posts')
        .select('id,title,slug,content,excerpt,published_date,featured_image,category')
        .eq('status', 'published').is('deleted_at', null).gte('published_date', since)
        .order('published_date', { ascending: false }),
      supabase.from('cswo_gallery').select('src,category_en,sub_category_en')
        .eq('is_active', true).is('deleted_at', null).order('sort_order'),
    ]);
    if (ev.error) throw new Error(ev.error.message);
    if (po.error) throw new Error(po.error.message);

    const events = (ev.data ?? []) as EventRow[];
    const posts = (po.data ?? []) as PostRow[];
    const gallery = (ga.data ?? []) as GalleryRow[];
    const today = isoDate(new Date());

    // Only a photo that plainly shows the same kind of work — a blood camp
    // must not go out over an eye-camp picture.
    const galleryFor = (category: string): string => {
      const c = category.toLowerCase();
      const topic = ['blood', 'eye', 'tree', 'cloth', 'education'].find((t) => c.includes(t));
      if (!topic) return '';
      return gallery.find((g) => g.src.toLowerCase().includes(topic))?.src ?? '';
    };

    const postSources: Source[] = posts.map((p) => ({
      key: `post:${p.id}`,
      kind: 'post',
      date: p.published_date,
      title: p.title.trim(),
      body: p.excerpt?.trim() || htmlToText(p.content ?? ''),
      image: p.featured_image ?? '',
      link: `/events/${p.slug || p.id}`,
      category: p.category ?? '',
      upcoming: false,
    }));

    const eventSources: Source[] = events.map((e) => {
      // A write-up posted within a few days of the event is its story: borrow
      // its photo so the event does not go out with a stock picture.
      const words = e.title.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
      const post = posts.find((p) => daysBetween(p.published_date, e.event_date) <= 5 &&
        (words.some((w) => p.title.toLowerCase().includes(w)) || daysBetween(p.published_date, e.event_date) <= 1));
      const upcoming = e.event_date > today;
      const place = e.location ? titleCase(e.location) : '';
      const when = longDate(e.event_date);
      const desc = e.description?.trim().replace(/\s*\n\s*/g, ' ');
      // A description that only repeats the venue adds nothing to the sentence.
      const norm = (t: string) => t.toLowerCase().replace(/^at\s+/, '').replace(/[^a-z0-9]+/g, '');
      const extra = desc && place && norm(desc) === norm(place) ? '' : desc;
      const body = desc && desc.length > 40
        ? desc
        : upcoming
          ? `Join Chhatradol on ${when}${place ? ` at ${place}` : ''}. ${e.category ? `${e.category} — ` : ''}every helping hand counts.`
          : `Chhatradol Social Welfare Organization held ${titleCase(e.title)} on ${when}${place ? ` at ${place}` : ''}.${extra ? ` ${extra}` : ''}`;
      return {
        key: `event:${e.id}`,
        kind: 'event',
        date: e.event_date,
        title: titleCase(e.title),
        body: post ? (post.excerpt?.trim() || htmlToText(post.content ?? '')) : body,
        image: e.banner_image || e.featured_image || post?.featured_image || galleryFor(e.category ?? '') || '',
        link: upcoming ? '/donate' : `/events/${post?.slug || e.id}`,
        category: e.category ?? '',
        upcoming,
      };
    });

    const all = [...eventSources, ...postSources].sort((a, b) => b.date.localeCompare(a.date));
    setPool(all);
    return all;
  }, []);

  useEffect(() => {
    loadPool().catch((e) => setNotice({ kind: 'error', text: (e as Error).message }));
  }, [loadPool]);

  /** Rebuilds the issue from the chosen date range, keeping the masthead fields. */
  const autoFill = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const all = await loadPool();
      const inRange = all.filter((s) => !s.upcoming && s.date >= range.from && s.date <= range.to);
      // An event and the post written about it describe the same day; keep one.
      const seen = new Set<string>();
      const picked = inRange.filter((s) => {
        const sig = `${s.image}|${s.date}`;
        if (s.image && seen.has(sig)) return false;
        seen.add(sig);
        return true;
      });
      const upcoming = all.filter((s) => s.upcoming).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);

      const withImage = picked.find((s) => s.image) ?? picked[0];
      const items: NewsletterItem[] = [];
      if (withImage) items.push(toItem(withImage, 'cover'));
      picked.filter((s) => s !== withImage).forEach((s) => items.push(toItem(s, sectionFor(s))));
      upcoming.forEach((s) => items.push(toItem(s, 'upcoming')));
      items.filter((it) => !it.image).forEach((it, n) => { it.image = STAND_IN_IMAGES[n % STAND_IN_IMAGES.length]; });

      const monthLabel = monthLabelFor(range.to);
      setIssue((prev) => ({
        ...prev,
        monthLabel,
        subject: `Chhatradol Newsletter | ${monthLabel.replace('-', ' ')}`,
        items,
      }));
      setNotice(items.length
        ? { kind: 'ok', text: `Loaded ${picked.length} stories and ${upcoming.length} upcoming events. Edit anything below.` }
        : { kind: 'error', text: 'Nothing was published or held in that range. Widen the dates or add items by hand.' });
    } catch (e) {
      setNotice({ kind: 'error', text: (e as Error).message });
    }
    setLoading(false);
  };

  const updateItem = (id: string, patch: Partial<NewsletterItem>) =>
    setIssue((p) => ({ ...p, items: p.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));

  const moveItem = (id: string, dir: -1 | 1) =>
    setIssue((p) => {
      const items = [...p.items];
      const i = items.findIndex((it) => it.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= items.length) return p;
      [items[i], items[j]] = [items[j], items[i]];
      return { ...p, items };
    });

  const removeItem = (id: string) => setIssue((p) => ({ ...p, items: p.items.filter((it) => it.id !== id) }));

  const addFromPool = () => {
    const src = pool.find((s) => s.key === addKey);
    const item = src
      ? toItem(src, sectionFor(src))
      : { id: newId(), section: 'highlights' as const, title: 'New story', body: '', image: FALLBACK_IMAGE, link: '' };
    setIssue((p) => ({ ...p, items: [...p.items, item] }));
    setAddKey('');
  };

  const downloadHtml = async () => {
    const html = await finalHtml().catch((e) => { setNotice({ kind: 'error', text: (e as Error).message }); return ''; });
    if (!html) return;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: newsletterFileName(issue) });
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyHtml = async () => {
    try {
      // Cropping outlasts the click's permission to use the clipboard, so
      // hand the clipboard a promise while the click still counts.
      const pending = finalHtml();
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'text/plain': pending.then((h) => new Blob([h], { type: 'text/plain' })) }),
        ]);
      } else {
        await navigator.clipboard.writeText(await pending);
      }
      setNotice({ kind: 'ok', text: 'HTML copied — paste it into any mail tool that accepts HTML.' });
    } catch {
      setNotice({ kind: 'error', text: 'The browser blocked the clipboard. Use Download instead.' });
    }
  };

  const send = async (audience: 'test' | 'members' | 'donors' | 'all') => {
    if (!issue.items.length) return setNotice({ kind: 'error', text: 'Add at least one story first.' });
    if (audience !== 'test') {
      const who = { members: 'all approved members', donors: 'everyone who has donated', all: 'all members and donors' }[audience];
      if (!window.confirm(`Send "${issue.subject}" to ${who}?\n\nThis cannot be undone. Send yourself a test first if you have not.`)) return;
    }
    setSending(audience);
    setNotice(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Your session has expired. Please sign in again.');
      const html = await finalHtml();
      const res = await fetch('/api/send-newsletter', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: issue.subject, html, audience }),
      });
      const out = await res.json().catch(() => ({ error: 'Could not read the server response' }));
      if (!res.ok) throw new Error(out.error || `Send failed (${res.status})`);
      setNotice({
        kind: out.failed ? 'error' : 'ok',
        text: audience === 'test'
          ? 'Test sent to your own email address.'
          : `Sent to ${out.sent} of ${out.total} recipients.${out.failed ? ` ${out.failed} failed: ${out.error}` : ''}`,
      });
    } catch (e) {
      setNotice({ kind: 'error', text: (e as Error).message });
    }
    setSending(null);
  };

  const pickImage = (url: string) => {
    if (pickerFor === 'hero') setIssue((p) => ({ ...p, heroImage: url }));
    else if (pickerFor === 'poster') setIssue((p) => ({ ...p, poster: p.poster && { ...p.poster, image: url } }));
    else if (pickerFor) updateItem(pickerFor, { image: url });
    setPickerFor(null);
  };

  const sectionCounts = useMemo(() => {
    const m = new Map<NewsletterSectionKey, number>();
    issue.items.forEach((it) => m.set(it.section, (m.get(it.section) ?? 0) + 1));
    return m;
  }, [issue.items]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Newspaper className="h-6 w-6" /> Newsletter
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Build the monthly email from events and posts, preview it, and send it to members and donors.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={copyHtml} disabled={preparing} className="btn-secondary inline-flex items-center gap-1.5 text-sm">
            <Copy className="h-4 w-4" /> Copy HTML
          </button>
          <button onClick={downloadHtml} disabled={preparing} className="btn-secondary inline-flex items-center gap-1.5 text-sm">
            <Download className="h-4 w-4" /> Download
          </button>
        </div>
      </div>

      {notice && (
        <div className={`mb-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${notice.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
          {notice.kind === 'ok' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          {notice.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_660px]">
        {/* ── Editor ─────────────────────────────────────────────── */}
        <div className="space-y-5">
          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-3 font-semibold text-gray-900">1. Pull stories from events &amp; posts</h2>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">From</span>
                <input type="date" className="input text-sm" value={range.from}
                  onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">To</span>
                <input type="date" className="input text-sm" value={range.to}
                  onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
              </label>
              <button onClick={autoFill} disabled={loading} className="btn-primary inline-flex items-center gap-1.5 text-sm">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {issue.items.length ? 'Rebuild from range' : 'Load stories'}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Events and posts in the range become stories, sorted into sections; events after today go under Upcoming.
              Rebuilding replaces the stories below.
            </p>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-3 font-semibold text-gray-900">2. Masthead</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Issue no.</span>
                <input className="input w-full text-sm" value={issue.issueNo}
                  onChange={(e) => setIssue((p) => ({ ...p, issueNo: e.target.value }))} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Words per story</span>
                <input type="number" min={30} max={400} step={10} className="input w-full text-sm"
                  value={issue.wordLimit ?? DEFAULT_WORD_LIMIT}
                  onChange={(e) => setIssue((p) => ({ ...p, wordLimit: Math.max(30, Number(e.target.value) || DEFAULT_WORD_LIMIT) }))} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Month label</span>
                <input className="input w-full text-sm" value={issue.monthLabel}
                  onChange={(e) => setIssue((p) => ({ ...p, monthLabel: e.target.value }))} />
              </label>
              <label className="text-sm sm:col-span-3">
                <span className="mb-1 block text-gray-600">Email subject</span>
                <input className="input w-full text-sm" value={issue.subject}
                  onChange={(e) => setIssue((p) => ({ ...p, subject: e.target.value }))} />
              </label>
              <label className="text-sm sm:col-span-3">
                <span className="mb-1 block text-gray-600">Note from the secretary (optional)</span>
                <textarea rows={2} className="input w-full text-sm" value={issue.intro}
                  onChange={(e) => setIssue((p) => ({ ...p, intro: e.target.value }))} />
              </label>
              <div className="flex items-center gap-3 sm:col-span-3">
                <img src={issue.heroImage} alt=""
                  className="h-14 w-24 rounded object-cover ring-1 ring-gray-200" />
                <input className="input flex-1 text-sm" value={issue.heroImage} placeholder="Hero photo URL"
                  onChange={(e) => setIssue((p) => ({ ...p, heroImage: e.target.value }))} />
                <button onClick={() => setPickerFor('hero')} className="btn-secondary inline-flex items-center gap-1 text-sm">
                  <ImageIcon className="h-4 w-4" /> Choose
                </button>
              </div>
              <p className="text-xs text-gray-500 sm:col-span-3">
                Landscape photo above the logo panel. Not shown while a featured poster is set.
              </p>
            </div>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-semibold text-gray-900">Featured poster</h2>
              {issue.poster ? (
                <button onClick={() => setIssue((p) => ({ ...p, poster: null }))} className="text-xs text-red-600 hover:underline">
                  Remove poster
                </button>
              ) : (
                <button onClick={() => setIssue((p) => ({ ...p, poster: DEFAULT_POSTER }))} className="btn-secondary text-xs">
                  Add Anandadhara poster
                </button>
              )}
            </div>
            {issue.poster ? (
              <div className="flex gap-3">
                <button onClick={() => setPickerFor('poster')} title="Change poster"
                  className="group relative h-36 w-28 shrink-0 overflow-hidden rounded bg-gray-100 ring-1 ring-gray-200">
                  <img src={issue.poster.image} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 hidden items-center justify-center bg-black/50 text-xs text-white group-hover:flex">Change</span>
                </button>
                <div className="min-w-0 flex-1 space-y-2">
                  <input className="input w-full text-sm font-medium" value={issue.poster.title} placeholder="Campaign title"
                    onChange={(e) => setIssue((p) => ({ ...p, poster: p.poster && { ...p.poster, title: e.target.value } }))} />
                  <textarea rows={3} className="input w-full text-sm" value={issue.poster.text} placeholder="Short appeal under the poster"
                    onChange={(e) => setIssue((p) => ({ ...p, poster: p.poster && { ...p.poster, text: e.target.value } }))} />
                  <input className="input w-full text-xs" value={issue.poster.link} placeholder="Button link, e.g. /donate"
                    onChange={(e) => setIssue((p) => ({ ...p, poster: p.poster && { ...p.poster, link: e.target.value } }))} />
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">No poster: the landscape hero photo opens the email instead.</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              The poster is the first picture in the email, shown whole, and the Donate section at the end uses its title.
            </p>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-gray-900">3. Stories ({issue.items.length})</h2>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {NEWSLETTER_SECTIONS.map((s) => (
                  <span key={s.key} className="rounded-full px-2 py-0.5 text-white" style={{ background: s.color }}>
                    {s.title} · {sectionCounts.get(s.key) ?? 0}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {issue.items.map((it, i) => (
                <div key={it.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex gap-3">
                    <button onClick={() => setPickerFor(it.id)} title="Change photo"
                      className="group relative h-20 w-28 shrink-0 overflow-hidden rounded bg-gray-100 ring-1 ring-gray-200">
                      {it.image && <img src={it.image} alt="" className="h-full w-full object-cover" />}
                      <span className="absolute inset-0 hidden items-center justify-center bg-black/50 text-xs text-white group-hover:flex">Change</span>
                    </button>
                    <div className="min-w-0 flex-1 space-y-2">
                      <input className="input w-full text-sm font-medium" value={it.title} placeholder="Headline"
                        onChange={(e) => updateItem(it.id, { title: e.target.value })} />
                      <div className="flex flex-wrap gap-2">
                        <select className="input !w-auto text-sm" value={it.section}
                          onChange={(e) => updateItem(it.id, { section: e.target.value as NewsletterSectionKey })}>
                          {NEWSLETTER_SECTIONS.map((s) => <option key={s.key} value={s.key}>{s.title}</option>)}
                        </select>
                        <input className="input min-w-[10rem] flex-1 text-xs" value={it.image} placeholder="Photo URL"
                          onChange={(e) => updateItem(it.id, { image: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button onClick={() => moveItem(it.id, -1)} disabled={i === 0} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Move up"><ArrowUp className="h-4 w-4" /></button>
                      <button onClick={() => moveItem(it.id, 1)} disabled={i === issue.items.length - 1} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Move down"><ArrowDown className="h-4 w-4" /></button>
                      <button onClick={() => removeItem(it.id)} className="rounded p-1 text-red-500 hover:bg-red-50" title="Remove"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <textarea rows={4} className="input mt-2 w-full text-sm" value={it.body}
                    placeholder="Story text — leave a blank line between paragraphs"
                    onChange={(e) => updateItem(it.id, { body: e.target.value })} />
                  <input className="input mt-2 w-full text-xs" value={it.link}
                    placeholder="Read-more link, e.g. /events/world-blood-donor-day-2026 (optional)"
                    onChange={(e) => updateItem(it.id, { link: e.target.value })} />
                </div>
              ))}
              {!issue.items.length && (
                <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                  No stories yet. Pick a date range and press <b>Load stories</b>, or add one below.
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <select className="input min-w-0 flex-1 text-sm" value={addKey} onChange={(e) => setAddKey(e.target.value)}>
                <option value="">Blank story</option>
                {pool.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.date} · {s.kind === 'event' ? (s.upcoming ? 'Upcoming' : 'Event') : 'Post'} · {s.title.slice(0, 70)}
                  </option>
                ))}
              </select>
              <button onClick={addFromPool} className="btn-secondary inline-flex items-center gap-1 text-sm">
                <Plus className="h-4 w-4" /> Add story
              </button>
            </div>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-1 font-semibold text-gray-900">4. Send</h2>
            <p className="mb-3 text-xs text-gray-500">
              Goes out from info@chhatradol.org, one email per person. Send yourself a test first.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => send('test')} disabled={!!sending || preparing} className="btn-secondary inline-flex items-center gap-1.5 text-sm">
                <FlaskConical className="h-4 w-4" /> {sending === 'test' ? 'Sending…' : 'Send test to me'}
              </button>
              <button onClick={() => send('members')} disabled={!!sending || preparing} className="btn-primary inline-flex items-center gap-1.5 text-sm">
                <Send className="h-4 w-4" /> {sending === 'members' ? 'Sending…' : 'Members'}
              </button>
              <button onClick={() => send('donors')} disabled={!!sending || preparing} className="btn-primary inline-flex items-center gap-1.5 text-sm">
                <Send className="h-4 w-4" /> {sending === 'donors' ? 'Sending…' : 'Donors'}
              </button>
              <button onClick={() => send('all')} disabled={!!sending || preparing} className="btn-primary inline-flex items-center gap-1.5 text-sm">
                <Send className="h-4 w-4" /> {sending === 'all' ? 'Sending…' : 'Members + donors'}
              </button>
            </div>
          </section>
        </div>

        {/* ── Preview ────────────────────────────────────────────── */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-2 text-xs text-gray-500">
              <span className="min-w-0 truncate">
                <b className="text-gray-700">Preview</b> · {preparing ? 'Cropping photos…' : issue.subject}
              </span>
              <div className="flex shrink-0 overflow-hidden rounded-full ring-1 ring-gray-200">
                {(['desktop', 'phone'] as const).map((d) => (
                  <button key={d} onClick={() => setDevice(d)}
                    className={`px-3 py-1 capitalize ${device === d ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-center bg-gray-100">
              <iframe title="Newsletter preview" srcDoc={previewHtml}
                className="h-[80vh] border-0 bg-white"
                style={{ width: device === 'phone' ? 375 : '100%' }} />
            </div>
          </div>
        </div>
      </div>

      <MediaPickerModal open={!!pickerFor} onClose={() => setPickerFor(null)} onSelect={pickImage} title="Choose a photo" />
    </div>
  );
}
