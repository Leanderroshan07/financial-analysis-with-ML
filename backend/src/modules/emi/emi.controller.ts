import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../auth/middleware/auth.middleware';

const prisma = new PrismaClient();

function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
  if (annualRate === 0 || tenureMonths === 0) return principal / (tenureMonths || 1);
  const monthlyRate = annualRate / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return principal * monthlyRate * factor / (factor - 1);
}

function getAmortizationSchedule(principal: number, annualRate: number, tenureMonths: number, monthlyEmi: number) {
  const schedule: any[] = [];
  let balance = principal;
  const monthlyRate = annualRate > 0 ? annualRate / 12 / 100 : 0;

  for (let period = 1; period <= tenureMonths; period++) {
    const interest = balance * monthlyRate;
    const principalPaid = Math.min(monthlyEmi - interest, balance);
    balance = Math.max(0, balance - principalPaid);
    schedule.push({
      period,
      openingBalance: +(balance + principalPaid).toFixed(2),
      emi: monthlyEmi,
      interest: +interest.toFixed(2),
      principal: +principalPaid.toFixed(2),
      closingBalance: +balance.toFixed(2),
    });
  }

  return schedule;
}

function nextPaymentDate(dueDay: number | null, startDate: Date): Date {
  const now = new Date();
  const due = dueDay ?? 1;
  let next = new Date(now.getFullYear(), now.getMonth(), due);
  if (next <= now) next.setMonth(next.getMonth() + 1);
  if (next <= new Date(startDate)) next.setMonth(startDate.getMonth() + 1);
  return next;
}

