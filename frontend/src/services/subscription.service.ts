import api from './api'
import type { Subscription, SubscriptionSummary } from '../types'

export async function getSubscriptions(): Promise<Subscription[]> {
  const { data } = await api.get('/api/v1/subscriptions')
  return data
}

export async function getSubscriptionSummary(): Promise<SubscriptionSummary> {
  const { data } = await api.get('/api/v1/subscriptions/summary')
  return data
}

export async function createSubscription(dto: Partial<Subscription>): Promise<Subscription> {
  const { data } = await api.post('/api/v1/subscriptions', dto)
  return data
}

export async function updateSubscription(id: string, dto: Partial<Subscription>): Promise<Subscription> {
  const { data } = await api.put(`/api/v1/subscriptions/${id}`, dto)
  return data
}

export async function deleteSubscription(id: string): Promise<void> {
  await api.delete(`/api/v1/subscriptions/${id}`)
}

export async function paySubscription(id: string): Promise<Subscription> {
  const { data } = await api.post(`/api/v1/subscriptions/${id}/pay`)
  return data
}

export async function skipSubscription(id: string): Promise<Subscription> {
  const { data } = await api.post(`/api/v1/subscriptions/${id}/skip`)
  return data
}

export async function unskipSubscription(id: string): Promise<Subscription> {
  const { data } = await api.post(`/api/v1/subscriptions/${id}/unskip`)
  return data
}
