import { Prisma, PrismaClient } from '@prisma/client';

type PrismaClientOrTransaction = PrismaClient | Prisma.TransactionClient;

export const ACCOUNT_CODES = {
  BANK: '1010',
  ACCOUNTS_RECEIVABLE: '1100',
  ACCOUNTS_PAYABLE: '2100',
  OUTPUT_VAT: '2610',
  SALES: '4000',
  OPERATING_EXPENSES: '5300',
  INPUT_VAT: '5710'
} as const;

export async function requireAccountId(
  db: PrismaClientOrTransaction,
  orgId: string,
  code: string
): Promise<string> {
  const account = await db.account.findFirst({
    where: { orgId, code },
    select: { id: true }
  });

  if (!account) {
    throw new Error(`Required account ${code} is not configured for organization ${orgId}`);
  }

  return account.id;
}
