//@ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowDownUp, Shield, Smartphone, Sun, Moon, Monitor, CheckCircle2, Zap, ChevronDown, Menu, Lock, Globe, X, Wallet, Link2, Network, Phone, Mail, MessageCircle, Twitter, Github, Linkedin, Instagram, Facebook, Music2, TrendingUp, TrendingDown } from 'lucide-react';
import logo from '../pages/assets/jasiri-icon.png';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import AssetIcon from '../components/AssetIcon';

// --- CUSTOM STYLES FOR ANIMATIONS ---
const COUNTRY_TICKER_ITEM_COUNT = 16; // keep in sync with SUPPORTED_COUNTRIES.length below
// Duration scales with the number of items so the perceived speed stays
// consistent even if the country list grows or shrinks later. ~1.15s per
// item reads as a confident, continuous scroll rather than a crawl (the
// previous fixed 52s for 16 items worked out to ~3.25s/item, which is why
// it visually read as "paused").
const COUNTRY_TICKER_DURATION = `${(COUNTRY_TICKER_ITEM_COUNT * 1.15).toFixed(1)}s`;

const customStyles = `
  @keyframes marquee {
    0% { transform: translate3d(0%, 0, 0); }
    100% { transform: translate3d(-50%, 0, 0); }
  }
  .animate-marquee {
    display: flex;
    width: 200%;
    animation: marquee 20s linear infinite;
  }
  .animate-marquee:hover {
    animation-play-state: paused;
  }

  .animate-marquee-slow {
    display: flex;
    width: 200%;
    will-change: transform;
    animation: marquee ${COUNTRY_TICKER_DURATION} linear infinite;
    /* Intentionally no hover pause here — this ticker should always keep moving. */
  }

  @keyframes fade-in-up {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-up {
    animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-marquee, .animate-marquee-slow, .animate-fade-in-up {
      animation: none !important;
    }
  }
`;

const ASSETS = ['USDT', 'USDC', 'USDA', 'cUSD', 'KES', 'AIRT'];

