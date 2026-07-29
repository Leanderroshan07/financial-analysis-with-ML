import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../auth/middleware/auth.middleware';

const prisma = new PrismaClient();

export class GoalsController {
  async list(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const goals = await prisma.goal.findMany({
      where: { userId },
      include: {
        task: { include: { subtasks: { orderBy: { sortOrder: 'asc' } } } },
        category: true,
        transactions: { orderBy: { date: 'desc' }, take: 50 },
      },
    });
    const goalsWithProgress = await Promise.all(goals.map(async (goal) => {
      let progress = 0;
      if (goal.targetAmount && goal.targetAmount > 0) {
        const where: any = { userId, transactionType: 'INCOME' };
        if (goal.categoryId) where.categoryId = goal.categoryId;
        if (goal.periodStart) where.date = { ...(where.date || {}), gte: goal.periodStart };
        if (goal.periodEnd) where.date = { ...(where.date || {}), lte: goal.periodEnd };
        const incomeAgg = await prisma.transaction.aggregate({ where, _sum: { amount: true } });
        const earned = incomeAgg._sum.amount ?? 0;
        progress = Math.min(100, Math.round((earned / goal.targetAmount) * 100));
      } else if (goal.task.subtasks.length > 0) {
        const total = goal.task.subtasks.length;
        const done = goal.task.subtasks.filter(s => s.completed).length;
        progress = Math.round((done / total) * 100);
      }
      await prisma.goal.update({ where: { id: goal.id }, data: { progress } });
      return { ...goal, progress };
    }));
    res.json(goalsWithProgress);
  }

  async addMoney(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    const { amount, description } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ error: 'amount must be > 0' }); return; }
    const goal = await prisma.goal.findFirst({ where: { id, userId }, include: { task: true } });
    if (!goal) { res.status(404).json({ error: 'Goal not found' }); return; }
    const tx = await prisma.transaction.create({
      data: {
        userId, amount, transactionType: 'INCOME',
        description: description || `Add money to goal: ${goal.task.title}`,
        goalId: id, categoryId: goal.categoryId, date: new Date(),
      },
    });
    if (goal.targetAmount && goal.targetAmount > 0) {
      const where: any = { userId, transactionType: 'INCOME' };
      if (goal.categoryId) where.categoryId = goal.categoryId;
      if (goal.periodStart) where.date = { ...(where.date || {}), gte: goal.periodStart };
      if (goal.periodEnd) where.date = { ...(where.date || {}), lte: goal.periodEnd };
      const incomeAgg = await prisma.transaction.aggregate({ where, _sum: { amount: true } });
      const earned = incomeAgg._sum.amount ?? 0;
      const progress = Math.min(100, Math.round((earned / goal.targetAmount) * 100));
      await prisma.goal.update({ where: { id }, data: { progress } });
    }
    res.status(201).json(tx);
  }

  async spend(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    const { amount, description, accountId } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ error: 'amount must be > 0' }); return; }
    const goal = await prisma.goal.findFirst({ where: { id, userId }, include: { task: true } });
    if (!goal) { res.status(404).json({ error: 'Goal not found' }); return; }
    const tx = await prisma.transaction.create({
      data: {
        userId, amount, transactionType: 'EXPENSE',
        description: description || `Spend from goal: ${goal.task.title}`,
        goalId: id, categoryId: goal.categoryId, accountId: accountId || null, date: new Date(),
      },
    });
    if (goal.targetAmount && goal.targetAmount > 0) {
      const where: any = { userId, transactionType: 'EXPENSE' };
      if (goal.categoryId) where.categoryId = goal.categoryId;
      if (goal.periodStart) where.date = { ...(where.date || {}), gte: goal.periodStart };
      if (goal.periodEnd) where.date = { ...(where.date || {}), lte: goal.periodEnd };
      const expenseAgg = await prisma.transaction.aggregate({ where, _sum: { amount: true } });
      const spent = expenseAgg._sum.amount ?? 0;
      const progress = Math.min(100, Math.round((spent / goal.targetAmount) * 100));
      await prisma.goal.update({ where: { id }, data: { progress } });
    }
    res.status(201).json(tx);
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    const { targetAmount, periodStart, periodEnd, categoryId } = req.body;
    try {
      const data: any = {};
      if (targetAmount !== undefined) data.targetAmount = targetAmount;
      if (periodStart !== undefined) data.periodStart = periodStart ? new Date(periodStart) : null;
      if (periodEnd !== undefined) data.periodEnd = periodEnd ? new Date(periodEnd) : null;
      if (categoryId !== undefined) data.categoryId = categoryId || null;
      const goal = await prisma.goal.updateMany({ where: { id, userId }, data });
      if (goal.count === 0) { res.status(404).json({ error: 'Goal not found' }); return; }
      const updated = await prisma.goal.findFirst({ where: { id, userId }, include: { task: true, category: true, transactions: { take: 5, orderBy: { date: 'desc' } } } });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update goal' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    try {
      const goal = await prisma.goal.findFirst({ where: { id, userId } });
      if (!goal) { res.status(404).json({ error: 'Goal not found' }); return; }
      await prisma.goal.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete goal' });
    }
  }
}

export const goalsController = new GoalsController();
