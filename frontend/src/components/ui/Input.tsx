import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-gray-300">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'block w-full rounded-xl border bg-white/[0.04] px-4 py-2.5 text-sm text-gray-100 shadow-sm transition-all duration-300 placeholder:text-gray-500 focus:border-[#6C5CE7]/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20 focus:shadow-[0_0_20px_rgba(108,92,231,0.1)]',
            error ? 'border-[#FF6B6B]/50' : 'border-white/[0.1]',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-[#FF6B6B]">{error}</p>}
      </div>
    )
  }
)
