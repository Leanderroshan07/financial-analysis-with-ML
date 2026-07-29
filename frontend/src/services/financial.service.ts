import api from './api'
import type { FinancialSummary, FinancialProfile } from '../types'

export async function getFinancialSummary(month?: string): Promise<FinancialSummary> {
  const params = month ? { month } : undefined
  const { data } = await api.get<FinancialSummary>('/api/v1/financial/summary', { params })
  return data
}

export async function getFinancialProfile(): Promise<FinancialProfile> {
  const { data } = await api.get<FinancialProfile>('/api/v1/financial/profile')
  return data
}

export async function updateFinancialProfile(
  profile: Partial<FinancialProfile>
): Promise<FinancialProfile> {
  const { data } = await api.put<FinancialProfile>('/api/v1/financial/profile', profile)
  return data
}
