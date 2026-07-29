import { Response } from 'express';
import { AuthRequest } from '../../auth/middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';

const prisma = new PrismaClient();
const ALLOWED_TYPES = ['INCOME', 'EXPENSE'];
const ALLOWED_NATURES = ['FIXED', 'VARIABLE'];
const ALLOWED_RECURRING = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'];
const ML_SYNC_TYPES = ['Savings', 'EmergencyFund'];

interface Allocation {
  accountId: string;
  amount: number;
}

export class TransactionController {
  private async syncMLTables(userId: string): Promise<void> {
    const [savingsAccount, efAccount, savingsRec, profileRec] = await Promise.all([
      prisma.account.findFirst({ where: { userId, type: 'Savings' } }),
      prisma.account.findFirst({ where: { userId, type: 'EmergencyFund' } }),
      prisma.savings.findUnique({ where: { userId } }),
      prisma.financialProfile.findUnique({ where: { userId } }),
    ]);
    const currentSavings = savingsAccount?.currentBalance ?? 0;
    const emergencyFund = efAccount?.currentBalance ?? 0;
    if (savingsRec?.currentSavings !== currentSavings) {
      await prisma.savings.upsert({
        where: { userId },
        update: { currentSavings },
        create: { userId, currentSavings },
      });
    }
    if (profileRec?.emergencyFund !== emergencyFund) {
      await prisma.financialProfile.upsert({
        where: { userId },
        update: { emergencyFund },
        create: { userId, emergencyFund, emergencyUsageLimit: 50, currency: 'USD' },
      });
    }
  }

  private async applyAllocations(userId: string, allocations: Allocation[], transactionType: string): Promise<void> {
    for (const a of allocations) {
      const acc = await prisma.account.findFirst({ where: { id: a.accountId, userId } });
      if (!acc) throw new Error(`Account ${a.accountId} not found`);
      const balanceChange = transactionType === 'INCOME' ? a.amount : -a.amount;
      await prisma.account.update({
        where: { id: a.accountId },
        data: { currentBalance: { increment: balanceChange } },
      });
    }
  }

