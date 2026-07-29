import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { getEmis, createEmi, updateEmi, deleteEmi, getEmiSummary, payEmi, getAmortizationSchedule, getEmiPaymentHistory, addExtraEmiPayment } from '../services/emi.service'
import { getSubscriptions, createSubscription, updateSubscription, deleteSubscription, getSubscriptionSummary, paySubscription, skipSubscription, unskipSubscription } from '../services/subscription.service'
import { getAccounts } from '../services/accounts.service'
import { Card, CardTitle } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { formatCurrency } from '../utils/formatters'
import { Plus, Pencil, Trash2, AlertTriangle, Banknote, Clock, TrendingDown, Repeat, Calendar, Info, ArrowRight, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { cn } from '../utils/cn'
import type { Emi, Subscription, AmortizationEntry, Transaction } from '../types'
import { useToast } from '../hooks/useToast'

const ML_CONTRIBUTION = [
  { label: 'EMI payments', field: 'monthlyEmi (each EMI)', mlField: 'total_fixed_expense', effect: 'Added to fixed expenses → reduces disposable income → lowers purchase affordability', color: 'text-[#FF6B6B]', bg: 'bg-[#FF6B6B]/10 border-[#FF6B6B]/20' },
  { label: 'Subscription payments', field: 'monthly amount', mlField: 'total_fixed_expense', effect: 'Added to fixed expenses → same effect as EMI', color: 'text-[#A855F7]', bg: 'bg-[#A855F7]/10 border-[#A855F7]/20' },
  { label: 'Total Fixed Expenses', field: 'sum of all fixed costs', mlField: 'total_fixed_expense', effect: 'Direct ML input: Higher fixed expenses → less surplus → lower chance of YES recommendation', color: 'text-[#FFB84D]', bg: 'bg-[#FFB84D]/10 border-[#FFB84D]/20' },
  { label: 'Remaining Balance', field: 'income - expenses', mlField: 'remaining_balance (engineered)', effect: 'First layer of funding: monthly surplus leftover after all expenses', color: 'text-[#00E6A7]', bg: 'bg-[#00E6A7]/10 border-[#00E6A7]/20' },
  { label: 'Debt Ratio', field: 'fixed / income', mlField: 'debt_ratio (engineered)', effect: 'Risk metric: high debt ratio → model is more cautious about new purchases', color: 'text-[#00D2FF]', bg: 'bg-[#00D2FF]/10 border-[#00D2FF]/20' },
]

export function FixedExpensesPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [filterMonth, setFilterMonth] = useState('')
  const [showMLInfo, setShowMLInfo] = useState(false)
  const [activeTab, setActiveTab] = useState<'emi' | 'subscription'>('emi')

  const [showEmiCreate, setShowEmiCreate] = useState(false)
  const [showEmiEdit, setShowEmiEdit] = useState<Emi | null>(null)
  const [showEmiDelete, setShowEmiDelete] = useState<Emi | null>(null)
  const [showAmortization, setShowAmortization] = useState<{ emi: Emi; schedule: AmortizationEntry[] } | null>(null)
  const [showPaymentHistory, setShowPaymentHistory] = useState<{ emi: Emi; transactions: Transaction[] } | null>(null)
  const [extraPaymentAmount, setExtraPaymentAmount] = useState(0)
  const [showExtraPayment, setShowExtraPayment] = useState<Emi | null>(null)
  const [emiForm, setEmiForm] = useState({ name: '', totalAmount: 0, monthlyEmi: 0, interestRate: '', tenureMonths: '', startDate: '', dueDay: '', downPayment: '', processingFee: '', prepaymentAmount: '', loanAccountNumber: '', notes: '', category: '', lender: '', accountId: '' })

  const [showSubCreate, setShowSubCreate] = useState(false)
  const [showSubEdit, setShowSubEdit] = useState<Subscription | null>(null)
  const [showSubDelete, setShowSubDelete] = useState<Subscription | null>(null)
  const [subForm, setSubForm] = useState({ name: '', amount: 0, billingPeriod: 'MONTHLY' as 'MONTHLY' | 'YEARLY', startDate: '', billingMonths: '', category: '', active: true })

  const { data: emis, isLoading: emisLoading } = useQuery({ queryKey: ['emis'], queryFn: getEmis })
  const { data: emiSummary } = useQuery({ queryKey: ['emi-summary'], queryFn: getEmiSummary })
  const { data: subscriptions, isLoading: subsLoading } = useQuery({ queryKey: ['subscriptions'], queryFn: getSubscriptions })
  const { data: subSummary } = useQuery({ queryKey: ['subscription-summary'], queryFn: getSubscriptionSummary })
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: getAccounts })

  const createEmiMut = useMutation({
    mutationFn: () => createEmi({
      name: emiForm.name, totalAmount: emiForm.totalAmount,
      monthlyEmi: emiForm.monthlyEmi || undefined,
      interestRate: emiForm.interestRate ? Number(emiForm.interestRate) : null,
      tenureMonths: emiForm.tenureMonths ? Number(emiForm.tenureMonths) : null,
      startDate: emiForm.startDate,
      dueDay: emiForm.dueDay ? Number(emiForm.dueDay) : null,
      downPayment: emiForm.downPayment ? Number(emiForm.downPayment) : null,
      processingFee: emiForm.processingFee ? Number(emiForm.processingFee) : null,
      prepaymentAmount: emiForm.prepaymentAmount ? Number(emiForm.prepaymentAmount) : null,
      loanAccountNumber: emiForm.loanAccountNumber || null,
      notes: emiForm.notes || null, category: emiForm.category || null,
      lender: emiForm.lender || null, accountId: emiForm.accountId || null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emis'] }); queryClient.invalidateQueries({ queryKey: ['emi-summary'] }); setShowEmiCreate(false); resetEmiForm(); addToast('success', 'EMI added') },
    onError: () => addToast('error', 'Failed to add EMI'),
  })

  const updateEmiMut = useMutation({
    mutationFn: () => updateEmi(showEmiEdit!.id, emiForm),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emis'] }); queryClient.invalidateQueries({ queryKey: ['emi-summary'] }); setShowEmiEdit(null); addToast('success', 'EMI updated') },
    onError: () => addToast('error', 'Failed'),
  })

  const deleteEmiMut = useMutation({
    mutationFn: () => deleteEmi(showEmiDelete!.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emis'] }); queryClient.invalidateQueries({ queryKey: ['emi-summary'] }); setShowEmiDelete(null); addToast('success', 'EMI deleted') },
    onError: () => addToast('error', 'Failed'),
  })

  const createSubMut = useMutation({
    mutationFn: () => createSubscription({
      name: subForm.name, amount: subForm.amount,
      billingPeriod: subForm.billingPeriod,
      startDate: subForm.startDate, billingMonths: subForm.billingMonths ? Number(subForm.billingMonths) : null,
      category: subForm.category || null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); queryClient.invalidateQueries({ queryKey: ['subscription-summary'] }); setShowSubCreate(false); resetSubForm(); addToast('success', 'Subscription added') },
    onError: () => addToast('error', 'Failed'),
  })

  const updateSubMut = useMutation({
    mutationFn: () => updateSubscription(showSubEdit!.id, { ...subForm, billingMonths: subForm.billingMonths ? Number(subForm.billingMonths) : null }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); queryClient.invalidateQueries({ queryKey: ['subscription-summary'] }); setShowSubEdit(null); addToast('success', 'Updated') },
    onError: () => addToast('error', 'Failed'),
  })

  const deleteSubMut = useMutation({
    mutationFn: () => deleteSubscription(showSubDelete!.id),
    onSuccess: (data: any) => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); queryClient.invalidateQueries({ queryKey: ['subscription-summary'] }); queryClient.invalidateQueries({ queryKey: ['accounts'] }); setShowSubDelete(null); addToast('success', data?.message || 'Deleted') },
    onError: (err: any) => addToast('error', err?.response?.data?.error || 'Failed'),
  })

  const paySubMut = useMutation({
    mutationFn: (id: string) => paySubscription(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); queryClient.invalidateQueries({ queryKey: ['subscription-summary'] }); queryClient.invalidateQueries({ queryKey: ['accounts'] }); addToast('success', 'Payment recorded') },
    onError: () => addToast('error', 'Failed to record payment'),
  })

  const skipSubMut = useMutation({
    mutationFn: (id: string) => skipSubscription(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); queryClient.invalidateQueries({ queryKey: ['subscription-summary'] }); addToast('success', 'Skipped for this period') },
    onError: () => addToast('error', 'Failed to skip'),
  })

  const payEmiMut = useMutation({
    mutationFn: (id: string) => payEmi(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emis'] }); queryClient.invalidateQueries({ queryKey: ['emi-summary'] }); queryClient.invalidateQueries({ queryKey: ['accounts'] }); addToast('success', 'EMI payment recorded') },
    onError: () => addToast('error', 'Failed to record EMI payment'),
  })

  const addExtraPayMut = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => addExtraEmiPayment(id, amount),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emis'] }); queryClient.invalidateQueries({ queryKey: ['accounts'] }); setShowExtraPayment(null); setExtraPaymentAmount(0); addToast('success', 'Extra payment recorded') },
    onError: () => addToast('error', 'Failed to record extra payment'),
  })

  const unskipSubMut = useMutation({
    mutationFn: (id: string) => unskipSubscription(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); queryClient.invalidateQueries({ queryKey: ['subscription-summary'] }); addToast('success', 'Unskipped') },
    onError: () => addToast('error', 'Failed to unskip'),
  })

  function resetEmiForm() { setEmiForm({ name: '', totalAmount: 0, monthlyEmi: 0, interestRate: '', tenureMonths: '', startDate: '', dueDay: '', downPayment: '', processingFee: '', prepaymentAmount: '', loanAccountNumber: '', notes: '', category: '', lender: '', accountId: '' }) }
  function resetSubForm() { setSubForm({ name: '', amount: 0, billingPeriod: 'MONTHLY', startDate: '', billingMonths: '', category: '', active: true }) }

  function openEmiEdit(emi: Emi) {
    setEmiForm({
      name: emi.name, totalAmount: emi.totalAmount, monthlyEmi: emi.monthlyEmi,
      interestRate: emi.interestRate?.toString() || '',
      tenureMonths: emi.tenureMonths?.toString() || '',
      startDate: emi.startDate?.split('T')[0],
      dueDay: emi.dueDay?.toString() || '',
      downPayment: emi.downPayment?.toString() || '',
      processingFee: emi.processingFee?.toString() || '',
      prepaymentAmount: emi.prepaymentAmount?.toString() || '',
      loanAccountNumber: emi.loanAccountNumber || '',
      notes: emi.notes || '', category: emi.category || '',
      lender: emi.lender || '', accountId: emi.accountId || '',
    })
    setShowEmiEdit(emi)
  }

  function openSubEdit(sub: Subscription) {
    const billingMonths = sub.endDate && sub.startDate ? Math.round((new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) + 1 : ''
    setSubForm({
      name: sub.name, amount: sub.amount, billingPeriod: sub.billingPeriod || 'MONTHLY',
      startDate: sub.startDate?.split('T')[0], billingMonths: billingMonths.toString(),
      category: sub.category || '', active: sub.active,
    })
    setShowSubEdit(sub)
  }

  const filteredEmis = useMemo(() => {
    if (!filterMonth || !emis) return emis || []
    const d = new Date(filterMonth)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
    return emis.filter(e => new Date(e.startDate) <= end && new Date(e.endDate) >= start)
  }, [emis, filterMonth])

  const filteredSubs = useMemo(() => {
    if (!filterMonth || !subscriptions) return subscriptions || []
    const d = new Date(filterMonth)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
    return subscriptions.filter(s => new Date(s.startDate) <= end && (!s.endDate || new Date(s.endDate) >= start))
  }, [subscriptions, filterMonth])

  if (emisLoading || subsLoading) return <LoadingSpinner />

  const mainAccounts = accounts?.filter(a => !a.isSubAccount) || []
  const totalMonthlyFixed = (emiSummary?.totalMonthlyEmi || 0) + (subSummary?.totalMonthly || 0)

  const monthTotalEmi = filteredEmis.reduce((s, e) => s + e.monthlyEmi, 0)
  const monthTotalSub = filteredSubs.reduce((s, sub) => s + sub.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 font-[Outfit]">Fixed Expenses</h1>
          <p className="mt-1 text-sm text-gray-400">EMIs, debts, and subscriptions — your ongoing fixed costs</p>
        </div>
      </div>

      <Card className="animate-slide-up stagger-1">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-gray-400" /><span className="text-sm text-gray-400">Filter by month:</span></div>
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none" />
          {filterMonth && <button onClick={() => setFilterMonth('')} className="text-xs text-[#A29BFE] hover:text-[#6C5CE7] transition-colors">Clear</button>}
        </div>
      </Card>

      {filterMonth && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="animate-slide-up"><p className="text-xs text-gray-400">Active EMIs</p><p className="text-lg font-bold text-[#FF6B6B]">{filteredEmis.length} ({formatCurrency(monthTotalEmi)}/mo)</p></Card>
          <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}><p className="text-xs text-gray-400">Active Subscriptions</p><p className="text-lg font-bold text-[#A855F7]">{filteredSubs.length} ({formatCurrency(monthTotalSub)}/mo)</p></Card>
          <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}><p className="text-xs text-gray-400">Total Fixed This Month</p><p className="text-lg font-bold text-gray-100">{formatCurrency(monthTotalEmi + monthTotalSub)}/mo</p></Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="animate-slide-up stagger-2">
          <div className="flex items-center gap-3">
            <div className="icon-container bg-gradient-to-br from-[#FF6B6B]/20 to-[#FF6B9D]/10">
              <TrendingDown className="h-5 w-5 text-[#FF6B6B]" />
            </div>
            <div><p className="text-xs font-medium text-gray-400">Total Monthly Fixed</p><p className="text-xl font-bold font-data text-gray-100">{formatCurrency(totalMonthlyFixed)}</p></div>
          </div>
        </Card>
        <Card className="animate-slide-up stagger-3">
          <div className="flex items-center gap-3">
            <div className="icon-container bg-gradient-to-br from-[#FFB84D]/20 to-[#FF6B6B]/10">
              <Banknote className="h-5 w-5 text-[#FFB84D]" />
            </div>
            <div><p className="text-xs font-medium text-gray-400">EMI Monthly</p><p className="text-xl font-bold font-data text-gray-100">{emiSummary ? formatCurrency(emiSummary.totalMonthlyEmi) : '$0'}</p></div>
          </div>
        </Card>
        <Card className="animate-slide-up stagger-4">
          <div className="flex items-center gap-3">
            <div className="icon-container bg-gradient-to-br from-[#A855F7]/20 to-[#6C5CE7]/10">
              <Repeat className="h-5 w-5 text-[#A855F7]" />
            </div>
            <div><p className="text-xs font-medium text-gray-400">Subscriptions Monthly</p><p className="text-xl font-bold font-data text-gray-100">{subSummary ? formatCurrency(subSummary.totalMonthly) : '$0'}</p></div>
          </div>
        </Card>
        <Card className="animate-slide-up stagger-5">
          <div className="flex items-center gap-3">
            <div className="icon-container bg-gradient-to-br from-[#00D2FF]/20 to-[#3B82F6]/10">
              <Calendar className="h-5 w-5 text-[#00D2FF]" />
            </div>
            <div><p className="text-xs font-medium text-gray-400">Active / Total</p><p className="text-xl font-bold font-data text-gray-100">{(emiSummary?.activeCount || 0) + (subSummary?.activeCount || 0)}</p></div>
          </div>
        </Card>
      </div>

      <Card className="animate-slide-up stagger-6">
        <button onClick={() => setShowMLInfo(!showMLInfo)} className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Info className="h-4 w-4 text-[#00D2FF]" />
            How fixed expenses affect the ML prediction
          </div>
          {showMLInfo ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
        </button>
        {showMLInfo && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-gray-400 mb-3">Every EMI and subscription you add is automatically included when the ML model analyzes a purchase. Here&apos;s how each piece flows in:</p>
            {ML_CONTRIBUTION.map((item, i) => (
              <div key={i} className={cn('rounded-xl p-3 border', item.bg)}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={cn('text-sm font-bold', item.color)}>{item.label}</p>
                    <p className="text-xs text-gray-400 mt-1">Your input: <span className="font-mono text-gray-300">{item.field}</span></p>
                  </div>
                  <Badge variant="neutral" className="shrink-0 ml-2">→ {item.mlField}</Badge>
                </div>
                <p className="text-xs text-gray-300 mt-2">{item.effect}</p>
              </div>
            ))}
            <div className="mt-3 rounded-xl border border-[#00D2FF]/20 bg-[#00D2FF]/5 p-3">
              <p className="text-xs font-bold text-[#00D2FF]">Bottom line for ML:</p>
              <p className="text-xs text-[#00D2FF]/80 mt-1">Higher fixed expenses → less monthly surplus → lower available money → the model is more likely to say NO or recommend using savings.</p>
            </div>
          </div>
        )}
      </Card>

      <div className="flex gap-2 border-b border-white/[0.06]">
        <button onClick={() => setActiveTab('emi')} className={cn('flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all duration-200', activeTab === 'emi' ? 'border-[#FF6B6B] text-[#FF6B6B]' : 'border-transparent text-gray-500 hover:text-gray-300')}>
          <Banknote className="h-4 w-4" /> EMI & Debt {emiSummary && emiSummary.activeCount > 0 && <span className="ml-1 rounded-full bg-[#FF6B6B]/20 px-2 py-0.5 text-xs text-[#FF6B6B]">{emiSummary.activeCount}</span>}
        </button>
        <button onClick={() => setActiveTab('subscription')} className={cn('flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all duration-200', activeTab === 'subscription' ? 'border-[#A855F7] text-[#A855F7]' : 'border-transparent text-gray-500 hover:text-gray-300')}>
          <Repeat className="h-4 w-4" /> Subscriptions {subSummary && subSummary.activeCount > 0 && <span className="ml-1 rounded-full bg-[#A855F7]/20 px-2 py-0.5 text-xs text-[#A855F7]">{subSummary.activeCount}</span>}
        </button>
      </div>

      {activeTab === 'emi' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-end">
            <button onClick={() => { resetEmiForm(); setShowEmiCreate(true) }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF6B9D] px-5 py-2.5 text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(255,107,107,0.3)] transition-all duration-200"><Plus className="h-4 w-4" /> Add EMI</button>
          </div>

          {(!filteredEmis || filteredEmis.length === 0) ? (
            <Card><div className="flex flex-col items-center justify-center py-12 text-center"><Banknote className="mb-3 h-12 w-12 text-gray-600" /><p className="text-lg font-medium text-gray-400">{filterMonth ? 'No EMIs in this month' : 'No EMI or Debt'}</p><p className="mt-1 text-sm text-gray-500">{filterMonth ? 'Try a different month.' : 'Add your loans and EMIs here.'}</p></div></Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredEmis.map((emi, index) => {
                const remAmount = (emi as any).computedRemaining ?? emi.remainingAmount
                const progress = emi.totalAmount > 0 ? ((emi.totalAmount - remAmount) / emi.totalAmount) * 100 : 0
                const daysLeft = emi.daysToEnd ?? 0
                const monthsLeft = emi.remainingMonths ?? 0
                const totalInterest = (emi as any).totalInterest ?? 0
                const totalPayable = (emi as any).totalPayable ?? 0

                return (
                  <Card key={emi.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-[#FF6B6B]/10 p-2"><TrendingDown className="h-5 w-5 text-[#FF6B6B]" /></div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-100">{emi.name}</p>
                            {emi.category && <Badge variant="info">{emi.category}</Badge>}
                          </div>
                          {emi.lender && <p className="text-xs text-gray-400">{emi.lender}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEmiEdit(emi)} className="rounded-lg p-1.5 hover:bg-white/[0.06] transition-colors"><Pencil className="h-4 w-4 text-gray-500" /></button>
                        <button onClick={() => setShowEmiDelete(emi)} className="rounded-lg p-1.5 hover:bg-[#FF6B6B]/10 transition-colors"><Trash2 className="h-4 w-4 text-[#FF6B6B]/70" /></button>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div className="flex justify-between text-sm"><span className="text-gray-400">Monthly EMI</span><span className="font-bold font-data text-[#FF6B6B]">{formatCurrency(emi.monthlyEmi)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-400">Remaining</span><span className="font-bold font-data text-gray-200">{formatCurrency(remAmount)} <span className="text-gray-500 font-normal">/ {formatCurrency(emi.totalAmount)}</span></span></div>

                      {totalPayable > 0 && (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 text-center"><span className="text-gray-500">Total payable</span><p className="font-bold font-data text-gray-200 mt-1">{formatCurrency(totalPayable)}</p></div>
                          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 text-center"><span className="text-gray-500">Total interest</span><p className="font-bold font-data text-[#FFB84D] mt-1">{formatCurrency(totalInterest)}</p></div>
                        </div>
                      )}

                      <div><div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FFB84D] transition-all duration-700" style={{ width: `${Math.min(progress, 100)}%` }} /></div><p className="mt-1.5 text-right text-xs font-data text-gray-500">{Math.round(progress)}% paid</p></div>

                      {emi.isActive && emi.isPaidThisMonth && (
                        <div className="flex items-center justify-between rounded-xl bg-[#00E6A7]/5 border border-[#00E6A7]/20 p-3">
                          <div className="flex items-center gap-2">
                            <div className="rounded-full bg-[#00E6A7]/20 p-1"><Clock className="h-3.5 w-3.5 text-[#00E6A7]" /></div>
                            <p className="text-sm font-medium text-[#00E6A7]">Paid for this month</p>
                          </div>
                          {emi.nextPaymentDate && <p className="text-xs text-[#00E6A7]/70">Next: {new Date(emi.nextPaymentDate).toLocaleDateString()}</p>}
                        </div>
                      )}
                      {emi.isActive && !emi.isPaidThisMonth && (
                        <div className="flex flex-col items-center gap-3 rounded-xl bg-[#FF6B6B]/5 border border-[#FF6B6B]/20 p-4">
                          <p className="text-sm font-semibold text-[#FF6B6B]">Due for this month</p>
                          <button
                            onClick={() => payEmiMut.mutate(emi.id)}
                            disabled={payEmiMut.isPending}
                            className="rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF6B9D] px-6 py-2.5 text-sm font-bold text-white hover:shadow-[0_0_20px_rgba(255,107,107,0.3)] disabled:opacity-50 transition-all w-full"
                          >
                            Pay EMI — {formatCurrency(emi.monthlyEmi)}
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
                        <div className="text-center"><p className="text-2xl font-bold font-data text-gray-100">{monthsLeft}</p><p className="text-xs text-gray-500">months left</p></div>
                        <div className="text-center"><p className="text-2xl font-bold font-data text-gray-100">{daysLeft}</p><p className="text-xs text-gray-500">days remaining</p></div>
                      </div>

                      {emi.isActive && (
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => { getAmortizationSchedule(emi.id).then(s => setShowAmortization({ emi, schedule: s })) }} className="rounded-xl border border-[#00D2FF]/20 bg-[#00D2FF]/5 px-3 py-1.5 text-xs font-semibold text-[#00D2FF] hover:bg-[#00D2FF]/10 transition-colors">
                            Amortization Schedule
                          </button>
                          <button onClick={() => { getEmiPaymentHistory(emi.id).then(t => setShowPaymentHistory({ emi, transactions: t })) }} className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/[0.08] transition-colors">
                            Payment History
                          </button>
                          <button onClick={() => { setExtraPaymentAmount(0); setShowExtraPayment(emi) }} className="rounded-xl border border-[#FFB84D]/20 bg-[#FFB84D]/5 px-3 py-1.5 text-xs font-semibold text-[#FFB84D] hover:bg-[#FFB84D]/10 transition-colors">
                            + Extra Payment
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="danger">→ fixed expense</Badge>
                        {emi.isPaidThisMonth && <Badge variant="success">Paid</Badge>}
                        {!emi.isActive && <Badge variant="neutral">Completed</Badge>}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'subscription' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-end">
            <button onClick={() => { resetSubForm(); setShowSubCreate(true) }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#6C5CE7] px-5 py-2.5 text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all duration-200"><Plus className="h-4 w-4" /> Add Subscription</button>
          </div>

          {(!filteredSubs || filteredSubs.length === 0) ? (
            <Card><div className="flex flex-col items-center justify-center py-12 text-center"><Repeat className="mb-3 h-12 w-12 text-gray-600" /><p className="text-lg font-medium text-gray-400">{filterMonth ? 'No subscriptions in this month' : 'No subscriptions'}</p><p className="mt-1 text-sm text-gray-500">{filterMonth ? 'Try a different month.' : 'Add your subscriptions here.'}</p></div></Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredSubs.map((sub, index) => {
                const daysToBilling = sub.daysToBilling ?? 0
                const isDue = daysToBilling <= 0
                const amountRemaining = sub.monthsRemaining != null && sub.monthsRemaining > 0 ? sub.amount * sub.monthsRemaining : null

                return (
                  <Card key={sub.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn('rounded-xl p-2', sub.active ? 'bg-[#A855F7]/10' : 'bg-white/[0.04]')}>
                          <Repeat className={cn('h-5 w-5', sub.active ? 'text-[#A855F7]' : 'text-gray-500')} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-100">{sub.name}</p>
                            {!sub.active && <Badge variant="neutral">Completed</Badge>}
                          </div>
                          {sub.category && <p className="text-xs text-gray-400">{sub.category}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openSubEdit(sub)} className="rounded-lg p-1.5 hover:bg-white/[0.06] transition-colors"><Pencil className="h-4 w-4 text-gray-500" /></button>
                        <button onClick={() => setShowSubDelete(sub)} className="rounded-lg p-1.5 hover:bg-[#FF6B6B]/10 transition-colors"><Trash2 className="h-4 w-4 text-[#FF6B6B]/70" /></button>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{sub.billingPeriod === 'YEARLY' ? 'Yearly' : 'Monthly'}</span>
                        <span className="font-bold font-data text-[#FF6B6B]">{formatCurrency(sub.amount)}<span className="text-xs text-gray-500 font-normal">/{sub.billingPeriod === 'YEARLY' ? 'yr' : 'mo'}</span></span>
                      </div>
                      {sub.billingPeriod === 'YEARLY' && (
                        <div className="flex justify-between text-sm"><span className="text-gray-400">Monthly equivalent</span><span className="font-bold font-data text-gray-300">{formatCurrency(sub.monthlyAmount || sub.amount / 12)}</span></div>
                      )}
                      <div className="flex justify-between text-sm"><span className="text-gray-400">Next billing</span><span className="font-semibold text-gray-200">{new Date(sub.nextBilling).toLocaleDateString()}</span></div>

                      {sub.active && sub.isSkipped && (
                        <div className="flex items-center justify-between rounded-xl bg-[#FFB84D]/5 border border-[#FFB84D]/20 p-3">
                          <div className="flex items-center gap-2">
                            <div className="rounded-full bg-[#FFB84D]/20 p-1"><Clock className="h-3.5 w-3.5 text-[#FFB84D]" /></div>
                            <p className="text-sm font-medium text-[#FFB84D]">Skipped for this period</p>
                          </div>
                          <button
                            onClick={() => unskipSubMut.mutate(sub.id)}
                            disabled={unskipSubMut.isPending}
                            className="rounded-lg bg-[#FFB84D] px-4 py-1.5 text-xs font-bold text-gray-900 hover:bg-[#FFA000] disabled:opacity-50 transition-colors"
                          >
                            Unskip
                          </button>
                        </div>
                      )}
                      {sub.active && isDue && !sub.isSkipped && (
                        <div className="flex flex-col items-center gap-3 rounded-xl bg-[#FF6B6B]/5 border border-[#FF6B6B]/20 p-4">
                          <p className="text-sm font-semibold text-[#FF6B6B]">Due for this month</p>
                          <button
                            onClick={() => paySubMut.mutate(sub.id)}
                            disabled={paySubMut.isPending}
                            className="rounded-xl bg-gradient-to-r from-[#A855F7] to-[#6C5CE7] px-6 py-2.5 text-sm font-bold text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50 transition-all w-full"
                          >
                            Pay Now — {formatCurrency(sub.amount)}
                          </button>
                        </div>
                      )}
                      {sub.active && !isDue && !sub.isSkipped && (
                        <div className="flex items-center justify-between rounded-xl bg-[#00E6A7]/5 border border-[#00E6A7]/20 p-3">
                          <div className="flex items-center gap-2">
                            <div className="rounded-full bg-[#00E6A7]/20 p-1"><Clock className="h-3.5 w-3.5 text-[#00E6A7]" /></div>
                            <p className="text-sm font-medium text-[#00E6A7]">Paid for this month</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-xs text-[#00E6A7]/70">Next: {new Date(sub.nextBilling).toLocaleDateString()}</p>
                            <button
                              onClick={() => skipSubMut.mutate(sub.id)}
                              disabled={skipSubMut.isPending}
                              className="rounded-lg border border-[#FFB84D]/30 text-[#FFB84D] px-3 py-1.5 text-xs font-semibold hover:bg-[#FFB84D]/10 disabled:opacity-50 transition-colors"
                            >
                              Skip
                            </button>
                          </div>
                        </div>
                      )}

                      {sub.endDate && (
                        <>
                          <div className="flex justify-between text-sm"><span className="text-gray-400">Ends</span><span className="font-medium text-gray-200">{new Date(sub.endDate).toLocaleDateString()}</span></div>
                          {sub.daysToEnd != null && sub.monthsRemaining != null && sub.active && (
                            <div className="grid grid-cols-2 gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
                              <div className="text-center"><p className="text-2xl font-bold font-data text-gray-100">{sub.monthsRemaining}</p><p className="text-xs text-gray-500">months left</p></div>
                              <div className="text-center"><p className="text-2xl font-bold font-data text-gray-100">{sub.daysToEnd}</p><p className="text-xs text-gray-500">days remaining</p></div>
                            </div>
                          )}
                          {amountRemaining != null && sub.active && (
                            <div className="flex justify-between text-sm"><span className="text-gray-400">Total remaining</span><span className="font-bold font-data text-gray-200">{formatCurrency(amountRemaining)}</span></div>
                          )}
                        </>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="danger">→ fixed expense</Badge>
                        {sub.isSkipped ? <Badge variant="warning">Skipped</Badge> : isDue && sub.active ? <Badge variant="danger">Due now</Badge> : sub.active ? <Badge variant="success">Paid</Badge> : null}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      <Modal open={showEmiCreate || !!showEmiEdit} onClose={() => { setShowEmiCreate(false); setShowEmiEdit(null) }} title={showEmiCreate ? 'Add EMI / Debt' : 'Edit EMI'}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-300">Loan Name <span className="text-[#FF6B6B]">*</span></label><input type="text" value={emiForm.name} onChange={e => setEmiForm({ ...emiForm, name: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" placeholder="e.g. Home Loan, Car EMI" /></div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="mb-3 text-xs font-bold text-gray-500">REQUIRED</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-300">Loan Amount <span className="text-[#FF6B6B]">*</span></label><input type="number" value={emiForm.totalAmount} onChange={e => setEmiForm({ ...emiForm, totalAmount: Number(e.target.value) })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" /></div>
              <div><label className="block text-sm font-medium text-gray-300">Interest Rate (%)</label><input type="number" step="0.1" value={emiForm.interestRate} onChange={e => setEmiForm({ ...emiForm, interestRate: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" placeholder="e.g. 9.5" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><label className="block text-sm font-medium text-gray-300">Tenure (mo) <span className="text-[#FF6B6B]">*</span></label><input type="number" min="1" value={emiForm.tenureMonths} onChange={e => setEmiForm({ ...emiForm, tenureMonths: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" placeholder="e.g. 60" /></div>
              <div><label className="block text-sm font-medium text-gray-300">EMI Due Day</label><select value={emiForm.dueDay} onChange={e => setEmiForm({ ...emiForm, dueDay: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none"><option value="">Select day</option>{Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><label className="block text-sm font-medium text-gray-300">Start Date <span className="text-[#FF6B6B]">*</span></label><input type="date" value={emiForm.startDate} onChange={e => setEmiForm({ ...emiForm, startDate: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none" /></div>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] p-4">
            <p className="mb-3 text-xs font-bold text-gray-500">CALCULATION</p>
            <div><label className="block text-sm font-medium text-gray-300">Monthly EMI <span className="text-xs text-gray-500 font-normal">(leave empty to auto-calculate)</span></label><input type="number" value={emiForm.monthlyEmi} onChange={e => setEmiForm({ ...emiForm, monthlyEmi: Number(e.target.value) })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" placeholder="Auto-calculated from principal, rate & tenure" /></div>
          </div>

          <div className="rounded-xl border border-white/[0.06] p-4">
            <p className="mb-3 text-xs font-bold text-gray-500">OPTIONAL DETAILS</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-300">Lender</label><input type="text" value={emiForm.lender} onChange={e => setEmiForm({ ...emiForm, lender: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" placeholder="e.g. HDFC Bank" /></div>
              <div><label className="block text-sm font-medium text-gray-300">Category</label><select value={emiForm.category} onChange={e => setEmiForm({ ...emiForm, category: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none"><option value="">Select</option><option value="Home">Home</option><option value="Vehicle">Vehicle</option><option value="Education">Education</option><option value="Personal">Personal</option><option value="Electronics">Electronics</option><option value="Business">Business</option><option value="Credit Card">Credit Card</option><option value="Other">Other</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><label className="block text-sm font-medium text-gray-300">Down Payment</label><input type="number" value={emiForm.downPayment} onChange={e => setEmiForm({ ...emiForm, downPayment: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" /></div>
              <div><label className="block text-sm font-medium text-gray-300">Processing Fee</label><input type="number" value={emiForm.processingFee} onChange={e => setEmiForm({ ...emiForm, processingFee: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><label className="block text-sm font-medium text-gray-300">Loan Account #</label><input type="text" value={emiForm.loanAccountNumber} onChange={e => setEmiForm({ ...emiForm, loanAccountNumber: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" placeholder="e.g. L123456789" /></div>
              <div><label className="block text-sm font-medium text-gray-300">Account</label><select value={emiForm.accountId} onChange={e => setEmiForm({ ...emiForm, accountId: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none"><option value="">Auto-create sub-account</option>{mainAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            </div>
            <div className="mt-3"><label className="block text-sm font-medium text-gray-300">Notes</label><textarea value={emiForm.notes} onChange={e => setEmiForm({ ...emiForm, notes: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" rows={2} placeholder="Any notes about this loan..." /></div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowEmiCreate(false); setShowEmiEdit(null) }} className="rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/[0.06] transition-colors">Cancel</button>
            <button onClick={() => showEmiCreate ? createEmiMut.mutate() : updateEmiMut.mutate()} disabled={!emiForm.name || !emiForm.totalAmount || !emiForm.startDate} className="rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF6B9D] px-5 py-2.5 text-sm font-bold text-white hover:shadow-[0_0_20px_rgba(255,107,107,0.3)] disabled:opacity-40 transition-all">{showEmiCreate ? 'Create' : 'Save'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={showSubCreate || !!showSubEdit} onClose={() => { setShowSubCreate(false); setShowSubEdit(null) }} title={showSubCreate ? 'Add Subscription' : 'Edit Subscription'}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-300">Name <span className="text-[#FF6B6B]">*</span></label><input type="text" value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#A855F7]/50 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20" placeholder="e.g. Netflix, Gym" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-300">Amount <span className="text-[#FF6B6B]">*</span></label><input type="number" value={subForm.amount} onChange={e => setSubForm({ ...subForm, amount: Number(e.target.value) })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#A855F7]/50 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20" /></div>
            <div><label className="block text-sm font-medium text-gray-300">Billing Period</label><select value={subForm.billingPeriod} onChange={e => setSubForm({ ...subForm, billingPeriod: e.target.value as any })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#A855F7]/50 focus:outline-none"><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-300">Start Date <span className="text-[#FF6B6B]">*</span></label><input type="date" value={subForm.startDate} onChange={e => setSubForm({ ...subForm, startDate: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#A855F7]/50 focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-300">Total Months (optional)</label><input type="number" value={subForm.billingMonths} onChange={e => setSubForm({ ...subForm, billingMonths: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#A855F7]/50 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20" placeholder="e.g. 12" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-300">Category</label><select value={subForm.category} onChange={e => setSubForm({ ...subForm, category: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#A855F7]/50 focus:outline-none"><option value="">Select</option><option value="Entertainment">Entertainment</option><option value="Health/Fitness">Health/Fitness</option><option value="Software">Software</option><option value="Utilities">Utilities</option><option value="Other">Other</option></select></div>
          {!!showSubEdit && <label className="flex items-center gap-2 mt-4"><input type="checkbox" checked={subForm.active} onChange={e => setSubForm({ ...subForm, active: e.target.checked })} className="rounded border-white/[0.2] bg-white/[0.04] text-[#A855F7] focus:ring-[#A855F7]/30" /><span className="text-sm font-medium text-gray-300">Active subscription</span></label>}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowSubCreate(false); setShowSubEdit(null) }} className="rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/[0.06] transition-colors">Cancel</button>
            <button onClick={() => showSubCreate ? createSubMut.mutate() : updateSubMut.mutate()} disabled={!subForm.name || !subForm.amount || !subForm.startDate} className="rounded-xl bg-gradient-to-r from-[#A855F7] to-[#6C5CE7] px-5 py-2.5 text-sm font-bold text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-40 transition-all">{showSubCreate ? 'Create' : 'Save'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!showSubDelete} onClose={() => setShowSubDelete(null)} title="Delete Subscription">
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-[#FF6B6B]/5 border border-[#FF6B6B]/20 p-3 text-sm text-[#FF6B6B]"><AlertTriangle className="h-4 w-4" /> This will permanently delete this subscription record.</div>
          <p className="text-sm text-gray-300">Delete <strong className="text-gray-100">{showSubDelete?.name}</strong>?</p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowSubDelete(null)} className="rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/[0.06] transition-colors">Cancel</button>
            <button onClick={() => deleteSubMut.mutate()} className="rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF6B9D] px-5 py-2.5 text-sm font-bold text-white hover:shadow-[0_0_20px_rgba(255,107,107,0.3)]">Delete</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!showEmiDelete} onClose={() => setShowEmiDelete(null)} title="Delete EMI">
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-[#FF6B6B]/5 border border-[#FF6B6B]/20 p-3 text-sm text-[#FF6B6B]"><AlertTriangle className="h-4 w-4" /> This will permanently delete this EMI record.</div>
          <p className="text-sm text-gray-300">Delete <strong className="text-gray-100">{showEmiDelete?.name}</strong>?</p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowEmiDelete(null)} className="rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/[0.06] transition-colors">Cancel</button>
            <button onClick={() => deleteEmiMut.mutate()} className="rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF6B9D] px-5 py-2.5 text-sm font-bold text-white hover:shadow-[0_0_20px_rgba(255,107,107,0.3)]">Delete</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!showAmortization} onClose={() => setShowAmortization(null)} title={`Amortization Schedule — ${showAmortization?.emi.name || ''}`}>
        {showAmortization && (
          <div className="max-h-96 overflow-auto custom-scrollbar">
            <div className="mb-4 flex gap-4 text-sm bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
              <span className="text-gray-400">Loan: <strong className="font-data text-gray-100">{formatCurrency(showAmortization.emi.totalAmount)}</strong></span>
              <span className="text-gray-400">Rate: <strong className="font-data text-[#FFB84D]">{showAmortization.emi.interestRate ?? 0}%</strong></span>
              <span className="text-gray-400">EMI: <strong className="font-data text-[#FF6B6B]">{formatCurrency(showAmortization.emi.monthlyEmi)}</strong></span>
            </div>
            <table className="w-full text-xs">
              <thead><tr className="border-b border-white/[0.06] text-left text-gray-500 uppercase tracking-wider font-semibold"><th className="p-2 pb-3">#</th><th className="p-2 pb-3">Opening</th><th className="p-2 pb-3">EMI</th><th className="p-2 pb-3">Interest</th><th className="p-2 pb-3">Principal</th><th className="p-2 pb-3">Closing</th></tr></thead>
              <tbody>
                {showAmortization.schedule.map(entry => (
                  <tr key={entry.period} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="p-2 font-data text-gray-400">{entry.period}</td>
                    <td className="p-2 font-data text-gray-300">{formatCurrency(entry.openingBalance)}</td>
                    <td className="p-2 font-data text-gray-300">{formatCurrency(entry.emi)}</td>
                    <td className="p-2 font-data text-[#FFB84D]">{formatCurrency(entry.interest)}</td>
                    <td className="p-2 font-data text-[#00E6A7]">{formatCurrency(entry.principal)}</td>
                    <td className="p-2 font-data text-gray-300">{formatCurrency(entry.closingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal open={!!showPaymentHistory} onClose={() => setShowPaymentHistory(null)} title={`Payment History — ${showPaymentHistory?.emi.name || ''}`}>
        {showPaymentHistory && showPaymentHistory.transactions.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">No payments recorded yet.</p>
        )}
        {showPaymentHistory && showPaymentHistory.transactions.length > 0 && (
          <div className="max-h-96 overflow-auto custom-scrollbar">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-white/[0.06] text-left text-gray-500 uppercase tracking-wider font-semibold"><th className="p-2 pb-3">Date</th><th className="p-2 pb-3">Amount</th><th className="p-2 pb-3">Account</th><th className="p-2 pb-3">Description</th></tr></thead>
              <tbody>
                {showPaymentHistory.transactions.map(t => (
                  <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="p-2 text-gray-400">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="p-2 font-data font-bold text-[#FF6B6B]">{formatCurrency(t.amount)}</td>
                    <td className="p-2 text-gray-300">{t.account?.name || '-'}</td>
                    <td className="p-2 text-gray-400">{t.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal open={!!showExtraPayment} onClose={() => { setShowExtraPayment(null); setExtraPaymentAmount(0) }} title="Record Extra Payment">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Record a pre-payment towards the principal of <strong className="text-gray-100">{showExtraPayment?.name}</strong>.</p>
          <div><label className="block text-sm font-medium text-gray-300">Amount</label><input type="number" value={extraPaymentAmount} onChange={e => setExtraPaymentAmount(Number(e.target.value))} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 focus:border-[#FFB84D]/50 focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/20" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowExtraPayment(null); setExtraPaymentAmount(0) }} className="rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/[0.06] transition-colors">Cancel</button>
            <button onClick={() => { if (showExtraPayment && extraPaymentAmount > 0) { addExtraPayMut.mutate({ id: showExtraPayment.id, amount: extraPaymentAmount }) } }} disabled={extraPaymentAmount <= 0} className="rounded-xl bg-gradient-to-r from-[#FFB84D] to-[#FF9800] px-5 py-2.5 text-sm font-bold text-gray-900 hover:shadow-[0_0_20px_rgba(255,184,77,0.3)] disabled:opacity-40 transition-all">Submit Payment</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
