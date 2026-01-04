import { Router, Request, Response, NextFunction } from 'express';

import { prisma } from '../services/prisma.js';
import { loadEnv } from '../config/env.js';

const router = Router();
const { DEFAULT_ORG_ID } = loadEnv();

router.get('/trial-balance', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { orgId: DEFAULT_ORG_ID },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, type: true }
    });

    const grouped = await prisma.journalLine.groupBy({
      by: ['accountId'],
      _sum: { debit: true, credit: true },
      where: { account: { orgId: DEFAULT_ORG_ID } }
    });

    const groupedMap = new Map(
      grouped.map((row) => [
        row.accountId,
        { debit: row._sum.debit ?? 0, credit: row._sum.credit ?? 0 }
      ])
    );

    const rows = accounts.map((account) => {
      const totals = groupedMap.get(account.id) ?? { debit: 0, credit: 0 };
      const balance = totals.debit - totals.credit;

      return {
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        debit: totals.debit,
        credit: totals.credit,
        balance
      };
    });

    const totals = rows.reduce(
      (acc, row) => {
        acc.debit += row.debit;
        acc.credit += row.credit;
        acc.balance += row.balance;
        return acc;
      },
      { debit: 0, credit: 0, balance: 0 }
    );

    res.json({ data: rows, totals });
  } catch (error) {
    next(error);
  }
});

export const reportsRouter = router;
