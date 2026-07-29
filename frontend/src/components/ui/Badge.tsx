import { cn } from '../../utils/cn'

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  className?: string
  children: string
}

export function Badge({ variant = 'neutral', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold tracking-wide transition-all duration-200',
        variant === 'success' && 'bg-[#00E6A7]/10 text-[#00E6A7] border border-[#00E6A7]/20',
        variant === 'warning' && 'bg-[#FFB84D]/10 text-[#FFB84D] border border-[#FFB84D]/20',
        variant === 'danger' && 'bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B]/20',
        variant === 'info' && 'bg-[#00D2FF]/10 text-[#00D2FF] border border-[#00D2FF]/20',
        variant === 'neutral' && 'bg-white/[0.06] text-gray-300 border border-white/[0.1]',
        className
      )}
    >
      {children}
    </span>
  )
}
