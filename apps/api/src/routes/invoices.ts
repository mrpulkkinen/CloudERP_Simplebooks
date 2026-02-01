import { Router, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';

import { prisma } from '../services/prisma.js';
import { ACCOUNT_CODES, requireAccountId } from '../services/accounts.js';
import { computeLineTotals, loadTaxRateMap } from '../services/totals.js';
import { streamInvoicePdf } from '../services/pdf.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getRequestOrgId } from '../services/org.js';
import { formatSequence, getNextSequenceValue } from '../services/sequences.js';
import { recordAuditLog } from '../services/audit-log.js';

const router = Router();

const isoDateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Invalid date format' });

const invoiceLineSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitPriceNet: z
    .number({ required_error: 'Unit price is required' })
    .int('Unit price must be provided in øre'),
  taxRateId: z
    .string()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  accountCode: z
    .string()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  productId: z
    .string()
    .optional()
    .or(z.literal('').transform(() => undefined))
});

const createInvoiceSchema = z
  .object({
    customerId: z.string().min(1, 'Customer is required'),
    issueDate: isoDateSchema,
    dueDate: isoDateSchema,
    currency: z.string().min(1).default('DKK'),
    lines: z.array(invoiceLineSchema).min(1, 'At least one line is required')
  })
  .superRefine((data, ctx) => {
    const issueDate = new Date(data.issueDate);
    const dueDate = new Date(data.dueDate);

    if (dueDate.getTime() < issueDate.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dueDate'],
        message: 'Due date must be on or after the issue date'
      });
    }
  });

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = getRequestOrgId(req);
    const invoices = await prisma.invoice.findMany({
      where: { orgId },
      orderBy: { issueDate: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({ data: invoices });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/pdf', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = getRequestOrgId(req);
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, orgId },
      include: {
        customer: {
          select: {
            name: true,
            email: true
          }
        },
        lines: true
      }
    });

    if (!invoice) {
      res.status(404).json({ error: { code: 'invoice_not_found', message: 'Invoice not found' } });
      return;
    }

    streamInvoicePdf(invoice, res);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const payload = createInvoiceSchema.parse(req.body);
    const orgId = getRequestOrgId(req);
    const customer = await prisma.customer.findFirst({
      where: { id: payload.customerId, orgId },
      select: { id: true }
    });

    if (!customer) {
      res.status(404).json({ error: { code: 'customer_not_found', message: 'Customer not found' } });
      return;
    }

    const taxRateIds = payload.lines
      .map((line) => line.taxRateId)
      .filter((value): value is string => Boolean(value));
    const taxRateMap = await loadTaxRateMap(taxRateIds, orgId);

    for (const line of payload.lines) {
      if (line.taxRateId && !taxRateMap.has(line.taxRateId)) {
        res.status(404).json({ error: { code: 'tax_rate_not_found', message: 'Tax rate not found' } });
        return;
      }
    }

    const productIds = payload.lines
      .map((line) => line.productId)
      .filter((value): value is string => Boolean(value));

    const products = await prisma.product.findMany({
      where: { orgId, id: { in: productIds } },
      select: {
        id: true,
        incomeAccount: {
          select: {
            code: true
          }
        }
      }
    });

    const productMap = new Map(
      products.map((product) => [product.id, product])
    );

    for (const line of payload.lines) {
      if (line.productId && !productMap.has(line.productId)) {
        res.status(404).json({ error: { code: 'product_not_found', message: 'Product not found' } });
        return;
      }
    }

    const resolvedAccountCodes = payload.lines.map((line) => {
      if (line.accountCode) {
        return line.accountCode;
      }

      if (line.productId) {
        const product = productMap.get(line.productId);
        if (product?.incomeAccount?.code) {
          return product.incomeAccount.code;
        }
      }

      return ACCOUNT_CODES.SALES;
    });

    const uniqueAccountCodes = Array.from(new Set(resolvedAccountCodes));

    const accountRecords =
      uniqueAccountCodes.length === 0
        ? []
        : await prisma.account.findMany({
            where: { orgId, code: { in: uniqueAccountCodes } },
            select: { id: true, code: true }
          });

    if (accountRecords.length !== uniqueAccountCodes.length) {
      res.status(404).json({
        error: {
          code: 'account_not_found',
          message: 'One or more accounts were not found'
        }
      });
      return;
    }

    const accountIdByCode = new Map(accountRecords.map((account) => [account.code, account.id]));

    const lineComputations = computeLineTotals(payload.lines, taxRateMap);
    const subtotal = lineComputations.reduce((sum, line) => sum + line.lineTotal, 0);
    const taxTotal = lineComputations.reduce((sum, line) => sum + line.taxAmount, 0);
    const total = subtotal + taxTotal;

    const invoice = await prisma.$transaction(async (tx) => {
      const sequenceValue = await getNextSequenceValue(tx, orgId, 'invoice');
      const invoiceNo = formatSequence('INV', sequenceValue);
      const createdInvoice = await tx.invoice.create({
        data: {
          orgId,
          customerId: payload.customerId,
          invoiceNo,
          issueDate: new Date(payload.issueDate),
          dueDate: new Date(payload.dueDate),
          currency: payload.currency,
          status: 'ISSUED',
          subtotal,
          taxTotal,
          total,
          balance: total,
          lines: {
            create: payload.lines.map((line, index) => ({
              description: line.description,
              quantity: line.quantity,
              unitPriceNet: line.unitPriceNet,
              taxRateId: line.taxRateId,
              productId: line.productId,
              taxRatePercentSnapshot: lineComputations[index]?.taxRatePercent
            }))
          }
        },
        include: {
          customer: {
            select: { id: true, name: true }
          }
        }
      });

      const lines = [];
      const accountsReceivableId = await requireAccountId(tx, orgId, ACCOUNT_CODES.ACCOUNTS_RECEIVABLE);
      const vatAccountId = await requireAccountId(tx, orgId, ACCOUNT_CODES.OUTPUT_VAT);

      if (total > 0) {
        lines.push({
          accountId: accountsReceivableId,
          debit: total,
          credit: 0
        });
      }

      const revenueTotals = new Map<string, number>();
      lineComputations.forEach((line, index) => {
        const accountCode = resolvedAccountCodes[index];
        const current = revenueTotals.get(accountCode) ?? 0;
        revenueTotals.set(accountCode, current + line.lineTotal);
      });

      for (const [accountCode, amount] of revenueTotals.entries()) {
        if (amount <= 0) {
          continue;
        }
        const accountId = accountIdByCode.get(accountCode);
        if (!accountId) {
          throw new Error(`Account ${accountCode} missing during journal creation`);
        }
        lines.push({
          accountId,
          debit: 0,
          credit: amount
        });
      }

      if (taxTotal > 0) {
        lines.push({
          accountId: vatAccountId,
          debit: 0,
          credit: taxTotal
        });
      }

      if (lines.length > 0) {
        await tx.journalEntry.create({
          data: {
            orgId,
            date: new Date(payload.issueDate),
            memo: `Invoice ${invoiceNo}`,
            source: 'INVOICE',
            sourceId: createdInvoice.id,
            lines: {
              create: lines
            }
          }
        });
      }

      return createdInvoice;
    });

    await recordAuditLog({
      orgId,
      userId: req.user?.userId,
      entityType: 'invoice',
      entityId: invoice.id,
      action: 'create',
      context: {
        invoiceNo: invoice.invoiceNo,
        customerId: invoice.customerId,
        issueDate: invoice.issueDate.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        total: invoice.total,
        currency: invoice.currency
      }
    });

    res.status(201).json({ data: invoice });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({
        error: {
          code: 'validation_error',
          message: 'Invalid invoice data',
          details: error.flatten()
        }
      });
      return;
    }

    next(error);
  }
});

