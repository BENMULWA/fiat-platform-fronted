import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, User, LogOut, ChevronDown, Sun, Moon, ShieldAlert, CircleAlert, CheckCircle2, XCircle } from 'lucide-react'
import InstitutionalSidebar from './InstitutionalSidebar'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useInstitutional } from '../../contexts/InstitutionalContext'
import { getRetailNotifications, markAllRetailNotificationsRead } from '../../api/client'
import useWebsocket from '../../hooks/useWebsocket'
import MerchantAvatar from '../otc/MerchantAvatar'
import { fireEventNotification } from '../../utils/pushNotifications'

const PAGE_TITLES: [string, string][] = [
  ['/otc/onboarding', 'Onboarding'],
  ['/otc/overview', 'Dashboard'],
  ['/otc/wallet', 'Wallet Balances'],
  ['/otc/collections', 'Collections'],
  ['/otc/payouts', 'Payouts'],
  ['/otc/request', 'New Conversion'],
  ['/otc/rfqs', 'Conversion'],
  ['/otc/settlements', 'Settlements'],
  ['/otc/profile', 'Profile'],
  ['/otc/transactions', 'Transactions History'],
]

const ONBOARDING_COPY: Record<string, { title: string; body: string }> = {
  not_started: { title: 'Complete onboarding to start settling', body: 'Finish your KYB onboarding to unlock conversions and settlements.' },
  under_review: { title: 'Onboarding under review', body: 'This usually takes a max of 24hrs of business days. You can keep browsing in the meantime.' },
  rejected: { title: 'Onboarding needs attention', body: 'Your submission was rejected. Please review and resubmit.' },
}

