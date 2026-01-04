import { Router, Request, Response, NextFunction } from 'express';

import { prisma } from '../services/prisma.js';
import { loadEnv } from '../config/env.js';

const router = Router();
const { DEFAULT_ORG_ID } = loadEnv();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const entries = await prisma.journalEntry.findMany({
      where: { orgId: DEFAULT_ORG_ID },
      orderBy: { date: 'desc' },
      include: {
        lines: {
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          }
        }
      }
    });

    res.json({ data: entries });
  } catch (error) {
    next(error);
  }
});

export const ledgerRouter = router;
