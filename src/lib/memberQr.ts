/**
 * Member ID-card QR codes.
 *
 * Every member row carries a `verify_token` (migration 0065). The QR printed on
 * a card encodes the public verification URL for that token; scanning it opens
 * `/verify/<token>`, which reads the member back through the
 * `cswo_verify_member` RPC — the only path an anonymous scanner has into the
 * members table, and it returns just the card fields.
 *
 * A member's token is issued once, at row creation, and never rewritten — a
 * printed card has to keep verifying for as long as it exists. For the same
 * reason the origin is hard-coded rather than taken from `window.location`: a
 * card printed from a preview deployment must still point at production.
 */
export const VERIFY_ORIGIN = 'https://www.chhatradol.org';

export function memberVerifyUrl(token: string): string {
  return `${VERIFY_ORIGIN}/verify/${token}`;
}

/** Shape returned by the public `cswo_verify_member` RPC. */
export interface VerifiedMember {
  full_name: string;
  avatar_url: string | null;
  blood_group: string | null;
  phone: string | null;
  designation: string | null;
  member_serial: number | null;
  joined_at: string;
}

/** Saves a rendered `<QRCodeCanvas>` as a PNG. */
export function downloadQrCanvas(canvas: HTMLCanvasElement | null, fileName: string): void {
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/** `Soumen Maity` → `soumen-maity`, for predictable download names. */
export function slugify(name: string): string {
  return (name || 'member')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'member';
}
