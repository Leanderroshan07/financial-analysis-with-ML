import api from './api'
import type { FinanceAccount } from '../types'

export async function getAccounts(): Promise<FinanceAccount[]> {
  const { data } = await api.get('/api/v1/accounts')
  return data
}

export async function createAccount(dto: Partial<FinanceAccount>): Promise<FinanceAccount> {
  const { data } = await api.post('/api/v1/accounts', dto)
  return data
}

export async function updateAccount(id: string, dto: Partial<FinanceAccount>): Promise<FinanceAccount> {
  const { data } = await api.put(`/api/v1/accounts/${id}`, dto)
  return data
}

export async function deleteAccount(id: string): Promise<void> {
  await api.delete(`/api/v1/accounts/${id}`)
}

export async function transferMoney(fromAccountId: string, toAccountId: string, amount: number, description?: string): Promise<any> {
  const { data } = await api.post('/api/v1/accounts/transfer', { fromAccountId, toAccountId, amount, description })
  return data
}

export async function getAccountAlerts(): Promise<{ accountId: string; name: string; balance: number; threshold: number }[]> {
  const { data } = await api.get('/api/v1/accounts/alerts')
  return data
}
