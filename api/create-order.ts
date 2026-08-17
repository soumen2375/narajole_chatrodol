import type { IncomingMessage, ServerResponse } from 'http';
import Razorpay from 'razorpay';
import fs from 'node:fs';
import path from 'node:path';

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

async function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  if ((req as unknown as { body?: unknown }).body) {
    const b = (req as unknown as { body: unknown }).body;
    return typeof b === 'string' ? JSON.parse(b) : (b as Record<string, unknown>);
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

function getCredentials(): { keyId: string; keySecret: string } {
  let keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '';
  let keySecret = process.env.RAZORPAY_KEY_SECRET || '';

  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        const key = k?.trim();
        const val = v.join('=').trim().replace(/^["']|["']$/g, '');
        if (key === 'RAZORPAY_KEY_ID') keyId = val;
        else if (key === 'VITE_RAZORPAY_KEY_ID' && !keyId) keyId = val;
        else if (key === 'RAZORPAY_KEY_SECRET') keySecret = val;
      }
    }
  } catch {
    // fallback to process.env
  }

  return { keyId, keySecret };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed. Use POST.' });
  }

  const { keyId, keySecret } = getCredentials();

  if (!keyId || !keySecret) {
    return sendJson(res, 401, {
      error: 'Razorpay API credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.',
    });
  }

  try {
    const body = await parseBody(req);
    const amount = Number(body.amount);
    const currency = (body.currency as string) || 'INR';
    const receipt = (body.receipt as string) || `rcpt_${Date.now()}`;
    const notes = (body.notes as Record<string, string>) || {};

    // Validate amount: must be at least 100 paise (₹1.00)
    if (!amount || isNaN(amount) || amount < 100) {
      return sendJson(res, 400, {
        error: 'Invalid amount. Minimum amount is 100 paise (₹1.00).',
      });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const options = {
      amount: Math.round(amount),
      currency: currency.toUpperCase(),
      receipt: String(receipt).slice(0, 40),
      notes,
    };

    const order = await razorpay.orders.create(options);

    return sendJson(res, 200, {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
    });
  } catch (err: unknown) {
    console.error('Error creating Razorpay order:', err);
    const errObj = err as { statusCode?: number; error?: { description?: string }; message?: string };
    const message = errObj?.error?.description || errObj?.message || 'Failed to create order';
    const statusCode = errObj?.statusCode || 500;
    return sendJson(res, statusCode, { error: message });
  }
}
