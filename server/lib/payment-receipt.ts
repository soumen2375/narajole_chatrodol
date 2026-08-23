/**
 * server/lib/payment-receipt.ts
 *
 * Safe, atomic, idempotent receipt email sender.
 *
 * Guarantees:
 *   - Atomic claiming: Uses conditional database update (.in('receipt_email_status', ['pending', 'failed', null]))
 *     to prevent simultaneous webhook and verify API race conditions.
 *   - Strictly requires SUPABASE_SERVICE_ROLE_KEY.
 *   - Dispatches receipt email to /api/send-receipt-email.
 *   - On success: marks 'sent' + stores message_id + clears error.
 *   - On failure: marks 'failed' + stores error message.
 *   - Increments receipt_email_attempts on every attempt.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

// ── Supabase helper ───────────────────────────────────────────────────────────

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

  if (!url) {
    throw new Error('SUPABASE_URL is not configured');
  }

  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for sending payment receipts');
  }

  return createClient(url, key);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReceiptInput {
  type: 'donation' | 'contribution';
  record: Record<string, unknown>;
  paymentMethod?: string;
  /** Force send even if receipt_email_status is already 'sent' or 'sending' */
  forceResend?: boolean;
  /** Sibling row ids (bulk "Pay All" contribution batch) covered by the same
   *  email as `record` — marked 'sent' alongside it, never emailed separately. */
  linkedRecordIds?: string[];
}

export interface ReceiptResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  messageId?: string;
  error?: string;
}

// ── Main sender ───────────────────────────────────────────────────────────────

export async function sendPaymentReceipt(
  input: ReceiptInput,
): Promise<ReceiptResult> {
  const { type, record, paymentMethod, forceResend = false, linkedRecordIds = [] } = input;

  if (!record || !record.id) {
    return { success: false, error: 'Invalid record supplied to sendPaymentReceipt' };
  }

  const table =
    type === 'donation' ? 'cswo_donations' : 'cswo_monthly_contributions';

  const supabase = getSupabaseClient();

  const currentAttempts = (record.receipt_email_attempts as number) || 0;

  // ── 1. Atomic claim to prevent race condition between webhook & verify API ──
  if (!forceResend) {
    // If already marked sent, skip immediately
    if (record.receipt_email_status === 'sent') {
      return {
        success: true,
        skipped: true,
        reason: 'Receipt already sent',
      };
    }

    // Attempt atomic transition: only update if status is 'pending', 'failed', or null
    const { data: claimed, error: claimError } = await supabase
      .from(table)
      .update({
        receipt_email_status: 'sending',
        receipt_email_attempts: currentAttempts + 1,
      })
      .eq('id', record.id)
      .or('receipt_email_status.is.null,receipt_email_status.eq.pending,receipt_email_status.eq.failed')
      .select()
      .maybeSingle();

    if (claimError) {
      console.error('[sendPaymentReceipt] Claim error:', claimError);
    }

    if (!claimed) {
      return {
        success: true,
        skipped: true,
        reason: 'Receipt is already being processed or has been sent by concurrent worker',
      };
    }
  } else {
    // Admin force resend: unconditionally set to sending
    await supabase
      .from(table)
      .update({
        receipt_email_status: 'sending',
        receipt_email_attempts: currentAttempts + 1,
      })
      .eq('id', record.id);
  }

  // ── 2. Determine recipient details ──────────────────────────────────────────
  try {
    let recipientEmail =
      type === 'donation'
        ? (record.donor_email as string)
        : (record.member_email as string);

    let recipientName =
      type === 'donation'
        ? (record.donor_name as string)
        : (record.member_name as string);

    // If contribution and member email not in record, query cswo_members
    if (type === 'contribution' && (!recipientEmail || !recipientName) && record.member_id) {
      const { data: member } = await supabase
        .from('cswo_members')
        .select('full_name, email')
        .eq('id', record.member_id)
        .maybeSingle();

      if (member) {
        recipientEmail = recipientEmail || member.email;
        recipientName = recipientName || member.full_name;
      }
    }

    if (!recipientEmail || !recipientEmail.includes('@')) {
      throw new Error(`Valid customer email not found on ${type} record (ID: ${record.id})`);
    }

    const siteUrl = getEnvValue(
      'SITE_URL',
      'https://www.chhatradol.org',
    );

    const purposeLabel =
      (record.purpose as string) ||
      (record.month ? `Month ${record.month}/${record.year || ''}` : '') ||
      (type === 'donation' ? 'Donation & Social Welfare' : 'Monthly Contribution');

    const paymentId =
      (record.cashfree_payment_id as string) ||
      (record.razorpay_payment_id as string) ||
      null;

    // ── 3. Dispatch to internal email endpoint ─────────────────────────────────
    const internalSecret = getEnvValue('INTERNAL_API_SECRET');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (internalSecret) {
      headers['x-internal-secret'] = internalSecret;
    }

    const response = await fetch(
      `${siteUrl}/api/send-receipt-email`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recipientEmail,
          recipientName: recipientName || 'Valued Supporter',
          type,
          amount: record.amount,
          receiptNumber: record.receipt_number,
          purpose: purposeLabel,
          paymentMethod: paymentMethod || 'Online Payment',
          paymentId,
          date: new Date().toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
        }),
        signal: AbortSignal.timeout(15000),
      },
    );

    const result = (await response.json()) as {
      success?: boolean;
      messageId?: string;
      error?: string;
      warning?: string;
    };

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || result.warning || `Receipt email API returned HTTP ${response.status}`,
      );
    }

    // ── 4. Mark successfully sent ─────────────────────────────────────────────
    const sentUpdate = {
      receipt_email_status: 'sent',
      receipt_email_sent_at: new Date().toISOString(),
      receipt_email_message_id: result.messageId || null,
      receipt_email_error: null,
    };

    await supabase.from(table).update(sentUpdate).eq('id', record.id);

    // A bulk "Pay All" batch is covered by this same email — mark siblings
    // 'sent' too so they're never picked up for a duplicate solo resend.
    if (linkedRecordIds.length > 0) {
      await supabase.from(table).update(sentUpdate).in('id', linkedRecordIds);
    }

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error';

    await supabase
      .from(table)
      .update({
        receipt_email_status: 'failed',
        receipt_email_error: message,
      })
      .eq('id', record.id);

    console.error(`[Payment Receipt Error for ${table} ${record.id}]:`, message);

    return {
      success: false,
      error: message,
    };
  }
}
