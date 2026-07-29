import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/moneyyy',
  },

  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
    timeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '5000', 10),
    retryCount: parseInt(process.env.AI_SERVICE_RETRY_COUNT || '3', 10),
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()),
  },
} as const;
