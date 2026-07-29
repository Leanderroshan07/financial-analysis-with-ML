import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: 'Rent', type: 'FIXED' },
  { name: 'EMI', type: 'FIXED' },
  { name: 'Loan', type: 'FIXED' },
  { name: 'Insurance', type: 'FIXED' },
  { name: 'Credit Card', type: 'FIXED' },
  { name: 'Food', type: 'VARIABLE' },
  { name: 'Fuel', type: 'VARIABLE' },
  { name: 'Shopping', type: 'VARIABLE' },
  { name: 'Entertainment', type: 'VARIABLE' },
  { name: 'Groceries', type: 'VARIABLE' },
  { name: 'Medical', type: 'VARIABLE' },
  { name: 'Travel', type: 'VARIABLE' },
  { name: 'Utilities', type: 'FIXED' },
  { name: 'Subscriptions', type: 'FIXED' },
];

const SYSTEM_ACCOUNTS = [
  { name: 'Savings', type: 'Savings' },
  { name: 'Emergency Fund', type: 'EmergencyFund' },
];

async function main() {
  console.log('Seeding default data for demo user...');

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: { name: 'Demo User' },
    create: { email: 'demo@example.com', name: 'Demo User' },
  });

  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.expenseCategory.upsert({
      where: { userId_name: { userId: demoUser.id, name: cat.name } },
      update: { type: cat.type },
      create: { userId: demoUser.id, name: cat.name, type: cat.type },
    });
  }

  for (const acct of SYSTEM_ACCOUNTS) {
    const existing = await prisma.account.findFirst({ where: { userId: demoUser.id, type: acct.type } });
    if (!existing) {
      await prisma.account.create({
        data: { userId: demoUser.id, name: acct.name, type: acct.type, currentBalance: 0, initialBalance: 0 },
      });
      console.log(`  Created ${acct.name} account`);
    }
  }

  console.log(`Seed complete. Demo user ID: ${demoUser.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
