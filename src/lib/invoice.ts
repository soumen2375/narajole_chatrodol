/**
 * invoice.ts — the organisation's bill, printed on the same sheet as every
 * other document it issues.
 *
 * The line-item grid is the one piece a receipt does not need; it comes from
 * the shared dataGrid() helper rather than styling invented here.
 */

import {
  amountBand, dataGrid, detailTable, esc, escLines, printDocSheet, rupees, section,
} from '@/lib/docsheet';
import { amountInWords } from '@/lib/receipt';

export interface InvoiceLine {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoiceBank {
  account_name: string;
  account_number: string;
  ifsc: string;
  branch: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  billToName: string;
  billToEmail?: string | null;
  billToPhone?: string | null;
  billToAddress?: string | null;
  date: string;                 // already formatted, e.g. "25 August 2026"
  dueDate?: string | null;
  paymentMode?: string | null;
  paymentRef?: string | null;
  items: InvoiceLine[];
  subtotal: number;
  discount: number;
  roundOff: number;
  total: number;
  amountPaid?: number;
  notes?: string | null;
  bank?: InvoiceBank | null;
}

const money = (n: number) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const qtyText = (n: number) => {
  const v = Number(n || 0);
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(3)));
};

export function printInvoice(data: InvoiceData) {
  const itemRows = data.items.length
    ? data.items
        .map(
          (it, i) => `<tr>
            <td class="num">${i + 1}</td>
            <td>${esc(it.description)}</td>
            <td class="num">${qtyText(it.quantity)}</td>
            <td class="num">${money(it.rate)}</td>
            <td class="num">${money(it.amount)}</td>
          </tr>`,
        )
        .join('')
    : '<tr><td colspan="5" style="text-align:center;color:#9A9A9A">No line items</td></tr>';

  // Only the totals that carry information — a zero discount is noise on a bill.
  const totals: Array<[string, string]> = [
    ['Subtotal', money(data.subtotal)],
    ...(data.discount ? [['Discount', `− ${money(data.discount)}`] as [string, string]] : []),
    ...(data.roundOff ? [['Round off', money(data.roundOff)] as [string, string]] : []),
    ...(data.amountPaid !== undefined && data.amountPaid !== null
      ? [['Amount paid', money(data.amountPaid)] as [string, string]]
      : []),
    ...(data.amountPaid !== undefined && data.amountPaid !== null && data.total - data.amountPaid > 0
      ? [['Balance due', money(data.total - data.amountPaid)] as [string, string]]
      : []),
  ];

  printDocSheet({
    title: `BILL ${data.invoiceNumber}`,
    docTitle: 'BILL / INVOICE',
    refLabel: 'Bill No.',
    refValue: data.invoiceNumber,
    dateValue: data.date,
    bodyHtml: [
      detailTable([
        ['Bill To', esc(data.billToName) || '—'],
        ...(data.billToAddress ? [['Address', escLines(data.billToAddress)] as [string, string]] : []),
        ...(data.billToEmail ? [['Email', esc(data.billToEmail)] as [string, string]] : []),
        ...(data.billToPhone ? [['Phone', esc(data.billToPhone)] as [string, string]] : []),
        ...(data.dueDate ? [['Due Date', esc(data.dueDate)] as [string, string]] : []),
        ...(data.paymentMode ? [['Payment Mode', esc(data.paymentMode)] as [string, string]] : []),
        ...(data.paymentRef ? [['Payment Ref.', esc(data.paymentRef)] as [string, string]] : []),
      ]),
      dataGrid({
        head: [
          { label: '#', width: '8mm' },
          { label: 'Description' },
          { label: 'Qty', num: true, width: '16mm' },
          { label: 'Rate', num: true, width: '24mm' },
          { label: 'Amount', num: true, width: '26mm' },
        ],
        rows: itemRows,
        foot: totals
          .map(([k, v]) => `<tr><td colspan="4" class="num">${esc(k)}</td><td class="num">${v}</td></tr>`)
          .join(''),
      }),
      amountBand('Total Payable', rupees(data.total), amountInWords(Number(data.total))),
      data.bank
        ? section('Bank details') + detailTable([
            ['Account Name', esc(data.bank.account_name)],
            ['Account Number', esc(data.bank.account_number)],
            ['IFSC', esc(data.bank.ifsc)],
            ['Branch', esc(data.bank.branch)],
          ])
        : '',
      data.notes ? section('Notes') + `<p class="para">${escLines(data.notes)}</p>` : '',
    ].join(''),
    note: 'This is a computer-generated bill and does not require a physical signature.',
  });
}
