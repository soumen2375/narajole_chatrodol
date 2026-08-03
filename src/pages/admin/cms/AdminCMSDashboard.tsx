import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoPost, PostStatus, PostType } from '@/types';
import { POST_TYPE_LABELS } from '@/types';
import StatusBadge from '@/components/ui/StatusBadge';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useFmt } from '@/lib/format';
import {
  Search, Plus, LayoutList, Kanban, CalendarDays,
  Eye, Edit3, Copy, Archive, Trash2, MoreHorizontal, Star, Pin,
  Clock, User, Filter, X, ChevronDown, TrendingUp, FileText,
  RefreshCw, Calendar,
} from 'lucide-react';
import {
  DndContext, closestCenter, DragEndEvent,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─────────────────────────────────────────────────────────────────────────────
type ViewMode = 'table' | 'kanban' | 'calendar';
type FilterStatus = PostStatus | 'all' | 'upcoming' | 'ongoing' | 'past';

const STATUS_TABS: { key: FilterStatus; label: string; color: string }[] = [
  { key: 'all',       label: 'All',       color: 'bg-gray-100 text-gray-700' },
  { key: 'published', label: 'Published', color: 'bg-green-100 text-green-700' },
  { key: 'upcoming',  label: 'Upcoming',  color: 'bg-amber-100 text-amber-800' },
  { key: 'ongoing',   label: 'Ongoing',   color: 'bg-emerald-100 text-emerald-800' },
  { key: 'past',      label: 'Past',      color: 'bg-rose-100 text-rose-800' },
  { key: 'draft',     label: 'Draft',     color: 'bg-gray-100 text-gray-600' },
  { key: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  { key: 'pending',   label: 'Review',    color: 'bg-amber-100 text-amber-700' },
  { key: 'archived',  label: 'Archived',  color: 'bg-slate-100 text-slate-600' },
  { key: 'trash',     label: 'Trash',     color: 'bg-red-100 text-red-600' },
];

const SORT_OPTIONS = [
  { key: 'published_date.desc', label: 'Publish Date (Newest)' },
  { key: 'published_date.asc',  label: 'Publish Date (Oldest)' },
  { key: 'created_at.desc',     label: 'Created (Newest)' },
  { key: 'updated_at.desc',     label: 'Recently Edited' },
  { key: 'view_count.desc',     label: 'Most Views' },
  { key: 'title.asc',           label: 'Title A → Z' },
];

const KANBAN_COLS: { key: PostStatus; label: string; color: string; dot: string }[] = [
  { key: 'draft',     label: 'Draft',     color: 'bg-gray-50   border-gray-200',   dot: 'bg-gray-400' },
  { key: 'pending',   label: 'In Review', color: 'bg-amber-50  border-amber-200',  dot: 'bg-amber-500' },
  { key: 'scheduled', label: 'Scheduled', color: 'bg-blue-50   border-blue-200',   dot: 'bg-blue-500' },
  { key: 'published', label: 'Published', color: 'bg-green-50  border-green-200',  dot: 'bg-green-500' },
  { key: 'archived',  label: 'Archived',  color: 'bg-slate-50  border-slate-200',  dot: 'bg-slate-400' },
];

const TYPE_OPTIONS: PostType[] = [
  'general', 'news', 'blog', 'story', 'notice', 'press_release',
  'program', 'project', 'campaign', 'volunteer_story', 'document', 'report', 'event',
];

// ─────────────────────────────────────────────────────────────────────────────
// Kanban card
function KanbanCard({ post, onEdit, onClone }: {
  post: CswoPost; onEdit: () => void; onClone: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: post.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="cursor-grab rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow active:cursor-grabbing group">
      {post.featured_image && (
        <img src={post.featured_image} alt="" className="mb-2 h-24 w-full rounded-lg object-cover" />
      )}
      <div className="mb-1.5 flex items-start justify-between gap-1">
        <span className="flex-1 text-sm font-semibold leading-snug text-gray-900 line-clamp-2">{post.title}</span>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <Edit3 className="h-3 w-3" />
          </button>
          <button onClick={e => { e.stopPropagation(); onClone(); }}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <Copy className="h-3 w-3" />
          </button>
        </div>
      </div>
      {(post.is_featured || post.is_sticky) && (
        <div className="flex flex-wrap items-center gap-1 mb-1">
          {post.is_featured && <Star className="h-3 w-3 fill-amber-400 text-amber-500" />}
          {post.is_sticky   && <Pin className="h-3 w-3 text-blue-500" />}
        </div>
      )}
      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-400">
        <User className="h-2.5 w-2.5" /> {post.author_name || 'Admin'}
        <Clock className="ml-1.5 h-2.5 w-2.5" /> {new Date(post.published_date || post.created_at).toLocaleDateString()}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar view
function CalendarView({ posts, onEdit }: { posts: CswoPost[]; onNavigate?: (p: CswoPost) => void; onEdit: (p: CswoPost) => void }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  const postsByDate: Record<string, CswoPost[]> = {};
  posts.forEach(p => {
    const d = (p.published_date ? p.published_date : p.schedule_at ? p.schedule_at : p.created_at)?.slice(0, 10);
    if (d) {
      if (!postsByDate[d]) postsByDate[d] = [];
      postsByDate[d].push(p);
    }
  });

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay });

  const TYPE_DOT: Record<string, string> = {
    event: 'bg-purple-500', news: 'bg-blue-500', blog: 'bg-violet-500',
    notice: 'bg-orange-500', draft: 'bg-gray-400',
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">{monthLabel}</h3>
        <div className="flex gap-1">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">← Prev</button>
          <button onClick={() => setCurrentMonth(new Date())}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">Today</button>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">Next →</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 bg-white">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="min-h-[80px] border-b border-r border-gray-100 bg-gray-50/50" />
          ))}
          {days.map(day => {
            const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const dayPosts = postsByDate[dateStr] ?? [];
            const isToday = dateStr === today;
            return (
              <div key={day}
                className={`relative min-h-[80px] border-b border-r border-gray-100 p-1.5 ${isToday ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isToday ? 'bg-orange-500 text-white' : 'text-gray-700'
                }`}>{day}</div>
                <div className="space-y-0.5">
                  {dayPosts.slice(0, 3).map(p => (
                    <button key={p.id} onClick={() => onEdit(p)}
                      className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] hover:bg-white hover:shadow-sm transition-all truncate">
                      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${TYPE_DOT[p.post_type ?? 'general'] ?? 'bg-gray-400'}`} />
                      <span className="truncate text-gray-700">{p.title}</span>
                    </button>
                  ))}
                  {dayPosts.length > 3 && (
                    <p className="pl-1 text-[10px] text-gray-400">+{dayPosts.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Row actions dropdown with Fixed Portal positioning
function RowActions({ post, onEdit, onClone, onDelete, onChangeStatus }: {
  post: CswoPost;
  onEdit: () => void;
  onClone: () => void;
  onDelete: () => void;
  onChangeStatus: (s: PostStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const openUp = window.innerHeight - rect.bottom < 230;
      setMenuStyle({
        position: 'fixed',
        top: openUp ? `${Math.max(10, rect.top - 210)}px` : `${rect.bottom + 4}px`,
        left: `${Math.max(10, rect.right - 176)}px`,
        zIndex: 99999,
      });
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const scrollHandler = () => setOpen(false);

    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', scrollHandler, true);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', scrollHandler, true);
    };
  }, [open]);

  return (
    <div>
      <button ref={btnRef} onClick={toggle}
        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div ref={menuRef} style={menuStyle}
          className="w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/10">
          <button onClick={() => { onEdit(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-orange-50 hover:text-orange-600">
            <Edit3 className="h-4 w-4 text-orange-500" /> Edit Post
          </button>
          <button onClick={() => { onClone(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            <Copy className="h-4 w-4 text-gray-500" /> Duplicate
          </button>
          <div className="h-px bg-gray-100" />
          {post.status !== 'published' && (
            <button onClick={() => { onChangeStatus('published'); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-green-50">
              <Eye className="h-4 w-4 text-green-500" /> Publish
            </button>
          )}
          {post.status !== 'archived' && (
            <button onClick={() => { onChangeStatus('archived'); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              <Archive className="h-4 w-4 text-gray-500" /> Archive
            </button>
          )}
          {post.status !== 'trash' && (
            <button onClick={() => { onChangeStatus('trash'); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-amber-600 hover:bg-amber-50">
              <Trash2 className="h-4 w-4" /> Move to Trash
            </button>
          )}
          <div className="h-px bg-gray-100" />
          <button onClick={() => { onDelete(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" /> Delete Permanently
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard Component
export default function AdminCMSDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { member } = useAuth();
  const fmt = useFmt();
  const basePath = location.pathname.startsWith('/member') ? '/member/cms' : '/admin/cms';

  const [posts, setPosts] = useState<CswoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('table');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterType, setFilterType] = useState<PostType | ''>('');
  const [filterAuthor, setFilterAuthor] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('published_date.desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [authors, setAuthors] = useState<{ id: string; full_name: string }[]>([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Load authors
  useEffect(() => {
    supabase.from('cswo_members').select('id,full_name').eq('status', 'approved').order('full_name')
      .then(({ data }) => setAuthors((data ?? []) as { id: string; full_name: string }[]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [col, dir] = sortKey.split('.');
    let q = supabase.from('cswo_posts').select('*');
    if (['draft','pending','published','scheduled','archived','trash'].includes(filterStatus)) {
      q = q.eq('status', filterStatus);
    }
    if (filterType) q = q.eq('post_type', filterType);
    if (filterAuthor) q = q.eq('author_name', filterAuthor);
    q = q.order(col as string, { ascending: dir === 'asc' });
    const { data } = await q;
    setPosts((data ?? []) as CswoPost[]);
    setLoading(false);
  }, [filterStatus, filterType, filterAuthor, sortKey]);

  useEffect(() => { load(); }, [load]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const visible = posts.filter(p => {
    const matchesSearch =
      !search.trim() ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.author_name ?? '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    const pubDate = (p.published_date || p.schedule_at || p.created_at).slice(0, 10);
    if (filterStatus === 'upcoming') return pubDate > todayStr;
    if (filterStatus === 'ongoing') return pubDate === todayStr;
    if (filterStatus === 'past') return pubDate < todayStr;

    return true;
  });

  // Quick status change
  const changeStatus = async (id: string, status: PostStatus) => {
    await supabase.from('cswo_posts').update({ status }).eq('id', id);
    load();
  };

  // Delete
  const deletePost = async (id: string) => {
    if (!confirm('Delete this post permanently?')) return;
    await supabase.from('cswo_posts').delete().eq('id', id);
    load();
  };

  // Clone
  const clonePost = async (p: CswoPost) => {
    const clone = { ...p } as Record<string, unknown>;
    delete clone.id; delete clone.created_at; delete clone.updated_at;
    clone.title = `Copy of ${p.title}`;
    clone.status = 'draft';
    clone.slug = (p.slug ?? '') + '-copy-' + Date.now().toString(36).slice(-4);
    clone.author_id = member?.id ?? null;
    await supabase.from('cswo_posts').insert(clone);
    load();
  };

  // Bulk actions
  const bulkAction = async (act: 'publish' | 'archive' | 'trash' | 'delete') => {
    if (!selected.size) return;
    if (act === 'delete') {
      if (!confirm(`Delete ${selected.size} posts permanently?`)) return;
      await supabase.from('cswo_posts').delete().in('id', [...selected]);
    } else {
      const st: PostStatus = act === 'publish' ? 'published' : act === 'archive' ? 'archived' : 'trash';
      await supabase.from('cswo_posts').update({ status: st }).in('id', [...selected]);
    }
    setSelected(new Set()); load();
  };

  // Kanban drag-end: change status
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const newStatus = over.id as PostStatus;
    if (KANBAN_COLS.some(c => c.key === newStatus)) {
      await changeStatus(active.id as string, newStatus);
    }
  };

  // Counts
  const countByStatus = (s: FilterStatus) => {
    if (s === 'all') return posts.length;
    if (s === 'upcoming') return posts.filter(p => (p.published_date || p.schedule_at || p.created_at).slice(0, 10) > todayStr).length;
    if (s === 'ongoing') return posts.filter(p => (p.published_date || p.schedule_at || p.created_at).slice(0, 10) === todayStr).length;
    if (s === 'past') return posts.filter(p => (p.published_date || p.schedule_at || p.created_at).slice(0, 10) < todayStr).length;
    return posts.filter(p => p.status === s).length;
  };

  // Active filters count
  const activeFilters = [filterType, filterAuthor].filter(Boolean).length;

  const goEdit = (p: CswoPost) => navigate(`${basePath}/${p.id}/edit`);
  const goNew  = () => navigate(`${basePath}/new`);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-orange-500" /> Content Manager
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">{posts.length} total posts</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="rounded-xl border border-gray-200 p-2.5 text-gray-500 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={goNew}
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition-colors shadow-sm shadow-orange-200">
            <Plus className="h-4 w-4" /> New Post
          </button>
        </div>
      </div>

      {/* ── Status & Date Filter tabs ── */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map(tab => (
          <button key={tab.key} onClick={() => setFilterStatus(tab.key)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filterStatus === tab.key
                ? 'bg-gray-900 text-white shadow-sm'
                : tab.color + ' hover:opacity-80'
            }`}>
            {tab.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              filterStatus === tab.key ? 'bg-white/20 text-white' : 'bg-white/60'
            }`}>{countByStatus(tab.key)}</span>
          </button>
        ))}
      </div>

      {/* ── Search & View Controls ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input className="input w-full pl-9 text-sm" placeholder="Search posts, authors…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <button onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
            showFilters || activeFilters > 0 ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}>
          <Filter className="h-4 w-4" />
          Filters
          {activeFilters > 0 && (
            <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{activeFilters}</span>
          )}
        </button>

        {/* Sort */}
        <div className="relative">
          <select className="input cursor-pointer appearance-none pr-7 text-sm"
            value={sortKey} onChange={e => setSortKey(e.target.value)}>
            {SORT_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        </div>

        {/* View toggle */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
          {([
            { mode: 'table'    as ViewMode, Icon: LayoutList,   title: 'Table View' },
            { mode: 'kanban'   as ViewMode, Icon: Kanban,        title: 'Kanban View' },
            { mode: 'calendar' as ViewMode, Icon: CalendarDays,  title: 'Calendar View' },
          ]).map(({ mode, Icon, title }) => (
            <button key={mode} title={title} onClick={() => setView(mode)}
              className={`p-2.5 transition-colors ${view === mode ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter sidebar (collapsible) ── */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          {/* Type filter */}
          <div className="min-w-[160px]">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">Content Type</label>
            <select className="input w-full text-sm" value={filterType} onChange={e => setFilterType(e.target.value as PostType | '')}>
              <option value="">All Types</option>
              {TYPE_OPTIONS.map(t => (
                <option key={t} value={t}>{POST_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          {/* Author filter */}
          <div className="min-w-[160px]">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">Author</label>
            <select className="input w-full text-sm" value={filterAuthor} onChange={e => setFilterAuthor(e.target.value)}>
              <option value="">All Authors</option>
              {authors.map(a => <option key={a.id} value={a.full_name}>{a.full_name}</option>)}
            </select>
          </div>
          {/* Clear */}
          {activeFilters > 0 && (
            <div className="flex items-end">
              <button onClick={() => { setFilterType(''); setFilterAuthor(''); }}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-white">
                <X className="h-3.5 w-3.5" /> Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-orange-50 px-4 py-2.5 ring-1 ring-orange-200">
          <span className="text-sm font-semibold text-orange-800">{selected.size} selected</span>
          {[
            { a: 'publish' as const, l: 'Publish',  c: 'bg-green-600' },
            { a: 'archive' as const, l: 'Archive',  c: 'bg-gray-600' },
            { a: 'trash'   as const, l: 'Trash',    c: 'bg-amber-600' },
            { a: 'delete'  as const, l: 'Delete',   c: 'bg-red-600' },
          ].map(({ a, l, c }) => (
            <button key={a} onClick={() => bulkAction(a)}
              className={`${c} rounded-full px-3 py-1 text-xs font-semibold text-white hover:opacity-80`}>{l}</button>
          ))}
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-orange-600 hover:underline">Clear</button>
        </div>
      )}

      {/* ── Views ── */}
      {loading ? <ListSkeleton rows={6} /> : (

        <>
          {/* TABLE VIEW */}
          {view === 'table' && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input type="checkbox" className="rounded border-gray-300"
                          checked={selected.size === visible.length && visible.length > 0}
                          onChange={e => setSelected(e.target.checked ? new Set(visible.map(p => p.id)) : new Set())} />
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Thumbnail</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Title</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <div className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Views</div>
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Author</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <div className="flex items-center gap-1"><Calendar className="h-3 w-3 text-orange-500" /> Publish Date</div>
                      </th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visible.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-sm text-gray-400">
                          No posts found.
                        </td>
                      </tr>
                    ) : visible.map(p => (
                      <tr key={p.id} className="group hover:bg-orange-50/40 transition-colors">
                        <td className="px-4 py-3">
                          <input type="checkbox" className="rounded border-gray-300"
                            checked={selected.has(p.id)}
                            onChange={() => {
                              const n = new Set(selected);
                              n.has(p.id) ? n.delete(p.id) : n.add(p.id);
                              setSelected(n);
                            }} />
                        </td>
                        <td className="px-3 py-3">
                          {p.featured_image ? (
                            <img src={p.featured_image} alt="" className="h-10 w-14 rounded-lg object-cover"
                              onError={e => { e.currentTarget.style.display = 'none'; }} />
                          ) : (
                            <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-gray-100">
                              <FileText className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 max-w-xs">
                          <button onClick={() => goEdit(p)} className="text-left">
                            <p className="font-semibold text-gray-900 hover:text-orange-600 transition-colors line-clamp-2 leading-snug">{p.title}</p>
                            {p.category && <p className="mt-0.5 text-xs text-gray-400">{p.category}</p>}
                          </button>
                          {(p.is_featured || p.is_sticky) && (
                            <div className="mt-1 flex gap-1">
                              {p.is_featured && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                              {p.is_sticky   && <Pin className="h-3 w-3 text-blue-500" />}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-3 py-3 text-sm tabular-nums text-gray-600">
                          {(p.view_count ?? 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {p.author_name || 'Admin'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                          <p className="font-semibold text-gray-900">{fmt.date(p.published_date || p.created_at)}</p>
                          <p className="text-[10px] text-gray-400">Updated {fmt.date(p.updated_at)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => goEdit(p)}
                              className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700 transition-colors shadow-sm"
                            >
                              <Edit3 className="h-3.5 w-3.5" /> Edit
                            </button>
                            <RowActions post={p}
                              onEdit={() => goEdit(p)}
                              onClone={() => clonePost(p)}
                              onDelete={() => deletePost(p.id)}
                              onChangeStatus={s => changeStatus(p.id, s)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* KANBAN VIEW */}
          {view === 'kanban' && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {KANBAN_COLS.map(col => {
                  const colPosts = visible.filter(p => p.status === col.key);
                  return (
                    <div key={col.key} id={col.key}
                      className={`flex-shrink-0 w-64 rounded-2xl border ${col.color} p-3`}>
                      <div className="mb-3 flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                        <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-gray-600 shadow-sm">
                          {colPosts.length}
                        </span>
                      </div>
                      <SortableContext items={colPosts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {colPosts.map(p => (
                            <KanbanCard key={p.id} post={p}
                              onEdit={() => goEdit(p)}
                              onClone={() => clonePost(p)} />
                          ))}
                          {colPosts.length === 0 && (
                            <div className="rounded-xl border-2 border-dashed border-gray-200 py-6 text-center text-xs text-gray-400">
                              No posts here
                            </div>
                          )}
                        </div>
                      </SortableContext>
                    </div>
                  );
                })}
              </div>
            </DndContext>
          )}

          {/* CALENDAR VIEW */}
          {view === 'calendar' && (
            <CalendarView posts={visible} onEdit={goEdit} />
          )}
        </>
      )}
    </div>
  );
}
