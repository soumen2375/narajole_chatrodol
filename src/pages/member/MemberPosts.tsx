import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoPost, PostStatus } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { ListSkeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/ui/StatusBadge';
import RichEditor from '@/components/admin/RichEditor';
import CategorySelector from '@/components/admin/CategorySelector';

function stripHtml(h: string) { return h.replace(/<[^>]+>/g, ''); }
function slugify(t: string) {
  return t.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 90);
}

interface EditorForm {
  title: string; content: string; category: string;
  tags: string[]; tagInput: string; featured_image: string;
  slug: string; meta_title: string; meta_description: string; focus_keyword: string;
  og_title: string; og_image: string; share_snippet: string;
}
const EMPTY: EditorForm = {
  title: '', content: '', category: 'News', tags: [], tagInput: '',
  featured_image: '', slug: '', meta_title: '', meta_description: '',
  focus_keyword: '', og_title: '', og_image: '', share_snippet: '',
};
function fromPost(p: CswoPost): EditorForm {
  return {
    title: p.title, content: p.content, category: p.category,
    tags: Array.isArray(p.tags) ? p.tags : [], tagInput: '',
    featured_image: p.featured_image ?? '', slug: p.slug ?? '',
    meta_title: p.meta_title ?? '', meta_description: p.meta_description ?? '',
    focus_keyword: p.focus_keyword ?? '',
    og_title: p.og_title ?? '', og_image: p.og_image ?? '', share_snippet: p.share_snippet ?? '',
  };
}

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

