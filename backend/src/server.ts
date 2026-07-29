import app from './app';
import { env } from './config/environment';
import { logger } from './utils/logger';

async function start() {
  logger.info('Starting Moneyyy Backend...', {
    environment: env.nodeEnv,
    port: env.port,
    aiServiceUrl: env.aiService.url,
  });

  app.listen(env.port, () => {
    logger.info(`Server running on port ${env.port}`);
    logger.info(`AI Service URL: ${env.aiService.url}`);
    logger.info(`Environment: ${env.nodeEnv}`);
  });
}

start().catch((error) => {
  logger.error('Failed to start server', { error: error.message });
  process.exit(1);
});
