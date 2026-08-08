import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getGoals, addMoneyToGoal, spendFromGoal, deleteGoal } from '../services/goals.service'
import { getAccounts } from '../services/accounts.service'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { formatCurrency } from '../utils/formatters'
import { Target, Plus, Minus, Trash2, Calendar } from 'lucide-react'
import { cn } from '../utils/cn'
import { useToast } from '../hooks/useToast'

function getProgressColor(pct: number) {
  if (pct >= 75) return 'progress-gradient-green'
  if (pct >= 50) return 'progress-gradient-blue'
  if (pct >= 25) return 'progress-gradient-yellow'
  return 'progress-gradient-red'
}

export function GoalsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showAddMoney, setShowAddMoney] = useState<string | null>(null)
  const [showSpend, setShowSpend] = useState<string | null>(null)
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [accountId, setAccountId] = useState('')

  const { data: goals, isLoading } = useQuery({ queryKey: ['goals'], queryFn: getGoals })
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: getAccounts })

  const addMoneyMutation = useMutation({
    mutationFn: () => addMoneyToGoal(showAddMoney!, amount, description),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); setShowAddMoney(null); setAmount(0); setDescription(''); addToast('success', 'Money added') },
    onError: () => addToast('error', 'Failed'),
  })

  const spendMutation = useMutation({
    mutationFn: () => spendFromGoal(showSpend!, amount, description, accountId || undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); setShowSpend(null); setAmount(0); setDescription(''); setAccountId(''); addToast('success', 'Spend recorded') },
    onError: () => addToast('error', 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); addToast('success', 'Goal deleted') },
    onError: () => addToast('error', 'Failed'),
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-100 font-[Outfit]">Goals</h1>
        <p className="mt-1 text-sm text-gray-400">Track your financial goals and progress</p>
      </div>

      {goals?.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-white/[0.1] p-12 text-center animate-slide-up">
          <Target className="mx-auto h-12 w-12 text-gray-600" />
          <p className="mt-4 text-sm text-gray-400">No goals yet. Create a task with goal mode enabled to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {goals?.map((goal, index) => {
            const pct = goal.progress || 0
            return (
              <Card key={goal.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('icon-container bg-gradient-to-br', pct >= 75 ? 'from-[#00E6A7]/20 to-[#00D2FF]/10' : pct >= 50 ? 'from-[#3B82F6]/20 to-[#00D2FF]/10' : pct >= 25 ? 'from-[#FFB84D]/20 to-[#FF6B9D]/10' : 'from-[#FF6B6B]/20 to-[#FF6B9D]/10')}>
                      <Target className={cn('h-5 w-5', pct >= 75 ? 'text-[#00E6A7]' : pct >= 50 ? 'text-[#00D2FF]' : pct >= 25 ? 'text-[#FFB84D]' : 'text-[#FF6B6B]')} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-200">{goal.task?.title || 'Goal'}</p>
                      {goal.category && <Badge variant="neutral">{goal.category.name}</Badge>}
                    </div>
                  </div>
                  <button onClick={() => deleteMutation.mutate(goal.id)} className="rounded-lg p-1.5 hover:bg-[#FF6B6B]/10 transition-all duration-200"><Trash2 className="h-4 w-4 text-[#FF6B6B]/60" /></button>
                </div>

                {goal.targetAmount && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-400">Progress</span>
                      <span className="font-bold font-data text-gray-200">{pct}%</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-700', getProgressColor(pct))} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Target: <span className="font-data">{formatCurrency(goal.targetAmount)}</span></p>
                  </div>
                )}

                {goal.periodStart && goal.periodEnd && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {new Date(goal.periodStart).toLocaleDateString()} - {new Date(goal.periodEnd).toLocaleDateString()}
                  </div>
                )}

                {goal.task?.subtasks && goal.task.subtasks.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {goal.task.subtasks.map(st => (
                      <div key={st.id} className="flex items-center gap-2 text-xs">
                        <div className={cn('h-2 w-2 rounded-full', st.completed ? 'bg-[#00E6A7] shadow-[0_0_6px_rgba(0,230,167,0.5)]' : 'bg-gray-600')} />
                        <span className={st.completed ? 'line-through text-gray-500' : 'text-gray-300'}>{st.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <button onClick={() => { setShowAddMoney(goal.id); setAmount(0); setDescription('') }} className="flex items-center gap-1 rounded-xl border border-[#00E6A7]/20 bg-[#00E6A7]/5 px-3 py-1.5 text-xs font-semibold text-[#00E6A7] hover:bg-[#00E6A7]/10 transition-all duration-200"><Plus className="h-3 w-3" /> Add Money</button>
                  <button onClick={() => { setShowSpend(goal.id); setAmount(0); setDescription(''); setAccountId('') }} className="flex items-center gap-1 rounded-xl border border-[#FF6B6B]/20 bg-[#FF6B6B]/5 px-3 py-1.5 text-xs font-semibold text-[#FF6B6B] hover:bg-[#FF6B6B]/10 transition-all duration-200"><Minus className="h-3 w-3" /> Spend</button>
                </div>

                {goal.transactions && goal.transactions.length > 0 && (
                  <div className="mt-3 border-t border-white/[0.06] pt-2 space-y-1">
                    {goal.transactions.slice(0, 3).map(tx => (
                      <div key={tx.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">{tx.description || 'Transaction'}</span>
                        <span className={cn('font-data font-semibold', tx.transactionType === 'INCOME' ? 'text-[#00E6A7]' : 'text-[#FF6B6B]')}>
                          {tx.transactionType === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={!!showAddMoney} onClose={() => setShowAddMoney(null)} title="Add Money to Goal">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-300">Amount</label><input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-300">Description</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none" placeholder="Add money to goal" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowAddMoney(null)} className="rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/[0.06] transition-all duration-200">Cancel</button>
            <button onClick={() => addMoneyMutation.mutate()} disabled={amount <= 0} className="rounded-xl bg-gradient-to-r from-[#00E6A7] to-[#00D2FF] px-5 py-2.5 text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(0,230,167,0.3)] transition-all duration-200 disabled:opacity-40">Add</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!showSpend} onClose={() => setShowSpend(null)} title="Spend from Goal">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-300">Amount</label><input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-300">Description</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none" placeholder="Spend from goal" /></div>
          <div><label className="block text-sm font-medium text-gray-300">Account (optional)</label><select value={accountId} onChange={e => setAccountId(e.target.value)} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none"><option value="">Select account</option>{accounts?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowSpend(null)} className="rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/[0.06] transition-all duration-200">Cancel</button>
            <button onClick={() => spendMutation.mutate()} disabled={amount <= 0} className="rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF6B9D] px-5 py-2.5 text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(255,107,107,0.3)] transition-all duration-200 disabled:opacity-40">Spend</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
