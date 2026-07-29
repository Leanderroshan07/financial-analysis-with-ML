import api from './api'

export interface IncomeDto {
  id?: string
  title: string
  amount: number
  frequency: string
  receivedDate?: string
  notes?: string
}

export interface TransactionAllocation {
  accountId: string
  amount: number
}

export interface TransactionDto {
  id?: string
  amount: number
  transactionType: string
  transactionNature?: string
  date?: string
  description?: string
  categoryId?: string | null
  accountId?: string | null
  allocations?: TransactionAllocation[]
  goalId?: string | null
  taskId?: string | null
  recurringFrequency?: string
  splits?: TransactionAllocation[] | null
  category?: { id: string; name: string; type: string } | null
  account?: { id: string; name: string; type: string } | null
}

export interface SavingsDto {
  currentSavings: number
}

export async function getIncomes(): Promise<IncomeDto[]> {
  const { data } = await api.get('/api/v1/financial/incomes')
  return data
}

export async function createIncome(dto: IncomeDto): Promise<IncomeDto> {
  const { data } = await api.post('/api/v1/financial/incomes', dto)
  return data
}

export async function updateIncome(id: string, dto: Partial<IncomeDto>): Promise<IncomeDto> {
  const { data } = await api.put(`/api/v1/financial/incomes/${id}`, dto)
  return data
}

export async function deleteIncome(id: string): Promise<void> {
  await api.delete(`/api/v1/financial/incomes/${id}`)
}

export async function getTransactions(params?: Record<string, any>): Promise<TransactionDto[]> {
  if (params && typeof params === 'object' && 'queryKey' in params) params = undefined
  const { data } = await api.get('/api/v1/financial/transactions', { params })
  return data
}

export async function createTransaction(dto: TransactionDto): Promise<TransactionDto> {
  const { data } = await api.post('/api/v1/financial/transactions', dto)
  return data
}

export async function updateTransaction(id: string, dto: Partial<TransactionDto>): Promise<TransactionDto> {
  const { data } = await api.put(`/api/v1/financial/transactions/${id}`, dto)
  return data
}

export async function deleteTransaction(id: string): Promise<void> {
  await api.delete(`/api/v1/financial/transactions/${id}`)
}

export async function getSavings(): Promise<SavingsDto> {
  const { data } = await api.get('/api/v1/financial/savings')
  return data
}

export async function updateSavings(savings: SavingsDto): Promise<SavingsDto> {
  const { data } = await api.put('/api/v1/financial/savings', savings)
  return data
}
