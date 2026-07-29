import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#1E1B2E]/95 p-6 shadow-2xl backdrop-blur-xl animate-scale-in',
          'max-h-[90vh] flex flex-col',
          'shadow-[0_0_60px_rgba(108,92,231,0.15)]',
          className
        )}
      >
        <div className="mb-5 flex items-center justify-between shrink-0">
          {title && <h2 className="text-lg font-bold text-gray-100 font-[Outfit]">{title}</h2>}
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-white/[0.08] hover:text-gray-200 transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto overflow-x-hidden pr-2 -mr-2 flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
