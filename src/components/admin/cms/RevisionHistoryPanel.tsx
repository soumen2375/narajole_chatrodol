import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoPostRevision } from '@/types';
import { useEffect, useState } from 'react';
import { History, RotateCcw, ChevronDown, ChevronRight, Clock } from 'lucide-react';

interface Props {
  postId: string | null;
  onRestore: (snapshot: CswoPostRevision['snapshot']) => void;
}

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function RevisionHistoryPanel({ postId, onRestore }: Props) {
  const { member } = useAuth();
  const [revisions, setRevisions] = useState<CswoPostRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    if (!postId || !open) return;
    setLoading(true);
    supabase
      .from('cswo_post_revisions')
      .select('*, saved_by_member:cswo_members(full_name)')
      .eq('post_id', postId)
      .order('version', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setRevisions((data ?? []).map((r: unknown) => {
          const row = r as CswoPostRevision & { saved_by_member?: { full_name?: string } | null };
          return { ...row, saved_by_name: row.saved_by_member?.full_name ?? null };
        }));
        setLoading(false);
      });
  }, [postId, open]);

  if (!postId) {
    return (
      <div className="rounded-xl border bg-white p-4">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          <History className="h-3.5 w-3.5" /> Revision History
        </p>
        <p className="mt-2 text-xs text-gray-400">Save the post first to track revisions.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          <History className="h-3.5 w-3.5" /> Revision History
          {revisions.length > 0 && (
            <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">
              {revisions.length}
            </span>
          )}
        </span>
        {open ? <ChevronDown className="h-4 w-4 text-gray-300" /> : <ChevronRight className="h-4 w-4 text-gray-300" />}
      </button>

      {open && (
        <div className="border-t">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
            </div>
          ) : revisions.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-400">No revisions yet.</p>
          ) : (
            <div className="divide-y max-h-64 overflow-y-auto">
              {revisions.map((rev, idx) => (
                <div key={rev.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">
                        v{rev.version}
                      </span>
                      {idx === 0 && (
                        <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-600">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                      <Clock className="h-2.5 w-2.5" />
                      {timeSince(rev.saved_at)}
                      {rev.saved_by_name && <span>· {rev.saved_by_name}</span>}
                    </p>
                  </div>
                  {idx !== 0 && (
                    <button
                      type="button"
                      disabled={restoring === rev.id}
                      onClick={async () => {
                        if (!confirm(`Restore to version ${rev.version}? Current changes will be overwritten.`)) return;
                        setRestoring(rev.id);
                        onRestore(rev.snapshot);
                        setRestoring(null);
                      }}
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-500 opacity-0 group-hover:opacity-100 hover:border-orange-400 hover:text-orange-600 transition-all disabled:opacity-40"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {restoring === rev.id ? 'Restoring…' : 'Restore'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {member?.role === 'admin' && revisions.length > 0 && (
            <div className="border-t px-4 py-2">
              <p className="text-[10px] text-gray-400">Keeping last 20 revisions.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
