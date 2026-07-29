import { Response } from 'express';
import { AuthRequest } from '../../auth/middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../../utils/logger';
import { aiFeatureBuilder } from '../services/feature-builder.service';

const prisma = new PrismaClient();

const ALLOWED_EMERGENCY_LIMITS = [30, 40, 50, 60, 70];

export class FinancialProfileController {
  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    try {
      let profile = await prisma.financialProfile.findUnique({ where: { userId } });
      if (!profile) {
        profile = await prisma.financialProfile.create({
          data: { userId, emergencyFund: 0, emergencyUsageLimit: 50, currency: 'USD' },
        });
      }
      res.json(profile);
    } catch (error) {
      logger.error('Failed to get financial profile', { error });
      res.status(500).json({ error: 'Failed to get financial profile' });
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { emergencyFund, emergencyUsageLimit, currency } = req.body;
    if (emergencyUsageLimit && !ALLOWED_EMERGENCY_LIMITS.includes(emergencyUsageLimit)) {
      res.status(400).json({ error: `emergencyUsageLimit must be one of ${ALLOWED_EMERGENCY_LIMITS}` });
      return;
    }
    if (emergencyFund !== undefined && (typeof emergencyFund !== 'number' || emergencyFund < 0)) {
      res.status(400).json({ error: 'emergencyFund must be >= 0' });
      return;
    }
    try {
      const profile = await prisma.financialProfile.upsert({
        where: { userId },
        update: { ...(emergencyFund !== undefined && { emergencyFund }), ...(emergencyUsageLimit && { emergencyUsageLimit }), ...(currency && { currency }) },
        create: { userId, emergencyFund: emergencyFund ?? 0, emergencyUsageLimit: emergencyUsageLimit ?? 50, currency: currency ?? 'USD' },
      });
      res.json(profile);
    } catch (error) {
      logger.error('Failed to update financial profile', { error });
      res.status(500).json({ error: 'Failed to update financial profile' });
    }
  }

  async getSummary(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    try {
      const monthStr = req.query.month as string | undefined;
      let year: number | undefined;
      let month: number | undefined;
      if (monthStr) {
        const parts = monthStr.split('-');
        year = parseInt(parts[0]);
        month = parseInt(parts[1]);
      }
      const features = await aiFeatureBuilder.buildFeatures(userId, 0, year, month);
      res.json({
        totalIncome: features.total_income,
        totalFixedExpense: features.total_fixed_expense,
        totalVariableExpense: features.total_variable_expense,
        currentSavings: features.current_savings,
        emergencyFund: features.emergency_fund,
        emergencyUsageLimit: features.emergency_usage_limit,
      });
    } catch (error) {
      logger.error('Failed to get financial summary', { error });
      res.status(500).json({ error: 'Failed to get financial summary' });
    }
  }
}

export const financialProfileController = new FinancialProfileController();
