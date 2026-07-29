import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getPurchaseAdvice } from '../services/purchase.service'
import { getFinancialSummary } from '../services/financial.service'
import { RecommendationCard } from '../components/RecommendationCard'
import { Card, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { useToast } from '../hooks/useToast'
import { ShoppingCart, DollarSign, Settings2, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '../utils/formatters'

export function PurchaseAdvisor() {
  const { addToast } = useToast()
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [filterMonth, setFilterMonth] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [income, setIncome] = useState('')
  const [fixedExpense, setFixedExpense] = useState('')
  const [variableExpense, setVariableExpense] = useState('')
  const [savings, setSavings] = useState('')
  const [emergencyFund, setEmergencyFund] = useState('')
  const [emergencyLimit, setEmergencyLimit] = useState(50)
  const [useOverrides, setUseOverrides] = useState(false)

  const { data: summary } = useQuery({
    queryKey: ['financial-summary', filterMonth],
    queryFn: () => getFinancialSummary(filterMonth || undefined),
  })

  useEffect(() => {
    if (summary) {
      setIncome(summary.totalIncome.toString())
      setFixedExpense(summary.totalFixedExpense.toString())
      setVariableExpense(summary.totalVariableExpense.toString())
      setSavings(summary.currentSavings.toString())
      setEmergencyFund(summary.emergencyFund.toString())
      setEmergencyLimit(summary.emergencyUsageLimit)
    }
  }, [summary])

  const mutation = useMutation({
    mutationFn: (p: {
      price: number; currency: string; month?: string;
      totalIncome?: number; totalFixedExpense?: number; totalVariableExpense?: number;
      currentSavings?: number; emergencyFund?: number; emergencyUsageLimit?: number;
    }) => getPurchaseAdvice(p.price, p.currency, { month: p.month,
      totalIncome: p.totalIncome,
      totalFixedExpense: p.totalFixedExpense,
      totalVariableExpense: p.totalVariableExpense,
      currentSavings: p.currentSavings,
      emergencyFund: p.emergencyFund,
      emergencyUsageLimit: p.emergencyUsageLimit,
    }),
    onError: (err: any) => {
      addToast('error', err.response?.data?.error?.message || 'Failed to get advice')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const p = parseFloat(price)
    if (!price || isNaN(p) || p <= 0) {
      addToast('error', 'Please enter a valid purchase price')
      return
    }
    mutation.mutate({
      price: p,
      currency,
      month: filterMonth || undefined,
      ...(useOverrides && {
        totalIncome: parseFloat(income) || undefined,
        totalFixedExpense: parseFloat(fixedExpense) || undefined,
        totalVariableExpense: parseFloat(variableExpense) || undefined,
        currentSavings: parseFloat(savings) || undefined,
        emergencyFund: parseFloat(emergencyFund) || undefined,
        emergencyUsageLimit: emergencyLimit || undefined,
      }),
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-100 font-[Outfit]">Purchase Advisor</h1>
        <p className="mt-1 text-sm text-gray-400">
          Get AI-powered recommendations on whether to make a purchase
        </p>
      </div>

      <Card className="animate-slide-up stagger-1">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-[#6C5CE7]" />
            <CardTitle>What do you want to buy?</CardTitle>
          </div>
          <p className="text-sm text-gray-500">
            Enter the purchase price below. Your financial data is auto-loaded for the analysis.
          </p>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 15000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Month:</span>
              <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-gray-200 w-40 focus:border-[#6C5CE7]/50 focus:outline-none" />
              {filterMonth && <button onClick={() => setFilterMonth('')} className="text-xs text-[#A29BFE] hover:text-[#6C5CE7] transition-colors">Clear</button>}
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-gray-200 focus:border-[#6C5CE7]/50 focus:outline-none"
            >
              <option value="USD">$ USD</option>
              <option value="INR">₹ INR</option>
              <option value="EUR">€ EUR</option>
              <option value="GBP">£ GBP</option>
            </select>
            <Button type="submit" loading={mutation.isPending}>
              <DollarSign className="h-4 w-4" />
              Analyze
            </Button>
          </div>
        </form>
      </Card>

      <Card className="animate-slide-up stagger-2">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Settings2 className="h-4 w-4 text-gray-500" />
            Advanced: Customize Financial Data
          </div>
          {showAdvanced ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-[#6C5CE7]/5 border border-[#6C5CE7]/20 p-3 text-xs text-[#A29BFE]">
              <p className="font-medium">Your current financial data (auto-loaded):</p>
              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 font-data">
                <span>Income: {formatCurrency(summary?.totalIncome || 0)}</span>
                <span>Fixed: {formatCurrency(summary?.totalFixedExpense || 0)}</span>
                <span>Variable: {formatCurrency(summary?.totalVariableExpense || 0)}</span>
                <span>Savings: {formatCurrency(summary?.currentSavings || 0)}</span>
                <span>Emergency: {formatCurrency(summary?.emergencyFund || 0)}</span>
                <span>Limit: {summary?.emergencyUsageLimit || 50}%</span>
              </div>
              <p className="mt-2 text-[#A29BFE]/70">Toggle the checkbox below to override these values for this prediction only.</p>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={useOverrides} onChange={e => setUseOverrides(e.target.checked)} className="rounded border-white/[0.2] bg-white/[0.04] text-[#6C5CE7] focus:ring-[#6C5CE7]/30" />
              <span className="text-gray-300">Override values for this prediction</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Total Monthly Income" type="number" value={income} onChange={e => setIncome(e.target.value)} disabled={!useOverrides} />
              <Input label="Fixed Expenses (incl. EMI/Subs)" type="number" value={fixedExpense} onChange={e => setFixedExpense(e.target.value)} disabled={!useOverrides} />
              <Input label="Variable Expenses" type="number" value={variableExpense} onChange={e => setVariableExpense(e.target.value)} disabled={!useOverrides} />
              <Input label="Current Savings" type="number" value={savings} onChange={e => setSavings(e.target.value)} disabled={!useOverrides} />
              <Input label="Emergency Fund" type="number" value={emergencyFund} onChange={e => setEmergencyFund(e.target.value)} disabled={!useOverrides} />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">Emergency Usage Limit</label>
                <select value={emergencyLimit} onChange={e => setEmergencyLimit(parseInt(e.target.value))} disabled={!useOverrides} className="block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 disabled:opacity-40 focus:border-[#6C5CE7]/50 focus:outline-none">
                  {[30, 40, 50, 60, 70].map(v => <option key={v} value={v}>{v}%</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </Card>

      {mutation.isPending && <LoadingSpinner />}

      {mutation.data && !mutation.data.success && (
        <Card className="border-[#FF6B6B]/20 bg-[#FF6B6B]/5">
          <p className="text-[#FF6B6B]">{mutation.data.error?.message || 'Prediction failed'}</p>
          <button onClick={() => mutation.reset()} className="mt-2 text-sm text-[#FF6B6B]/70 hover:text-[#FF6B6B] transition-colors underline">Try again</button>
        </Card>
      )}

      {mutation.data?.success && mutation.data.data && (
        <div className="space-y-2">
          {filterMonth && (
            <p className="text-xs text-gray-500 text-right">Based on financial data from <strong className="text-gray-300">{filterMonth}</strong></p>
          )}
          <RecommendationCard
            recommendation={mutation.data.data.recommendation}
            pattern={mutation.data.data.pattern}
            confidence={mutation.data.data.confidence}
            fundingStrategy={mutation.data.data.fundingStrategy}
            fundingBreakdown={mutation.data.data.fundingBreakdown}
            businessExplanation={mutation.data.data.businessExplanation}
            suggestions={mutation.data.data.suggestions}
            waitPeriodSuggestion={mutation.data.data.waitPeriodSuggestion}
            currency={mutation.data.data.currency}
          />
          <div className="flex justify-center">
            <button onClick={() => mutation.reset()} className="text-sm text-gray-500 hover:text-gray-300 transition-colors underline">
              Clear result & make another prediction
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
