import { useState, useEffect } from 'react';
import { getMemberAvatarUrl, getMemberInitials, getAvatarColor } from '@/lib/avatar';

interface MemberAvatarProps {
  member?: {
    avatar_url?: string | null;
    full_name?: string | null;
    email?: string | null;
  } | null;
  avatarUrl?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  bordered?: boolean;
}

export default function MemberAvatar({
  member,
  avatarUrl,
  name,
  size = 36,
  className = '',
  style = {},
  bordered = false,
}: MemberAvatarProps) {
  const effectiveName = name ?? member?.full_name ?? '';
  const resolvedUrl = avatarUrl || getMemberAvatarUrl(member ?? { full_name: effectiveName });
  const [hasError, setHasError] = useState(false);

  // Reset error state if the URL changes
  useEffect(() => {
    setHasError(false);
  }, [resolvedUrl]);

  const initials = getMemberInitials(effectiveName);
  const bgColor = getAvatarColor(effectiveName);

  if (resolvedUrl && !hasError) {
    return (
      <img
        src={resolvedUrl}
        alt={effectiveName || 'Member Avatar'}
        className={`shrink-0 rounded-full object-cover select-none ${className}`}
        style={{
          width: size,
          height: size,
          border: bordered ? '2px solid rgba(255,255,255,0.2)' : undefined,
          boxShadow: bordered ? '0 1px 3px rgba(0,0,0,0.1)' : undefined,
          ...style,
        }}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div
      className={`shrink-0 rounded-full flex items-center justify-center font-bold text-white select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: bgColor,
        fontSize: Math.max(10, Math.round(size * 0.36)),
        border: bordered ? '2px solid rgba(255,255,255,0.2)' : undefined,
        fontFamily: '"Noto Sans Bengali", "Inter", sans-serif',
        ...style,
      }}
      title={effectiveName}
    >
      {initials}
    </div>
  );
}
