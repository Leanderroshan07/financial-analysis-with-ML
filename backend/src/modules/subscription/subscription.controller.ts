import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../auth/middleware/auth.middleware';

const prisma = new PrismaClient();

function computeNextBilling(sub: { startDate: Date; lastPaidDate: Date | null; billingPeriod?: string }): Date {
  if (sub.lastPaidDate) {
    const next = new Date(sub.lastPaidDate);
    if (sub.billingPeriod === 'YEARLY') {
      next.setFullYear(next.getFullYear() + 1);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  }
  return new Date(sub.startDate);
}

function monthlyAmount(sub: { amount: number; billingPeriod?: string }): number {
  return sub.billingPeriod === 'YEARLY' ? sub.amount / 12 : sub.amount;
}

export class SubscriptionController {
  async list(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
      include: { account: { select: { id: true, name: true } } },
    });
    const now = new Date();
    const enriched = subscriptions.map(sub => {
      const isSkipped = sub.skipUntil != null && new Date(sub.skipUntil) > now;
      const nextBilling = computeNextBilling(sub);
      const monthly = monthlyAmount(sub);
      const daysToBilling = isSkipped ? 0 : Math.max(0, Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      let daysToEnd: number | null = null;
      let monthsRemaining: number | null = null;
      if (sub.endDate) {
        daysToEnd = Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const end = new Date(sub.endDate);
        monthsRemaining = Math.max(0, (end.getFullYear() - now.getFullYear()) * 12 + end.getMonth() - now.getMonth() + (end.getDate() >= now.getDate() ? 0 : -1));
      }
      return { ...sub, nextBilling, daysToBilling, daysToEnd, monthsRemaining, monthlyAmount: monthly, isDue: isSkipped ? false : nextBilling <= now, isSkipped };
    });
    res.json(enriched);
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { name, amount, startDate, billingPeriod, billingMonths, category } = req.body;
    if (!name || !amount || !startDate) {
      res.status(400).json({ error: 'name, amount, startDate are required' });
      return;
    }
    const period = billingPeriod === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
    try {
      let parentAccount = await prisma.account.findFirst({ where: { userId, name: 'Subscriptions', isSubAccount: false } });
      if (!parentAccount) {
        parentAccount = await prisma.account.create({
          data: { userId, name: 'Subscriptions', type: 'Other', initialBalance: 0, currentBalance: 0, isSubAccount: false },
        });
      }
      const subAccount = await prisma.account.create({
        data: { userId, name: `${name} (Subscription)`, type: parentAccount.type, initialBalance: 0, currentBalance: 0, parentId: parentAccount.id, isSubAccount: true },
      });
      const sd = new Date(startDate);
      let endDate: Date | null = null;
      if (billingMonths && billingMonths > 0) {
        endDate = new Date(sd);
        const totalMonths = period === 'YEARLY' ? billingMonths * 12 : billingMonths;
        endDate.setMonth(endDate.getMonth() + totalMonths);
        endDate.setDate(endDate.getDate() - 1);
      }
      const subscription = await prisma.subscription.create({
        data: { userId, name, amount, billingPeriod: period, startDate: sd, endDate, category: category || null, accountId: subAccount.id },
      });
      res.status(201).json(subscription);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create subscription' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    let { name, amount, billingPeriod, startDate, billingMonths, endDate, category, active } = req.body;
    try {
      const period = billingPeriod === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
      if (billingMonths !== undefined && startDate !== undefined) {
        const sd = new Date(startDate);
        endDate = new Date(sd);
        const totalMonths = period === 'YEARLY' ? billingMonths * 12 : billingMonths;
        endDate.setMonth(endDate.getMonth() + totalMonths);
        endDate.setDate(endDate.getDate() - 1);
      }
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (amount !== undefined) data.amount = amount;
      if (billingPeriod !== undefined) data.billingPeriod = period;
      if (startDate !== undefined) data.startDate = new Date(startDate);
      if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
      if (category !== undefined) data.category = category;
      if (active !== undefined) data.active = active;
      await prisma.subscription.updateMany({ where: { id, userId }, data });
      const updated = await prisma.subscription.findFirst({ where: { id, userId } });
      if (!updated) { res.status(404).json({ error: 'Subscription not found' }); return; }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update subscription' });
    }
  }

  async pay(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    try {
      const subscription = await prisma.subscription.findFirst({ where: { id, userId } });
      if (!subscription) { res.status(404).json({ error: 'Subscription not found' }); return; }
      if (!subscription.active) { res.status(400).json({ error: 'Subscription is inactive' }); return; }
      if (!subscription.accountId) { res.status(400).json({ error: 'No linked account' }); return; }

      const now = new Date();
      let active: boolean = true;
      if (subscription.endDate) {
        const nextBilling = new Date(now);
        if (subscription.billingPeriod === 'YEARLY') {
          nextBilling.setFullYear(nextBilling.getFullYear() + 1);
        } else {
          nextBilling.setMonth(nextBilling.getMonth() + 1);
        }
        if (nextBilling > new Date(subscription.endDate)) {
          active = false;
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            userId,
            accountId: subscription.accountId!,
            amount: subscription.amount,
            transactionType: 'EXPENSE',
            transactionNature: 'FIXED',
            date: now,
            description: `${subscription.name} - Subscription`,
          },
        });
        await tx.subscription.update({
          where: { id },
          data: { lastPaidDate: now, active, skipUntil: null },
        });
        await tx.account.update({
          where: { id: subscription.accountId! },
          data: { currentBalance: { decrement: subscription.amount } },
        });
      });

      const updated = await prisma.subscription.findFirst({
        where: { id, userId },
        include: { account: { select: { id: true, name: true } } },
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to process payment' });
    }
  }

  async skip(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    try {
      const sub = await prisma.subscription.findFirst({ where: { id, userId } });
      if (!sub) { res.status(404).json({ error: 'Subscription not found' }); return; }
      if (!sub.active) { res.status(400).json({ error: 'Subscription is inactive' }); return; }

      const skipUntil = new Date();
      if (sub.billingPeriod === 'YEARLY') {
        skipUntil.setFullYear(skipUntil.getFullYear() + 1);
      } else {
        skipUntil.setMonth(skipUntil.getMonth() + 1);
      }

      await prisma.subscription.update({
        where: { id },
        data: { skipUntil, lastPaidDate: new Date() },
      });

      const updated = await prisma.subscription.findFirst({
        where: { id, userId },
        include: { account: { select: { id: true, name: true } } },
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to skip subscription' });
    }
  }

  async unskip(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    try {
      const sub = await prisma.subscription.findFirst({ where: { id, userId } });
      if (!sub) { res.status(404).json({ error: 'Subscription not found' }); return; }

      await prisma.subscription.update({
        where: { id },
        data: { skipUntil: null },
      });

      const updated = await prisma.subscription.findFirst({
        where: { id, userId },
        include: { account: { select: { id: true, name: true } } },
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to unskip subscription' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    try {
      const sub = await prisma.subscription.findFirst({ where: { id: req.params.id, userId } });
      if (!sub) { res.status(404).json({ error: 'Subscription not found' }); return; }

      let deletedTransactions = 0;

      await prisma.$transaction(async (tx) => {
        if (sub.accountId) {
          const txResult = await tx.transaction.deleteMany({ where: { accountId: sub.accountId, userId } });
          deletedTransactions = txResult.count;

          const subAccount = await tx.account.findFirst({ where: { id: sub.accountId, userId } });
          if (subAccount?.parentId) {
            await tx.account.delete({ where: { id: sub.accountId } });
            const remainingSubs = await tx.account.count({ where: { parentId: subAccount.parentId, userId } });
            const parentTxCount = await tx.transaction.count({ where: { accountId: subAccount.parentId, userId } });
            if (remainingSubs === 0 && parentTxCount === 0) {
              await tx.account.delete({ where: { id: subAccount.parentId } });
            }
          }
        }

        await tx.subscription.delete({ where: { id: sub.id } });
      });

      res.json({ deletedTransactions, message: deletedTransactions > 0 ? `Deleted and removed ${deletedTransactions} payment record(s)` : 'Deleted' });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to delete subscription' });
    }
  }

  async getSummary(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const subs = await prisma.subscription.findMany({ where: { userId, active: true } });
    const now = new Date();
    const unskippedSubs = subs.filter(s => !(s.skipUntil && new Date(s.skipUntil) > now));
    const totalMonthly = unskippedSubs.reduce((sum, s) => sum + monthlyAmount(s), 0);
    const dueSoon = unskippedSubs.filter(s => {
      const nextBilling = computeNextBilling(s);
      const days = Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days <= 7 && days >= 0;
    }).length;
    res.json({ totalMonthly, activeCount: subs.length, dueSoon });
  }
}

export const subscriptionController = new SubscriptionController();
