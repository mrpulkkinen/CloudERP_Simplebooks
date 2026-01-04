import { Router, Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';

import { prisma } from '../services/prisma.js';
import { loadEnv } from '../config/env.js';
import { requireAccountId } from '../services/accounts.js';

const router = Router();
const { DEFAULT_ORG_ID } = loadEnv();

const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  description: z
    .string()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  unitPriceNet: z.number().int('Unit price must be provided in øre').nonnegative(),
  incomeAccountCode: z.string().min(1, 'Select an income account'),
  taxRateId: z
    .string()
    .optional()
    .or(z.literal('').transform(() => undefined))
});

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      where: { orgId: DEFAULT_ORG_ID },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        unitPriceNet: true,
        isActive: true,
        incomeAccount: {
          select: {
            code: true,
            name: true
          }
        },
        taxRate: {
          select: {
            id: true,
            name: true,
            rate: true
          }
        }
      }
    });

    res.json({ data: products });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = createProductSchema.parse(req.body);

    if (payload.taxRateId) {
      const taxRate = await prisma.taxRate.findFirst({
        where: { id: payload.taxRateId, orgId: DEFAULT_ORG_ID, isActive: true },
        select: { id: true }
      });

      if (!taxRate) {
        res.status(404).json({ error: { code: 'tax_rate_not_found', message: 'Tax rate not found' } });
        return;
      }
    }

    const incomeAccountId = await requireAccountId(prisma, DEFAULT_ORG_ID, payload.incomeAccountCode);

    const product = await prisma.product.create({
      data: {
        orgId: DEFAULT_ORG_ID,
        sku: payload.sku,
        name: payload.name,
        description: payload.description,
        unitPriceNet: payload.unitPriceNet,
        incomeAccountId,
        taxRateId: payload.taxRateId
      },
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        unitPriceNet: true,
        isActive: true,
        incomeAccount: {
          select: { code: true, name: true }
        },
        taxRate: {
          select: { id: true, name: true, rate: true }
        }
      }
    });

    res.status(201).json({ data: product });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({
        error: {
          code: 'validation_error',
          message: 'Invalid product data',
          details: error.flatten()
        }
      });
      return;
    }

    next(error);
  }
});

export const productsRouter = router;
