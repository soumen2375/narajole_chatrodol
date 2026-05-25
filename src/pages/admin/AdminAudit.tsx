import { useCallback, useEffect, useMemo, useState, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import type { CswoAuditLog } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';
import {
  Shield,
  AlertTriangle,
  Users,
  Server,
  Search,
  SlidersHorizontal,
  Download,
  ChevronDown,
  ChevronUp,
  History,
  Fingerprint,
  X,
  CheckCircle2
} from 'lucide-react';

const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const BRAND = '#0c756f'; // Premium Deep Teal
const GREEN = '#4d7c0f';
const PAPER = '#ffffff';
const CREAM = '#faf6ef';

interface AuditRow extends CswoAuditLog {
  actor?: {
    full_name: string;
    member_serial: number;
    email: string;
    role: string;
  } | null;
  category: 'Finance' | 'Members' | 'Content' | 'Events' | 'Governance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  role: 'Admin' | 'Finance' | 'Member' | 'System';
}

export default function AdminAudit() {
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [dbRows, setDbRows] = useState<CswoAuditLog[]>([]);
  const [actors, setActors] = useState<Record<string, { full_name: string; member_serial: number; email: string; role: string }>>({});
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [diffModalRow, setDiffModalRow] = useState<AuditRow | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7days' | '30days' | 'month'>('all');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Quick Filters
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('All');
  const [activeSeverityTab, setActiveSeverityTab] = useState<string>('All');
  const [activeTypeTab, setActiveTypeTab] = useState<string>('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const ENTITIES: Record<string, string> = {
    cswo_donations: tr('Donations', 'অনুদান'),
    cswo_monthly_contributions: tr('Contributions', 'চাঁদা'),
    cswo_expenses: tr('Expenses', 'ব্যয়'),
    cswo_budgets: tr('Budgets', 'বাজেট'),
    cswo_funds: tr('Funds', 'ফান্ড'),
    cswo_members: tr('Members', 'সদস্য'),
    cswo_posts: tr('Posts', 'পোস্ট'),
    cswo_events: tr('Events', 'অনুষ্ঠান'),
    cswo_attendance: tr('Attendance', 'উপস্থিতি'),
    cswo_gallery: tr('Gallery', 'গ্যালারি'),
  };

  const entityLabel = (e: string) => ENTITIES[e] ?? e.replace(/^cswo_/, '').replace(/_/g, ' ');

  // Fetch actual audit logs and complete actor information
  const load = useCallback(async () => {
    setLoading(true);
    const { data: logsData } = await supabase
      .from('cswo_audit_log')
      .select('*')
      .order('created_at', { ascending: false });
    
    const logs = (logsData ?? []) as CswoAuditLog[];
    setDbRows(logs);

    // Fetch actor details
    const actorIds = Array.from(new Set(logs.map((r) => r.actor_id).filter(Boolean)));
    if (actorIds.length) {
      const { data: membersData } = await supabase
        .from('cswo_members')
        .select('id, full_name, member_serial, email, role')
        .in('id', actorIds);
      
      const actorMap: Record<string, { full_name: string; member_serial: number; email: string; role: string }> = {};
      for (const m of membersData ?? []) {
        actorMap[m.id] = {
          full_name: m.full_name,
          member_serial: m.member_serial,
          email: m.email,
          role: m.role
        };
      }
      setActors(actorMap);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Enrich rows strictly with accurate severity, category, summary, and role attributes derived from Supabase
  const enrichedRows = useMemo<AuditRow[]>(() => {
    return dbRows.map((row) => {
      const actor = row.actor_id ? actors[row.actor_id] : null;
      
      let category: 'Finance' | 'Members' | 'Content' | 'Events' | 'Governance' = 'Governance';
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      let summary = '';

      const detail = row.detail || {};
      const ch = detail.changes as Record<string, { from: unknown; to: unknown }> | undefined;
      const nw = detail.new as Record<string, unknown> | undefined;
      const dl = detail.deleted as Record<string, unknown> | undefined;
      const dataObj = (nw || dl || detail) as any;

      // Map actor role strictly based on their real role
      let role: 'Admin' | 'Finance' | 'Member' | 'System' = 'Member';
      if (actor) {
        if (actor.role === 'admin') {
          role = 'Admin';
        } else if (actor.role === 'treasurer' || actor.role === 'finance') {
          role = 'Finance';
        } else {
          role = 'Member';
        }
      } else if (!row.actor_id) {
        role = 'System';
      }

      // Assign authentic categories, severity grades, and Summaries based on the entity
      if (row.entity === 'cswo_posts') {
        category = 'Content';
        severity = 'low';
        const title = dataObj.title || 'post';
        if (row.action === 'insert') {
          summary = tr(`Created post "${title}"`, `"${title}" পোস্ট তৈরি করেছেন`);
        } else if (row.action === 'update') {
          summary = tr(`Updated post "${title}"`, `"${title}" পোস্ট সম্পাদন করেছেন`);
        } else {
          summary = tr(`Deleted post "${title}"`, `"${title}" পোস্ট মুছে ফেলেছেন`);
          severity = 'high';
        }
      } else if (row.entity === 'cswo_categories') {
        category = 'Content';
        severity = 'low';
        const name = dataObj.name || 'category';
        summary = tr(
          `${row.action === 'insert' ? 'Created' : row.action === 'update' ? 'Updated' : 'Deleted'} category "${name}"`,
          `"${name}" ক্যাটাগরি ${row.action === 'insert' ? 'তৈরি' : row.action === 'update' ? 'আপডেট' : 'মুছে'} করেছেন`
        );
      } else if (row.entity === 'cswo_gallery') {
        category = 'Content';
        severity = 'low';
        summary = tr(
          `${row.action === 'insert' ? 'Uploaded photo to' : row.action === 'update' ? 'Updated photo in' : 'Deleted photo from'} gallery`,
          `গ্যালারি ${row.action === 'insert' ? 'ফটো আপলোড' : row.action === 'update' ? 'ফটো সম্পাদন' : 'ফটো ডিলিট'} করেছেন`
        );
      } else if (row.entity === 'cswo_events') {
        category = 'Events';
        severity = 'medium';
        const title = dataObj.title || 'event';
        if (row.action === 'insert') {
          summary = tr(`Created event "${title}"`, `"${title}" অনুষ্ঠানটি তৈরি করেছেন`);
        } else if (row.action === 'update') {
          summary = tr(`Updated event "${title}"`, `"${title}" অনুষ্ঠান সম্পাদন করেছেন`);
        } else {
          summary = tr(`Deleted event "${title}"`, `"${title}" অনুষ্ঠান মুছে ফেলেছেন`);
          severity = 'high';
        }
      } else if (row.entity === 'cswo_attendance') {
        category = 'Events';
        severity = 'low';
        const status = dataObj.status || 'present';
        summary = tr(`Marked attendance as ${status}`, `উপস্থিতি ${status} হিসেবে চিহ্নিত করেছেন`);
      } else if (row.entity === 'cswo_donations') {
        category = 'Finance';
        severity = 'medium';
        const amt = dataObj.amount ? `৳${dataObj.amount.toLocaleString()}` : '';
        const donor = dataObj.donor_name || tr('Anonymous', 'বেনামী');
        if (row.action === 'insert') {
          summary = tr(`Recorded donation of ${amt} from ${donor}`, `${donor} থেকে ${amt} অনুদান নথিভুক্ত করেছেন`);
        } else if (row.action === 'update') {
          summary = tr(`Updated donation details for ${donor}`, `${donor} এর অনুদানের তথ্য সম্পাদন করেছেন`);
        } else {
          summary = tr(`Deleted donation record from ${donor}`, `${donor} এর অনুদান রেকর্ড মুছে ফেলেছেন`);
          severity = 'high';
        }
      } else if (row.entity === 'cswo_monthly_contributions') {
        category = 'Finance';
        severity = 'medium';
        const amt = dataObj.amount ? `৳${dataObj.amount.toLocaleString()}` : '';
        summary = tr(
          `${row.action === 'insert' ? 'Recorded' : row.action === 'update' ? 'Updated' : 'Deleted'} monthly contribution of ${amt}`,
          `${amt} চাঁদা রেকর্ড ${row.action === 'insert' ? 'যুক্ত' : row.action === 'update' ? 'আপডেট' : 'মুছে'} করেছেন`
        );
      } else if (row.entity === 'cswo_expenses') {
        category = 'Finance';
        severity = 'medium';
        const amt = dataObj.amount ? `৳${dataObj.amount.toLocaleString()}` : '';
        const desc = dataObj.description || 'expense';
        if (row.action === 'insert') {
          summary = tr(`Added new expense ${amt} for ${desc}`, `${desc} এর জন্য ${amt} ব্যয় যুক্ত করেছেন`);
        } else if (row.action === 'update') {
          const status = dataObj.status;
          if (status === 'approved') {
            summary = tr(`Approved expense ${amt} for ${desc}`, `${desc} এর জন্য ${amt} ব্যয় অনুমোদন করেছেন`);
            severity = 'high';
          } else {
            summary = tr(`Updated expense details for ${desc}`, `${desc} এর ব্যয়ের তথ্য সম্পাদন করেছেন`);
          }
        } else {
          summary = tr(`Deleted expense record for ${desc}`, `${desc} এর ব্যয় রেকর্ড মুছে ফেলেছেন`);
          severity = 'high';
        }
      } else if (row.entity === 'cswo_budgets') {
        category = 'Finance';
        severity = 'medium';
        const amt = dataObj.amount ? `৳${dataObj.amount.toLocaleString()}` : '';
        const yr = dataObj.fiscal_year || 'this year';
        summary = tr(
          `${row.action === 'insert' ? 'Created' : row.action === 'update' ? 'Updated' : 'Deleted'} budget of ${amt} for ${yr}`,
          `${yr} এর জন্য ${amt} বাজেট ${row.action === 'insert' ? 'তৈরি' : row.action === 'update' ? 'আপডেট' : 'মুছে'} করেছেন`
        );
      } else if (row.entity === 'cswo_funds') {
        category = 'Finance';
        severity = 'medium';
        const name = dataObj.name || 'fund';
        if (row.action === 'fund.is_frozen') {
          summary = tr(`Froze fund "${name}"`, `"${name}" ফান্ডটি স্থগিত করেছেন`);
          severity = 'critical';
        } else if (row.action === 'fund.is_restricted') {
          summary = tr(`Changed restriction flag on fund "${name}"`, `"${name}" ফান্ডের বিধি পরিবর্তন করেছেন`);
          severity = 'high';
        } else {
          summary = tr(
            `${row.action === 'insert' ? 'Created' : row.action === 'update' ? 'Updated' : 'Deleted'} fund "${name}"`,
            `"${name}" ফান্ড ${row.action === 'insert' ? 'তৈরি' : row.action === 'update' ? 'আপডেট' : 'মুছে'} করেছেন`
          );
        }
      } else if (row.entity === 'cswo_members') {
        category = 'Members';
        severity = 'low';
        const name = dataObj.full_name || 'member';
        if (ch && ('can_manage_posts' in ch || 'can_manage_events' in ch || 'can_manage_finance' in ch || 'role' in ch)) {
          summary = tr(`Updated member permissions for ${name}`, `${name} এর অধিকার পরিবর্তন করেছেন`);
          severity = 'critical';
        } else if (row.action === 'insert') {
          summary = tr(`Approved member profile for ${name}`, `${name} এর প্রোফাইল অনুমোদন করেছেন`);
        } else {
          summary = tr(`Updated profile settings for ${name}`, `${name} এর প্রোফাইল সম্পাদন করেছেন`);
        }
      }

      if (!summary) {
        summary = tr(`${row.action} action on ${row.entity}`, `${row.entity} এ ${row.action} সম্পন্ন`);
      }

      return {
        ...row,
        actor,
        category,
        severity,
        summary,
        role,
      };
    });
  }, [dbRows, actors, tr]);

  // Compute metrics from actual dataset
  const stats = useMemo(() => {
    const total = enrichedRows.length;
    const critical = enrichedRows.filter((r) => r.severity === 'critical').length;
    const uniqueActors = new Set(enrichedRows.map((r) => r.actor_id).filter(Boolean));
    const uniqueCount = uniqueActors.size + (enrichedRows.some((r) => r.role === 'System') ? 1 : 0);
    const systemCount = enrichedRows.filter((r) => r.role === 'System').length;

    return {
      total,
      critical,
      unique: uniqueCount,
      system: systemCount,
    };
  }, [enrichedRows]);

  // Apply filters
  const filteredRows = useMemo(() => {
    return enrichedRows.filter((row) => {
      // 1. Global Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const actorName = row.actor?.full_name?.toLowerCase() || 'system';
        const serialStr = row.actor?.member_serial ? `cswo-${String(row.actor.member_serial).padStart(4, '0')}` : 'sys';
        const actionStr = row.action.toLowerCase();
        const entityStr = row.entity.toLowerCase();
        const summaryStr = row.summary.toLowerCase();
        const detailStr = JSON.stringify(row.detail).toLowerCase();
        const idStr = row.id.toLowerCase();

        const match =
          actorName.includes(query) ||
          serialStr.includes(query) ||
          actionStr.includes(query) ||
          entityStr.includes(query) ||
          summaryStr.includes(query) ||
          detailStr.includes(query) ||
          idStr.includes(query);

        if (!match) return false;
      }

      // 2. Entity Dropdown
      if (selectedEntity && row.entity !== selectedEntity) return false;

      // 3. Action Dropdown
      if (selectedAction && row.action !== selectedAction) return false;

      // 4. Severity Dropdown
      if (selectedSeverity && row.severity !== selectedSeverity) return false;

      // 5. Category Tab
      if (activeCategoryTab !== 'All' && row.category !== activeCategoryTab) return false;

      // 6. Severity Tab
      if (activeSeverityTab !== 'All' && row.severity !== activeSeverityTab.toLowerCase()) return false;

      // 7. Type Tab
      if (activeTypeTab === 'User Actions' && row.role === 'System') return false;
      if (activeTypeTab === 'System Actions' && row.role !== 'System') return false;

      // 8. Date Range
      if (dateRange !== 'all') {
        const rowTime = new Date(row.created_at).getTime();
        const now = Date.now();
        if (dateRange === 'today') {
          const startOfToday = new Date().setHours(0, 0, 0, 0);
          if (rowTime < startOfToday) return false;
        } else if (dateRange === '7days') {
          const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
          if (rowTime < sevenDaysAgo) return false;
        } else if (dateRange === '30days') {
          const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
          if (rowTime < thirtyDaysAgo) return false;
        } else if (dateRange === 'month') {
          const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
          if (rowTime < startOfMonth) return false;
        }
      }

      return true;
    });
  }, [
    enrichedRows,
    searchQuery,
    selectedEntity,
    selectedAction,
    selectedSeverity,
    activeCategoryTab,
    activeSeverityTab,
    activeTypeTab,
    dateRange,
  ]);

  // Reset all filters
  const handleClearAll = () => {
    setSearchQuery('');
    setSelectedEntity('');
    setSelectedAction('');
    setSelectedSeverity('');
    setDateRange('all');
    setActiveCategoryTab('All');
    setActiveSeverityTab('All');
    setActiveTypeTab('All');
    setCurrentPage(1);
    showToast(tr('Filters cleared successfully.', 'সব ফিল্টার সফলভাবে বাতিল করা হয়েছে।'));
  };

  // Pagination Slicing
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);

  // Export filtered logs to CSV
  const handleExportCSV = () => {
    try {
      const headers = ['Date & Time', 'Actor ID/Serial', 'Actor Name', 'Role', 'Category', 'Severity', 'Action', 'Entity', 'Summary'];
      const rowsData = filteredRows.map((r) => {
        const serial = r.actor?.member_serial ? `CSWO-${String(r.actor.member_serial).padStart(4, '0')}` : 'SYS';
        return [
          new Date(r.created_at).toLocaleString(),
          serial,
          r.actor?.full_name || 'System',
          r.role,
          r.category,
          r.severity.toUpperCase(),
          r.action,
          r.entity,
          r.summary.replace(/"/g, '""'),
        ];
      });

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rowsData.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `ngo_governance_audit_logs_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(tr('CSV Audit Log downloaded successfully.', 'অডিট লগ CSV ফাইল সফলভাবে ডাউনলোড করা হয়েছে।'));
    } catch {
      showToast(tr('Export failed.', 'এক্সপোর্ট ব্যর্থ হয়েছে।'));
    }
  };

  // Format cell data
  const formatFieldVal = (key: string, v: unknown) => {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? tr('Yes', 'হ্যাঁ') : tr('No', 'না');
    
    if (key.includes('at') || key.includes('date')) {
      const str = String(v);
      if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
        return new Date(str).toLocaleString(lang === 'bn' ? 'bn-IN' : 'en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }

    const strVal = String(v);
    if (strVal.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return `${strVal.slice(0, 8)}...${strVal.slice(-4)}`;
    }

    return strVal;
  };

  // Avatar Initials Hash Color generator
  const avatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#0c756f', '#4d7c0f', '#0f766e', '#7c3aed', '#b45309', '#9a3412'];
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-xl flex items-center gap-2 border border-teal-500/10 animate-in slide-in-from-bottom-5 duration-200" style={{ background: BRAND }}>
          <Shield className="h-4 w-4" />
          {toastMessage}
        </div>
      )}

      {/* BEFORE / AFTER JSON DIFF VISUAL MODAL */}
      {diffModalRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 border flex flex-col max-h-[85vh]" style={{ borderColor: RULE }}>
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: RULE }}>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" style={{ color: BRAND }} />
                <h3 className="text-base font-bold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>
                  {tr('Before & After Visual Change Comparison', 'পরিবর্তনের পূর্ববর্তী ও পরবর্তী তুলনা')}
                </h3>
              </div>
              <button
                onClick={() => setDiffModalRow(null)}
                className="rounded-full p-1.5 transition-colors hover:bg-black/5"
                style={{ color: MUTED }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto font-mono text-xs">
              {/* BEFORE */}
              <div className="rounded-xl border p-4 bg-[#faf6ef]/50" style={{ borderColor: `${RULE}90` }}>
                <h4 className="mb-2 border-b pb-1 font-bold text-red-700" style={{ borderColor: `${RULE}80` }}>
                  ◀ BEFORE (OLD VALUES)
                </h4>
                <pre className="whitespace-pre-wrap overflow-x-auto leading-relaxed text-stone-700">
                  {(() => {
                    const detail = diffModalRow.detail || {};
                    if (detail.changes) {
                      const beforeObj: Record<string, unknown> = {};
                      for (const [k, v] of Object.entries(detail.changes as Record<string, { from: unknown; to: unknown }>)) {
                        beforeObj[k] = v.from;
                      }
                      return JSON.stringify(beforeObj, null, 2);
                    }
                    if (detail.deleted) return JSON.stringify(detail.deleted, null, 2);
                    return JSON.stringify(detail, null, 2);
                  })()}
                </pre>
              </div>

              {/* AFTER */}
              <div className="rounded-xl border p-4 bg-[#faf6ef]/50" style={{ borderColor: `${RULE}90` }}>
                <h4 className="mb-2 border-b pb-1 font-bold text-green-700" style={{ borderColor: `${RULE}80` }}>
                  ▶ AFTER (NEW VALUES)
                </h4>
                <pre className="whitespace-pre-wrap overflow-x-auto leading-relaxed text-stone-800 font-bold">
                  {(() => {
                    const detail = diffModalRow.detail || {};
                    if (detail.changes) {
                      const afterObj: Record<string, unknown> = {};
                      for (const [k, v] of Object.entries(detail.changes as Record<string, { from: unknown; to: unknown }>)) {
                        afterObj[k] = v.to;
                      }
                      return JSON.stringify(afterObj, null, 2);
                    }
                    if (detail.new) return JSON.stringify(detail.new, null, 2);
                    return JSON.stringify(detail, null, 2);
                  })()}
                </pre>
              </div>
            </div>

            <div className="mt-5 border-t pt-4 text-right" style={{ borderColor: RULE }}>
              <button
                onClick={() => setDiffModalRow(null)}
                className="rounded-full px-5 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-sm"
                style={{ background: INK }}
              >
                {tr('Close View', 'বন্ধ করুন')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
            {tr('Governance', 'সুশাসন')} · {tr('Audit Logs', 'অডিট লগ')}
          </div>
          <h1 className="mt-1.5 text-[28px] leading-tight flex items-center gap-2 font-bold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>
            {tr('Audit Logs Center', 'প্রমাণীকৃত অডিট লগ')} <Shield className="h-6 w-6" style={{ color: BRAND }} />
          </h1>
          <p className="mt-1 max-w-2xl text-[13.5px]" style={{ color: INK2 }}>
            {tr(
              'A tamper-proof record of who changed what across finance, budgets, members, posts and configurations.',
              'অর্থ সংক্রান্ত কে কী পরিবর্তন করেছে তার সম্পূর্ণ ও প্রমাণীকৃত বিবরণ।'
            )}
          </p>
        </div>

        {/* EXPORT DIRECT BUTTON */}
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors hover:bg-black/[0.03]"
          style={{ border: `1px solid ${RULE}`, color: INK2 }}
        >
          <Download className="h-3.5 w-3.5" /> {tr('Export CSV', 'CSV এক্সপোর্ট')}
        </button>
      </div>

      {/* METRICS / STATS CARDS */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {/* TOTAL ACTIONS */}
        <div className="rounded-xl p-5 flex items-center justify-between" style={{ background: PAPER, border: `1px solid ${RULE}`, boxShadow: '0 4px 12px rgba(0,2,1,0.02)' }}>
          <div className="space-y-1">
            <p className="font-mono text-[9px] font-extrabold uppercase tracking-widest" style={{ color: MUTED }}>{tr('Total Actions', 'সর্বমোট অ্যাকশন')}</p>
            <p className="text-2xl font-black leading-none tracking-tight" style={{ color: INK }}>{stats.total.toLocaleString()}</p>
            <p className="text-[11px] font-semibold mt-1" style={{ color: GREEN }}>
              {tr('Authentic logs in DB', 'ডাটাবেস রেকর্ড')}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(77,124,15,0.08)', color: GREEN }}>
            <Shield className="h-5 w-5" />
          </div>
        </div>

        {/* CRITICAL ACTIONS */}
        <div className="rounded-xl p-5 flex items-center justify-between" style={{ background: PAPER, border: `1px solid ${RULE}`, boxShadow: '0 4px 12px rgba(0,2,1,0.02)' }}>
          <div className="space-y-1">
            <p className="font-mono text-[9px] font-extrabold uppercase tracking-widest" style={{ color: MUTED }}>{tr('Critical Actions', 'গুরুত্বপূর্ণ অ্যাকশন')}</p>
            <p className="text-2xl font-black leading-none tracking-tight" style={{ color: INK }}>{stats.critical}</p>
            <p className="text-[11px] font-semibold mt-1 animate-pulse" style={{ color: BRAND }}>
              {tr('Security / RLS checks', 'নিরাপত্তা সংক্রান্ত')}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(12,117,111,0.08)', color: BRAND }}>
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        {/* UNIQUE USERS */}
        <div className="rounded-xl p-5 flex items-center justify-between" style={{ background: PAPER, border: `1px solid ${RULE}`, boxShadow: '0 4px 12px rgba(0,2,1,0.02)' }}>
          <div className="space-y-1">
            <p className="font-mono text-[9px] font-extrabold uppercase tracking-widest" style={{ color: MUTED }}>{tr('Unique Users', 'ইউনিক ব্যবহারকারী')}</p>
            <p className="text-2xl font-black leading-none tracking-tight" style={{ color: INK }}>{stats.unique}</p>
            <p className="text-[11px] font-semibold mt-1" style={{ color: '#6d28d9' }}>
              {tr('Active audit actors', 'সক্রিয় ব্যবহারকারী')}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.08)', color: '#6d28d9' }}>
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* SYSTEM ACTIONS */}
        <div className="rounded-xl p-5 flex items-center justify-between" style={{ background: PAPER, border: `1px solid ${RULE}`, boxShadow: '0 4px 12px rgba(0,2,1,0.02)' }}>
          <div className="space-y-1">
            <p className="font-mono text-[9px] font-extrabold uppercase tracking-widest" style={{ color: MUTED }}>{tr('System Actions', 'সিস্টেম অ্যাকশন')}</p>
            <p className="text-2xl font-black leading-none tracking-tight" style={{ color: INK }}>{stats.system}</p>
            <p className="text-[11px] font-semibold mt-1" style={{ color: '#b45309' }}>
              {tr('Triggered automatically', 'স্বয়ংক্রিয় ব্যাকগ্রাউন্ড')}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(180,83,9,0.08)', color: '#b45309' }}>
            <Server className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ───────── Filters ───────── */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: PAPER, border: `1px solid ${RULE}`, boxShadow: '0 4px 14px rgba(0,2,1,0.02)' }}>
        {/* Search & Advanced Filters Trigger */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Smart Search */}
          <div className="relative min-w-[280px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: MUTED }} />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={tr('Search name, serial, action, entity, summary or UUID...', 'নাম, সিরিয়াল, অ্যাকশন, এন্টিটি বা আইডি খুঁজুন...')}
              className="w-full rounded-md py-2 pl-9 pr-3 text-[13px] outline-none transition-colors"
              style={{ border: `1px solid ${RULE}`, color: INK, background: `${CREAM}30` }}
            />
          </div>

          {/* Filters Toggle Button */}
          <button
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className="flex items-center gap-1.5 rounded-md px-4 py-2.5 text-[12.5px] font-bold transition-all focus:outline-none"
            style={{
              border: `1px solid ${showFiltersPanel ? INK : RULE}`,
              background: showFiltersPanel ? INK : PAPER,
              color: showFiltersPanel ? CREAM : INK2
            }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {tr('Advanced Selectors', 'উন্নত ফিল্টার')}
          </button>
        </div>

        {/* DETAILED DROPDOWNS FILTERS PANEL */}
        {showFiltersPanel && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4 animate-in fade-in slide-in-from-top-2 duration-200" style={{ borderColor: RULE }}>
            {/* Entity Filter */}
            <div>
              <label className="mb-1.5 block font-mono text-[9px] font-extrabold uppercase tracking-wider" style={{ color: MUTED }}>
                {tr('Database Table', 'ডাটাবেস টেবিল')}
              </label>
              <select
                value={selectedEntity}
                onChange={(e) => {
                  setSelectedEntity(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-md px-3 py-2 text-[12.5px] font-semibold outline-none"
                style={{ border: `1px solid ${RULE}`, color: INK2, background: PAPER }}
              >
                <option value="">{tr('All Entities', 'সব এন্টিটি')}</option>
                {Object.keys(ENTITIES).map((k) => (
                  <option key={k} value={k}>
                    {ENTITIES[k]}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <label className="mb-1.5 block font-mono text-[9px] font-extrabold uppercase tracking-wider" style={{ color: MUTED }}>
                {tr('Operation / Action', 'অপারেশন / অ্যাকশন')}
              </label>
              <select
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-md px-3 py-2 text-[12.5px] font-semibold outline-none"
                style={{ border: `1px solid ${RULE}`, color: INK2, background: PAPER }}
              >
                <option value="">{tr('All Actions', 'সব অ্যাকশন')}</option>
                <option value="insert">{tr('Insert', 'যোগ')}</option>
                <option value="update">{tr('Update', 'সম্পাদনা')}</option>
                <option value="delete">{tr('Delete', 'মুছে ফেলা')}</option>
                <option value="fund.is_frozen">{tr('Fund Frozen', 'ফান্ড স্থগিত')}</option>
                <option value="fund.is_restricted">{tr('Restriction Modified', 'সীমাবদ্ধতা সম্পাদন')}</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div>
              <label className="mb-1.5 block font-mono text-[9px] font-extrabold uppercase tracking-wider" style={{ color: MUTED }}>
                {tr('Severity Grade', 'গুরুত্ব স্তর')}
              </label>
              <select
                value={selectedSeverity}
                onChange={(e) => {
                  setSelectedSeverity(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-md px-3 py-2 text-[12.5px] font-semibold outline-none"
                style={{ border: `1px solid ${RULE}`, color: INK2, background: PAPER }}
              >
                <option value="">{tr('All Severity', 'সব গুরুত্ব')}</option>
                <option value="low">🟢 {tr('Low', 'কম')}</option>
                <option value="medium">🟡 {tr('Medium', 'মাঝারি')}</option>
                <option value="high">🟠 {tr('High', 'উচ্চ')}</option>
                <option value="critical">🔴 {tr('Critical', 'ক্রিটিক্যাল')}</option>
              </select>
            </div>

            {/* Date Range Picker */}
            <div>
              <label className="mb-1.5 block font-mono text-[9px] font-extrabold uppercase tracking-wider" style={{ color: MUTED }}>
                {tr('Timeframe', 'সময়কাল')}
              </label>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value as 'all' | 'today' | '7days' | '30days' | 'month');
                  setCurrentPage(1);
                }}
                className="w-full rounded-md px-3 py-2 text-[12.5px] font-semibold outline-none"
                style={{ border: `1px solid ${RULE}`, color: INK2, background: PAPER }}
              >
                <option value="all">{tr('All Time', 'সব সময়')}</option>
                <option value="today">{tr('Today', 'আজ')}</option>
                <option value="7days">{tr('Last 7 Days', 'গত ৭ দিন')}</option>
                <option value="30days">{tr('Last 30 Days', 'গত ৩০ দিন')}</option>
                <option value="month">{tr('This Month', 'চলতি মাস')}</option>
              </select>
            </div>
          </div>
        )}

        {/* QUICK TABS CONTROLLER PANEL */}
        <div className="border-t pt-4 space-y-3.5" style={{ borderColor: RULE }}>
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="font-mono text-[9px] font-extrabold uppercase tracking-widest mr-2" style={{ color: MUTED }}>
                {tr('Category:', 'বিভাগ:')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Finance', 'Members', 'Content', 'Events', 'Governance'].map((tab) => {
                  const active = activeCategoryTab === tab;
                  const count = tab === 'All' ? enrichedRows.length : enrichedRows.filter(r => r.category === tab).length;
                  return (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveCategoryTab(tab);
                        setCurrentPage(1);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors"
                      style={{
                        background: active ? INK : CREAM,
                        color: active ? CREAM : INK2,
                        border: `1px solid ${active ? INK : RULE}`
                      }}
                    >
                      {tr(tab, tab === 'All' ? 'সব' : tab === 'Finance' ? 'অর্থ' : tab === 'Members' ? 'সদস্য' : tab === 'Content' ? 'কন্টেন্ট' : tab === 'Events' ? 'অনুষ্ঠান' : 'সুশাসন')}
                      <span className="font-mono text-[10px]" style={{ opacity: 0.6 }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleClearAll}
              className="text-[12px] font-bold hover:underline transition-colors"
              style={{ color: BRAND }}
            >
              {tr('Clear all filters', 'সব ফিল্টার মুছুন')}
            </button>
          </div>

          {/* Severity & Actor Type Tabs */}
          <div className="flex flex-wrap gap-x-8 gap-y-3 pt-3 border-t" style={{ borderColor: `${RULE}80` }}>
            {/* Severity Tabs */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="font-mono text-[9px] font-extrabold uppercase tracking-widest mr-2" style={{ color: MUTED }}>
                {tr('Severity:', 'গুরুত্ব:')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Critical', 'High', 'Medium', 'Low'].map((tab) => {
                  const active = activeSeverityTab === tab;
                  const severityKey = tab.toLowerCase();
                  const count = tab === 'All' ? enrichedRows.length : enrichedRows.filter(r => r.severity === severityKey).length;
                  
                  return (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveSeverityTab(tab);
                        setCurrentPage(1);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors"
                      style={{
                        background: active ? INK : CREAM,
                        color: active ? CREAM : INK2,
                        border: `1px solid ${active ? INK : RULE}`
                      }}
                    >
                      {tab === 'Critical' && <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />}
                      {tab === 'High' && <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />}
                      {tab === 'Medium' && <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />}
                      {tab === 'Low' && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                      {tr(tab, tab === 'All' ? 'সব' : tab === 'Critical' ? 'ক্রিটিক্যাল' : tab === 'High' ? 'উচ্চ' : tab === 'Medium' ? 'মাঝারি' : 'কম')}
                      <span className="font-mono text-[10px]" style={{ opacity: 0.6 }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actor Type Tabs */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="font-mono text-[9px] font-extrabold uppercase tracking-widest mr-2" style={{ color: MUTED }}>
                {tr('Trigger:', 'ট্রিগার:')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'User Actions', 'System Actions'].map((tab) => {
                  const active = activeTypeTab === tab;
                  const count = tab === 'All' 
                    ? enrichedRows.length 
                    : tab === 'User Actions' 
                      ? enrichedRows.filter(r => r.role !== 'System').length 
                      : enrichedRows.filter(r => r.role === 'System').length;
                  return (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTypeTab(tab);
                        setCurrentPage(1);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors"
                      style={{
                        background: active ? INK : CREAM,
                        color: active ? CREAM : INK2,
                        border: `1px solid ${active ? INK : RULE}`
                      }}
                    >
                      {tr(tab, tab === 'All' ? 'সব অ্যাকশন' : tab === 'User Actions' ? 'ব্যবহারকারী' : 'স্বয়ংক্রিয়')}
                      <span className="font-mono text-[10px]" style={{ opacity: 0.6 }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AUDIT LOG TABLE GRID */}
      {loading ? (
        <TableSkeleton rows={10} />
      ) : (
        <div className="overflow-visible rounded-xl" style={{ background: PAPER, border: `1px solid ${RULE}`, boxShadow: '0 4px 14px rgba(0,2,1,0.02)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px] border-collapse">
              <thead>
                <tr style={{ borderBottom: `1px solid ${RULE}` }}>
                  {[
                    tr('Date & Time', 'তারিখ ও সময়'),
                    tr('Actor / User', 'ব্যবহারকারী'),
                    tr('Role', 'ভূমিকা'),
                    tr('Action', 'অ্যাকশন'),
                    tr('Entity', 'এন্টিটি'),
                    tr('Summary', 'বিবরণ'),
                    tr('Severity', 'গুরুত্ব'),
                    ''
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.16em]"
                      style={{ color: MUTED }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((r) => {
                  const isExpanded = expandedRow === r.id;
                  
                  // Severity badges
                  const SEV_META = {
                    low: { label: tr('Low', 'কম'), color: 'text-green-600 bg-green-50/70 border border-green-100', dot: 'bg-green-600' },
                    medium: { label: tr('Medium', 'মাঝারি'), color: 'text-yellow-600 bg-yellow-50/70 border border-yellow-100', dot: 'bg-yellow-500' },
                    high: { label: tr('High', 'উচ্চ'), color: 'text-orange-600 bg-orange-50/70 border border-orange-100', dot: 'bg-orange-600' },
                    critical: { label: tr('Critical', 'ক্রিটিক্যাল'), color: 'text-red-700 bg-red-50/90 border border-red-200 font-bold shadow-sm', dot: 'bg-red-600 animate-ping' }
                  }[r.severity];

                  // Action badges
                  const ACT_META = {
                    insert: { label: tr('Added', 'যুক্ত'), color: 'text-green-700 bg-green-50 border border-green-150' },
                    update: { label: tr('Updated', 'সম্পাদনা'), color: 'text-amber-700 bg-amber-50 border border-amber-150' },
                    delete: { label: tr('Deleted', 'মুছে ফেলা'), color: 'text-red-700 bg-red-50 border border-red-150 font-bold' }
                  }[r.action] || { label: r.action.replace(/[._]/g, ' '), color: 'text-stone-700 bg-stone-50 border border-stone-150' };

                  // Role badges
                  const ROLE_META = {
                    Admin: 'bg-stone-900 text-stone-100 font-bold',
                    Finance: 'bg-teal-50 text-teal-700 border border-teal-100 font-bold',
                    Member: 'bg-stone-50 text-stone-600 border border-stone-150',
                    System: 'bg-purple-50 text-purple-700 border border-purple-100 font-bold'
                  }[r.role];

                  // Actor Initials & Serial Number
                  const actorInitials = r.actor?.full_name
                    ? r.actor.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                    : 'SYS';

                  const serialStr = r.actor?.member_serial
                    ? `CSWO-${String(r.actor.member_serial).padStart(4, '0')}`
                    : r.actor_id
                      ? `ID: ${r.actor_id.slice(0, 8)}`
                      : r.role === 'System' ? 'SYSTEM' : 'SYS';

                  return (
                    <Fragment key={r.id}>
                      <tr
                        onClick={() => setExpandedRow(isExpanded ? null : r.id)}
                        className="transition-colors cursor-pointer hover:bg-black/[0.015]"
                        style={{
                          borderBottom: `1px solid ${RULE}`,
                          background: isExpanded ? `${CREAM}50` : undefined,
                        }}
                      >
                        {/* Time */}
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-medium" style={{ color: INK2 }}>
                          <div>
                            {new Date(r.created_at).toLocaleDateString(lang === 'bn' ? 'bn-IN' : 'en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="font-mono text-[10px] font-bold mt-0.5" style={{ color: MUTED }}>
                            {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Actor Circle Avatar + Name + Unique Serial ID + Email */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <span
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-sm"
                              style={{ background: avatarColor(r.actor?.full_name || 'System') }}
                            >
                              {actorInitials}
                            </span>
                            <div className="min-w-0">
                              <span className="block truncate font-semibold" style={{ color: INK }}>
                                {r.actor?.full_name || tr('System Automated', 'সিস্টেম অটোমেটেড')}
                              </span>
                              <div className="font-mono text-[10.5px] flex items-center gap-1.5" style={{ color: MUTED }}>
                                <span className="font-bold text-[#0c756f]">{serialStr}</span>
                                {r.actor?.email && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-[120px]">{r.actor.email}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${ROLE_META}`}>
                            {tr(r.role, r.role === 'Admin' ? 'অ্যাডমিন' : r.role === 'Finance' ? 'কোষাধ্যক্ষ' : r.role === 'System' ? 'সিস্টেম' : 'সদস্য')}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ${ACT_META.color}`}>
                            {ACT_META.label}
                          </span>
                        </td>

                        {/* Entity */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
                          {entityLabel(r.entity)}
                        </td>

                        {/* Summary */}
                        <td className="px-4 py-3 text-xs font-semibold max-w-[240px] truncate" style={{ color: INK2 }}>
                          {r.summary}
                        </td>

                        {/* Severity */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit ${SEV_META.color}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${SEV_META.dot}`} />
                            {SEV_META.label}
                          </span>
                        </td>

                        {/* Details Trigger */}
                        <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedRow(isExpanded ? null : r.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-full px-3 py-1 font-bold transition-all"
                            style={{
                              border: `1px solid ${RULE}`,
                              background: PAPER,
                              color: INK2,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                            }}
                          >
                            {tr('View', 'দেখুন')}
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        </td>
                      </tr>

                      {/* EXPANDED DETAILS CARD PANEL */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="p-0" style={{ background: CREAM }}>
                            <div className="p-6 animate-in slide-in-from-top-3 duration-200" style={{ borderBottom: `1px solid ${RULE}` }}>
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                
                                {/* COLUMN 1 (8 Cols): CHANGE DETAILS / DATA FIELDS */}
                                <div className="lg:col-span-8 p-5 rounded-xl flex flex-col justify-between" style={{ background: PAPER, border: `1px solid ${RULE}`, boxShadow: '0 2px 8px rgba(0,2,1,0.01)' }}>
                                  <div>
                                    <div className="flex items-center gap-2 border-b pb-2 mb-3" style={{ borderColor: RULE }}>
                                      <History className="h-4 w-4" style={{ color: BRAND }} />
                                      <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
                                        {tr('Change Details / Logged Fields', 'পরিবর্তন ও ডাটা ফিল্ডসমূহ')}
                                      </h4>
                                    </div>
                                    
                                    {/* Data Table */}
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                          <tr className="border-b text-[10px] font-bold" style={{ borderColor: RULE, color: MUTED }}>
                                            <th className="py-2 pr-4 text-left uppercase tracking-wider">{tr('Field Name', 'ফিল্ডের নাম')}</th>
                                            {r.detail?.changes ? (
                                              <>
                                                <th className="py-2 px-2 text-left uppercase tracking-wider text-red-700">{tr('Old Value', 'পূর্ববর্তী মান')}</th>
                                                <th className="py-2 pl-2 text-left uppercase tracking-wider text-green-700">{tr('New Value', 'পরবর্তী মান')}</th>
                                              </>
                                            ) : (
                                              <th className="py-2 pl-4 text-left uppercase tracking-wider">{tr('Recorded Value', 'নথিভুক্ত মান')}</th>
                                            )}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-100 font-semibold" style={{ color: INK2 }}>
                                          {r.detail && Object.keys(r.detail).length ? (
                                            (() => {
                                              const changes = r.detail.changes as Record<string, { from: unknown; to: unknown }> | undefined;
                                              if (changes) {
                                                return Object.entries(changes)
                                                  .filter(([k]) => k !== 'id')
                                                  .map(([field, diff]) => (
                                                    <tr key={field} className="hover:bg-stone-50/50">
                                                      <td className="py-2 pr-4 font-bold text-stone-500 capitalize">{field.replace(/_/g, ' ')}</td>
                                                      <td className="py-2 px-2 text-red-700 font-mono text-[11px] line-through bg-red-50/20">
                                                        {formatFieldVal(field, diff.from)}
                                                      </td>
                                                      <td className="py-2 pl-2 text-green-700 font-mono text-[11px] font-bold bg-green-50/20">
                                                        {formatFieldVal(field, diff.to)}
                                                      </td>
                                                    </tr>
                                                  ));
                                              }
                                              
                                              const dataObj = (r.detail.new || r.detail.deleted || r.detail) as any;
                                              return Object.entries(dataObj)
                                                .filter(([k]) => k !== 'id' && typeof dataObj[k] !== 'object')
                                                .map(([k, v]) => (
                                                  <tr key={k} className="hover:bg-stone-50/50">
                                                    <td className="py-2 pr-4 font-bold text-stone-500 capitalize">{k.replace(/_/g, ' ')}</td>
                                                    <td className="py-2 pl-4 font-mono text-[11px]" style={{ color: INK }}>
                                                      {formatFieldVal(k, v)}
                                                    </td>
                                                  </tr>
                                                ));
                                            })()
                                          ) : (
                                            <tr>
                                              <td colSpan={3} className="italic py-4 text-center" style={{ color: MUTED }}>
                                                {tr('No detailed fields logged for this action.', 'এই অ্যাকশনের জন্য কোনো বিস্তারিত ডাটা নেই।')}
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  <div className="mt-4 pt-3 border-t" style={{ borderColor: RULE }}>
                                    <button
                                      onClick={() => setDiffModalRow(r)}
                                      className="rounded-full px-4 py-2 text-xs font-bold transition-all hover:bg-stone-100"
                                      style={{
                                        border: `1px solid ${RULE}`,
                                        background: CREAM,
                                        color: INK
                                      }}
                                    >
                                      {tr('Compare Full Visual Diff', 'ভিস্যুয়াল ডিফ তুলনা করুন')}
                                    </button>
                                  </div>
                                </div>

                                {/* COLUMN 2 (4 Cols): AUTHENTIC AUDIT METADATA */}
                                <div className="lg:col-span-4 p-5 rounded-xl flex flex-col justify-between" style={{ background: PAPER, border: `1px solid ${RULE}`, boxShadow: '0 2px 8px rgba(0,2,1,0.01)' }}>
                                  <div>
                                    <div className="flex items-center gap-2 border-b pb-2 mb-3" style={{ borderColor: RULE }}>
                                      <Fingerprint className="h-4 w-4" style={{ color: BRAND }} />
                                      <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
                                        {tr('Audit Metadata', 'অডিট মেটাডাটা')}
                                      </h4>
                                    </div>
                                    <div className="space-y-3 text-xs font-semibold">
                                      {/* Log ID */}
                                      <div className="flex flex-col gap-0.5 border-b pb-2" style={{ borderColor: `${RULE}80` }}>
                                        <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{tr('Log Entry UUID', 'লগ এন্ট্রি আইডি')}</span>
                                        <span className="font-mono text-[10.5px]" style={{ color: INK }}>{r.id}</span>
                                      </div>
                                      
                                      {/* Record ID */}
                                      {r.entity_id && (
                                        <div className="flex flex-col gap-0.5 border-b pb-2" style={{ borderColor: `${RULE}80` }}>
                                          <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{tr('Target Record ID', 'টার্গেট রেকর্ড আইডি')}</span>
                                          <span className="font-mono text-[10.5px]" style={{ color: INK }}>{r.entity_id}</span>
                                        </div>
                                      )}

                                      {/* Action Details */}
                                      <div className="flex justify-between border-b pb-2" style={{ borderColor: `${RULE}80` }}>
                                        <span style={{ color: MUTED }}>{tr('Action Call', 'অ্যাকশন')}</span>
                                        <span className="font-mono" style={{ color: INK }}>{r.action}</span>
                                      </div>
                                      
                                      {/* Entity Table */}
                                      <div className="flex justify-between border-b pb-2" style={{ borderColor: `${RULE}80` }}>
                                        <span style={{ color: MUTED }}>{tr('Database Table', 'ডাটাবেস টেবিল')}</span>
                                        <span className="font-mono" style={{ color: INK }}>{r.entity}</span>
                                      </div>

                                      {/* Actor Serial */}
                                      <div className="flex justify-between border-b pb-2" style={{ borderColor: `${RULE}80` }}>
                                        <span style={{ color: MUTED }}>{tr('Actor Serial', 'সদস্য সিরিয়াল')}</span>
                                        <span className="font-mono font-bold uppercase" style={{ color: BRAND }}>{serialStr}</span>
                                      </div>

                                      {/* Actor Email */}
                                      {r.actor?.email && (
                                        <div className="flex justify-between border-b pb-2" style={{ borderColor: `${RULE}80` }}>
                                          <span style={{ color: MUTED }}>{tr('Actor Email', 'ইমেল')}</span>
                                          <span className="font-semibold" style={{ color: INK }}>{r.actor.email}</span>
                                        </div>
                                      )}

                                      {/* Actor ID UUID */}
                                      {r.actor_id && (
                                        <div className="flex flex-col gap-0.5 pt-1">
                                          <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{tr('Actor Member ID', 'সদস্য আইডি')}</span>
                                          <span className="font-mono text-[10px]" style={{ color: INK }}>{r.actor_id}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-[10px] font-bold italic pt-3 border-t mt-4 flex items-center gap-1" style={{ borderColor: RULE, color: GREEN }}>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {tr('100% authentic database log entry', '১০০% সঠিক ডাটাবেস রেকর্ড')}
                                  </div>
                                </div>

                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}

                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center font-medium" style={{ color: MUTED }}>
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2" style={{ color: BRAND }} />
                      {tr('No matching audit entries found.', 'কোনো ম্যাচিং অডিট এন্ট্রি খুঁজে পাওয়া যায়নি।')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* TABLE FOOTER PAGINATION */}
          {filteredRows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t px-5 py-4" style={{ borderColor: RULE }}>
              <div className="text-xs font-semibold" style={{ color: MUTED }}>
                {tr(
                  `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(
                    currentPage * pageSize,
                    filteredRows.length
                  )} of ${filteredRows.length} results`,
                  `${filteredRows.length}টি ফলাফলের মধ্যে ${(currentPage - 1) * pageSize + 1} থেকে ${Math.min(
                    currentPage * pageSize,
                    filteredRows.length
                  )} দেখানো হচ্ছে`
                )}
              </div>

              <div className="flex items-center gap-4">
                {/* Pagination Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-stone-50 disabled:opacity-40"
                    style={{ borderColor: RULE, color: INK2 }}
                  >
                    {tr('Previous', 'পূর্ববর্তী')}
                  </button>

                  {/* Render page numbers */}
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
                    const pageNum = idx + 1;
                    const isPageActive = currentPage === pageNum;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className="rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                        style={{
                          background: isPageActive ? INK : PAPER,
                          color: isPageActive ? CREAM : INK2,
                          border: `1px solid ${isPageActive ? INK : RULE}`
                        }}
                      >
                        {fmt.num(pageNum)}
                      </button>
                    );
                  })}

                  {totalPages > 5 && <span className="px-1 text-stone-400 font-bold">...</span>}
                  
                  {totalPages > 5 && (
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                      style={{
                        background: currentPage === totalPages ? INK : PAPER,
                        color: currentPage === totalPages ? CREAM : INK2,
                        border: `1px solid ${currentPage === totalPages ? INK : RULE}`
                      }}
                    >
                      {fmt.num(totalPages)}
                    </button>
                  )}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-stone-50 disabled:opacity-40"
                    style={{ borderColor: RULE, color: INK2 }}
                  >
                    {tr('Next', 'পরবর্তী')}
                  </button>
                </div>

                {/* Page Size selector */}
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border bg-white px-2 py-1.5 text-xs font-semibold outline-none cursor-pointer"
                  style={{ borderColor: RULE, color: INK2 }}
                >
                  <option value={10}>10 / {tr('page', 'পৃষ্ঠা')}</option>
                  <option value={25}>25 / {tr('page', 'পৃষ্ঠা')}</option>
                  <option value={50}>50 / {tr('page', 'পৃষ্ঠা')}</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
