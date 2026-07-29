import { Router } from 'express';
import { authenticate } from '../auth/middleware/auth.middleware';
import { emiController } from './emi.controller';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => emiController.list(req, res));
router.get('/summary', (req, res) => emiController.getSummary(req, res));
router.get('/:id', (req, res) => emiController.getById(req, res));
router.get('/:id/amortization-schedule', (req, res) => emiController.getAmortizationSchedule(req, res));
router.get('/:id/payment-history', (req, res) => emiController.getPaymentHistory(req, res));
router.post('/', (req, res) => emiController.create(req, res));
router.put('/:id', (req, res) => emiController.update(req, res));
router.post('/:id/pay', (req, res) => emiController.pay(req, res));
router.post('/:id/extra-payment', (req, res) => emiController.addExtraPayment(req, res));
router.delete('/:id', (req, res) => emiController.delete(req, res));

export default router;
