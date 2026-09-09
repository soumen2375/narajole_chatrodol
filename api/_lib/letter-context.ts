/**
 * api/_lib/letter-context.ts
 *
 * Shared plumbing for the two letterpad endpoints: parse the request,
 * establish that the caller really is a secretary, and load the letter.
 *
 * Both endpoints render an official letter on the organisation's letterhead
 * and one of them puts it in the post from info@chhatradol.org, so neither may
 * take the letter's contents from the request body. The client sends only an
 * id; everything printed is read back from the database under the service
 * role, after the caller's Supabase session has been checked against
 * cswo_members. An open endpoint here would be a spam relay wearing the
 * organisation's letterhead.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

// ── env ──────────────────────────────────────────────────────────────────────

/** Reads a variable from the environment, falling back to a local .env in dev. */
export function readEnv(key: string, fallback = ''): string {
  const fromProcess = process.env[key];
  if (fromProcess) return fromProcess;

  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        if (k?.trim() === key) return v.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch { /* fall through */ }

  return fallback;
}

// ── http helpers ─────────────────────────────────────────────────────────────

export function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.end(JSON.stringify(data));
}

/** Answers a CORS preflight. Returns true when the request needs nothing more. */
export function handledPreflight(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method !== 'OPTIONS') return false;
  res.statusCode = 200;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.end();
  return true;
}

export function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const preParsed = (req as unknown as { body?: unknown }).body;
  if (preParsed) {
    return Promise.resolve(
      typeof preParsed === 'string' ? JSON.parse(preParsed) : (preParsed as Record<string, unknown>),
    );
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk.toString(); });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// ── supabase ─────────────────────────────────────────────────────────────────

export function serviceClient(): SupabaseClient | null {
  const url = readEnv('SUPABASE_URL') || readEnv('VITE_SUPABASE_URL');
  const key = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function bearerToken(req: IncomingMessage): string {
  const header = (req.headers.authorization || req.headers.Authorization) as string | undefined;
  if (!header) return '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? (token ?? '') : '';
}

export interface Secretary {
  id: string;
  full_name: string;
  email: string;
}

/**
 * Resolves the caller's Supabase session to an approved member who is allowed
 * to write letters — the secretary capability, or an admin.
 */
export async function authenticateSecretary(
  supabase: SupabaseClient,
  req: IncomingMessage,
): Promise<{ member: Secretary } | { error: string; status: number }> {
  const token = bearerToken(req);
  if (!token) return { error: 'Sign in required', status: 401 };

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return { error: 'Session is not valid', status: 401 };

  const { data: member } = await supabase
    .from('cswo_members')
    .select('id, full_name, email, role, status, can_manage_events')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!member || member.status !== 'approved') {
    return { error: 'Account is not approved', status: 403 };
  }
  if (member.role !== 'admin' && !member.can_manage_events) {
    return { error: 'Only the secretary or an admin may send letters', status: 403 };
  }

  return { member: { id: member.id, full_name: member.full_name ?? '', email: member.email ?? '' } };
}

// ── the letter ───────────────────────────────────────────────────────────────

export interface LetterRow {
  id: string;
  event_id: string;
  ref_no: string;
  letter_date: string;
  status: string;
  to_name: string;
  to_address: string;
  to_email: string;
  salutation: string;
  subject: string;
  body: string;
  body_html: string;
  closing: string;
  signatory_name: string;
  signatory_role: string;
  signatory_phone: string;
  signature_url: string;
}

export async function loadLetter(
  supabase: SupabaseClient,
  letterId: string,
): Promise<LetterRow | null> {
  const { data } = await supabase
    .from('cswo_event_letters')
    .select('*')
    .eq('id', letterId)
    .maybeSingle();
  return (data ?? null) as LetterRow | null;
}

/**
 * Fetches an uploaded signature so it can be embedded.
 *
 * A signature that will not download is not worth failing the letter over —
 * letter-pdf.ts falls back to the master's signature on a null.
 */
export async function fetchSignature(url: string): Promise<Uint8Array | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Fetches an image the letter body refers to, so it can be embedded.
 *
 * Only files the organisation itself uploaded are fetched: the source has to
 * live on the project's own Supabase storage. The letter body is HTML written
 * in a browser, and an endpoint that will download whatever URL appears in it
 * is an open proxy sitting behind the service role — worth closing off even
 * though only the secretary can write a letter.
 *
 * A picture that will not download is a null; letter-pdf.ts prints a marked
 * gap in its place rather than losing the letter.
 */
export async function fetchLetterImage(src: string): Promise<Uint8Array | null> {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  const storage = readEnv('SUPABASE_URL') || readEnv('VITE_SUPABASE_URL');
  if (!storage) return null;
  try {
    if (url.host !== new URL(storage).host) return null;
  } catch {
    return null;
  }

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') ?? '').toLowerCase();
    // pdf-lib embeds PNG and JPEG and nothing else.
    if (!type.startsWith('image/png') && !type.startsWith('image/jpeg') && !type.startsWith('image/jpg')) {
      return null;
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    // 12 MB is far more than a scanned poster needs and well under what the
    // function can hold while it also builds the PDF.
    return bytes.byteLength > 12 * 1024 * 1024 ? null : bytes;
  } catch {
    return null;
  }
}
