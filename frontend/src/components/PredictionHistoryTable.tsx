import { useState } from 'react'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { LoadingSpinner } from './ui/LoadingSpinner'
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters'
import type { HistoryRecord } from '../types'
import { Search, ArrowUpDown } from 'lucide-react'

interface Props {
  data: HistoryRecord[]
  isLoading: boolean
}

type SortKey = 'purchasePrice' | 'createdAt' | 'confidenceRec'
type SortDir = 'asc' | 'desc'

export function PredictionHistoryTable({ data, isLoading }: Props) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const filtered = data
    .filter((r) =>
      r.recommendation.toLowerCase().includes(search.toLowerCase()) ||
      r.pattern.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'createdAt') return mul * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      return mul * ((a[sortKey] as number) - (b[sortKey] as number))
    })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <Card className="animate-slide-up">
      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by recommendation or pattern..."
            className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-gray-200 placeholder:text-gray-600 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {[
                { key: 'createdAt' as SortKey, label: 'Date' },
                { key: 'purchasePrice' as SortKey, label: 'Amount' },
                { key: null, label: 'Recommendation' },
                { key: null, label: 'Pattern' },
                { key: 'confidenceRec' as SortKey, label: 'Confidence' },
              ].map(({ key, label }) => (
                <th
                  key={label}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 ${
                    key ? 'cursor-pointer hover:text-gray-300 transition-colors' : ''
                  }`}
                  onClick={() => key && toggleSort(key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    {key === sortKey && <ArrowUpDown className="h-3 w-3 text-[#A29BFE]" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-150">
                <td className="px-4 py-3 text-gray-400">{formatDate(row.createdAt)}</td>
                <td className="px-4 py-3 font-bold font-data text-gray-200">{formatCurrency(row.purchasePrice)}</td>
                <td className="px-4 py-3">
                  <Badge variant={row.recommendation === 'YES' ? 'success' : row.recommendation === 'NO' ? 'danger' : 'warning'}>
                    {row.recommendation}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="info">{row.pattern}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-400 font-data">{formatPercent(row.confidenceRec)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No history found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
