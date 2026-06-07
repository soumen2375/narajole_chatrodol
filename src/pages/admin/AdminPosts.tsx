import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoPost, PostStatus } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { ListSkeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/ui/StatusBadge';
import { STATIC_POSTS } from '@/data/posts';
import RichEditor from '@/components/admin/RichEditor';
import CategorySelector from '@/components/admin/CategorySelector';
import { compressImage } from '@/lib/imageCompression';

function slugify(t: string) {
  return t.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 90);
}
function stripHtml(h: string) { return h.replace(/<[^>]+>/g, ''); }

// ─── Form type ───────────────────────────────────────────────────────────────
interface EditorForm {
  title: string; content: string; category: string;
  tags: string[]; tagInput: string; featured_image: string;
  slug: string; meta_title: string; meta_description: string; focus_keyword: string;
  og_title: string; og_image: string; share_snippet: string;
  status: PostStatus; schedule_at: string;
  is_featured: boolean; is_sticky: boolean;
  author_name: string; original_published_date: string;
}
const EMPTY: EditorForm = {
  title: '', content: '', category: 'News', tags: [], tagInput: '',
  featured_image: '', slug: '', meta_title: '', meta_description: '',
  focus_keyword: '', og_title: '', og_image: '', share_snippet: '',
  status: 'draft', schedule_at: '', is_featured: false, is_sticky: false,
  author_name: '', original_published_date: '',
};
function fromPost(p: CswoPost, fallback: string): EditorForm {
  return {
    title: p.title, content: p.content, category: p.category,
    tags: Array.isArray(p.tags) ? p.tags : [], tagInput: '',
    featured_image: p.featured_image ?? '', slug: p.slug ?? '',
    meta_title: p.meta_title ?? '', meta_description: p.meta_description ?? '',
    focus_keyword: p.focus_keyword ?? '',
    og_title: p.og_title ?? '', og_image: p.og_image ?? '', share_snippet: p.share_snippet ?? '',
    status: p.status,
    schedule_at: p.schedule_at ? new Date(p.schedule_at).toISOString().slice(0, 16) : '',
    is_featured: p.is_featured ?? false, is_sticky: p.is_sticky ?? false,
    author_name: p.author_name ?? fallback,
    original_published_date: p.published_date ?? '',
  };
}

// ─── Status tabs ─────────────────────────────────────────────────────────────
const STATUS_TABS: { key: PostStatus | 'all'; en: string; bn: string }[] = [
  { key: 'all',       en: 'All',       bn: 'সব' },
  { key: 'draft',     en: 'Draft',     bn: 'খসড়া' },
  { key: 'pending',   en: 'Pending',   bn: 'অপেক্ষমাণ' },
  { key: 'scheduled', en: 'Scheduled', bn: 'নির্ধারিত' },
  { key: 'published', en: 'Published', bn: 'প্রকাশিত' },
  { key: 'archived',  en: 'Archived',  bn: 'আর্কাইভ' },
  { key: 'trash',     en: 'Trash',     bn: 'ট্র্যাশ' },
];