export class EmiController {
  async list(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const emis = await prisma.emi.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { account: { select: { id: true, name: true } } },
    });
    const now = new Date();
    const enriched = emis.map(emi => {
      const totalMonths = this.monthDiff(new Date(emi.startDate), new Date(emi.endDate));
      const elapsedMonths = this.monthDiff(new Date(emi.startDate), now);
      const remainingMonths = Math.max(0, totalMonths - elapsedMonths);
      const daysToEnd = Math.max(0, Math.ceil((new Date(emi.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const computedRemaining = Math.max(0, emi.totalAmount - emi.monthlyEmi * elapsedMonths);
      const totalPayable = emi.monthlyEmi * totalMonths;
      const totalInterest = Math.max(0, totalPayable - emi.totalAmount);

      let isPaidThisMonth = false;
      if (emi.lastPaidDate) {
        const last = new Date(emi.lastPaidDate);
        isPaidThisMonth = last.getMonth() === now.getMonth() && last.getFullYear() === now.getFullYear();
      }

      return {
        ...emi,
        totalMonths,
        elapsedMonths: Math.min(elapsedMonths, totalMonths),
        remainingMonths,
        daysToEnd,
        computedRemaining,
        totalPayable,
        totalInterest,
        progress: emi.totalAmount > 0 ? Math.min(100, +(((emi.totalAmount - computedRemaining) / emi.totalAmount) * 100).toFixed(1)) : 0,
        isActive: now <= new Date(emi.endDate),
        isPaidThisMonth,
        nextPaymentDate: nextPaymentDate(emi.dueDay, emi.startDate),
      };
    });
    res.json(enriched);
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const emi = await prisma.emi.findFirst({ where: { id: req.params.id, userId } });
    if (!emi) { res.status(404).json({ error: 'EMI not found' }); return; }
    res.json(emi);
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { name, totalAmount, monthlyEmi, interestRate, tenureMonths, startDate, endDate, dueDay, downPayment, processingFee, prepaymentAmount, loanAccountNumber, notes, category, lender, accountId } = req.body;
    if (!name || !totalAmount || !startDate) {
      res.status(400).json({ error: 'name, totalAmount, startDate are required' });
      return;
    }

    const tenure = tenureMonths || (endDate ? this.monthDiff(new Date(startDate), new Date(endDate)) : 1);
    const rate = interestRate ?? 0;
    const computedEmi = monthlyEmi || Math.round(calculateEMI(totalAmount, rate, tenure) * 100) / 100;
    const computedEndDate = endDate ? new Date(endDate) : new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + tenure, new Date(startDate).getDate());

    try {
      let subAccountId = accountId || null;
      if (!accountId) {
        let parentAccount = await prisma.account.findFirst({ where: { userId, name: 'EMI', isSubAccount: false } });
        if (!parentAccount) {
          parentAccount = await prisma.account.create({
            data: { userId, name: 'EMI', type: 'Other', initialBalance: 0, currentBalance: 0, isSubAccount: false },
          });
        }
        const subAccount = await prisma.account.create({
          data: { userId, name: `${name} (EMI)`, type: parentAccount.type, initialBalance: 0, currentBalance: 0, parentId: parentAccount.id, isSubAccount: true },
        });
        subAccountId = subAccount.id;
      }
      const emi = await prisma.emi.create({
        data: {
          userId, name, totalAmount, monthlyEmi: computedEmi, remainingAmount: totalAmount,
          interestRate: rate, tenureMonths: tenure, startDate: new Date(startDate), endDate: computedEndDate,
          dueDay: dueDay ?? null, downPayment: downPayment ?? null, processingFee: processingFee ?? null,
          prepaymentAmount: prepaymentAmount ?? null, loanAccountNumber: loanAccountNumber ?? null,
          notes: notes ?? null, category: category ?? null, lender: lender ?? null, accountId: subAccountId,
        },
      });
      res.status(201).json(emi);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create EMI' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    const { name, totalAmount, monthlyEmi, interestRate, tenureMonths, startDate, endDate, dueDay, downPayment, processingFee, prepaymentAmount, loanAccountNumber, notes, category, lender, accountId } = req.body;
    try {
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (totalAmount !== undefined) data.totalAmount = totalAmount;
      if (monthlyEmi !== undefined) data.monthlyEmi = monthlyEmi;
      if (interestRate !== undefined) data.interestRate = interestRate;
      if (tenureMonths !== undefined) data.tenureMonths = tenureMonths;
      if (startDate !== undefined) data.startDate = new Date(startDate);
      if (endDate !== undefined) data.endDate = new Date(endDate);
      if (dueDay !== undefined) data.dueDay = dueDay;
      if (downPayment !== undefined) data.downPayment = downPayment;
      if (processingFee !== undefined) data.processingFee = processingFee;
      if (prepaymentAmount !== undefined) data.prepaymentAmount = prepaymentAmount;
      if (loanAccountNumber !== undefined) data.loanAccountNumber = loanAccountNumber;
      if (notes !== undefined) data.notes = notes;
      if (category !== undefined) data.category = category;
      if (lender !== undefined) data.lender = lender;
      if (accountId !== undefined) data.accountId = accountId;
      const result = await prisma.emi.updateMany({ where: { id, userId }, data });
      if (result.count === 0) { res.status(404).json({ error: 'EMI not found' }); return; }
      const updated = await prisma.emi.findFirst({ where: { id, userId } });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update EMI' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const result = await prisma.emi.deleteMany({ where: { id: req.params.id, userId } });
    if (result.count === 0) { res.status(404).json({ error: 'EMI not found' }); return; }
    res.status(204).send();
  }

  async pay(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    try {
      const emi = await prisma.emi.findFirst({ where: { id, userId } });
      if (!emi) { res.status(404).json({ error: 'EMI not found' }); return; }
      if (!emi.accountId) { res.status(400).json({ error: 'No account linked to this EMI' }); return; }

      await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            userId,
            accountId: emi.accountId!,
            amount: emi.monthlyEmi,
            transactionType: 'EXPENSE',
            transactionNature: 'FIXED',
            date: new Date(),
            description: `EMI: ${emi.name} - Payment`,
          },
        });
        await tx.account.update({
          where: { id: emi.accountId! },
          data: { currentBalance: { decrement: emi.monthlyEmi } },
        });
        await tx.emi.update({
          where: { id },
          data: { lastPaidDate: new Date() },
        });
      });

      const updated = await prisma.emi.findFirst({
        where: { id, userId },
        include: { account: { select: { id: true, name: true } } },
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to pay EMI' });
    }
  }

  async getAmortizationSchedule(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    try {
      const emi = await prisma.emi.findFirst({ where: { id, userId } });
      if (!emi) { res.status(404).json({ error: 'EMI not found' }); return; }
      const totalMonths = this.monthDiff(new Date(emi.startDate), new Date(emi.endDate));
      const schedule = getAmortizationSchedule(emi.totalAmount, emi.interestRate ?? 0, totalMonths, emi.monthlyEmi);
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ error: 'Failed to compute amortization schedule' });
    }
  }

  async getPaymentHistory(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    try {
      const emi = await prisma.emi.findFirst({ where: { id, userId } });
      if (!emi) { res.status(404).json({ error: 'EMI not found' }); return; }
      const transactions = await prisma.transaction.findMany({
        where: { userId, description: { contains: `EMI: ${emi.name}` } },
        orderBy: { date: 'desc' },
      });
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch payment history' });
    }
  }

  async addExtraPayment(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    const { amount } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ error: 'Valid amount is required' }); return; }
    try {
      const emi = await prisma.emi.findFirst({ where: { id, userId } });
      if (!emi) { res.status(404).json({ error: 'EMI not found' }); return; }
      if (!emi.accountId) { res.status(400).json({ error: 'No account linked' }); return; }

      await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            userId,
            accountId: emi.accountId!,
            amount,
            transactionType: 'EXPENSE',
            transactionNature: 'FIXED',
            date: new Date(),
            description: `EMI: ${emi.name} - Extra Payment`,
          },
        });
        await tx.account.update({
          where: { id: emi.accountId! },
          data: { currentBalance: { decrement: amount } },
        });
        await tx.emi.update({
          where: { id },
          data: { prepaymentAmount: (emi.prepaymentAmount ?? 0) + amount },
        });
      });

      const updated = await prisma.emi.findFirst({ where: { id, userId } });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to record extra payment' });
    }
  }

  async getSummary(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const emis = await prisma.emi.findMany({ where: { userId } });
    const now = new Date();
    const totalMonthlyEmi = emis.reduce((sum, e) => sum + e.monthlyEmi, 0);
    const totalRemaining = emis.reduce((sum, e) => {
      const elapsed = this.monthDiff(new Date(e.startDate), now);
      return sum + Math.max(0, e.totalAmount - e.monthlyEmi * elapsed);
    }, 0);
    const activeCount = emis.filter(e => new Date(e.endDate) >= now).length;
    res.json({ totalMonthlyEmi, totalRemaining, activeCount, totalCount: emis.length });
  }

  private monthDiff(d1: Date, d2: Date): number {
    return (d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth();
  }
}

export const emiController = new EmiController();
