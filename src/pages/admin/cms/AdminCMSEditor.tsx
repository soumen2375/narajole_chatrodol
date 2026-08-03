import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoPost, PostStatus, PostType, PostVisibility } from '@/types';
import { compressImage } from '@/lib/imageCompression';
import BlockEditor from '@/components/admin/cms/BlockEditor';
import EventSettingsPanel, { EMPTY_EVENT_SETTINGS } from '@/components/admin/cms/EventSettingsPanel';
import type { EventSettings } from '@/components/admin/cms/EventSettingsPanel';
import RevisionHistoryPanel from '@/components/admin/cms/RevisionHistoryPanel';
import SEOPanel from '@/components/admin/cms/SEOPanel';
import MediaPickerModal from '@/components/admin/cms/MediaPickerModal';
import CategorySelector from '@/components/admin/CategorySelector';
import {
  ArrowLeft, Eye, Save, Rocket, Star, Pin, Globe, Lock, Users,
  Clock, BookOpen, Image, X, Upload, AlertTriangle, Check, Calendar,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
function slugify(t: string) {
  return t
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}
function stripHtml(h: string) { return h.replace(/<[^>]+>/g, ''); }

interface EditorForm {
  title: string;
  excerpt: string;
  content: string;
  post_type: PostType;
  category: string;
  tags: string[];
  tagInput: string;
  featured_image: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  canonical_url: string;
  og_title: string;
  og_image: string;
  share_snippet: string;
  status: PostStatus;
  visibility: PostVisibility;
  schedule_at: string;
  is_featured: boolean;
  is_sticky: boolean;
  author_name: string;
  language: string;
  published_date: string;
  original_published_date: string;
  eventSettings: EventSettings;
}

const EMPTY: EditorForm = {
  title: '', excerpt: '', content: '', post_type: 'general', category: 'News',
  tags: [], tagInput: '', featured_image: '', slug: '',
  meta_title: '', meta_description: '', focus_keyword: '', canonical_url: '',
  og_title: '', og_image: '', share_snippet: '',
  status: 'draft', visibility: 'public', schedule_at: '',
  published_date: new Date().toISOString().slice(0, 16),
  is_featured: false, is_sticky: false, author_name: '', language: 'en',
  original_published_date: '', eventSettings: { ...EMPTY_EVENT_SETTINGS },
};

function fromPost(p: CswoPost, fallback: string): EditorForm {
  const pubDateStr = p.published_date
    ? new Date(p.published_date).toISOString().slice(0, 16)
    : new Date(p.created_at).toISOString().slice(0, 16);

  return {
    title: p.title, excerpt: p.excerpt ?? '', content: p.content,
    post_type: p.post_type ?? 'general', category: p.category,
    tags: Array.isArray(p.tags) ? p.tags : [], tagInput: '',
    featured_image: p.featured_image ?? '', slug: p.slug ?? '',
    meta_title: p.meta_title ?? '', meta_description: p.meta_description ?? '',
    focus_keyword: p.focus_keyword ?? '', canonical_url: p.canonical_url ?? '',
    og_title: p.og_title ?? '', og_image: p.og_image ?? '', share_snippet: p.share_snippet ?? '',
    status: p.status, visibility: p.visibility ?? 'public',
    schedule_at: p.schedule_at ? new Date(p.schedule_at).toISOString().slice(0, 16) : '',
    published_date: pubDateStr,
    is_featured: p.is_featured ?? false, is_sticky: p.is_sticky ?? false,
    author_name: p.author_name ?? fallback, language: p.language ?? 'en',
    original_published_date: p.published_date ?? '',
    eventSettings: { ...EMPTY_EVENT_SETTINGS },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar panel wrapper
function SidePanel({ label, icon, children, defaultOpen = true }: {
  label: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          {icon} {label}
        </span>
        <span className="text-gray-300 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="border-t px-4 pb-4 pt-3 space-y-2">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Social preview
function SocialPreview({ title, desc, image }: { title: string; desc: string; image: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white text-xs shadow-sm">
      {image ? (
        <img src={image} alt="" className="h-28 w-full object-cover" onError={e => { e.currentTarget.style.display='none'; }} />
      ) : (
        <div className="flex h-20 items-center justify-center bg-gray-100 text-[10px] text-gray-400">No OG image</div>
      )}
      <div className="p-2.5">
        <p className="truncate font-semibold text-gray-900">{title || 'Post title'}</p>
        <p className="mt-0.5 line-clamp-2 text-gray-500">{desc || 'Post description…'}</p>
        <p className="mt-1 text-[10px] text-gray-400">{window.location.hostname}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminCMSEditor() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { member } = useAuth();
  const isNew = !id;
  const basePath = location.pathname.startsWith('/member') ? '/member/cms' : '/admin/cms';

  const [form, setForm] = useState<EditorForm>({ ...EMPTY, author_name: member?.full_name ?? '' });
  const [editingId, setEditingId] = useState<string | null>(id ?? null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autoSaveMsg, setAutoSaveMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [socialPreviewOpen, setSocialPreviewOpen] = useState(false);
  const [members, setMembers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadedIdRef = useRef<string | null>(null);

  // Load members for author selector
  useEffect(() => {
    if (member?.role !== 'admin') return;
    supabase.from('cswo_members').select('id,full_name').eq('status','approved').order('full_name')
      .then(({ data }) => setMembers((data ?? []) as { id: string; full_name: string }[]));
  }, [member?.role]);

  // Load existing post with LocalStorage draft fallback
  useEffect(() => {
    if (!id || loadedIdRef.current === id) return;
    loadedIdRef.current = id;

    // Check local draft first
    const draftKey = `cswo_draft_${id}`;
    const localDraft = localStorage.getItem(draftKey);

    supabase.from('cswo_posts').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (data) {
          const dbForm = fromPost(data as CswoPost, member?.full_name ?? '');
          if (localDraft) {
            try {
              const parsed = JSON.parse(localDraft);
              setForm(parsed);
              setAutoSaveMsg('Restored unsaved draft');
            } catch {
              setForm(dbForm);
            }
          } else {
            setForm(dbForm);
          }
        }
        setLoading(false);
      });
  }, [id, member?.full_name]);

  // Auto-save: sync to LocalStorage immediately + debounced cloud upload
  useEffect(() => {
    if (!form.title) return;
    const key = `cswo_draft_${editingId || 'new'}`;
    try {
      localStorage.setItem(key, JSON.stringify(form));
    } catch { /* storage full fallback */ }

    if (!editingId) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSaveMsg('Unsaved changes…');

    autoSaveTimer.current = setTimeout(async () => {
      if (!member) return;
      const chosenPubDate = form.published_date
        ? (form.published_date.includes('T') ? form.published_date + ':00' : form.published_date)
        : new Date().toISOString();

      const computedSlug = slugify(form.slug || form.title) || `post-${Date.now().toString(36)}`;

      await supabase.from('cswo_posts').update({
        title: form.title,
        content: form.content,
        excerpt: form.excerpt || null,
        category: form.category,
        tags: form.tags,
        post_type: form.post_type,
        visibility: form.visibility,
        featured_image: form.featured_image || null,
        slug: computedSlug,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        focus_keyword: form.focus_keyword || null,
        canonical_url: form.canonical_url || null,
        og_title: form.og_title || null,
        og_image: form.og_image || null,
        share_snippet: form.share_snippet || null,
        is_featured: form.is_featured,
        is_sticky: form.is_sticky,
        author_name: form.author_name || member.full_name,
        status: form.status,
        published_date: chosenPubDate,
        schedule_at: form.schedule_at ? (form.schedule_at.includes('T') ? form.schedule_at + ':00' : form.schedule_at) : null,
      }).eq('id', editingId);

      setAutoSaveMsg('Auto-saved to cloud');
    }, 3000);

    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [form, editingId, member]);

  // Save revision
  const saveRevision = async (postId: string) => {
    const { data: latest } = await supabase
      .from('cswo_post_revisions').select('version').eq('post_id', postId)
      .order('version', { ascending: false }).limit(1).single();
    const version = ((latest as { version?: number } | null)?.version ?? 0) + 1;
    const snapshot = {
      title: form.title, content: form.content, excerpt: form.excerpt,
      post_type: form.post_type, category: form.category, tags: form.tags,
      featured_image: form.featured_image, meta_title: form.meta_title,
      meta_description: form.meta_description, status: form.status,
    };
    await supabase.from('cswo_post_revisions').insert({
      post_id: postId, version, snapshot, saved_by: member?.id ?? null,
    });
  };

  // Core save
  const doSave = async (action?: 'draft') => {
    if (!member || !form.title) { setSaveError('Title is required'); return; }
    setSaving(true); setSaveError(null);

    let resolvedStatus: PostStatus;
    let scheduleAt: string | null = null;
    const chosenPubDate = form.published_date
      ? (form.published_date.includes('T') ? form.published_date + ':00' : form.published_date)
      : new Date().toISOString();

    if (action === 'draft') {
      resolvedStatus = 'draft';
    } else if (new Date(chosenPubDate) > new Date()) {
      resolvedStatus = 'scheduled';
      scheduleAt = chosenPubDate;
    } else {
      resolvedStatus = 'published';
    }

    const computedSlug = slugify(form.slug || form.title) || `post-${Date.now().toString(36)}`;

    const payload: Record<string, unknown> = {
      title: form.title, content: form.content, excerpt: form.excerpt || null,
      category: form.category, tags: form.tags, post_type: form.post_type,
      visibility: form.visibility,
      featured_image: form.featured_image || null, slug: computedSlug,
      meta_title: form.meta_title || null, meta_description: form.meta_description || null,
      focus_keyword: form.focus_keyword || null, canonical_url: form.canonical_url || null,
      og_title: form.og_title || null, og_image: form.og_image || null,
      share_snippet: form.share_snippet || null,
      is_featured: form.is_featured, is_sticky: form.is_sticky,
      author_name: form.author_name || member.full_name,
      status: resolvedStatus, schedule_at: scheduleAt,
      published_date: chosenPubDate,
    };

    let finalId = editingId;

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
      finalId = (data as { id: string }).id;
      setEditingId(finalId);
      window.history.replaceState(null, '', `${basePath}/${finalId}/edit`);
    }

    // Save revision & clear local draft
    if (finalId) {
      localStorage.removeItem(`cswo_draft_${finalId}`);
      localStorage.removeItem('cswo_draft_new');
      await saveRevision(finalId);
    }

    setSaving(false);
    setAutoSaveMsg('Saved to cloud');
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    setUploading(true);
    const compressed = await compressImage(file, 'post');
    const { error } = await supabase.storage.from('post-images').upload(path, compressed);
    setUploading(false);
    if (error) { setSaveError(`Upload failed: ${error.message}`); return null; }
    return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
  };

  const addTag = () => {
    const tag = form.tagInput.trim();
    if (tag && !form.tags.includes(tag)) setForm(f => ({ ...f, tags: [...f.tags, tag], tagInput: '' }));
    else setForm(f => ({ ...f, tagInput: '' }));
  };

  const restoreRevision = (snapshot: Partial<CswoPost>) => {
    setForm(f => ({
      ...f,
      title: snapshot.title ?? f.title,
      content: snapshot.content ?? f.content,
      excerpt: snapshot.excerpt ?? f.excerpt,
      post_type: snapshot.post_type ?? f.post_type,
      category: snapshot.category ?? f.category,
      tags: snapshot.tags ?? f.tags,
      featured_image: snapshot.featured_image ?? f.featured_image,
      meta_title: snapshot.meta_title ?? f.meta_title,
      meta_description: snapshot.meta_description ?? f.meta_description,
    }));
    setAutoSaveMsg('Revision restored — review and save');
  };

  const publishLabel = () => {
    if (saving) return 'Saving…';
    if (!form.schedule_at) return 'Publish Now';
    return new Date(form.schedule_at) <= new Date() ? 'Publish' : 'Schedule';
  };

  const isAdmin = member?.role === 'admin';

  const ogTitle = form.og_title || form.meta_title || form.title;
  const ogImage = form.og_image || form.featured_image;
  const ogDesc  = form.share_snippet || form.meta_description || stripHtml(form.content).trim().slice(0, 130);

  // Content outline (extract headings from content)
  const outline = [...form.content.matchAll(/<(h[1-3])[^>]*>([^<]+)<\/h[1-3]>/gi)].map(m => ({
    level: parseInt(m[1].slice(1)), text: m[2],
  }));

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="-m-4 md:-m-8 -mt-4 md:-mt-8 flex h-[calc(100vh-64px)] md:h-[calc(100vh-76px)] flex-col overflow-hidden bg-white">

      {/* ── TOP BAR ── */}
      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b bg-white/95 backdrop-blur px-4 sm:px-6 py-3 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(basePath)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" /> All Content
          </button>
          <span className="text-gray-200">/</span>
          <span className="max-w-[150px] sm:max-w-xs truncate text-sm font-semibold text-gray-900">
            {form.title || (isNew ? 'New Post' : 'Edit Post')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {autoSaveMsg && (
            <span className={`hidden sm:flex items-center gap-1 text-xs ${
              autoSaveMsg.toLowerCase().includes('saved') ? 'text-green-600 font-medium' : 'text-gray-400'
            }`}>
              {autoSaveMsg.toLowerCase().includes('saved') && <Check className="h-3 w-3" />}
              {autoSaveMsg}
            </span>
          )}
          {saveError && (
            <span className="flex items-center gap-1 text-xs text-red-600 truncate max-w-[180px]">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> {saveError}
            </span>
          )}
          <button onClick={() => window.open(`/${form.slug || ''}`, '_blank')}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
          <button onClick={() => doSave('draft')} disabled={saving || !form.title}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40">
            <Save className="h-3.5 w-3.5" /> Save Draft
          </button>
          <button onClick={() => doSave()} disabled={saving || !form.title}
            className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-40 shadow-sm shadow-orange-200 transition-colors">
            <Rocket className="h-3.5 w-3.5" /> {publishLabel()}
          </button>
        </div>
      </div>

      {/* ── THREE-PANEL BODY ── */}
      <div className="flex flex-1 overflow-hidden min-w-0 flex-col md:flex-row">

        {/* LEFT: Content Outline Tree */}
        <aside className="hidden 2xl:block w-48 flex-shrink-0 overflow-y-auto border-r bg-gray-50/50 px-3 py-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Outline</p>
          {outline.length === 0 ? (
            <p className="text-[11px] text-gray-400 italic">No headings yet</p>
          ) : (
            <div className="space-y-0.5">
              {outline.map((item, i) => (
                <div key={i} className={`rounded py-1 text-[11px] leading-snug text-gray-600 hover:text-gray-900 cursor-pointer ${
                  item.level === 1 ? 'font-semibold' : item.level === 2 ? 'pl-3' : 'pl-5 text-gray-400'
                }`}>
                  {item.text}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 border-t pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Stats</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" /> ~{Math.max(1, Math.round(stripHtml(form.content).split(/\s+/).filter(Boolean).length / 200))} min read
            </p>
            <p className="flex items-center gap-1 text-xs text-gray-500">
              <BookOpen className="h-3 w-3" />
              {stripHtml(form.content).split(/\s+/).filter(Boolean).length} words
            </p>
          </div>
        </aside>

        {/* MIDDLE: Editor */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-white px-4 sm:px-6 py-6">
          <div className="mx-auto max-w-3xl space-y-5 w-full">

            {/* Title */}
            <input
              className="w-full border-0 border-b-2 border-transparent bg-transparent pb-3 text-2xl sm:text-[28px] font-bold text-gray-900 placeholder-gray-300 outline-none transition-colors focus:border-orange-400"
              placeholder="Post title…"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />

            {/* Excerpt */}
            <textarea
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-orange-400 focus:bg-white transition-all"
              placeholder="Write a short excerpt (optional — shown in cards and previews)…"
              rows={2}
              value={form.excerpt}
              onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
            />

            {/* Cover Image */}
            <div>
              {form.featured_image ? (
                <div className="group relative overflow-hidden rounded-xl">
                  <img src={form.featured_image} alt="Cover"
                    className="w-full rounded-xl object-cover" style={{ maxHeight: 280 }} />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setShowMedia(true)}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-100">
                      Change
                    </button>
                    <button onClick={() => setForm(f => ({ ...f, featured_image: '' }))}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setShowMedia(true)}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-8 text-gray-400 hover:border-orange-400 hover:text-orange-500 transition-colors"
                >
                  <Image className="h-7 w-7" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Add Cover Image</p>
                    <p className="text-xs text-gray-400">Click to open media library</p>
                  </div>
                  <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={e => e.stopPropagation()}>
                    <input type="file" accept="image/*" className="sr-only"
                      onChange={async e => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const url = await uploadImage(file);
                        if (url) setForm(f => ({ ...f, featured_image: url }));
                        e.target.value = '';
                      }} />
                    <Upload className="h-3.5 w-3.5" /> {uploading ? 'Uploading…' : 'Upload directly'}
                  </label>
                </div>
              )}
            </div>

            {/* Block Editor */}
            <BlockEditor
              value={form.content}
              onChange={html => setForm(f => ({ ...f, content: html }))}
              placeholder="Write your content here… Use the toolbar or click + for blocks."
              minHeight={480}
            />
          </div>
        </div>

        {/* RIGHT: Settings Panel */}
        <aside className="w-full md:w-80 lg:w-[310px] flex-shrink-0 overflow-y-auto border-l border-t md:border-t-0 bg-gray-50 px-3.5 sm:px-4 py-5 space-y-3">

          {/* PUBLISH */}
          <SidePanel label="Publish" icon={<Rocket className="h-3.5 w-3.5" />}>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
              <select className="input w-full text-sm" value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as PostStatus }))}>
                <option value="draft">Draft</option>
                <option value="pending">Pending Review</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Visibility</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                {([
                  { v: 'public' as PostVisibility, label: 'Public', Icon: Globe },
                  { v: 'members' as PostVisibility, label: 'Members', Icon: Users },
                  { v: 'private' as PostVisibility, label: 'Private', Icon: Lock },
                ]).map(({ v, label, Icon }) => (
                  <button key={v} type="button" onClick={() => setForm(f => ({ ...f, visibility: v }))}
                    className={`flex flex-1 items-center justify-center gap-1 py-2 transition-colors ${
                      form.visibility === v ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
                    }`}>
                    <Icon className="h-3 w-3" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Publishing Date</label>
              <input type="datetime-local" className="input w-full text-sm font-medium" value={form.published_date}
                onChange={e => setForm(f => ({ ...f, published_date: e.target.value, schedule_at: e.target.value }))} />
              {form.published_date && (() => {
                const d = new Date(form.published_date), isFuture = d > new Date();
                return (
                  <p className={`mt-1 flex items-center text-[11px] font-medium ${isFuture ? 'text-blue-600' : 'text-green-600'}`}>
                    {isFuture ? <Clock className="mr-1 h-3 w-3" /> : <Calendar className="mr-1 h-3 w-3" />}
                    {isFuture ? 'Scheduled for: ' : 'Official Date: '} {d.toLocaleString()}
                  </p>
                );
              })()}
            </div>

            <div className="flex gap-3 pt-1">
              {[
                { key: 'is_featured', Icon: Star, label: 'Featured', color: 'text-amber-500' },
                { key: 'is_sticky',   Icon: Pin,  label: 'Sticky',   color: 'text-blue-500' },
              ].map(({ key, Icon, label, color }) => (
                <label key={key} className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-600">
                  <input type="checkbox" className="rounded border-gray-300"
                    checked={form[key as 'is_featured' | 'is_sticky']}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                  <Icon className={`h-3.5 w-3.5 ${color}`} /> {label}
                </label>
              ))}
            </div>
          </SidePanel>



          {/* EVENT SETTINGS — only when type = event */}
          {form.post_type === 'event' && (
            <EventSettingsPanel
              value={form.eventSettings}
              onChange={v => setForm(f => ({ ...f, eventSettings: v }))}
            />
          )}

          {/* FEATURED IMAGE */}
          <SidePanel label="Featured Image" icon={<Image className="h-3.5 w-3.5" />}>
            <input className="input w-full text-xs font-mono" placeholder="https://…" value={form.featured_image}
              onChange={e => setForm(f => ({ ...f, featured_image: e.target.value }))} />
            <button type="button" onClick={() => setShowMedia(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-200 py-2 text-xs font-medium text-gray-500 hover:border-orange-400 hover:text-orange-600 transition-colors">
              <Image className="h-3.5 w-3.5" /> Open Media Library
            </button>
            <label className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-500 hover:border-orange-300 hover:text-orange-600 transition-colors ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
              <input type="file" accept="image/*" className="sr-only"
                onChange={async e => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const url = await uploadImage(file);
                  if (url) setForm(f => ({ ...f, featured_image: url }));
                  e.target.value = '';
                }} />
              <Upload className="h-3.5 w-3.5" /> {uploading ? 'Uploading…' : 'Quick Upload'}
            </label>
            {form.featured_image && (
              <div className="relative">
                <img src={form.featured_image} alt="" className="w-full rounded-lg object-cover" style={{ maxHeight: 100 }}
                  onError={e => { e.currentTarget.style.display='none'; }} />
                <button type="button" onClick={() => setForm(f => ({ ...f, featured_image: '' }))}
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white hover:bg-black/80">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </SidePanel>

          {/* CATEGORY */}
          <SidePanel label="Category">
            <CategorySelector value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} allowAdd={isAdmin} />
          </SidePanel>

          {/* TAGS */}
          <SidePanel label="Tags">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-orange-200">
                  {tag}
                  <button type="button" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== tag) }))}
                    className="text-orange-400 hover:text-orange-700 leading-none">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input className="input flex-1 text-sm" placeholder="Add tag…"
                value={form.tagInput}
                onChange={e => setForm(f => ({ ...f, tagInput: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }} />
              <button type="button" onClick={addTag}
                className="rounded-lg bg-gray-100 px-3 text-sm font-semibold text-gray-600 hover:bg-gray-200">+</button>
            </div>
            <p className="text-[10px] text-gray-400">Enter or , to add</p>
          </SidePanel>

          {/* AUTHOR */}
          {isAdmin ? (
            <SidePanel label="Author" icon={<Users className="h-3.5 w-3.5" />}>
              <select className="input w-full text-sm" value={form.author_name}
                onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))}>
                <option value="">— Select member —</option>
                {members.map(m => <option key={m.id} value={m.full_name}>{m.full_name}</option>)}
                {form.author_name && !members.find(m => m.full_name === form.author_name) && (
                  <option value={form.author_name}>{form.author_name}</option>
                )}
              </select>
            </SidePanel>
          ) : (
            <SidePanel label="Author">
              <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">{form.author_name}</div>
            </SidePanel>
          )}

          {/* SEO */}
          <SEOPanel
            title={form.title}
            content={form.content}
            slug={form.slug}
            onSlugChange={v => setForm(f => ({ ...f, slug: v }))}
            metaTitle={form.meta_title}
            onMetaTitleChange={v => setForm(f => ({ ...f, meta_title: v }))}
            metaDescription={form.meta_description}
            onMetaDescChange={v => setForm(f => ({ ...f, meta_description: v }))}
            focusKeyword={form.focus_keyword}
            onFocusKeywordChange={v => setForm(f => ({ ...f, focus_keyword: v }))}
            canonicalUrl={form.canonical_url}
            onCanonicalUrlChange={v => setForm(f => ({ ...f, canonical_url: v }))}
            featuredImage={form.featured_image}
          />

          {/* SOCIAL PREVIEW */}
          <div className="overflow-hidden rounded-xl border bg-white">
            <button type="button" onClick={() => setSocialPreviewOpen(v => !v)}
              className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                Social Preview
              </span>
              <span className="text-gray-300 text-xs">{socialPreviewOpen ? '▲' : '▼'}</span>
            </button>
            {socialPreviewOpen && (
              <div className="border-t px-4 pb-4 pt-3 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">OG Title (override)</label>
                  <input className="input w-full text-sm" value={form.og_title}
                    placeholder="Defaults to meta title"
                    onChange={e => setForm(f => ({ ...f, og_title: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Social Image</label>
                  <input className="input w-full text-xs font-mono" value={form.og_image} placeholder="https://…"
                    onChange={e => setForm(f => ({ ...f, og_image: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Share Snippet</label>
                  <textarea className="input w-full text-sm" rows={2} value={form.share_snippet} maxLength={200}
                    placeholder="Custom excerpt for sharing"
                    onChange={e => setForm(f => ({ ...f, share_snippet: e.target.value }))} />
                </div>
                <SocialPreview title={ogTitle} desc={ogDesc} image={ogImage} />
              </div>
            )}
          </div>

          {/* REVISION HISTORY */}
          <RevisionHistoryPanel postId={editingId} onRestore={restoreRevision} />

          {/* LANGUAGE */}
          <SidePanel label="Language" defaultOpen={false}>
            <select className="input w-full text-sm" value={form.language}
              onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
              <option value="en">English</option>
              <option value="bn">Bengali (বাংলা)</option>
            </select>
          </SidePanel>

        </aside>
      </div>

      {/* Media Picker Modal */}
      <MediaPickerModal
        open={showMedia}
        onClose={() => setShowMedia(false)}
        onSelect={url => setForm(f => ({ ...f, featured_image: url }))}
        title="Select Featured Image"
      />
    </div>
  );
}
