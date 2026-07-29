import { Router } from 'express';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { accountsController } from '../controller/accounts.controller';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => accountsController.list(req, res));
router.get('/alerts', (req, res) => accountsController.getBalanceAlert(req, res));
router.get('/:id/balance', (req, res) => accountsController.getBalance(req, res));
router.get('/:parentId/sub-accounts', (req, res) => accountsController.listSubAccounts(req, res));
router.post('/', (req, res) => accountsController.create(req, res));
router.post('/transfer', (req, res) => accountsController.transfer(req, res));
router.put('/:id', (req, res) => accountsController.update(req, res));
router.delete('/:id', (req, res) => accountsController.delete(req, res));

export default router;
