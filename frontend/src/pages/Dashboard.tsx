import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getDashboard } from '../services/dashboard.service'
import { getEmiSummary } from '../services/emi.service'
import { getSubscriptionSummary } from '../services/subscription.service'
import { updateFinancialProfile } from '../services/financial.service'
import { Link } from 'react-router-dom'
import { Card, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { formatCurrency } from '../utils/formatters'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { Wallet, TrendingUp, TrendingDown, DollarSign, PiggyBank, Shield, AlertTriangle, CheckCircle2, Clock, ArrowRight, Circle, ChevronDown, ChevronUp, Settings } from 'lucide-react'
import { cn } from '../utils/cn'

const COLORS = ['#6C5CE7', '#00D2FF', '#00E6A7', '#FF6B9D', '#FFB84D', '#A855F7']

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'High': return 'danger'
    case 'Medium': return 'warning'
    case 'Low': return 'info'
    default: return 'neutral'
  }
}

function getProgressColor(pct: number) {
  if (pct >= 75) return 'progress-gradient-green'
  if (pct >= 50) return 'progress-gradient-blue'
  if (pct >= 25) return 'progress-gradient-yellow'
  return 'progress-gradient-red'
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 rounded-xl skeleton" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl skeleton" style={{ animationDelay: `${i * 0.1}s` }} />)}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 h-80 rounded-2xl skeleton" style={{ animationDelay: '0.5s' }} />
        <div className="h-80 rounded-2xl skeleton" style={{ animationDelay: '0.6s' }} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-2xl skeleton" style={{ animationDelay: '0.7s' }} />
        <div className="h-64 rounded-2xl skeleton" style={{ animationDelay: '0.8s' }} />
      </div>
    </div>
  )
}

