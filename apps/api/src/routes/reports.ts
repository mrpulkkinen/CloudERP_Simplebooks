import { Router, Request, Response, NextFunction } from 'express';

import { prisma } from '../services/prisma.js';
import { loadEnv } from '../config/env.js';
import { ACCOUNT_CODES, getAccountBalance } from '../services/accounts.js';

const router = Router();
const { DEFAULT_ORG_ID } = loadEnv();

function computeDaysPastDue(dueDate: Date): number {
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.floor((now.getTime() - dueDate.getTime()) / msPerDay);
  return diff;
}

function resolveBucket(daysPastDue: number): keyof AgingTotals {
  if (daysPastDue <= 0) {
    return 'current';
  }
  if (daysPastDue <= 30) {
    return 'oneToThirty';
  }
  if (daysPastDue <= 60) {
    return 'thirtyOneToSixty';
  }
  if (daysPastDue <= 90) {
    return 'sixtyOneToNinety';
  }
  return 'ninetyPlus';
}

interface AgingTotals {
  current: number;
  oneToThirty: number;
  thirtyOneToSixty: number;
  sixtyOneToNinety: number;
  ninetyPlus: number;
  total: number;
}

function emptyAgingTotals(): AgingTotals {
  return {
    current: 0,
    oneToThirty: 0,
    thirtyOneToSixty: 0,
    sixtyOneToNinety: 0,
    ninetyPlus: 0,
    total: 0
  };
}

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

router.get('/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [openInvoicesAgg, openBillsAgg, cashBalance, receivablesBalance, payablesBalance] = await Promise.all([
      prisma.invoice.aggregate({
        where: { orgId: DEFAULT_ORG_ID, balance: { gt: 0 } },
        _sum: { balance: true },
        _count: { _all: true }
      }),
      prisma.bill.aggregate({
        where: { orgId: DEFAULT_ORG_ID, balance: { gt: 0 } },
        _sum: { balance: true },
        _count: { _all: true }
      }),
      getAccountBalance(prisma, DEFAULT_ORG_ID, ACCOUNT_CODES.BANK),
      getAccountBalance(prisma, DEFAULT_ORG_ID, ACCOUNT_CODES.ACCOUNTS_RECEIVABLE),
      getAccountBalance(prisma, DEFAULT_ORG_ID, ACCOUNT_CODES.ACCOUNTS_PAYABLE)
    ]);

    res.json({
      data: {
        openInvoices: {
          count: openInvoicesAgg._count._all ?? 0,
          total: openInvoicesAgg._sum.balance ?? 0
        },
        openBills: {
          count: openBillsAgg._count._all ?? 0,
          total: openBillsAgg._sum.balance ?? 0
        },
        cashBalance,
        receivablesBalance,
        payablesBalance
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/ar-aging', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { orgId: DEFAULT_ORG_ID, balance: { gt: 0 } },
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        invoiceNo: true,
        issueDate: true,
        dueDate: true,
        balance: true,
        customer: {
          select: { id: true, name: true }
        }
      }
    });

    const totals = emptyAgingTotals();
    const items = invoices.map((invoice) => {
      const daysPastDue = computeDaysPastDue(invoice.dueDate);
      const bucket = resolveBucket(daysPastDue);
      totals[bucket] += invoice.balance;
      totals.total += invoice.balance;

      return {
        id: invoice.id,
        documentNo: invoice.invoiceNo,
        customerName: invoice.customer?.name ?? 'Unknown',
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        balance: invoice.balance,
        daysPastDue,
        bucket
      };
    });

    res.json({ asOf: new Date().toISOString(), totals, items });
  } catch (error) {
    next(error);
  }
});

router.get('/ap-aging', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const bills = await prisma.bill.findMany({
      where: { orgId: DEFAULT_ORG_ID, balance: { gt: 0 } },
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        billNo: true,
        issueDate: true,
        dueDate: true,
        balance: true,
        vendor: {
          select: { id: true, name: true }
        }
      }
    });

    const totals = emptyAgingTotals();
    const items = bills.map((bill) => {
      const daysPastDue = computeDaysPastDue(bill.dueDate);
      const bucket = resolveBucket(daysPastDue);
      totals[bucket] += bill.balance;
      totals.total += bill.balance;

      return {
        id: bill.id,
        documentNo: bill.billNo,
        vendorName: bill.vendor?.name ?? 'Unknown',
        issueDate: bill.issueDate,
        dueDate: bill.dueDate,
        balance: bill.balance,
        daysPastDue,
        bucket
      };
    });

    res.json({ asOf: new Date().toISOString(), totals, items });
  } catch (error) {
    next(error);
  }
});

export const reportsRouter = router;
