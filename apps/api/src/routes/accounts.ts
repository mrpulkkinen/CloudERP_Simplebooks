import { Router, Request, Response, NextFunction } from 'express';
import { AccountType } from '@prisma/client';

import { prisma } from '../services/prisma.js';
import { loadEnv } from '../config/env.js';

const router = Router();
const { DEFAULT_ORG_ID } = loadEnv();

const allowedTypes = new Set<AccountType>(Object.values(AccountType));

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.query;
    let accountType: AccountType | undefined;

    if (typeof type === 'string') {
      if (!allowedTypes.has(type as AccountType)) {
        res.status(400).json({
          error: {
            code: 'invalid_account_type',
            message: 'Provided account type is invalid'
          }
        });
        return;
      }

      accountType = type as AccountType;
    }

    const accounts = await prisma.account.findMany({
      where: {
        orgId: DEFAULT_ORG_ID,
        isActive: true,
        ...(accountType ? { type: accountType } : {})
      },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        type: true
      }
    });

    res.json({ data: accounts });
  } catch (error) {
    next(error);
  }
});

export const accountsRouter = router;
