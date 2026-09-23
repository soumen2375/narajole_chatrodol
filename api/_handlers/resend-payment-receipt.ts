/**
 * api/resend-payment-receipt.ts
 *
 * Secure Admin-only endpoint to manually (re)send a payment receipt email.
 *
 * POST /api/resend-payment-receipt
 * Headers:
 *   Authorization: Bearer <supabase_access_token>
 * Body:
 *   { id: string; type: 'donation' | 'contribution';
 *     document?: 'receipt' | 'certificate' }   // certificate = 80G, donations only
 *
 * Security:
 *   - Verifies Supabase auth JWT from Authorization header.
 *   - Verifies the user has admin role in cswo_members or app_metadata.
 *   - Calls sendPaymentReceipt(forceResend: true).
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';
import { sendPaymentReceipt } from './_lib/payment-receipt.js';
import { dispatchCertificateEmail } from './send-receipt-email.js';
import fs from 'node:fs';
import path from 'node:path';

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

async function parseBody(
  req: IncomingMessage,
): Promise<Record<string, unknown>> {
  if ((req as unknown as { body?: unknown }).body) {
    const b = (req as unknown as { body: unknown }).body;
    return typeof b === 'string'
      ? JSON.parse(b)
      : (b as Record<string, unknown>);
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function getEnvValue(key: string, fallback = ''): string {
  if (process.env[key]) return process.env[key] as string;
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        if (k?.trim() === key) {
          return v.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  } catch {
    // fallback
  }
  return fallback;
}

function getSupabaseClient() {
  const url =
    getEnvValue('SUPABASE_URL') ||
    getEnvValue('VITE_SUPABASE_URL', 'https://wzquszbmbpkbhyythdrj.supabase.co');

  const key = getEnvValue('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for resend payment receipt endpoint');
  }

  return createClient(url, key);
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
  }

  try {
    // ── 1. Authenticate Request via Supabase JWT ───────────────────────────
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return sendJson(res, 401, {
        success: false,
        error: 'Unauthorized: Missing or invalid Authorization header',
      });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return sendJson(res, 401, {
        success: false,
        error: 'Unauthorized: Missing token',
      });
    }

    const supabase = getSupabaseClient();

    // Verify token with Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return sendJson(res, 401, {
        success: false,
        error: 'Unauthorized: Invalid or expired session token',
      });
    }

    // Check if user is an admin in cswo_members or metadata
    const isAdminInMeta =
      user.app_metadata?.role === 'admin' ||
      user.user_metadata?.role === 'admin' ||
      user.app_metadata?.is_admin === true;

    if (!isAdminInMeta) {
      // Check cswo_members for role. Only select columns that exist — asking
      // for a missing one fails the whole query and silently looks like
      // "not an admin", which is exactly how this used to reject real admins.
      const { data: memberRecord, error: memberErr } = await supabase
        .from('cswo_members')
        .select('role, status, can_manage_finance')
        .eq('id', user.id)
        .maybeSingle();

      if (memberErr) {
        return sendJson(res, 500, {
          success: false,
          error: `Could not verify your account: ${memberErr.message}`,
        });
      }

      // Whoever may run Finance may resend a receipt — the same rule the
      // Finance section itself uses.
      const isMemberAdmin =
        memberRecord?.status === 'approved' &&
        (memberRecord?.role === 'admin' ||
          memberRecord?.role === 'super_admin' ||
          memberRecord?.role === 'executive_admin' ||
          memberRecord?.can_manage_finance === true);

      if (!isMemberAdmin) {
        return sendJson(res, 403, {
          success: false,
          error: 'Forbidden: Admin privileges required to resend receipts',
        });
      }
    }

    // ── 2. Parse request payload ───────────────────────────────────────────
    const body = await parseBody(req);
    const id = (body.id as string)?.trim();
    const type = (body.type as string)?.trim() as
      | 'donation'
      | 'contribution'
      | undefined;

    const docKind = body.document === 'certificate' ? 'certificate' : 'receipt';

    if (!id || !type || !['donation', 'contribution'].includes(type)) {
      return sendJson(res, 400, {
        success: false,
        error: 'Missing or invalid id / type (must be "donation" or "contribution")',
      });
    }

    let record: Record<string, unknown> | null = null;

    if (type === 'donation') {
      const { data, error: fetchErr } = await supabase
        .from('cswo_donations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr) {
        console.error('[Resend Receipt] Error fetching donation:', fetchErr);
      }
      record = data as Record<string, unknown> | null;
    } else {
      const { data, error: fetchErr } = await supabase
        .from('cswo_monthly_contributions')
        .select('*, member:cswo_members!cswo_monthly_contributions_member_id_fkey(full_name, email)')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr) {
        console.error('[Resend Receipt] Error fetching contribution:', fetchErr);
      }
      record = data as Record<string, unknown> | null;
    }

    if (!record) {
      return sendJson(res, 404, {
        success: false,
        error: `${type} record not found`,
      });
    }

    if (record.status !== 'paid') {
      return sendJson(res, 400, {
        success: false,
        error: `Cannot send receipt for a payment that is not 'paid' (current status: ${record.status})`,
      });
    }

    // ── 3a. 80G certificate instead of the receipt ─────────────────────────
    // Sent on its own and deliberately leaves receipt_email_status alone:
    // that column tracks the receipt, which is a different document.
    if (docKind === 'certificate') {
      if (type !== 'donation') {
        return sendJson(res, 400, {
          success: false,
          error: '80G certificates are issued for donations only',
        });
      }
      const email = String(record.donor_email || '');
      if (!email.includes('@')) {
        return sendJson(res, 400, { success: false, error: 'No email address on this donation' });
      }

      const { data: compliance } = await supabase
        .from('cswo_compliance')
        .select('ckey, reg_number');
      const regs = Object.fromEntries(
        ((compliance ?? []) as { ckey: string; reg_number: string | null }[])
          .map((r) => [r.ckey, r.reg_number ?? '']),
      );

      const created = new Date(String(record.created_at || Date.now()));
      const y = created.getFullYear();
      const fy = created.getMonth() + 1 >= 4
        ? `${y}-${String(y + 1).slice(-2)}`
        : `${y - 1}-${String(y).slice(-2)}`;

      const result = await dispatchCertificateEmail({
        recipientEmail: email,
        receiptNumber: String(record.receipt_number || `DON-${String(record.id).slice(0, 8).toUpperCase()}`),
        donorName: record.is_anonymous ? 'Anonymous' : String(record.donor_name || 'Valued Supporter'),
        amount: Number(record.amount),
        fy,
        date: created.toLocaleDateString('en-IN', {
          day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
        }),
        purpose: (record.purpose as string) || undefined,
        paymentRef: (record.cashfree_payment_id as string) || (record.razorpay_payment_id as string) || undefined,
        reg80g: regs['80g'] || undefined,
        reg12a: regs['12a'] || undefined,
        orgPan: regs['pan'] || undefined,
      });

      if (!result.success) {
        return sendJson(res, 500, {
          success: false,
          error: result.error || 'Failed to send 80G certificate',
        });
      }
      return sendJson(res, 200, { success: true, messageId: result.messageId });
    }

    const paymentMethod =
      (record.payment_method as string) ||
      (record.payment_gateway === 'cashfree'
        ? 'Cashfree Payments'
        : record.payment_gateway === 'razorpay'
          ? 'Razorpay'
          : 'Online Payment');

    // ── 3. Force resend receipt ────────────────────────────────────────────
    const result = await sendPaymentReceipt({
      type,
      record,
      paymentMethod,
      forceResend: true,
    });

    if (!result.success) {
      return sendJson(res, 500, {
        success: false,
        error: result.error || 'Failed to resend receipt',
      });
    }

    return sendJson(res, 200, {
      success: true,
      messageId: result.messageId,
    });
  } catch (err: unknown) {
    console.error('[Resend Receipt Error]', err);
    const message =
      err instanceof Error ? err.message : 'Internal server error';
    return sendJson(res, 500, { success: false, error: message });
  }
}
