import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoPost, CswoPostApproval, ApprovalAction } from '@/types';
import { PostTypeBadge } from '@/components/admin/cms/PostTypeSelector';
import StatusBadge from '@/components/ui/StatusBadge';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useFmt } from '@/lib/format';
import {
  CheckCircle2, XCircle, AlertCircle, Clock, Search,
  Eye, FileText, Check, MessageSquare, History, User,
} from 'lucide-react';

type TabKey = 'pending' | 'approved' | 'rejected' | 'all';

export default function AdminCMSApprovals() {
  const { member } = useAuth();
  const fmt = useFmt();

  const [posts, setPosts] = useState<CswoPost[]>([]);
  const [approvals, setApprovals] = useState<Record<string, CswoPostApproval[]>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('pending');
  const [search, setSearch] = useState('');

  // Active Review Modal State
  const [selectedPost, setSelectedPost] = useState<CswoPost | null>(null);
  const [reviewAction, setReviewAction] = useState<ApprovalAction>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    // Fetch posts that need review or have been reviewed
    const { data: postsData } = await supabase
      .from('cswo_posts')
      .select('*')
      .order('updated_at', { ascending: false });

    setPosts((postsData ?? []) as CswoPost[]);

    // Fetch approval logs
    const { data: appData } = await supabase
      .from('cswo_post_approvals')
      .select('*, reviewer:cswo_members(full_name)')
      .order('created_at', { ascending: false });

    const appMap: Record<string, CswoPostApproval[]> = {};
    ((appData ?? []) as Record<string, unknown>[]).forEach(row => {
      const item: CswoPostApproval = {
        id: row.id as string,
        post_id: row.post_id as string,
        reviewer_id: row.reviewer_id as string | null,
        action: row.action as ApprovalAction,
        notes: (row.notes as string) || '',
        created_at: row.created_at as string,
        reviewer_name: (row.reviewer as { full_name?: string } | null)?.full_name ?? null,
      };
      if (!appMap[item.post_id]) appMap[item.post_id] = [];
      appMap[item.post_id].push(item);
    });

    setApprovals(appMap);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Execute review decision
  const handleReviewSubmit = async () => {
    if (!selectedPost || !member) return;
    setSubmitting(true);

    const newStatus =
      reviewAction === 'approved' ? 'published' :
      reviewAction === 'rejected' ? 'rejected' :
      'draft';

    // 1. Update post status
    await supabase.from('cswo_posts').update({
      status: newStatus,
      published_date: reviewAction === 'approved' ? new Date().toISOString() : selectedPost.published_date,
    }).eq('id', selectedPost.id);

    // 2. Insert approval log
    await supabase.from('cswo_post_approvals').insert({
      post_id: selectedPost.id,
      reviewer_id: member.id,
      action: reviewAction,
      notes: reviewNotes.trim() || (reviewAction === 'approved' ? 'Approved for publication' : 'Feedback provided'),
    });

    // 3. Create notification for author if author_id exists
    if (selectedPost.author_id) {
      const msg =
        reviewAction === 'approved'
          ? `Your post "${selectedPost.title}" was approved and published!`
          : reviewAction === 'changes_requested'
          ? `Changes were requested on "${selectedPost.title}": ${reviewNotes}`
          : `Your post "${selectedPost.title}" was rejected: ${reviewNotes}`;

      await supabase.from('cswo_notifications').insert({
        member_id: selectedPost.author_id,
        title: `CMS Post Review: ${reviewAction.replace('_', ' ')}`,
        message: msg,
        type: 'cms',
      });
    }

    setSubmitting(false);
    setSelectedPost(null);
    setReviewNotes('');
    load();
  };

  const visiblePosts = posts.filter(p => {
    const matchesSearch = !search.trim() || p.title.toLowerCase().includes(search.toLowerCase()) || (p.author_name ?? '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (tab === 'pending') return p.status === 'pending';
    if (tab === 'approved') return p.status === 'published';
    if (tab === 'rejected') return p.status === 'rejected';
    return true;
  });

  const pendingCount = posts.filter(p => p.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-orange-500" /> CMS Review Queue
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Review submitted content, provide editorial feedback, and approve publications.
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2 ring-1 ring-amber-200">
            <AlertCircle className="h-5 w-5 text-amber-600 animate-pulse" />
            <span className="text-sm font-semibold text-amber-900">
              {pendingCount} post{pendingCount !== 1 ? 's' : ''} awaiting approval
            </span>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl bg-gray-100 p-1">
          {[
            { id: 'pending' as TabKey, label: 'Pending Review', count: pendingCount, color: 'bg-amber-500 text-white' },
            { id: 'approved' as TabKey, label: 'Approved & Live' },
            { id: 'rejected' as TabKey, label: 'Rejected' },
            { id: 'all' as TabKey, label: 'All Content' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${t.color}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="input w-full pl-9 text-sm"
            placeholder="Filter by title or author…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Posts Queue Table / List */}
      {loading ? (
        <ListSkeleton rows={5} />
      ) : visiblePosts.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center text-gray-400">
          <CheckCircle2 className="h-12 w-12 text-gray-300 mb-2" />
          <p className="text-sm font-semibold text-gray-600">No content found in this queue</p>
          <p className="mt-1 text-xs text-gray-400">
            {tab === 'pending' ? 'All submitted posts have been reviewed!' : 'Try selecting a different queue tab.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visiblePosts.map(post => {
            const postApprovals = approvals[post.id] ?? [];
            const latestApproval = postApprovals[0];

            return (
              <div
                key={post.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between p-5 gap-4">
                  {/* Left info */}
                  <div className="flex items-start gap-4 flex-1">
                    {post.featured_image ? (
                      <img
                        src={post.featured_image}
                        alt=""
                        className="h-16 w-24 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl">
                        📄
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <PostTypeBadge type={post.post_type ?? 'general'} />
                        <StatusBadge status={post.status} />
                        {post.category && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                            {post.category}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-gray-900 leading-snug">{post.title}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-gray-400" /> {post.author_name || 'Anonymous Author'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-gray-400" /> Updated {fmt.date(post.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => window.open(`/${post.slug || ''}`, '_blank')}
                      className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPost(post);
                        setReviewAction('approved');
                        setReviewNotes('');
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 transition-colors shadow-sm"
                    >
                      <FileText className="h-3.5 w-3.5" /> Review Post
                    </button>
                  </div>
                </div>

                {/* Latest Approval Log Strip */}
                {latestApproval && (
                  <div className="border-t border-gray-100 bg-gray-50/80 px-5 py-2.5 flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <History className="h-3.5 w-3.5 text-gray-400" />
                      <span>
                        Last action:{' '}
                        <strong className="capitalize text-gray-900">{latestApproval.action.replace('_', ' ')}</strong>{' '}
                        by {latestApproval.reviewer_name || 'Admin'}
                      </span>
                      {latestApproval.notes && (
                        <span className="italic text-gray-500">"{latestApproval.notes}"</span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400">{fmt.date(latestApproval.created_at)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl space-y-0">
            {/* Modal Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-base font-bold text-gray-900">Editorial Review</h3>
                <p className="text-xs text-gray-500 truncate max-w-md">{selectedPost.title}</p>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Action Picker */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Select Review Action
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'approved' as ApprovalAction, label: 'Approve & Publish', icon: CheckCircle2, color: 'border-green-500 bg-green-50 text-green-700' },
                    { id: 'changes_requested' as ApprovalAction, label: 'Request Changes', icon: AlertCircle, color: 'border-amber-500 bg-amber-50 text-amber-700' },
                    { id: 'rejected' as ApprovalAction, label: 'Reject Post', icon: XCircle, color: 'border-red-500 bg-red-50 text-red-700' },
                  ].map(act => {
                    const Icon = act.icon;
                    const isSelected = reviewAction === act.id;
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => setReviewAction(act.id)}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-3 text-xs font-bold transition-all ${
                          isSelected ? act.color : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{act.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editorial Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Feedback / Editorial Notes for Author
                </label>
                <textarea
                  className="input w-full text-sm"
                  rows={3}
                  placeholder={
                    reviewAction === 'approved'
                      ? 'Optional note (e.g., Looks great! Published.)'
                      : 'Provide clear suggestions or reasons for the author…'
                  }
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                />
              </div>

              {/* History Summary */}
              {(approvals[selectedPost.id] ?? []).length > 0 && (
                <div className="rounded-xl bg-gray-50 p-3 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Past Feedback Logs
                  </p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {(approvals[selectedPost.id] ?? []).map(log => (
                      <div key={log.id} className="text-xs border-b border-gray-200/60 pb-1.5 last:border-0">
                        <div className="flex justify-between font-semibold text-gray-800">
                          <span className="capitalize">{log.action.replace('_', ' ')}</span>
                          <span className="text-[10px] text-gray-400">{log.reviewer_name || 'Admin'}</span>
                        </div>
                        <p className="text-gray-600">{log.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-3">
              <button
                onClick={() => setSelectedPost(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewSubmit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Check className="h-4 w-4" />
                {submitting ? 'Saving Review…' : 'Submit Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
