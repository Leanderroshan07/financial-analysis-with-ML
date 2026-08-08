import { useState } from 'react'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { formatCurrency } from '../utils/formatters'
import type { FundingStrategy, FundingBreakdown } from '../types'
import { CheckCircle, XCircle, AlertTriangle, Lightbulb, TrendingUp, PiggyBank, ShieldAlert, Clock, Calculator } from 'lucide-react'

interface RecommendationCardProps {
  recommendation: string
  pattern: string
  confidence: { recommendation: number; pattern: number }
  fundingStrategy: FundingStrategy
  fundingBreakdown: FundingBreakdown
  businessExplanation: string
  suggestions: string[]
  waitPeriodSuggestion?: string
  currency: string
}

function getMonthName(monthOffset: number): string {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  return target.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

export function RecommendationCard({
  recommendation, pattern, confidence,
  fundingStrategy, fundingBreakdown, businessExplanation,
  suggestions, waitPeriodSuggestion, currency,
}: RecommendationCardProps) {
  const isYes = recommendation === 'YES'
  const isNo = recommendation === 'NO'
  const Icon = isYes ? CheckCircle : isNo ? XCircle : AlertTriangle
  const iconColor = isYes ? 'text-[#00E6A7]' : isNo ? 'text-[#FF6B6B]' : 'text-[#FFB84D]'
  const bgClass = isYes ? 'bg-[#00E6A7]/5 border-[#00E6A7]/20 shadow-[0_0_30px_rgba(0,230,167,0.05)]' : 
                  isNo ? 'bg-[#FF6B6B]/5 border-[#FF6B6B]/20 shadow-[0_0_30px_rgba(255,107,107,0.05)]' : 
                  'bg-[#FFB84D]/5 border-[#FFB84D]/20 shadow-[0_0_30px_rgba(255,184,77,0.05)]'
  const purchasePrice = fundingBreakdown.totalNeeded

  const [whatIfAmount, setWhatIfAmount] = useState('')
  const [whatIfResult, setWhatIfResult] = useState<string | null>(null)

  const handleWhatIf = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(whatIfAmount)
    if (!whatIfAmount || isNaN(amt) || amt <= 0) {
      setWhatIfResult('Please enter a valid monthly amount.')
      return
    }
    const months = Math.ceil(purchasePrice / amt)
    const label = months === 1 ? '1 month' : `${months} months`
    const target = getMonthName(months)
    setWhatIfResult(
      `If you save ${formatCurrency(amt, currency)}/mo, you can afford this in ${label} (by ${target}).`
    )
  }

  return (
    <Card className={`animate-fade-in border ${bgClass}`}>
      <div className="mb-6 flex items-start gap-4">
        <Icon className={`h-12 w-12 ${iconColor} shrink-0 drop-shadow-[0_0_12px_currentColor]`} />
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-100 font-[Outfit]">
              {recommendation === 'YES' ? 'Purchase Recommended' :
               recommendation === 'NO' ? 'Purchase Not Recommended' : 'Review Required'}
            </h2>
            <Badge
              variant={isYes ? 'success' : isNo ? 'danger' : 'warning'}
            >
              {recommendation}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <div className="rounded-full bg-white/[0.04] border border-white/[0.06] px-3 py-1 text-gray-300">
              Pattern: <span className="font-semibold text-gray-100">{pattern}</span>
            </div>
            <div className="rounded-full bg-white/[0.04] border border-white/[0.06] px-3 py-1 text-gray-300">
              Confidence: <span className="font-semibold text-gray-100">{confidence.recommendation.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#00E6A7]/20 bg-[#00E6A7]/5 p-4 shadow-inner">
          <div className="flex items-center gap-2 text-[#00E6A7]">
            <PiggyBank className="h-5 w-5 drop-shadow-[0_0_8px_rgba(0,230,167,0.5)]" />
            <span className="text-sm font-semibold tracking-wide uppercase">Savings Used</span>
          </div>
          <p className="mt-2 text-2xl font-bold font-data text-gray-100">
            {formatCurrency(fundingStrategy.savingsUsed, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-[#00D2FF]/20 bg-[#00D2FF]/5 p-4 shadow-inner">
          <div className="flex items-center gap-2 text-[#00D2FF]">
            <TrendingUp className="h-5 w-5 drop-shadow-[0_0_8px_rgba(0,210,255,0.5)]" />
            <span className="text-sm font-semibold tracking-wide uppercase">From Balance</span>
          </div>
          <p className="mt-2 text-2xl font-bold font-data text-gray-100">
            {formatCurrency(fundingStrategy.remainingBalanceUsed, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-[#FF6B6B]/20 bg-[#FF6B6B]/5 p-4 shadow-inner">
          <div className="flex items-center gap-2 text-[#FF6B6B]">
            <ShieldAlert className="h-5 w-5 drop-shadow-[0_0_8px_rgba(255,107,107,0.5)]" />
            <span className="text-sm font-semibold tracking-wide uppercase">Emergency Used</span>
          </div>
          <p className="mt-2 text-2xl font-bold font-data text-gray-100">
            {formatCurrency(fundingStrategy.emergencyUsed, currency)}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-full bg-[#FFB84D]/20 p-1.5"><Lightbulb className="h-4 w-4 text-[#FFB84D]" /></div>
          <h4 className="text-sm font-bold text-gray-200 uppercase tracking-wider">AI Explanation</h4>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">{businessExplanation}</p>
      </div>

      <div className="mb-8">
        <h4 className="mb-3 text-sm font-bold text-gray-200 uppercase tracking-wider">How This Is Funded</h4>
        <div className="overflow-hidden rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.02] text-left text-gray-400">
                <th className="px-4 py-3 font-semibold tracking-wider">Source</th>
                <th className="px-4 py-3 font-semibold tracking-wider text-right">Available</th>
                <th className="px-4 py-3 font-semibold tracking-wider text-right">Used</th>
                <th className="px-4 py-3 font-semibold tracking-wider text-right">Still Needed</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-white/[0.06] bg-white/[0.01]">
                <td className="px-4 py-3 font-medium text-gray-300">Total needed</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right font-bold font-data text-gray-100">
                  {formatCurrency(fundingBreakdown.totalNeeded, currency)}
                </td>
              </tr>
              {fundingBreakdown.steps.map((step, i) => (
                <tr key={i} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-gray-300 font-medium">{step.source}</td>
                  <td className="px-4 py-3 text-right text-gray-400 font-data">
                    {formatCurrency(step.available, currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold font-data text-[#00D2FF]">
                    -{formatCurrency(step.used, currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium font-data text-gray-300">
                    {formatCurrency(step.remainingAfterStep, currency)}
                  </td>
                </tr>
              ))}
              {fundingBreakdown.finalShortfall > 0 && (
                <tr className="border-t border-[#FF6B6B]/20 bg-[#FF6B6B]/5">
                  <td colSpan={3} className="px-4 py-3 text-right text-sm text-[#FF6B6B] font-bold uppercase tracking-wider">
                    Shortfall (not covered)
                  </td>
                  <td className="px-4 py-3 text-right font-bold font-data text-[#FF6B6B]">
                    {formatCurrency(fundingBreakdown.finalShortfall, currency)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 text-sm font-bold text-gray-200 uppercase tracking-wider">Suggestions</h4>
          <ul className="space-y-2">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-300 bg-white/[0.02] border border-white/[0.04] rounded-xl p-3">
                <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00D2FF] shadow-[0_0_8px_rgba(0,210,255,0.8)]" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(waitPeriodSuggestion || whatIfResult) && (
        <div className="mt-6 rounded-xl border border-[#A855F7]/20 bg-[#A855F7]/5 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-[#A855F7]/20 p-2"><Clock className="h-5 w-5 shrink-0 text-[#A855F7]" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#A29BFE] uppercase tracking-wider">Wait Period Estimate</p>
              <p className="mt-1.5 text-sm text-gray-200 font-medium">
                {whatIfResult || waitPeriodSuggestion}
              </p>

              <form onSubmit={handleWhatIf} className="mt-4 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-[#A29BFE] mb-1.5 uppercase tracking-wide">
                    Try a different monthly amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. 2000"
                    value={whatIfAmount}
                    onChange={(e) => { setWhatIfAmount(e.target.value); setWhatIfResult(null) }}
                    className="w-full rounded-xl border border-[#A855F7]/30 bg-white/[0.02] px-4 py-2.5 text-sm text-gray-200 focus:border-[#A855F7]/60 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20"
                  />
                </div>
                <button type="submit" className="rounded-xl bg-gradient-to-r from-[#A855F7] to-[#6C5CE7] px-5 py-2.5 text-sm font-bold text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all flex items-center gap-2 h-[42px]">
                  <Calculator className="h-4 w-4" />
                  Calculate
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
