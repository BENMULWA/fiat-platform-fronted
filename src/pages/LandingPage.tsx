//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowDownUp, Shield, Smartphone, Sun, Moon, Monitor, CheckCircle2, Zap, Layers, ChevronDown, Menu, Lock, Globe, X, Wallet, Link2, Network, Phone, Mail, MessageCircle, Twitter, Github, Linkedin, Instagram, Facebook, Music2 } from 'lucide-react';
import logo from '../pages/assets/jasiri-icon.png';
import { useAuth } from '../contexts/AuthContext';

// --- CUSTOM STYLES FOR ANIMATIONS ---
const customStyles = `
  @keyframes marquee {
    0% { transform: translateX(0%); }
    100% { transform: translateX(-50%); }
  }
  .animate-marquee {
    display: flex;
    width: 200%;
    animation: marquee 20s linear infinite;
  }
  .animate-marquee:hover {
    animation-play-state: paused;
  }
  
  @keyframes fade-in-up {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-up {
    animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
`;

// --- MOCK EXCHANGE RATES (Base = USD) ---
const RATES: Record<string, number> = {
  USDT: 1.0,
  USDC: 1.0,
  USDA: 1.0,
  KES: 1 / 128.50,
  IMP: 0.10,
  AIRT: 1 / 128.50
};

