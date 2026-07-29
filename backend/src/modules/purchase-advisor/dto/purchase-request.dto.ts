export interface PurchaseRequestDto {
  userId: string;
  purchasePrice: number;
  purchaseName?: string;
  currency?: string;
  month?: string;
  totalIncome?: number;
  totalFixedExpense?: number;
  totalVariableExpense?: number;
  currentSavings?: number;
  emergencyFund?: number;
  emergencyUsageLimit?: number;
}

export interface PurchaseRequestValidation {
  valid: boolean;
  errors: string[];
}

export function validatePurchaseRequest(dto: PurchaseRequestDto): PurchaseRequestValidation {
  const errors: string[] = [];

  if (!dto.userId || typeof dto.userId !== 'string' || dto.userId.trim() === '') {
    errors.push('userId is required and must be a non-empty string');
  }

  if (dto.purchasePrice == null || typeof dto.purchasePrice !== 'number') {
    errors.push('purchasePrice is required and must be a number');
  } else if (dto.purchasePrice <= 0) {
    errors.push('purchasePrice must be greater than 0');
  } else if (!Number.isFinite(dto.purchasePrice)) {
    errors.push('purchasePrice must be a finite number');
  }

  if (dto.currency && !['USD', 'INR', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'].includes(dto.currency.toUpperCase())) {
    errors.push(`currency must be one of: USD, INR, EUR, GBP, JPY, CAD, AUD`);
  }

  return { valid: errors.length === 0, errors };
}

export interface AiServicePayload {
  total_income: number;
  total_fixed_expense: number;
  total_variable_expense: number;
  current_savings: number;
  emergency_fund: number;
  emergency_usage_limit: number;
  purchase_price: number;
}
