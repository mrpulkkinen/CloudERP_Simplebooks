import { Router, Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';

import { prisma } from '../services/prisma.js';
import { loadEnv } from '../config/env.js';

const router = Router();
const { DEFAULT_ORG_ID } = loadEnv();

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

function calculateSubtotal(lines: Array<{ quantity: number; unitPriceNet: number }>): number {
  return lines.reduce((total, line) => {
    const lineTotal = Math.round(line.quantity * line.unitPriceNet);
    return total + lineTotal;
  }, 0);
}

async function getNextInvoiceNumber(): Promise<string> {
  const count = await prisma.invoice.count({ where: { orgId: DEFAULT_ORG_ID } });
  const sequence = count + 1;
  return `INV-${sequence.toString().padStart(4, '0')}`;
}

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { orgId: DEFAULT_ORG_ID },
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

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = createInvoiceSchema.parse(req.body);
    const invoiceNo = await getNextInvoiceNumber();
    const subtotal = calculateSubtotal(payload.lines);

    const invoice = await prisma.invoice.create({
      data: {
        orgId: DEFAULT_ORG_ID,
        customerId: payload.customerId,
        invoiceNo,
        issueDate: new Date(payload.issueDate),
        dueDate: new Date(payload.dueDate),
        currency: payload.currency,
        status: 'ISSUED',
        subtotal,
        taxTotal: 0,
        total: subtotal,
        balance: subtotal,
        lines: {
          create: payload.lines.map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unitPriceNet: line.unitPriceNet,
            taxRateId: line.taxRateId
          }))
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true
          }
        }
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

export const invoicesRouter = router;
