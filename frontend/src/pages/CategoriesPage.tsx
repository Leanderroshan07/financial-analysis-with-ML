import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/categories.service'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Plus, Pencil, Trash2, Star, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '../utils/cn'
import type { Category } from '../types'
import { useToast } from '../hooks/useToast'

export function CategoriesPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [typeTab, setTypeTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE')
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<Category | null>(null)
  const [showDelete, setShowDelete] = useState<Category | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState({ name: '', type: 'EXPENSE' as string, isEssential: false, parentId: '' })

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
  })

  const createMutation = useMutation({
    mutationFn: () => createCategory({ name: form.name, type: form.type as Category['type'], isEssential: form.isEssential, parentId: form.parentId || undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); setShowCreate(false); setForm({ name: '', type: 'EXPENSE', isEssential: false, parentId: '' }); addToast('success', 'Category created') },
    onError: (err: any) => addToast('error', err?.response?.data?.error || 'Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: () => updateCategory(showEdit!.id, { name: form.name, isEssential: form.isEssential }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); setShowEdit(null); addToast('success', 'Category updated') },
    onError: () => addToast('error', 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCategory(showDelete!.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); setShowDelete(null); addToast('success', 'Category deleted') },
    onError: (err: any) => addToast('error', err?.response?.data?.error || 'Failed'),
  })

  if (isLoading) return <LoadingSpinner />

  const filtered = categories?.filter(c => c.type === typeTab) || []
  const mainCats = filtered.filter(c => !c.parentId)
  const subCatsMap: Record<string, Category[]> = {}
  filtered.filter(c => c.parentId).forEach(sc => {
    if (!subCatsMap[sc.parentId!]) subCatsMap[sc.parentId!] = []
    subCatsMap[sc.parentId!].push(sc)
  })

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div><h1 className="text-2xl font-bold text-gray-100 font-[Outfit]">Categories</h1><p className="mt-1 text-sm text-gray-400">Manage main categories and sub-categories</p></div>
        <button onClick={() => { setForm({ name: '', type: typeTab, isEssential: false, parentId: '' }); setShowCreate(true) }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C5CE7] to-[#A855F7] px-5 py-2.5 text-sm font-semibold text-white hover:shadow-[0_0_24px_rgba(108,92,231,0.4)] hover:brightness-110 transition-all duration-300 active:scale-[0.97]"><Plus className="h-4 w-4" /> Add Category</button>
      </div>

      <div className="flex gap-1 border-b border-white/[0.06]">
        <button onClick={() => setTypeTab('EXPENSE')} className={cn('px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all duration-200', typeTab === 'EXPENSE' ? 'border-[#FF6B6B] text-[#FF6B6B]' : 'border-transparent text-gray-500 hover:text-gray-300')}>Expense</button>
        <button onClick={() => setTypeTab('INCOME')} className={cn('px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all duration-200', typeTab === 'INCOME' ? 'border-[#00E6A7] text-[#00E6A7]' : 'border-transparent text-gray-500 hover:text-gray-300')}>Income</button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mainCats.map((cat, index) => {
          const subs = subCatsMap[cat.id] || []
          const isExpanded = expanded[cat.id]

          return (
            <Card key={cat.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold', cat.type === 'INCOME' ? 'bg-[#00E6A7]/10 text-[#00E6A7]' : 'bg-[#FF6B6B]/10 text-[#FF6B6B]')}>{cat.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-200">{cat.name}</p>
                      {cat.isEssential && <Star className="h-3.5 w-3.5 fill-[#FFB84D] text-[#FFB84D]" />}
                    </div>
                    <Badge variant={cat.type === 'INCOME' ? 'success' : 'danger'}>{cat.type}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  {subs.length > 0 && (
                    <button onClick={() => toggleExpand(cat.id)} className="rounded-lg p-1.5 hover:bg-white/[0.06] transition-all duration-200">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                    </button>
                  )}
                  <button onClick={() => { setForm({ name: cat.name, type: cat.type, isEssential: cat.isEssential, parentId: '' }); setShowEdit(cat) }} className="rounded-lg p-1.5 hover:bg-white/[0.06] transition-all duration-200"><Pencil className="h-4 w-4 text-gray-500" /></button>
                  <button onClick={() => setShowDelete(cat)} className="rounded-lg p-1.5 hover:bg-[#FF6B6B]/10 transition-all duration-200"><Trash2 className="h-4 w-4 text-[#FF6B6B]/60" /></button>
                </div>
              </div>

              {subs.length > 0 && (
                <>
                  <p className="mt-2 text-xs text-gray-500">{subs.length} sub-categor{subs.length === 1 ? 'y' : 'ies'}</p>
                  {isExpanded && (
                    <div className="mt-2 space-y-1.5 border-t border-white/[0.06] pt-2">
                      {subs.map(sub => (
                        <div key={sub.id} className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.04] px-3 py-2 transition-all duration-200 hover:bg-white/[0.04]">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-300">{sub.name}</span>
                            {sub.isEssential && <Star className="h-3 w-3 fill-[#FFB84D] text-[#FFB84D]" />}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setForm({ name: sub.name, type: sub.type, isEssential: sub.isEssential, parentId: '' }); setShowEdit(sub) }} className="text-xs text-[#A29BFE] hover:text-[#6C5CE7] transition-colors">Edit</button>
                            <button onClick={() => setShowDelete(sub)} className="text-xs text-[#FF6B6B]/70 hover:text-[#FF6B6B] transition-colors">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </Card>
          )
        })}
      </div>

      <Modal open={showCreate || !!showEdit} onClose={() => { setShowCreate(false); setShowEdit(null) }} title={showCreate ? (form.parentId ? 'Add Sub-Category' : 'Add Category') : 'Edit Category'}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-300">Name</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20" /></div>
          {showCreate && (
            <>
              <div><label className="block text-sm font-medium text-gray-300">Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20"><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select></div>
              <div><label className="block text-sm font-medium text-gray-300">Parent Category (optional)</label><select value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })} className="mt-1 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20"><option value="">None (main category)</option>{mainCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </>
          )}
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isEssential} onChange={e => setForm({ ...form, isEssential: e.target.checked })} className="rounded border-white/[0.2] bg-white/[0.04] text-[#6C5CE7] focus:ring-[#6C5CE7]/30" /><span className="text-sm text-gray-300">Essential category</span></label>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowCreate(false); setShowEdit(null) }} className="rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/[0.06] transition-all duration-200">Cancel</button>
            <button onClick={() => showCreate ? createMutation.mutate() : updateMutation.mutate()} disabled={!form.name} className="rounded-xl bg-gradient-to-r from-[#6C5CE7] to-[#A855F7] px-5 py-2.5 text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(108,92,231,0.3)] transition-all duration-200 disabled:opacity-40">{showCreate ? 'Create' : 'Save'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete Category">
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-[#FF6B6B]/5 border border-[#FF6B6B]/20 p-3 text-sm text-[#FF6B6B]"><AlertTriangle className="h-4 w-4" /> Categories with sub-categories or transactions cannot be deleted.</div>
          <p className="text-sm text-gray-400">Delete <strong className="text-gray-200">{showDelete?.name}</strong>?</p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowDelete(null)} className="rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/[0.06] transition-all duration-200">Cancel</button>
            <button onClick={() => deleteMutation.mutate()} className="rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF6B9D] px-5 py-2.5 text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(255,107,107,0.3)] transition-all duration-200">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
