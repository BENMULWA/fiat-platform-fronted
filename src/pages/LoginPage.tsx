import { useState, FormEvent } from 'react'
import { ShieldCheck, Eye, EyeOff, ArrowRightLeft, Zap, Globe, TrendingUp, Lock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import mamlakaLogo from '../pages/assets/mamlaka-logo.png'
import bgImg from '../pages/public/mamlaka-bg.png'
import phoneImg from '../pages/assets/mamlaka-phone.png'

type Tab = 'signin' | 'create'

// statin the page 
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
      className="min-h-screen flex flex-col lg:flex-row overflow-x-hidden bg-[#020816]"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >

      {/* ══════════════════════════════════════
          LEFT PANEL — Hero Section
      ══════════════════════════════════════ */}
      <div className="relative flex flex-col overflow-hidden w-full lg:w-[58%] shrink-0 min-h-[85dvh] lg:min-h-screen">

        {/* Background image fills entire left panel */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${bgImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
          }}
        />
        {/* Light overlay to keep text readable */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, rgba(2,8,22,0.30) 0%, rgba(4,14,36,0.22) 60%, rgba(2,8,22,0.45) 100%)' }}
        />

        {/* ── PHONE IMAGE — responsive positioning ── */}
        <div className="absolute pointer-events-none select-none top-[52%] lg:top-[46%] -translate-y-1/2 -left-[15%] sm:-left-[5%] lg:left-[6%] w-[60%] sm:w-[45%] lg:w-[40%] max-w-[360px] z-10">
          <img
            src={phoneImg}
            alt=""
            className="w-full h-auto object-contain"
            style={{ filter: 'drop-shadow(0 24px 56px rgba(16,185,129,0.28))' }}
          />
        </div>

        {/* Content layer */}
        <div className="relative z-20 flex flex-col py-4 h-full">

          {/* Navbar */}
          <header className="flex items-center gap-3 px-6 lg:px-10 py-4 lg:py-7">
            <div
              className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              <img src={mamlakaLogo} alt="Mamlaka" className="w-4 h-4 lg:w-5 lg:h-5 object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-xl lg:text-2xl tracking-wide">Meshex</span>
            </div>
          </header>

          {/* Hero Content — Pushed right to sit alongside the phone */}
          <div className="flex-1 flex flex-col justify-center pb-12 lg:pb-16 pt-6 lg:pt-0 pl-[40%] sm:pl-[42%] lg:pl-[48%] pr-5 lg:pr-[5%]">

            {/* Badge */}
            <div
              className="inline-flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3.5 py-1.5 rounded-full text-[10px] lg:text-xs font-semibold self-start mb-4 lg:mb-6"
              style={{
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.3)',
                color: '#34d399',
              }}
            >
              <Zap className="w-3 h-3 lg:w-4 lg:h-4" />
              <span>B2B Arbitrage Platform</span>
            </div>

            {/* Responsive Heading */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold leading-[1.15] lg:leading-[1.1] tracking-tight text-white">
              Exchange Fiat<br />
              <span className="text-[26px] sm:text-[34px] lg:text-4xl xl:text-[44px]" style={{ color: '#34d399' }}>Currency Instantly</span>
            </h1>

            <p className="mt-3 lg:mt-4 text-sm sm:text-base lg:text-lg xl:text-[16px] leading-[1.6] lg:leading-[1.7]" style={{ color: 'rgba(255,255,255,0.62)' }}>
              <span className="font-semibold text-white/85 text-base sm:text-lg lg:text-xl">
                Easy On-Ramp &amp; Off-Ramp
              </span>{' '}
              for your payments — real-time arbitrage desk.
            </p>

            {/* Feature pills */}
            <div className="flex flex-col gap-2 lg:gap-3 mt-5 lg:mt-6 text-sm">
              {[
                { icon: <Globe className="w-3.5 h-3.5 lg:w-4 lg:h-4" />, label: 'US & Africa Coverage' },
                { icon: <TrendingUp className="w-3.5 h-3.5 lg:w-4 lg:h-4" />, label: 'Live Arbitrage Rates' },
                { icon: <Zap className="w-3.5 h-3.5 lg:w-4 lg:h-4" />, label: 'Airtime Tokens' },
              ].map(({ icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1 lg:py-1.5 rounded-full text-[10px] lg:text-xs font-medium self-start"
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 mt-6 lg:mt-7">
              <span
                className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-1 sm:mb-0"
                style={{ color: 'rgba(255,255,255,0.32)' }}
              >
                Accepted
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="h-8 lg:h-10 px-3 lg:px-5 bg-white rounded-md flex items-center shadow">
                  <span className="font-extrabold text-[#1a1f71] text-xs lg:text-[14px] tracking-tight italic">VISA</span>
                </div>
                <div
                  className="h-8 lg:h-10 px-3 lg:px-5 rounded-md flex items-center"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  <div className="w-[16px] h-[14px] lg:w-[20px] lg:h-[18px] rounded-full bg-[#eb001b]" />
                  <div className="w-[16px] h-[14px] lg:w-[20px] lg:h-[18px] rounded-full bg-[#f79e1b] -ml-2" />
                </div>
                <div
                  className="h-8 lg:h-10 px-3 lg:px-5 rounded-md flex items-center"
                  style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)' }}
                >
                  <span className="text-[#34d399] text-sm lg:text-[16px] font-bold">USDA</span>
                </div>
              </div>
            </div>

            {/* Get Started */}
            <div className="mt-8 lg:mt-9 mb-2 lg:mb-5">
              <button
                onClick={() => {
                  switchTab('create');
                  document.getElementById('auth-form')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="group inline-flex items-center gap-2 px-6 lg:px-8 py-3 lg:py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
                  boxShadow: '0 6px 28px rgba(16,185,129,0.38)',
                }}
              >
                <span>Get Started</span>
                <ArrowRightLeft className="w-3.5 h-3.5 lg:w-4 lg:h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
              <p className="text-[11px] lg:text-[14px] mt-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
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
        style={{ width: '2px', background: '#000000', alignSelf: 'stretch' }}
      />

      {/* ══════════════════════════════════════
          RIGHT PANEL — Login Form
      ══════════════════════════════════════ */}
      <div
        id="auth-form"
        className="w-full lg:w-[42%] flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-14 lg:py-10 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #03111f 0%, #041828 40%, #051e30 70%, #030f1a 100%)',
          minWidth: 0,
        }}
      >
        {/* Decorative background glows */}
        <div className="absolute pointer-events-none -top-[10%] -right-[15%] w-[60%] h-[60%] blur-[50px]" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 65%)' }} />
        <div className="absolute pointer-events-none -bottom-[10%] -left-[10%] w-[55%] h-[55%] blur-[60px]" style={{ background: 'radial-gradient(circle, rgba(6,60,100,0.5) 0%, transparent 65%)' }} />
        <div className="absolute pointer-events-none top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[40%] blur-[40px]" style={{ background: 'radial-gradient(ellipse, rgba(13,148,136,0.07) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="w-full max-w-[390px] relative z-10">

          {/* Heading */}
          <div className="mb-6 ml-2 lg:ml-4 text-center lg:text-left">
            <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-white">
              {tab === 'signin' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="mt-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.38)' }}>
              {tab === 'signin' ? 'Sign in to your arbitrage desk' : 'Set up your workspace account'}
            </p>
          </div>

          {/* Glass card floating over the styled background */}
          <div
            className="rounded-2xl overflow-hidden shadow-2xl"
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
                type="button"
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
                type="button"
                onClick={() => switchTab('create')}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200"
                style={
                  tab === 'create'
                    ? { background: 'linear-gradient(135deg, #10b981, #0d9488)', color: '#ffffff', boxShadow: '0 2px 16px rgba(16,185,129,0.35)' }
                    : { color: 'rgba(255,255,255,0.35)' }
                }
              >
                <span>Create account</span>
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
          <div className="flex items-center justify-center gap-4 mt-6">
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