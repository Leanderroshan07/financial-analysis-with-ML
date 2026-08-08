import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, type TransactionAllocation, type TransactionDto } from '../services/data.service'
import { getAccounts } from '../services/accounts.service'
import { getCategories } from '../services/categories.service'
import { Card, CardTitle } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { formatCurrency } from '../utils/formatters'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Filter, ChevronDown, ChevronUp, PlusCircle, X } from 'lucide-react'
import { cn } from '../utils/cn'
import type { Category } from '../types'
import { useToast } from '../hooks/useToast'

const accountTypeBadge: Record<string, string> = {
  Savings: 'success',
  EmergencyFund: 'warning',
}

export function TransactionsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [month, setMonth] = useState(currentMonth)
  const [typeFilter, setTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<TransactionDto | null>(null)
  const [showAllTx, setShowAllTx] = useState(false)
  const [form, setForm] = useState<any>({ amount: 0, transactionType: 'EXPENSE', description: '', categoryId: '', mainCategoryId: '', accountId: '', allocations: [] })

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', month, typeFilter, categoryFilter, accountFilter],
    queryFn: () => getTransactions({ month, type: typeFilter || undefined, categoryId: categoryFilter || undefined, accountId: accountFilter || undefined }),
  })
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: getAccounts })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => getCategories() })

  const createMutation = useMutation({
    mutationFn: () => createTransaction({ ...form, transactionNature: 'VARIABLE', allocations: form.useSplit ? form.allocations : undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['transactions'] }); setShowCreate(false); addToast('success', 'Transaction created') },
    onError: () => addToast('error', 'Failed to create transaction'),
  })

  const updateMutation = useMutation({
    mutationFn: () => updateTransaction(showEdit!.id!, { ...form, transactionNature: 'VARIABLE', allocations: form.useSplit ? form.allocations : undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['transactions'] }); setShowEdit(null); addToast('success', 'Transaction updated') },
    onError: () => addToast('error', 'Failed to update transaction'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['transactions'] }); addToast('success', 'Transaction deleted') },
    onError: () => addToast('error', 'Failed to delete'),
  })

  if (isLoading) return <LoadingSpinner />

  const totalIncome = transactions?.filter(t => t.transactionType === 'INCOME').reduce((s, t) => s + t.amount, 0) || 0
  const totalExpense = transactions?.filter(t => t.transactionType === 'EXPENSE').reduce((s, t) => s + t.amount, 0) || 0
  const allocSum = form.allocations?.reduce((s: number, a: TransactionAllocation) => s + a.amount, 0) || 0
  const allocValid = !form.useSplit || form.allocations?.length === 0 || Math.abs(allocSum - form.amount) < 0.01
  const hasSavingOrEFAlloc = form.useSplit && (form.allocations || []).some((a: TransactionAllocation) => {
    const acct = accounts?.find(acc => acc.id === a.accountId)
    return acct?.type === 'Savings' || acct?.type === 'EmergencyFund'
  })
  const showCategory = !hasSavingOrEFAlloc

  const allCategories = categories || []
  const mainCats = allCategories.filter(c => c.type === form.transactionType && !c.parentId)
  const subCatsMap: Record<string, Category[]> = {}
  allCategories.filter(c => c.parentId).forEach(sc => {
    if (!subCatsMap[sc.parentId!]) subCatsMap[sc.parentId!] = []
    subCatsMap[sc.parentId!].push(sc)
  })
  const selectedMain = form.mainCategoryId
  const subCatsOfSelected = selectedMain ? subCatsMap[selectedMain] || [] : []

  const openEdit = (tx: TransactionDto) => {
    const cat = allCategories.find(c => c.id === tx.categoryId)
    const mainCategoryId = cat?.parentId || cat?.id || ''
    const hasSplits = tx.splits && tx.splits.length > 0
    setForm({
      amount: tx.amount, transactionType: tx.transactionType,
      description: tx.description || '', categoryId: tx.categoryId || '', mainCategoryId,
      accountId: hasSplits ? '' : (tx.accountId || ''), date: tx.date?.split('T')[0],
      useSplit: hasSplits,
      allocations: hasSplits ? tx.splits!.map(s => ({ ...s })) : [],
    })
    setShowEdit(tx)
  }

  const addAllocation = () => {
    const remaining = form.amount - allocSum
    setForm({
      ...form,
      allocations: [...(form.allocations || []), { accountId: '', amount: Math.max(0, remaining) }],
    })
  }

  const updateAllocation = (i: number, field: string, value: any) => {
    const allocs = [...(form.allocations || [])]
    allocs[i] = { ...allocs[i], [field]: field === 'amount' ? Number(value) || 0 : value }
    setForm({ ...form, allocations: allocs })
  }

  const removeAllocation = (i: number) => {
    const allocs = [...(form.allocations || [])]
    allocs.splice(i, 1)
    setForm({ ...form, allocations: allocs })
  }

  const displayTx = showAllTx ? transactions : transactions?.slice(0, 5)
  const hasMore = transactions && transactions.length > 5

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div><h1 className="text-2xl font-bold text-gray-100 font-[Outfit]">Transactions</h1><p className="mt-1 text-sm text-gray-400">Track your income and expenses</p></div>
        <button onClick={() => { setForm({ amount: 0, transactionType: 'EXPENSE', description: '', categoryId: '', mainCategoryId: '', accountId: '', date: '', useSplit: false, allocations: [] }); setShowCreate(true) }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C5CE7] to-[#A855F7] px-5 py-2.5 text-sm font-semibold text-white hover:shadow-[0_0_24px_rgba(108,92,231,0.4)] hover:brightness-110 transition-all duration-300 active:scale-[0.97]"><Plus className="h-4 w-4" /> Add Transaction</button>
      </div>

      {/* Filters */}
      <Card className="animate-slide-up stagger-1">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-gray-500" /><span className="text-sm text-gray-400 font-medium">Filters:</span></div>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none" />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none"><option value="">All Types</option><option value="INCOME">Income</option><option value="EXPENSE">Expense</option></select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none"><option value="">All Categories</option>{allCategories.map(c => <option key={c.id} value={c.id}>{c.parentId ? '  └ ' : ''}{c.name}</option>)}</select>
          <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)} className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none"><option value="">All Accounts</option>{(accounts || []).map(a => <option key={a.id} value={a.id}>{a.isSubAccount ? '  └ ' : ''}{a.name}</option>)}</select>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="animate-slide-up stagger-2"><p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Income</p><p className="text-lg font-bold font-data text-[#00E6A7]">{formatCurrency(totalIncome)}</p></Card>
        <Card className="animate-slide-up stagger-3"><p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Expenses</p><p className="text-lg font-bold font-data text-[#FF6B6B]">{formatCurrency(totalExpense)}</p></Card>
        <Card className="animate-slide-up stagger-4"><p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Balance</p><p className={cn('text-lg font-bold font-data', totalIncome - totalExpense >= 0 ? 'text-[#00E6A7]' : 'text-[#FF6B6B]')}>{formatCurrency(totalIncome - totalExpense)}</p></Card>
      </div>

      {/* Transaction List */}
      <Card className="animate-slide-up stagger-5">
        <CardTitle>Transactions</CardTitle>
        <div className="mt-3 space-y-1">
          {!transactions || transactions.length === 0 ? <p className="text-sm text-gray-500 py-8 text-center">No transactions for this period</p> : (
            <div className="divide-y divide-white/[0.04]">
              {displayTx?.map((tx, index) => (
                <div key={tx.id} className="flex items-center justify-between py-3 hover:bg-white/[0.02] rounded-xl px-2 transition-all duration-200" style={{ animationDelay: `${index * 0.03}s` }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('rounded-xl p-2', tx.transactionType === 'INCOME' ? 'bg-[#00E6A7]/10' : 'bg-[#FF6B6B]/10')}>
                      {tx.transactionType === 'INCOME' ? <TrendingUp className="h-4 w-4 text-[#00E6A7]" /> : <TrendingDown className="h-4 w-4 text-[#FF6B6B]" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{tx.description || tx.category?.name || 'Transaction'}</p>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {tx.category && <Badge variant="neutral">{tx.category.name}</Badge>}
                        {tx.splits && tx.splits.length > 0 ? (
                          tx.splits.map((s, i) => (
                            <Badge key={i} variant={accountTypeBadge[(accounts || []).find(a => a.id === s.accountId)?.type || ''] as any || 'info'}>
                              {`${(accounts || []).find(a => a.id === s.accountId)?.name || 'Unknown'}: ${formatCurrency(s.amount)}`}
                            </Badge>
                          ))
                        ) : tx.account ? <Badge variant="info">{tx.account.name}</Badge> : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className={cn('text-sm font-bold font-data', tx.transactionType === 'INCOME' ? 'text-[#00E6A7]' : 'text-[#FF6B6B]')}>
                        {tx.transactionType === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(tx.date || '').toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => openEdit(tx)} className="rounded-lg p-1.5 hover:bg-white/[0.06] transition-all duration-200"><Pencil className="h-4 w-4 text-gray-500" /></button>
                    <button onClick={() => deleteMutation.mutate(tx.id!)} className="rounded-lg p-1.5 hover:bg-[#FF6B6B]/10 transition-all duration-200"><Trash2 className="h-4 w-4 text-[#FF6B6B]/60" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {hasMore && (
            <button onClick={() => setShowAllTx(!showAllTx)} className="flex w-full items-center justify-center gap-1 pt-3 text-sm font-semibold text-[#A29BFE] hover:text-[#6C5CE7] transition-colors">
              {showAllTx ? <><ChevronUp className="h-4 w-4" /> Show less</> : <><ChevronDown className="h-4 w-4" /> Show all ({transactions.length})</>}
            </button>
          )}
        </div>
      </Card>

      {/* Transaction Modal */}
      <Modal open={showCreate || !!showEdit} onClose={() => { setShowCreate(false); setShowEdit(null) }} title={showCreate ? 'Add Transaction' : 'Edit Transaction'}>
        <div className="space-y-4">
          <div className="flex gap-3">
            <button onClick={() => setForm({ ...form, transactionType: 'EXPENSE', categoryId: '', mainCategoryId: '' })} className={cn('flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200', form.transactionType === 'EXPENSE' ? 'border-[#FF6B6B]/30 bg-[#FF6B6B]/10 text-[#FF6B6B]' : 'border-white/[0.1] text-gray-400 hover:bg-white/[0.04]')}>Expense</button>
            <button onClick={() => setForm({ ...form, transactionType: 'INCOME', categoryId: '', mainCategoryId: '' })} className={cn('flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200', form.transactionType === 'INCOME' ? 'border-[#00E6A7]/30 bg-[#00E6A7]/10 text-[#00E6A7]' : 'border-white/[0.1] text-gray-400 hover:bg-white/[0.04]')}>Income</button>
          </div>
          <div><label className="block text-sm font-medium text-gray-300">Amount</label><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value), allocations: form.useSplit ? (form.allocations || []).map((a: TransactionAllocation) => ({ ...a })) : [] })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" /></div>
          <div><label className="block text-sm font-medium text-gray-300">Description</label><input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" /></div>

          {showCategory && (
          <div>
            <label className="block text-sm font-medium text-gray-300">Category</label>
            <select value={form.mainCategoryId} onChange={e => { setForm({ ...form, mainCategoryId: e.target.value, categoryId: e.target.value }) }} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20">
              <option value="">Select category</option>
              {mainCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {subCatsOfSelected.length > 0 && (
              <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20">
                <option value={form.mainCategoryId}>— {mainCats.find(c => c.id === form.mainCategoryId)?.name} (general) —</option>
                {subCatsOfSelected.map(sc => <option key={sc.id} value={sc.id}>└ {sc.name}</option>)}
              </select>
            )}
          </div>
          )}

          <div className="border-t border-white/[0.06] pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Account allocation</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, useSplit: !form.useSplit, allocations: form.useSplit ? [] : [{ accountId: '', amount: form.amount }] })}
                className={cn('text-xs font-semibold transition-colors', form.useSplit ? 'text-[#A29BFE] hover:text-[#6C5CE7]' : 'text-gray-500 hover:text-gray-300')}
              >
                {form.useSplit ? 'Use single account' : 'Split across accounts'}
              </button>
            </div>

            {form.useSplit ? (
              <div className="space-y-2">
                {(form.allocations || []).map((alloc: TransactionAllocation, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={alloc.accountId}
                      onChange={e => updateAllocation(i, 'accountId', e.target.value)}
                      className="flex-1 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none"
                    >
                      <option value="">Select account</option>
                      {(accounts || []).map(a => (
                        <option key={a.id} value={a.id}>
                          {a.isSubAccount ? '  └ ' : ''}{a.name} {a.type === 'Savings' ? '(Savings)' : a.type === 'EmergencyFund' ? '(EF)' : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={alloc.amount}
                      onChange={e => updateAllocation(i, 'amount', e.target.value)}
                      className="w-28 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none"
                    />
                    {(form.allocations || []).length > 1 && (
                      <button onClick={() => removeAllocation(i)} className="rounded-lg p-1.5 hover:bg-[#FF6B6B]/10 transition-all duration-200"><X className="h-4 w-4 text-[#FF6B6B]/60" /></button>
                    )}
                  </div>
                ))}
                {!allocValid && <p className="text-xs text-[#FF6B6B]">Allocation total (<span className="font-data">{formatCurrency(allocSum)}</span>) ≠ amount (<span className="font-data">{formatCurrency(form.amount)}</span>)</p>}
                {(form.allocations || []).length < 3 && (
                  <button onClick={addAllocation} className="flex items-center gap-1 text-xs font-semibold text-[#A29BFE] hover:text-[#6C5CE7] transition-colors">
                    <PlusCircle className="h-3 w-3" /> Add another allocation
                  </button>
                )}
              </div>
            ) : (
              <div>
                <select value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none">
                  <option value="">None</option>
                  {(accounts || []).map(a => (
                    <option key={a.id} value={a.id}>
                      {a.isSubAccount ? '  └ ' : ''}{a.name}{a.type === 'Savings' ? ' (Savings)' : a.type === 'EmergencyFund' ? ' (EF)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div><label className="block text-sm font-medium text-gray-300">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowCreate(false); setShowEdit(null) }} className="rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/[0.06] transition-all duration-200">Cancel</button>
            <button onClick={() => showCreate ? createMutation.mutate() : updateMutation.mutate()} disabled={!form.amount || form.amount <= 0 || !allocValid} className="rounded-xl bg-gradient-to-r from-[#6C5CE7] to-[#A855F7] px-5 py-2.5 text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(108,92,231,0.3)] transition-all duration-200 disabled:opacity-40">{showCreate ? 'Create' : 'Save'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
