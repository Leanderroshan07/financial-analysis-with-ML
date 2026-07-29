import axios, { AxiosInstance, AxiosError } from 'axios';
import { env } from '../../../config/environment';
import { logger } from '../../../utils/logger';
import { FastApiAiResponse } from '../dto/purchase-response.dto';
import { AiServicePayload } from '../dto/purchase-request.dto';

export class FastApiClient {
  private client: AxiosInstance;
  private retryCount: number;

  constructor() {
    this.retryCount = env.aiService.retryCount;
    this.client = axios.create({
      baseURL: env.aiService.url,
      timeout: env.aiService.timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  async predict(payload: AiServicePayload): Promise<FastApiAiResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        logger.info(`AI service request (attempt ${attempt}/${this.retryCount})`, {
          purchasePrice: payload.purchase_price,
        });

        const response = await this.client.post<FastApiAiResponse>(
          '/api/v1/predict',
          payload
        );

        logger.info('AI service response received', {
          recommendation: response.data.recommendation,
          pattern: response.data.pattern,
          processingTimeMs: response.data.processing_time_ms,
        });

        return response.data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof AxiosError) {
          if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED') {
            logger.warn(`AI service connection failed (attempt ${attempt})`, {
              error: error.message,
              code: error.code,
            });
            if (attempt < this.retryCount) {
              const delay = Math.min(100 * Math.pow(2, attempt), 2000);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          if (error.response?.status) {
            logger.error('AI service returned error', {
              status: error.response.status,
              data: error.response.data,
            });
            throw new Error(
              `AI service error (${error.response.status}): ${
                JSON.stringify(error.response.data) || error.message
              }`
            );
          }
        }

        if (attempt >= this.retryCount) {
          throw new Error(
            `AI service unavailable after ${this.retryCount} attempts: ${lastError.message}`
          );
        }
      }
    }

    throw new Error(`AI service unavailable: ${lastError?.message || 'unknown error'}`);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/v1/health');
      return response.data?.status === 'healthy';
    } catch {
      return false;
    }
  }
}

export const fastApiClient = new FastApiClient();
