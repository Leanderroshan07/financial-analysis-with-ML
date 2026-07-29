import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../../utils/logger';
import { authService } from '../service/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class AuthController {
  async register(req: AuthRequest, res: Response): Promise<void> {
    const { name, email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    try {
      const result = await authService.register({ name, email, password });
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message === 'EMAIL_EXISTS') {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }
      logger.error('Register error', { error });
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  async login(req: AuthRequest, res: Response): Promise<void> {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }
    try {
      const result = await authService.login({ email, password });
      res.json(result);
    } catch (error: any) {
      if (error.message === 'INVALID_CREDENTIALS') {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      logger.error('Login error', { error });
      res.status(500).json({ error: 'Login failed' });
    }
  }

  async profile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await authService.getProfile(req.user!.id);
      res.json(user);
    } catch (error) {
      logger.error('Profile error', { error });
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }
}

export const authController = new AuthController();