router.post('/:id/void', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = getRequestOrgId(req);
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, orgId },
      select: {
        id: true,
        invoiceNo: true,
        status: true,
        total: true,
        balance: true
      }
    });

    if (!invoice) {
      res.status(404).json({ error: { code: 'invoice_not_found', message: 'Invoice not found' } });
      return;
    }

    if (invoice.status === 'VOID') {
      res.status(409).json({
        error: { code: 'invoice_already_void', message: 'Invoice already voided' }
      });
      return;
    }

    if (invoice.balance !== invoice.total) {
      res.status(409).json({
        error: {
          code: 'invoice_has_payments',
          message: 'Invoices with payments cannot be voided'
        }
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const journal = await tx.journalEntry.findFirst({
        where: { orgId, source: 'INVOICE', sourceId: invoice.id },
        include: { lines: true }
      });

      if (journal) {
        await tx.journalEntry.create({
          data: {
            orgId,
            date: new Date(),
            memo: `Void invoice ${invoice.invoiceNo}`,
            source: 'VOID',
            sourceId: invoice.id,
            lines: {
              create: journal.lines.map((line) => ({
                accountId: line.accountId,
                debit: line.credit,
                credit: line.debit
              }))
            }
          }
        });
      }

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'VOID',
          balance: 0
        }
      });
    });

    res.status(200).json({ data: { id: invoice.id, status: 'VOID' } });
  } catch (error) {
    next(error);
  }
});

export const invoicesRouter = router;
