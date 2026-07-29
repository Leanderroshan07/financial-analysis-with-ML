import api from './api'
import type { DashboardData } from '../types'

export async function getDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>('/api/v1/dashboard')
  return data
}