const ASSETS = Object.keys(RATES);

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, viewAsAdmin } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dim' | 'dark'>('dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile Menu State
  const [enableMotion, setEnableMotion] = useState(false);
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);

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
    { pay: "1,000 USDC", receive: "10,000 IMP" }
  ];

  useEffect(() => {
    // Defer non-essential motion so the first paint is focused on the primary CTA.
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

  // --- CALCULATE HERO RECEIVE AMOUNT ---
  const calculateReceive = () => {
    const num = parseFloat(payAmount);
    if (isNaN(num) || num <= 0) return "0.00";
    const usdValue = num * RATES[payAsset];
    const receiveValue = usdValue / RATES[receiveAsset];
    return receiveValue > 1000 ? receiveValue.toFixed(2) : receiveValue.toFixed(4);
  };

  const currentReceiveAmount = calculateReceive();
  const crossRate = (RATES[payAsset] / RATES[receiveAsset]);
  const formattedRate = crossRate < 1
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

  const marketRates = [
    { pair: "USDA/KES", price: "128.50", change: "+0.12%", positive: true, img: "https://cryptologos.cc/logos/avalanche-avax-logo.png" },
    { pair: "USDC/KES", price: "128.50", change: "+0.05%", positive: true, img: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png" },
    { pair: "USDT/KES", price: "128.50 ", change: "-0.01%", positive: false, img: "https://cryptologos.cc/logos/tether-usdt-logo.png" },
    { pair: "ETH/KES", price: "445,210", change: "+2.40%", positive: true, img: "https://cryptologos.cc/logos/ethereum-eth-logo.png" },
    { pair: "BTC/KES", price: "8,320,500", change: "+1.80%", positive: true, img: "https://cryptologos.cc/logos/bitcoin-btc-logo.png" },
  ];

  return (
    <div className={`min-h-screen ${current.bg} ${current.text} font-sans transition-colors duration-300`}>
      <style>{customStyles}</style>

      {/* TOP TICKER */}
      <div className="w-full bg-[#000000] text-white text-xs py-2 overflow-hidden whitespace-nowrap border-b border-emerald-500/20 flex items-center relative z-50">
        <div className={enableMotion ? 'animate-marquee' : 'flex w-full justify-center'}>
          {[...marketRates, ...marketRates].map((rate, i) => (
            <div key={i} className="inline-flex items-center mx-6 font-medium">
              <img src={rate.img} alt={rate.pair} className="w-4 h-4 mr-2 rounded-full object-cover bg-white" />
              <span className="mr-3">{rate.pair}</span>
              <span>{rate.price}</span>
              <span className={`ml-2 ${rate.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {rate.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* NAVBAR */}
      <nav className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors duration-300 ${current.nav}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">

            {/* Logo */}
            <div className="flex items-center shrink-0">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden border border-slate-200 shrink-0">
                <img src={logo} alt="Jasiri Logo" className="w-8 h-8 object-contain" />
              </div>
              <span className="ml-3 text-xl font-bold tracking-tight">JASIRI</span>
            </div>

            {/* Desktop Center Links */}
            <div className="hidden md:flex space-x-8">
              <a href="#features" className={`${current.textMuted} hover:${current.text} transition-colors font-medium text-sm`}>Features</a>
              <a href="#how-it-works" className={`${current.textMuted} hover:${current.text} transition-colors font-medium text-sm`}>How it Works</a>
              <a href="#security" className={`${current.textMuted} hover:${current.text} transition-colors font-medium text-sm`}>Security</a>
              <a href="#trust-center" className={`${current.textMuted} hover:${current.text} transition-colors font-medium text-sm`}>Trust Center</a>
            </div>

            {/* Desktop Right Actions */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Dynamic Single Theme Toggle */}
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

            {/* Mobile Actions (Theme Toggle & Hamburger) */}
            <div className="flex md:hidden items-center space-x-3">
              {/* Mobile Single Theme Toggle */}
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

              {/* Hamburger Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-2 rounded-lg transition-colors ${current.text} hover:bg-emerald-500/10`}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className={`md:hidden absolute top-20 left-0 w-full border-b shadow-2xl ${current.nav}`}>
            <div className="px-6 py-6 space-y-6">
              <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className={`block text-lg font-medium ${current.text}`}>Features</a>
              <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className={`block text-lg font-medium ${current.text}`}>How it Works</a>
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
            
            {/* NEW: Live Indicator above the Hero Title 
              <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full mb-8 border ${theme === 'light' ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-emerald-500 text-xs font-semibold tracking-wide">Live on M-Pesa, Celo & Cardano</span>
              </div>
              */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
                <span className="block">Jasiri.</span>
                <span className="block text-amber-500">Confidence In</span>
                <span className="block text-emerald-500">Every Currency</span>
              </h1>
              <p className={`text-lg sm:text-xl gap-2 mb-10 leading-relaxed ${current.textMuted}`}>
                Swap Fiat, Stablecoins and Airtime instantly. <br /><span>No slippage, no hidden fees</span>.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4">
                <button onClick={handleGetStarted} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 py-4 rounded-xl transition-all flex items-center justify-center">
                  <Shield className="mr-2 w-5 h-5" /> {user ? 'Open Workspace' : 'Get Started'}
                </button>
                <a href="#how-it-works" className={`w-full sm:w-auto font-bold px-8 py-4 rounded-xl transition-all flex items-center justify-center border ${theme === 'light' ? 'bg-white border-slate-200 hover:bg-slate-50' : 'bg-[#18181b] border-white/5 hover:bg-white/5'}`}>
                  <Zap className="mr-2 w-5 h-5 text-amber-500" /> How it Works
                </a>
              </div>
              {/* Platform rails visible without scrolling to reinforce first-page trust. */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-10">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#18181b] border-white/10'}`}>
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-semibold">Mpesa</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#18181b] border-white/10'}`}>
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-semibold">USDT</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#18181b] border-white/10'}`}>
                  <Wallet className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold">USDC</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#18181b] border-white/10'}`}>
                  <Link2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold">USDA</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#18181b] border-white/10'}`}>
                  <Network className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold">cUSD</span>
                </div>
              </div>
            </div>
            
            

            <div className="relative h-full mx-auto w-full max-w-md lg:ml-auto">
              <div className={`p-8 sm:p-8 rounded-[2rem] border transition-colors duration-300 ${current.card}`}>
                <div className="mb-6">
                  <h3 className={`text-xs font-bold tracking-widest uppercase ${current.textMuted}`}>Instant Swap</h3>
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
                        <span className="font-semibold text-sm mr-2">{payAsset}</span>
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      </div>

                      {isPayDropdownOpen && (
                        <div className={`absolute top-12 left-0 w-32 rounded-xl border z-50 py-1 overflow-hidden ${current.dropdown}`}>
                          {ASSETS.map(asset => (
                            <div
                              key={asset}
                              onClick={() => { setPayAsset(asset); setIsPayDropdownOpen(false); }}
                              className={`px-4 py-2 text-sm font-medium cursor-pointer hover:bg-emerald-500/10 ${payAsset === asset ? 'text-emerald-500' : ''}`}
                            >
                              {asset}
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
                        <span className="text-amber-500 font-semibold text-sm mr-2">{receiveAsset}</span>
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      </div>

                      {isReceiveDropdownOpen && (
                        <div className={`absolute top-12 left-0 w-32 rounded-xl border z-50 py-1 overflow-hidden ${current.dropdown}`}>
                          {ASSETS.map(asset => (
                            <div
                              key={asset}
                              onClick={() => { setReceiveAsset(asset); setIsReceiveDropdownOpen(false); }}
                              className={`px-4 py-2 text-sm font-medium cursor-pointer hover:bg-emerald-500/10 ${receiveAsset === asset ? 'text-amber-500' : ''}`}
                            >
                              {asset}
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
                  <span>Fee: 0.5%</span>
                </div>

                <button onClick={handleSwapAction} className="w-full block text-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-xl transition-colors">
                  {user ? 'Swap Now' : 'Sign up to swap'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* 2. FEATURES GRID SECTION */}
      <section id="features" className={`py-24 border-t transition-colors duration-300 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/5 bg-[#09090b]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              One Platform. <span className="text-amber-500">Every Rail.</span>
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${current.textMuted}`}>
              Execute across fiat, stablecoins, and airtime with transparent pricing and institutional controls.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Feature 1 (Large - Animated Simulation) */}
            <div className={`lg:col-span-2 p-8 sm:p-10 rounded-[2rem] border transition-colors duration-300 ${current.card} flex flex-col justify-between`}>
              <div>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 border border-emerald-500/20">
                  <ArrowDownUp className="text-emerald-500 w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Cross-Rail Execution Engine</h3>
                <p className={`mb-8 max-w-2xl leading-relaxed ${current.textMuted}`}>
                  Move value across M-Pesa, Celo, Cardano, Stellar, and dollar stablecoins from one workspace. Retail conversions and OTC bulky settlements run on the same monitored execution stack.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
                  <div className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                    <p className={`text-[10px] uppercase font-bold tracking-wider ${current.textMuted}`}>Active Rails</p>
                    <p className="text-xl font-bold mt-1">4 Live</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                    <p className={`text-[10px] uppercase font-bold tracking-wider ${current.textMuted}`}>Avg Settlement</p>
                    <p className="text-xl font-bold mt-1">&lt; 2 mins</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                    <p className={`text-[10px] uppercase font-bold tracking-wider ${current.textMuted}`}>Quote Certainty</p>
                    <p className="text-xl font-bold mt-1 text-emerald-500">No Slippage</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mt-auto overflow-hidden">
                <div key={`pay-${simIndex}`} className={`animate-fade-in-up flex-1 p-5 rounded-2xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${current.textMuted}`}>Route Example</span>
                  <p className="text-xl font-bold mt-1">{simulations[simIndex].pay}</p>
                </div>
                <div key={`rec-${simIndex}`} className={`animate-fade-in-up flex-1 p-5 rounded-2xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${current.textMuted}`}>Settlement Output</span>
                  <p className="text-xl font-bold mt-1 text-amber-500">{simulations[simIndex].receive}</p>
                </div>
              </div>
            </div>

            {/* Sub-grid for Right Column */}
            <div className="grid gap-6">
              {/* Feature 2 */}
              <div className={`p-8 rounded-[2rem] border transition-colors duration-300 ${current.card}`}>
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center mb-5 border border-amber-500/20">
                  <Smartphone className="text-amber-500 w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold mb-2">Retail Quick Conversions</h3>
                <p className={`text-sm mb-6 ${current.textMuted}`}>
                  Convert KES, stablecoins, or airtime into usable value with transparent quoting and predictable payout behavior.
                </p>
                <div className={`flex items-center justify-between p-4 rounded-xl border text-sm font-bold ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                  <span>KES 500</span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  <span className="text-amber-500">3.86 USDA</span>
                </div>
              </div>

              {/* Feature 3 */}
              <div className={`p-8 rounded-[2rem] border transition-colors duration-300 ${current.card}`}>
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-5 border border-blue-500/20">
                  <Layers className="text-blue-500 w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold mb-2">Institutional Settlement Controls</h3>
                <p className={`text-sm mb-6 ${current.textMuted}`}>
                  Built for bulky disbursements with risk-tiered limits, approval workflows, queue monitoring, and audit-ready transaction trails.
                </p>

                <div className="space-y-3 mt-4">
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border ${theme === 'light' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>Live: M-Pesa</span>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border ${theme === 'light' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>Live: Celo</span>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border ${theme === 'light' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>Live: Cardano</span>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border ${theme === 'light' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>Live: Stellar</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border ${theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-slate-400'}`}>Coming Soon: Bank Rails</span>
                  </div>
                </div>
              </div>
            </div>
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
                  <span className="font-semibold">Role-based access, approval controls, and immutable audit trails</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="text-amber-500 w-5 h-5 mr-3 shrink-0" />
                  <span className="font-semibold">2FA and anomaly checks before high-risk or high-value withdrawals</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="text-amber-500 w-5 h-5 mr-3 shrink-0" />
                  <span className="font-semibold">Institutional bulky settlement controls with risk-tiered limits and queue monitoring</span>
                </div>
              </div>

              <div className={`mt-8 p-5 rounded-2xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                <h3 className="font-bold mb-2">What this means for you</h3>
                <p className={`text-sm leading-relaxed ${current.textMuted}`}>
                  Every transaction is checked for identity, risk profile, and rail health before execution. If controls detect unusual behavior, we pause and verify before funds move.
                </p>
                <Link to="/faq" className="inline-flex items-center mt-4 text-amber-500 font-semibold hover:text-amber-400 transition-colors">
                  See full security FAQ <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </div>
            </div>

            <div className={`p-8 rounded-[2rem] border transition-colors duration-300 ${current.card}`}>
              <div className="mb-6 flex items-start justify-between">
                <span className={`text-xs font-bold tracking-widest uppercase ${current.textMuted}`}>Platform Status</span>
                <span className={`text-[11px] ${current.textMuted}`}>Updated 2 mins ago</span>
              </div>

              <div className="space-y-4">
                <div className={`flex justify-between items-center p-5 rounded-2xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                  <span className="font-semibold text-sm">M-Pesa Rail</span>
                  <div className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
                    <span className="text-emerald-500 text-sm font-semibold">Online</span>
                  </div>
                </div>

                <div className={`flex justify-between items-center p-5 rounded-2xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                  <span className="font-semibold text-sm">Celo (Valora) Rail</span>
                  <div className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
                    <span className="text-emerald-500 text-sm font-semibold">Online</span>
                  </div>
                </div>

                <div className={`flex justify-between items-center p-5 rounded-2xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                  <span className="font-semibold text-sm">Cardano Rail</span>
                  <div className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
                    <span className="text-emerald-500 text-sm font-semibold">Online</span>
                  </div>
                </div>

                <div className={`flex justify-between items-center p-5 rounded-2xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                  <span className="font-semibold text-sm">Institutional Settlement Queue</span>
                  <div className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
                    <span className="text-emerald-500 text-sm font-semibold">Stable</span>
                  </div>
                </div>

                <div className={`flex justify-between items-center p-5 rounded-2xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                  <span className="font-semibold text-sm">Bulk Payout Risk Engine</span>
                  <div className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
                    <span className="text-emerald-500 text-sm font-semibold">Monitoring</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION */}
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

      {/* 6. TRUST CENTER */}
      <section id="trust-center" className={`py-24 border-t transition-colors duration-300 ${theme === 'light' ? 'border-slate-200 bg-slate-50/60' : 'border-white/5 bg-[#0b0b0e]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Trust Center
            </h2>
            <p className={`text-lg max-w-3xl mx-auto ${current.textMuted}`}>
              Everything new users need before they move money: fees, legal terms, privacy protections, platform status and support.
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
                Live rail health is visible above in Platform Status. If a rail degrades, deposit and withdrawal warnings are shown before execution.
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

      {/* 7. FOOTER */}
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
               {/* <p className={`text-xs uppercase tracking-widest mb-3 ${current.textMuted}`}>Socials</p> */}
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