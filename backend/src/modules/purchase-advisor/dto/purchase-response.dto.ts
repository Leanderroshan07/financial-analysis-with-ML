export interface FundingStrategyDto {
  savingsUsed: number;
  remainingBalanceUsed: number;
  emergencyUsed: number;
}

export interface FundingStepDto {
  source: string;
  used: number;
  remainingAfterStep: number;
  available: number;
}

export interface FundingBreakdownDto {
  totalNeeded: number;
  steps: FundingStepDto[];
  finalShortfall: number;
}

export interface ConfidenceDto {
  recommendation: number;
  pattern: number;
}

export interface PurchaseResponseDto {
  success: boolean;
  data?: {
    recommendation: string;
    pattern: string;
    confidence: ConfidenceDto;
    recommendationProbability: Record<string, number>;
    patternProbability: Record<string, number>;
    fundingStrategy: FundingStrategyDto;
    fundingBreakdown: FundingBreakdownDto;
    financialSummary: Record<string, number>;
    engineeredFeatures: Record<string, number>;
    businessExplanation: string;
    suggestions: string[];
    waitPeriodSuggestion?: string;
    processingTimeMs: number;
    modelVersion: string;
    currency: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PurchaseHistoryDto {
  id: string;
  userId: string;
  purchasePrice: number;
  recommendation: string;
  pattern: string;
  confidenceRec: number;
  confidencePat: number;
  processingTimeMs: number;
  createdAt: Date;
}

export interface FastApiAiResponse {
  status: string;
  recommendation: string;
  pattern: string;
  confidence: { recommendation: number; pattern: number };
  recommendation_probability: Record<string, number>;
  pattern_probability: Record<string, number>;
  funding_strategy: { savings_used: number; remaining_balance_used: number; emergency_used: number };
  funding_breakdown: {
    total_needed: number;
    steps: { source: string; used: number; remaining_after_step: number; available: number }[];
    final_shortfall: number;
  };
  financial_summary: Record<string, number>;
  engineered_features: Record<string, number>;
  business_explanation: string;
  suggestions: string[];
  wait_period_suggestion?: string;
  processing_time_ms: number;
  model_version: string;
}
