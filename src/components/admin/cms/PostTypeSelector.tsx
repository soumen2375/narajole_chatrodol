import type { PostType } from '@/types';
import { POST_TYPE_LABELS } from '@/types';
import {
  FileText, Newspaper, PenTool, BookOpen, Megaphone,
  FileSpreadsheet, Target, Building2, Rocket, HeartHandshake,
  Paperclip, BarChart3, Calendar
} from 'lucide-react';

export const POST_TYPE_LUCIDE: Record<PostType, React.ComponentType<{ className?: string }>> = {
  general: FileText,
  news: Newspaper,
  blog: PenTool,
  story: BookOpen,
  notice: Megaphone,
  press_release: FileSpreadsheet,
  program: Target,
  project: Building2,
  campaign: Rocket,
  volunteer_story: HeartHandshake,
  document: Paperclip,
  report: BarChart3,
  event: Calendar,
};

interface Props {
  value: PostType;
  onChange: (type: PostType) => void;
  compact?: boolean;
}

const ALL_TYPES: PostType[] = [
  'general', 'news', 'blog', 'story', 'notice',
  'press_release', 'program', 'project', 'campaign',
  'volunteer_story', 'document', 'report', 'event',
];

const TYPE_COLORS: Record<PostType, string> = {
  general:        'bg-gray-50   border-gray-200   text-gray-700',
  news:           'bg-blue-50   border-blue-200   text-blue-700',
  blog:           'bg-violet-50 border-violet-200 text-violet-700',
  story:          'bg-amber-50  border-amber-200  text-amber-700',
  notice:         'bg-orange-50 border-orange-200 text-orange-700',
  press_release:  'bg-sky-50    border-sky-200    text-sky-700',
  program:        'bg-emerald-50 border-emerald-200 text-emerald-700',
  project:        'bg-teal-50   border-teal-200   text-teal-700',
  campaign:       'bg-pink-50   border-pink-200   text-pink-700',
  volunteer_story:'bg-rose-50   border-rose-200   text-rose-700',
  document:       'bg-slate-50  border-slate-200  text-slate-700',
  report:         'bg-lime-50   border-lime-200   text-lime-700',
  event:          'bg-purple-50 border-purple-200 text-purple-700',
};

const TYPE_SELECTED: Record<PostType, string> = {
  general:        'bg-gray-700   border-gray-700   text-white',
  news:           'bg-blue-600   border-blue-600   text-white',
  blog:           'bg-violet-600 border-violet-600 text-white',
  story:          'bg-amber-600  border-amber-600  text-white',
  notice:         'bg-orange-600 border-orange-600 text-white',
  press_release:  'bg-sky-600    border-sky-600    text-white',
  program:        'bg-emerald-600 border-emerald-600 text-white',
  project:        'bg-teal-600   border-teal-600   text-white',
  campaign:       'bg-pink-600   border-pink-600   text-white',
  volunteer_story:'bg-rose-600   border-rose-600   text-white',
  document:       'bg-slate-600  border-slate-600  text-white',
  report:         'bg-lime-600   border-lime-600   text-white',
  event:          'bg-purple-600 border-purple-600 text-white',
};

export default function PostTypeSelector({ value, onChange, compact = false }: Props) {
  if (compact) {
    return (
      <select
        className="input w-full text-sm"
        value={value}
        onChange={e => onChange(e.target.value as PostType)}
      >
        {ALL_TYPES.map(t => (
          <option key={t} value={t}>
            {POST_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {ALL_TYPES.map(type => {
        const selected = value === type;
        const IconComp = POST_TYPE_LUCIDE[type] || FileText;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-all ${
              selected ? TYPE_SELECTED[type] : TYPE_COLORS[type] + ' hover:opacity-80'
            }`}
          >
            <IconComp className="h-3.5 w-3.5 shrink-0" />
            <span className="leading-tight">{POST_TYPE_LABELS[type]}</span>
          </button>
        );
      })}
    </div>
  );
}

// Inline badge for list/table views
export function PostTypeBadge({ type }: { type: PostType }) {
  const IconComp = POST_TYPE_LUCIDE[type] || FileText;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${TYPE_COLORS[type]}`}>
      <IconComp className="h-3 w-3 shrink-0" />
      {POST_TYPE_LABELS[type]}
    </span>
  );
}
