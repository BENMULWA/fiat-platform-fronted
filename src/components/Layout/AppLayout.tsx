import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, User, LogOut, Settings, ChevronDown, FileText, ShieldCheck, Scale } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '../../contexts/AuthContext'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showNotifMenu, setShowNotifMenu] = useState(false)
  const location = useLocation()

  const toggleViewAsAdmin = () => {
    // Implement admin toggle logic here
    console.log('Toggling admin view')
  }

  // Close sidebars/menus on route change or resize
  useEffect(() => {
    setSidebarOpen(false)
    setShowUserMenu(false)
    setShowSettingsMenu(false)
    setShowNotifMenu(false)
  }, [location.pathname])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close menus when clicking outside
  const closeAllMenus = () => {
    setShowUserMenu(false)
    setShowSettingsMenu(false)
    setShowNotifMenu(false)
  }

  // Derive current page title from route (Optional but looks great)
  const getPageTitle = () => {
    const path = location.pathname
    if (path.startsWith('/wallet')) return "My Wallet"
    if (path.startsWith('/trade')) return "Quick Swap"
    if (path.startsWith('/deposit')) return "Deposit Funds"
    if (path.startsWith('/withdraw')) return "Withdraw Funds"
    if (path.startsWith('/redeem-airtime')) return "Redeem Airtime"
    if (path.startsWith('/impala-coin')) return "Impala Coin"
    if (path.startsWith('/transactions')) return "Transactions"
    if (path.startsWith('/profile')) return "Profile"
    if (path.startsWith('/kyc')) return "KYC Verification"
    return "Dashboard"
  }

  return (
    <div className="flex min-h-screen bg-[#0a0e17] text-gray-200">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeAllMenus}
        />
      )}

      {/* Sidebar Drawer */}
      <div
        className={`fixed top-0 left-0 z-40 h-screen transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex-1 min-h-screen overflow-x-hidden lg:ml-[260px]">

        {/* 🟢 UPDATED: Sticky Top Bar (Mobile & Desktop) */}
        <div className="sticky top-0 z-20 bg-[#070f19] border-b border-[#1a2a40]">
          {/* Mobile Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-gray-300"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-white font-semibold text-sm flex-1 text-center">Meshex</span>

            {/* Mobile Right Icons */}
            <div className="flex items-center gap-2">
              <button onClick={() => setShowNotifMenu(!showNotifMenu)} className="relative p-2 rounded-lg hover:bg-white/10 transition-colors">
                <Bell className="w-5 h-5 text-slate-400" />
                {/* Notification Dot */}
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="relative p-2 rounded-lg hover:bg-white/10 transition-colors">
                <User className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Desktop Top Bar */}
          <div className="hidden lg:flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-bold text-slate-300">{getPageTitle()}</h1>
            </div>

            <div className="flex items-center gap-2 relative">
              {/* Notifications */}
              <button
                onClick={() => { setShowNotifMenu(!showNotifMenu); setShowSettingsMenu(false); setShowUserMenu(false) }}
                className="relative p-2 rounded-lg hover:bg-[#1e2d3d] transition-colors"
              >
                <Bell className="w-5 h-5 text-slate-400" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* User Avatar / Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => { setShowUserMenu(!showUserMenu); setShowSettingsMenu(false); setShowNotifMenu(false) }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#1e2d3d] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-[10px] font-bold text-white">
                    {user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#111827] border border-[#1e2d3d] rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-50">
                    <div className="p-2 border-b border-[#1e2d3d] px-4 py-2 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0d1420] flex items-center justify-center text-sm font-bold text-slate-300">
                        {user?.email?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{user?.email || "user@email.com"}</p>
                        <p className="text-[10px] text-slate-500">Retail User</p>
                      </div>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { setShowUserMenu(false); navigate('/profile') }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-[#1a2638] rounded-lg transition-colors flex items-center gap-3"
                      >
                        <User className="w-4 h-4 text-slate-400" /> My Profile
                      </button>
                      <button
                        onClick={() => { setShowUserMenu(false); navigate('/transactions') }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-[#1a2638] rounded-lg transition-colors flex items-center gap-3"
                      >
                        <FileText className="w-4 h-4 text-slate-400" /> Transaction History
                      </button>
                      <button
                        onClick={() => { setShowUserMenu(false); navigate('/kyc') }}
                        className="w-full text-left px-4 py-2.5 text-sm text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors flex items-center gap-3"
                      >
                        <ShieldCheck className="w-4 h-4" /> KYC Verification
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Settings Dropdown */}
              <div className="relative">
                <button
                  onClick={() => { setShowSettingsMenu(!showSettingsMenu); setShowUserMenu(false); setShowNotifMenu(false) }}
                  className="p-2 rounded-lg hover:bg-[#1e2d3d] transition-colors"
                >
                  <Settings className="w-5 h-5 text-slate-400" />
                </button>

                {showSettingsMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[#111827] border border-[#1e2d3d] rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-50">
                    <div className="p-2 border-b border-[#1e2d3d] px-4 py-2">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">System</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { setShowSettingsMenu(false); navigate('/settings') }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-[#1a2638] rounded-lg transition-colors flex items-center gap-3"
                      >
                        <Settings className="w-4 h-4 text-slate-400" /> Settings
                      </button>
                      <button
                        onClick={() => { setShowSettingsMenu(false); toggleViewAsAdmin() }}
                        className="w-full text-left px-4 py-2.5 text-sm text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors flex items-center gap-3"
                      >
                        <Scale className="w-4 h-4 text-orange-400" /> Switch to Admin
                      </button>
                      <button
                        onClick={() => { setShowSettingsMenu(false); logout(); navigate('/') }}
                        className="w-full text-left px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-3"
                      >
                        <LogOut className="w-4 h-4 text-red-400" /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}