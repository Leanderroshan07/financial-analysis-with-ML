import { Router } from 'express';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { purchaseAdvisorController } from '../controller/purchase-advisor.controller';

const router = Router();

router.use(authenticate);

router.post('/advice', (req, res) => purchaseAdvisorController.getAdvice(req, res));
router.get('/history', (req, res) => purchaseAdvisorController.getHistory(req, res));

export default router;
