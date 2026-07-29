import api from './api'
import type { Goal, Transaction } from '../types'

export async function getGoals(): Promise<Goal[]> {
  const { data } = await api.get('/api/v1/goals')
  return data
}

export async function updateGoal(id: string, dto: Partial<Goal>): Promise<Goal> {
  const { data } = await api.put(`/api/v1/goals/${id}`, dto)
  return data
}

export async function deleteGoal(id: string): Promise<void> {
  await api.delete(`/api/v1/goals/${id}`)
}

export async function addMoneyToGoal(id: string, amount: number, description?: string): Promise<Transaction> {
  const { data } = await api.post(`/api/v1/goals/${id}/add-money`, { amount, description })
  return data
}

export async function spendFromGoal(id: string, amount: number, description?: string, accountId?: string): Promise<Transaction> {
  const { data } = await api.post(`/api/v1/goals/${id}/spend`, { amount, description, accountId })
  return data
}
