import { Router, Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';

import { prisma } from '../services/prisma.js';
import { loadEnv } from '../config/env.js';

const router = Router();
const { DEFAULT_ORG_ID } = loadEnv();

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z
    .string()
    .email('Invalid email')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  phone: z
    .string()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  vatNumber: z
    .string()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  notes: z
    .string()
    .optional()
    .or(z.literal('').transform(() => undefined))
});

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { orgId: DEFAULT_ORG_ID, isArchived: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        vatNumber: true,
        notes: true,
        createdAt: true
      }
    });

    res.json({ data: customers });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = createCustomerSchema.parse(req.body);

    const customer = await prisma.customer.create({
      data: {
        orgId: DEFAULT_ORG_ID,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        vatNumber: payload.vatNumber,
        notes: payload.notes
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        vatNumber: true,
        notes: true,
        createdAt: true
      }
    });

    res.status(201).json({ data: customer });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({
        error: {
          code: 'validation_error',
          message: 'Invalid customer data',
          details: error.flatten()
        }
      });
      return;
    }

    next(error);
  }
});

export const customersRouter = router;
