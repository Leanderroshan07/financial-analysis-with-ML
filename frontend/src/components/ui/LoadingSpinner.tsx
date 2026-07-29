import { cn } from '../../utils/cn'
import { Loader2 } from 'lucide-react'

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-[#6C5CE7]/20 blur-xl animate-pulse" />
        <Loader2 className="relative h-8 w-8 animate-spin text-[#6C5CE7]" />
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <div className="h-8 w-48 rounded-xl skeleton" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl skeleton" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <div className="h-64 rounded-2xl skeleton" style={{ animationDelay: '0.6s' }} />
    </div>
  )
}
