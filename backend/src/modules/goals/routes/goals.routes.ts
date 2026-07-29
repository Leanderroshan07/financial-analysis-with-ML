import { Router } from 'express';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { goalsController } from '../controller/goals.controller';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => goalsController.list(req, res));
router.put('/:id', (req, res) => goalsController.update(req, res));
router.delete('/:id', (req, res) => goalsController.delete(req, res));
router.post('/:id/add-money', (req, res) => goalsController.addMoney(req, res));
router.post('/:id/spend', (req, res) => goalsController.spend(req, res));

export default router;
