import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../auth/middleware/auth.middleware';

const prisma = new PrismaClient();
const ALLOWED_ACCOUNT_TYPES = ['Cash', 'Bank', 'Card', 'Wallet', 'Other', 'Savings', 'EmergencyFund'];
const SYSTEM_ACCOUNT_TYPES = ['Savings', 'EmergencyFund'];
const SYSTEM_ACCOUNT_NAMES: Record<string, string> = { Savings: 'Savings', EmergencyFund: 'Emergency Fund' };

export class AccountsController {
  private async ensureSystemAccounts(userId: string): Promise<void> {
    for (const type of SYSTEM_ACCOUNT_TYPES) {
      const existing = await prisma.account.findFirst({ where: { userId, type } });
      if (!existing) {
        await prisma.account.create({
          data: { userId, name: SYSTEM_ACCOUNT_NAMES[type], type, currentBalance: 0, initialBalance: 0 },
        });
      }
    }
  }

  async list(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    await this.ensureSystemAccounts(userId);
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: [{ isSubAccount: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { transactions: true, subAccounts: true } },
        subAccounts: {
          orderBy: { createdAt: 'asc' },
          include: { _count: { select: { transactions: true } } },
        },
      },
    });
    res.json(accounts);
  }

  async getBalance(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    const account = await prisma.account.findFirst({
      where: { id, userId },
      include: { subAccounts: true },
    });
    if (!account) { res.status(404).json({ error: 'Account not found' }); return; }
    const subBalance = account.subAccounts.reduce((sum, sa) => sum + sa.currentBalance, 0);
    res.json({
      id: account.id,
      name: account.name,
      ownBalance: account.currentBalance,
      subAccountsBalance: subBalance,
      totalBalance: account.currentBalance + subBalance,
    });
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { name, type, initialBalance, spendingThreshold, parentId } = req.body;
    if (!name) { res.status(400).json({ error: 'name is required' }); return; }
    if (type && !ALLOWED_ACCOUNT_TYPES.includes(type)) { res.status(400).json({ error: `type must be one of ${ALLOWED_ACCOUNT_TYPES}` }); return; }
    if (parentId) {
      const parent = await prisma.account.findFirst({ where: { id: parentId, userId } });
      if (!parent) { res.status(404).json({ error: 'Parent account not found' }); return; }
    }
    const balance = initialBalance ?? 0;
    try {
      const account = await prisma.account.create({
        data: {
          userId, name, type: type || 'Cash',
          initialBalance: balance, currentBalance: balance,
          spendingThreshold: spendingThreshold ?? null,
          parentId: parentId || null,
          isSubAccount: !!parentId,
        },
      });
      res.status(201).json(account);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create account' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    const { name, type, spendingThreshold, currentBalance } = req.body;
    if (type && !ALLOWED_ACCOUNT_TYPES.includes(type)) { res.status(400).json({ error: `type must be one of ${ALLOWED_ACCOUNT_TYPES}` }); return; }
    try {
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (type !== undefined) data.type = type;
      if (spendingThreshold !== undefined) data.spendingThreshold = spendingThreshold;
      if (currentBalance !== undefined) data.currentBalance = currentBalance;
      const result = await prisma.account.updateMany({ where: { id, userId }, data });
      if (result.count === 0) { res.status(404).json({ error: 'Account not found' }); return; }
      const updated = await prisma.account.findFirst({ where: { id, userId } });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update account' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;
    try {
      const account = await prisma.account.findFirst({ where: { id, userId }, include: { _count: { select: { subAccounts: true } } } });
      if (!account) { res.status(404).json({ error: 'Account not found' }); return; }
      if (SYSTEM_ACCOUNT_TYPES.includes(account.type)) { res.status(400).json({ error: `Cannot delete ${account.type} account` }); return; }
      if (account._count.subAccounts > 0) {
        res.status(400).json({ error: 'Cannot delete account: it has sub-accounts. Delete sub-accounts first.' });
        return;
      }
      const txCount = await prisma.transaction.count({ where: { accountId: id } });
      if (txCount > 0) {
        res.status(400).json({ error: `Cannot delete account: ${txCount} transaction(s) reference it` });
        return;
      }
      const result = await prisma.account.deleteMany({ where: { id, userId } });
      if (result.count === 0) { res.status(404).json({ error: 'Account not found' }); return; }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete account' });
    }
  }

  async transfer(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { fromAccountId, toAccountId, amount, description } = req.body;
    if (!fromAccountId || !toAccountId || amount === undefined || amount <= 0) {
      res.status(400).json({ error: 'fromAccountId, toAccountId, and amount > 0 are required' });
      return;
    }
    if (fromAccountId === toAccountId) {
      res.status(400).json({ error: 'Cannot transfer to the same account' });
      return;
    }
    try {
      const fromAccount = await prisma.account.findFirst({ where: { id: fromAccountId, userId } });
      const toAccount = await prisma.account.findFirst({ where: { id: toAccountId, userId } });
      if (!fromAccount || !toAccount) { res.status(404).json({ error: 'Account not found' }); return; }
      if (fromAccount.currentBalance < amount) { res.status(400).json({ error: 'Insufficient balance' }); return; }
      await prisma.$transaction([
        prisma.account.update({ where: { id: fromAccountId }, data: { currentBalance: { decrement: amount } } }),
        prisma.account.update({ where: { id: toAccountId }, data: { currentBalance: { increment: amount } } }),
      ]);
      const updatedFrom = await prisma.account.findUnique({ where: { id: fromAccountId } });
      const updatedTo = await prisma.account.findUnique({ where: { id: toAccountId } });
      res.json({ fromAccount: updatedFrom, toAccount: updatedTo });
    } catch (error) {
      res.status(500).json({ error: 'Failed to transfer' });
    }
  }

  async getBalanceAlert(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const accounts = await prisma.account.findMany({
      where: { userId, spendingThreshold: { not: null }, isSubAccount: false },
    });
    const alerts = accounts
      .filter(a => a.currentBalance <= a.spendingThreshold!)
      .map(a => ({ accountId: a.id, name: a.name, balance: a.currentBalance, threshold: a.spendingThreshold }));
    res.json(alerts);
  }

  async listSubAccounts(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { parentId } = req.params;
    const parent = await prisma.account.findFirst({ where: { id: parentId, userId } });
    if (!parent) { res.status(404).json({ error: 'Parent account not found' }); return; }
    const subAccounts = await prisma.account.findMany({
      where: { parentId, userId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(subAccounts);
  }
}

export const accountsController = new AccountsController();
