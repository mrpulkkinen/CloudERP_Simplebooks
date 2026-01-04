import { Router, Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';

import { prisma } from '../services/prisma.js';
import { loadEnv } from '../config/env.js';

const router = Router();
const { DEFAULT_ORG_ID } = loadEnv();

const vendorSchema = z.object({
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
    const vendors = await prisma.vendor.findMany({
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

    res.json({ data: vendors });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = vendorSchema.parse(req.body);

    const vendor = await prisma.vendor.create({
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

    res.status(201).json({ data: vendor });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({
        error: {
          code: 'validation_error',
          message: 'Invalid vendor data',
          details: error.flatten()
        }
      });
      return;
    }

    next(error);
  }
});

export const vendorsRouter = router;
