import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ArrowLeftRight, ClipboardCheck, LayoutDashboard, Wallet, ArrowDownToLine,
  ArrowUpFromLine, Repeat, HandCoins, UserCircle, History, LogOut, X, ChevronDown,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useInstitutional } from '../../contexts/InstitutionalContext'

const mainItems = [
  { to: '/otc/onboarding', label: 'Onboarding', icon: ClipboardCheck },
  { to: '/otc/overview', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/otc/wallet', label: 'Wallet Balances', icon: Wallet },
]

type NavItem = { to: string; label: string; icon: typeof ArrowDownToLine }

const groupedSections: { title: string; items: NavItem[] }[] = [
  { title: 'Pay-Ins', items: [{ to: '/otc/collections', label: 'Collections', icon: ArrowDownToLine }] },
  { title: 'Pay-Outs', items: [{ to: '/otc/payouts', label: 'Payouts', icon: ArrowUpFromLine }] },
  {
    title: 'Trading', items: [
      { to: '/otc/request', label: 'New Conversion', icon: Repeat },
      { to: '/otc/settlements', label: 'Settlements', icon: HandCoins },
    ]
  },
]

const accountItems = [
  { to: '/otc/profile', label: 'Profile', icon: UserCircle },
  { to: '/otc/transactions', label: 'Transactions History', icon: History },
]

interface InstitutionalSidebarProps {
  onClose?: () => void
}

export default function InstitutionalSidebar({ onClose }: InstitutionalSidebarProps) {
  const { logout } = useAuth()
  const { theme } = useTheme()
  const { isApproved } = useInstitutional()
  const isLight = theme === 'light'
  const location = useLocation()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleSection = (title: string) => setCollapsed(prev => ({ ...prev, [title]: !prev[title] }))

  // Once approved there's nothing left to onboard -- drop the link entirely
  // rather than leave a dead-end page sitting in the nav.
  const visibleMainItems = mainItems.filter(item => item.to !== '/otc/onboarding' || !isApproved)

  const linkClass = (isActive: boolean) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${isActive
    ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
    : isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2a40]/50'
    }`

  return (
    <aside
      className="w-[260px] min-w-[260px] h-screen flex flex-col relative z-20 transition-colors duration-300"
      style={isLight
        ? { background: '#ffffff', borderRight: '1px solid #e2e8f0' }
        : { background: '#070f19', borderRight: '1px solid #1a2a40' }}
    >
      {/* HEADER */}
      <div className={`py-6 px-4 border-b shrink-0 ${isLight ? 'border-slate-200' : 'border-[#1a2a40]'}`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-3 w-full p-2 rounded-xl border shadow-inner ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0d1a2d] border-[#1e3a5f]/50'}`}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-900/30">
              <ArrowLeftRight className="w-5 h-5 text-[#070f19]" strokeWidth={2.5} />
            </div>
            <div className="overflow-hidden mb-2">
              <p className={`font-bold text-lg leading-tight tracking-wide truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>JASIRI</p>
              <p className="text-[12px] uppercase font-semibold tracking-wider text-emerald-500/80">B2B Merchant Portal</p>
              <span></span>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className={`lg:hidden absolute right-2 top-6 w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isLight ? 'bg-slate-100 text-slate-500 hover:text-slate-900' : 'bg-[#1a2a40] text-gray-400 hover:text-white'}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {!isApproved && (
          <div className={`mt-3 px-3 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wide border ${isLight ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
            Onboarding pending
          </div>
        )}
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-3 py-6 overflow-y-auto custom-scrollbar">
        <ul className="space-y-1.5">
          <div className="mb-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] px-3 mb-2">Main</p>
            {visibleMainItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to} onClick={onClose} className={({ isActive }) => linkClass(isActive)}>
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                      {label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </div>

          {groupedSections.map(section => {
            const isSectionActive = section.items.some(i => location.pathname === i.to)
            const isOpen = collapsed[section.title] === undefined ? true : !collapsed[section.title]
            return (
              <li key={section.title} className="mb-2">
                <button
                  onClick={() => toggleSection(section.title)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${isSectionActive ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-400'}`}
                >
                  <span>{section.title}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{ maxHeight: isOpen ? '300px' : '0px', opacity: isOpen ? 1 : 0 }}
                >
                  <ul className="space-y-1 pt-1">
                    {section.items.map(({ to, label, icon: Icon }) => (
                      <li key={to}>
                        <NavLink to={to} onClick={onClose} className={({ isActive }) => linkClass(isActive)}>
                          {({ isActive }) => (
                            <>
                              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                              {label}
                            </>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            )
          })}

          <div className={`mt-4 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-[#1a2a40]'}`}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] px-3 mb-3">Account</p>
            {accountItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to} onClick={onClose} className={({ isActive }) => linkClass(isActive)}>
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                      {label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </div>
        </ul>
      </nav>

      {/* FOOTER */}
      <div className={`px-4 pb-6 pt-4 border-t space-y-3 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] ${isLight ? 'bg-white border-slate-200' : 'bg-[#050b14] border-[#1a2a40]'}`}>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-bold transition-colors"
        >
          <LogOut className="w-4 h-4" strokeWidth={2.5} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
