import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Scale,
  TrendingUp,
  ArrowLeftRight,
  Link2,
  BookOpen,
  Globe,
  LogOut,
  ArrowRightLeft,
  X,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Vault', icon: LayoutDashboard },
  { to: '/market-maker', label: 'Market Maker', icon: Scale },
  { to: '/trade', label: 'Trade', icon: TrendingUp },
  { to: '/ramp', label: 'On / Off Ramp', icon: ArrowLeftRight },
  { to: '/airtime-ledger', label: 'Airtime Ledger', icon: Link2 },
  { to: '/general-ledger', label: 'General Ledger', icon: BookOpen },
  { to: '/rates', label: 'Rates & Inventory', icon: Globe },
]

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { user, logout, viewAsAdmin, toggleViewAsAdmin } = useAuth()

  return (
    <aside className="w-[260px] min-w-[260px] h-screen flex flex-col"
      style={{ background: '#0a1628', borderRight: '1px solid #1e3a5f' }}
    >
      {/* Logo */}
      <div className="py-4 border-b border-[#a1b4ca]">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-4 flex-1 px-3 py-6 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 12px rgba(16,185,129,0.35)' }}
            >
              <ArrowRightLeft className="w-6 h-6 text-white text-lg" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-white font-bold text-xl leading-tight tracking-wide">Meshex</p>
              <p className="text-[11px] mt-1.5" style={{ color: '#6b8db0' }}>MHS Treasury </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden ml-2 w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${isActive
                    ? 'bg-[#0f1e30] text-white font-medium border border-[#1e3a5f]/50'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-gray-500'}`}
                      strokeWidth={1.75}
                    />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-[#1a2535] space-y-2">
        {user && (
          <button
            onClick={toggleViewAsAdmin}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${viewAsAdmin ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>{viewAsAdmin ? 'View: Admin' : 'View: Member'}</span>
          </button>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 text-sm font-medium transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
