import { PrismaClient, Prisma, AccountType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: 'demo-org' },
    update: {},
    create: {
      id: 'demo-org',
      name: 'Demo Company'
    }
  });

  const ownerPassword = await bcrypt.hash('demo1234', 10);

  const user = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: {
      email: 'owner@example.com',
      password: ownerPassword,
      name: 'Demo Owner'
    }
  });

  await prisma.userOrganization.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: {},
    create: {
      userId: user.id,
      orgId: org.id,
      role: 'owner'
    }
  });

  const accounts = [
    { code: '1010', name: 'Bank', type: AccountType.ASSET },
    { code: '1100', name: 'Accounts Receivable', type: AccountType.ASSET },
    { code: '2100', name: 'Accounts Payable', type: AccountType.LIABILITY },
    { code: '2610', name: 'Output VAT', type: AccountType.LIABILITY },
    { code: '3000', name: 'Equity', type: AccountType.EQUITY },
    { code: '4000', name: 'Sales', type: AccountType.INCOME },
    { code: '5300', name: 'Office Expenses', type: AccountType.EXPENSE },
    { code: '5710', name: 'Input VAT', type: AccountType.EXPENSE }
  ];

  for (const account of accounts) {
    await prisma.account.upsert({
      where: { orgId_code: { orgId: org.id, code: account.code } },
      update: {},
      create: {
        orgId: org.id,
        code: account.code,
        name: account.name,
        type: account.type,
        isSystem: true
      }
    });
  }

  await prisma.taxRate.upsert({
    where: { id: 'vat-25' },
    update: {},
    create: {
      id: 'vat-25',
      orgId: org.id,
      name: 'VAT 25%',
      rate: new Prisma.Decimal('25.00')
    }
  });

  console.log('Seed data created');
}

main()
  .catch((error) => {
    console.error('Seed error', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
