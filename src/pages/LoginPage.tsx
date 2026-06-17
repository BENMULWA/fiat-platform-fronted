import { useState, FormEvent } from 'react'
import { ShieldCheck, Eye, EyeOff, ArrowRightLeft, Zap, Globe, TrendingUp, Lock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import mamlakaLogo from '../pages/assets/mamlaka-logo.png'
import bgImg from '../pages/public/mamlaka-bg.png'
import phoneImg from '../pages/assets/mamlaka-phone.png'

type Tab = 'signin' | 'create'

function InputField({
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  children,
}: {
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  autoComplete: string
  children?: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all duration-200"
        style={{
          background: '#071120',
          border: focused ? '1px solid rgba(52,211,153,0.55)' : '1px solid rgba(255,255,255,0.1)',
          boxShadow: focused ? '0 0 0 3px rgba(52,211,153,0.1)' : 'none',
          paddingRight: children ? '2.75rem' : undefined,
        }}
      />
      {children && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{children}</div>
      )}
    </div>
  )
}

export default function LoginPage() {
  const { login, signup } = useAuth()
  const [tab, setTab] = useState<Tab>('signin')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const switchTab = (t: Tab) => { setTab(t); setError('') }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Email and password are required.'); return }
    if (tab === 'create' && !displayName) { setError('Display name is required.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setIsLoading(true)
    try {
      if (tab === 'signin') {
        await login(email, password)
      } else {
        await signup(displayName, email, password)
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Authentication failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row overflow-x-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >

      {/* ══════════════════════════════════════
          LEFT PANEL — full background image
      ══════════════════════════════════════ */}
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          /* On large screens take 58%, on mobile full width with fixed height */
          flex: '0 0 58%',
          minHeight: '100vh',
        }}
      >
        {/* Background image fills entire left panel */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${bgImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
          }}
        />
        {/* Light overlay to keep text readable without washing out the image */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, rgba(2,8,22,0.30) 0%, rgba(4,14,36,0.22) 60%, rgba(2,8,22,0.45) 100%)' }}
        />

        {/* ── PHONE IMAGE — centred in the upper-left quadrant, like image 3 ── */}
        <div
          className="absolute pointer-events-none select-none"
          style={{
            /* Sits in the left 46% of the panel, vertically centred between nav and content */
            left: '6%',
            top: '46%',
            transform: 'translateY(-52%)',
            width: '40%',
            maxWidth: '360px',
            zIndex: 2,
          }}
        >
          <img
            src={phoneImg}
            alt=""
            className="w-full h-auto object-contain"
            style={{ filter: 'drop-shadow(0 24px 56px rgba(16,185,129,0.28))' }}
          />
        </div>

        {/* Content layer */}
        <div className="relative z-10 flex flex-col py-4 h-full">

          {/* Navbar */}
          <header className="flex items-center gap-3 px-8 lg:px-10 py-6 lg:py-7">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              <img src={mamlakaLogo} alt="Mamlaka" className="w-5 h-5 object-contain" />
            </div>
            <div className="flex items-center gap-2">
             {/*<span className="text-white font-bold text-lg tracking-wide">Mamlaka</span>*/}
              {/*<span className="font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>×</span>*/}
              <span className="text-white font-bold text-2xl tracking-wide">Meshex</span>
            </div>
          </header>

          {/* Hero — pushed right to sit alongside the phone */}
          <div
            className="flex-1 flex flex-col justify-center pb-16"
            style={{ paddingLeft: '48%', paddingRight: '5%' }}
          >
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold self-start mb-6"
              style={{
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.3)',
                color: '#34d399',
              }}
            >
              <Zap className="w-12 h-8" />
              <p className="text-lg"> B2B Arbitrage Platform</p> 
            </div>

            <h1 className="text-3xl xl:text-5xl font-extrabold leading-[1.1] tracking-tight text-white">
              Exchange Fiat<br />
              <span className="text-4xl" style={{ color: '#34d399' }}>Currency Instantly</span>
            </h1>

            <p className="mt-4 text-xl xl:text-[16px] leading-[1.7]" style={{ color: 'rgba(255,255,255,0.62)' }}>
              <span className="font-semibold text-2xl" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Easy On-Ramp &amp; Off-Ramp
              </span>{' '}
              for your payments — real-time arbitrage desk.
            </p>

            {/* Feature pills */}
            <div className="flex flex-col gap-3 mt-6 text-sm">
              {[
                { icon: <Globe className="w-8 h-8" />, label: 'US & Africa Coverage' },
                { icon: <TrendingUp className="w-8 h-8" />, label: 'Live Arbitrage Rates' },
                { icon: <Zap className="w-8 h-8" />, label: 'Airtime Tokens' },
              ].map(({ icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium self-start"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.72)',
                  }}
                >
                  {icon}{label}
                </span>
              ))}
            </div>

            {/* Payment badges */}
            <div className="flex items-center gap-2.5 mt-7 flex-wrap">
              <span
                className="text-[10px] uppercase tracking-[0.14em] font-semibold"
                style={{ color: 'rgba(255,255,255,0.32)' }}
              >
                <p className="text-lg">Accepted</p>
              </span>
              <div className="h-10 px-5 bg-white rounded-md flex items-center shadow">
                <span className="font-extrabold text-[#1a1f71] text-[14px] tracking-tight italic">VISA</span>
              </div>
              <div
                className="h-10 px-5 rounded-md flex items-center"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <div className="w-[20px] h-[18px] rounded-full bg-[#eb001b]" />
                <div className="w-[20px] h-[18px] rounded-full bg-[#f79e1b] -ml-2" />
              </div>
              <div
                className="h-10 px-5 rounded-md flex items-center"
                style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)' }}
              >
                <span className="text-[#34d399] text-[16px] font-bold">USDA</span>
              </div>
            </div>

            {/* Get Started — centred in content column, like image 3 */}
            <div className="mt-9 mb-5">
              <button
                onClick={() => switchTab('create')}
                className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
                  boxShadow: '0 6px 28px rgba(16,185,129,0.38)',
                }}
              >
                <p className='text-lg'> Get Started</p> 
                <ArrowRightLeft className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
              <p className="text-[14px] mt-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Powered by Meshex Arbitrage Desk
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          DIVIDER — clean thick solid border
      ══════════════════════════════════════ */}
      <div
        className="hidden lg:block shrink-0"
        style={{
          width: '2px',
          background: '#000000',
          alignSelf: 'stretch',
        }}
      />
    

      {/* ══════════════════════════════════════
          RIGHT PANEL — styled to match theme
      ══════════════════════════════════════ */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-10 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #03111f 0%, #041828 40%, #051e30 70%, #030f1a 100%)',
          minWidth: 0,
        }}
      >
        {/* Decorative background glows to match left panel palette */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-10%',
            right: '-15%',
            width: '60%',
            height: '60%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 65%)',
            filter: 'blur(50px)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '-10%',
            left: '-10%',
            width: '55%',
            height: '55%',
            background: 'radial-gradient(circle, rgba(6,60,100,0.5) 0%, transparent 65%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            top: '40%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: '70%',
            height: '40%',
            background: 'radial-gradient(ellipse, rgba(13,148,136,0.07) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        {/* Subtle dot-grid texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Mobile brand header 
        <div className="flex lg:hidden items-center gap-2.5 mb-8">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            <img src={mamlakaLogo} alt="Mamlaka" className="w-5 h-5 object-contain" />
          </div>
          <span className="text-white font-bold text-base tracking-wide">Mamlaka × Meshex</span>
        </div>*/}

        <div className="w-full max-w-[390px] relative z-10">

          {/* Heading */}
          <div className="mb-6 ml-4">
            <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-white">
              {tab === 'signin' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="mt-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.38)' }}>
              {tab === 'signin' ? 'Sign in to your arbitrage desk' : 'Set up your workspace account'}
            </p>
          </div>

          {/* Glass card floating over the styled background */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(8,24,46,0.75)',
              border: '1px solid rgba(52,211,153,0.12)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(52,211,153,0.06) inset',
            }}
          >
            {/* Tab switcher */}
            <div
              className="flex p-1.5 gap-1"
              style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <button
                onClick={() => switchTab('signin')}
                className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-200"
                style={
                  tab === 'signin'
                    ? { background: 'rgba(255,255,255,0.08)', color: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }
                    : { color: 'rgba(255,255,255,0.35)' }
                }
              >
                Sign in
              </button>
              <button
                onClick={() => switchTab('create')}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200"
                style={
                  tab === 'create'
                    ? { background: 'linear-gradient(135deg, #10b981, #0d9488)', color: '#ffffff', boxShadow: '0 2px 16px rgba(16,185,129,0.35)' }
                    : { color: 'rgba(255,255,255,0.35)' }
                }
              >
               <p>Create account</p> 
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-5 sm:px-6 pt-6 pb-5 space-y-4 sm:space-y-5">

              {tab === 'create' && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Display Name
                  </label>
                  <InputField type="text" value={displayName} onChange={setDisplayName} placeholder="Operator" autoComplete="name" />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Email
                </label>
                <InputField type="email" value={email} onChange={setEmail} placeholder="you@company.com" autoComplete="email" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Password
                  </label>
                  {tab === 'signin' && (
                    <button type="button" className="text-[11px] font-medium transition-opacity hover:opacity-75" style={{ color: '#34d399' }}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <InputField
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  autoComplete={tab === 'create' ? 'new-password' : 'current-password'}
                >
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="transition-opacity hover:opacity-70"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </InputField>
              </div>

              {error && (
                <div
                  className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
                >
                  <span className="mt-px shrink-0">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-55 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
                  boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
                }}
              >
                {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {tab === 'create' ? 'Create account' : 'Sign in to Meshex'}
              </button>
            </form>

            {/* Footer inside card */}
            <div className="px-5 sm:px-6 pb-5 sm:pb-6">
              {tab === 'create' ? (
                <div
                  className="flex items-center gap-2 rounded-xl px-4 py-3 text-[11px]"
                  style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)', color: 'rgba(94,200,182,0.85)' }}
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: '#0d9488' }} />
                  The first account becomes the workspace admin.
                </div>
              ) : (
                <p className="text-center text-[12px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  No account?{' '}
                  <button
                    type="button"
                    onClick={() => switchTab('create')}
                    className="font-semibold transition-opacity hover:opacity-80"
                    style={{ color: '#34d399' }}
                  >
                    Create one free
                  </button>
                </p>
              )}
            </div>
          </div>

          

          {/* Security strip */}
          <div className="flex items-center justify-center gap-4 mt-5">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.25)' }} />
              <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>256-bit TLS</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>JWT Auth</span>
            <div className="w-px h-3 bg-white/10" />
            <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>SOC 2 Ready</span>
          </div>
        </div>
      </div>

    </div>
  )
}
