import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';

const prisma = new PrismaClient();

export interface AiFeaturePayload {
  total_income: number;
  total_fixed_expense: number;
  total_variable_expense: number;
  current_savings: number;
  emergency_fund: number;
  emergency_usage_limit: number;
  purchase_price: number;
  total_emi: number;
  total_subscriptions: number;
}

export class AiFeatureBuilder {
  async buildFeatures(
    userId: string,
    purchasePrice: number,
    year?: number,
    month?: number
  ): Promise<AiFeaturePayload> {
    const now = year != null && month != null ? new Date(year, month - 1, 1) : new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      incomeResult,
      fixedExpenseResult,
      variableExpenseResult,
      savingsRec,
      financialProfile,
      emis,
      subscriptions,
      savingsAccount,
      efAccount,
    ] = await Promise.all([
      this.calculateMonthlyIncome(userId, startOfMonth, endOfMonth),
      this.calculateMonthlyFixedExpenses(userId, startOfMonth, endOfMonth),
      this.calculateMonthlyVariableExpenses(userId, startOfMonth, endOfMonth),
      prisma.savings.findUnique({ where: { userId } }),
      prisma.financialProfile.findUnique({ where: { userId } }),
      prisma.emi.findMany({ where: { userId, startDate: { lte: now }, endDate: { gte: now } } }),
      prisma.subscription.findMany({ where: { userId, active: true, OR: [{ skipUntil: null }, { skipUntil: { lte: now } }] } }),
      prisma.account.findFirst({ where: { userId, type: 'Savings' } }),
      prisma.account.findFirst({ where: { userId, type: 'EmergencyFund' } }),
    ]);

    const totalEmi = emis.reduce((sum, e) => sum + e.monthlyEmi, 0);
    const totalSubscriptions = subscriptions.reduce((sum, s) => sum + (s.billingPeriod === 'YEARLY' ? s.amount / 12 : s.amount), 0);

    const totalFixedFromEmiSubs = totalEmi + totalSubscriptions;
    const currentSavings = savingsAccount?.currentBalance ?? savingsRec?.currentSavings ?? 0;
    const emergencyFund = efAccount?.currentBalance ?? financialProfile?.emergencyFund ?? 0;

    return {
      total_income: incomeResult,
      total_fixed_expense: fixedExpenseResult + totalFixedFromEmiSubs,
      total_variable_expense: variableExpenseResult,
      current_savings: currentSavings,
      emergency_fund: emergencyFund,
      emergency_usage_limit: financialProfile?.emergencyUsageLimit ?? 50,
      purchase_price: purchasePrice,
      total_emi: totalEmi,
      total_subscriptions: totalSubscriptions,
    };
  }

  private async calculateMonthlyIncome(
    userId: string,
    start: Date,
    end: Date
  ): Promise<number> {
    const incomes = await prisma.income.findMany({
      where: {
        userId,
        receivedDate: { gte: start, lte: end },
      },
    });

    let total = 0;
    for (const income of incomes) {
      switch (income.frequency) {
        case 'MONTHLY':
          total += income.amount;
          break;
        case 'WEEKLY':
          total += income.amount * 4.33;
          break;
        case 'YEARLY':
          total += income.amount / 12;
          break;
        case 'ONE_TIME':
          total += income.amount;
          break;
        default:
          total += income.amount;
      }
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        transactionType: 'INCOME',
        date: { gte: start, lte: end },
      },
    });
    for (const t of transactions) {
      total += t.amount;
    }

    return Math.max(0, total);
  }

  private async calculateMonthlyFixedExpenses(
    userId: string,
    start: Date,
    end: Date
  ): Promise<number> {
    const result = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        transactionType: 'EXPENSE',
        transactionNature: 'FIXED',
        date: { gte: start, lte: end },
      },
    });
    return result._sum.amount ?? 0;
  }

  private async calculateMonthlyVariableExpenses(
    userId: string,
    start: Date,
    end: Date
  ): Promise<number> {
    const result = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        transactionType: 'EXPENSE',
        transactionNature: 'VARIABLE',
        date: { gte: start, lte: end },
      },
    });
    return result._sum.amount ?? 0;
  }

  async healthCheck(userId: string): Promise<{
    incomeCount: number;
    transactionCount: number;
    categoryCount: number;
    hasSavings: boolean;
    hasFinancialProfile: boolean;
  }> {
    const [incomeCount, transactionCount, categoryCount, savings, profile] =
      await Promise.all([
        prisma.income.count({ where: { userId } }),
        prisma.transaction.count({ where: { userId } }),
        prisma.category.count({ where: { userId } }),
        prisma.savings.findUnique({ where: { userId } }),
        prisma.financialProfile.findUnique({ where: { userId } }),
      ]);

    return {
      incomeCount,
      transactionCount,
      categoryCount,
      hasSavings: !!savings,
      hasFinancialProfile: !!profile,
    };
  }
}

export const aiFeatureBuilder = new AiFeatureBuilder();
