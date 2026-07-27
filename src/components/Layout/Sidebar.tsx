//@ts-nocheck
import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Scale, ArrowLeftRight, Link2, BookOpen, Globe, LogOut, X, ChevronDown,
  Settings, DollarSign, TerminalSquare, Wallet, Radio, Repeat, ArrowDownRight, ArrowUpRight,
  ArrowRightLeft, Coins, FileText, User, ShieldCheck, Briefcase, Receipt, CreditCard,
  Landmark, Droplet, ShieldAlert, Users, Building2, Tag, Smartphone, RefreshCw, PieChart, Activity
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

// --- RETAIL MENU ---
const retailNavMain = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/wallets', label: 'My Wallets', icon: Wallet },
]

const retailNavActions = [
  { to: '/deposit', label: 'Deposits', icon: ArrowDownRight },
  { to: '/withdraw', label: 'Withdrawals', icon: ArrowUpRight },
  { to: '/swap', label: 'Quick Swap', icon: ArrowRightLeft },
  { to: '/redeem-airtime', label: 'Redeem Airtime', icon: Radio },
  { to: '/impala-coin', label: 'Impala Coin', icon: Coins },
]

const retailNavAccount = [
  { to: '/transactions', label: 'Transactions', icon: FileText },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/kyc', label: 'KYC Verification', icon: ShieldCheck },
]

// --- ADMIN MENU ---
const adminNavItems = [
  { to: '/vault', label: 'Vault', icon: LayoutDashboard },
  { to: '/general-ledger', label: 'General Ledger', icon: BookOpen },
  { to: '/rates', label: 'Rates & Inventory', icon: Globe },
]

const marketMakerSubItems = [
  { id: 'dashboard', label: 'Treasury Dashboard', icon: LayoutDashboard },
  { id: 'corridor', label: 'Channel Corridor', icon: Repeat },
  { id: 'engine', label: 'Spread Engine', icon: Settings },
  { id: 'otc', label: 'OTC Desk', icon: DollarSign },
  { id: 'terminal', label: 'Execution Terminal', icon: TerminalSquare },
]

