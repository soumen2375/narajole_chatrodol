/**
 * api/resend-payment-receipt.ts
 *
 * Secure Admin-only endpoint to manually (re)send a payment receipt email.
 *
 * POST /api/resend-payment-receipt
 * Headers:
 *   Authorization: Bearer <supabase_access_token>
 * Body:
 *   { id: string; type: 'donation' | 'contribution' }
 *
 * Security:
 *   - Verifies Supabase auth JWT from Authorization header.
 *   - Verifies the user has admin role in cswo_members or app_metadata.
 *   - Calls sendPaymentReceipt(forceResend: true).
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';
import { sendPaymentReceipt } from './_lib/payment-receipt.js';
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
      // Check cswo_members table for role
      const { data: memberRecord } = await supabase
        .from('cswo_members')
        .select('role, is_active, status')
        .eq('id', user.id)
        .maybeSingle();

      const isMemberAdmin =
        memberRecord?.role === 'admin' ||
        memberRecord?.role === 'super_admin' ||
        memberRecord?.role === 'executive_admin';

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
        .select('*, member:cswo_members(full_name, email)')
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
