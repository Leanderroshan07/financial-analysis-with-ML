import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/environment';
import { logger } from '../../../utils/logger';
import { RegisterDto, LoginDto, AuthResponse } from '../dto/auth.dto';

const prisma = new PrismaClient();

export class AuthService {
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new Error('EMAIL_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
      },
    });

    await prisma.financialProfile.create({
      data: { userId: user.id, emergencyFund: 0, emergencyUsageLimit: 50, currency: 'USD' },
    });

    await prisma.savings.create({
      data: { userId: user.id, currentSavings: 0 },
    });

    const token = this.generateToken(user.id, user.email);

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const token = this.generateToken(user.id, user.email);

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) throw new Error('USER_NOT_FOUND');
    return user;
  }

  private generateToken(userId: string, email: string): string {
    return jwt.sign({ id: userId, email }, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    } as jwt.SignOptions);
  }
}

export const authService = new AuthService();
