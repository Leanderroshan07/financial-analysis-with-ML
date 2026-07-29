import { useQuery } from '@tanstack/react-query'
import { getHistory } from '../services/purchase.service'
import { PredictionHistoryTable } from '../components/PredictionHistoryTable'
import { Card, CardTitle } from '../components/ui/Card'
import { Clock, BarChart3 } from 'lucide-react'

export function HistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['prediction-history'],
    queryFn: () => getHistory(50),
  })

  const history = data?.success && data.data ? (data.data as any[]) : []

  const stats = history.length > 0
    ? {
        total: history.length,
        yesCount: history.filter((h: any) => h.recommendation === 'YES').length,
        noCount: history.filter((h: any) => h.recommendation === 'NO').length,
        avgConfidence: history.reduce((s: number, h: any) => s + h.confidenceRec, 0) / history.length,
      }
    : null

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-100 font-[Outfit]">Prediction History</h1>
        <p className="mt-1 text-sm text-gray-400">View all your past AI purchase recommendations</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Card className="animate-slide-up stagger-1">
            <div className="flex items-center gap-3">
              <div className="icon-container bg-gradient-to-br from-[#3B82F6]/20 to-[#00D2FF]/10">
                <Clock className="h-5 w-5 text-[#00D2FF]" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Total</p>
                <p className="text-lg font-bold font-data text-gray-100">{stats.total}</p>
              </div>
            </div>
          </Card>
          <Card className="animate-slide-up stagger-2">
            <div className="flex items-center gap-3">
              <div className="icon-container bg-gradient-to-br from-[#00E6A7]/20 to-[#00D2FF]/10">
                <BarChart3 className="h-5 w-5 text-[#00E6A7]" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Approved</p>
                <p className="text-lg font-bold font-data text-[#00E6A7]">{stats.yesCount}</p>
              </div>
            </div>
          </Card>
          <Card className="animate-slide-up stagger-3">
            <div className="flex items-center gap-3">
              <div className="icon-container bg-gradient-to-br from-[#FF6B6B]/20 to-[#FF6B9D]/10">
                <BarChart3 className="h-5 w-5 text-[#FF6B6B]" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Rejected</p>
                <p className="text-lg font-bold font-data text-[#FF6B6B]">{stats.noCount}</p>
              </div>
            </div>
          </Card>
          <Card className="animate-slide-up stagger-4">
            <div className="flex items-center gap-3">
              <div className="icon-container bg-gradient-to-br from-[#A855F7]/20 to-[#6C5CE7]/10">
                <BarChart3 className="h-5 w-5 text-[#A855F7]" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Avg Confidence</p>
                <p className="text-lg font-bold font-data gradient-text-purple">{stats.avgConfidence.toFixed(1)}%</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <PredictionHistoryTable data={history as any[]} isLoading={isLoading} />
    </div>
  )
}
