//@ts-nocheck

import { useState, FormEvent } from 'react'
import { ShieldCheck, Eye, EyeOff, ArrowDown, ArrowRightLeft, Settings, ChevronDown, Zap, Lock, Clock, TrendingUp, Sun, Moon, Monitor, Play, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import mamlakaLogo from '../pages/assets/mamlaka-logo.png'
import TradePage from './retail/TradePage'
import { executeRamp } from '../api/client' 

type Tab = 'signin' | 'create'
type ViewType = 'landing' | 'auth'
type Theme = 'dark' | 'dim' | 'light'

const TICKERS = [
  { pair: 'KES/USDC', price: '0.00662', change: '+0.12%', up: true },
  { pair: 'KES/cUSD', price: '0.00658', change: '-0.05%', up: false },
  { pair: 'USDC/cUSD', price: '0.9945', change: '+0.01%', up: true },
]

const PREVIEW_ASSETS = [
  { id: 'KES', icon: '🇰🇪' }, { id: 'USDT', icon: '💎' },
  { id: 'USDC', icon: '💙' }, { id: 'cUSD', icon: '🟢' }, { id: 'UGX', icon: '🇺🇬' }
]

const FOOTER_LINKS = {
  "About Us": ["About Jasiri", "Careers", "Blog", "Contact Us"],
  "Products": ["OTC Desk", "P2P Swaps", "API Docs", "Fiat On-Ramp"],
  "Support": ["Help Center", "FAQs", "Submit Request", "System Status"],
  "Legal": ["Terms of Use", "Privacy Policy", "AML Policy", "Risk Disclosure"]
}

const THEMES = {
  dark: { bg: 'bg-[#0a0b0d]', card: 'bg-[#111827]', input: 'bg-[#0a0b0d]', text: 'text-white', subtext: 'text-gray-400', border: 'border-[#1e2329]', hoverBorder: 'hover:border-gray-600', swapBg: 'bg-[#1e2329]', swapInner: 'bg-[#2b3139]' },
  dim: { bg: 'bg-[#1f2937]', card: 'bg-[#374151]', input: 'bg-[#1f2937]', text: 'text-gray-100', subtext: 'text-gray-300', border: 'border-gray-500', hoverBorder: 'hover:border-gray-400', swapBg: 'bg-[#374151]', swapInner: 'bg-[#4b5563]' },
  light: { bg: 'bg-gray-100', card: 'bg-white', input: 'bg-gray-50', text: 'text-gray-900', subtext: 'text-gray-600', border: 'border-gray-200', hoverBorder: 'hover:border-gray-400', swapBg: 'bg-white', swapInner: 'bg-gray-100' }
}

export default function LoginPage() {
  const { user } = useAuth()
  const [view, setView] = useState<ViewType>('landing')
  const [authTab, setAuthTab] = useState<Tab>('signin')
  const [theme, setTheme] = useState<Theme>('dark')

  const t = THEMES[theme];

  // If logged in, show landing page (which now has a functional swap widget)
  // If you prefer showing the full TradePage dashboard, change this back to: return <div className={`min-h-screen ${t.bg}`}><TradePage /></div>
  if (user) {
    return <LandingPage onNavigateToAuth={() => { }} theme={theme} cycleTheme={() => { }} user={user} />
  }

  const handleNavigateToAuth = (tab: Tab) => {
    setAuthTab(tab); setView('auth'); window.scrollTo(0, 0);
  }

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('dim');
    else if (theme === 'dim') setTheme('light');
    else setTheme('dark');
  }

  if (view === 'auth') {
    return <AuthPanel initialTab={authTab} onBack={() => setView('landing')} theme={theme} cycleTheme={cycleTheme} />
  }

  return <LandingPage onNavigateToAuth={handleNavigateToAuth} theme={theme} cycleTheme={cycleTheme} user={null} />
}

