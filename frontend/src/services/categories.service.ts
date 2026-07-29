import api from './api'
import type { Category } from '../types'

export async function getCategories(type?: string): Promise<Category[]> {
  if (type && typeof type === 'object') type = undefined as any
  const params = type ? { type } : {}
  const { data } = await api.get('/api/v1/financial/categories', { params })
  return data
}

export async function createCategory(dto: Partial<Category>): Promise<Category> {
  const { data } = await api.post('/api/v1/financial/categories', dto)
  return data
}

export async function updateCategory(id: string, dto: Partial<Category>): Promise<Category> {
  const { data } = await api.put(`/api/v1/financial/categories/${id}`, dto)
  return data
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/api/v1/financial/categories/${id}`)
}
