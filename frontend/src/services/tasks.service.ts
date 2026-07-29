import api from './api'
import type { Task, Subtask } from '../types'

export async function getTasks(params?: { completed?: boolean; isGoal?: boolean }): Promise<Task[]> {
  const { data } = await api.get('/api/v1/tasks', { params })
  return data
}

export async function createTask(dto: Partial<Task>): Promise<Task> {
  const { data } = await api.post('/api/v1/tasks', dto)
  return data
}

export async function updateTask(id: string, dto: Partial<Task>): Promise<Task> {
  const { data } = await api.put(`/api/v1/tasks/${id}`, dto)
  return data
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/api/v1/tasks/${id}`)
}

export async function toggleTask(id: string): Promise<Task> {
  const { data } = await api.patch(`/api/v1/tasks/${id}/toggle`)
  return data
}

export async function getSubtasks(taskId: string): Promise<Subtask[]> {
  const { data } = await api.get(`/api/v1/tasks/${taskId}/subtasks`)
  return data
}

export async function createSubtask(taskId: string, title: string): Promise<Subtask> {
  const { data } = await api.post(`/api/v1/tasks/${taskId}/subtasks`, { title })
  return data
}

export async function updateSubtask(taskId: string, subtaskId: string, dto: Partial<Subtask>): Promise<Subtask> {
  const { data } = await api.put(`/api/v1/tasks/${taskId}/subtasks/${subtaskId}`, dto)
  return data
}

export async function deleteSubtask(taskId: string, subtaskId: string): Promise<void> {
  await api.delete(`/api/v1/tasks/${taskId}/subtasks/${subtaskId}`)
}
