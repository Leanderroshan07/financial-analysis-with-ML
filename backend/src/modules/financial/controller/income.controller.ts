import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../../utils/logger';
import { AuthRequest } from '../../auth/middleware/auth.middleware';

const prisma = new PrismaClient();
const ALLOWED_FREQUENCIES = ['MONTHLY', 'WEEKLY', 'YEARLY', 'ONE_TIME'];

export class IncomeController {
  async list(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const incomes = await prisma.income.findMany({ where: { userId }, orderBy: { receivedDate: 'desc' } });
    res.json(incomes);
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { title, amount, frequency, receivedDate, notes } = req.body;
    if (!title || amount === undefined || amount < 0) {
      res.status(400).json({ error: 'title is required and amount must be >= 0' });
      return;
    }
    if (frequency && !ALLOWED_FREQUENCIES.includes(frequency)) {
      res.status(400).json({ error: `frequency must be one of ${ALLOWED_FREQUENCIES}` });
      return;
    }
    try {
      const income = await prisma.income.create({
        data: { userId, title, amount, frequency: frequency || 'MONTHLY', receivedDate: receivedDate ? new Date(receivedDate) : new Date(), notes },
      });
      res.status(201).json(income);
    } catch (error) {
      logger.error('Failed to create income', { error });
      res.status(500).json({ error: 'Failed to create income' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    const { title, amount, frequency, receivedDate, notes } = req.body;
    if (amount !== undefined && amount < 0) { res.status(400).json({ error: 'amount must be >= 0' }); return; }
    if (frequency && !ALLOWED_FREQUENCIES.includes(frequency)) { res.status(400).json({ error: `frequency must be one of ${ALLOWED_FREQUENCIES}` }); return; }
    try {
      const income = await prisma.income.updateMany({ where: { id, userId }, data: { ...(title && { title }), ...(amount !== undefined && { amount }), ...(frequency && { frequency }), ...(receivedDate && { receivedDate: new Date(receivedDate) }), ...(notes !== undefined && { notes }) } });
      if (income.count === 0) { res.status(404).json({ error: 'Income not found' }); return; }
      const updated = await prisma.income.findFirst({ where: { id, userId } });
      res.json(updated);
    } catch (error) {
      logger.error('Failed to update income', { error });
      res.status(500).json({ error: 'Failed to update income' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    try {
      const result = await prisma.income.deleteMany({ where: { id, userId } });
      if (result.count === 0) { res.status(404).json({ error: 'Income not found' }); return; }
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete income', { error });
      res.status(500).json({ error: 'Failed to delete income' });
    }
  }
}

export const incomeController = new IncomeController();
