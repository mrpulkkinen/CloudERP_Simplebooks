import { PrismaClient, AccountType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('change-me', 10);

  const org = await prisma.organization.upsert({
    where: { id: 'demo-org' },
    update: {},
    create: {
      id: 'demo-org',
      name: 'Demo Organization'
    }
  });

  await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: {
      email: 'owner@example.com',
      passwordHash,
      name: 'Demo Owner',
      organizations: {
        create: {
          orgId: org.id,
          role: 'owner'
        }
      }
    }
  });

  const accounts = [
    { code: '1010', name: 'Bank', type: AccountType.asset, isSystem: true },
    { code: '1100', name: 'Accounts Receivable', type: AccountType.asset, isSystem: true },
    { code: '2100', name: 'Accounts Payable', type: AccountType.liability, isSystem: true },
    { code: '2610', name: 'Output VAT', type: AccountType.liability, isSystem: true },
    { code: '3000', name: 'Owner Equity', type: AccountType.equity, isSystem: true },
    { code: '4000', name: 'Sales', type: AccountType.income, isSystem: true },
    { code: '5300', name: 'Office Expenses', type: AccountType.expense, isSystem: true },
    { code: '5710', name: 'Input VAT', type: AccountType.expense, isSystem: true }
  ];

  for (const account of accounts) {
    await prisma.account.upsert({
      where: {
        orgId_code: {
          orgId: org.id,
          code: account.code
        }
      },
      update: account,
      create: {
        ...account,
        orgId: org.id
      }
    });
  }

  await prisma.taxRate.upsert({
    where: { id: 'vat-25' },
    update: {
      orgId: org.id
    },
    create: {
      id: 'vat-25',
      orgId: org.id,
      name: 'VAT 25%',
      ratePercent: 25
    }
  });

  console.log('Seed data created');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