// ISO 3166-1 alpha-2 codes for flagcdn.com's circular flag icons. East Africa
// (where mobile-money currencies settle directly) plus the wider African
// markets reachable today via borderless stablecoin deposits/withdrawals.
const SUPPORTED_COUNTRIES = [
  { code: 'ke', name: 'Kenya' },
  { code: 'ug', name: 'Uganda' },
  { code: 'tz', name: 'Tanzania' },
  { code: 'rw', name: 'Rwanda' },
  { code: 'bi', name: 'Burundi' },
  { code: 'ss', name: 'South Sudan' },
  { code: 'cd', name: 'DR Congo' },
  { code: 'et', name: 'Ethiopia' },
  { code: 'so', name: 'Somalia' },
  { code: 'ng', name: 'Nigeria' },
  { code: 'gh', name: 'Ghana' },
  { code: 'sn', name: 'Senegal' },
  { code: 'ci', name: "Ivory Coast" },
  { code: 'cm', name: 'Cameroon' },
  { code: 'za', name: 'South Africa' },
  { code: 'bw', name: 'Botswana' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, viewAsAdmin } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dim' | 'dark'>('dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile Menu State
  const [enableMotion, setEnableMotion] = useState(false);
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const [liveRates, setLiveRates] = useState<Record<string, number>>({});
  const [publicRateMeta, setPublicRateMeta] = useState({ active: false, source: 'Treasury', disclaimer: 'Loading indicative rates…' });

  // Tracks each asset's price on the previous poll so we can show a real,
  // computed % change — not a placeholder "Indicative" label. A trading
  // platform's ticker should reflect actual movement between polls.
  const previousRatesRef = useRef<Record<string, number>>({});
  const [rateChanges, setRateChanges] = useState<Record<string, number>>({});
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  // --- HERO SWAP STATE ---
  const [payAmount, setPayAmount] = useState<string>("100000");
  const [payAsset, setPayAsset] = useState<string>("KES");
  const [receiveAsset, setReceiveAsset] = useState<string>("USDA");
  const [isPayDropdownOpen, setIsPayDropdownOpen] = useState(false);
  const [isReceiveDropdownOpen, setIsReceiveDropdownOpen] = useState(false);

  // --- GRID SIMULATION STATE ---
  const [simIndex, setSimIndex] = useState(0);
  const simulations = [
    { pay: "KES 100,000", receive: "773.99 USDA" },
    { pay: "500 USDT", receive: "KES 64,600" },
    { pay: "KES 5,000", receive: "5,000 AIRT" },
    { pay: "1,000 USDC", receive: "999.50 USDT" }
  ];

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const initialTimer = setTimeout(() => setEnableMotion(true), 1300);
    return () => clearTimeout(initialTimer);
  }, []);

  useEffect(() => {
    if (!enableMotion) return;
    const timer = setInterval(() => {
      setSimIndex((prev) => (prev + 1) % simulations.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [enableMotion, simulations.length]);

  useEffect(() => {
    let active = true;
    const loadPublicRates = async () => {
      try {
        const { data } = await api.get('/api/treasury/public-rates');
        if (!active) return;
        const nextRates = data?.usdBaseRates || {};

        // Compute a real % change vs the last poll for every asset we have
        // a prior reading for. First poll has no prior, so it's left out
        // (rendered as "—" rather than a fabricated 0.00%).
        const previous = previousRatesRef.current;
        const changes: Record<string, number> = {};
        Object.keys(nextRates).forEach((asset) => {
          const prevValue = previous[asset];
          if (prevValue) {
            changes[asset] = ((nextRates[asset] - prevValue) / prevValue) * 100;
          }
        });

        setRateChanges(changes);
        previousRatesRef.current = nextRates;
        setLiveRates(nextRates);
        setLastUpdatedAt(new Date());
        setPublicRateMeta({
          active: Boolean(data?.active),
          source: data?.referenceSource || 'Treasury',
          disclaimer: data?.disclaimer || 'Indicative rates only. Your executable rate is confirmed after sign-in.',
        });
      } catch {
        if (active) setPublicRateMeta({ active: false, source: 'Treasury', disclaimer: 'Indicative rates are temporarily unavailable.' });
      }
    };
    loadPublicRates();
    const interval = setInterval(loadPublicRates, 60_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  // --- CALCULATE HERO RECEIVE AMOUNT ---
  const calculateReceive = () => {
    const num = parseFloat(payAmount);
    if (isNaN(num) || num <= 0 || !liveRates[payAsset] || !liveRates[receiveAsset]) return "—";
    const usdValue = num * liveRates[payAsset];
    const receiveValue = usdValue / liveRates[receiveAsset];
    return receiveValue > 1000 ? receiveValue.toFixed(2) : receiveValue.toFixed(4);
  };

  const currentReceiveAmount = calculateReceive();
  const crossRate = liveRates[payAsset] && liveRates[receiveAsset] ? (liveRates[payAsset] / liveRates[receiveAsset]) : 0;
  const formattedRate = !crossRate ? 'Indicative rate unavailable' : crossRate < 1
    ? `1 ${receiveAsset} = ${(1 / crossRate).toFixed(2)} ${payAsset}`
    : `1 ${payAsset} = ${crossRate.toFixed(2)} ${receiveAsset}`;

  // --- AUTH CHECK ---
  const navigateToHome = () => {
    navigate(viewAsAdmin ? '/admin/dashboard' : '/dashboard');
  };

  const handleGetStarted = () => {
    if (user) {
      navigateToHome();
      return;
    }
    navigate('/signup');
  };

  const handleSwapAction = () => {
    if (!user) {
      navigate('/signup');
      return;
    }
    if (viewAsAdmin) {
      navigate('/admin/dealer-workspace');
      return;
    }
    navigate('/swap');
  };

  // --- THEME CYCLER ---
  const cycleTheme = () => {
    if (theme === 'light') setTheme('dim');
    else if (theme === 'dim') setTheme('dark');
    else setTheme('light');
  };

  // --- THEMES ---
  const themes = {
    light: {
      bg: 'bg-[#F8FAFC]',
      nav: 'bg-white/95 border-slate-200',
      text: 'text-slate-900',
      textMuted: 'text-slate-500',
      card: 'bg-white border-slate-200 shadow-xl',
      input: 'bg-slate-50 border-slate-200 text-slate-900',
      dropdown: 'bg-white border-slate-200 shadow-lg',
      footer: 'border-slate-200 bg-white'
    },
    dim: {
      bg: 'bg-[#15202b]',
      nav: 'bg-[#15202b]/95 border-[#1e2732]',
      text: 'text-white',
      textMuted: 'text-slate-400',
      card: 'bg-[#1e2732] border-[#273340] shadow-2xl',
      input: 'bg-[#273340] border-[#38444d] text-white',
      dropdown: 'bg-[#273340] border-[#38444d] shadow-2xl',
      footer: 'border-[#1e2732] bg-[#15202b]'
    },
    dark: {
      bg: 'bg-[#09090b]',
      nav: 'bg-[#09090b]/95 border-white/5',
      text: 'text-white',
      textMuted: 'text-slate-400',
      card: 'bg-[#121214] border-white/5 shadow-2xl',
      input: 'bg-[#18181b] border-white/5 text-white',
      dropdown: 'bg-[#18181b] border-white/10 shadow-2xl',
      footer: 'border-white/10 bg-[#09090b]'
    }
  };

  const current = themes[theme];

  // Market rates now carry a real computed change (or "—" pre-first-refresh)
  // instead of a static "Indicative" string, so the ticker actually behaves
  // like a trading platform's ticker rather than a decorative marquee.
  const marketRates = ['USDA', 'USDC', 'USDT', 'BTC', 'ETH']
    .filter((asset) => liveRates[asset] && liveRates.KES)
    .map((asset) => {
      const change = rateChanges[asset];
      const hasChange = typeof change === 'number' && !Number.isNaN(change);
      return {
        pair: `${asset}/KES`,
        price: (liveRates.KES / liveRates[asset]).toLocaleString(undefined, { maximumFractionDigits: asset === 'BTC' || asset === 'ETH' ? 0 : 4 }),
        change: hasChange ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : '—',
        positive: hasChange ? change >= 0 : true,
        img: asset === 'USDC' ? 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png' : asset === 'USDT' ? 'https://cryptologos.cc/logos/tether-usdt-logo.png' : asset === 'BTC' ? 'https://cryptologos.cc/logos/bitcoin-btc-logo.png' : asset === 'ETH' ? 'https://cryptologos.cc/logos/ethereum-eth-logo.png' : 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
      };
    });

  return (
    <div className={`min-h-screen ${current.bg} ${current.text} font-sans transition-colors duration-300`}>
      <style>{customStyles}</style>

      {/* TOP TICKER — real computed % change per asset, not a placeholder */}
      <div className="w-full bg-[#000000] text-white text-xs py-2 overflow-hidden whitespace-nowrap border-b border-emerald-500/20 flex items-center relative z-50">
        <div className={enableMotion ? 'animate-marquee' : 'flex w-full justify-center'}>
          {marketRates.length ? [...marketRates, ...marketRates].map((rate, i) => (
            <div key={i} className="inline-flex items-center mx-6 font-medium">
              <img src={rate.img} alt={rate.pair} className="w-4 h-4 mr-2 rounded-full object-cover bg-white" />
              <span className="mr-3">{rate.pair}</span>
              <span>{rate.price}</span>
              <span className={`ml-2 inline-flex items-center gap-1 ${rate.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {rate.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {rate.change}
              </span>
            </div>
          )) : <span className="text-slate-400">{publicRateMeta.disclaimer}</span>}
        </div>
      </div>

      {/* NAVBAR */}
      <nav className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors duration-300 ${current.nav}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">

            <div className="flex items-center shrink-0">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden border border-slate-200 shrink-0">
                <img src={logo} alt="Jasiri Logo" className="w-8 h-8 object-contain" />
              </div>
              <span className="ml-3 text-xl font-bold tracking-tight">JASIRI</span>
            </div>

            <div className="hidden md:flex space-x-8">
              <a href="#features" className={`${current.textMuted} hover:${current.text} transition-colors font-medium text-sm`}>Features</a>
              <a href="#how-it-works" className={`${current.textMuted} hover:${current.text} transition-colors font-medium text-sm`}>How it Works</a>
              <a href="#business" className={`${current.textMuted} hover:${current.text} transition-colors font-medium text-sm`}>Business</a>
              <a href="#security" className={`${current.textMuted} hover:${current.text} transition-colors font-medium text-sm`}>Security</a>
              <a href="#trust-center" className={`${current.textMuted} hover:${current.text} transition-colors font-medium text-sm`}>Trust Center</a>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={cycleTheme}
                className={`p-2 rounded-full transition-all border ${theme === 'light' ? 'bg-white border-slate-200 text-amber-500 shadow-sm hover:bg-slate-50' :
                    theme === 'dim' ? 'bg-[#273340] border-[#38444d] text-blue-400 hover:bg-[#38444d]' :
                      'bg-[#18181b] border-white/10 text-emerald-400 hover:bg-white/5'
                  }`}
              >
                {theme === 'light' && <Sun size={18} />}
                {theme === 'dim' && <Monitor size={18} />}
                {theme === 'dark' && <Moon size={18} />}
              </button>

              {!user ? (
                <Link to="/login" className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors hover:bg-emerald-500/10 ${current.text}`}>
                  Log in
                </Link>
              ) : (
                <button onClick={navigateToHome} className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors hover:bg-emerald-500/10 ${current.text}`}>
                  Dashboard
                </button>
              )}
              <button onClick={handleGetStarted} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold px-5 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                {user ? 'Open Workspace' : 'Get Started'}
              </button>
            </div>

            <div className="flex md:hidden items-center space-x-3">
              <button
                onClick={cycleTheme}
                className={`p-2 rounded-full transition-all border ${theme === 'light' ? 'bg-white border-slate-200 text-amber-500' :
                    theme === 'dim' ? 'bg-[#273340] border-[#38444d] text-blue-400' :
                      'bg-[#18181b] border-white/10 text-emerald-400'
                  }`}
              >
                {theme === 'light' && <Sun size={18} />}
                {theme === 'dim' && <Monitor size={18} />}
                {theme === 'dark' && <Moon size={18} />}
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-2 rounded-lg transition-colors ${current.text} hover:bg-emerald-500/10`}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className={`md:hidden absolute top-20 left-0 w-full border-b shadow-2xl ${current.nav}`}>
            <div className="px-6 py-6 space-y-6">
              <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className={`block text-lg font-medium ${current.text}`}>Features</a>
              <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className={`block text-lg font-medium ${current.text}`}>How it Works</a>
              <a href="#business" onClick={() => setIsMobileMenuOpen(false)} className={`block text-lg font-medium ${current.text}`}>Business</a>
              <a href="#security" onClick={() => setIsMobileMenuOpen(false)} className={`block text-lg font-medium ${current.text}`}>Security</a>
              <a href="#trust-center" onClick={() => setIsMobileMenuOpen(false)} className={`block text-lg font-medium ${current.text}`}>Trust Center</a>

              <div className="pt-6 border-t border-slate-500/20 flex flex-col gap-4">
                {!user ? (
                  <Link to="/login" className={`block text-center w-full py-4 rounded-xl border font-bold ${theme === 'light' ? 'border-slate-300' : 'border-white/10'}`}>
                    Log in
                  </Link>
                ) : (
                  <button onClick={navigateToHome} className={`block text-center w-full py-4 rounded-xl border font-bold ${theme === 'light' ? 'border-slate-300' : 'border-white/10'}`}>
                    Dashboard
                  </button>
                )}
                <button onClick={handleGetStarted} className="w-full block text-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-xl">
                  {user ? 'Open Workspace' : 'Get Started'}
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* 1. HERO SECTION */}
      <section className="relative pt-20 pb-24 md:pt-32 md:pb-40 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            <div className="text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
                <span className="block">Turn FIAT Currencies</span>
                <span className="block text-emerald-500">into crypto.</span> 
                
                <span className="block">Buy, Sell & Cash Out.</span>
              </h1>
              <p className={`text-lg sm:text-xl mb-10 leading-relaxed ${current.textMuted}`}>
                Deposit KES from M-Pesa, swap into USDT, USDC, USDA or cUSD, and cash out to airtime or mobile money — all in one place, at a rate you see before you confirm.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4">
                <button onClick={handleGetStarted} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 py-4 rounded-xl transition-all flex items-center justify-center">
                  {user ? 'Open Workspace' : 'Create Free Account'} <ArrowRight className="ml-2 w-5 h-5" />
                </button>
                <a href="#how-it-works" className={`w-full sm:w-auto font-bold px-8 py-4 rounded-xl transition-all flex items-center justify-center border ${theme === 'light' ? 'bg-white border-slate-200 hover:bg-slate-50' : 'bg-[#18181b] border-white/5 hover:bg-white/5'}`}>
                  <Zap className="mr-2 w-5 h-5 text-amber-500" /> See How It Works
                </a>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-10">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#18181b] border-white/10'}`}>
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-semibold">M-Pesa</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#18181b] border-white/10'}`}>
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-semibold">Airtel Money</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#18181b] border-white/10'}`}>
                  <Wallet className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold">USDT / USDC</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#18181b] border-white/10'}`}>
                  <Link2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold">USDA (Cardano)</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#18181b] border-white/10'}`}>
                  <Network className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold">cUSD (Celo)</span>
                </div>
              </div>

              <div className={`grid grid-cols-3 gap-4 mt-10 pt-8 border-t ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
                <div>
                  <p className="text-2xl font-extrabold">5+</p>
                  <p className={`text-xs mt-1 ${current.textMuted}`}>Countries reachable</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold">&lt; 2 min</p>
                  <p className={`text-xs mt-1 ${current.textMuted}`}>Typical settlement</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold">6</p>
                  <p className={`text-xs mt-1 ${current.textMuted}`}>Currencies & assets</p>
                </div>
              </div>
            </div>

            <div className="relative h-full mx-auto w-full max-w-md lg:ml-auto">
              <div className={`p-8 sm:p-8 rounded-[2rem] border transition-colors duration-300 ${current.card}`}>
                <div className={`mb-6 flex items-center gap-1 p-1 rounded-lg ${theme === 'light' ? 'bg-slate-100' : 'bg-white/5'}`}>
                  <div className={`flex-1 text-center py-1.5 rounded-md text-sm font-bold ${theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'bg-[#18181b] text-white shadow-sm'}`}>Quick Swap</div>
                  <Link
                    to={user ? '/admin/dealer-workspace' : '/login'}
                    className={`flex-1 text-center py-1.5 rounded-md text-sm font-semibold transition-colors ${theme === 'light' ? 'text-slate-500 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Business (OTC)
                  </Link>
                </div>

                <div className="space-y-2 relative">
                  <div className={`p-5 rounded-2xl border transition-colors duration-300 relative ${current.input}`}>
                    <div className="flex justify-between mb-2">
                      <span className={`text-xs font-medium ${current.textMuted}`}>From</span>
                      <span className={`text-xs font-medium ${current.textMuted}`}>Balance: Available</span>
                    </div>
                    <div className="flex justify-between items-center relative">

                      <div
                        onClick={() => { setIsPayDropdownOpen(!isPayDropdownOpen); setIsReceiveDropdownOpen(false); }}
                        className={`flex items-center px-3 py-2 rounded-xl border cursor-pointer select-none transition-colors ${theme === 'light' ? 'bg-white border-slate-200 hover:bg-slate-50' : 'bg-[#09090b] border-white/5 hover:bg-white/10'}`}
                      >
                        <AssetIcon asset={payAsset} size="sm" className="mr-2" />
                        <span className="font-semibold text-sm mr-2">{payAsset}</span>
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      </div>

                      {isPayDropdownOpen && (
                        <div className={`absolute top-12 left-0 w-32 rounded-xl border z-50 py-1 overflow-hidden ${current.dropdown}`}>
                          {ASSETS.map(asset => (
                            <div
                              key={asset}
                              onClick={() => { setPayAsset(asset); setIsPayDropdownOpen(false); }}
                              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium cursor-pointer hover:bg-emerald-500/10 ${payAsset === asset ? 'text-emerald-500' : ''}`}
                            >
                              <AssetIcon asset={asset} size="sm" /> {asset}
                            </div>
                          ))}
                        </div>
                      )}

                      <input
                        type="number"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="0.00"
                        className="bg-transparent text-2xl font-bold outline-none w-1/2 text-right"
                      />
                    </div>
                  </div>

                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer hover:rotate-180 transition-transform duration-300" onClick={() => {
                    setPayAsset(receiveAsset);
                    setReceiveAsset(payAsset);
                  }}>
                    <div className={`p-2 rounded-full border ${theme === 'light' ? 'bg-white border-slate-200 text-emerald-500' : 'bg-[#09090b] border-white/10 text-emerald-500'}`}>
                      <ArrowDownUp className="w-4 h-4" />
                    </div>
                  </div>

                  <div className={`p-5 rounded-2xl border transition-colors duration-300 relative ${current.input}`}>
                    <div className="flex justify-between mb-2">
                      <span className={`text-xs font-medium ${current.textMuted}`}>To</span>
                      <span className={`text-xs font-medium ${current.textMuted}`}>Balance: 0.00</span>
                    </div>
                    <div className="flex justify-between items-center">

                      <div
                        onClick={() => { setIsReceiveDropdownOpen(!isReceiveDropdownOpen); setIsPayDropdownOpen(false); }}
                        className={`flex items-center px-3 py-2 rounded-xl border cursor-pointer select-none transition-colors ${theme === 'light' ? 'bg-white border-slate-200 hover:bg-slate-50' : 'bg-[#09090b] border-white/5 hover:bg-white/10'}`}
                      >
                        <AssetIcon asset={receiveAsset} size="sm" className="mr-2" />
                        <span className="text-amber-500 font-semibold text-sm mr-2">{receiveAsset}</span>
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      </div>

                      {isReceiveDropdownOpen && (
                        <div className={`absolute top-12 left-0 w-32 rounded-xl border z-50 py-1 overflow-hidden ${current.dropdown}`}>
                          {ASSETS.map(asset => (
                            <div
                              key={asset}
                              onClick={() => { setReceiveAsset(asset); setIsReceiveDropdownOpen(false); }}
                              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium cursor-pointer hover:bg-emerald-500/10 ${receiveAsset === asset ? 'text-amber-500' : ''}`}
                            >
                              <AssetIcon asset={asset} size="sm" /> {asset}
                            </div>
                          ))}
                        </div>
                      )}

                      <input
                        type="text"
                        value={currentReceiveAmount}
                        readOnly
                        className="bg-transparent text-2xl font-bold outline-none w-1/2 text-right text-amber-500 pointer-events-none"
                      />
                    </div>
                  </div>

                </div>

                <div className={`flex justify-between text-xs mt-6 mb-6 ${current.textMuted}`}>
                  <span>Rate: {formattedRate}</span>
                  <span>{publicRateMeta.source} · indicative</span>
                </div>
                <p className={`text-[11px] leading-relaxed mb-4 ${current.textMuted}`}>{publicRateMeta.disclaimer}</p>

                <button onClick={handleSwapAction} className="w-full block text-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-xl transition-colors">
                  {user ? 'Swap Now' : 'Sign up to swap'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. WHAT YOU CAN DO */}
      <section id="features" className={`py-24 border-t transition-colors duration-300 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/5 bg-[#09090b]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Everything you need, <span className="text-amber-500">in one app.</span>
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${current.textMuted}`}>
              Four things people actually do on Jasiri — no jargon, no hidden steps.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Smartphone,
                color: 'emerald',
                title: 'Deposit',
                copy: 'Fund your wallet from M-Pesa/Airtel Money, or send USDT, USDC, USDA or cUSD straight from an external wallet.',
                cta: 'Deposit funds',
                path: '/deposit',
              },
              {
                icon: ArrowDownUp,
                color: 'amber',
                title: 'Swap',
                copy: 'Convert between KES and stablecoins at a locked-in rate — see the exact amount you get before you confirm.',
                cta: 'Start a swap',
                path: '/swap',
              },
              {
                icon: Zap,
                color: 'blue',
                title: 'Redeem Airtime',
                copy: 'Turn AIRT balance into real airtime on your phone in seconds — no third app, no waiting.',
                cta: 'Redeem airtime',
                path: '/redeem-airtime',
              },
              {
                icon: Wallet,
                color: 'emerald',
                title: 'Withdraw',
                copy: 'Cash out to M-Pesa/Airtel Money, or send crypto to any external wallet address, anytime.',
                cta: 'Withdraw',
                path: '/withdraw',
              },
            ].map((item) => (
              <button
                key={item.title}
                onClick={() => navigate(user ? item.path : '/signup')}
                className={`text-left p-7 rounded-[2rem] border transition-all duration-300 hover:-translate-y-1 ${current.card}`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 border ${item.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20' : item.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                  <item.icon className={`w-5 h-5 ${item.color === 'emerald' ? 'text-emerald-500' : item.color === 'amber' ? 'text-amber-500' : 'text-blue-500'}`} />
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className={`text-sm mb-5 leading-relaxed ${current.textMuted}`}>{item.copy}</p>
                <span className="inline-flex items-center text-sm font-bold text-emerald-500">
                  {item.cta} <ArrowRight className="w-4 h-4 ml-1.5" />
                </span>
              </button>
            ))}
          </div>

          <div className={`mt-6 p-6 rounded-[2rem] border flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden ${current.card}`}>
            <span className={`text-xs font-bold uppercase tracking-widest ${current.textMuted}`}>Example route</span>
            <div className="flex items-center gap-4">
              <div key={`pay-${simIndex}`} className="animate-fade-in-up text-lg font-bold">{simulations[simIndex].pay}</div>
              <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
              <div key={`rec-${simIndex}`} className="animate-fade-in-up text-lg font-bold text-amber-500">{simulations[simIndex].receive}</div>
            </div>
            <span className={`text-xs ${current.textMuted}`}>Indicative — your locked rate shows before you confirm any swap</span>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section id="how-it-works" className={`py-32 border-t transition-colors duration-300 ${theme === 'light' ? 'border-slate-200' : 'border-white/5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
             Simple Steps 
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${current.textMuted}`}>
              Three simple steps to bridge your fiat and crypto.
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            <div className="absolute top-12 left-0 w-full h-px bg-emerald-500/20 hidden md:block"></div>

            <div className="grid md:grid-cols-3 gap-12 relative z-10">
              <div className="flex flex-col items-center text-center">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold mb-6 border-[3px] shadow-[0_0_30px_rgba(16,185,129,0.15)] ${theme === 'light' ? 'bg-white border-emerald-100 text-emerald-600' : 'bg-[#09090b] border-emerald-900/50 text-emerald-400'}`}>
                  01
                </div>
                <h3 className="text-xl font-bold mb-3">Create Account</h3>
                <p className={`text-sm leading-relaxed px-4 ${current.textMuted}`}>
                  Sign up in seconds and complete a quick KYC verification to unlock your limits.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold mb-6 border-[3px] shadow-[0_0_30px_rgba(16,185,129,0.15)] ${theme === 'light' ? 'bg-white border-emerald-100 text-emerald-600' : 'bg-[#09090b] border-emerald-900/50 text-emerald-400'}`}>
                  02
                </div>
                <h3 className="text-xl font-bold mb-3">Fund Wallet</h3>
                <p className={`text-sm leading-relaxed px-4 ${current.textMuted}`}>
                  Deposit KES directly via M-Pesa, or send Stablecoins to your Jasiri Web3 address.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold mb-6 border-[3px] shadow-[0_0_30px_rgba(16,185,129,0.15)] ${theme === 'light' ? 'bg-white border-emerald-100 text-emerald-600' : 'bg-[#09090b] border-emerald-900/50 text-emerald-400'}`}>
                  03
                </div>
                <h3 className="text-xl font-bold mb-3">Swap & Withdraw</h3>
                <p className={`text-sm leading-relaxed px-4 ${current.textMuted}`}>
                  Execute instant swaps and withdraw directly to your phone or crypto wallet.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECURITY & PLATFORM STATUS */}
      <section id="security" className={`py-24 border-t transition-colors duration-300 ${theme === 'light' ? 'border-slate-200' : 'border-white/5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            <div>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border shadow-lg ${theme === 'light' ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/20'}`}>
                <Shield className="text-amber-500 w-8 h-8" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-amber-500">
                Security & Risk Controls
              </h2>
              <p className={`text-lg mb-8 leading-relaxed ${current.textMuted}`}>
                Clear protections for retail and institutional flows, from login to final settlement.
              </p>

              <div className="space-y-4">
                <div className="flex items-center">
                  <CheckCircle2 className="text-amber-500 w-5 h-5 mr-3 shrink-0" />
                  <span className="font-semibold">Encryption in transit and at rest for account and transaction data</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="text-amber-500 w-5 h-5 mr-3 shrink-0" />
                  <span className="font-semibold">Mandatory KYC and AML screening across deposit, swap, and withdrawal actions</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="text-amber-500 w-5 h-5 mr-3 shrink-0" />
                  <span className="font-semibold">Role-based access and an audit trail on every withdrawal</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="text-amber-500 w-5 h-5 mr-3 shrink-0" />
                  <span className="font-semibold">Per-transaction and daily withdrawal limits on crypto payouts</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="text-amber-500 w-5 h-5 mr-3 shrink-0" />
                  <span className="font-semibold">Your own independent wallet address per chain — never pooled with other users' funds</span>
                </div>
              </div>

              <div className={`mt-8 p-5 rounded-2xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                <h3 className="font-bold mb-2">What this means for you</h3>
                <p className={`text-sm leading-relaxed ${current.textMuted}`}>
                  Every deposit and withdrawal is checked for identity and balance before it moves, and settles on the real network — M-Pesa/Airtel or the blockchain itself — so you can independently verify it, not just trust a number on a screen.
                </p>
                <Link to="/faq" className="inline-flex items-center mt-4 text-amber-500 font-semibold hover:text-amber-400 transition-colors">
                  See full security FAQ <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </div>
            </div>

            <div className={`p-8 rounded-[2rem] border transition-colors duration-300 ${current.card}`}>
              <div className="mb-6">
                <span className={`text-xs font-bold tracking-widest uppercase ${current.textMuted}`}>Rails We Support</span>
              </div>

              <div className="space-y-3">
                <div className={`flex justify-between items-center p-5 rounded-2xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                  <span className="font-semibold text-sm">M-Pesa & Airtel Money</span>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full border ${theme === 'light' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>Deposits & payouts</span>
                </div>
                <div className={`flex justify-between items-center p-5 rounded-2xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                  <span className="font-semibold text-sm">Celo (USDT / USDC / cUSD)</span>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full border ${theme === 'light' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>Deposits & payouts</span>
                </div>
                <div className={`flex justify-between items-center p-5 rounded-2xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                  <span className="font-semibold text-sm">Cardano (USDA)</span>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full border ${theme === 'light' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>Deposits & payouts</span>
                </div>
                <div className={`flex justify-between items-center p-5 rounded-2xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                  <span className="font-semibold text-sm">Stellar</span>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full border ${theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-slate-400'}`}>Coming soon</span>
                </div>
                <div className={`flex justify-between items-center p-5 rounded-2xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                  <span className="font-semibold text-sm">Bank Transfer</span>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full border ${theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-slate-400'}`}>Coming soon</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. FOR BUSINESSES */}
      <section id="business" className={`py-24 border-t transition-colors duration-300 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/5 bg-[#09090b]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`rounded-[2rem] border p-8 sm:p-14 ${current.card}`}>
            <div className="grid lg:grid-cols-3 gap-10 items-center">
              <div className="lg:col-span-2">
                <div className="mb-2">
                  <span className={`text-xs font-semibold ${current.textMuted}`}>For businesses & OTC desks</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                  Settle bulk payouts with approval controls built in
                </h2>
                <p className={`text-base leading-relaxed max-w-2xl mb-8 ${current.textMuted}`}>
                  Run payroll, supplier payments, or large stablecoin-to-shilling conversions through the same rails your retail swaps use — with risk-tiered limits, multi-person approvals, and a full audit trail on every settlement.
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { title: 'Risk-tiered limits', body: 'Per-transaction and daily caps that scale with your verification level.' },
                    { title: 'Approval workflows', body: 'Large payouts require sign-off before they leave the desk.' },
                    { title: 'Full audit trail', body: 'Every settlement is logged and traceable, end to end.' },
                  ].map((f) => (
                    <div key={f.title} className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#121214] border-white/5'}`}>
                      <p className="font-bold text-sm mb-1">{f.title}</p>
                      <p className={`text-xs leading-relaxed ${current.textMuted}`}>{f.body}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex lg:justify-end">
                <Link
                  to={user ? '/admin/dealer-workspace' : '/login'}
                  className="inline-flex items-center justify-center font-bold px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors"
                >
                  Talk to our OTC desk <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CROSS-BORDER */}
      <section id="cross-border" className={`py-24 border-t transition-colors duration-300 ${theme === 'light' ? 'border-slate-200' : 'border-white/5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border shadow-lg ${theme === 'light' ? 'bg-blue-50 border-blue-200' : 'bg-blue-500/10 border-blue-500/20'}`}>
                <Globe className="text-blue-500 w-8 h-8" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Built for money that crosses borders
              </h2>
              <p className={`text-lg mb-8 leading-relaxed ${current.textMuted}`}>
                Your stablecoin wallet isn't tied to Kenya — it's a real, independent address on Celo and Cardano that anyone, anywhere, can send to. Combined with regional mobile-money currencies, that means family, clients, or partners abroad can pay in without a local bank account on either side.
              </p>
              <div className="space-y-4">
                {[
                  'One stablecoin wallet works the same whether the sender is next door or overseas.',
                  'Regional currencies settle straight to mobile money — no separate remittance step.',
                  'The receiving side always sees the exact local-currency amount before it lands.',
                ].map((line) => (
                  <div key={line} className="flex items-start">
                    <CheckCircle2 className="text-blue-500 w-5 h-5 mr-3 mt-0.5 shrink-0" />
                    <span className="font-semibold">{line}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`p-8 rounded-[2rem] border transition-colors duration-300 ${current.card}`}>
              <h3 className={`text-xs font-bold tracking-widest uppercase mb-6 ${current.textMuted}`}>Regional currencies we settle to</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { code: 'KES', place: 'Kenya' },
                  { code: 'UGX', place: 'Uganda' },
                  { code: 'TZS', place: 'Tanzania' },
                  { code: 'RWF', place: 'Rwanda' },
                  { code: 'BIF', place: 'Burundi' },
                  { code: 'XAF / XOF', place: 'CFA Franc Zone' },
                ].map((c) => (
                  <div key={c.code} className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                    <p className="font-mono text-sm font-bold text-emerald-500">{c.code}</p>
                    <p className={`text-xs mt-0.5 ${current.textMuted}`}>{c.place}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CALL TO ACTION */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className={`relative rounded-[3rem] p-12 sm:p-20 text-center overflow-hidden border ${theme === 'light' ? 'bg-emerald-50 border-emerald-200' : 'bg-gradient-to-br from-[#064e3b]/40 to-transparent border-emerald-500/20'}`}>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-6">
              Ready to be brave?
            </h2>
            <p className={`text-lg mb-10 max-w-xl mx-auto ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
              Join thousands of users who are already moving money faster, cheaper, and safer across borders.
            </p>
            <button onClick={handleGetStarted} className="inline-flex items-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              {user ? 'Go to your workspace' : 'Create your free account'} <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* 8. TRUST CENTER */}
      <section id="trust-center" className={`py-24 border-t transition-colors duration-300 ${theme === 'light' ? 'border-slate-200 bg-slate-50/60' : 'border-white/5 bg-[#0b0b0e]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Trust Center
            </h2>
            <p className={`text-lg max-w-3xl mx-auto ${current.textMuted}`}>
              Everything You Need before you  move money: fees, legal terms, privacy protections, platform status and support.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <article id="fees" className={`p-7 rounded-3xl border ${current.card}`}>
              <h3 className="text-xl font-bold mb-3">Fees</h3>
              <p className={`text-sm leading-relaxed ${current.textMuted}`}>
                Jasiri displays the estimated swap amount, execution rate and network fee before confirmation. Retail trades currently apply a 0.5% platform fee.
              </p>
            </article>

            <article id="compliance" className={`p-7 rounded-3xl border ${current.card}`}>
              <h3 className="text-xl font-bold mb-3">Compliance</h3>
              <p className={`text-sm leading-relaxed ${current.textMuted}`}>
                KYC onboarding and AML transaction monitoring are required for regulated cross-rail settlement and account protection.
              </p>
            </article>

            <article id="status" className={`p-7 rounded-3xl border ${current.card}`}>
              <h3 className="text-xl font-bold mb-3">Status</h3>
              <p className={`text-sm leading-relaxed ${current.textMuted}`}>
                The rails we support are listed above under Security. New rails are added as they're fully tested — we'd rather ship fewer things that work than promise everything at once.
              </p>
            </article>

            <article id="help" className={`p-7 rounded-3xl border ${current.card}`}>
              <h3 className="text-xl font-bold mb-3">Help</h3>
              <p className={`text-sm leading-relaxed ${current.textMuted}`}>
                Need onboarding help? Email support@jasiri.finance and include your account email for the fastest response.
              </p>
            </article>

            <article id="privacy" className={`p-7 rounded-3xl border ${current.card}`}>
              <h3 className="text-xl font-bold mb-3">Privacy</h3>
              <p className={`text-sm leading-relaxed ${current.textMuted}`}>
                Identity and transaction data are encrypted in transit and at rest. Access is role-based and audited for sensitive operations.
              </p>
            </article>

            <article id="terms" className={`p-7 rounded-3xl border ${current.card}`}>
              <h3 className="text-xl font-bold mb-3">Terms</h3>
              <p className={`text-sm leading-relaxed ${current.textMuted}`}>
                Trading, custody and withdrawal operations are governed by Jasiri service terms, risk disclosures and applicable local regulations.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className={`border-t pt-16 pb-8 transition-colors duration-300 ${current.footer}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">

            <div className="lg:col-span-2 pr-8">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-md border border-slate-200">
                  <img src={logo} alt="Jasiri Logo" className="w-5 h-5 object-contain" />
                </div>
                <span className="ml-3 text-lg font-bold tracking-tight">JASIRI</span>
              </div>
              <p className={`text-sm leading-relaxed max-w-xs mb-6 ${current.textMuted}`}>
                Bridging the gap between traditional African finance and the global Web3 ecosystem.
              </p>
              <p className={`text-xs ${current.textMuted}`}>Support and social channels are available for onboarding and account assistance.</p>

              <div className="mt-10">
                <div className="flex items-center gap-3">
                  <a href="https://wa.me/254714073826" target="_blank" rel="noreferrer" aria-label='Jasiri on WhatsApp' className={`p-2 rounded-lg border transition-colors ${theme === 'light' ? 'border-slate-200 hover:bg-slate-100' : 'border-white/10 hover:bg-white/5'}`}>
                    <MessageCircle className="w-4 h-4" />
                  </a>
                  <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Jasiri on Instagram" className={`p-2 rounded-lg border transition-colors ${theme === 'light' ? 'border-slate-200 hover:bg-slate-100' : 'border-white/10 hover:bg-white/5'}`}>
                    <Instagram className="w-4 h-4" />
                  </a>
                  <a href="https://www.tiktok.com" target="_blank" rel="noreferrer" aria-label="Jasiri on TikTok" className={`p-2 rounded-lg border transition-colors ${theme === 'light' ? 'border-slate-200 hover:bg-slate-100' : 'border-white/10 hover:bg-white/5'}`}>
                    <Music2 className="w-4 h-4" />
                  </a>
                  <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Jasiri on Facebook" className={`p-2 rounded-lg border transition-colors ${theme === 'light' ? 'border-slate-200 hover:bg-slate-100' : 'border-white/10 hover:bg-white/5'}`}>
                    <Facebook className="w-4 h-4" />
                  </a>
                  <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="Jasiri on X" className={`p-2 rounded-lg border transition-colors ${theme === 'light' ? 'border-slate-200 hover:bg-slate-100' : 'border-white/10 hover:bg-white/5'}`}>
                    <Twitter className="w-4 h-4" />
                  </a>
                  <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="Jasiri on GitHub" className={`p-2 rounded-lg border transition-colors ${theme === 'light' ? 'border-slate-200 hover:bg-slate-100' : 'border-white/10 hover:bg-white/5'}`}>
                    <Github className="w-4 h-4" />
                  </a>
                  <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="Jasiri on LinkedIn" className={`p-2 rounded-lg border transition-colors ${theme === 'light' ? 'border-slate-200 hover:bg-slate-100' : 'border-white/10 hover:bg-white/5'}`}>
                    <Linkedin className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-xs tracking-widest uppercase mb-6">Products</h4>
              <ul className={`space-y-4 text-sm ${current.textMuted}`}>
                <li><Link to={user ? '/swap' : '/signup'} className="hover:text-amber-500 transition-colors">Retail Swap</Link></li>
                <li><Link to={user ? '/admin/dealer-workspace' : '/login'} className="hover:text-amber-500 transition-colors">OTC Desk</Link></li>
                <li><span className="opacity-75">Liquidity API (Coming soon)</span></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-xs tracking-widest uppercase mb-6">Resources</h4>
              <ul className={`space-y-4 text-sm ${current.textMuted}`}>
                <li><a href="#how-it-works" className="hover:text-amber-500 transition-colors">Getting Started Guide</a></li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsHelpCenterOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 hover:text-amber-500 transition-colors"
                    aria-expanded={isHelpCenterOpen}
                  >
                    Help Center
                    <ChevronDown className={`w-4 h-4 transition-transform ${isHelpCenterOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isHelpCenterOpen && (
                    <div className={`mt-3 p-4 rounded-xl border space-y-3 ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                      <a href="tel:+254714073826" className="flex items-center gap-2 hover:text-amber-500 transition-colors">
                        <Phone className="w-4 h-4" />
                        <span>0714 073 826</span>
                      </a>
                      <a href="https://wa.me/254714073826" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-amber-500 transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp Support</span>
                      </a>
                      <a href="mailto:support@jasiri.finance" className="flex items-center gap-2 hover:text-amber-500 transition-colors">
                        <Mail className="w-4 h-4" />
                        <span>support@jasiri.finance</span>
                      </a>
                      <Link to="/faq" className="inline-block text-amber-500 font-semibold hover:text-amber-400 transition-colors">
                        Browse full FAQ
                      </Link>
                    </div>
                  )}
                </li>
                <li><a href="#fees" className="hover:text-amber-500 transition-colors">Fees & Limits</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-xs tracking-widest uppercase mb-6">Company</h4>
              <ul className={`space-y-4 text-sm ${current.textMuted}`}>
                <li><a href="#compliance" className="hover:text-amber-500 transition-colors">Compliance</a></li>
                <li><a href="#privacy" className="hover:text-amber-500 transition-colors">Privacy Policy</a></li>
                <li><a href="#terms" className="hover:text-amber-500 transition-colors">Terms of Service</a></li>
              </ul>
            </div>

          </div>

          <div className={`pt-8 pb-8 border-t ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
            <h4 className={`text-xs font-bold tracking-widest uppercase mb-5 ${current.textMuted}`}>Countries we reach</h4>
            {/* Fixed: this ticker previously had a 52s duration spread over
                only 16 flags (~3.25s/flag), which visually read as barely
                moving. Duration now derives from the item count (see
                COUNTRY_TICKER_DURATION above, ~1.15s/flag) and the transform
                uses translate3d for GPU-accelerated, jank-free motion. It
                never pauses on hover, by design — only reduced-motion users
                get a static list, per the accessibility media query above,
                which is expected/intended behavior, not a bug. */}
            <div className="overflow-hidden w-full">
              <div className="animate-marquee-slow">
                {[...SUPPORTED_COUNTRIES, ...SUPPORTED_COUNTRIES].map((country, i) => (
                  <div key={`${country.code}-${i}`} className="inline-flex flex-col items-center gap-2 mx-5 shrink-0">
                    <div className={`w-14 h-14 rounded-full overflow-hidden border-2 ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
                      <img
                        src={`https://flagcdn.com/w80/${country.code}.png`}
                        alt={country.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className={`text-xs font-medium ${current.textMuted}`}>{country.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`pt-8 border-t flex flex-col md:flex-row justify-between items-center text-xs ${current.textMuted} ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
            <p>© 2026 Jasiri Capital Ltd. All rights reserved.</p>
            <div className={`mt-4 md:mt-0 flex items-center gap-2 text-[11px] font-semibold ${current.textMuted}`}>
              <a href="#status" className="px-3 py-1.5 rounded-full border hover:text-amber-500 transition-colors">System Status</a>
              <Link to="/faq" className="px-3 py-1.5 rounded-full border hover:text-amber-500 transition-colors">Security FAQ</Link>
              <a href="mailto:support@jasiri.finance" className="px-3 py-1.5 rounded-full border hover:text-amber-500 transition-colors">Contact Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}