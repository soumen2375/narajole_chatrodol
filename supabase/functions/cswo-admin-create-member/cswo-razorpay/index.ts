import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

const KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
const KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

async function createRazorpayOrder(amountPaise: number, receipt: string) {
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`${KEY_ID}:${KEY_SECRET}`)}`,
    },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Razorpay order failed: ${text}`);
  }
  return res.json();
}

async function verifySignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(KEY_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${orderId}|${paymentId}`));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === signature;
}

async function getUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const client = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data } = await client.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  if (!KEY_ID || !KEY_SECRET) {
    return json({ error: 'Razorpay কনফিগার করা হয়নি। অ্যাডমিনকে RAZORPAY_KEY_ID ও RAZORPAY_KEY_SECRET সেট করতে বলুন।' }, 503);
  }

  const db = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json();
    const action = body.action as string;
    const userId = await getUserId(req.headers.get('Authorization'));

    // ---------- DONATION ----------
    if (action === 'create_donation_order') {
      const amount = Number(body.amount);
      if (!amount || amount < 10) return json({ error: 'সর্বনিম্ন অনুদান ₹১০।' }, 400);

      const { data: rec, error: insErr } = await db
        .from('cswo_donations')
        .insert({
          donor_name: body.donor_name ?? null,
          donor_email: body.donor_email ?? null,
          donor_phone: body.donor_phone ?? null,
          amount,
          purpose: body.purpose ?? null,
          member_id: userId,
          is_anonymous: !!body.is_anonymous,
          status: 'created',
        })
        .select('id')
        .single();
      if (insErr) return json({ error: insErr.message }, 400);

      const order = await createRazorpayOrder(Math.round(amount * 100), `don_${rec.id}`.slice(0, 40));
      await db.from('cswo_donations').update({ razorpay_order_id: order.id }).eq('id', rec.id);

      return json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: KEY_ID, record_id: rec.id });
    }

    if (action === 'verify_donation') {
      const { record_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
      const ok = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      if (!ok) {
        await db.from('cswo_donations').update({ status: 'failed' }).eq('id', record_id);
        return json({ error: 'পেমেন্ট যাচাই ব্যর্থ হয়েছে।' }, 400);
      }
      await db
        .from('cswo_donations')
        .update({ status: 'paid', razorpay_payment_id, razorpay_signature })
        .eq('id', record_id);
      return json({ ok: true });
    }

    // ---------- MONTHLY CONTRIBUTION ----------
    if (action === 'create_contribution_order') {
      if (!userId) return json({ error: 'অনুগ্রহ করে লগইন করুন।' }, 401);
      const amount = Number(body.amount);
      const year = Number(body.year);
      const month = body.month ? Number(body.month) : null;
      const months = Array.isArray(body.months) ? body.months.map(Number) : null;

      if (!amount || amount < 10 || !year) {
        return json({ error: 'অবৈধ তথ্য।' }, 400);
      }

      let targetMonths: number[] = [];
      if (months && months.length > 0) {
        targetMonths = months;
      } else if (month && month >= 1 && month <= 12) {
        targetMonths = [month];
      } else {
        return json({ error: 'অবৈধ মাস।' }, 400);
      }

      for (const m of targetMonths) {
        if (m < 1 || m > 12) return json({ error: 'অবৈধ মাস।' }, 400);
      }

      const totalAmount = amount * targetMonths.length;
      const tempId = crypto.randomUUID();
      // Razorpay receipt length limit is 40 chars.
      const receipt = targetMonths.length > 1
        ? `mcb_${userId.slice(0, 12)}_${year}_${tempId.slice(0, 6)}`
        : `mc_${userId.slice(0, 12)}_${year}_${targetMonths[0]}_${tempId.slice(0, 6)}`;

      const order = await createRazorpayOrder(Math.round(totalAmount * 100), receipt.slice(0, 40));

      // Pre-insert/upsert the pending rows in database
      for (const m of targetMonths) {
        const { error: upsertErr } = await db
          .from('cswo_monthly_contributions')
          .upsert({
            member_id: userId,
            year,
            month: m,
            amount,
            status: 'pending',
            razorpay_order_id: order.id,
          }, { onConflict: 'member_id,year,month' });
        if (upsertErr) {
          return json({ error: upsertErr.message }, 400);
        }
      }

      return json({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: KEY_ID,
        record_id: tempId,
      });
    }

    if (action === 'verify_contribution') {
      if (!userId) return json({ error: 'অনুগ্রহ করে লগইন করুন।' }, 401);
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
      
      const ok = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      if (!ok) {
        // If verification fails, revert pending rows back to unpaid
        await db
          .from('cswo_monthly_contributions')
          .update({ status: 'unpaid' })
          .eq('razorpay_order_id', razorpay_order_id)
          .eq('member_id', userId)
          .eq('status', 'pending');
        return json({ error: 'পেমেন্ট যাচাই ব্যর্থ হয়েছে।' }, 400);
      }

      // Fetch order details from Razorpay to verify details securely on the server
      const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: {
          Authorization: `Basic ${btoa(`${KEY_ID}:${KEY_SECRET}`)}`,
        },
      });
      if (!orderRes.ok) {
        return json({ error: 'Razorpay অর্ডার তথ্য পাওয়া যায়নি।' }, 400);
      }
      const orderInfo = await orderRes.json();
      
      const receipt = orderInfo.receipt as string;
      if (!receipt || (!receipt.startsWith('mc_') && !receipt.startsWith('mcb_'))) {
        return json({ error: 'অবৈধ রশিদ।' }, 400);
      }

      // Check if we have pre-inserted pending rows in the database for this order
      const { data: pendingRows, error: fetchErr } = await db
        .from('cswo_monthly_contributions')
        .select('*')
        .eq('razorpay_order_id', razorpay_order_id)
        .eq('member_id', userId);

      if (fetchErr) return json({ error: fetchErr.message }, 400);

      if (pendingRows && pendingRows.length > 0) {
        // Update all pending contributions for this order to paid
        const { error: upErr } = await db
          .from('cswo_monthly_contributions')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_method: 'razorpay',
            razorpay_payment_id,
          })
          .eq('razorpay_order_id', razorpay_order_id)
          .eq('member_id', userId);

        if (upErr) return json({ error: upErr.message }, 400);
        return json({ ok: true });
      }

      // FALLBACK: Legacy single-month verification using receipt parsing
      const parts = receipt.split('_');
      if (parts[1] !== userId.slice(0, 12)) {
        return json({ error: 'ব্যবহারকারী অমিল।' }, 400);
      }

      const parsedYear = Number(parts[2]);
      const parsedMonth = Number(parts[3]);
      const actualAmount = orderInfo.amount / 100;

      const { error: upErr } = await db
        .from('cswo_monthly_contributions')
        .upsert(
          {
            member_id: userId,
            year: parsedYear,
            month: parsedMonth,
            amount: actualAmount,
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_method: 'razorpay',
            razorpay_payment_id,
            razorpay_order_id,
          },
          { onConflict: 'member_id,year,month' },
        );

      if (upErr) return json({ error: upErr.message }, 400);
      return json({ ok: true });
    }

    return json({ error: 'অজানা অনুরোধ।' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'সার্ভার ত্রুটি।' }, 500);
  }
});
