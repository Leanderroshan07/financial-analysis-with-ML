import { Card, CardTitle } from './ui/Card'
import { formatCurrency } from '../utils/formatters'
import type { FinancialSummary } from '../types'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

interface Props { profile: FinancialSummary }

const COLORS = ['#FF6B6B', '#FFB84D', '#00E6A7', '#00D2FF', '#A855F7']

export function FinancialCharts({ profile }: Props) {
  const totalExpense = profile.totalFixedExpense + profile.totalVariableExpense
  const remainingBalance = profile.totalIncome - totalExpense

  const expenseData = [
    { name: 'Fixed Expenses', value: profile.totalFixedExpense },
    { name: 'Variable Expenses', value: profile.totalVariableExpense },
    { name: 'Remaining', value: Math.max(0, remainingBalance) },
  ].filter((d) => d.value > 0)

  const impactData = [
    { name: 'Income', amount: profile.totalIncome },
    { name: 'Expenses', amount: totalExpense },
    { name: 'Remaining', amount: Math.max(0, remainingBalance) },
    { name: 'Savings', amount: profile.currentSavings },
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="rounded-xl border border-white/[0.1] bg-white/[0.06] backdrop-blur-md p-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-sm z-50">
          <p className="font-semibold text-gray-200 mb-1">{label || payload[0].name}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.color || (p.payload && p.payload.fill) || '#00D2FF' }} className="font-data font-bold">
              {p.name}: {formatCurrency(p.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <>
      <Card className="animate-slide-up">
        <CardTitle>Expense Breakdown</CardTitle>
        <div className="h-[280px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={expenseData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {expenseData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} className="drop-shadow-sm hover:opacity-80 transition-opacity" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <CardTitle>Monthly Overview</CardTitle>
        <div className="h-[280px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={impactData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12, fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12, fontFamily: 'Space Grotesk' }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="amount" fill="url(#colorGradientBlue)" radius={[6, 6, 0, 0]} barSize={40}>
                {impactData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={
                    entry.name === 'Income' ? 'url(#colorGradientGreen)' :
                    entry.name === 'Expenses' ? 'url(#colorGradientRed)' :
                    entry.name === 'Remaining' ? 'url(#colorGradientPurple)' :
                    'url(#colorGradientBlue)'
                  } />
                ))}
              </Bar>
              <defs>
                <linearGradient id="colorGradientGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00E6A7" /><stop offset="100%" stopColor="#00E6A7" stopOpacity={0.6} /></linearGradient>
                <linearGradient id="colorGradientRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF6B6B" /><stop offset="100%" stopColor="#FF6B9D" stopOpacity={0.6} /></linearGradient>
                <linearGradient id="colorGradientPurple" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A855F7" /><stop offset="100%" stopColor="#6C5CE7" stopOpacity={0.6} /></linearGradient>
                <linearGradient id="colorGradientBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00D2FF" /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0.6} /></linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  )
}
