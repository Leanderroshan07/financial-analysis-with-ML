import { Router } from 'express';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { financialProfileController } from '../controller/financial-profile.controller';
import { incomeController } from '../controller/income.controller';
import { categoryController } from '../controller/expense-category.controller';
import { transactionController } from '../controller/transaction.controller';
import { savingsController } from '../controller/savings.controller';

const router = Router();

router.use(authenticate);

router.get('/profile', (req, res) => financialProfileController.getProfile(req, res));
router.put('/profile', (req, res) => financialProfileController.updateProfile(req, res));
router.get('/summary', (req, res) => financialProfileController.getSummary(req, res));

router.get('/incomes', (req, res) => incomeController.list(req, res));
router.post('/incomes', (req, res) => incomeController.create(req, res));
router.put('/incomes/:id', (req, res) => incomeController.update(req, res));
router.delete('/incomes/:id', (req, res) => incomeController.delete(req, res));

router.get('/categories', (req, res) => categoryController.list(req, res));
router.post('/categories', (req, res) => categoryController.create(req, res));
router.put('/categories/:id', (req, res) => categoryController.update(req, res));
router.delete('/categories/:id', (req, res) => categoryController.delete(req, res));

router.get('/transactions', (req, res) => transactionController.list(req, res));
router.post('/transactions', (req, res) => transactionController.create(req, res));
router.put('/transactions/:id', (req, res) => transactionController.update(req, res));
router.delete('/transactions/:id', (req, res) => transactionController.delete(req, res));
router.get('/transactions/monthly-summary', (req, res) => transactionController.monthlySummary(req, res));
router.post('/transactions/process-recurring', (req, res) => transactionController.processRecurring(req, res));

router.get('/savings', (req, res) => savingsController.getSavings(req, res));
router.put('/savings', (req, res) => savingsController.updateSavings(req, res));

export default router;
