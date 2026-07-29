import api from './api'
import type { ApiResponse, PurchaseAdvice, HistoryRecord } from '../types'

export interface PurchaseAdviceOptions {
  totalIncome?: number
  totalFixedExpense?: number
  totalVariableExpense?: number
  currentSavings?: number
  emergencyFund?: number
  emergencyUsageLimit?: number
}

export async function getPurchaseAdvice(
  purchasePrice: number,
  currency = 'USD',
  overrides?: PurchaseAdviceOptions & { month?: string }
): Promise<ApiResponse<PurchaseAdvice>> {
  const body: Record<string, any> = { purchasePrice, currency }
  if (overrides?.month) body.month = overrides.month
  if (overrides) {
    if (overrides.totalIncome !== undefined) body.totalIncome = overrides.totalIncome
    if (overrides.totalFixedExpense !== undefined) body.totalFixedExpense = overrides.totalFixedExpense
    if (overrides.totalVariableExpense !== undefined) body.totalVariableExpense = overrides.totalVariableExpense
    if (overrides.currentSavings !== undefined) body.currentSavings = overrides.currentSavings
    if (overrides.emergencyFund !== undefined) body.emergencyFund = overrides.emergencyFund
    if (overrides.emergencyUsageLimit !== undefined) body.emergencyUsageLimit = overrides.emergencyUsageLimit
  }
  const { data } = await api.post<ApiResponse<PurchaseAdvice>>(
    '/api/v1/purchase-advisor/advice',
    body
  )
  return data
}

export async function getHistory(
  limit = 20,
  offset = 0
): Promise<ApiResponse<HistoryRecord[]>> {
  const { data } = await api.get<ApiResponse<HistoryRecord[]>>(
    `/api/v1/purchase-advisor/history`,
    { params: { limit, offset } }
  )
  return data
}
