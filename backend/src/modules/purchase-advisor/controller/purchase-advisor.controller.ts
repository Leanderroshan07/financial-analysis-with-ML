import { Response } from 'express';
import { AuthRequest } from '../../auth/middleware/auth.middleware';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../../utils/logger';
import { purchaseAdvisorService } from '../service/purchase-advisor.service';
import { PurchaseRequestDto } from '../dto/purchase-request.dto';

export class PurchaseAdvisorController {
  async getAdvice(req: AuthRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }); return; }

    try {
      const dto: PurchaseRequestDto = {
        userId,
        purchasePrice: req.body.purchasePrice,
        purchaseName: req.body.purchaseName,
        currency: req.body.currency || 'USD',
        month: req.body.month,
        totalIncome: req.body.totalIncome,
        totalFixedExpense: req.body.totalFixedExpense,
        totalVariableExpense: req.body.totalVariableExpense,
        currentSavings: req.body.currentSavings,
        emergencyFund: req.body.emergencyFund,
        emergencyUsageLimit: req.body.emergencyUsageLimit,
      };

      const result = await purchaseAdvisorService.getAdvice(dto);

      const elapsed = Date.now() - startTime;
      logger.info('Purchase advisor request completed', {
        userId: dto.userId,
        success: result.success,
        timeMs: elapsed,
      });

      if (!result.success) {
        const statusCode = this.errorCodeToStatus(result.error?.code || 'UNKNOWN');
        res.status(statusCode).json(result);
        return;
      }

      res.status(StatusCodes.OK).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Purchase advisor controller error', { error: message });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred.',
        },
      });
    }
  }

  async getHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || '';
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await purchaseAdvisorService.getHistory(userId, limit, offset);

      if (!result.success) {
        res.status(StatusCodes.BAD_REQUEST).json(result);
        return;
      }

      res.status(StatusCodes.OK).json(result);
    } catch (error) {
      logger.error('History controller error', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      });
    }
  }

  private errorCodeToStatus(code: string): number {
    const map: Record<string, number> = {
      VALIDATION_ERROR: StatusCodes.BAD_REQUEST,
      INSUFFICIENT_DATA: StatusCodes.BAD_REQUEST,
      FINANCIAL_PROFILE_NOT_FOUND: StatusCodes.NOT_FOUND,
      AI_SERVICE_ERROR: StatusCodes.SERVICE_UNAVAILABLE,
    };
    return map[code] || StatusCodes.INTERNAL_SERVER_ERROR;
  }
}

export const purchaseAdvisorController = new PurchaseAdvisorController();
