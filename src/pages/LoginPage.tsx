import { useState, FormEvent } from 'react'
import { ShieldCheck, Eye, EyeOff, ArrowRightLeft, Zap, Globe, TrendingUp } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import mamlakaLogo from '../pages/assets/mamlaka-logo.png'
//import phoneImg from '../pages/assets/mamlaka-phone.png'
import bgImg from '../pages/public/mamlaka-bg.png'

type Tab = 'signin' | 'create'

export default function LoginPage() {
  const { login, signup } = useAuth()
  const [tab, setTab] = useState<Tab>('signin')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: '#06111f' }}>

      {/* LEFT PANEL */}
      <div
        className="relative flex flex-col w-full md:w-[58%] overflow-hidden"
        style={{ minHeight: '340px' }}
      >
        {/* Layer 1 — dark blue network/cyber base background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${bgImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Layer 2 — colour tint */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #071a38cc 0%, #0a2252aa 50%, #061530cc 100%)' }}
        />

        {/* Layer 3 — phone + money illustration, anchored bottom-left */}
        <div
          className="absolute bottom-0 left-0 w-[55%] md:w-[52%] pointer-events-none select-none"
          style={{ maxWidth: '420px' }}
        >
          {/*<img
            src={phoneImg}
            alt=""
            className="w-full h-auto object-contain object-bottom"
            style={{ filter: 'drop-shadow(0 8px 32px rgba(0,200,180,0.25))' }}
          />*/}
        </div>

        {/* Layer 4 — right edge fade */}
        <div
          className="absolute inset-y-0 right-0 w-24 hidden md:block"
          style={{ background: 'linear-gradient(to left, #06111f, transparent)' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-8 md:px-12 py-8 md:py-10">

          {/* Brand row */}
          <div className="flex items-center gap-3">
            <img src={mamlakaLogo} alt="Mamlaka" className="w-9 h-9 object-contain" />
            <span className="text-white font-bold text-lg md:text-xl tracking-wide">
              Mamlaka <span className="opacity-40 font-light mx-1">×</span> Meshex
            </span>
          </div>

          {/* Hero copy — shifted right to clear phone image */}
          <div className="flex-1 flex flex-col justify-center pl-0 md:pl-[40%] lg:pl-[44%] py-8">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mb-5 self-start"
              style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', borderColor: 'rgba(52,211,153,0.3)' }}
            >
              <Zap className="w-3 h-3" />
              B2B Arbitrage Platform
            </span>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Exchange Fiat<br />
              <span style={{ color: '#34d399' }}>Currency Instantly</span>
            </h1>

            <p className="mt-4 text-sm md:text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>Easy On-Ramp &amp; Off-Ramp</span>{' '}
              for your payments — real-time arbitrage desk.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 mt-6">
              {[
                { icon: <Globe className="w-3 h-3" />, label: 'US & Africa Coverage' },
                { icon: <TrendingUp className="w-3 h-3" />, label: 'Live Arbitrage Rates' },
                { icon: <Zap className="w-3 h-3" />, label: 'Airtime Tokens' },
              ].map(({ icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.75)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {icon}{label}
                </span>
              ))}
            </div>

            {/* Payment methods */}
            <div className="flex items-center gap-3 mt-8">
              <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Accepted
              </span>
              <div className="h-7 px-2.5 bg-white rounded flex items-center justify-center shadow">
                <span className="font-extrabold text-[#1a1f71] text-xs tracking-tight italic">VISA</span>
              </div>
              <div
                className="h-7 px-1.5 rounded flex items-center shadow"
                style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <div className="w-4 h-4 rounded-full bg-[#eb001b]" />
                <div className="w-4 h-4 rounded-full bg-[#f79e1b] -ml-2" />
              </div>
              <div
                className="h-7 px-2.5 rounded flex items-center shadow"
                style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)' }}
              >
                <span className="text-[#34d399] text-xs font-bold">USDA</span>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="pb-1">
            <button
              onClick={() => setTab('create')}
              className="group inline-flex items-center gap-2 font-bold text-sm px-7 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #10b981, #0d9488)',
                color: '#fff',
                boxShadow: '0 4px 24px rgba(16,185,129,0.35)',
              }}
            >
              Get Started
              <ArrowRightLeft className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Powered by Meshex Arbitrage Desk
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Auth form */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 py-10 md:py-0 relative"
        style={{ background: '#06111f', minHeight: '480px' }}
      >
        {/* Ambient glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }}
        />

        <div className="w-full max-w-[360px] relative z-10">

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="text-sm mt-1" style={{ color: '#4a7fa8' }}>Sign in to your arbitrage desk</p>
          </div>

          <div
            className="rounded-2xl p-6 shadow-2xl"
            style={{ background: '#0d1e33', border: '1px solid #1a3050' }}
          >
            {/* Tabs */}
            <div
              className="flex rounded-xl p-1 mb-6"
              style={{ background: '#07141f', border: '1px solid #122035' }}
            >
              <button
                onClick={() => { setTab('signin'); setError('') }}
                className="flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                style={tab === 'signin' ? { background: '#1a3050', color: '#fff' } : { color: '#64748b' }}
              >
                Sign in
              </button>
              <button
                onClick={() => { setTab('create'); setError('') }}
                className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
                style={tab === 'create' ? { background: '#10b981', color: '#fff' } : { color: '#64748b' }}
              >
                Create account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === 'create' && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6b8eaa' }}>
                    Display name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Operator"
                    className="mesh-input"
                    autoComplete="name"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6b8eaa' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="mesh-input"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6b8eaa' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mesh-input pr-10"
                    autoComplete={tab === 'create' ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#4a6a8a' }}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="rounded-lg px-3 py-2 text-xs"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #0d9488)',
                  color: '#fff',
                  boxShadow: '0 2px 16px rgba(16,185,129,0.3)',
                }}
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                {tab === 'create' ? 'Create account' : 'Sign in'}
              </button>
            </form>

            {tab === 'create' && (
              <p className="flex items-center justify-center gap-1.5 text-[11px] mt-4" style={{ color: '#3d5a73' }}>
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#0d9488' }} />
                The first account becomes the workspace admin.
              </p>
            )}

            {tab === 'signin' && (
              <p className="text-center text-[11px] mt-4" style={{ color: '#3d5a73' }}>
                No account?{' '}
                <button
                  onClick={() => setTab('create')}
                  className="font-medium transition-colors hover:opacity-80"
                  style={{ color: '#10b981' }}
                >
                  Create one
                </button>
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 mt-5">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: '#253d52' }}>Secured by</span>
            <span className="text-[10px] font-semibold" style={{ color: '#2d4e66' }}>256-bit TLS</span>
            <span style={{ color: '#1a3044' }}>·</span>
            <span className="text-[10px] font-semibold" style={{ color: '#2d4e66' }}>JWT Auth</span>
          </div>
        </div>
      </div>

    </div>
  )
}
