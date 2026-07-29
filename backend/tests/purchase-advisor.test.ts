import { validatePurchaseRequest, PurchaseRequestDto } from '../src/modules/purchase-advisor/dto/purchase-request.dto';
import { transformAiResponse, getCurrencySymbol } from '../src/modules/purchase-advisor/service/purchase-advisor.service';

describe('PurchaseRequestDto - Validation', () => {
  const validDto: PurchaseRequestDto = {
    userId: 'user-123',
    purchasePrice: 15000,
  };

  it('should pass for valid request', () => {
    const result = validatePurchaseRequest(validDto);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when userId is missing', () => {
    const result = validatePurchaseRequest({ ...validDto, userId: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('userId is required and must be a non-empty string');
  });

  it('should fail when purchasePrice is missing', () => {
    const result = validatePurchaseRequest({ ...validDto, purchasePrice: undefined as any });
    expect(result.valid).toBe(false);
  });

  it('should fail when purchasePrice is 0', () => {
    const result = validatePurchaseRequest({ ...validDto, purchasePrice: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('purchasePrice must be greater than 0');
  });

  it('should fail when purchasePrice is negative', () => {
    const result = validatePurchaseRequest({ ...validDto, purchasePrice: -100 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('purchasePrice must be greater than 0');
  });

  it('should fail when purchasePrice is NaN', () => {
    const result = validatePurchaseRequest({ ...validDto, purchasePrice: NaN });
    expect(result.valid).toBe(false);
  });

  it('should pass with valid currency', () => {
    const result = validatePurchaseRequest({ ...validDto, currency: 'INR' });
    expect(result.valid).toBe(true);
  });

  it('should fail with invalid currency', () => {
    const result = validatePurchaseRequest({ ...validDto, currency: 'XYZ' });
    expect(result.valid).toBe(false);
  });
});

describe('FastApiClient', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('should use configured AI service URL', () => {
    process.env.AI_SERVICE_URL = 'http://test:9000';
    const { env } = require('../src/config/environment');
    expect(env.aiService.url).toBe('http://test:9000');
  });

  it('should have default timeout', () => {
    const { env } = require('../src/config/environment');
    expect(env.aiService.timeout).toBe(5000);
  });

  it('should have default retry count', () => {
    const { env } = require('../src/config/environment');
    expect(env.aiService.retryCount).toBe(3);
  });
});

describe('getCurrencySymbol', () => {
  it('should return $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('should return rupee symbol for INR', () => {
    expect(getCurrencySymbol('INR')).toBe('\u20B9');
  });

  it('should return euro for EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('\u20AC');
  });

  it('should return $ for unknown currency', () => {
    expect(getCurrencySymbol('XYZ')).toBe('$');
  });

  it('should be case insensitive', () => {
    expect(getCurrencySymbol('inr')).toBe('\u20B9');
  });
});

describe('transformAiResponse', () => {
  const mockAiResponse = {
    status: 'success',
    recommendation: 'YES',
    pattern: 'P2',
    confidence: { recommendation: 98.74, pattern: 90.4 },
    recommendation_probability: { yes: 98.74, no: 1.26 },
    pattern_probability: { P1: 5.2, P2: 90.4, P3: 2.8, P4: 1.1, P5: 0.0, P6: 0.0 },
    funding_strategy: { savings_used: 0, remaining_balance_used: 15000, emergency_used: 0 },
    financial_summary: { total_income: 75000 },
    engineered_features: { purchase_ratio: 0.3 },
    business_explanation: 'Use $100 from savings.',
    suggestions: ['Proceed with purchase.'],
    processing_time_ms: 12.34,
    model_version: '2.0.0-optimized',
  };

  it('should replace $ with INR symbol when currency is INR', () => {
    const result = transformAiResponse(mockAiResponse, 'INR');
    expect(result.data?.businessExplanation).toContain('\u20B9');
    expect(result.data?.businessExplanation).not.toContain('$');
  });

  it('should keep $ when currency is USD', () => {
    const result = transformAiResponse(mockAiResponse, 'USD');
    expect(result.data?.businessExplanation).toContain('$');
  });

  it('should transform response structure correctly', () => {
    const result = transformAiResponse(mockAiResponse, 'USD');
    expect(result.success).toBe(true);
    expect(result.data?.recommendation).toBe('YES');
    expect(result.data?.pattern).toBe('P2');
    expect(result.data?.fundingStrategy.savingsUsed).toBe(0);
    expect(result.data?.fundingStrategy.remainingBalanceUsed).toBe(15000);
    expect(result.data?.currency).toBe('USD');
  });
});