// ═══════════════════════════════════════════════════════════
// 🟢 LANDING PAGE
// ═══════════════════════════════════════════════════════════
function LandingPage({ onNavigateToAuth, theme, cycleTheme, user }: { onNavigateToAuth: (tab: Tab) => void, theme: Theme, cycleTheme: () => void, user: any }) {
  const t = THEMES[theme];
  const isDark = theme === 'dark' || theme === 'dim';
  const isLoggedIn = !!user; // 🟢 Check if user exists

  return (
    <div className={`min-h-screen flex flex-col ${t.bg} ${t.text} transition-colors duration-300`} style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      <header className={`flex items-center justify-between px-4 sm:px-6 py-4 border-b ${t.border} ${isDark ? 'bg-[#0a0b0d]/80' : 'bg-white/80'} backdrop-blur-md sticky top-0 z-50`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'} border flex items-center justify-center`}>
            <img src={mamlakaLogo} alt="Jasiri" className="w-4 h-4 object-contain" />
          </div>
          <span className={`font-bold text-base sm:text-lg tracking-wide ${t.text}`}>JASIRI</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={cycleTheme} className={`p-2 rounded-lg ${isDark ? 'bg-[#1e2329] hover:bg-[#2b3139] text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}>
            {theme === 'dark' && <Moon className="w-4 h-4" />}
            {theme === 'dim' && <Monitor className="w-4 h-4" />}
            {theme === 'light' && <Sun className="w-4 h-4" />}
          </button>

          {/* 🟢 CONDITIONAL BUTTONS BASED ON AUTH STATE */}
          {!isLoggedIn ? (
            <>
              <button onClick={() => onNavigateToAuth('signin')} className={`px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-medium ${isDark ? 'text-gray-300 hover:bg-[#1e2329]' : 'text-gray-700 hover:bg-gray-200'} transition-all`}>Login</button>
              <button onClick={() => onNavigateToAuth('create')} className="px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold text-black bg-emerald-500 hover:bg-emerald-400 transition-all shadow-sm">Sign Up</button>
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-400">Logged in as {user.displayName || user.email}</span>
            </div>
          )}
        </div>
      </header>

      <div className={`flex items-center gap-4 sm:gap-6 px-4 py-2 border-b ${t.border} ${isDark ? 'bg-[#0e1015]' : 'bg-gray-50'} overflow-hidden`}>
        {TICKERS.map((tick, i) => (
          <div key={i} className="flex items-center gap-2 whitespace-nowrap">
            <span className={`text-xs font-medium ${t.subtext}`}>{tick.pair}</span>
            <span className={`text-xs font-mono font-bold ${t.text}`}>{tick.price}</span>
            <span className={`text-[10px] font-bold ${tick.up ? 'text-emerald-400' : 'text-red-400'}`}>{tick.change}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 lg:py-24 relative">
        <div className="max-w-[1100px] w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="space-y-5 text-center lg:text-left">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border self-center lg:self-start ${isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
              <Zap className="w-3.5 h-3.5" /> {isLoggedIn ? 'Quick Swap Ready' : 'B2B Arbitrage Platform'}
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
              Exchange Fiat<br /><span className="text-emerald-500">Currency Instantly</span>
            </h1>
            <p className={`${t.subtext} text-base sm:text-lg leading-relaxed max-w-md mx-auto lg:mx-0`}>
              {isLoggedIn ? 'Welcome back! Execute a quick swap right here without navigating away.' : 'Easy On-Ramp & Off-Ramp for your payments — real-time arbitrage desk with zero gas fees.'}
            </p>
          </div>

          <div className="flex justify-center lg:justify-end w-full max-w-md mx-auto lg:max-w-none">
            {/* 🟢 PASS USER STATE TO SWAP WIDGET */}
            <SwapCardPreview theme={theme} user={user} onGetStarted={() => onNavigateToAuth('create')} />
          </div>
        </div>
      </div>

      <LandingFooter theme={theme} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// 🟢 THE MAGIC SWAP WIDGET (PREVIEW vs REAL MODE)
// ═══════════════════════════════════════════════════════════
function SwapCardPreview({ onGetStarted, theme, user }: { onGetStarted: () => void, theme: Theme, user: any }) {
  const { logout } = useAuth(); // Need logout to kick them out if token expires
  const t = THEMES[theme];
  const isDark = theme === 'dark' || theme === 'dim';
  const isLoggedIn = !!user;

  const [fromAsset, setFromAsset] = useState('KES')
  const [toAsset, setToAsset] = useState('USDT')
  const [amount, setAmount] = useState('')

  // Real Swap States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const rates: Record<string, number> = { KES: 130, USDT: 1, USDC: 1, cUSD: 1, UGX: 3500 }
  const pureRate = (rates[fromAsset] || 1) / (rates[toAsset] || 1)
  const executionRate = pureRate * 0.995 // 0.5% fee like your real page
  const parsedAmount = parseFloat(amount) || 0;
  const toAmount = (parsedAmount * executionRate).toFixed(2);

  const handleRealSwap = async () => {
    if (parsedAmount <= 0 || fromAsset === toAsset) return;
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Call your actual backend
      await executeRamp({
        direction: 'swap',
        channel: 'Landing Page Quick Swap',
        from_asset: fromAsset,
        to_asset: toAsset,
        amount: parsedAmount,
        rate: executionRate,
        fee: parsedAmount * pureRate - parseFloat(toAmount),
        counterparty: 'Self'
      });

      setSuccessMsg(`Swapped ${parsedAmount} ${fromAsset} to ${toAmount} ${toAsset}!`);
      setAmount(''); // Clear input on success
    } catch (error: any) {
      // 🚨 CRITICAL: CHECK IF TOKEN EXPIRED (401 Unauthorized)
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Force logout. The LoginPage will automatically re-render 
        // and show the "Login/Sign Up" buttons again.
        logout();
      } else {
        setErrorMsg(error.response?.data?.detail || "Swap failed. Check balance.");
      }
    } finally {
      setIsSubmitting(false);
      setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 5000);
    }
  };

  const PreviewSelector = ({ value, onChange, assets }: { value: string, onChange: (v: string) => void, assets: typeof PREVIEW_ASSETS }) => {
    const meta = assets.find(a => a.id === value) || assets[0];
    return (
      <div className={`relative ${t.swapInner} ${t.border} border rounded-xl h-[44px] flex items-center px-3 gap-2 min-w-[110px] cursor-pointer ${isDark ? 'hover:border-gray-500' : 'hover:border-gray-400'} transition-colors`}>
        <span className="text-base">{meta.icon}</span>
        <span className={`text-sm font-bold flex-1 ${t.text}`}>{value}</span>
        <ChevronDown className={`w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
        <select value={value} onChange={(e) => { onChange(e.target.value); setAmount(''); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer outline-none">
          {assets.map(a => <option key={a.id} value={a.id}>{a.id}</option>)}
        </select>
      </div>
    )
  }

  return (
    <div className={`${t.swapBg} ${t.border} border rounded-2xl shadow-2xl overflow-hidden w-full`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${t.border}`}>
        <span className={`text-sm font-semibold ${t.text}`}>{isLoggedIn ? 'Quick Swap' : 'Preview'}</span>
        {isLoggedIn ? <Zap className="w-4 h-4 text-emerald-400" /> : <Settings className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />}
      </div>

      <div className="p-4 space-y-0">
        <div className="flex items-center gap-3 p-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`bg-transparent text-2xl font-bold w-full outline-none ${t.text} placeholder-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            placeholder="0.0"
          />
          <PreviewSelector value={fromAsset} onChange={setFromAsset} assets={PREVIEW_ASSETS} />
        </div>

        <div className="flex justify-center -my-3 relative z-10">
          <button className={`p-2 ${t.swapBg} border-4 ${isDark ? 'border-[#1e2329]' : 'border-white'} rounded-xl text-emerald-400`}>
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 p-2">
          <input type="text" value={toAmount} readOnly className={`bg-transparent text-2xl font-bold w-full outline-none text-emerald-400`} />
          <PreviewSelector value={toAsset} onChange={setToAsset} assets={PREVIEW_ASSETS} />
        </div>
      </div>

      <div className={`p-4 pt-2 space-y-3 border-t ${t.border} mt-2`}>
        <div className={`flex items-center justify-between text-xs ${t.subtext}`}>
          <span>Rate (inc. 0.5% fee)</span>
          <span className={`font-mono ${t.text}`}>1 {fromAsset} = {executionRate < 1 ? executionRate.toFixed(4) : executionRate.toFixed(2)} {toAsset}</span>
        </div>

        {/* 🟢 TOASTS FOR REAL SWAP */}
        {successMsg && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errorMsg}
          </div>
        )}

        {/* 🟢 CONDITIONAL BUTTON LOGIC */}
        {!isLoggedIn ? (
          <button onClick={onGetStarted} className="w-full py-3.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]">
            <Zap className="w-4 h-4" /> Get Started to Swap
          </button>
        ) : (
          <button
            onClick={handleRealSwap}
            disabled={isSubmitting || parsedAmount <= 0 || fromAsset === toAsset}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Executing...</> : <><Zap className="w-4 h-4" /> Confirm Swap</>}
          </button>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// AUTH PANEL & FOOTER (Unchanged from previous version)
// ═══════════════════════════════════════════════════════════
function AuthPanel({ initialTab, onBack, theme, cycleTheme }: { initialTab: Tab, onBack: () => void, theme: Theme, cycleTheme: () => void }) {
  const { login, signup } = useAuth()
  const t = THEMES[theme];
  const isDark = theme === 'dark' || theme === 'dim';
  const [tab, setTab] = useState<Tab>(initialTab)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError('')
    if (!email || !password) { setError('Email and password are required.'); return }
    if (tab === 'create' && !displayName) { setError('Display name is required.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setIsLoading(true)
    try {
      if (tab === 'signin') await login(email, password)
      else await signup(displayName, email, password)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Authentication failed.')
    } finally { setIsLoading(false) }
  }

  return (
    <div className={`min-h-screen ${t.bg} flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300`}>
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="w-full max-w-[450px] relative z-10">
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className={`flex items-center gap-2 text-sm ${t.subtext} hover:${t.text} transition-colors group`}>
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back
          </button>
          <button onClick={cycleTheme} className={`p-2 rounded-lg ${isDark ? 'bg-[#1e2329] text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
            {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
        <div className={`${t.card} ${t.border} border rounded-2xl p-6 sm:p-8 shadow-2xl`}>
          <div className="flex items-center gap-2 mb-6">
            <div className={`w-8 h-8 rounded-lg ${isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'} border flex items-center justify-center`}>
              <img src={mamlakaLogo} alt="Jasiri" className="w-4 h-4 object-contain" />
            </div>
            <span className={`font-bold text-lg tracking-wide ${t.text}`}>JASIRI CAPITAL</span>
          </div>
          <h1 className={`text-2xl font-extrabold mb-1 ${t.text}`}>{tab === 'signin' ? 'Welcome back.' : 'Create account.'}</h1>
          <p className={`text-sm mb-6 ${t.subtext}`}>{tab === 'signin' ? 'Sign in to access your desk.' : 'Start executing arbitrage today.'}</p>
          <div className={`flex ${t.input} rounded-xl p-1 mb-6 ${t.border} border`}>
            {(['signin', 'create'] as Tab[]).map((t_tab) => (
              <button key={t_tab} type="button" onClick={() => { setTab(t_tab); setError('') }} className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${tab === t_tab ? (isDark ? 'bg-[#1e2329] text-white' : 'bg-white text-gray-900 shadow-sm') : (isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')}`}>
                {t_tab === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'create' && <InputField type="text" value={displayName} onChange={setDisplayName} placeholder="Display Name" theme={theme} />}
            <InputField type="email" value={email} onChange={setEmail} placeholder="Email address" theme={theme} />
            <div className="relative">
              <InputField type={showPw ? 'text' : 'password'} value={password} onChange={setPassword} placeholder="Password" theme={theme} />
              <button type="button" onClick={() => setShowPw(!showPw)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg">{error}</div>}
            <button type="submit" disabled={isLoading} className="w-full py-3.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : tab === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function InputField({ type, value, onChange, placeholder, theme }: { type: string, value: string, onChange: (v: string) => void, placeholder: string, theme: Theme }) {
  const t = THEMES[theme];
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`w-full ${t.input} ${t.border} border focus:border-emerald-500/50 outline-none rounded-xl px-4 py-3.5 text-sm ${t.text} placeholder-gray-600 transition-colors`} />
}

function LandingFooter({ theme }: { theme: Theme }) {
  const t = THEMES[theme];
  const isDark = theme === 'dark' || theme === 'dim';

  return (
    <div className={`mt-auto border-t ${t.border} ${isDark ? 'bg-[#0b0d10]' : 'bg-gray-50'}`}>
      <div className={`max-w-[1200px] mx-auto px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center border-b ${t.border}`}>
        <div className="space-y-4 text-center lg:text-left">
          <h3 className={`text-2xl sm:text-3xl font-bold ${t.text}`}>Experience Seamless Trading</h3>
          <p className={`${t.subtext} text-sm leading-relaxed max-w-md mx-auto lg:mx-0`}>Manage your fiat and crypto liquidity from one unified dashboard.</p>
          <button className="inline-flex items-center gap-2 text-emerald-500 font-bold text-sm hover:text-emerald-400 transition-colors">
            <Play className="w-4 h-4" /> Watch Demo Video
          </button>
        </div>
        <div className="flex justify-center">
          <div className="relative w-[220px] sm:w-[260px]">
            <div className={`w-full aspect-[9/18] bg-black rounded-[2.5rem] border-[6px] ${isDark ? 'border-gray-700' : 'border-gray-300'} p-2 shadow-2xl relative overflow-hidden`}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[30%] h-6 bg-black rounded-b-2xl z-20" />
              <div className="w-full h-full rounded-[2rem] overflow-hidden bg-gray-900 relative">
                {/* Put your <video> tag here when ready */}
                <div className="w-full h-full bg-[#0f1520] p-4 pt-8 flex flex-col">
                  <div className="flex justify-between items-center mb-4"><span className="text-[10px] text-gray-500 font-mono">9:41</span></div>
                  <div className="bg-[#1e2329] rounded-lg p-2 mb-3"><p className="text-[9px] text-gray-500">Total Assets</p><p className="text-sm font-bold text-white">******</p></div>
                  <div className="flex gap-2 mb-4">
                    <div className="flex-1 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold py-1.5 rounded-md text-center">Deposit</div>
                    <div className="flex-1 bg-blue-500/20 text-blue-400 text-[9px] font-bold py-1.5 rounded-md text-center">Earn</div>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-[2rem]">
                  <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg"><Play className="w-6 h-6 text-black ml-1" fill="black" /></div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-8 bg-black/20 blur-xl rounded-full" />
          </div>
        </div>
      </div>
      <div className="max-w-[1200px] mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
        {Object.entries(FOOTER_LINKS).map(([title, links]) => (
          <div key={title}>
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{title}</h4>
            <ul className="space-y-3">{links.map((link) => (<li key={link}><a href="#" className={`text-xs ${t.subtext} hover:text-emerald-400 transition-colors flex items-center gap-1.5 group`}><span className="w-0 group-hover:w-2 h-px bg-emerald-400 transition-all" />{link}</a></li>))}</ul>
          </div>
        ))}
      </div>
      <div className={`max-w-[1200px] mx-auto px-6 py-5 border-t ${t.border} flex flex-col sm:flex-row items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center"><img src={mamlakaLogo} alt="Jasiri" className="w-3 h-3 object-contain" /></div>
          <span className={`text-[11px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>© {new Date().getFullYear()} Jasiri Capital. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-2">
          <a href="#" className={`${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'} transition-colors p-2 rounded-lg`}><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg></a>
          <a href="#" className="text-gray-500 hover:text-[#229ED9] transition-colors p-2 rounded-lg"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg></a>
          <a href="#" className="text-gray-500 hover:text-[#5865F2] transition-colors p-2 rounded-lg"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" /></svg></a>
        </div>
      </div>
    </div>
  )
}