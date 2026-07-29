import { type ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({
  className, variant = 'primary', size = 'md', loading, children, disabled, ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/50 focus:ring-offset-2 focus:ring-offset-[#0F0B1E] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]',
        variant === 'primary' && 'bg-gradient-to-r from-[#6C5CE7] to-[#A855F7] text-white hover:shadow-[0_0_24px_rgba(108,92,231,0.4)] hover:brightness-110',
        variant === 'secondary' && 'bg-white/[0.06] text-gray-200 border border-white/[0.1] hover:bg-white/[0.1] hover:border-white/[0.2]',
        variant === 'danger' && 'bg-gradient-to-r from-[#FF6B6B] to-[#FF6B9D] text-white hover:shadow-[0_0_24px_rgba(255,107,107,0.3)] hover:brightness-110',
        variant === 'ghost' && 'text-gray-300 hover:bg-white/[0.06] hover:text-gray-100',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-5 py-2.5 text-sm',
        size === 'lg' && 'px-7 py-3.5 text-base',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}