export function Dashboard() {
  const queryClient = useQueryClient()
  const [pieMode, setPieMode] = useState<'income' | 'expense'>('expense')
  const [includeSavings, setIncludeSavings] = useState(true)
  const [showAllTasks, setShowAllTasks] = useState(false)
  const [showAllRecent, setShowAllRecent] = useState(false)
  const [showLimitEditor, setShowLimitEditor] = useState(false)
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  })
  const { data: emiSummary } = useQuery({ queryKey: ['emi-summary'], queryFn: getEmiSummary })
  const { data: subSummary } = useQuery({ queryKey: ['subscription-summary'], queryFn: getSubscriptionSummary })

  const limitMutation = useMutation({
    mutationFn: (emergencyUsageLimit: number) => updateFinancialProfile({ emergencyUsageLimit } as any),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard'] }); setShowLimitEditor(false) },
  })

  if (isLoading) return <DashboardSkeleton />
  if (error) return (
    <div className="rounded-2xl border border-[#FF6B6B]/20 bg-[#FF6B6B]/5 p-6 text-[#FF6B6B]">
      <p className="font-medium">Failed to load dashboard data</p>
      <p className="mt-1 text-sm text-[#FF6B6B]/70">Please try again later.</p>
    </div>
  )
  if (!data) return null

  const { summary, recentTransactions, accounts, todayTasks, categories, accountAlerts } = data
  const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0)
  const savingsBalance = accounts.find(a => a.type === 'Savings')?.currentBalance || 0
  const efBalance = accounts.find(a => a.type === 'EmergencyFund')?.currentBalance || 0

  const incomeCategories = categories.filter(c => c.type === 'INCOME')
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE')
  const pieData = (pieMode === 'expense' ? expenseCategories : incomeCategories)
    .map(c => ({
      name: c.name,
      value: recentTransactions.filter(t => t.categoryId === c.id && t.transactionType === (pieMode === 'expense' ? 'EXPENSE' : 'INCOME')).reduce((s, t) => s + t.amount, 0),
    }))
    .filter(d => d.value > 0)

  const barData = [
    { name: 'Income', amount: summary.totalIncome, fill: 'url(#gradGreen)' },
    { name: 'Expenses', amount: summary.totalExpense, fill: 'url(#gradRed)' },
    { name: 'Balance', amount: summary.balance, fill: 'url(#gradBlue)' },
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="rounded-xl border border-white/[0.1] bg-[#1E1B2E]/95 p-3 shadow-xl backdrop-blur-xl text-sm">
          <p className="font-medium text-gray-200">{label || payload[0].name}</p>
          {payload.map((p: any) => (
            <p key={p.name} className="font-data text-gray-300 mt-0.5">{p.name}: <span className="font-semibold text-gray-100">{formatCurrency(p.value)}</span></p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-100 font-[Outfit]">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">Your financial overview at a glance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="animate-slide-up stagger-1">
          <div className="flex items-center gap-3">
            <div className="icon-container bg-gradient-to-br from-[#3B82F6]/20 to-[#00D2FF]/10">
              <DollarSign className="h-5 w-5 text-[#00D2FF]" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Monthly Income</p>
              <p className="text-lg font-bold font-data gradient-text-success">{formatCurrency(summary.totalIncome)}</p>
            </div>
          </div>
        </Card>
        <Card className="animate-slide-up stagger-2">
          <div className="flex items-center gap-3">
            <div className="icon-container bg-gradient-to-br from-[#FF6B6B]/20 to-[#FF6B9D]/10">
              <TrendingDown className="h-5 w-5 text-[#FF6B6B]" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Monthly Expenses</p>
              <p className="text-lg font-bold font-data gradient-text-danger">{formatCurrency(summary.totalExpense)}</p>
            </div>
          </div>
        </Card>
        <Card className="animate-slide-up stagger-3">
          <div className="flex items-center gap-3">
            <div className="icon-container bg-gradient-to-br from-[#00E6A7]/20 to-[#00D2FF]/10">
              <TrendingUp className="h-5 w-5 text-[#00E6A7]" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Balance</p>
              <p className={cn('text-lg font-bold font-data', summary.balance >= 0 ? 'gradient-text-success' : 'gradient-text-danger')}>{formatCurrency(summary.balance)}</p>
            </div>
          </div>
        </Card>
        <Card className="animate-slide-up stagger-4">
          <div className="flex items-center gap-3">
            <div className="icon-container bg-gradient-to-br from-[#A855F7]/20 to-[#6C5CE7]/10">
              <Wallet className="h-5 w-5 text-[#A855F7]" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">
                Total{includeSavings ? ' (all)' : ' (excl. Sav/EF)'}
                <button onClick={() => setIncludeSavings(!includeSavings)} className="ml-1.5 text-[#A29BFE] hover:text-[#6C5CE7] transition-colors text-[10px] font-semibold uppercase tracking-wide">{includeSavings ? 'hide' : 'show'}</button>
              </p>
              <p className="text-lg font-bold font-data gradient-text-purple">
                {includeSavings
                  ? formatCurrency(totalBalance)
                  : formatCurrency(totalBalance - savingsBalance - efBalance)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="animate-slide-up stagger-5">
          <div className="flex items-center gap-3">
            <div className="icon-container bg-gradient-to-br from-[#FF6B6B]/20 to-[#FFB84D]/10">
              <TrendingDown className="h-5 w-5 text-[#FFB84D]" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Fixed Expenses / mo</p>
              <p className="text-lg font-bold font-data gradient-text-warning">
                {formatCurrency((emiSummary?.totalMonthlyEmi || 0) + (subSummary?.totalMonthly || 0))}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 animate-slide-up stagger-6">
          <CardTitle>Income vs Expenses</CardTitle>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <defs>
                  <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E6A7" />
                    <stop offset="100%" stopColor="#00D2FF" />
                  </linearGradient>
                  <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF6B6B" />
                    <stop offset="100%" stopColor="#FF6B9D" />
                  </linearGradient>
                  <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6C5CE7" />
                    <stop offset="100%" stopColor="#00D2FF" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B6F8A' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6B6F8A' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="animate-slide-up stagger-7">
          <div className="flex items-center justify-between mb-3">
            <CardTitle>Categories</CardTitle>
            <button onClick={() => setPieMode(pieMode === 'expense' ? 'income' : 'expense')} className="text-xs font-semibold text-[#A29BFE] hover:text-[#6C5CE7] transition-colors">
              {pieMode === 'expense' ? 'Show Income' : 'Show Expense'}
            </button>
          </div>
          <div className="h-56">
            {pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} strokeWidth={0}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Tasks & Transactions Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="animate-slide-up stagger-7">
          <CardTitle>Today's Tasks</CardTitle>
          {/* Quick stats bar */}
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Total Balance</p>
              <p className="text-sm font-bold font-data text-gray-200">{formatCurrency(totalBalance)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Savings</p>
              <p className="text-sm font-bold font-data text-[#00E6A7]">{formatCurrency(savingsBalance)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Emergency</p>
              <p className="text-sm font-bold font-data text-[#FFB84D]">{formatCurrency(efBalance)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Fixed</p>
              <p className="text-sm font-bold font-data text-[#FF6B6B]">{formatCurrency((emiSummary?.totalMonthlyEmi || 0) + (subSummary?.totalMonthly || 0))}/mo</p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {todayTasks.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No pending tasks</p>
            ) : (
              (showAllTasks ? todayTasks : todayTasks.slice(0, 3)).map((task, index) => (
                <div key={task.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-all duration-200" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="relative">
                    <Circle className="h-4 w-4 shrink-0 text-gray-500" />
                    <div className="absolute inset-0 rounded-full bg-[#6C5CE7]/30 blur-md animate-pulse-dot" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{task.title}</p>
                    {task.dueDate && <p className="text-xs text-gray-500"><Clock className="inline h-3 w-3 mr-1" />{new Date(task.dueDate).toLocaleDateString()}</p>}
                  </div>
                  <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                </div>
              ))
            )}
            {todayTasks.length > 3 && (
              <button onClick={() => setShowAllTasks(!showAllTasks)} className="flex w-full items-center justify-center gap-1 pt-2 text-xs font-semibold text-[#A29BFE] hover:text-[#6C5CE7] transition-colors">
                {showAllTasks ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show all ({todayTasks.length})</>}
              </button>
            )}
          </div>
        </Card>

        <Card className="animate-slide-up stagger-8">
          <CardTitle>Recent Transactions</CardTitle>
          <div className="mt-3 space-y-2">
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No transactions yet</p>
            ) : (
              (showAllRecent ? recentTransactions : recentTransactions.slice(0, 3)).map((tx, index) => (
                <div key={tx.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-all duration-200" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('rounded-xl p-2', tx.transactionType === 'INCOME' ? 'bg-[#00E6A7]/10' : 'bg-[#FF6B6B]/10')}>
                      {tx.transactionType === 'INCOME' ? <TrendingUp className="h-4 w-4 text-[#00E6A7]" /> : <TrendingDown className="h-4 w-4 text-[#FF6B6B]" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{tx.description || tx.category?.name || 'Transaction'}</p>
                      <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()} {tx.account ? `· ${tx.account.name}` : ''}</p>
                    </div>
                  </div>
                  <span className={cn('text-sm font-bold font-data shrink-0', tx.transactionType === 'INCOME' ? 'text-[#00E6A7]' : 'text-[#FF6B6B]')}>
                    {tx.transactionType === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))
            )}
            {recentTransactions.length > 3 && (
              <button onClick={() => setShowAllRecent(!showAllRecent)} className="flex w-full items-center justify-center gap-1 pt-2 text-xs font-semibold text-[#A29BFE] hover:text-[#6C5CE7] transition-colors">
                {showAllRecent ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show all ({recentTransactions.length})</>}
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* Account Alerts */}
      {accountAlerts.length > 0 && (
        <Card className="border-[#FFB84D]/20 bg-[#FFB84D]/5 animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-[#FFB84D]" />
            <CardTitle className="text-[#FFB84D]">Account Alerts</CardTitle>
          </div>
          <div className="space-y-1">
            {accountAlerts.map(a => (
              <p key={a.accountId} className="text-sm text-[#FFB84D]/80">
                {a.name}: <span className="font-data">{formatCurrency(a.balance)}</span> (threshold: <span className="font-data">{formatCurrency(a.threshold)}</span>)
              </p>
            ))}
          </div>
        </Card>
      )}

      {/* Bottom Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-slide-up stagger-1">
          <div className="flex items-center gap-3">
            <div className="icon-container bg-gradient-to-br from-[#00E6A7]/20 to-[#00D2FF]/10">
              <PiggyBank className="h-5 w-5 text-[#00E6A7]" />
            </div>
            <div><p className="text-xs text-gray-400 font-medium">Savings</p><p className="text-lg font-bold font-data text-[#00E6A7]">{formatCurrency(savingsBalance)}</p></div>
          </div>
        </Card>
        <Card className="animate-slide-up stagger-2">
          <div className="flex items-center gap-3">
            <div className="icon-container bg-gradient-to-br from-[#FFB84D]/20 to-[#FF6B9D]/10">
              <Shield className="h-5 w-5 text-[#FFB84D]" />
            </div>
            <div><p className="text-xs text-gray-400 font-medium">Emergency Fund</p><p className="text-lg font-bold font-data text-[#FFB84D]">{formatCurrency(efBalance)}</p></div>
          </div>
        </Card>
        <Card className="animate-slide-up stagger-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="icon-container bg-gradient-to-br from-[#FF6B6B]/20 to-[#FF6B9D]/10">
                  <AlertTriangle className="h-5 w-5 text-[#FF6B6B]" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Emergency Limit</p>
                  <p className="text-lg font-bold font-data text-[#FF6B6B]">{summary.emergencyUsageLimit}%</p>
                </div>
              </div>
              <button onClick={() => setShowLimitEditor(!showLimitEditor)} className="rounded-lg p-1.5 hover:bg-white/[0.06] transition-all duration-200"><Settings className="h-4 w-4 text-gray-500" /></button>
            </div>
            {showLimitEditor && (
              <div className="flex gap-1">
                {[30, 40, 50, 60, 70].map(v => (
                  <button key={v} onClick={() => limitMutation.mutate(v)} className={cn('flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition-all duration-200', summary.emergencyUsageLimit === v ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF6B9D] text-white shadow-[0_0_12px_rgba(255,107,107,0.3)]' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-gray-200 border border-white/[0.06]')}>{v}%</button>
                ))}
              </div>
            )}
            <div className="mt-1">
              {(() => {
                const maxUsage = efBalance * (summary.emergencyUsageLimit / 100)
                const pct = maxUsage > 0 ? Math.min(100, ((summary.totalExpense || 0) / maxUsage) * 100) : 0
                return (
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div className={cn('h-2 rounded-full transition-all duration-700', pct > 90 ? 'progress-gradient-red' : pct > 60 ? 'progress-gradient-yellow' : 'progress-gradient-green')} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-500 font-data">{pct.toFixed(0)}% of {summary.emergencyUsageLimit}% limit used ({formatCurrency(maxUsage)} max)</p>
                  </div>
                )
              })()}
            </div>
          </div>
        </Card>
        <Card className="animate-slide-up stagger-4">
          <div className="flex items-center gap-3">
            <div className="icon-container bg-gradient-to-br from-[#6C5CE7]/20 to-[#A855F7]/10">
              <CheckCircle2 className="h-5 w-5 text-[#A29BFE]" />
            </div>
            <div><p className="text-xs text-gray-400 font-medium">Tasks Due Today</p><p className="text-lg font-bold font-data text-[#A29BFE]">{todayTasks.length}</p></div>
          </div>
        </Card>
      </div>

      {/* Fixed Expenses Link */}
      <Link to="/fixed-expenses" className="block animate-slide-up">
        <Card className="hover:border-[#6C5CE7]/30 transition-all duration-300 cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="icon-container bg-gradient-to-br from-[#FF6B6B]/20 to-[#FFB84D]/10">
              <TrendingDown className="h-5 w-5 text-[#FF6B6B]" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 font-medium">Fixed Expenses (EMI + Subscriptions)</p>
              <p className="text-lg font-bold font-data gradient-text-danger">
                {emiSummary || subSummary
                  ? `${formatCurrency((emiSummary?.totalMonthlyEmi || 0) + (subSummary?.totalMonthly || 0))}/mo`
                  : 'No fixed expenses'}
              </p>
              <p className="text-xs text-gray-500">
                {(emiSummary?.activeCount || 0) + (subSummary?.activeCount || 0)} active items
                {subSummary && subSummary.dueSoon > 0 ? ` · ${subSummary.dueSoon} due soon` : ''}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-500 shrink-0 group-hover:text-[#A29BFE] group-hover:translate-x-1 transition-all duration-300" />
          </div>
        </Card>
      </Link>
    </div>
  )
}