  async list(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { type, nature, startDate, endDate, categoryId, accountId, month, goalId, recurring } = req.query;
    const where: any = { userId };
    if (type) where.transactionType = type;
    if (nature) where.transactionNature = nature;
    if (categoryId) where.categoryId = categoryId;
    if (accountId) where.accountId = accountId;
    if (goalId) where.goalId = goalId;
    if (recurring === 'true') where.recurringFrequency = { not: null };
    if (month) {
      const d = new Date(month as string);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }
    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true, account: true, goal: { include: { task: true } } },
      orderBy: { date: 'desc' },
      take: 200,
    });
    const result = transactions.map(tx => ({
      ...tx,
      splits: tx.splits ? JSON.parse(tx.splits) : null,
    }));
    res.json(result);
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { amount, transactionType, transactionNature, date, description, categoryId, accountId, goalId, taskId, recurringFrequency, recurringNextDate, allocations } = req.body;
    if (amount === undefined || amount < 0) { res.status(400).json({ error: 'amount must be >= 0' }); return; }
    if (!transactionType || !ALLOWED_TYPES.includes(transactionType)) { res.status(400).json({ error: `transactionType must be one of ${ALLOWED_TYPES}` }); return; }
    if (transactionNature && !ALLOWED_NATURES.includes(transactionNature)) { res.status(400).json({ error: `transactionNature must be one of ${ALLOWED_NATURES}` }); return; }
    if (recurringFrequency && !ALLOWED_RECURRING.includes(recurringFrequency)) { res.status(400).json({ error: `recurringFrequency must be one of ${ALLOWED_RECURRING}` }); return; }
    if (categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!cat) { res.status(400).json({ error: 'Category not found' }); return; }
    }
    const useAllocations = allocations && Array.isArray(allocations) && allocations.length > 0;
    if (useAllocations) {
      const allocSum = allocations.reduce((s: number, a: Allocation) => s + a.amount, 0);
      if (Math.abs(allocSum - amount) > 0.01) { res.status(400).json({ error: 'Sum of allocations must equal amount' }); return; }
      if (allocations.length > 3) { res.status(400).json({ error: 'Maximum 3 allocations allowed' }); return; }
      for (const a of allocations) {
        const acc = await prisma.account.findFirst({ where: { id: a.accountId, userId } });
        if (!acc) { res.status(400).json({ error: `Account ${a.accountId} not found` }); return; }
      }
    } else if (accountId) {
      const acc = await prisma.account.findFirst({ where: { id: accountId, userId } });
      if (!acc) { res.status(400).json({ error: 'Account not found' }); return; }
    }
    try {
      const splitsStr = useAllocations ? JSON.stringify(allocations) : null;
      const transaction = await prisma.transaction.create({
        data: {
          userId, amount, transactionType, transactionNature: transactionNature || 'VARIABLE',
          date: date ? new Date(date) : new Date(), description,
          categoryId: categoryId || null, accountId: useAllocations ? null : (accountId || null),
          goalId: goalId || null, taskId: taskId || null,
          splits: splitsStr,
          recurringFrequency: recurringFrequency || null,
          recurringNextDate: recurringNextDate ? new Date(recurringNextDate) : null,
        },
        include: { category: true, account: true },
      });
      if (useAllocations) {
        await this.applyAllocations(userId, allocations, transactionType);
      } else if (accountId) {
        const balanceChange = transactionType === 'INCOME' ? amount : -amount;
        await prisma.account.update({
          where: { id: accountId },
          data: { currentBalance: { increment: balanceChange } },
        });
      }
      await this.syncMLTables(userId);
      const result = { ...transaction, splits: splitsStr ? JSON.parse(splitsStr) : null };
      res.status(201).json(result);
    } catch (error) {
      logger.error('Failed to create transaction', { error });
      res.status(500).json({ error: 'Failed to create transaction' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    const { amount, transactionType, transactionNature, date, description, categoryId, accountId, goalId, taskId, recurringFrequency, recurringNextDate, allocations } = req.body;
    if (amount !== undefined && amount < 0) { res.status(400).json({ error: 'amount must be >= 0' }); return; }
    if (transactionType && !ALLOWED_TYPES.includes(transactionType)) { res.status(400).json({ error: `transactionType must be one of ${ALLOWED_TYPES}` }); return; }
    if (transactionNature && !ALLOWED_NATURES.includes(transactionNature)) { res.status(400).json({ error: `transactionNature must be one of ${ALLOWED_NATURES}` }); return; }
    if (recurringFrequency && !ALLOWED_RECURRING.includes(recurringFrequency)) { res.status(400).json({ error: `recurringFrequency must be one of ${ALLOWED_RECURRING}` }); return; }
    try {
      const existing = await prisma.transaction.findFirst({ where: { id, userId } });
      if (!existing) { res.status(404).json({ error: 'Transaction not found' }); return; }

      const useAllocations = allocations && Array.isArray(allocations) && allocations.length > 0;
      if (useAllocations) {
        const finalAmount = amount ?? existing.amount;
        const allocSum = allocations.reduce((s: number, a: Allocation) => s + a.amount, 0);
        if (Math.abs(allocSum - finalAmount) > 0.01) { res.status(400).json({ error: 'Sum of allocations must equal amount' }); return; }
        if (allocations.length > 3) { res.status(400).json({ error: 'Maximum 3 allocations allowed' }); return; }
      }

      const finalAccountId = useAllocations ? null : (accountId !== undefined ? accountId : existing.accountId);
      const splitsStr = useAllocations ? JSON.stringify(allocations) : (accountId !== undefined ? null : existing.splits);

      const data: any = {};
      if (amount !== undefined) data.amount = amount;
      if (transactionType) data.transactionType = transactionType;
      if (transactionNature) data.transactionNature = transactionNature;
      if (date) data.date = new Date(date);
      if (description !== undefined) data.description = description;
      if (categoryId !== undefined) data.categoryId = categoryId || null;
      if (accountId !== undefined || useAllocations) data.accountId = finalAccountId;
      if (goalId !== undefined) data.goalId = goalId || null;
      if (taskId !== undefined) data.taskId = taskId || null;
      if (splitsStr !== undefined) data.splits = splitsStr;
      if (recurringFrequency !== undefined) data.recurringFrequency = recurringFrequency || null;
      if (recurringNextDate !== undefined) data.recurringNextDate = recurringNextDate ? new Date(recurringNextDate) : null;

      if (existing.splits) {
        const oldAllocs: Allocation[] = JSON.parse(existing.splits);
        for (const a of oldAllocs) {
          const reversal = existing.transactionType === 'INCOME' ? -a.amount : a.amount;
          await prisma.account.update({ where: { id: a.accountId }, data: { currentBalance: { increment: reversal } } });
        }
      } else if (existing.accountId) {
        const reversal = existing.transactionType === 'INCOME' ? -existing.amount : existing.amount;
        await prisma.account.update({ where: { id: existing.accountId }, data: { currentBalance: { increment: reversal } } });
      }

      await prisma.transaction.update({ where: { id }, data });

      if (useAllocations) {
        await this.applyAllocations(userId, allocations, transactionType || existing.transactionType);
      } else if (finalAccountId) {
        const finalType = transactionType || existing.transactionType;
        const finalAmt = amount ?? existing.amount;
        const balanceChange = finalType === 'INCOME' ? finalAmt : -finalAmt;
        await prisma.account.update({ where: { id: finalAccountId }, data: { currentBalance: { increment: balanceChange } } });
      }

      await this.syncMLTables(userId);
      const updated = await prisma.transaction.findUnique({
        where: { id },
        include: { category: true, account: true, goal: { include: { task: true } } },
      });
      res.json({ ...updated, splits: updated?.splits ? JSON.parse(updated.splits) : null });
    } catch (error) {
      logger.error('Failed to update transaction', { error });
      res.status(500).json({ error: 'Failed to update transaction' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    try {
      const existing = await prisma.transaction.findFirst({ where: { id, userId } });
      if (!existing) { res.status(404).json({ error: 'Transaction not found' }); return; }

      if (existing.splits) {
        const allocs: Allocation[] = JSON.parse(existing.splits);
        for (const a of allocs) {
          const reversal = existing.transactionType === 'INCOME' ? -a.amount : a.amount;
          await prisma.account.update({ where: { id: a.accountId }, data: { currentBalance: { increment: reversal } } });
        }
      } else if (existing.accountId) {
        const reversal = existing.transactionType === 'INCOME' ? -existing.amount : existing.amount;
        await prisma.account.update({ where: { id: existing.accountId }, data: { currentBalance: { increment: reversal } } });
      }
      await prisma.transaction.delete({ where: { id } });
      await this.syncMLTables(userId);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete transaction', { error });
      res.status(500).json({ error: 'Failed to delete transaction' });
    }
  }

  async monthlySummary(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { month } = req.query;
    const d = month ? new Date(month as string) : new Date();
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    try {
      const [incomeAgg, expenseAgg] = await Promise.all([
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { userId, transactionType: 'INCOME', date: { gte: startOfMonth, lte: endOfMonth } },
        }),
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { userId, transactionType: 'EXPENSE', date: { gte: startOfMonth, lte: endOfMonth } },
        }),
      ]);
      const totalIncome = incomeAgg._sum.amount ?? 0;
      const totalExpense = expenseAgg._sum.amount ?? 0;
      res.json({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, totalIncome, totalExpense, balance: totalIncome - totalExpense });
    } catch (error) {
      logger.error('Failed to get monthly summary', { error });
      res.status(500).json({ error: 'Failed to get monthly summary' });
    }
  }

  async processRecurring(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    try {
      const now = new Date();
      const due = await prisma.transaction.findMany({
        where: { userId, recurringFrequency: { not: null }, recurringNextDate: { lte: now } },
      });
      for (const tx of due) {
        await prisma.transaction.create({
          data: {
            userId, amount: tx.amount, transactionType: tx.transactionType,
            transactionNature: tx.transactionNature,
            description: `[Recurring] ${tx.description || ''}`,
            categoryId: tx.categoryId, accountId: tx.accountId,
            date: now,
          },
        });
        const nextDate = new Date(now);
        switch (tx.recurringFrequency) {
          case 'Weekly': nextDate.setDate(nextDate.getDate() + 7); break;
          case 'Monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
          case 'Quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
          case 'Yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
        }
        await prisma.transaction.update({ where: { id: tx.id }, data: { recurringNextDate: nextDate } });
      }
      res.json({ processed: due.length });
    } catch (error) {
      logger.error('Failed to process recurring transactions', { error });
      res.status(500).json({ error: 'Failed to process recurring' });
    }
  }
}

export const transactionController = new TransactionController();
