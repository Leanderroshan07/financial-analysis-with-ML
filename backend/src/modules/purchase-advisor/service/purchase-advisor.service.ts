import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';
import { fastApiClient } from '../client/fastapi.client';
import {
  PurchaseRequestDto,
  validatePurchaseRequest,
} from '../dto/purchase-request.dto';
import {
  PurchaseResponseDto,
  FastApiAiResponse,
} from '../dto/purchase-response.dto';
import { aiFeatureBuilder } from '../../financial/services/feature-builder.service';
import { PurchaseHistoryDto } from '../dto/purchase-history.dto';

const prisma = new PrismaClient();

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', INR: '\u20B9', EUR: '\u20AC', GBP: '\u00A3',
  JPY: '\u00A5', CAD: 'C$', AUD: 'A$',
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] || '$';
}

export function transformAiResponse(
  ai: FastApiAiResponse,
  currency: string
): PurchaseResponseDto {
  const currencySymbol = getCurrencySymbol(currency);
  const businessExplanation = ai.business_explanation
    ? ai.business_explanation.replace(/\$/g, currencySymbol)
    : '';

  return {
    success: true,
    data: {
      recommendation: ai.recommendation,
      pattern: ai.pattern,
      confidence: {
        recommendation: ai.confidence.recommendation,
        pattern: ai.confidence.pattern,
      },
      recommendationProbability: ai.recommendation_probability,
      patternProbability: ai.pattern_probability,
      fundingStrategy: {
        savingsUsed: ai.funding_strategy.savings_used,
        remainingBalanceUsed: ai.funding_strategy.remaining_balance_used,
        emergencyUsed: ai.funding_strategy.emergency_used,
      },
      fundingBreakdown: {
        totalNeeded: ai.funding_breakdown.total_needed,
        steps: ai.funding_breakdown.steps.map(s => ({
          source: s.source,
          used: s.used,
          remainingAfterStep: s.remaining_after_step,
          available: s.available,
        })),
        finalShortfall: ai.funding_breakdown.final_shortfall,
      },
      financialSummary: ai.financial_summary,
      engineeredFeatures: ai.engineered_features,
      businessExplanation,
      suggestions: ai.suggestions,
      waitPeriodSuggestion: ai.wait_period_suggestion
        ? ai.wait_period_suggestion.replace(/\$/g, currencySymbol)
        : undefined,
      processingTimeMs: ai.processing_time_ms,
      modelVersion: ai.model_version,
      currency,
    },
  };
}

export class PurchaseAdvisorService {
  async getAdvice(dto: PurchaseRequestDto): Promise<PurchaseResponseDto> {
    const startTime = Date.now();

    const validation = validatePurchaseRequest(dto);
    if (!validation.valid) {
      logger.warn('Validation failed', { errors: validation.errors });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: validation.errors },
      };
    }

    try {
      let year: number | undefined;
      let month: number | undefined;
      if (dto.month) {
        const parts = dto.month.split('-');
        year = parseInt(parts[0]);
        month = parseInt(parts[1]);
      }
      const aiPayload = await aiFeatureBuilder.buildFeatures(
        dto.userId,
        dto.purchasePrice,
        year,
        month
      );

      if (dto.totalIncome !== undefined) aiPayload.total_income = dto.totalIncome;
      if (dto.totalFixedExpense !== undefined) aiPayload.total_fixed_expense = dto.totalFixedExpense;
      if (dto.totalVariableExpense !== undefined) aiPayload.total_variable_expense = dto.totalVariableExpense;
      if (dto.currentSavings !== undefined) aiPayload.current_savings = dto.currentSavings;
      if (dto.emergencyFund !== undefined) aiPayload.emergency_fund = dto.emergencyFund;
      if (dto.emergencyUsageLimit !== undefined) aiPayload.emergency_usage_limit = dto.emergencyUsageLimit;

      if (aiPayload.total_income === 0) {
        return {
          success: false,
          error: {
            code: 'INSUFFICIENT_DATA',
            message: 'No income records found. Please add income sources before requesting a purchase recommendation.',
          },
        };
      }

      logger.info('Calling AI service', {
        userId: dto.userId,
        purchasePrice: dto.purchasePrice,
        totalIncome: aiPayload.total_income,
        totalFixed: aiPayload.total_fixed_expense,
        totalVariable: aiPayload.total_variable_expense,
      });

      const aiResponse: FastApiAiResponse = await fastApiClient.predict(aiPayload);
      const currency = dto.currency?.toUpperCase() || 'USD';
      const response = transformAiResponse(aiResponse, currency);

      await this.saveHistory(dto, aiResponse);

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Purchase advisor service error', { error: message });
      return {
        success: false,
        error: {
          code: 'AI_SERVICE_ERROR',
          message: 'Failed to get purchase advice. Please try again later.',
          details: message,
        },
      };
    }
  }

  private async saveHistory(
    dto: PurchaseRequestDto,
    aiResponse: FastApiAiResponse
  ): Promise<void> {
    try {
      await prisma.purchaseHistory.create({
        data: {
          userId: dto.userId,
          purchaseName: dto.purchaseName || null,
          purchasePrice: dto.purchasePrice,
          recommendation: aiResponse.recommendation,
          pattern: aiResponse.pattern,
          confidenceRec: aiResponse.confidence.recommendation,
          confidencePat: aiResponse.confidence.pattern,
        },
      });
      logger.info('Purchase history saved', {
        userId: dto.userId,
        recommendation: aiResponse.recommendation,
        pattern: aiResponse.pattern,
      });
    } catch (error) {
      logger.error('Failed to save purchase history', {
        userId: dto.userId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  async getHistory(
    userId: string,
    limit = 10,
    offset = 0
  ): Promise<PurchaseResponseDto> {
    try {
      const history = await prisma.purchaseHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return {
        success: true,
        data: history as any,
      } as any;
    } catch (error) {
      logger.error('Failed to fetch history', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return {
        success: false,
        error: { code: 'HISTORY_FETCH_ERROR', message: 'Failed to fetch purchase history.' },
      };
    }
  }
}

export const purchaseAdvisorService = new PurchaseAdvisorService();
