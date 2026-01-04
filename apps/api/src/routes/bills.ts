import { Router, Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';

import { prisma } from '../services/prisma.js';
import { loadEnv } from '../config/env.js';
import { ACCOUNT_CODES, requireAccountId } from '../services/accounts.js';
import { computeLineTotals, loadTaxRateMap } from '../services/totals.js';
import { streamBillPdf } from '../services/pdf.js';

const router = Router();
const { DEFAULT_ORG_ID } = loadEnv();

const billLineSchema = z.object({
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
    .or(z.literal('').transform(() => undefined))
});

const createBillSchema = z
  .object({
    vendorId: z.string().min(1, 'Vendor is required'),
    issueDate: z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Invalid date format' }),
    dueDate: z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Invalid date format' }),
    currency: z.string().min(1).default('DKK'),
    lines: z.array(billLineSchema).min(1, 'At least one line is required')
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

async function getNextBillNumber(client = prisma): Promise<string> {
  const count = await client.bill.count({ where: { orgId: DEFAULT_ORG_ID } });
  const sequence = count + 1;
  return `BILL-${sequence.toString().padStart(4, '0')}`;
}

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const bills = await prisma.bill.findMany({
      where: { orgId: DEFAULT_ORG_ID },
      orderBy: { issueDate: 'desc' },
      include: {
        vendor: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({ data: bills });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bill = await prisma.bill.findFirst({
      where: { id: req.params.id, orgId: DEFAULT_ORG_ID },
      include: {
        vendor: {
          select: { name: true, email: true }
        },
        lines: true
      }
    });

    if (!bill) {
      res.status(404).json({ error: { code: 'bill_not_found', message: 'Bill not found' } });
      return;
    }

    streamBillPdf(bill, res);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = createBillSchema.parse(req.body);
    const vendor = await prisma.vendor.findFirst({
      where: { id: payload.vendorId, orgId: DEFAULT_ORG_ID },
      select: { id: true }
    });

    if (!vendor) {
      res.status(404).json({ error: { code: 'vendor_not_found', message: 'Vendor not found' } });
      return;
    }

    const taxRateIds = payload.lines
      .map((line) => line.taxRateId)
      .filter((value): value is string => Boolean(value));
    const taxRateMap = await loadTaxRateMap(taxRateIds);

    for (const line of payload.lines) {
      if (line.taxRateId && !taxRateMap.has(line.taxRateId)) {
        res.status(404).json({ error: { code: 'tax_rate_not_found', message: 'Tax rate not found' } });
        return;
      }
    }

    const resolvedAccountCodes = payload.lines.map((line) => line.accountCode ?? ACCOUNT_CODES.OPERATING_EXPENSES);
    const uniqueAccountCodes = Array.from(new Set(resolvedAccountCodes));

    const accountRecords =
      uniqueAccountCodes.length === 0
        ? []
        : await prisma.account.findMany({
            where: { orgId: DEFAULT_ORG_ID, code: { in: uniqueAccountCodes } },
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

    const bill = await prisma.$transaction(async (tx) => {
      const billNo = await getNextBillNumber(tx);
      const createdBill = await tx.bill.create({
        data: {
          orgId: DEFAULT_ORG_ID,
          vendorId: payload.vendorId,
          billNo,
          issueDate: new Date(payload.issueDate),
          dueDate: new Date(payload.dueDate),
          currency: payload.currency,
          status: 'APPROVED',
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
              taxRatePercentSnapshot: lineComputations[index]?.taxRatePercent
            }))
          }
        },
        include: {
          vendor: {
            select: { id: true, name: true }
          }
        }
      });

      const accountsPayableId = await requireAccountId(
        tx,
        DEFAULT_ORG_ID,
        ACCOUNT_CODES.ACCOUNTS_PAYABLE
      );
      const inputVatAccountId = await requireAccountId(tx, DEFAULT_ORG_ID, ACCOUNT_CODES.INPUT_VAT);

      const journalLines = [];

      const expenseTotals = new Map<string, number>();
      lineComputations.forEach((line, index) => {
        const accountCode = resolvedAccountCodes[index];
        const current = expenseTotals.get(accountCode) ?? 0;
        expenseTotals.set(accountCode, current + line.lineTotal);
      });

      for (const [accountCode, amount] of expenseTotals.entries()) {
        if (amount <= 0) {
          continue;
        }

        const accountId = accountIdByCode.get(accountCode);
        if (!accountId) {
          throw new Error(`Account ${accountCode} missing during journal creation`);
        }

        journalLines.push({
          accountId,
          debit: amount,
          credit: 0
        });
      }

      if (taxTotal > 0) {
        journalLines.push({
          accountId: inputVatAccountId,
          debit: taxTotal,
          credit: 0
        });
      }

      if (total > 0) {
        journalLines.push({
          accountId: accountsPayableId,
          debit: 0,
          credit: total
        });
      }

      if (journalLines.length > 0) {
        await tx.journalEntry.create({
          data: {
            orgId: DEFAULT_ORG_ID,
            date: new Date(payload.issueDate),
            memo: `Bill ${billNo}`,
            source: 'BILL',
            sourceId: createdBill.id,
            lines: {
              create: journalLines
            }
          }
        });
      }

      return createdBill;
    });

    res.status(201).json({ data: bill });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({
        error: {
          code: 'validation_error',
          message: 'Invalid bill data',
          details: error.flatten()
        }
      });
      return;
    }

    next(error);
  }
});

export const billsRouter = router;
