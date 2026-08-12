import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoPost, PostStatus, PostType, PostVisibility } from '@/types';
import { compressImage } from '@/lib/imageCompression';
import { mirrorExternalImage, isBlockedCdnUrl, type MirrorProgress } from '@/lib/mirrorImage';
import BlockEditor from '@/components/admin/cms/BlockEditor';
import EventSettingsPanel, { EMPTY_EVENT_SETTINGS } from '@/components/admin/cms/EventSettingsPanel';
import type { EventSettings } from '@/components/admin/cms/EventSettingsPanel';
import RevisionHistoryPanel from '@/components/admin/cms/RevisionHistoryPanel';
import SEOPanel from '@/components/admin/cms/SEOPanel';
import MediaPickerModal from '@/components/admin/cms/MediaPickerModal';
import CategorySelector from '@/components/admin/CategorySelector';
import {
  ArrowLeft, Eye, Save, Rocket, Star, Pin, Globe, Lock, Users,
  Clock, Image, X, Upload, AlertTriangle, Check, Calendar, ChevronUp, ChevronDown, Tag, Sliders,
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

function SidePanel({ label, icon, children, defaultOpen = true }: {
  label: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-all">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-orange-50/40 transition-colors">
        <span className="flex items-center gap-2 text-xs font-bold text-orange-600">
          {icon} {label}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-orange-500" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="border-t border-gray-100 px-4 pb-4 pt-3.5 space-y-3">{children}</div>}
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

  // Auto-mirror Facebook / Instagram / expiring CDN URLs on blur
  const [mirrorStatus, setMirrorStatus] = useState<MirrorProgress | null>(null);
  const handleImageUrlBlur = async (raw: string) => {
    if (!isBlockedCdnUrl(raw)) return;
    setMirrorStatus({ stage: 'fetching' });
    const permanent = await mirrorExternalImage(raw, setMirrorStatus);
    if (permanent !== raw) setForm(f => ({ ...f, featured_image: permanent }));
    setTimeout(() => setMirrorStatus(null), 4000);
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
      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-gray-200/80 bg-white/95 backdrop-blur px-4 sm:px-6 py-3.5 shadow-sm z-20">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => navigate(basePath)}
            className="flex items-center gap-1.5 font-semibold text-gray-600 hover:text-orange-600 transition-colors">
            <ArrowLeft className="h-4 w-4 text-gray-500" /> All Content
          </button>
          <span className="text-gray-300">/</span>
          <span className="font-bold text-orange-600 truncate max-w-[200px] sm:max-w-xs">
            {form.title || (isNew ? 'Create New Post' : 'Edit Post')}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
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
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            <Eye className="h-3.5 w-3.5 text-gray-500" /> Preview
          </button>
          <button onClick={() => doSave('draft')} disabled={saving || !form.title}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors">
            <Save className="h-3.5 w-3.5 text-gray-500" /> Save Draft
          </button>
          <button onClick={() => doSave()} disabled={saving || !form.title}
            className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-40 shadow-sm shadow-orange-200 transition-colors">
            <Rocket className="h-4 w-4" /> {publishLabel()}
          </button>
        </div>
      </div>

      {/* ── TWO-PANEL BODY ── */}
      <div className="flex flex-1 overflow-hidden min-w-0 flex-col md:flex-row bg-stone-50/50">

        {/* MIDDLE / MAIN: Editor Card */}
        <div className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="mx-auto max-w-4xl space-y-6 w-full rounded-2xl border border-gray-200/80 bg-white p-6 sm:p-7 shadow-sm">

            {/* Post Title */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Post Title <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 pr-16"
                  placeholder="Enter a catchy and clear title..."
                  value={form.title}
                  maxLength={120}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
                <span className="absolute right-3.5 bottom-3 text-[11px] text-gray-400 font-mono pointer-events-none">
                  {form.title.length}/120
                </span>
              </div>
            </div>

            {/* Short Excerpt */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Short Excerpt</label>
              <div className="relative">
                <textarea
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 pr-16 pb-7"
                  placeholder="Write a short excerpt (optional) – it will be shown in cards and previews."
                  rows={3}
                  maxLength={200}
                  value={form.excerpt}
                  onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                />
                <span className="absolute right-3.5 bottom-2.5 text-[11px] text-gray-400 font-mono pointer-events-none">
                  {form.excerpt.length}/200
                </span>
              </div>
            </div>

            {/* Cover Image */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Cover Image</label>
              {form.featured_image ? (
                <div className="group relative overflow-hidden rounded-2xl border border-gray-200">
                  <img src={form.featured_image} alt="Cover"
                    className="w-full rounded-2xl object-cover" style={{ maxHeight: 280 }} />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => setShowMedia(true)}
                      className="rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-100 shadow-sm">
                      Change Image
                    </button>
                    <button type="button" onClick={() => setForm(f => ({ ...f, featured_image: '' }))}
                      className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 shadow-sm">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setShowMedia(true)}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/20 py-8 px-4 text-center hover:bg-orange-50/40 transition-colors"
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                    <Image className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-semibold text-gray-700">Drag & drop an image here</p>
                  <span className="my-1 text-xs text-gray-400">or</span>
                  <button type="button" className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors">
                    <Image className="h-3.5 w-3.5" /> Browse Image
                  </button>
                  <p className="mt-3 text-[11px] text-gray-400">Recommended size: 1280×720px (16:9)</p>
                </div>
              )}
            </div>

            {/* Content / Block Editor */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Content <span className="text-red-500">*</span></label>
              <BlockEditor
                value={form.content}
                onChange={html => setForm(f => ({ ...f, content: html }))}
                placeholder="Start writing your content here..."
                minHeight={420}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Settings Panel */}
        <aside className="w-full md:w-80 lg:w-[320px] flex-shrink-0 overflow-y-auto border-l border-t md:border-t-0 bg-stone-50/60 px-4 py-6 space-y-3.5">

          {/* PUBLISH SETTINGS */}
          <SidePanel label="Publish Settings" icon={<Rocket className="h-4 w-4" />}>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
              <select className="input w-full text-sm font-medium" value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as PostStatus }))}>
                <option value="draft">Draft</option>
                <option value="pending">In Review</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Visibility</label>
              <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-medium bg-gray-50 p-0.5">
                {([
                  { v: 'public' as PostVisibility, label: 'Public', Icon: Globe },
                  { v: 'members' as PostVisibility, label: 'Members', Icon: Users },
                  { v: 'private' as PostVisibility, label: 'Private', Icon: Lock },
                ]).map(({ v, label, Icon }) => (
                  <button key={v} type="button" onClick={() => setForm(f => ({ ...f, visibility: v }))}
                    className={`flex flex-1 items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                      form.visibility === v ? 'bg-orange-600 text-white font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-200/60'
                    }`}>
                    <Icon className="h-3 w-3" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Publish Date</label>
              <div className="relative">
                <input type="datetime-local" className="input w-full text-xs font-medium" value={form.published_date}
                  onChange={e => setForm(f => ({ ...f, published_date: e.target.value, schedule_at: e.target.value }))} />
              </div>
              {form.published_date && (() => {
                const d = new Date(form.published_date), isFuture = d > new Date();
                return (
                  <p className={`mt-1.5 flex items-center text-[11px] font-medium ${isFuture ? 'text-blue-600' : 'text-green-600'}`}>
                    {isFuture ? <Clock className="mr-1 h-3 w-3" /> : <Calendar className="mr-1 h-3 w-3" />}
                    {isFuture ? 'Scheduled for: ' : 'Official Date: '} {d.toLocaleString()}
                  </p>
                );
              })()}
            </div>

            <div className="flex gap-4 pt-1">
              {[
                { key: 'is_featured', Icon: Star, label: 'Featured', color: 'text-amber-500' },
                { key: 'is_sticky',   Icon: Pin,  label: 'Sticky Post', color: 'text-blue-500' },
              ].map(({ key, Icon, label, color }) => (
                <label key={key} className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-600">
                  <input type="checkbox" className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    checked={form[key as 'is_featured' | 'is_sticky']}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                  <Icon className={`h-3.5 w-3.5 ${color}`} /> {label}
                </label>
              ))}
            </div>
          </SidePanel>

          {/* CATEGORY & TAGS */}
          <SidePanel label="Category & Tags" icon={<Tag className="h-4 w-4" />}>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Category</label>
              <CategorySelector value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} allowAdd={isAdmin} />
            </div>

            <div className="pt-2 border-t border-gray-100">
              <label className="mb-1 block text-xs font-semibold text-gray-700">Tags</label>
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
                <input className="input flex-1 text-xs" placeholder="Add tag and press Enter"
                  value={form.tagInput}
                  onChange={e => setForm(f => ({ ...f, tagInput: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }} />
                <button type="button" onClick={addTag}
                  className="rounded-lg bg-gray-100 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-200">+</button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Separate multiple tags with commas</p>
            </div>
          </SidePanel>

          {/* EVENT SETTINGS — only when type = event */}
          {form.post_type === 'event' && (
            <EventSettingsPanel
              value={form.eventSettings}
              onChange={v => setForm(f => ({ ...f, eventSettings: v }))}
            />
          )}

          {/* FEATURED IMAGE (OPTIONAL) */}
          <SidePanel label="Featured Image (Optional)" icon={<Image className="h-4 w-4" />}>
            <input
              className="input w-full text-xs font-mono"
              placeholder="https://…"
              value={form.featured_image}
              onChange={e => setForm(f => ({ ...f, featured_image: e.target.value }))}
              onBlur={e => handleImageUrlBlur(e.target.value)}
            />
            {/* Mirror status banner */}
            {mirrorStatus && (
              <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                mirrorStatus.stage === 'error' ? 'bg-red-50 text-red-700'
                  : mirrorStatus.stage === 'done' ? 'bg-green-50 text-green-700'
                  : 'bg-blue-50 text-blue-700'
              }`}>
                {mirrorStatus.stage === 'fetching' && '⏳ Saving a copy of image…'}
                {mirrorStatus.stage === 'uploading' && '⬆ Uploading to server…'}
                {mirrorStatus.stage === 'done' && '✓ Image saved permanently'}
                {mirrorStatus.stage === 'error' && '⚠ Could not copy image — URL saved but may expire.'}
              </div>
            )}
            {/* Warn if still a blocked CDN URL */}
            {!mirrorStatus && form.featured_image && isBlockedCdnUrl(form.featured_image) && (
              <p className="text-[10px] text-amber-600">
                ⚠ Facebook/Instagram URLs expire. Click away to auto-save a permanent copy.
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowMedia(true)}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Open Library
              </button>
              <label className={`flex-1 inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-gray-200 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
                <input type="file" accept="image/*" className="sr-only"
                  onChange={async e => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const url = await uploadImage(file);
                    if (url) setForm(f => ({ ...f, featured_image: url }));
                    e.target.value = '';
                  }} />
                <Upload className="h-3 w-3 text-gray-500" /> {uploading ? 'Uploading…' : 'Quick Upload'}
              </label>
            </div>
            {form.featured_image && (
              <div className="relative mt-2">
                <img src={form.featured_image} alt="" className="w-full rounded-lg object-cover" style={{ maxHeight: 100 }}
                  onError={e => { e.currentTarget.style.display='none'; }} />
                <button type="button" onClick={() => { setForm(f => ({ ...f, featured_image: '' })); setMirrorStatus(null); }}
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white hover:bg-black/80">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </SidePanel>

          {/* SEO SETTINGS */}
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

          {/* ADVANCED OPTIONS */}
          <SidePanel label="Advanced Options" icon={<Sliders className="h-4 w-4" />} defaultOpen={false}>
            {isAdmin && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Author</label>
                <select className="input w-full text-xs font-medium" value={form.author_name}
                  onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))}>
                  <option value="">— Select member —</option>
                  {members.map(m => <option key={m.id} value={m.full_name}>{m.full_name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">OG Title (override)</label>
              <input className="input w-full text-xs" value={form.og_title}
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
              <textarea className="input w-full text-xs" rows={2} value={form.share_snippet} maxLength={200}
                placeholder="Custom excerpt for sharing"
                onChange={e => setForm(f => ({ ...f, share_snippet: e.target.value }))} />
            </div>
            <SocialPreview title={ogTitle} desc={ogDesc} image={ogImage} />
          </SidePanel>

          {/* REVISION HISTORY */}
          <RevisionHistoryPanel postId={editingId} onRestore={restoreRevision} />

          {/* LANGUAGE */}
          <SidePanel label="Language" defaultOpen={false}>
            <select className="input w-full text-xs font-medium" value={form.language}
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
