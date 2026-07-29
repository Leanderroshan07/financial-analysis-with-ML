import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Wallet } from 'lucide-react'

export function AuthLayout() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0F0B1E] px-4">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[#6C5CE7]/10 blur-[120px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[#00D2FF]/8 blur-[120px] animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[#A855F7]/5 blur-[150px]" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6C5CE7] to-[#A855F7] shadow-[0_0_40px_rgba(108,92,231,0.4)]">
              <Wallet className="h-7 w-7 text-white" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#6C5CE7] to-[#A855F7] opacity-40 blur-xl" />
            </div>
          </div>
          <h1 className="text-3xl font-bold font-[Outfit] gradient-text">Moneyyy</h1>
          <p className="mt-1 text-sm text-gray-400 tracking-wide">AI Financial Purchase Advisor</p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl shadow-[0_0_80px_rgba(108,92,231,0.1)]">
          <Outlet />
        </div>

        {/* Bottom decoration */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-600">Secured by AI-Powered Financial Intelligence</p>
        </div>
      </div>
    </div>
  )
}
