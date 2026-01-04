import PDFDocument from 'pdfkit';
import { Response } from 'express';
import type {
  Invoice,
  InvoiceLine,
  Customer,
  Bill,
  BillLine,
  Vendor
} from '@prisma/client';

const currencyFormatter = new Intl.NumberFormat('da-DK', {
  style: 'currency',
  currency: 'DKK'
});

type InvoiceForPdf = Invoice & {
  customer: Pick<Customer, 'name' | 'email'> | null;
  lines: InvoiceLine[];
};

type BillForPdf = Bill & {
  vendor: Pick<Vendor, 'name' | 'email'> | null;
  lines: BillLine[];
};

function formatAmount(value: number): string {
  return currencyFormatter.format(value / 100);
}

function addDocumentHeader(doc: PDFDocument, title: string) {
  doc.fontSize(20).text(title, { align: 'right' });
  doc.moveDown();
}

export function streamInvoicePdf(invoice: InvoiceForPdf, res: Response) {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=${invoice.invoiceNo}.pdf`);
  doc.pipe(res);

  addDocumentHeader(doc, `Invoice ${invoice.invoiceNo}`);

  doc.fontSize(12);
  doc.text(`Issue Date: ${invoice.issueDate.toDateString()}`);
  doc.text(`Due Date: ${invoice.dueDate.toDateString()}`);
  doc.text(`Status: ${invoice.status}`);
  doc.moveDown();

  doc.text('Bill To:');
  doc.text(invoice.customer?.name ?? 'Unknown');
  if (invoice.customer?.email) {
    doc.text(invoice.customer.email);
  }
  doc.moveDown();

  doc.text('Line Items');
  doc.moveDown(0.5);

  invoice.lines.forEach((line) => {
    const quantity = Number(line.quantity);
    const lineTotal = Math.round(quantity * line.unitPriceNet);
    doc.text(line.description);
    doc.text(
      `Qty: ${quantity}  Unit: ${formatAmount(line.unitPriceNet)}  Amount: ${formatAmount(lineTotal)}`
    );
    doc.moveDown(0.5);
  });

  doc.moveDown();
  doc.text(`Subtotal: ${formatAmount(invoice.subtotal)}`);
  doc.text(`Tax: ${formatAmount(invoice.taxTotal)}`);
  doc.text(`Total: ${formatAmount(invoice.total)}`);
  doc.text(`Balance Due: ${formatAmount(invoice.balance)}`);

  doc.end();
}

export function streamBillPdf(bill: BillForPdf, res: Response) {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=${bill.billNo}.pdf`);
  doc.pipe(res);

  addDocumentHeader(doc, `Bill ${bill.billNo}`);

  doc.fontSize(12);
  doc.text(`Issue Date: ${bill.issueDate.toDateString()}`);
  doc.text(`Due Date: ${bill.dueDate.toDateString()}`);
  doc.text(`Status: ${bill.status}`);
  doc.moveDown();

  doc.text('Vendor:');
  doc.text(bill.vendor?.name ?? 'Unknown');
  if (bill.vendor?.email) {
    doc.text(bill.vendor.email);
  }
  doc.moveDown();

  doc.text('Line Items');
  doc.moveDown(0.5);

  bill.lines.forEach((line) => {
    const quantity = Number(line.quantity);
    const lineTotal = Math.round(quantity * line.unitPriceNet);
    doc.text(line.description);
    doc.text(
      `Qty: ${quantity}  Unit: ${formatAmount(line.unitPriceNet)}  Amount: ${formatAmount(lineTotal)}`
    );
    doc.moveDown(0.5);
  });

  doc.moveDown();
  doc.text(`Subtotal: ${formatAmount(bill.subtotal)}`);
  doc.text(`Tax: ${formatAmount(bill.taxTotal)}`);
  doc.text(`Total: ${formatAmount(bill.total)}`);
  doc.text(`Balance Due: ${formatAmount(bill.balance)}`);

  doc.end();
}
