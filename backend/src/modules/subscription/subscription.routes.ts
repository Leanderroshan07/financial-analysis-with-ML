import { Router } from 'express';
import { authenticate } from '../auth/middleware/auth.middleware';
import { subscriptionController } from './subscription.controller';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => subscriptionController.list(req, res));
router.get('/summary', (req, res) => subscriptionController.getSummary(req, res));
router.post('/', (req, res) => subscriptionController.create(req, res));
router.put('/:id', (req, res) => subscriptionController.update(req, res));
router.post('/:id/pay', (req, res) => subscriptionController.pay(req, res));
router.post('/:id/skip', (req, res) => subscriptionController.skip(req, res));
router.post('/:id/unskip', (req, res) => subscriptionController.unskip(req, res));
router.delete('/:id', (req, res) => subscriptionController.delete(req, res));

export default router;
