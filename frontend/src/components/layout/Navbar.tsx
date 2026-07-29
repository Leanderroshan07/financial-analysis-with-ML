import { Menu, X, Bell } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface NavbarProps {
  sidebarOpen: boolean
  onToggle: () => void
}

export function Navbar({ sidebarOpen, onToggle }: NavbarProps) {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/[0.06] bg-[#0F0B1E]/80 backdrop-blur-xl px-4 lg:px-6">
      <button
        onClick={onToggle}
        className="rounded-xl p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all duration-200 lg:hidden"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button className="relative rounded-xl p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all duration-200">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#6C5CE7] animate-pulse-dot" />
        </button>

        {/* User profile */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-200">{user?.name || user?.email}</p>
            <p className="text-xs text-gray-500">AI Financial Advisor</p>
          </div>
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6C5CE7] to-[#A855F7] text-sm font-bold text-white shadow-[0_0_16px_rgba(108,92,231,0.3)]">
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  )
}
