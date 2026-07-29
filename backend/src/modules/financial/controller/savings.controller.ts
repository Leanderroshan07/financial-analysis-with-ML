import { Response } from 'express';
import { AuthRequest } from '../../auth/middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';

const prisma = new PrismaClient();

export class SavingsController {
  async getSavings(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    let savings = await prisma.savings.findUnique({ where: { userId } });
    if (!savings) {
      savings = await prisma.savings.create({ data: { userId, currentSavings: 0 } });
    }
    res.json(savings);
  }

  async updateSavings(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { currentSavings } = req.body;
    if (currentSavings === undefined || currentSavings < 0) {
      res.status(400).json({ error: 'currentSavings must be >= 0' });
      return;
    }
    try {
      const savings = await prisma.savings.upsert({
        where: { userId },
        update: { currentSavings },
        create: { userId, currentSavings },
      });
      res.json(savings);
    } catch (error) {
      logger.error('Failed to update savings', { error });
      res.status(500).json({ error: 'Failed to update savings' });
    }
  }
}

export const savingsController = new SavingsController();
