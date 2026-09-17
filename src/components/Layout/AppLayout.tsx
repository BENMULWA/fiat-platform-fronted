
//@ts-nocheck

import { useState, useEffect, useCallback } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, User, LogOut, Settings, ChevronDown, FileText, ShieldCheck, Scale, CircleAlert, CheckCircle2, XCircle, Sun, Moon } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { getAdminNotifications, markAllAdminNotificationsRead, getRetailNotifications, markAllRetailNotificationsRead } from '../../api/client'
import useWebsocket from '../../hooks/useWebsocket'
import { fireEventNotification, getNotificationPermission, hasAskedForPermission, requestNotificationPermission } from '../../utils/pushNotifications'

export default function AppLayout() {
  const { user, logout, viewAsAdmin, toggleViewAsAdmin } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // The admin/treasury side (Market Maker, Dealer Workspace, etc.) stays
  // permanently dark regardless of the retail light/dark toggle -- it's a
  // different, unthemed page set (MarketMakerPage.tsx and friends are still
  // hardcoded dark), so letting this shared shell go light while viewing
  // admin would mismatch the sidebar/topbar against page content that never
  // got a light variant.
  const isLight = !viewAsAdmin && theme === 'light'

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
    // MiniPay/Binance-style popup: same event that updates the bell also
    // pops an in-app toast and, if the browser has granted permission, a
    // native OS-level notification — so a deposit/withdrawal/swap/KYC
    // result reaches the user even if they're not staring at the bell.
    fireEventNotification({ title: msg.title, message: msg.message, category: msg.category, severity: msg.severity })
  })

  // Offer OS notification permission via an explicit banner + button click
  // (never an unprompted browser dialog on load) — a silent auto-request
  // that gets ignored/dismissed repeatedly risks Chrome auto-blocking the
  // site from ever asking again. Shown once per browser via
  // hasAskedForPermission(), and never to admins viewing this same shell.
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission())
  const [showNotifBanner, setShowNotifBanner] = useState(false)
  useEffect(() => {
    setShowNotifBanner(!viewAsAdmin && notifPermission === 'default' && !hasAskedForPermission())
  }, [viewAsAdmin, notifPermission])

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission()
    setNotifPermission(result)
    setShowNotifBanner(false)
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
    if (path.startsWith('/transfer')) return "Send to Jasiri User"
    if (path.startsWith('/redeem-airtime')) return "Redeem Airtime"
    // if (path.startsWith('/impala-coin')) return "Impala Coin"
    if (path.startsWith('/transactions')) return "Transactions"
    if (path.startsWith('/profile')) return "Profile"
    if (path.startsWith('/kyc')) return "Identity Verification"
    return "Workspace"
  }

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${isLight ? 'bg-slate-50 text-slate-800' : 'bg-[#06090F] text-gray-200'}`}>
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
        <div className={`sticky top-0 z-20 backdrop-blur-md border-b transition-colors duration-300 ${isLight ? 'bg-white/90 border-slate-200' : 'bg-[#06090F]/90 border-[#1E2533]'}`}>

          {/* Mobile Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`w-10 h-10 flex items-center justify-center rounded-xl border ${isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-[#111827] border-[#1E2533] text-gray-300'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className={`font-black text-lg flex-1 text-center tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>JASIRI</span>

            {/* Mobile Right Icons */}
            <div className="flex items-center gap-3">
              {!viewAsAdmin && (
                <button
                  onClick={toggleTheme}
                  aria-label="Toggle light/dark mode"
                  className={`p-2 rounded-full border transition-colors ${isLight ? 'bg-white border-slate-200 text-amber-500' : 'bg-[#111827] border-[#1E2533] text-blue-400'}`}
                >
                  {isLight ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              )}
              <button onClick={() => setShowNotifMenu(!showNotifMenu)} className="relative p-2">
                <Bell className={`w-5 h-5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`} />
                {unreadCount > 0 && <span className={`absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full border ${isLight ? 'border-white' : 'border-[#06090F]'}`} />}
              </button>
            </div>
          </div>

          {/* Desktop Top Bar */}
          <div className="hidden lg:flex items-center justify-between px-8 py-4">
            <div className="flex items-center gap-3">
              <h1 className={`text-base font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>{getPageTitle()}</h1>
            </div>

            <div className="flex items-center gap-4 relative">

              {/* 0. LIGHT / DARK TOGGLE (Retail only) */}
              {!viewAsAdmin && (
                <button
                  onClick={toggleTheme}
                  aria-label="Toggle light/dark mode"
                  className={`p-2 rounded-full border transition-all ${isLight ? 'bg-white border-slate-200 text-amber-500 shadow-sm hover:bg-slate-50' : 'bg-[#111827] border-[#1E2533] text-blue-400 hover:bg-[#1A2533]'}`}
                >
                  {isLight ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              )}

              {/* 1. NOTIFICATION BELL */}
              <div className="relative">
                <button
                  onClick={() => { setShowNotifMenu(!showNotifMenu); setShowUserMenu(false); }}
                  className={`relative p-2 transition-colors ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-gray-400 hover:text-white'}`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && <span className={`absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full border ${isLight ? 'border-white' : 'border-[#06090F]'}`} />}
                </button>

                {/* NOTIFICATION DROPDOWN */}
                {showNotifMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifMenu(false)} />
                    <div className={`absolute right-0 top-full mt-3 w-80 border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0B0E14] border-[#1E2533]'}`}>
                      <div className={`p-4 border-b flex justify-between items-center ${isLight ? 'border-slate-200 bg-slate-50' : 'border-[#1E2533] bg-[#111827]'}`}>
                        <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Notifications</h3>
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
                          <div key={notification.id} className={`p-4 border-b transition-colors cursor-pointer flex gap-3 ${isLight ? 'border-slate-100 hover:bg-slate-50' : 'border-[#1E2533]/50 hover:bg-[#111827]'} ${notification.isRead ? 'opacity-70' : ''}`}>
                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${isBad ? 'bg-red-500/10 border-red-500/20' : isWarn ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                              {isBad ? <XCircle className="w-4 h-4 text-red-400" /> : isWarn ? <CircleAlert className="w-4 h-4 text-amber-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                            </div>
                            <div>
                              <p className={`text-sm font-bold mb-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>{notification.title}</p>
                              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{notification.message}</p>
                              <p className={`text-[10px] mt-2 font-mono ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{notification.createdAtLabel || 'Just now'}</p>
                            </div>
                          </div>
                          )
                        }) : (
                          <div className={`p-4 text-sm ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>No notifications yet.</div>
                        )}
                      </div>
                      <button onClick={handleMarkAllNotificationsRead} className={`w-full p-3 border-t text-center cursor-pointer transition-colors ${isLight ? 'border-slate-200 bg-slate-50 hover:bg-slate-100' : 'border-[#1E2533] bg-[#111827] hover:bg-[#1A2533]'}`}>
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
                    <img src={user.avatarUrl} alt="" className={`w-8 h-8 rounded-full object-cover border ${isLight ? 'border-slate-200' : 'border-[#1E2533]'}`} />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#00d282] text-[#06090F] flex items-center justify-center font-bold text-sm uppercase">
                      {user?.name?.[0] || user?.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <ChevronDown className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-gray-400'}`} />
                </button>

                {/* USER PROFILE DROPDOWN */}
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className={`absolute right-0 top-full mt-3 w-64 border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0B0E14] border-[#1E2533]'}`}>
                      <div className={`p-4 border-b ${isLight ? 'border-slate-200 bg-slate-50' : 'border-[#1E2533] bg-[#111827]'}`}>
                        <p className={`text-sm font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{user?.name || user?.displayName || 'Jasiri User'}</p>
                        <p className={`text-xs truncate mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{user?.email || 'user@jasiri.com'}</p>
                        {user?.kycStatus === 'verified' && (
                          <span className="inline-block mt-2 text-[9px] bg-[#00d282]/10 text-[#00d282] border border-[#00d282]/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            Verified Account
                          </span>
                        )}
                      </div>
                      <div className="p-2">
                        <button onClick={() => { navigate('/profile'); setShowUserMenu(false); }} className={`w-full text-left px-4 py-2.5 text-sm rounded-lg flex items-center gap-3 transition-colors ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-gray-300 hover:text-white hover:bg-[#1A2533]'}`}>
                          <User className="w-4 h-4" /> My Profile
                        </button>

                        {/* Retail-only light/dark toggle, mirrored inside the menu for discoverability */}
                        {!viewAsAdmin && (
                          <button
                            onClick={() => { toggleTheme(); }}
                            className={`w-full text-left px-4 py-2.5 text-sm rounded-lg flex items-center gap-3 transition-colors mt-1 ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-gray-300 hover:text-white hover:bg-[#1A2533]'}`}
                          >
                            {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                            {isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                          </button>
                        )}

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
                      <div className={`p-2 border-t ${isLight ? 'border-slate-200' : 'border-[#1E2533]'}`}>
                        <button className={`p-2 transition-colors ml-1 ${isLight ? 'text-slate-400 hover:text-slate-900' : 'text-gray-400 hover:text-white'}`}>
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
          {showNotifBanner && (
            <div className={`mb-4 p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${isLight ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-blue-500/10 border-blue-500/30 text-blue-200'}`}>
              <Bell className="w-5 h-5 shrink-0 text-blue-500" />
              <span className="flex-1 text-sm font-medium">Turn on notifications to get instant alerts the moment a deposit or withdrawal completes.</span>
              <button
                onClick={handleEnableNotifications}
                className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white transition-colors"
              >
                Enable
              </button>
              <button
                onClick={() => { setShowNotifBanner(false); try { localStorage.setItem('jasiri_notif_permission_asked', '1') } catch {} }}
                className={`shrink-0 transition-colors ${isLight ? 'text-blue-400 hover:text-blue-600' : 'text-blue-400/60 hover:text-blue-300'}`}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  )
}