// 🟢 MASSIVE OTC DASHBOARD HIERARCHY
const otcSections = [
  {
    title: 'OVERVIEW',
    items: [
      { id: 'admin-dashboard', path: '/admin/dashboard', label: 'Dashboard', icon: Activity }
    ]
  },
  {
    title: 'TRADING',
    items: [
      { id: 'dealer-workspace', path: '/admin/dashboard', label: 'Dealer Workspace', icon: Briefcase },
      { id: 'retail-transactions', path: '/admin/retail-transactions', label: 'Retail Transactions', icon: Receipt }
    ]
  },
  {
    title: 'FINANCE',
    items: [
      { id: 'payments', path: '/admin/payments', label: 'Payments', icon: CreditCard },
      { id: 'treasury', path: '/admin/treasury', label: 'Treasury', icon: Landmark },
      { id: 'liquidity', path: '/admin/liquidity', label: 'Liquidity', icon: Droplet }
    ]
  },
  {
    title: 'COMPLIANCE',
    items: [
      { id: 'kyc-aml', path: '/admin/kyc', label: 'KYC / AML / Risk', icon: ShieldAlert }
    ]
  },
  {
    title: 'CLIENTS',
    items: [
      { id: 'customers', path: '/admin/customers', label: 'Customers', icon: Users },
      { id: 'institutional', path: '/admin/institutional', label: 'Institutional Clients', icon: Building2 }
    ]
  },
  {
    title: 'OPERATIONS',
    items: [
      { id: 'pricing', path: '/admin/pricing', label: 'Pricing', icon: Tag },
      { id: 'airtime-queue', path: '/admin/airtime-queue', label: 'Airtime Queue', icon: Smartphone },
      { id: 'settlement-queue', path: '/admin/settlement-queue', label: 'Settlement Queue', icon: RefreshCw }
    ]
  }
]

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { user, logout, viewAsAdmin } = useAuth() // ← Removed toggleViewAsAdmin
  const location = useLocation()
  const navigate = useNavigate()

  // Dropdown States
  const isMarketMakerActive = location.pathname.startsWith('/market-maker')
  const [isMMOpen, setIsMMOpen] = useState(isMarketMakerActive)
  const currentMMTab = new URLSearchParams(location.search).get('tab') || 'dashboard'

  const isOTCActive = location.pathname.startsWith('/admin') && location.pathname !== '/admin/users'
  const [isOTCOpen, setIsOTCOpen] = useState(isOTCActive)

  useEffect(() => {
    if (isMarketMakerActive) setIsMMOpen(true)
  }, [isMarketMakerActive])

  useEffect(() => {
    if (isOTCActive) setIsOTCOpen(true)
  }, [isOTCActive])

  const handleMMToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsMMOpen(!isMMOpen)
  }

  const handleOTCToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsOTCOpen(!isOTCOpen)
  }

  // Menu items based on role (NO manual toggle)
  const mainItems = viewAsAdmin ? [] : retailNavMain
  const actionItems = viewAsAdmin ? [] : retailNavActions
  const accountItems = viewAsAdmin ? [] : retailNavAccount
  const adminItems = viewAsAdmin ? adminNavItems : []

  // Determine mode label
  const modeLabel = viewAsAdmin ? 'MHS TREASURY' : 'RETAIL APP'
  const modeColor = viewAsAdmin ? 'text-emerald-500/80' : 'text-blue-500/80'

  return (
    <aside
      className="w-[260px] min-w-[260px] h-screen flex flex-col relative z-20"
      style={{ background: '#070f19', borderRight: '1px solid #1a2a40' }}
    >
      {/* ==========================================
          1. HEADER / LOGO
      ========================================== */}
      <div className="py-6 px-4 border-b border-[#1a2a40] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 w-full p-2 rounded-xl bg-[#0d1a2d] border border-[#1e3a5f]/50 shadow-inner">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-900/30">
              <ArrowLeftRight className="w-5 h-5 text-[#070f19]" strokeWidth={2.5} />
            </div>
            <div className="overflow-hidden mb-2">
              <p className="text-white font-bold text-lg leading-tight tracking-wide truncate">JASIRI</p>
              <p className={`text-[12px] uppercase font-semibold tracking-wider ${modeColor}`}>
                {modeLabel}
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

      {/* ==========================================
          2. MAIN NAVIGATION
      ========================================== */}
      <nav className="flex-1 px-3 py-6 overflow-y-auto custom-scrollbar">
        <ul className="space-y-1.5">

          {/* --- RETAIL SECTIONS --- */}
          {mainItems.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] px-3 mb-2">Main</p>
              {mainItems.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={onClose}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${isActive
                        ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2a40]/50'
                      }`}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                        {label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </div>
          )}

          {actionItems.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] px-3 mb-2">Actions</p>
              {actionItems.map(({ to, label, icon: Icon }) => {
                let activeColor = 'text-blue-400'
                let activeBg = 'bg-blue-600/10 text-blue-400 font-semibold'
                if (label === 'Deposits') { activeColor = 'text-emerald-400'; activeBg = 'bg-emerald-500/10 text-emerald-400 font-semibold' }
                if (label === 'Withdrawals') { activeColor = 'text-orange-400'; activeBg = 'bg-orange-500/10 text-orange-400 font-semibold' }

                return (
                  <li key={to}>
                    <NavLink
                      to={to}
                      onClick={onClose}
                      className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${isActive ? activeBg : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2a40]/50'
                        }`}
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={`w-5 h-5 ${isActive ? activeColor : 'text-slate-500'}`} />
                          {label}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </div>
          )}

          {accountItems.length > 0 && (
            <div className="mt-6 pt-4 border-t border-[#1a2a40]">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] px-3 mb-3">Account</p>
              {accountItems.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={onClose}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${isActive
                        ? 'text-white font-semibold'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-[#1a2a40]/30'
                      }`}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                        <span>{label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </div>
          )}

          {/* --- ADMIN SECTION --- */}
          {viewAsAdmin && (
            <>
              {/* VAULT */}
              <li className="mb-2">
                <NavLink
                  to="/vault"
                  onClick={onClose}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${isActive
                      ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2a40]/50'
                    }`}
                >
                  {({ isActive }) => (
                    <>
                      <LayoutDashboard className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                      Vault
                    </>
                  )}
                </NavLink>
              </li>

              {/* MARKET MAKER DROPDOWN */}
              <li className="pt-2 pb-1">
                <button
                  onClick={handleMMToggle}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${isMarketMakerActive
                      ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2a40]/50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Scale className={`w-5 h-5 ${isMarketMakerActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                    <span>Market Maker</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isMMOpen ? 'rotate-180 text-emerald-400' : 'text-slate-500'}`} />
                </button>

                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: isMMOpen ? '500px' : '0px',
                    opacity: isMMOpen ? 1 : 0,
                    marginTop: isMMOpen ? '4px' : '0px'
                  }}
                >
                  <div className="pl-5 pr-2 py-1 space-y-1 border-l border-[#1a2a40] ml-5">
                    {marketMakerSubItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const isActive = isMarketMakerActive && currentMMTab === sub.id
                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            navigate(`/market-maker?tab=${sub.id}`);
                            if (onClose) onClose();
                          }}
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

              {/* OTC DASHBOARD DROPDOWN */}
              <li className="pt-2 pb-1">
                <button
                  onClick={handleOTCToggle}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${isOTCActive
                      ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2a40]/50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <PieChart className={`w-5 h-5 ${isOTCActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                    <span>OTC Dashboard</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOTCOpen ? 'rotate-180 text-emerald-400' : 'text-slate-500'}`} />
                </button>

                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: isOTCOpen ? '1200px' : '0px',
                    opacity: isOTCOpen ? 1 : 0,
                    marginTop: isOTCOpen ? '8px' : '0px'
                  }}
                >
                  <div className="pl-5 pr-2 py-1 space-y-5 border-l border-[#1a2a40] ml-5">
                    {otcSections.map((section, idx) => (
                      <div key={idx} className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-1.5">
                          {section.title}
                        </p>
                        {section.items.map((sub) => {
                          const SubIcon = sub.icon;
                          const isActive = location.pathname === sub.path;

                          return (
                            <button
                              key={sub.id}
                              onClick={() => {
                                navigate(sub.path);
                                if (onClose) onClose();
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-[13px] transition-all duration-200 ${isActive
                                  ? 'bg-[#1a2a40] text-emerald-400 font-medium border border-[#2a3f5f]'
                                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2a40]/50 border border-transparent'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <SubIcon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                                <span>{sub.label}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </li>

              {/* REMAINING ADMIN ITEMS (General Ledger, Rates) */}
              {adminItems.filter(item => item.to !== '/vault').map(({ to, label, icon: Icon }) => (
                <li key={to} className="pt-2">
                  <NavLink
                    to={to}
                    onClick={onClose}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${isActive
                        ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2a40]/50'
                      }`}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                        {label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}

              {/* ==========================================
                  SYSTEM ADMINISTRATION
              ========================================== */}
              <div className="mt-6 pt-4 border-t border-[#1a2a40]">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-1.5">System</p>
                <li>
                  <NavLink
                    to="/admin/users"  // ← Changed from /admin/settings
                    onClick={onClose}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${isActive
                        ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2a40]/50'
                      }`}
                  >
                    {({ isActive }) => (
                      <>
                        <Settings className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span>Administration</span>
                      </>
                    )}
                  </NavLink>
                </li>
              </div>
            </>
          )}
        </ul>
      </nav>

      {/* ==========================================
          3. FOOTER - USER INFO & LOGOUT ONLY
      ========================================== */}
      <div className="px-4 pb-6 pt-4 bg-[#050b14] border-t border-[#1a2a40] space-y-3 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">

        {/* User Info Display */}
        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#0d1a2d] border border-[#1e3a5f]/50">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${viewAsAdmin
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-blue-500/20 text-blue-400'
              }`}>
              {user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${viewAsAdmin ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                <p className="text-[10px] text-slate-400 truncate">{viewAsAdmin ? 'Administrator' : 'Retail User'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Logout Button */}
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