// ═════════════════════════════════════════════════════════════════════════════
export default function MemberPosts() {
  const { member } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  // list
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [posts, setPosts] = useState<CswoPost[]>([]);
  const [loading, setLoading] = useState(true);

  // editor
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditorForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autoSaveMsg, setAutoSaveMsg] = useState('');
  const [seoOpen, setSeoOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [slugManual, setSlugManual] = useState(false);
  const [seoTitleManual, setSeoTitleManual] = useState(false);
  const [seoDescManual, setSeoDescManual] = useState(false);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // load member's own posts
  const load = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    const { data } = await supabase.from('cswo_posts').select('*')
      .eq('author_id', member.id).order('created_at', { ascending: false });
    setPosts((data ?? []) as CswoPost[]);
    setLoading(false);
  }, [member]);
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

  // auto-save for existing posts
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
      }).eq('id', editingId);
      setAutoSaveMsg(tr('Auto-saved ✓', 'স্বয়ংক্রিয়ভাবে সংরক্ষিত ✓'));
      load();
    }, 3000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, form.content, form.category]);

  // validation warnings — only shown once user has started editing
  const hasStartedEditing = !!(form.title || (form.content && form.content !== '<p></p>'));
  const warnings: string[] = [];
  if (view === 'editor' && hasStartedEditing) {
    if (!form.title) warnings.push(tr('Missing title', 'শিরোনাম নেই'));
    if (!form.featured_image) warnings.push(tr('No featured image', 'কোনো ছবি নেই'));
    if (stripHtml(form.content).trim().length < 100) warnings.push(tr('Content too short', 'বিষয়বস্তু অনেক ছোট'));
  }

  // save (draft or submit for review)
  const doSave = async (submitForReview = false) => {
    setAttemptedSave(true);
    if (!member || !form.title) return;
    setSaving(true); setSaveError(null);

    const status: PostStatus = submitForReview ? 'pending' : 'draft';
    const payload: Record<string, unknown> = {
      title: form.title, content: form.content, category: form.category, tags: form.tags,
      featured_image: form.featured_image || null, slug: form.slug || null,
      meta_title: form.meta_title || null, meta_description: form.meta_description || null,
      focus_keyword: form.focus_keyword || null,
      og_title: form.og_title || null, og_image: form.og_image || null, share_snippet: form.share_snippet || null,
      author_name: member.full_name, status,
    };

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
    setSaving(false);
    setAutoSaveMsg(submitForReview ? tr('Submitted for review ✓', 'পর্যালোচনার জন্য জমা দেওয়া হয়েছে ✓') : tr('Draft saved ✓', 'খসড়া সংরক্ষিত ✓'));
    load();
    if (submitForReview) setTimeout(() => setView('list'), 1200);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    setUploading(true);
    const { error } = await supabase.storage.from('post-images').upload(path, file);
    setUploading(false);
    if (error) { setSaveError(tr(`Upload failed: ${error.message}`, `আপলোড ব্যর্থ: ${error.message}`)); return null; }
    return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
  };

  const openEditor = (p?: CswoPost) => {
    if (p) {
      setForm(fromPost(p)); setEditingId(p.id);
      setSlugManual(true); setSeoTitleManual(!!p.meta_title); setSeoDescManual(!!p.meta_description);
    } else {
      setForm(EMPTY); setEditingId(null);
      setSlugManual(false); setSeoTitleManual(false); setSeoDescManual(false);
    }
    setAutoSaveMsg(''); setSeoOpen(false); setSocialOpen(false);
    setSaveError(null); setAttemptedSave(false);
    setView('editor');
  };

  const removePost = async (id: string) => {
    if (!confirm(tr('Delete this post?', 'এই পোস্টটি মুছবেন?'))) return;
    await supabase.from('cswo_posts').delete().eq('id', id);
    load();
  };

  const addTag = () => {
    const tag = form.tagInput.trim();
    if (tag && !form.tags.includes(tag)) setForm(f => ({ ...f, tags: [...f.tags, tag], tagInput: '' }));
    else setForm(f => ({ ...f, tagInput: '' }));
  };
  const removeTag = (tag: string) => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== tag) }));

  // ── EDITOR VIEW ────────────────────────────────────────────────────────────
  if (view === 'editor') {
    return (
      <div className="-m-6 flex min-h-[calc(100vh-64px)] flex-col bg-white">

        {/* Top bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-white px-6 py-3 shadow-sm">
          <button onClick={() => { setView('list'); setAutoSaveMsg(''); }}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
            ← {tr('My Posts', 'আমার পোস্ট')}
          </button>
          <div className="flex items-center gap-2.5">
            {autoSaveMsg && <span className="text-xs text-gray-400">{autoSaveMsg}</span>}
            {warnings.length > 0 && (
              <button onClick={() => setAttemptedSave(true)}
                className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200">
                ⚠ {warnings.length} {tr('warning', 'সতর্কতা')}{warnings.length > 1 ? 's' : ''}
              </button>
            )}
            <button onClick={() => doSave(false)} disabled={saving || !form.title}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40">
              {tr('Save Draft', 'খসড়া সংরক্ষণ')}
            </button>
            <button onClick={() => doSave(true)} disabled={saving || !form.title}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-40">
              {saving ? tr('Saving…', 'সংরক্ষণ…') : tr('Submit for Review', 'পর্যালোচনার জন্য জমা দিন')}
            </button>
          </div>
        </div>

        {/* Warning pills */}
        {attemptedSave && warnings.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b bg-amber-50 px-6 py-3">
            {warnings.map(w => (
              <span key={w} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-700 shadow-sm ring-1 ring-amber-200">
                ⚠ {w}
              </span>
            ))}
          </div>
        )}

        {saveError && (
          <div className="border-b bg-red-50 px-6 py-3 text-sm font-medium text-red-700">✕ {saveError}</div>
        )}

        {/* Info note */}
        <div className="border-b bg-blue-50 px-6 py-2.5 text-xs text-blue-700">
          {tr('Your post will be published after admin approval.', 'আপনার পোস্ট অ্যাডমিন অনুমোদনের পর প্রকাশিত হবে।')}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: title + editor */}
          <div className="flex-1 overflow-y-auto bg-white">
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

          {/* Right sidebar */}
          <aside className="w-[290px] flex-shrink-0 overflow-y-auto border-l bg-gray-50 px-4 py-5 space-y-4">

            {/* FEATURED IMAGE */}
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

            {/* CATEGORY */}
            <SidePanel label={tr('Category', 'বিভাগ')}>
              <CategorySelector value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} allowAdd={false} />
            </SidePanel>

            {/* TAGS */}
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

            {/* Author (read-only) */}
            <SidePanel label={tr('Author', 'লেখক')}>
              <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">{member?.full_name}</div>
            </SidePanel>

            {/* SEO */}
            <Accordion label="SEO" open={seoOpen} onToggle={() => setSeoOpen(v => !v)}>
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
                  onChange={e => setForm(f => ({ ...f, focus_keyword: e.target.value }))} />
              </div>
            </Accordion>

            {/* SOCIAL SHARING */}
            <Accordion label={tr('Social Sharing', 'সোশ্যাল শেয়ারিং')} open={socialOpen} onToggle={() => setSocialOpen(v => !v)}>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{tr('OG Title', 'OG শিরোনাম')}</label>
                <input className="input w-full text-sm" value={form.og_title}
                  placeholder={tr('Defaults to post title', 'পোস্টের শিরোনাম থেকে পূরণ হবে')}
                  onChange={e => setForm(f => ({ ...f, og_title: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{tr('Social Image', 'সোশ্যাল ছবি')}</label>
                <input className="input w-full text-sm" value={form.og_image} placeholder="https://…"
                  onChange={e => setForm(f => ({ ...f, og_image: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{tr('Share Snippet', 'শেয়ার বিবরণ')}</label>
                <textarea className="input w-full text-sm" rows={2} value={form.share_snippet} maxLength={200}
                  onChange={e => setForm(f => ({ ...f, share_snippet: e.target.value }))} />
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('m.posts')}</h1>
        <button onClick={() => openEditor()} className="btn-primary">{tr('+ New Post', '+ নতুন পোস্ট')}</button>
      </div>

      <div className="mb-5 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800 ring-1 ring-blue-100">
        {tr('Posts are published after admin approval. Drafts are visible only to you.', 'পোস্ট অ্যাডমিন অনুমোদনের পর প্রকাশিত হয়। খসড়া শুধুমাত্র আপনি দেখতে পাবেন।')}
      </div>

      {loading ? <ListSkeleton rows={5} /> : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
          <p className="text-base font-medium">{tr('No posts yet', 'এখনও কোনো পোস্ট নেই')}</p>
          <button onClick={() => openEditor()} className="btn-primary text-sm">{tr('Write your first post', 'প্রথম পোস্ট লিখুন')}</button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(p => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100 hover:shadow-md transition-shadow">
              {p.featured_image && (
                <img src={p.featured_image} alt="" className="h-12 w-16 flex-shrink-0 rounded-lg object-cover"
                  onError={e => { e.currentTarget.style.display = 'none'; }} />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="max-w-[280px] truncate font-semibold text-gray-900">{p.title}</span>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-0.5 text-xs text-gray-400">{p.category} · {fmt.date(p.created_at)}</p>
              </div>
              <div className="flex flex-shrink-0 gap-3 text-sm">
                {(p.status === 'draft' || p.status === 'pending') && (
                  <button onClick={() => openEditor(p)} className="font-medium text-blue-600 hover:underline">{t('common.edit')}</button>
                )}
                <button onClick={() => removePost(p.id)} className="font-medium text-red-500 hover:underline">{t('common.delete')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
