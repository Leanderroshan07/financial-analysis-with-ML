import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getTasks, createTask, updateTask, deleteTask, toggleTask, createSubtask, updateSubtask, deleteSubtask } from '../services/tasks.service'
import { getCategories } from '../services/categories.service'
import { Card, CardTitle } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Plus, Pencil, Trash2, CheckCircle2, Circle, Clock, Flag, ListChecks, Target } from 'lucide-react'
import { cn } from '../utils/cn'
import type { Task, Subtask } from '../types'
import { useToast } from '../hooks/useToast'

const PRIORITIES = ['Low', 'Medium', 'High']

function getPriorityColor(p: string) {
  switch (p) { case 'High': return 'danger'; case 'Medium': return 'warning'; case 'Low': return 'info'; default: return 'neutral' }
}

export function TasksPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showCompleted, setShowCompleted] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<Task | null>(null)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [newSubtask, setNewSubtask] = useState('')
  const [form, setForm] = useState<any>({ title: '', description: '', priority: 'Medium', dueDate: '', categoryId: '', isGoal: false, targetAmount: '', goalPeriodStart: '', goalPeriodEnd: '' })

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', showCompleted],
    queryFn: () => getTasks({ completed: showCompleted ? undefined : false }),
  })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => getCategories() })

  const createMutation = useMutation({
    mutationFn: () => createTask({
      ...form,
      targetAmount: form.targetAmount ? Number(form.targetAmount) : null,
      goalPeriodStart: form.goalPeriodStart || null,
      goalPeriodEnd: form.goalPeriodEnd || null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setShowCreate(false); resetForm(); addToast('success', 'Task created') },
    onError: () => addToast('error', 'Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: () => updateTask(showEdit!.id, {
      ...form,
      targetAmount: form.targetAmount ? Number(form.targetAmount) : null,
      goalPeriodStart: form.goalPeriodStart || null,
      goalPeriodEnd: form.goalPeriodEnd || null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setShowEdit(null); addToast('success', 'Task updated') },
    onError: () => addToast('error', 'Failed'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => toggleTask(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); addToast('success', 'Task toggled') },
    onError: () => addToast('error', 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); addToast('success', 'Task deleted') },
    onError: () => addToast('error', 'Failed'),
  })

  const subtaskMutation = useMutation({
    mutationFn: ({ taskId, title }: { taskId: string; title: string }) => createSubtask(taskId, title),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setNewSubtask('') },
    onError: () => addToast('error', 'Failed'),
  })

  const subtaskToggleMutation = useMutation({
    mutationFn: ({ taskId, id, completed }: { taskId: string; id: string; completed: boolean }) => updateSubtask(taskId, id, { completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  if (isLoading) return <LoadingSpinner />

  function resetForm() { setForm({ title: '', description: '', priority: 'Medium', dueDate: '', categoryId: '', isGoal: false, targetAmount: '', goalPeriodStart: '', goalPeriodEnd: '' }) }

  const openEdit = (t: Task) => {
    setForm({
      title: t.title, description: t.description || '', priority: t.priority,
      dueDate: t.dueDate?.split('T')[0] || '', categoryId: t.categoryId || '',
      isGoal: t.isGoal, targetAmount: t.targetAmount?.toString() || '',
      goalPeriodStart: t.goalPeriodStart?.split('T')[0] || '',
      goalPeriodEnd: t.goalPeriodEnd?.split('T')[0] || '',
    })
    setShowEdit(t)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div><h1 className="text-2xl font-bold text-gray-100 font-[Outfit]">Tasks</h1><p className="mt-1 text-sm text-gray-400">Manage your to-do list and goals</p></div>
        <button onClick={() => { resetForm(); setShowCreate(true) }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C5CE7] to-[#A855F7] px-5 py-2.5 text-sm font-semibold text-white hover:shadow-[0_0_24px_rgba(108,92,231,0.4)] hover:brightness-110 transition-all duration-300 active:scale-[0.97]"><Plus className="h-4 w-4" /> Add Task</button>
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} className="rounded border-white/[0.2] bg-white/[0.04] text-[#6C5CE7] focus:ring-[#6C5CE7]/30" />
        <span className="text-sm text-gray-400">Show completed</span>
      </label>

      <div className="space-y-3">
        {tasks?.length === 0 ? <p className="text-sm text-gray-500 py-8 text-center">No tasks</p> : (
          tasks?.map((task, index) => {
            const doneSubtasks = task.subtasks?.filter(s => s.completed).length || 0
            const totalSubtasks = task.subtasks?.length || 0
            return (
              <Card key={task.id} className={cn('animate-slide-up', task.completed && 'opacity-60')} style={{ animationDelay: `${index * 0.04}s` }}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleMutation.mutate(task.id)} className="mt-0.5 transition-transform duration-200 hover:scale-110">
                    {task.completed ? <CheckCircle2 className="h-5 w-5 text-[#00E6A7] drop-shadow-[0_0_6px_rgba(0,230,167,0.5)]" /> : <Circle className="h-5 w-5 text-gray-600 hover:text-gray-400" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn('text-sm font-semibold', task.completed ? 'line-through text-gray-500' : 'text-gray-200')}>{task.title}</p>
                      <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                      {task.isGoal && <Badge variant="success">Goal</Badge>}
                    </div>
                    {task.description && <p className="mt-1 text-xs text-gray-500">{task.description}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      {task.dueDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(task.dueDate).toLocaleDateString()}</span>}
                      {task.category && <Badge variant="neutral">{task.category.name}</Badge>}
                      {task.isGoal && task.targetAmount && <span className="flex items-center gap-1 font-data"><Target className="h-3 w-3" />Target: ${task.targetAmount}</span>}
                      {totalSubtasks > 0 && <span className="flex items-center gap-1"><ListChecks className="h-3 w-3" />{doneSubtasks}/{totalSubtasks}</span>}
                    </div>
                    {task.isGoal && task.targetAmount && task.goalPeriodEnd && (
                      <div className="mt-2 h-2 w-full max-w-xs rounded-full bg-white/[0.06] overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all duration-700', task.completed ? 'progress-gradient-green' : 'progress-gradient-blue')} style={{ width: `${Math.min(100, (doneSubtasks / Math.max(1, totalSubtasks)) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)} className="rounded-lg p-1.5 hover:bg-white/[0.06] transition-all duration-200"><ListChecks className="h-4 w-4 text-gray-500" /></button>
                    <button onClick={() => openEdit(task)} className="rounded-lg p-1.5 hover:bg-white/[0.06] transition-all duration-200"><Pencil className="h-4 w-4 text-gray-500" /></button>
                    <button onClick={() => deleteMutation.mutate(task.id)} className="rounded-lg p-1.5 hover:bg-[#FF6B6B]/10 transition-all duration-200"><Trash2 className="h-4 w-4 text-[#FF6B6B]/60" /></button>
                  </div>
                </div>
                {expandedTask === task.id && (
                  <div className="mt-3 ml-8 border-l-2 border-white/[0.08] pl-4 space-y-2">
                    {task.subtasks?.map(st => (
                      <div key={st.id} className="flex items-center gap-2">
                        <input type="checkbox" checked={st.completed} onChange={() => subtaskToggleMutation.mutate({ taskId: task.id, id: st.id, completed: !st.completed })} className="rounded border-white/[0.2] bg-white/[0.04] text-[#6C5CE7] focus:ring-[#6C5CE7]/30" />
                        <span className={cn('text-sm', st.completed ? 'line-through text-gray-500' : 'text-gray-300')}>{st.title}</span>
                        <button onClick={() => deleteSubtask(task.id, st.id).then(() => queryClient.invalidateQueries({ queryKey: ['tasks'] }))} className="ml-auto rounded-lg p-1 hover:bg-[#FF6B6B]/10 transition-all duration-200"><Trash2 className="h-3 w-3 text-[#FF6B6B]/60" /></button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <input type="text" value={newSubtask} onChange={e => setNewSubtask(e.target.value)} placeholder="Add subtask..." className="flex-1 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs text-gray-200 placeholder:text-gray-600 focus:border-[#6C5CE7]/50 focus:outline-none" />
                      <button onClick={() => { if (newSubtask.trim()) subtaskMutation.mutate({ taskId: task.id, title: newSubtask }) }} className="text-xs font-semibold text-[#A29BFE] hover:text-[#6C5CE7] transition-colors">Add</button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      <Modal open={showCreate || !!showEdit} onClose={() => { setShowCreate(false); setShowEdit(null) }} title={showCreate ? 'Add Task' : 'Edit Task'}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-300">Title</label><input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" /></div>
          <div><label className="block text-sm font-medium text-gray-300">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-300">Priority</label><select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none">{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-300">Category</label><select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none"><option value="">None</option>{categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-300">Due Date</label><input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none" /></div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isGoal} onChange={e => setForm({ ...form, isGoal: e.target.checked })} className="rounded border-white/[0.2] bg-white/[0.04] text-[#6C5CE7] focus:ring-[#6C5CE7]/30" /><span className="text-sm text-gray-300">Goal mode</span></label>
          {form.isGoal && (
            <div className="space-y-3 border-l-2 border-[#6C5CE7]/30 pl-3">
              <div><label className="block text-sm font-medium text-gray-300">Target Amount</label><input type="number" value={form.targetAmount} onChange={e => setForm({ ...form, targetAmount: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-300">Start</label><input type="date" value={form.goalPeriodStart} onChange={e => setForm({ ...form, goalPeriodStart: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-300">End</label><input type="date" value={form.goalPeriodEnd} onChange={e => setForm({ ...form, goalPeriodEnd: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none" /></div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowCreate(false); setShowEdit(null) }} className="rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/[0.06] transition-all duration-200">Cancel</button>
            <button onClick={() => showCreate ? createMutation.mutate() : updateMutation.mutate()} disabled={!form.title} className="rounded-xl bg-gradient-to-r from-[#6C5CE7] to-[#A855F7] px-5 py-2.5 text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(108,92,231,0.3)] transition-all duration-200 disabled:opacity-40">{showCreate ? 'Create' : 'Save'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
