
//@ts-nocheck

import { useState, useEffect, useCallback } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, User, LogOut, Settings, ChevronDown, FileText, ShieldCheck, Scale, CircleAlert, CheckCircle2, XCircle } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '../../contexts/AuthContext'
import { getAdminNotifications, markAllAdminNotificationsRead, getRetailNotifications, markAllRetailNotificationsRead } from '../../api/client'
import useWebsocket from '../../hooks/useWebsocket'

export default function AppLayout() {
  const { user, logout, viewAsAdmin, toggleViewAsAdmin } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Dropdown States
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showNotifMenu, setShowNotifMenu] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const location = useLocation()

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const notificationType = isAdmin ? 'admin' : 'retail'

  const fetchNotifications = useCallback(async () => {
    try {
      const res = isAdmin ? await getAdminNotifications() : await getRetailNotifications()
      setNotifications(res.data?.notifications || [])
      setUnreadCount(Number(res.data?.unreadCount || 0))
    } catch {
      // keep UI quiet if notifications are unavailable
    }
  }, [isAdmin])

  // Real-time push: the backend (see backend/notifications.py's notify_user,
  // called from ramp.py/swap_engine.py/airtime_ledger.py/the deposit watchers/
  // otc_admin.py's KYC review) broadcasts a `notification` event over the
  // existing /ws/dashboard socket the instant a deposit/withdrawal/swap/
  // airtime redemption/KYC review happens, instead of waiting for the bell's
  // next 30s poll.
  const currentUserId = (() => {
    try {
      const stored = JSON.parse(localStorage.getItem('meshex_user') || 'null')
      return stored ? (stored._id || stored.id || null) : null
    } catch { return null }
  })()

  useWebsocket('/ws/dashboard', isAdmin ? null : currentUserId, (msg: any) => {
    if (!msg || msg.type !== 'notification') return
    fetchNotifications()
  })

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

  useEffect(() => {
    fetchNotifications()
    const timer = window.setInterval(fetchNotifications, 30000)
    return () => window.clearInterval(timer)
  }, [isAdmin])

  // Enforce KYC enrollment for new users
  useEffect(() => {
    if (user && user.kycStatus !== 'verified' && location.pathname !== '/kyc') {
      navigate('/kyc');
    }
  }, [user, location.pathname, navigate]);

  const closeAllMenus = () => {
    setShowUserMenu(false)
    setShowSettingsMenu(false)
    setShowNotifMenu(false)
  }

  const handleMarkAllNotificationsRead = async () => {
    try {
      if (notificationType === 'admin') {
        await markAllAdminNotificationsRead()
      } else {
        await markAllRetailNotificationsRead()
      }
      await fetchNotifications()
    } finally {
      setShowNotifMenu(false)
    }
  }

  // Derive current page title from route
  const getPageTitle = () => {
    const path = location.pathname
    if (path.startsWith('/dashboard')) return "Dashboard"
    if (path.startsWith('/wallets')) return "My Wallets"
    if (path.startsWith('/swap')) return "Quick Swap"
    if (path.startsWith('/deposit')) return "Deposit Funds"
    if (path.startsWith('/withdraw')) return "Withdraw Funds"
    if (path.startsWith('/redeem-airtime')) return "Redeem Airtime"
    // if (path.startsWith('/impala-coin')) return "Impala Coin"
    if (path.startsWith('/transactions')) return "Transactions"
    if (path.startsWith('/profile')) return "Profile"
    if (path.startsWith('/kyc')) return "Identity Verification"
    return "Workspace"
  }

  return (
    <div className="flex min-h-screen bg-[#06090F] text-gray-200">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
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
      <main className="flex-1 min-h-screen overflow-x-hidden lg:ml-[260px] flex flex-col relative">

        {/* 🟢 TOP BAR (JASIRI BRANDING & NOTIFICATIONS) */}
        <div className="sticky top-0 z-20 bg-[#06090F]/90 backdrop-blur-md border-b border-[#1E2533]">

          {/* Mobile Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#111827] border border-[#1E2533] text-gray-300"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-white font-black text-lg flex-1 text-center tracking-wide">JASIRI</span>

            {/* Mobile Right Icons */}
            <div className="flex items-center gap-3">
              <button onClick={() => setShowNotifMenu(!showNotifMenu)} className="relative p-2">
                <Bell className="w-5 h-5 text-gray-400" />
                {unreadCount > 0 && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#06090F]" />}
              </button>
            </div>
          </div>

          {/* Desktop Top Bar */}
          <div className="hidden lg:flex items-center justify-between px-8 py-4">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-bold text-white tracking-wide">{getPageTitle()}</h1>
            </div>

            <div className="flex items-center gap-4 relative">

              {/* 1. NOTIFICATION BELL */}
              <div className="relative">
                <button
                  onClick={() => { setShowNotifMenu(!showNotifMenu); setShowUserMenu(false); }}
                  className="relative p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#06090F]" />}
                </button>

                {/* NOTIFICATION DROPDOWN */}
                {showNotifMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifMenu(false)} />
                    <div className="absolute right-0 top-full mt-3 w-80 bg-[#0B0E14] border border-[#1E2533] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="p-4 border-b border-[#1E2533] flex justify-between items-center bg-[#111827]">
                        <h3 className="text-sm font-bold text-white">Notifications</h3>
                        <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-bold">{unreadCount} New</span>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {notifications.length > 0 ? notifications.map((notification) => {
                          // `type` carries severity — "error"/"high" for failures (deposit/
                          // withdrawal/swap/airtime/KYC failures, low-balance alerts),
                          // "success" for the new event notifications, everything else
                          // (e.g. "medium" liquidity warnings) in between.
                          const isBad = notification.type === 'error' || notification.type === 'high'
                          const isWarn = notification.type === 'medium'
                          return (
                          <div key={notification.id} className={`p-4 border-b border-[#1E2533]/50 hover:bg-[#111827] transition-colors cursor-pointer flex gap-3 ${notification.isRead ? 'opacity-70' : ''}`}>
                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${isBad ? 'bg-red-500/10 border-red-500/20' : isWarn ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                              {isBad ? <XCircle className="w-4 h-4 text-red-400" /> : isWarn ? <CircleAlert className="w-4 h-4 text-amber-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white mb-0.5">{notification.title}</p>
                              <p className="text-xs text-gray-400 leading-relaxed">{notification.message}</p>
                              <p className="text-[10px] text-gray-500 mt-2 font-mono">{notification.createdAtLabel || 'Just now'}</p>
                            </div>
                          </div>
                          )
                        }) : (
                          <div className="p-4 text-sm text-gray-500">No notifications yet.</div>
                        )}
                      </div>
                      <button onClick={handleMarkAllNotificationsRead} className="w-full p-3 border-t border-[#1E2533] text-center bg-[#111827] hover:bg-[#1A2533] cursor-pointer transition-colors">
                        <span className="text-xs text-[#00d282] font-bold">Mark all as read</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* 2. USER AVATAR & DROPDOWN */}
              <div className="relative">
                <button
                  onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifMenu(false); }}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity ml-1"
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-[#1E2533]" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#00d282] text-[#06090F] flex items-center justify-center font-bold text-sm uppercase">
                      {user?.name?.[0] || user?.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* USER PROFILE DROPDOWN */}
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-3 w-64 bg-[#0B0E14] border border-[#1E2533] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="p-4 border-b border-[#1E2533] bg-[#111827]">
                        <p className="text-sm font-bold text-white truncate">{user?.name || user?.displayName || 'Jasiri User'}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email || 'user@jasiri.com'}</p>
                        {user?.kycStatus === 'verified' && (
                          <span className="inline-block mt-2 text-[9px] bg-[#00d282]/10 text-[#00d282] border border-[#00d282]/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            Verified Account
                          </span>
                        )}
                      </div>
                      <div className="p-2">
                        <button onClick={() => { navigate('/profile'); setShowUserMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-[#1A2533] rounded-lg flex items-center gap-3 transition-colors">
                          <User className="w-4 h-4" /> My Profile
                        </button>

                        {/* Admin Mode Toggle moved here for cleanliness */}
                        {(user?.role === 'admin' || user?.role === 'super_admin') && (
                          <button
                            onClick={() => { toggleViewAsAdmin(); setShowUserMenu(false); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg flex items-center gap-3 transition-colors mt-1"
                          >
                            <ShieldCheck className="w-4 h-4" /> {viewAsAdmin ? 'Switch to Retail' : 'Switch to Admin'}
                          </button>
                        )}
                      </div>
                      <div className="p-2 border-t border-[#1E2533]">
                        <button className="p-2 text-gray-400 hover:text-white transition-colors ml-1">
                          <Settings className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 3. SETTINGS ICON 
              <button className="p-2 text-gray-400 hover:text-white transition-colors ml-1">
                <Settings className="w-5 h-5" />
              </button>

              */}

            </div>
          </div>
        </div>

        {/* Dynamic Page Content */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  )
}