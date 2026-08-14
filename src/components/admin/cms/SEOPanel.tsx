import { useEffect, useMemo, useState } from 'react';
import SocialPreviewSuite from '@/components/admin/cms/SocialPreviewSuite';
import {
  Target, Hash, FileText, Image, AlertCircle,
  CheckCircle, XCircle, TrendingUp, ChevronDown, ChevronRight,
} from 'lucide-react';

interface Props {
  title: string;
  content: string;
  slug: string;
  onSlugChange: (v: string) => void;
  metaTitle: string;
  onMetaTitleChange: (v: string) => void;
  metaDescription: string;
  onMetaDescChange: (v: string) => void;
  focusKeyword: string;
  onFocusKeywordChange: (v: string) => void;
  canonicalUrl: string;
  onCanonicalUrlChange: (v: string) => void;
  featuredImage: string;
}

function stripHtml(h: string) { return h.replace(/<[^>]+>/g, ''); }

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
  const label = score >= 70 ? 'Good' : score >= 40 ? 'Needs Work' : 'Poor';
  const textColor = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold ${textColor}`}>{label}</span>
        <span className={`text-lg font-black ${textColor}`}>{score}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function SEOCheck({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-start gap-1.5">
      {ok
        ? <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
        : <XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" />
      }
      <span className={`text-[11px] ${ok ? 'text-gray-600' : 'text-gray-500'}`}>{text}</span>
    </div>
  );
}

function charBar(len: number, min: number, max: number) {
  const pct = Math.min(100, (len / max) * 100);
  const color = len < min ? 'bg-red-400' : len > max ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="mt-0.5 flex items-center gap-1.5">
      <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-mono ${len < min || len > max ? 'text-amber-600' : 'text-gray-400'}`}>
        {len}/{max}
      </span>
    </div>
  );
}

export default function SEOPanel({
  title, content, slug, onSlugChange,
  metaTitle, onMetaTitleChange, metaDescription, onMetaDescChange,
  focusKeyword, onFocusKeywordChange, canonicalUrl, onCanonicalUrlChange,
  featuredImage,
}: Props) {
  const [open, setOpen] = useState(false);
  const [slugManual, setSlugManual] = useState(false);
  const [metaTitleManual, setMetaTitleManual] = useState(false);
  const [metaDescManual, setMetaDescManual] = useState(false);

  const plainContent = useMemo(() => stripHtml(content).trim(), [content]);
  const wordCount = useMemo(() => plainContent.split(/\s+/).filter(Boolean).length, [plainContent]);

  // Auto-fill slug from title
  useEffect(() => {
    if (!slugManual && title) {
      onSlugChange(title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 90));
    }
  }, [title, slugManual]);

  // Auto-fill metaTitle from title
  useEffect(() => {
    if (!metaTitleManual) onMetaTitleChange(title.slice(0, 60));
  }, [title, metaTitleManual]);

  // Auto-fill metaDesc from content
  useEffect(() => {
    if (!metaDescManual) onMetaDescChange(plainContent.slice(0, 160));
  }, [plainContent, metaDescManual]);

  // ── SEO Score calculation ────────────────────────────────────────────────────
  const kw = focusKeyword.trim().toLowerCase();
  const checks = {
    hasTitle:       title.length >= 10,
    titleLength:    metaTitle.length >= 30 && metaTitle.length <= 60,
    hasKeyword:     kw.length > 0,
    kwInTitle:      kw.length > 0 && (metaTitle.toLowerCase().includes(kw) || title.toLowerCase().includes(kw)),
    kwInContent:    kw.length > 0 && plainContent.toLowerCase().includes(kw),
    descLength:     metaDescription.length >= 120 && metaDescription.length <= 160,
    hasImage:       featuredImage.length > 0,
    longContent:    wordCount >= 300,
    hasSlug:        slug.length > 0,
  };
  const score = Math.round(Object.values(checks).filter(Boolean).length / Object.keys(checks).length * 100);

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-orange-50/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-orange-600" />
          <span className="text-xs font-bold text-orange-600">SEO Settings</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            score >= 70 ? 'bg-green-100 text-green-700' : score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
          }`}>{score}/100</span>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-orange-500" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
      </button>

      {open && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          {/* Score bar */}
          <ScoreBar score={score} />

          {/* SEO Checks */}
          <div className="space-y-1 rounded-lg bg-gray-50 p-2.5">
            <SEOCheck ok={checks.hasTitle}    text="Title is long enough (10+ chars)" />
            <SEOCheck ok={checks.titleLength}  text="Meta title 30–60 characters" />
            <SEOCheck ok={checks.hasKeyword}   text="Focus keyword is set" />
            <SEOCheck ok={checks.kwInTitle}    text="Keyword appears in title" />
            <SEOCheck ok={checks.kwInContent}  text="Keyword appears in content" />
            <SEOCheck ok={checks.descLength}   text="Meta description 120–160 chars" />
            <SEOCheck ok={checks.hasImage}     text="Featured image is set" />
            <SEOCheck ok={checks.longContent}  text="Content has 300+ words" />
            <SEOCheck ok={checks.hasSlug}      text="URL slug is set" />
          </div>

          {/* Focus Keyword */}
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
              <Target className="h-3 w-3" /> Focus Keyword
            </label>
            <input className="input w-full text-sm" placeholder="e.g. blood donation Kolkata"
              value={focusKeyword}
              onChange={e => onFocusKeywordChange(e.target.value)} />
          </div>

          {/* Slug */}
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
              <Hash className="h-3 w-3" /> URL Slug
            </label>
            <div className="relative">
              <input className="input w-full font-mono text-xs" value={slug}
                onChange={e => { setSlugManual(true); onSlugChange(e.target.value); }} />
              {!slugManual && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-gray-300">AUTO</span>
              )}
            </div>
          </div>

          {/* Meta Title */}
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
              <FileText className="h-3 w-3" /> Meta Title
            </label>
            <input className="input w-full text-sm" value={metaTitle} maxLength={60}
              placeholder="Auto-filled from title"
              onChange={e => { setMetaTitleManual(true); onMetaTitleChange(e.target.value); }} />
            {charBar(metaTitle.length, 30, 60)}
          </div>

          {/* Meta Description */}
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
              <AlertCircle className="h-3 w-3" /> Meta Description
            </label>
            <textarea className="input w-full text-xs leading-relaxed" rows={3} value={metaDescription} maxLength={160}
              placeholder="Auto-filled from content"
              onChange={e => { setMetaDescManual(true); onMetaDescChange(e.target.value); }} />
            {charBar(metaDescription.length, 120, 160)}
          </div>

          {/* Canonical URL */}
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
              <Image className="h-3 w-3" /> Canonical URL <span className="text-[10px] text-gray-300">(optional)</span>
            </label>
            <input className="input w-full font-mono text-xs" placeholder="https://…" value={canonicalUrl}
              onChange={e => onCanonicalUrlChange(e.target.value)} />
          </div>

          {/* Social Previews Suite */}
          <div className="pt-2 border-t border-gray-100">
            <SocialPreviewSuite
              title={metaTitle || title}
              description={metaDescription || content.replace(/<[^>]+>/g, '').slice(0, 150)}
              image={featuredImage}
              url={`https://www.chhatradol.org/${slug}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
