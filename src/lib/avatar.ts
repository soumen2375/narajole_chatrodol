import type { Member } from '@/types';

/**
 * Static mapping of well-known committee members to their high-resolution local photos.
 */
const MEMBER_STATIC_AVATARS: Array<{ keywords: string[]; path: string }> = [
  { keywords: ['soumen', 'সৌমেন'], path: '/assets/images/about/members/soumen.jpg' },
  { keywords: ['swarup', 'স্বরূপ'], path: '/assets/images/about/members/swarup.jpg' },
  { keywords: ['prabal', 'প্রবাল'], path: '/assets/images/about/members/prabal.jpg' },
  { keywords: ['sayan', 'সায়ন'], path: '/assets/images/about/members/sayan.jpg' },
  { keywords: ['surajit', 'সুরজিৎ'], path: '/assets/images/about/members/surajit.jpg' },
  { keywords: ['subhajit', 'শুভজিৎ'], path: '/assets/images/about/members/subhajit.jpg' },
  { keywords: ['subhadip', 'শুভদীপ'], path: '/assets/images/about/members/subhadip.jpg' },
  { keywords: ['pabitra', 'পবিত্র'], path: '/assets/images/about/members/pabitra.jpg' },
];

/**
 * Returns the effective avatar URL for a member.
 * Checks the database avatar_url first, then falls back to local static asset photos.
 */
export function getMemberAvatarUrl(
  member?: Partial<Pick<Member, 'avatar_url' | 'full_name' | 'email'>> | { avatar_url?: string | null; full_name?: string | null; email?: string | null } | null
): string | null {
  if (!member) return null;

  if (member.avatar_url && typeof member.avatar_url === 'string' && member.avatar_url.trim()) {
    return member.avatar_url.trim();
  }

  const name = (member.full_name || '').toLowerCase().trim();
  const email = (member.email || '').toLowerCase().trim();

  for (const item of MEMBER_STATIC_AVATARS) {
    if (item.keywords.some((kw) => name.includes(kw) || email.includes(kw))) {
      return item.path;
    }
  }

  return null;
}

/**
 * Extracts initials from a member's full name.
 */
export function getMemberInitials(name?: string | null): string {
  if (!name || !name.trim()) return '—';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Deterministic color palette for avatar fallback initials.
 */
const AVATAR_BG_COLORS = [
  '#0c756f', // Teal
  '#c2410c', // Orange-red
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#059669', // Emerald
  '#d97706', // Amber
  '#db2777', // Pink
  '#4f46e5', // Indigo
];

export function getAvatarColor(name?: string | null): string {
  if (!name) return AVATAR_BG_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_BG_COLORS.length;
  return AVATAR_BG_COLORS[index];
}
