import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Scale,
  TrendingUp,
  ArrowLeftRight,
  Link2,
  BookOpen,
  Globe,
  LogOut,
  X,
  ChevronDown,
  Settings,
  DollarSign,
  TerminalSquare,
  Wallet,
  Radio,
  Repeat
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

// --- ROLE 1: RETAIL USER MENU ---
const retailNavItems = [
  { to: '/wallet', label: 'My Wallet', icon: Wallet },
  { to: '/trade', label: 'Quick Swap', icon: TrendingUp },
  { to: '/ramp', label: 'Deposit / Withdraw', icon: ArrowLeftRight },
  { to: '/airtime-ledger', label: 'Tokenize Airtime', icon: Radio },
]

// --- ROLE 2: ADMIN MENU ---
const adminNavItems = [
  { to: '/vault', label: 'Vault', icon: LayoutDashboard },
  // Market Maker is handled dynamically below
  { to: '/airtime-ledger', label: 'Airtime Ledger', icon: Link2 },
  { to: '/general-ledger', label: 'General Ledger', icon: BookOpen },
  { to: '/rates', label: 'Rates & Inventory', icon: Globe },
]

// 🚀 UPDATED: Cleaned up to strictly these 5 tabs
const marketMakerSubItems = [
  { id: 'dashboard', label: 'Treasury Dashboard', icon: LayoutDashboard },
  { id: 'corridor', label: 'Channel Corridor', icon: Repeat },
  { id: 'engine', label: 'Spread Engine', icon: Settings },
  { id: 'otc', label: 'OTC Desk', icon: DollarSign },
  { id: 'terminal', label: 'Execution Terminal', icon: TerminalSquare },
]

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { user, logout, viewAsAdmin, toggleViewAsAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Market Maker Dropdown State
  const isMarketMakerActive = location.pathname.startsWith('/market-maker')
  const [isMMOpen, setIsMMOpen] = useState(isMarketMakerActive)
  const currentMMTab = new URLSearchParams(location.search).get('tab') || 'dashboard'

  useEffect(() => {
    if (isMarketMakerActive) {
      setIsMMOpen(true)
    }
  }, [isMarketMakerActive])

  const handleMMToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isMarketMakerActive) {
      navigate('/market-maker?tab=dashboard')
      setIsMMOpen(true)
    } else {
      setIsMMOpen(!isMMOpen)
    }
  }

  const navItems = viewAsAdmin ? adminNavItems : retailNavItems;

  return (
    <aside className="w-[260px] min-w-[260px] h-screen flex flex-col relative z-20"
      style={{ background: '#070f19', borderRight: '1px solid #1a2a40' }}
    >
      {/* 1. Header / Logo */}
      <div className="py-5 px-4 border-b border-[#1a2a40]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 w-full p-2 rounded-xl bg-[#0d1a2d] border border-[#1e3a5f]/50 shadow-inner">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-900/30">
              <ArrowLeftRight className="w-5 h-5 text-[#070f19]" strokeWidth={2.5} />
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-bold text-lg leading-tight tracking-wide truncate">Meshex</p>
              <p className="text-[10px] uppercase font-semibold tracking-wider text-emerald-500/80">
                {viewAsAdmin ? 'MHS TREASURY' : 'RETAIL APP'}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden absolute right-2 top-6 w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a2a40] text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Navigation */}
      <nav className="flex-1 px-3 py-6 overflow-y-auto custom-scrollbar">
        <ul className="space-y-1.5">

          {!viewAsAdmin && navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${isActive ? 'bg-blue-600/10 text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2a40]/50'}`}>
                {({ isActive }) => (
                  <><Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} /> {label}</>
                )}
              </NavLink>
            </li>
          ))}

          {viewAsAdmin && (
            <>
              {/* VAULT */}
              <li>
                <NavLink to="/vault" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${isActive ? 'bg-emerald-500/10 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2a40]/50'}`}>
                  {({ isActive }) => (
                    <><LayoutDashboard className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} /> Vault</>
                  )}
                </NavLink>
              </li>

              {/* MARKET MAKER DROPDOWN */}
              <li className="pt-2 pb-1">
                <button
                  onClick={handleMMToggle}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${isMarketMakerActive ? 'bg-emerald-500/10 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2a40]/50'}`}
                >
                  <div className="flex items-center gap-3">
                    <Scale className={`w-5 h-5 ${isMarketMakerActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                    <span>Market Maker</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isMMOpen ? 'rotate-180 text-emerald-400' : 'text-slate-500'}`} />
                </button>

                {/* Increased max-h to 350px so all 5 items fit comfortably */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isMMOpen ? 'max-h-[350px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                  <div className="pl-5 pr-2 py-1 space-y-1 border-l border-[#1a2a40] ml-5">
                    {marketMakerSubItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const isActive = isMarketMakerActive && currentMMTab === sub.id;

                      return (
                        <button
                          key={sub.id}
                          onClick={() => navigate(`/market-maker?tab=${sub.id}`)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-all duration-200 ${isActive
                            ? 'bg-[#1a2a40] text-emerald-400 font-medium border border-[#2a3f5f]'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2a40]/50 border border-transparent'
                            }`}
                        >
                          <SubIcon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                          {sub.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </li>

              {/* OTHER ADMIN LEDGERS */}
              {navItems.filter(item => item.to !== '/vault').map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink to={to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${isActive ? 'bg-emerald-500/10 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2a40]/50'}`}>
                    {({ isActive }) => (
                      <><Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} /> {label}</>
                    )}
                  </NavLink>
                </li>
              ))}
            </>
          )}
        </ul>
      </nav>

      {/* 3. Footer / Auth Controls */}
      <div className="px-4 pb-6 pt-4 bg-[#050b14] border-t border-[#1a2a40] space-y-3 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
        {user && (
          <button
            onClick={() => {
              toggleViewAsAdmin();
              if (!viewAsAdmin) navigate('/market-maker?tab=dashboard');
              else navigate('/wallet');
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#0d1a2d] border border-[#1e3a5f]/50 hover:border-emerald-500/30 transition-colors"
          >
            <span className="text-xs font-medium text-slate-300">{viewAsAdmin ? 'Admin Mode' : 'Retail Mode'}</span>
            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.8)] ${viewAsAdmin ? 'bg-emerald-400 shadow-emerald-500/50' : 'bg-blue-400 shadow-blue-500/50'}`} />
          </button>
        )}
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