export default function InstitutionalLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { onboardingStatus, isApproved, refetch: refetchOnboarding } = useInstitutional()
  const navigate = useNavigate()
  const location = useLocation()
  const isLight = theme === 'light'

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifMenu, setShowNotifMenu] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getRetailNotifications()
      setNotifications(res.data?.notifications || [])
      setUnreadCount(Number(res.data?.unreadCount || 0))
    } catch {
      // keep UI quiet if notifications are unavailable
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const timer = window.setInterval(fetchNotifications, 30000)
    return () => window.clearInterval(timer)
  }, [fetchNotifications])

  // Single websocket bridge for the whole portal session -- replaces the one
  // InstitutionalRoute.tsx used to mount per-route.
  useWebsocket('/ws/dashboard', user?.id || null, (msg: any) => {
    if (!msg) return
    // Rebroadcast every message as a window event so any page below this
    // layout can react live without opening a second socket -- see
    // useOtcLiveEvent's comment. Dashboard.tsx listens for "settlement"
    // category pushes (quote ready / settlement progress) to refresh
    // without polling.
    window.dispatchEvent(new CustomEvent('jasiri:otc-live', { detail: msg }))
    if (msg.type === 'notification') {
      fetchNotifications()
      fireEventNotification({ title: msg.title, message: msg.message, category: msg.category, severity: msg.severity })
      // An admin approve/reject decision pushes a "onboarding" category
      // notification (routes/otc_admin.py's approve/reject endpoints) --
      // pull the fresh onboardingStatus into the shared context right away
      // instead of waiting for a manual reload, so the sidebar badge/banner,
      // the nav item and the onboarding page itself all update live.
      if (msg.category === 'onboarding') {
        refetchOnboarding()
      }
    }
  })

  useEffect(() => {
    setSidebarOpen(false)
    setShowUserMenu(false)
    setShowNotifMenu(false)
  }, [location.pathname])

  const getPageTitle = () => {
    const match = PAGE_TITLES.find(([prefix]) => location.pathname.startsWith(prefix))
    return match ? match[1] : 'B2B Portal'
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllRetailNotificationsRead()
      await fetchNotifications()
    } finally {
      setShowNotifMenu(false)
    }
  }

  const bannerCopy = ONBOARDING_COPY[onboardingStatus]
  const showBanner = !isApproved && !!bannerCopy && !bannerDismissed && !location.pathname.startsWith('/otc/onboarding')

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${isLight ? 'bg-slate-50 text-slate-800' : 'bg-[#06090F] text-gray-200'}`}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed top-0 left-0 z-40 h-screen transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <InstitutionalSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="flex-1 min-h-screen overflow-x-hidden lg:ml-[260px] flex flex-col relative">
        <div className={`sticky top-0 z-20 backdrop-blur-md border-b transition-colors duration-300 ${isLight ? 'bg-white/90 border-slate-200' : 'bg-[#06090F]/90 border-[#1E2533]'}`}>
          <div className="flex items-center justify-between px-4 py-3 lg:hidden">
            <button onClick={() => setSidebarOpen(true)} className={`w-10 h-10 flex items-center justify-center rounded-xl border ${isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-[#111827] border-[#1E2533] text-gray-300'}`}>
              <Menu className="w-5 h-5" />
            </button>
            <span className={`font-black text-lg flex-1 text-center tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>JASIRI</span>
            <div className="flex items-center gap-3">
              <button onClick={toggleTheme} aria-label="Toggle light/dark mode" className={`p-2 rounded-full border transition-colors ${isLight ? 'bg-white border-slate-200 text-amber-500' : 'bg-[#111827] border-[#1E2533] text-blue-400'}`}>
                {isLight ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button onClick={() => setShowNotifMenu(!showNotifMenu)} className="relative p-2">
                <Bell className={`w-5 h-5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`} />
                {unreadCount > 0 && <span className={`absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full border ${isLight ? 'border-white' : 'border-[#06090F]'}`} />}
              </button>
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-between px-8 py-4">
            <div className="flex items-center gap-3">
              <h1 className={`text-base font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>{getPageTitle()}</h1>
              {!isApproved && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border flex items-center gap-1 ${isLight ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                  <ShieldAlert className="w-3 h-3" /> {onboardingStatus.replace(/_/g, ' ')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 relative">
              <button onClick={toggleTheme} aria-label="Toggle light/dark mode" className={`p-2 rounded-full border transition-all ${isLight ? 'bg-white border-slate-200 text-amber-500 shadow-sm hover:bg-slate-50' : 'bg-[#111827] border-[#1E2533] text-blue-400 hover:bg-[#1A2533]'}`}>
                {isLight ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="relative">
                <button onClick={() => { setShowNotifMenu(!showNotifMenu); setShowUserMenu(false) }} className={`relative p-2 transition-colors ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-gray-400 hover:text-white'}`}>
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && <span className={`absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full border ${isLight ? 'border-white' : 'border-[#06090F]'}`} />}
                </button>
                {showNotifMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifMenu(false)} />
                    <div className={`absolute right-0 top-full mt-3 w-80 border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0B0E14] border-[#1E2533]'}`}>
                      <div className={`p-4 border-b flex justify-between items-center ${isLight ? 'border-slate-200 bg-slate-50' : 'border-[#1E2533] bg-[#111827]'}`}>
                        <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Notifications</h3>
                        <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-bold">{unreadCount} New</span>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {notifications.length > 0 ? notifications.map((n) => {
                          const isBad = n.type === 'error' || n.type === 'high'
                          const isWarn = n.type === 'medium'
                          // Looked clickable (cursor-pointer) but had no
                          // onClick at all -- same gap as the admin bell had.
                          return (
                            <button type="button" key={n.id} onClick={() => { setShowNotifMenu(false); if (n.route) navigate(n.route) }} className={`w-full text-left p-4 border-b transition-colors flex gap-3 ${n.route ? 'cursor-pointer' : 'cursor-default'} ${isLight ? 'border-slate-100 hover:bg-slate-50' : 'border-[#1E2533]/50 hover:bg-[#111827]'} ${n.isRead ? 'opacity-70' : ''}`}>
                              <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${isBad ? 'bg-red-500/10 border-red-500/20' : isWarn ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                                {isBad ? <XCircle className="w-4 h-4 text-red-400" /> : isWarn ? <CircleAlert className="w-4 h-4 text-amber-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                              </div>
                              <div>
                                <p className={`text-sm font-bold mb-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>{n.title}</p>
                                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{n.message}</p>
                                <p className={`text-[10px] mt-2 font-mono ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{n.createdAtLabel || 'Just now'}</p>
                              </div>
                            </button>
                          )
                        }) : (
                          <div className={`p-4 text-sm ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>No notifications yet.</div>
                        )}
                      </div>
                      <button onClick={handleMarkAllRead} className={`w-full p-3 border-t text-center cursor-pointer transition-colors ${isLight ? 'border-slate-200 bg-slate-50 hover:bg-slate-100' : 'border-[#1E2533] bg-[#111827] hover:bg-[#1A2533]'}`}>
                        <span className="text-xs text-[#00d282] font-bold">Mark all as read</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifMenu(false) }} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity ml-1">
                  <MerchantAvatar src={user?.avatarUrl} seed={String((user as any)?.businessName || user?.name || user?.email || 'merchant')} className={`w-8 h-8 border ${isLight ? 'border-slate-200' : 'border-[#1E2533]'}`} />
                  <ChevronDown className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-gray-400'}`} />
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className={`absolute right-0 top-full mt-3 w-64 border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0B0E14] border-[#1E2533]'}`}>
                      <div className={`p-4 border-b ${isLight ? 'border-slate-200 bg-slate-50' : 'border-[#1E2533] bg-[#111827]'}`}>
                        <p className={`text-sm font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{(user as any)?.businessName || user?.name || 'Institutional Account'}</p>
                        <p className={`text-xs truncate mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{user?.email}</p>
                        <span className={`inline-block mt-2 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${isApproved ? 'bg-[#00d282]/10 text-[#00d282] border-[#00d282]/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                          {isApproved ? 'Approved' : onboardingStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="p-2">
                        <button onClick={() => { navigate('/otc/profile'); setShowUserMenu(false) }} className={`w-full text-left px-4 py-2.5 text-sm rounded-lg flex items-center gap-3 transition-colors ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-gray-300 hover:text-white hover:bg-[#1A2533]'}`}>
                          <User className="w-4 h-4" /> My Profile
                        </button>
                        <button onClick={toggleTheme} className={`w-full text-left px-4 py-2.5 text-sm rounded-lg flex items-center gap-3 transition-colors mt-1 ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-gray-300 hover:text-white hover:bg-[#1A2533]'}`}>
                          {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                          {isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                        </button>
                        <button onClick={logout} className="w-full text-left px-4 py-2.5 text-sm rounded-lg flex items-center gap-3 transition-colors mt-1 text-red-400 hover:bg-red-500/10">
                          <LogOut className="w-4 h-4" /> Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 flex-1">
          {showBanner && bannerCopy && (
            <div className={`mb-4 p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-500/10 border-amber-500/30 text-amber-200'}`}>
              <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500" />
              <div className="flex-1">
                <p className="text-sm font-bold">{bannerCopy.title}</p>
                <p className="text-xs opacity-80 mt-0.5">{bannerCopy.body}</p>
              </div>
              <button onClick={() => navigate('/otc/onboarding')} className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#06090F] transition-colors">
                {onboardingStatus === 'rejected' ? 'Review & resubmit' : 'Finish onboarding'}
              </button>
              <button onClick={() => setBannerDismissed(true)} className={`shrink-0 transition-colors ${isLight ? 'text-amber-400 hover:text-amber-600' : 'text-amber-400/60 hover:text-amber-300'}`} aria-label="Dismiss">
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
