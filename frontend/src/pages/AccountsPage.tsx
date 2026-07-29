import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getAccounts, createAccount, updateAccount, deleteAccount, transferMoney } from '../services/accounts.service'
import { Card, CardTitle } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { formatCurrency } from '../utils/formatters'
import { Plus, Pencil, Trash2, ArrowRightLeft, Wallet, Building2, CreditCard, Smartphone, MoreHorizontal, PiggyBank, Shield, Repeat, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '../utils/cn'
import type { FinanceAccount } from '../types'
import { useToast } from '../hooks/useToast'

const ACCOUNT_TYPES = ['Cash', 'Bank', 'Card', 'Wallet', 'Other', 'Savings', 'EmergencyFund'] as const
const SYSTEM_ACCOUNT_TYPES = ['Savings', 'EmergencyFund']

const typeIcons: Record<string, any> = {
  Cash: Wallet, Bank: Building2, Card: CreditCard, Wallet: Smartphone, Other: MoreHorizontal,
  Savings: PiggyBank, EmergencyFund: Shield,
}

const typeColors: Record<string, { bg: string; text: string; glow: string }> = {
  Cash: { bg: 'from-[#00E6A7]/20 to-[#00D2FF]/10', text: 'text-[#00E6A7]', glow: 'shadow-[0_0_12px_rgba(0,230,167,0.15)]' },
  Bank: { bg: 'from-[#3B82F6]/20 to-[#00D2FF]/10', text: 'text-[#00D2FF]', glow: 'shadow-[0_0_12px_rgba(0,210,255,0.15)]' },
  Card: { bg: 'from-[#A855F7]/20 to-[#6C5CE7]/10', text: 'text-[#A855F7]', glow: 'shadow-[0_0_12px_rgba(168,85,247,0.15)]' },
  Wallet: { bg: 'from-[#FFB84D]/20 to-[#FF6B9D]/10', text: 'text-[#FFB84D]', glow: 'shadow-[0_0_12px_rgba(255,184,77,0.15)]' },
  Other: { bg: 'from-white/10 to-white/5', text: 'text-gray-300', glow: '' },
  Savings: { bg: 'from-[#00E6A7]/25 to-[#00D2FF]/10', text: 'text-[#00E6A7]', glow: 'shadow-[0_0_12px_rgba(0,230,167,0.2)]' },
  EmergencyFund: { bg: 'from-[#FFB84D]/25 to-[#FF6B9D]/10', text: 'text-[#FFB84D]', glow: 'shadow-[0_0_12px_rgba(255,184,77,0.2)]' },
}

function isSubscriptionSub(a: FinanceAccount): boolean {
  return !!a.isSubAccount && a.name.startsWith('[Sub]')
}

function getBalanceColor(balance: number, threshold: number | null, isSub = false) {
  if (isSub) return 'text-gray-300'
  if (threshold !== null && balance <= threshold) return 'text-[#FF6B6B]'
  if (threshold !== null && balance <= threshold * 1.2) return 'text-[#FFB84D]'
  return 'text-[#00E6A7]'
}

function calcTotalBalance(account: FinanceAccount): number {
  const subSum = account.subAccounts?.reduce((s, sa) => s + sa.currentBalance, 0) || 0
  return account.currentBalance + subSum
}

export function AccountsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<FinanceAccount | null>(null)
  const [showTransfer, setShowTransfer] = useState(false)
  const [showDelete, setShowDelete] = useState<FinanceAccount | null>(null)
  const [parentFilter, setParentFilter] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState({ name: '', type: 'Other' as string, initialBalance: 0, spendingThreshold: '', parentId: '' })
  const [transfer, setTransfer] = useState({ fromAccountId: '', toAccountId: '', amount: 0, description: '' })

  const { data: accounts, isLoading, error } = useQuery({ queryKey: ['accounts'], queryFn: getAccounts })

  const createMutation = useMutation({
    mutationFn: () => createAccount({
      name: form.name, type: form.parentId ? undefined : form.type,
      initialBalance: form.initialBalance,
      spendingThreshold: form.spendingThreshold ? Number(form.spendingThreshold) : null,
      parentId: form.parentId || undefined,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounts'] }); setShowCreate(false); setForm({ name: '', type: 'Other', initialBalance: 0, spendingThreshold: '', parentId: '' }); addToast('success', 'Account created') },
    onError: () => addToast('error', 'Failed to create account'),
  })

  const updateMutation = useMutation({
    mutationFn: () => updateAccount(showEdit!.id, { name: form.name, type: form.type, spendingThreshold: form.spendingThreshold ? Number(form.spendingThreshold) : null }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounts'] }); setShowEdit(null); addToast('success', 'Account updated') },
    onError: () => addToast('error', 'Failed to update account'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(showDelete!.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounts'] }); setShowDelete(null); addToast('success', 'Account deleted') },
    onError: (err: any) => addToast('error', err?.response?.data?.error || 'Failed to delete account'),
  })

  const transferMutation = useMutation({
    mutationFn: () => transferMoney(transfer.fromAccountId, transfer.toAccountId, transfer.amount, transfer.description),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounts'] }); setShowTransfer(false); setTransfer({ fromAccountId: '', toAccountId: '', amount: 0, description: '' }); addToast('success', 'Transfer completed') },
    onError: (err: any) => addToast('error', err?.response?.data?.error || 'Transfer failed'),
  })

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="rounded-2xl border border-[#FF6B6B]/20 bg-[#FF6B6B]/5 p-6 text-[#FF6B6B]">Failed to load accounts</div>

  const mainAccounts = accounts?.filter(a => !a.isSubAccount) || []
  const allAccounts = accounts || []

  const openEdit = (a: FinanceAccount) => {
    setForm({ name: a.name, type: a.type, initialBalance: a.initialBalance, spendingThreshold: a.spendingThreshold?.toString() || '', parentId: '' })
    setShowEdit(a)
  }

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div><h1 className="text-2xl font-bold text-gray-100 font-[Outfit]">Accounts</h1><p className="mt-1 text-sm text-gray-400">Manage main accounts and sub-accounts</p></div>
        <button onClick={() => { setForm({ name: '', type: 'Cash', initialBalance: 0, spendingThreshold: '', parentId: '' }); setShowCreate(true) }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C5CE7] to-[#A855F7] px-5 py-2.5 text-sm font-semibold text-white hover:shadow-[0_0_24px_rgba(108,92,231,0.4)] hover:brightness-110 transition-all duration-300 active:scale-[0.97]"> <Plus className="h-4 w-4" /> Add Account </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mainAccounts.map((account, index) => {
          const TypeIcon = typeIcons[account.type] || Wallet
          const subs = account.subAccounts || []
          const totalBalance = calcTotalBalance(account)
          const isExpanded = expanded[account.id]
          const colors = typeColors[account.type] || typeColors.Other

          const isSystem = SYSTEM_ACCOUNT_TYPES.includes(account.type)
          const hasSubs = subs.some(isSubscriptionSub)
          const cardBorder = account.type === 'Savings' ? 'border-[#00E6A7]/20' : account.type === 'EmergencyFund' ? 'border-[#FFB84D]/20' : hasSubs ? 'border-[#A855F7]/20' : ''
          return (
            <Card key={account.id} className={cn('relative animate-slide-up', subs.length > 0 && 'pb-2', cardBorder)} style={{ animationDelay: `${index * 0.05}s` }}>
              <div className="flex items-start justify-between">
                <div className={cn('icon-container bg-gradient-to-br', colors.bg)}>
                  <TypeIcon className={cn('h-5 w-5', colors.text)} />
                </div>
                <div className="flex gap-1">
                  {subs.length > 0 && (
                    <button onClick={() => toggleExpand(account.id)} className="rounded-lg p-1.5 hover:bg-white/[0.06] transition-all duration-200">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                    </button>
                  )}
                  <button onClick={() => openEdit(account)} className="rounded-lg p-1.5 hover:bg-white/[0.06] transition-all duration-200"><Pencil className="h-4 w-4 text-gray-500" /></button>
                  {!isSystem && <button onClick={() => setShowDelete(account)} className="rounded-lg p-1.5 hover:bg-[#FF6B6B]/10 transition-all duration-200"><Trash2 className="h-4 w-4 text-[#FF6B6B]/60" /></button>}
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-200">{account.name}</p>
              <Badge variant={account.type === 'Savings' ? 'success' : account.type === 'EmergencyFund' ? 'warning' : hasSubs ? 'info' : 'neutral'}>{account.type}</Badge>
              <p className={cn('mt-2 text-lg font-bold font-data', getBalanceColor(account.currentBalance, account.spendingThreshold))}>{formatCurrency(totalBalance)}</p>
              <div className="mt-1 space-y-0.5">
                {subs.length > 0 ? (
                  <p className="text-xs text-gray-500">
                    {subs.map((s, i) => <span key={s.id}>{i > 0 && <span className="text-gray-600">, </span>}{s.name}: <span className="font-data">{formatCurrency(s.currentBalance)}</span></span>)}
                    {account.currentBalance > 0 && <span><span className="text-gray-600">, </span>own: <span className="font-data">{formatCurrency(account.currentBalance)}</span></span>}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">Balance: <span className="font-data">{formatCurrency(account.currentBalance)}</span></p>
                )}
                {account.spendingThreshold !== null && <p className="text-xs text-gray-500">Threshold: <span className="font-data">{formatCurrency(account.spendingThreshold)}</span></p>}
              </div>

              {subs.length > 0 && isExpanded && (
                <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
                  {(subs || []).map(sub => (
                    <div key={sub.id} className={cn('flex items-center justify-between rounded-xl px-3 py-2 transition-all duration-200', isSubscriptionSub(sub) ? 'bg-[#A855F7]/5 border border-[#A855F7]/10' : 'bg-white/[0.02] border border-white/[0.04]')}>
                      <div className="flex items-center gap-2">
                        {isSubscriptionSub(sub) && <Repeat className="h-3.5 w-3.5 text-[#A855F7]" />}
                        <p className={cn('text-sm font-medium', isSubscriptionSub(sub) ? 'text-[#A855F7]' : 'text-gray-300')}>{sub.name}</p>
                        <div className="flex gap-1">
                          <button onClick={() => { setForm({ name: sub.name, type: sub.type, initialBalance: sub.initialBalance, spendingThreshold: sub.spendingThreshold?.toString() || '', parentId: '' }); setShowEdit(sub) }} className="text-xs text-[#A29BFE] hover:text-[#6C5CE7] transition-colors">Edit</button>
                          <button onClick={() => setShowDelete(sub)} className="text-xs text-[#FF6B6B]/70 hover:text-[#FF6B6B] transition-colors">Delete</button>
                        </div>
                      </div>
                      <p className="text-sm font-bold font-data text-gray-200">{formatCurrency(sub.currentBalance)}</p>
                    </div>
                  ))}
                  <button
                    onClick={() => { setForm({ name: '', type: account.type, initialBalance: 0, spendingThreshold: '', parentId: account.id }); setShowCreate(true) }}
                    className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-white/[0.1] py-2 text-xs text-gray-500 hover:bg-white/[0.02] hover:border-[#6C5CE7]/30 hover:text-[#A29BFE] transition-all duration-200"
                  >
                    <Plus className="h-3 w-3" /> Add sub-account
                  </button>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <div className="flex justify-center animate-fade-in">
        <button onClick={() => { setTransfer({ fromAccountId: '', toAccountId: '', amount: 0, description: '' }); setShowTransfer(true) }} className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/[0.06] hover:border-[#6C5CE7]/30 hover:text-gray-100 transition-all duration-300">
          <ArrowRightLeft className="h-4 w-4" /> Transfer Between Accounts
        </button>
      </div>

      <Modal open={showCreate || !!showEdit} onClose={() => { setShowCreate(false); setShowEdit(null) }} title={showCreate ? (form.parentId ? 'Add Sub-Account' : 'Add Account') : 'Edit Account'}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-300">Name</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" /></div>
          {showCreate && !form.parentId && (
            <div><label className="block text-sm font-medium text-gray-300">Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20">{ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          )}
          {showCreate && (
            <div><label className="block text-sm font-medium text-gray-300">Parent Account (optional)</label><select value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value, type: e.target.value ? mainAccounts.find(a => a.id === e.target.value)?.type || form.type : form.type })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20"><option value="">None (main account)</option>{mainAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          )}
          {showCreate && <div><label className="block text-sm font-medium text-gray-300">Initial Balance</label><input type="number" value={form.initialBalance} onChange={e => setForm({ ...form, initialBalance: Number(e.target.value) })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" /></div>}
          {!form.parentId && <div><label className="block text-sm font-medium text-gray-300">Spending Threshold (optional)</label><input type="number" value={form.spendingThreshold} onChange={e => setForm({ ...form, spendingThreshold: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" placeholder="Leave empty for no alert" /></div>}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowCreate(false); setShowEdit(null) }} className="rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/[0.06] transition-all duration-200">Cancel</button>
            <button onClick={() => showCreate ? createMutation.mutate() : updateMutation.mutate()} className="rounded-xl bg-gradient-to-r from-[#6C5CE7] to-[#A855F7] px-5 py-2.5 text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(108,92,231,0.3)] transition-all duration-200">{showCreate ? 'Create' : 'Save'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete Account">
        <div className="space-y-4">
          {showDelete && SYSTEM_ACCOUNT_TYPES.includes(showDelete.type) ? (
            <div className="flex items-center gap-2 rounded-xl bg-[#FFB84D]/5 border border-[#FFB84D]/20 p-3 text-sm text-[#FFB84D]"><AlertTriangle className="h-4 w-4" /> This is a system account and cannot be deleted.</div>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-xl bg-[#FF6B6B]/5 border border-[#FF6B6B]/20 p-3 text-sm text-[#FF6B6B]"><AlertTriangle className="h-4 w-4" /> This will permanently delete this account.</div>
              <p className="text-sm text-gray-400">Are you sure you want to delete <strong className="text-gray-200">{showDelete?.name}</strong>?</p>
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowDelete(null)} className="rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/[0.06] transition-all duration-200">Cancel</button>
            {showDelete && !SYSTEM_ACCOUNT_TYPES.includes(showDelete.type) && <button onClick={() => deleteMutation.mutate()} className="rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF6B9D] px-5 py-2.5 text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(255,107,107,0.3)] transition-all duration-200">Delete</button>}
          </div>
        </div>
      </Modal>

      <Modal open={showTransfer} onClose={() => setShowTransfer(false)} title="Transfer Money">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-300">From</label><select value={transfer.fromAccountId} onChange={e => setTransfer({ ...transfer, fromAccountId: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20"><option value="">Select account</option>{allAccounts.filter(a => a.id !== transfer.toAccountId).map(a => <option key={a.id} value={a.id}>{a.name} ({a.isSubAccount ? 'Sub' : 'Main'}) — {formatCurrency(a.currentBalance)}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-300">To</label><select value={transfer.toAccountId} onChange={e => setTransfer({ ...transfer, toAccountId: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20"><option value="">Select account</option>{allAccounts.filter(a => a.id !== transfer.fromAccountId).map(a => <option key={a.id} value={a.id}>{a.name} ({a.isSubAccount ? 'Sub' : 'Main'}) — {formatCurrency(a.currentBalance)}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-300">Amount</label><input type="number" value={transfer.amount} onChange={e => setTransfer({ ...transfer, amount: Number(e.target.value) })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" /></div>
          <div><label className="block text-sm font-medium text-gray-300">Description (optional)</label><input type="text" value={transfer.description} onChange={e => setTransfer({ ...transfer, description: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowTransfer(false)} className="rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/[0.06] transition-all duration-200">Cancel</button>
            <button onClick={() => transferMutation.mutate()} disabled={!transfer.fromAccountId || !transfer.toAccountId || transfer.amount <= 0} className="rounded-xl bg-gradient-to-r from-[#6C5CE7] to-[#A855F7] px-5 py-2.5 text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(108,92,231,0.3)] transition-all duration-200 disabled:opacity-40">Transfer</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
