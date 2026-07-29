import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getFinancialProfile, updateFinancialProfile } from '../services/financial.service'
import { getSavings, updateSavings } from '../services/data.service'
import { Card, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { useToast } from '../hooks/useToast'
import { Save, PiggyBank, Shield, TrendingDown, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ProfilePage() {
  const { addToast } = useToast()

  const profileQuery = useQuery({ queryKey: ['financial-profile'], queryFn: getFinancialProfile })
  const savingsQuery = useQuery({ queryKey: ['savings'], queryFn: getSavings })

  const [emergencyFund, setEmergencyFund] = useState(0)
  const [emergencyUsageLimit, setEmergencyUsageLimit] = useState(50)
  const [currency, setCurrency] = useState('USD')
  const [currentSavings, setCurrentSavings] = useState(0)

  useEffect(() => {
    if (profileQuery.data) { setEmergencyFund(profileQuery.data.emergencyFund); setEmergencyUsageLimit(profileQuery.data.emergencyUsageLimit); setCurrency(profileQuery.data.currency) }
  }, [profileQuery.data])
  useEffect(() => { if (savingsQuery.data) setCurrentSavings(savingsQuery.data.currentSavings) }, [savingsQuery.data])

  const profileMutation = useMutation({
    mutationFn: () => updateFinancialProfile({ emergencyFund, emergencyUsageLimit, currency }),
    onSuccess: () => { addToast('success', 'Financial profile updated') },
    onError: () => addToast('error', 'Failed to update profile'),
  })
  const savingsMutation = useMutation({
    mutationFn: () => updateSavings({ currentSavings }),
    onSuccess: () => { addToast('success', 'Savings updated') },
    onError: () => addToast('error', 'Failed to update savings'),
  })

  const loading = profileQuery.isLoading || savingsQuery.isLoading
  if (loading) return <LoadingSpinner />

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-100 font-[Outfit]">Financial Settings</h1>
        <p className="mt-1 text-sm text-gray-400">Manage your savings and emergency fund</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-slide-up stagger-1">
        <Link to="/fixed-expenses" className="block">
          <Card className="flex items-center justify-between hover:border-[#6C5CE7]/30 transition-all duration-300 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="icon-container bg-gradient-to-br from-[#FF6B6B]/20 to-[#FF6B9D]/10">
                <TrendingDown className="h-5 w-5 text-[#FF6B6B]" />
              </div>
              <div>
                <p className="font-semibold text-gray-200">Fixed Expenses</p>
                <p className="text-xs text-gray-500">EMIs, debts, and subscriptions — all your fixed costs</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-[#A29BFE] group-hover:translate-x-1 transition-all duration-300" />
          </Card>
        </Link>
      </div>

      <Card className="animate-slide-up stagger-2">
        <CardTitle className="flex items-center gap-2"><PiggyBank className="h-5 w-5 text-[#00E6A7]" /> Current Savings</CardTitle>
        <form onSubmit={(e) => { e.preventDefault(); savingsMutation.mutate() }} className="mt-4 space-y-3">
          <Input type="number" min="0" step="0.01" value={currentSavings} onChange={(e) => setCurrentSavings(parseFloat(e.target.value) || 0)} />
          <Button type="submit" loading={savingsMutation.isPending}><Save className="h-4 w-4" /> Save Savings</Button>
        </form>
      </Card>

      <Card className="animate-slide-up stagger-3">
        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-[#A855F7]" /> Emergency Fund & Currency</CardTitle>
        <form onSubmit={(e) => { e.preventDefault(); profileMutation.mutate() }} className="mt-4 space-y-4">
          <Input label="Emergency Fund" type="number" min="0" step="0.01" value={emergencyFund} onChange={(e) => setEmergencyFund(parseFloat(e.target.value) || 0)} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">Emergency Usage Limit</label>
            <select value={emergencyUsageLimit} onChange={(e) => setEmergencyUsageLimit(parseInt(e.target.value))} className="block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20">
              {[30, 40, 50, 60, 70].map((v) => <option key={v} value={v}>{v}%</option>)}
            </select>
          </div>
          <Input label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          <Button type="submit" loading={profileMutation.isPending}><Save className="h-4 w-4" /> Save Settings</Button>
        </form>
      </Card>
    </div>
  )
}
