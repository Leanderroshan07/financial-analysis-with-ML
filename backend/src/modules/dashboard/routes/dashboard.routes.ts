import { Router } from 'express';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { dashboardController } from '../controller/dashboard.controller';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => dashboardController.getDashboard(req, res));

export default router;
