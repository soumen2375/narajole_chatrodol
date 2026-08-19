/**
 * email.ts — Automated Email Confirmation & Receipt Invoice Dispatcher
 */

export interface ReceiptEmailData {
  recipientEmail: string;
  recipientName: string;
  type: 'donation' | 'contribution';
  amount: number;
  receiptNumber: string;
  date?: string;
  purpose?: string;
  month?: string;
  year?: number;
  paymentMethod?: string;
  paymentId?: string;
}

/**
 * Dispatches an official confirmation invoice email to the donor/member.
 */
export async function sendReceiptInvoiceEmail(data: ReceiptEmailData): Promise<boolean> {
  if (!data.recipientEmail || !data.recipientEmail.includes('@')) {
    return false;
  }

  try {
    const res = await fetch('/api/send-receipt-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        date: data.date || new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      }),
    });

    return res.ok;
  } catch (err) {
    console.warn('Could not dispatch receipt email:', err);
    return false;
  }
}
