import api from './api'
import type { AuthResponse, User } from '../types'

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
  return data
}

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', { name, email, password })
  return data
}

export async function getProfile(): Promise<User> {
  const { data } = await api.get<User>('/auth/profile')
  return data
}

export function persistAuth(response: AuthResponse) {
  localStorage.setItem('token', response.token)
  localStorage.setItem('user', JSON.stringify(response.user))
}

export function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem('user')
  return raw ? JSON.parse(raw) : null
}

export function getStoredToken(): string | null {
  return localStorage.getItem('token')
}
