import api from './api'
import type { Emi, EmiSummary, AmortizationEntry, Transaction } from '../types'

export async function getEmis(): Promise<Emi[]> {
  const { data } = await api.get('/api/v1/emi')
  return data
}

export async function getEmiSummary(): Promise<EmiSummary> {
  const { data } = await api.get('/api/v1/emi/summary')
  return data
}

export async function getEmi(id: string): Promise<Emi> {
  const { data } = await api.get(`/api/v1/emi/${id}`)
  return data
}

export async function createEmi(dto: Partial<Emi>): Promise<Emi> {
  const { data } = await api.post('/api/v1/emi', dto)
  return data
}

export async function updateEmi(id: string, dto: Partial<Emi>): Promise<Emi> {
  const { data } = await api.put(`/api/v1/emi/${id}`, dto)
  return data
}

export async function deleteEmi(id: string): Promise<void> {
  await api.delete(`/api/v1/emi/${id}`)
}

export async function payEmi(id: string): Promise<Emi> {
  const { data } = await api.post(`/api/v1/emi/${id}/pay`)
  return data
}

export async function getAmortizationSchedule(id: string): Promise<AmortizationEntry[]> {
  const { data } = await api.get(`/api/v1/emi/${id}/amortization-schedule`)
  return data
}

export async function getEmiPaymentHistory(id: string): Promise<Transaction[]> {
  const { data } = await api.get(`/api/v1/emi/${id}/payment-history`)
  return data
}

export async function addExtraEmiPayment(id: string, amount: number): Promise<Emi> {
  const { data } = await api.post(`/api/v1/emi/${id}/extra-payment`, { amount })
  return data
}
