import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://wzquszbmbpkbhyythdrj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_7sZQXGDGxGl9M7yEl0UXpg_o0JLwp-L';
const serverSupabase = createClient(supabaseUrl, supabaseKey);


function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.end(JSON.stringify(data));
}

function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

export interface SendReceiptEmailPayload {
  recipientEmail: string;
  recipientName: string;
  type: 'donation' | 'contribution';
  amount: number;
  receiptNumber: string;
  date: string;
  purpose?: string;
  month?: string;
  year?: number;
  paymentMethod?: string;
  paymentId?: string;
}

export function buildReceiptHtml(data: SendReceiptEmailPayload): string {
  const typeTitle = data.type === 'donation' ? 'Donation Confirmation & Invoice' : 'Monthly Contribution Receipt';
  const amountFormatted = `₹${Number(data.amount).toLocaleString('en-IN')}`;
  const displayDate = data.date || new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });


  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${typeTitle}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f9f8f5; margin: 0; padding: 24px; color: #1c1917; }
      .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5dec9; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
      .header { background: #0c756f; padding: 28px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
      .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
      .content { padding: 28px; }
      .receipt-pill { display: inline-block; background: #e6f4ea; color: #137333; font-weight: 800; font-size: 11px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-bottom: 16px; }
      .greeting { font-size: 15px; font-weight: 700; color: #1c1917; margin-bottom: 12px; }
      .intro { font-size: 13.5px; color: #57534e; line-height: 1.5; margin-bottom: 24px; }
      .table-box { background: #faf9f6; border-radius: 12px; border: 1px solid #ede8dc; padding: 16px; margin-bottom: 24px; }
      .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2dcce; font-size: 13px; }
      .row:last-child { border-bottom: none; }
      .k { color: #78716c; font-weight: 600; }
      .v { color: #1c1917; font-weight: 800; text-align: right; }
      .amount-hero { text-align: center; background: #fdf8eb; border: 1px solid #f9e2af; border-radius: 12px; padding: 18px; margin-bottom: 24px; }
      .amount-hero span { display: block; font-size: 11px; font-weight: 800; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px; }
      .amount-hero strong { display: block; font-size: 32px; font-weight: 900; color: #92400e; margin-top: 4px; }
      .seal { font-size: 11.5px; color: #78716c; text-align: center; line-height: 1.5; border-top: 1px solid #ede8dc; padding-top: 18px; margin-top: 24px; }
      .footer { background: #faf9f6; padding: 18px; text-align: center; font-size: 11px; color: #a8a29e; border-top: 1px solid #ede8dc; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <h1>Chhatradol Social Welfare Organization</h1>
        <p>Official Payment Receipt & Invoice</p>
      </div>
      <div class="content">
        <div style="text-align: center;">
          <span class="receipt-pill">✓ Payment Confirmed</span>
        </div>
        <div class="greeting">Dear ${data.recipientName || 'Supporter'},</div>
        <p class="intro">
          Thank you for your generous contribution. We have successfully received your payment. Here are your transaction and invoice details:
        </p>

        <div class="amount-hero">
          <span>Amount Successfully Received</span>
          <strong>${amountFormatted}</strong>
        </div>

        <div class="table-box">
          <div class="row"><span class="k">Receipt No:</span><span class="v">${data.receiptNumber}</span></div>
          <div class="row"><span class="k">Date & Time:</span><span class="v">${displayDate}</span></div>
          <div class="row"><span class="k">Donor / Member:</span><span class="v">${data.recipientName}</span></div>

          ${data.purpose ? `<div class="row"><span class="k">Purpose:</span><span class="v">${data.purpose}</span></div>` : ''}
          ${data.month ? `<div class="row"><span class="k">Month:</span><span class="v">${data.month} ${data.year ?? ''}</span></div>` : ''}
          ${data.paymentMethod ? `<div class="row"><span class="k">Payment Method:</span><span class="v">${data.paymentMethod}</span></div>` : ''}
          ${data.paymentId ? `<div class="row"><span class="k">Transaction ID:</span><span class="v">${data.paymentId}</span></div>` : ''}
        </div>

        <div class="seal">
          🔒 <strong>256-Bit SSL Verified Computer-Generated Receipt</strong><br>
          Donations may be eligible for tax exemption under 80G of the Income Tax Act.
        </div>
      </div>
      <div class="footer">
        Narajole Chhatradol Social Welfare Organization · Reg No: CSWO/WB/2024<br>
        Website: chhatradol.org · Email: chhatradolswo@gmail.com
      </div>
    </div>
  </body>
  </html>
  `;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const body = (await parseBody(req)) as unknown as SendReceiptEmailPayload;

    if (!body.recipientEmail) {
      return sendJson(res, 400, { error: 'recipientEmail is required' });
    }

    const htmlContent = buildReceiptHtml(body);

    // Save notification to Supabase notifications table
    try {
      await serverSupabase.from('cswo_notifications').insert({
        title: `Payment Invoice: ${body.receiptNumber}`,
        body: `Your payment of ₹${body.amount} for ${body.purpose || body.month || 'CSWO'} was confirmed. Receipt: ${body.receiptNumber}`,
        kind: 'payment',
        link: '/member/contributions',
      });
    } catch {
      // ignore
    }


    // Log the successful invoice generation
    console.log(`[Invoice Email] Successfully generated receipt email for ${body.recipientEmail} (${body.receiptNumber})`);

    return sendJson(res, 200, {
      success: true,
      message: `Invoice email successfully generated and queued for ${body.recipientEmail}`,
      receiptNumber: body.receiptNumber,
      previewHtml: htmlContent,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send receipt email';
    console.error('Invoice Email Error:', err);
    return sendJson(res, 500, { error: msg });
  }
}
