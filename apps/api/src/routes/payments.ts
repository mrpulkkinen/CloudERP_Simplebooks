import { Router, Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { PaymentMethod, PaymentType } from '@prisma/client';

import { prisma } from '../services/prisma.js';
import { loadEnv } from '../config/env.js';
import { ACCOUNT_CODES, requireAccountId } from '../services/accounts.js';

const router = Router();
const { DEFAULT_ORG_ID } = loadEnv();

const paymentSchema = z
  .object({
    type: z.nativeEnum(PaymentType),
    method: z.nativeEnum(PaymentMethod).default(PaymentMethod.BANK_TRANSFER),
    amount: z.number().int().positive('Amount must be provided in øre'),
    date: z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Invalid date format' }),
    reference: z
      .string()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    invoiceId: z
      .string()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    billId: z
      .string()
      .optional()
      .or(z.literal('').transform(() => undefined))
  })
  .superRefine((data, ctx) => {
    if (data.type === 'AR' && !data.invoiceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['invoiceId'],
        message: 'Select an invoice to apply the payment'
      });
    }

    if (data.type === 'AP' && !data.billId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['billId'],
        message: 'Select a bill to pay'
      });
    }
  });

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { orgId: DEFAULT_ORG_ID },
      orderBy: { date: 'desc' },
      include: {
        invoices: {
          select: {
            invoice: {
              select: { id: true, invoiceNo: true }
            },
            amount: true
          }
        },
        bills: {
          select: {
            bill: {
              select: { id: true, billNo: true }
            },
            amount: true
          }
        }
      }
    });

    res.json({ data: payments });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = paymentSchema.parse(req.body);

    const payment = await prisma.$transaction(async (tx) => {
      if (payload.type === 'AR') {
        const invoice = await tx.invoice.findFirst({
          where: { id: payload.invoiceId ?? '', orgId: DEFAULT_ORG_ID },
          select: { id: true, invoiceNo: true, balance: true, status: true, customerId: true }
        });

        if (!invoice) {
          throw Object.assign(new Error('Invoice not found'), {
            statusCode: 404,
            code: 'invoice_not_found'
          });
        }

        if (payload.amount > invoice.balance) {
          throw Object.assign(new Error('Payment exceeds open balance'), {
            statusCode: 422,
            code: 'payment_exceeds_balance'
          });
        }

        const paymentRecord = await tx.payment.create({
          data: {
            orgId: DEFAULT_ORG_ID,
            type: payload.type,
            method: payload.method,
            amount: payload.amount,
            date: new Date(payload.date),
            reference: payload.reference,
            customerId: invoice.customerId
          }
        });

        await tx.invoicePayment.create({
          data: {
            invoiceId: invoice.id,
            paymentId: paymentRecord.id,
            amount: payload.amount
          }
        });

        const remaining = invoice.balance - payload.amount;
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            balance: remaining,
            status: remaining === 0 ? 'PAID' : 'PARTIALLY_PAID'
          }
        });

        const bankAccountId = await requireAccountId(tx, DEFAULT_ORG_ID, ACCOUNT_CODES.BANK);
        const accountsReceivableId = await requireAccountId(
          tx,
          DEFAULT_ORG_ID,
          ACCOUNT_CODES.ACCOUNTS_RECEIVABLE
        );

        await tx.journalEntry.create({
          data: {
            orgId: DEFAULT_ORG_ID,
            date: new Date(payload.date),
            memo: `Payment for invoice ${invoice.invoiceNo}`,
            source: 'PAYMENT',
            sourceId: paymentRecord.id,
            lines: {
              create: [
                { accountId: bankAccountId, debit: payload.amount, credit: 0 },
                { accountId: accountsReceivableId, debit: 0, credit: payload.amount }
              ]
            }
          }
        });

        return paymentRecord;
      }

      const bill = await tx.bill.findFirst({
        where: { id: payload.billId ?? '', orgId: DEFAULT_ORG_ID },
        select: { id: true, billNo: true, balance: true, vendorId: true }
      });

      if (!bill) {
        throw Object.assign(new Error('Bill not found'), {
          statusCode: 404,
          code: 'bill_not_found'
        });
      }

      if (payload.amount > bill.balance) {
        throw Object.assign(new Error('Payment exceeds open balance'), {
          statusCode: 422,
          code: 'payment_exceeds_balance'
        });
      }

      const paymentRecord = await tx.payment.create({
        data: {
          orgId: DEFAULT_ORG_ID,
          type: payload.type,
          method: payload.method,
          amount: payload.amount,
          date: new Date(payload.date),
          reference: payload.reference,
          vendorId: bill.vendorId
        }
      });

      await tx.billPayment.create({
        data: {
          billId: bill.id,
          paymentId: paymentRecord.id,
          amount: payload.amount
        }
      });

      const remaining = bill.balance - payload.amount;
      await tx.bill.update({
        where: { id: bill.id },
        data: {
          balance: remaining,
          status: remaining === 0 ? 'PAID' : 'PARTIALLY_PAID'
        }
      });

      const bankAccountId = await requireAccountId(tx, DEFAULT_ORG_ID, ACCOUNT_CODES.BANK);
      const accountsPayableId = await requireAccountId(
        tx,
        DEFAULT_ORG_ID,
        ACCOUNT_CODES.ACCOUNTS_PAYABLE
      );

      await tx.journalEntry.create({
        data: {
          orgId: DEFAULT_ORG_ID,
          date: new Date(payload.date),
          memo: `Payment for bill ${bill.billNo}`,
          source: 'PAYMENT',
          sourceId: paymentRecord.id,
          lines: {
            create: [
              { accountId: accountsPayableId, debit: payload.amount, credit: 0 },
              { accountId: bankAccountId, debit: 0, credit: payload.amount }
            ]
          }
        }
      });

      return paymentRecord;
    });

    res.status(201).json({ data: payment });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({
        error: {
          code: 'validation_error',
          message: 'Invalid payment data',
          details: error.flatten()
        }
      });
      return;
    }

    if ((error as { statusCode?: number }).statusCode) {
      const typedError = error as { statusCode: number; code?: string; message: string };
      res.status(typedError.statusCode).json({
        error: {
          code: typedError.code ?? 'payment_error',
          message: typedError.message
        }
      });
      return;
    }

    next(error);
  }
});

export const paymentsRouter = router;
