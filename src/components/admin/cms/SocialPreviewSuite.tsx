import { useState } from 'react';
import { Globe, Share2 } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  url?: string;
  image?: string;
  siteName?: string;
}

type Platform = 'google' | 'facebook' | 'twitter' | 'linkedin';

export default function SocialPreviewSuite({
  title, description, url = 'https://narajolechatradol.org/...', image, siteName = 'Narajole Chhatrodol NGO',
}: Props) {
  const [platform, setPlatform] = useState<Platform>('google');

  const displayTitle = title || 'Untitled Post - ' + siteName;
  const displayDesc = description || 'No meta description provided yet. Add a concise summary to improve search engine rankings.';
  const displayUrl = url || 'https://narajolechatradol.org';

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm w-full">
      {/* Header Tabs */}
      <div className="border-b bg-gray-50 p-2 space-y-1.5">
        <div className="flex items-center gap-1">
          <Share2 className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Social Previews</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {[
            { id: 'google' as Platform, label: 'Google' },
            { id: 'facebook' as Platform, label: 'Facebook' },
            { id: 'twitter' as Platform, label: 'X / Twitter' },
            { id: 'linkedin' as Platform, label: 'LinkedIn' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPlatform(tab.id)}
              className={`rounded-md py-1 px-1 text-[11px] font-semibold text-center transition-all ${
                platform === tab.id
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Preview Canvas */}
      <div className="p-3 bg-gray-50/50">

        {/* ── GOOGLE SEARCH ── */}
        {platform === 'google' && (
          <div className="rounded-xl border border-gray-200 bg-white p-3 font-sans shadow-sm w-full">
            <div className="flex items-center gap-1.5 mb-1 overflow-hidden">
              <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-[9px] font-bold text-orange-600">
                CS
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-gray-900 leading-none truncate">{siteName}</p>
                <p className="text-[9px] text-gray-500 font-mono leading-tight truncate">{displayUrl}</p>
              </div>
            </div>
            <h3 className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer line-clamp-2">
              {displayTitle}
            </h3>
            <p className="mt-1 text-[11px] text-gray-600 leading-relaxed line-clamp-2">
              {displayDesc}
            </p>
          </div>
        )}

        {/* ── FACEBOOK ── */}
        {platform === 'facebook' && (
          <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm font-sans">
            {image ? (
              <img src={image} alt="" className="h-32 w-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <div className="flex h-24 w-full items-center justify-center bg-gray-100 text-[11px] text-gray-400">
                No OG Image
              </div>
            )}
            <div className="border-t border-gray-100 bg-gray-50/80 p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-gray-400 font-mono truncate">NARAJOLECHATRADOL.ORG</p>
              <h4 className="mt-0.5 text-xs font-bold text-gray-900 line-clamp-1">{displayTitle}</h4>
              <p className="mt-0.5 text-[10px] text-gray-500 line-clamp-2">{displayDesc}</p>
            </div>
          </div>
        )}

        {/* ── TWITTER / X ── */}
        {platform === 'twitter' && (
          <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm font-sans">
            {image ? (
              <img src={image} alt="" className="h-32 w-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <div className="flex h-24 w-full items-center justify-center bg-gray-100 text-[11px] text-gray-400">
                No Card Image
              </div>
            )}
            <div className="p-2.5">
              <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{displayTitle}</h4>
              <p className="mt-1 text-[10px] text-gray-500 line-clamp-2">{displayDesc}</p>
              <p className="mt-1 flex items-center gap-1 text-[9px] text-gray-400 truncate">
                <Globe className="h-2.5 w-2.5 flex-shrink-0" /> narajolechatradol.org
              </p>
            </div>
          </div>
        )}

        {/* ── LINKEDIN ── */}
        {platform === 'linkedin' && (
          <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm font-sans">
            {image ? (
              <img src={image} alt="" className="h-32 w-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <div className="flex h-24 w-full items-center justify-center bg-gray-100 text-[11px] text-gray-400">
                No Featured Media
              </div>
            )}
            <div className="p-2.5 bg-slate-50/50">
              <h4 className="text-xs font-semibold text-gray-900 line-clamp-1">{displayTitle}</h4>
              <p className="mt-0.5 text-[9px] text-gray-400 truncate">narajolechatradol.org · 2 min read</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
