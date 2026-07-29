import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../auth/middleware/auth.middleware';

const prisma = new PrismaClient();
const ALLOWED_PRIORITIES = ['Low', 'Medium', 'High'];

export class TasksController {
  async list(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { completed, isGoal } = req.query;
    const where: any = { userId };
    if (completed !== undefined) where.completed = completed === 'true';
    if (isGoal !== undefined) where.isGoal = isGoal === 'true';
    const tasks = await prisma.task.findMany({
      where,
      include: { subtasks: { orderBy: { sortOrder: 'asc' } }, category: true, goal: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(tasks);
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { title, description, priority, dueDate, categoryId, isGoal, targetAmount, goalPeriodStart, goalPeriodEnd } = req.body;
    if (!title) { res.status(400).json({ error: 'title is required' }); return; }
    if (priority && !ALLOWED_PRIORITIES.includes(priority)) { res.status(400).json({ error: `priority must be one of ${ALLOWED_PRIORITIES}` }); return; }
    try {
      const task = await prisma.task.create({
        data: {
          userId, title, description, priority: priority || 'Medium',
          dueDate: dueDate ? new Date(dueDate) : null,
          categoryId: categoryId || null,
          isGoal: isGoal ?? false,
          targetAmount: targetAmount ?? null,
          goalPeriodStart: goalPeriodStart ? new Date(goalPeriodStart) : null,
          goalPeriodEnd: goalPeriodEnd ? new Date(goalPeriodEnd) : null,
        },
        include: { subtasks: true, category: true, goal: true },
      });
      if (task.isGoal) {
        await prisma.goal.create({
          data: { userId, taskId: task.id, targetAmount: targetAmount ?? null, periodStart: goalPeriodStart ? new Date(goalPeriodStart) : null, periodEnd: goalPeriodEnd ? new Date(goalPeriodEnd) : null, categoryId: categoryId || null },
        });
      }
      const updated = await prisma.task.findUnique({
        where: { id: task.id },
        include: { subtasks: { orderBy: { sortOrder: 'asc' } }, category: true, goal: true },
      });
      res.status(201).json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create task' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    const { title, description, priority, dueDate, completed, categoryId, isGoal, targetAmount, goalPeriodStart, goalPeriodEnd, sortOrder } = req.body;
    if (priority && !ALLOWED_PRIORITIES.includes(priority)) { res.status(400).json({ error: `priority must be one of ${ALLOWED_PRIORITIES}` }); return; }
    try {
      const existing = await prisma.task.findFirst({ where: { id, userId } });
      if (!existing) { res.status(404).json({ error: 'Task not found' }); return; }
      const data: any = {};
      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description;
      if (priority !== undefined) data.priority = priority;
      if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
      if (completed !== undefined) data.completed = completed;
      if (categoryId !== undefined) data.categoryId = categoryId || null;
      if (isGoal !== undefined) data.isGoal = isGoal;
      if (targetAmount !== undefined) data.targetAmount = targetAmount;
      if (goalPeriodStart !== undefined) data.goalPeriodStart = goalPeriodStart ? new Date(goalPeriodStart) : null;
      if (goalPeriodEnd !== undefined) data.goalPeriodEnd = goalPeriodEnd ? new Date(goalPeriodEnd) : null;
      if (sortOrder !== undefined) data.sortOrder = sortOrder;
      await prisma.task.update({ where: { id }, data });

      if (completed === true && !existing.completed) {
        const txAmount = existing.targetAmount || 0;
        if (txAmount > 0) {
          await prisma.transaction.create({
            data: {
              userId, amount: txAmount, transactionType: 'EXPENSE',
              description: `Task completion: ${existing.title}`,
              taskId: id, categoryId: existing.categoryId, date: new Date(),
            },
          });
        }
      }

      if (isGoal !== undefined || targetAmount !== undefined || goalPeriodStart !== undefined || goalPeriodEnd !== undefined || categoryId !== undefined) {
        const task = await prisma.task.findUnique({ where: { id } });
        if (task?.isGoal) {
          await prisma.goal.upsert({
            where: { taskId: id },
            update: {
              targetAmount: targetAmount ?? existing.targetAmount,
              periodStart: goalPeriodStart ? new Date(goalPeriodStart) : existing.goalPeriodStart,
              periodEnd: goalPeriodEnd ? new Date(goalPeriodEnd) : existing.goalPeriodEnd,
              categoryId: categoryId ?? existing.categoryId,
            },
            create: { userId, taskId: id, targetAmount: targetAmount ?? null, periodStart: goalPeriodStart ? new Date(goalPeriodStart) : null, periodEnd: goalPeriodEnd ? new Date(goalPeriodEnd) : null, categoryId: categoryId || null },
          });
        }
      }

      const updated = await prisma.task.findUnique({
        where: { id },
        include: { subtasks: { orderBy: { sortOrder: 'asc' } }, category: true, goal: true },
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update task' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    try {
      const result = await prisma.task.deleteMany({ where: { id, userId } });
      if (result.count === 0) { res.status(404).json({ error: 'Task not found' }); return; }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete task' });
    }
  }

  async toggleComplete(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    try {
      const task = await prisma.task.findFirst({ where: { id, userId } });
      if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
      const updated = await prisma.task.update({
        where: { id },
        data: { completed: !task.completed },
        include: { subtasks: { orderBy: { sortOrder: 'asc' } }, category: true, goal: true },
      });
      if (updated.completed && !task.completed && (task.targetAmount ?? 0) > 0) {
        await prisma.transaction.create({
          data: {
            userId, amount: task.targetAmount!, transactionType: 'EXPENSE',
            description: `Task completion: ${task.title}`,
            taskId: id, categoryId: task.categoryId, date: new Date(),
          },
        });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to toggle task' });
    }
  }

  async listSubtasks(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    const task = await prisma.task.findFirst({ where: { id, userId } });
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
    const subtasks = await prisma.subtask.findMany({ where: { taskId: id }, orderBy: { sortOrder: 'asc' } });
    res.json(subtasks);
  }

  async createSubtask(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    const { title } = req.body;
    if (!title) { res.status(400).json({ error: 'title is required' }); return; }
    const task = await prisma.task.findFirst({ where: { id, userId } });
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
    const maxSort = await prisma.subtask.aggregate({ where: { taskId: id }, _max: { sortOrder: true } });
    const subtask = await prisma.subtask.create({ data: { taskId: id, title, sortOrder: (maxSort._max.sortOrder ?? -1) + 1 } });
    res.status(201).json(subtask);
  }

  async updateSubtask(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id, subtaskId } = req.params;
    const { title, completed, sortOrder } = req.body;
    const task = await prisma.task.findFirst({ where: { id, userId } });
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (completed !== undefined) data.completed = completed;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    const subtask = await prisma.subtask.update({ where: { id: subtaskId }, data });
    res.json(subtask);
  }

  async deleteSubtask(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id, subtaskId } = req.params;
    const task = await prisma.task.findFirst({ where: { id, userId } });
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
    await prisma.subtask.delete({ where: { id: subtaskId } });
    res.status(204).send();
  }
}

export const tasksController = new TasksController();
