import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../auth/middleware/auth.middleware';

const prisma = new PrismaClient();

export class DashboardController {
  async getDashboard(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const [
        incomeAgg,
        expenseAgg,
        savingsRec,
        financialProfile,
        recentTransactions,
        accounts,
        todayTasks,
        categories,
        accountAlerts,
        savingsAccount,
        efAccount,
      ] = await Promise.all([
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { userId, transactionType: 'INCOME', date: { gte: startOfMonth, lte: endOfMonth } },
        }),
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { userId, transactionType: 'EXPENSE', date: { gte: startOfMonth, lte: endOfMonth } },
        }),
        prisma.savings.findUnique({ where: { userId } }),
        prisma.financialProfile.findUnique({ where: { userId } }),
        prisma.transaction.findMany({
          where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
          include: { category: true, account: true },
          orderBy: { date: 'desc' },
        }),
        prisma.account.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
        prisma.task.findMany({
          where: { userId, completed: false },
          include: { category: true },
          orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
          take: 10,
        }),
        prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
        prisma.account.findMany({ where: { userId, spendingThreshold: { not: null } } }),
        prisma.account.findFirst({ where: { userId, type: 'Savings' } }),
        prisma.account.findFirst({ where: { userId, type: 'EmergencyFund' } }),
      ]);

      const totalIncome = incomeAgg._sum.amount ?? 0;
      const totalExpense = expenseAgg._sum.amount ?? 0;
      const balance = totalIncome - totalExpense;
      const currentSavings = savingsAccount?.currentBalance ?? savingsRec?.currentSavings ?? 0;
      const emergencyFund = efAccount?.currentBalance ?? financialProfile?.emergencyFund ?? 0;
      const emergencyUsageLimit = financialProfile?.emergencyUsageLimit ?? 50;
      const currency = financialProfile?.currency ?? 'USD';

      const alerts = accountAlerts
        .filter(a => a.currentBalance <= a.spendingThreshold!)
        .map(a => ({ accountId: a.id, name: a.name, balance: a.currentBalance, threshold: a.spendingThreshold }));

      const categoryData = categories.map(c => {
        const catTx = recentTransactions.filter(t => t.categoryId === c.id);
        return { ...c, transactionCount: catTx.length };
      });

      res.json({
        summary: { totalIncome, totalExpense, balance, currentSavings, emergencyFund, emergencyUsageLimit, currency },
        recentTransactions,
        accounts,
        todayTasks,
        categories: categoryData,
        accountAlerts: alerts,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load dashboard data' });
    }
  }
}

export const dashboardController = new DashboardController();
