import { Router } from 'express';
import { authController } from '../controller/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.get('/profile', authenticate, (req, res) => authController.profile(req, res));

export default router;
