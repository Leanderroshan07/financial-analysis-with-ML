import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Wallet, ArrowRightLeft, Tags, CheckSquare, Target, ShoppingCart, Clock, Settings, LogOut, TrendingDown } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useAuth } from '../../hooks/useAuth'

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/transactions', icon: ArrowRightLeft, label: 'Transactions' },
  { to: '/categories', icon: Tags, label: 'Categories' },
  { to: '/fixed-expenses', icon: TrendingDown, label: 'Fixed Expenses' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/purchase-advisor', icon: ShoppingCart, label: 'Purchase Advisor' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/profile', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const { logout, user } = useAuth()

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-white/[0.06] bg-gradient-to-b from-[#1A1630] to-[#0F0B1E]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#6C5CE7] to-[#A855F7] shadow-[0_0_20px_rgba(108,92,231,0.3)]">
          <Wallet className="h-5 w-5 text-white" />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#6C5CE7] to-[#A855F7] opacity-40 blur-lg" />
        </div>
        <div>
          <span className="text-xl font-bold font-[Outfit] gradient-text">Moneyyy</span>
          <p className="text-[10px] font-medium tracking-wider text-gray-500 uppercase">AI Finance</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {links.map((link, index) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 relative',
                isActive
                  ? 'bg-[#6C5CE7]/15 text-white shadow-[0_0_20px_rgba(108,92,231,0.1)]'
                  : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
              )
            }
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-to-b from-[#6C5CE7] to-[#A855F7] shadow-[0_0_12px_rgba(108,92,231,0.5)]" />
                )}
                <link.icon className={cn(
                  'h-[18px] w-[18px] transition-all duration-300',
                  isActive ? 'text-[#A29BFE]' : 'text-gray-500 group-hover:text-gray-300'
                )} />
                <span>{link.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-white/[0.06] px-4 py-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6C5CE7]/30 to-[#A855F7]/20 text-xs font-bold text-[#A29BFE]">
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-300 truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-[#FF6B6B] hover:bg-[#FF6B6B]/10 transition-all duration-300"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