// ─── Social preview cards ─────────────────────────────────────────────────────
function TwitterPreview({ title, desc, image }: { title: string; desc: string; image: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white text-xs shadow-sm">
      {image
        ? <img src={image} alt="" className="h-28 w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        : <div className="flex h-28 items-center justify-center bg-gray-100 text-[10px] text-gray-400">No image</div>
      }
      <div className="p-2.5">
        <p className="truncate font-semibold text-gray-900">{title || 'Post title'}</p>
        <p className="mt-0.5 line-clamp-2 text-gray-500">{desc || 'Post description…'}</p>
        <p className="mt-1 text-[10px] text-gray-400">{typeof window !== 'undefined' ? window.location.hostname : 'narajolechatrodol.org'}</p>
      </div>
    </div>
  );
}
function WhatsAppPreview({ title, desc, image }: { title: string; desc: string; image: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-[#f0fdf4] text-xs shadow-sm">
      <div className="flex gap-2 p-2.5">
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold text-gray-900">{title || 'Post title'}</p>
          <p className="mt-0.5 line-clamp-2 text-gray-500">{desc || 'Post description…'}</p>
          <p className="mt-1 text-[10px] text-gray-400">{typeof window !== 'undefined' ? window.location.hostname : 'narajolechatrodol.org'}</p>
        </div>
        {image && (
          <img src={image} alt="" className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function AdminPosts() {
  const { member } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  // list
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [posts, setPosts] = useState<CswoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<PostStatus | 'all'>('all');
  const [filterCat, setFilterCat] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  // editor
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditorForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autoSaveMsg, setAutoSaveMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [socialTab, setSocialTab] = useState<'twitter' | 'whatsapp'>('twitter');
  const [slugManual, setSlugManual] = useState(false);
  const [seoTitleManual, setSeoTitleManual] = useState(false);
  const [seoDescManual, setSeoDescManual] = useState(false);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // author list for dropdown (admin only)
  const [members, setMembers] = useState<{ id: string; full_name: string }[]>([]);
  useEffect(() => {
    if (member?.role !== 'admin') return;
    supabase.from('cswo_members').select('id,full_name').eq('status', 'approved').order('full_name')
      .then(({ data }) => setMembers((data ?? []) as { id: string; full_name: string }[]));
  }, [member]);

  // load posts
  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('cswo_posts').select('*').order('created_at', { ascending: false });
    if (filterStatus !== 'all') q = q.eq('status', filterStatus);
    if (filterCat) q = q.eq('category', filterCat);
    const { data } = await q;
    setPosts((data ?? []) as CswoPost[]);
    setLoading(false);
  }, [filterStatus, filterCat]);
  useEffect(() => { load(); }, [load]);

  // auto-slug (new posts only)
  useEffect(() => {
    if (!slugManual && !editingId && form.title) setForm(f => ({ ...f, slug: slugify(f.title) }));
  }, [form.title, slugManual, editingId]);

  // SEO auto-fill from title
  useEffect(() => {
    if (!seoTitleManual) setForm(f => ({ ...f, meta_title: f.title.slice(0, 60) }));
  }, [form.title, seoTitleManual]);

  // SEO auto-fill from content
  useEffect(() => {
    if (!seoDescManual) {
      const plain = stripHtml(form.content).trim();
      setForm(f => ({ ...f, meta_description: plain.slice(0, 160) }));
    }
  }, [form.content, seoDescManual]);

  // auto-save (existing posts, debounced 3 s)
  useEffect(() => {
    if (!editingId || !form.title) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSaveMsg(tr('Unsaved…', 'সংরক্ষিত হয়নি…'));
    autoSaveTimer.current = setTimeout(async () => {
      if (!member) return;
      await supabase.from('cswo_posts').update({
        title: form.title, content: form.content, category: form.category, tags: form.tags,
        featured_image: form.featured_image || null, slug: form.slug || null,
        meta_title: form.meta_title || null, meta_description: form.meta_description || null,
        focus_keyword: form.focus_keyword || null,
        og_title: form.og_title || null, og_image: form.og_image || null, share_snippet: form.share_snippet || null,
        is_featured: form.is_featured, is_sticky: form.is_sticky,
        author_name: form.author_name || member.full_name, status: form.status,
        schedule_at: form.schedule_at ? new Date(form.schedule_at).toISOString() : null,
      }).eq('id', editingId);
      setAutoSaveMsg(tr('Auto-saved ✓', 'স্বয়ংক্রিয়ভাবে সংরক্ষিত ✓'));
      load();
    }, 3000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, form.content, form.category]);

  // warnings — only computed when user has started editing
  const hasStartedEditing = !!(form.title || (form.content && form.content !== '<p></p>'));
  const warnings: string[] = [];
  if (view === 'editor' && hasStartedEditing) {
    if (!form.title) warnings.push(tr('Missing title', 'শিরোনাম নেই'));
    if (!form.featured_image) warnings.push(tr('No featured image', 'কোনো ছবি নেই'));
    if (stripHtml(form.content).trim().length < 100) warnings.push(tr('Content too short', 'বিষয়বস্তু অনেক ছোট'));
  }

  // core save
  const doSave = async (action?: 'draft') => {
    setAttemptedSave(true);
    if (!member || !form.title) return;
    setSaving(true); setSaveError(null);

    let resolvedStatus: PostStatus;
    let publishedDate: string | undefined;
    let scheduleAt: string | null = null;

    if (action === 'draft') {
      resolvedStatus = 'draft';
    } else if (form.schedule_at) {
      const chosen = new Date(form.schedule_at);
      if (chosen <= new Date()) { resolvedStatus = 'published'; publishedDate = chosen.toISOString(); }
      else { resolvedStatus = 'scheduled'; scheduleAt = chosen.toISOString(); }
    } else {
      resolvedStatus = 'published';
      if (!editingId || !form.original_published_date) publishedDate = new Date().toISOString();
    }

    const payload: Record<string, unknown> = {
      title: form.title, content: form.content, category: form.category, tags: form.tags,
      featured_image: form.featured_image || null, slug: form.slug || null,
      meta_title: form.meta_title || null, meta_description: form.meta_description || null,
      focus_keyword: form.focus_keyword || null,
      og_title: form.og_title || null, og_image: form.og_image || null, share_snippet: form.share_snippet || null,
      is_featured: form.is_featured, is_sticky: form.is_sticky,
      author_name: form.author_name || member.full_name, status: resolvedStatus, schedule_at: scheduleAt,
    };
    if (publishedDate !== undefined) payload.published_date = publishedDate;

    if (editingId) {
      const { error } = await supabase.from('cswo_posts').update(payload).eq('id', editingId);
      if (error) { setSaving(false); setSaveError(error.message); return; }
    } else {
      let ins: Record<string, unknown> = { ...payload, author_id: member.id };
      let { data, error } = await supabase.from('cswo_posts').insert(ins).select('id').single();
      if (error?.code === '23505') {
        ins = { ...ins, slug: (ins.slug as string || slugify(form.title)) + '-' + Date.now().toString(36).slice(-4) };
        setForm(f => ({ ...f, slug: ins.slug as string }));
        ({ data, error } = await supabase.from('cswo_posts').insert(ins).select('id').single());
      }
      if (error) { setSaving(false); setSaveError(error.message); return; }
      if (data) setEditingId((data as { id: string }).id);
    }
    setSaving(false); setAutoSaveMsg(tr('Saved ✓', 'সংরক্ষিত ✓')); load();
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    setUploading(true);
    const compressed = await compressImage(file, 'post');
    const { error } = await supabase.storage.from('post-images').upload(path, compressed);
    setUploading(false);
    if (error) { setSaveError(tr(`Upload failed: ${error.message}`, `আপলোড ব্যর্থ: ${error.message}`)); return null; }
    return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
  };

  const mainLabel = () => {
    if (saving) return tr('Saving…', 'সংরক্ষণ…');
    if (!form.schedule_at) return tr('Publish Now', 'এখনই প্রকাশ করুন');
    return new Date(form.schedule_at) <= new Date()
      ? tr('Publish (Chosen Date)', 'নির্বাচিত তারিখে প্রকাশ')
      : tr('Schedule', 'নির্ধারণ করুন');
  };

  const openEditor = (p?: CswoPost) => {
    if (p) {
      setForm(fromPost(p, member?.full_name ?? ''));
      setEditingId(p.id);
      setSlugManual(true);
      setSeoTitleManual(!!p.meta_title);
      setSeoDescManual(!!p.meta_description);
    } else {
      setForm({ ...EMPTY, author_name: member?.full_name ?? '' });
      setEditingId(null);
      setSlugManual(false); setSeoTitleManual(false); setSeoDescManual(false);
    }
    setAutoSaveMsg(''); setSeoOpen(false); setSocialOpen(false);
    setSaveError(null); setAttemptedSave(false);
    setView('editor');
  };

  const clonePost = (p: CswoPost) => {
    setForm({ ...fromPost(p, member?.full_name ?? ''), title: tr(`Copy of ${p.title}`, `${p.title} (কপি)`), status: 'draft', schedule_at: '', original_published_date: '' });
    setEditingId(null); setSlugManual(false); setSeoTitleManual(false); setSeoDescManual(false);
    setAutoSaveMsg(''); setSeoOpen(false); setSocialOpen(false); setSaveError(null); setAttemptedSave(false);
    setView('editor');
  };

  const addTag = () => {
    const tag = form.tagInput.trim();
    if (tag && !form.tags.includes(tag)) setForm(f => ({ ...f, tags: [...f.tags, tag], tagInput: '' }));
    else setForm(f => ({ ...f, tagInput: '' }));
  };
  const removeTag = (tag: string) => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== tag) }));

  const toggleSel = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(visible.map(p => p.id)));

  const bulkAction = async (act: 'publish' | 'archive' | 'trash' | 'delete') => {
    if (!selected.size) return;
    if (act === 'delete') {
      if (!confirm(tr(`Delete ${selected.size} posts?`, `${selected.size}টি পোস্ট মুছবেন?`))) return;
      await supabase.from('cswo_posts').delete().in('id', [...selected]);
    } else {
      const st: PostStatus = act === 'publish' ? 'published' : act === 'archive' ? 'archived' : 'trash';
      await supabase.from('cswo_posts').update({ status: st }).in('id', [...selected]);
    }
    setSelected(new Set()); load();
  };

  const removePost = async (id: string) => {
    if (!confirm(tr('Delete this post?', 'পোস্টটি মুছবেন?'))) return;
    await supabase.from('cswo_posts').delete().eq('id', id); load();
  };

  const seedStaticPosts = async () => {
    if (!confirm(tr('Import 44 static posts? Skips duplicates.', '৪৪টি পোস্ট যোগ করবেন?'))) return;
    setSeeding(true); setSeedResult(null);
    const { data: ex } = await supabase.from('cswo_posts').select('slug');
    const exSlugs = new Set((ex ?? []).map((p: { slug: string }) => p.slug));
    const rows = STATIC_POSTS.filter(p => !exSlugs.has(p.slug)).map(p => ({
      title: p.title, content: p.content, category: p.category, tags: p.tags,
      featured_image: p.featuredImage, author_name: p.author,
      published_date: p.publishedDate, slug: p.slug, status: 'published' as PostStatus,
    }));
    if (rows.length) await supabase.from('cswo_posts').insert(rows);
    setSeeding(false);
    setSeedResult(tr(`Done — ${rows.length} imported, ${STATIC_POSTS.length - rows.length} existed.`, `সম্পন্ন — ${rows.length}টি যোগ হয়েছে।`));
    load();
  };

  const visible = posts.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.author_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  // derived OG effective values for preview
  const ogTitle = form.og_title || form.meta_title || form.title;
  const ogImage = form.og_image || form.featured_image;
  const ogDesc  = form.share_snippet || form.meta_description || stripHtml(form.content).trim().slice(0, 130);

  // ── EDITOR VIEW ────────────────────────────────────────────────────────────
  if (view === 'editor') {
    const isAdmin = member?.role === 'admin';
    return (
      <div className="-m-6 flex min-h-[calc(100vh-64px)] flex-col bg-white">

        {/* ── Top bar ── */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-white px-6 py-3 shadow-sm">
          <button onClick={() => { setView('list'); setAutoSaveMsg(''); }}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> {tr('All Posts', 'সব পোস্ট')}
          </button>
          <div className="flex items-center gap-2.5">
            {autoSaveMsg && <span className="text-xs text-gray-400">{autoSaveMsg}</span>}
            {/* warning badge — always visible so user knows issues exist; clicking reveals pills */}
            {warnings.length > 0 && (
              <button onClick={() => setAttemptedSave(true)}
                className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200 transition-colors">
                ⚠ {warnings.length} {tr('warning', 'সতর্কতা')}{warnings.length > 1 ? 's' : ''}
              </button>
            )}
            <button onClick={() => doSave('draft')} disabled={saving || !form.title}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40">
              {tr('Save Draft', 'খসড়া')}
            </button>
            <button onClick={() => doSave()} disabled={saving || !form.title}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-40">
              {mainLabel()}
            </button>
          </div>
        </div>

        {/* ── Warning pills (appear only after first save attempt) ── */}
        {attemptedSave && warnings.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b bg-amber-50 px-6 py-3">
            {warnings.map(w => (
              <span key={w} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-700 shadow-sm ring-1 ring-amber-200">
                ⚠ {w}
              </span>
            ))}
          </div>
        )}

        {/* ── Error banner ── */}
        {saveError && (
          <div className="border-b bg-red-50 px-6 py-3 text-sm font-medium text-red-700">
            ✕ {saveError}
          </div>
        )}

        {/* ── Two-panel body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT: title + editor */}
          <div className="flex-1 overflow-y-auto bg-white">
            {/* Title area — Blogger-style bottom-border focus */}
            <div className="border-b px-8 pt-8 pb-0">
              <input
                className="w-full border-0 border-b-2 border-transparent bg-transparent pb-3 font-bengali text-[26px] font-bold text-gray-900 placeholder-gray-300 outline-none transition-colors focus:border-orange-500"
                placeholder={tr('Post title…', 'শিরোনাম লিখুন…')}
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="px-8 py-6">
              <RichEditor
                value={form.content}
                onChange={html => setForm(f => ({ ...f, content: html }))}
                placeholder={tr('Write your post content here…', 'পোস্টের বিষয়বস্তু লিখুন…')}
                minHeight={460}
              />
            </div>
          </div>

          {/* RIGHT: Post Settings sidebar */}
          <aside className="w-[290px] flex-shrink-0 overflow-y-auto border-l bg-gray-50 px-4 py-5 space-y-4">

            {/* ── PUBLISH ── */}
            <SidePanel label={tr('Publish', 'প্রকাশনা')}>
              <label className="mb-1 block text-xs font-medium text-gray-500">{tr('Status', 'অবস্থা')}</label>
              <select className="input w-full text-sm" value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as PostStatus }))}>
                <option value="draft">{tr('Draft', 'খসড়া')}</option>
                <option value="pending">{tr('Pending Review', 'পর্যালোচনা অপেক্ষমাণ')}</option>
                <option value="scheduled">{tr('Scheduled', 'নির্ধারিত')}</option>
                <option value="published">{tr('Published', 'প্রকাশিত')}</option>
                <option value="archived">{tr('Archived', 'আর্কাইভ')}</option>
                <option value="trash">{tr('Trash', 'ট্র্যাশ')}</option>
              </select>

              <label className="mb-1 mt-3 block text-xs font-medium text-gray-500">{tr('Publish / Schedule Date & Time', 'তারিখ ও সময়')}</label>
              <input type="datetime-local" className="input w-full text-sm" value={form.schedule_at}
                onChange={e => setForm(f => ({ ...f, schedule_at: e.target.value }))} />
              {form.schedule_at && (() => {
                const d = new Date(form.schedule_at), past = d <= new Date();
                return <p className={`mt-1 text-[11px] ${past ? 'text-green-600' : 'text-amber-600'}`}>
                  {past ? tr('✓ Will publish with this date', '✓ এই তারিখে প্রকাশিত হবে')
                        : tr('⏰ Scheduled for future', '⏰ ভবিষ্যতে নির্ধারিত')}: {d.toLocaleString(lang === 'bn' ? 'bn-IN' : 'en-IN')}
                </p>;
              })()}

              <div className="mt-3 flex gap-4">
                {[{ key: 'is_featured', icon: '★', label: tr('Featured', 'বৈশিষ্ট্যযুক্ত') },
                  { key: 'is_sticky',   icon: '📌', label: tr('Sticky', 'স্থায়ী') }].map(({ key, icon, label }) => (
                  <label key={key} className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-600">
                    <input type="checkbox" className="rounded border-gray-300"
                      checked={form[key as 'is_featured' | 'is_sticky']}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                    {icon} {label}
                  </label>
                ))}
              </div>
            </SidePanel>

            {/* ── FEATURED IMAGE ── */}
            <SidePanel label={tr('Featured Image', 'প্রধান ছবি')}>
              <input className="input w-full text-sm" placeholder="https://…" value={form.featured_image}
                onChange={e => setForm(f => ({ ...f, featured_image: e.target.value }))} />
              <label className={`mt-1.5 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-200 py-2 text-xs font-medium text-gray-500 transition-colors hover:border-orange-400 hover:text-orange-600 ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
                <input type="file" accept="image/*" className="sr-only"
                  onChange={async e => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const url = await uploadImage(file);
                    if (url) setForm(f => ({ ...f, featured_image: url }));
                    e.target.value = '';
                  }} />
                {uploading ? tr('Uploading…', 'আপলোড হচ্ছে…') : `↑ ${tr('Upload image', 'ছবি আপলোড')}`}
              </label>
              {form.featured_image && (
                <div className="relative mt-2">
                  <img src={form.featured_image} alt="" className="w-full rounded-lg object-cover" style={{ maxHeight: 120 }}
                    onError={e => { e.currentTarget.style.display = 'none'; }} />
                  <button type="button" onClick={() => setForm(f => ({ ...f, featured_image: '' }))}
                    className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white hover:bg-black/80">✕</button>
                </div>
              )}
            </SidePanel>

            {/* ── CATEGORY ── */}
            <SidePanel label={tr('Category', 'বিভাগ')}>
              <CategorySelector value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} allowAdd={isAdmin} />
            </SidePanel>

            {/* ── TAGS ── */}
            <SidePanel label={tr('Tags', 'ট্যাগ')}>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-orange-200">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="text-orange-400 hover:text-orange-700 leading-none">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input className="input flex-1 text-sm" placeholder={tr('Add tag…', 'ট্যাগ যোগ করুন…')}
                  value={form.tagInput}
                  onChange={e => setForm(f => ({ ...f, tagInput: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }} />
                <button type="button" onClick={addTag} className="rounded-lg bg-gray-100 px-3 text-sm font-semibold text-gray-600 hover:bg-gray-200">+</button>
              </div>
              <p className="mt-1 text-[10px] text-gray-400">{tr('Enter or , to add', 'Enter বা , চাপুন')}</p>
            </SidePanel>

            {/* ── AUTHOR ── */}
            <SidePanel label={tr('Author', 'লেখক')}>
              {isAdmin ? (
                <select className="input w-full text-sm" value={form.author_name}
                  onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))}>
                  <option value="">{tr('— Select member —', '— সদস্য নির্বাচন —')}</option>
                  {members.map(m => <option key={m.id} value={m.full_name}>{m.full_name}</option>)}
                  {form.author_name && !members.find(m => m.full_name === form.author_name) && (
                    <option value={form.author_name}>{form.author_name}</option>
                  )}
                </select>
              ) : (
                <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">{form.author_name}</div>
              )}
            </SidePanel>

            {/* ── SEO ── */}
            <Accordion label="SEO" open={seoOpen} onToggle={() => setSeoOpen(v => !v)}>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{tr('Slug', 'স্লাগ')}</label>
                <input className="input w-full font-mono text-sm" value={form.slug}
                  onChange={e => { setSlugManual(true); setForm(f => ({ ...f, slug: e.target.value })); }} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{tr('Meta Title', 'মেটা শিরোনাম')}</label>
                <input className="input w-full text-sm" value={form.meta_title} maxLength={60}
                  placeholder={tr('Auto-filled from title', 'শিরোনাম থেকে স্বয়ংক্রিয়')}
                  onChange={e => { setSeoTitleManual(true); setForm(f => ({ ...f, meta_title: e.target.value })); }} />
                <p className="mt-0.5 text-right text-[10px] text-gray-400">{form.meta_title.length}/60</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{tr('Meta Description', 'মেটা বিবরণ')}</label>
                <textarea className="input w-full text-sm" rows={3} value={form.meta_description} maxLength={160}
                  placeholder={tr('Auto-filled from content', 'বিষয়বস্তু থেকে স্বয়ংক্রিয়')}
                  onChange={e => { setSeoDescManual(true); setForm(f => ({ ...f, meta_description: e.target.value })); }} />
                <p className="mt-0.5 text-right text-[10px] text-gray-400">{form.meta_description.length}/160</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{tr('Focus Keyword', 'মূল কীওয়ার্ড')}</label>
                <input className="input w-full text-sm" value={form.focus_keyword}
                  onChange={e => setForm(f => ({ ...f, focus_keyword: e.target.value }))}
                  placeholder={tr('e.g. Narajole charity', 'যেমন: নাড়াজোল দাতব্য')} />
              </div>
            </Accordion>

            {/* ── SOCIAL SHARING ── */}
            <Accordion label={tr('Social Sharing', 'সোশ্যাল শেয়ারিং')} open={socialOpen} onToggle={() => setSocialOpen(v => !v)}>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{tr('OG Title (override)', 'OG শিরোনাম (ওভাররাইড)')}</label>
                <input className="input w-full text-sm" value={form.og_title}
                  placeholder={tr('Defaults to meta title / post title', 'মেটা শিরোনাম থেকে পূরণ হবে')}
                  onChange={e => setForm(f => ({ ...f, og_title: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{tr('Social Image (override)', 'সোশ্যাল ছবি (ওভাররাইড)')}</label>
                <input className="input w-full text-sm" value={form.og_image} placeholder="https://…"
                  onChange={e => setForm(f => ({ ...f, og_image: e.target.value }))} />
                {ogImage && <img src={ogImage} alt="" className="mt-1 w-full rounded-lg object-cover" style={{ maxHeight: 80 }} onError={e => { e.currentTarget.style.display = 'none'; }} />}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{tr('Share Snippet', 'শেয়ার বিবরণ')}</label>
                <textarea className="input w-full text-sm" rows={2} value={form.share_snippet} maxLength={200}
                  placeholder={tr('Custom excerpt for sharing (defaults to meta description)', 'কাস্টম বিবরণ')}
                  onChange={e => setForm(f => ({ ...f, share_snippet: e.target.value }))} />
                <p className="mt-0.5 text-right text-[10px] text-gray-400">{form.share_snippet.length}/200</p>
              </div>

              {/* Preview tabs */}
              <div className="mt-3">
                <div className="mb-2 flex gap-1">
                  {(['twitter', 'whatsapp'] as const).map(tab => (
                    <button key={tab} type="button" onClick={() => setSocialTab(tab)}
                      className={`rounded-full px-3 py-0.5 text-[11px] font-semibold transition-colors ${socialTab === tab ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {tab === 'twitter' ? '𝕏 Twitter' : '💬 WhatsApp'}
                    </button>
                  ))}
                </div>
                {socialTab === 'twitter'
                  ? <TwitterPreview title={ogTitle} desc={ogDesc} image={ogImage} />
                  : <WhatsAppPreview title={ogTitle} desc={ogDesc} image={ogImage} />}
              </div>
            </Accordion>

          </aside>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{t('a.posts')}</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={seedStaticPosts} disabled={seeding}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60">
            {seeding ? tr('Importing…', 'যোগ হচ্ছে…') : tr('Import Static Posts', 'স্ট্যাটিক পোস্ট যোগ')}
          </button>
          <button onClick={() => openEditor()} className="btn-primary">{tr('+ New Post', '+ নতুন পোস্ট')}</button>
        </div>
      </div>

      {seedResult && <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 ring-1 ring-green-200">{seedResult}</div>}

      <div className="mb-4 flex flex-wrap gap-3">
        <input className="input min-w-[200px] flex-1 text-sm" placeholder={tr('Search…', 'খুঁজুন…')} value={search} onChange={e => setSearch(e.target.value)} />
        <CategorySelector value={filterCat} onChange={setFilterCat} allowAdd={false} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map(tab => (
          <button key={tab.key} onClick={() => setFilterStatus(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filterStatus === tab.key ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {tr(tab.en, tab.bn)}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-orange-50 px-4 py-2.5 ring-1 ring-orange-200">
          <span className="text-sm font-semibold text-orange-800">{selected.size} {tr('selected', 'নির্বাচিত')}</span>
          {[{ a: 'publish' as const, l: tr('Publish', 'প্রকাশ'), c: 'bg-green-600' },
            { a: 'archive' as const, l: tr('Archive', 'আর্কাইভ'), c: 'bg-gray-500' },
            { a: 'trash'   as const, l: tr('Trash', 'ট্র্যাশ'),   c: 'bg-amber-600' },
            { a: 'delete'  as const, l: tr('Delete', 'মুছুন'),     c: 'bg-red-600' }].map(({ a, l, c }) => (
            <button key={a} onClick={() => bulkAction(a)} className={`${c} rounded-full px-3 py-1 text-xs font-semibold text-white`}>{l}</button>
          ))}
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-orange-600 hover:underline">{tr('Clear', 'বাতিল')}</button>
        </div>
      )}

      {loading ? <ListSkeleton rows={6} /> : visible.length === 0 ? (
        <p className="py-12 text-center text-gray-400">{tr('No posts found.', 'কোনো পোস্ট পাওয়া যায়নি।')}</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-3 px-4 py-1">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
              checked={selected.size === visible.length && visible.length > 0}
              onChange={e => e.target.checked ? selectAll() : setSelected(new Set())} />
            <span className="text-xs text-gray-400">{tr('Select all', 'সব নির্বাচন')}</span>
          </div>
          {visible.map(p => (
            <div key={p.id} className={`flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 transition-shadow hover:shadow-md ${selected.has(p.id) ? 'ring-orange-300' : 'ring-gray-100'}`}>
              <input type="checkbox" className="h-4 w-4 flex-shrink-0 rounded border-gray-300" checked={selected.has(p.id)} onChange={() => toggleSel(p.id)} />
              {p.featured_image && (
                <img src={p.featured_image} alt="" className="h-12 w-16 flex-shrink-0 rounded-lg object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="max-w-[240px] truncate font-semibold text-gray-900">{p.title}</span>
                  <StatusBadge status={p.status} />
                  {p.is_featured && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">★</span>}
                  {p.is_sticky   && <span className="rounded-full bg-blue-100   px-2 py-0.5 text-[10px] font-semibold text-blue-700">📌</span>}
                </div>
                <p className="mt-0.5 text-xs text-gray-400">
                  {p.category} · {p.author_name || t('common.admin')} · {fmt.date(p.created_at)}
                  {p.schedule_at && <span className="ml-2 text-amber-500">⏰ {new Date(p.schedule_at).toLocaleString()}</span>}
                </p>
              </div>
              <div className="flex flex-shrink-0 gap-3 text-sm">
                <button onClick={() => openEditor(p)} className="font-medium text-blue-600 hover:underline">{t('common.edit')}</button>
                <button onClick={() => clonePost(p)} className="font-medium text-gray-400 hover:text-gray-700 hover:underline">{tr('Clone', 'কপি')}</button>
                <button onClick={() => removePost(p.id)} className="font-medium text-red-500 hover:underline">{t('common.delete')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared sidebar primitives ────────────────────────────────────────────────
function SidePanel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      {children}
    </div>
  );
}
function Accordion({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <button type="button" onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 hover:bg-gray-50">
        {label} <span className="text-gray-300">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="border-t px-4 pb-4 pt-3 space-y-3">{children}</div>}
    </div>
  );
}
