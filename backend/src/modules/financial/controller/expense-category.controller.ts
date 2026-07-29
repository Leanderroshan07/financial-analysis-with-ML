import { Response } from 'express';
import { AuthRequest } from '../../auth/middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';

const prisma = new PrismaClient();
const ALLOWED_TYPES = ['INCOME', 'EXPENSE'];

export class CategoryController {
  async list(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { type } = req.query;
    const where: any = { userId };
    if (type) where.type = type;
    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      include: {
        subCategories: { orderBy: { name: 'asc' } },
        _count: { select: { transactions: true, subCategories: true } },
      },
    });
    res.json(categories);
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { name, type, isEssential, parentId } = req.body;
    if (!name) { res.status(400).json({ error: 'name is required' }); return; }
    if (type && !ALLOWED_TYPES.includes(type)) { res.status(400).json({ error: `type must be one of ${ALLOWED_TYPES}` }); return; }
    if (parentId) {
      const parent = await prisma.category.findFirst({ where: { id: parentId, userId } });
      if (!parent) { res.status(404).json({ error: 'Parent category not found' }); return; }
    }
    try {
      const category = await prisma.category.create({
        data: { userId, name, type: type || 'EXPENSE', isEssential: isEssential ?? false, parentId: parentId || null },
      });
      res.status(201).json(category);
    } catch (error: any) {
      if (error.code === 'P2002') { res.status(409).json({ error: 'Category with this name already exists' }); return; }
      logger.error('Failed to create category', { error });
      res.status(500).json({ error: 'Failed to create category' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    const { name, type, isEssential } = req.body;
    if (type && !ALLOWED_TYPES.includes(type)) { res.status(400).json({ error: `type must be one of ${ALLOWED_TYPES}` }); return; }
    try {
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (type !== undefined) data.type = type;
      if (isEssential !== undefined) data.isEssential = isEssential;
      const category = await prisma.category.updateMany({ where: { id, userId }, data });
      if (category.count === 0) { res.status(404).json({ error: 'Category not found' }); return; }
      const updated = await prisma.category.findFirst({ where: { id, userId } });
      res.json(updated);
    } catch (error) {
      logger.error('Failed to update category', { error });
      res.status(500).json({ error: 'Failed to update category' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    try {
      const cat = await prisma.category.findFirst({ where: { id, userId }, include: { _count: { select: { subCategories: true } } } });
      if (!cat) { res.status(404).json({ error: 'Category not found' }); return; }
      if (cat._count.subCategories > 0) {
        res.status(400).json({ error: 'Cannot delete category: it has sub-categories. Delete sub-categories first.' });
        return;
      }
      const txCount = await prisma.transaction.count({ where: { categoryId: id } });
      if (txCount > 0) {
        res.status(400).json({ error: `Cannot delete category: ${txCount} transaction(s) reference it` });
        return;
      }
      const result = await prisma.category.deleteMany({ where: { id, userId } });
      if (result.count === 0) { res.status(404).json({ error: 'Category not found' }); return; }
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete category', { error });
      res.status(500).json({ error: 'Failed to delete category' });
    }
  }
}

export const categoryController = new CategoryController();
