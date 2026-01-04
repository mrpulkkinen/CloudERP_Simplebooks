import { Router, Request, Response, NextFunction } from 'express';

import { prisma } from '../services/prisma.js';
import { loadEnv } from '../config/env.js';

const router = Router();
const { DEFAULT_ORG_ID } = loadEnv();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const taxRates = await prisma.taxRate.findMany({
      where: { orgId: DEFAULT_ORG_ID, isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        rate: true
      }
    });

    res.json({ data: taxRates });
  } catch (error) {
    next(error);
  }
});

export const taxRatesRouter = router;
