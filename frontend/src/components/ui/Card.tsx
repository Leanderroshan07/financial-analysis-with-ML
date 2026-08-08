import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface CardProps {
  className?: string
  children: ReactNode
  onClick?: () => void
  style?: CSSProperties
}

export function Card({ className, children, onClick, style }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl transition-all duration-300 ease-out',
        onClick && 'cursor-pointer hover:bg-white/[0.08] hover:border-[#6C5CE7]/30 hover:shadow-[0_8px_32px_rgba(108,92,231,0.15)] hover:scale-[1.01]',
        'hover:border-white/[0.12]',
        className
      )}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mb-4', className)}>{children}</div>
}

export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h3 className={cn('text-lg font-semibold text-gray-100 font-[Outfit]', className)}>{children}</h3>
}
