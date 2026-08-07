//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowDownUp, Shield, Smartphone, Sun, Moon, Monitor, CheckCircle2, Zap, Layers, Twitter, Github, Linkedin, ShieldCheck, ChevronDown, Menu, Lock, Smartpone, Globe, X, Wallet, Link2, Network } from 'lucide-react';
import logo from '../pages/assets/jasiri-icon.png';

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
  const [theme, setTheme] = useState<'light' | 'dim' | 'dark'>('dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile Menu State

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
    const timer = setInterval(() => {
      setSimIndex((prev) => (prev + 1) % simulations.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [simulations.length]);

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
  const handleSwapAction = () => {
    const hasToken = localStorage.getItem('token') || localStorage.getItem('authToken') || sessionStorage.getItem('token');
    if (hasToken) {
      navigate('/admin/dashboard');
    } else {
      navigate('/signup');
    }
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
        <div className="animate-marquee">
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

              <Link to="/login" className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors hover:bg-emerald-500/10 ${current.text}`}>
                Log in
              </Link>
              <button onClick={handleSwapAction} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold px-5 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                Get Started
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

              <div className="pt-6 border-t border-slate-500/20 flex flex-col gap-4">
                <Link to="/login" className={`block text-center w-full py-4 rounded-xl border font-bold ${theme === 'light' ? 'border-slate-300' : 'border-white/10'}`}>
                  Log in
                </Link>
                <button onClick={handleSwapAction} className="w-full block text-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-xl">
                  Get Started
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
              <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full mb-8 border ${theme === 'light' ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-emerald-500 text-xs font-semibold tracking-wide">Live on M-Pesa, Celo & Cardano</span>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
                The <span className="text-amber-500">Brave Way</span><br />
                to <span className="text-emerald-500">Move Money</span>
              </h1>
              <p className={`text-lg sm:text-xl mb-10 leading-relaxed ${current.textMuted}`}>
                Swap between mobile money, crypto, and airtime instantly at transparent OTC rates. No slippage, no hidden fees.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4">
                <button onClick={handleSwapAction} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 py-4 rounded-xl transition-all flex items-center justify-center">
                  <Shield className="mr-2 w-5 h-5" /> Get Started
                </button>
                <a href="#how-it-works" className={`w-full sm:w-auto font-bold px-8 py-4 rounded-xl transition-all flex items-center justify-center border ${theme === 'light' ? 'bg-white border-slate-200 hover:bg-slate-50' : 'bg-[#18181b] border-white/5 hover:bg-white/5'}`}>
                  <Zap className="mr-2 w-5 h-5 text-amber-500" /> How it Works
                </a>
              </div>
              {/* Left Column: Copy */}
              <div className="text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
                

                {/* NEW: Platform Pills below the CTA buttons */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-10">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#18181b] border-white/10'}`}>
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-semibold">M-Pesa</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#18181b] border-white/10'}`}>
                    <Wallet className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold">Valora (Celo)</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#18181b] border-white/10'}`}>
                    <Link2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold">Cardano</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#18181b] border-white/10'}`}>
                    <Network className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold">Stellar</span>
                  </div>
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
                      <span className={`text-xs font-medium ${current.textMuted}`}>You Pay</span>
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
                      <span className={`text-xs font-medium ${current.textMuted}`}>You Receive</span>
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
                  Swap Now
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
              Bravely bridge the gap between traditional finance, mobile money, and decentralized crypto.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Feature 1 (Large - Animated Simulation) */}
            <div className={`lg:col-span-2 p-8 sm:p-10 rounded-[2rem] border transition-colors duration-300 ${current.card} flex flex-col justify-between`}>
              <div>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 border border-emerald-500/20">
                  <ArrowDownUp className="text-emerald-500 w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Instant OTC Swaps</h3>
                <p className={`mb-12 max-w-md leading-relaxed ${current.textMuted}`}>
                  Swap KES to USDA, USDT, USDC, BTC, and ETH in seconds. No order books, no slippage. Just transparent, institutional-grade pricing for every user.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mt-auto overflow-hidden">
                <div key={`pay-${simIndex}`} className={`animate-fade-in-up flex-1 p-5 rounded-2xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${current.textMuted}`}>You Pay</span>
                  <p className="text-xl font-bold mt-1">{simulations[simIndex].pay}</p>
                </div>
                <div key={`rec-${simIndex}`} className={`animate-fade-in-up flex-1 p-5 rounded-2xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#09090b] border-white/5'}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${current.textMuted}`}>You Receive</span>
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
                <h3 className="text-lg font-bold mb-2">Airtime Tokenization</h3>
                <p className={`text-sm mb-6 ${current.textMuted}`}>
                  Convert unused Safaricom and Airtel airtime directly into digital dollars. No value left behind.
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
                <h3 className="text-lg font-bold mb-2">Multi-Rail Settlement</h3>
                <p className={`text-sm mb-6 ${current.textMuted}`}>
                  Deposit and withdraw natively via M-Pesa, Valora (Celo), Cardano, and Stellar. Bank rails coming soon.
                </p>

                {/* Updated Rails List */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 md:gap-6 text-sm font-bold text-gray-500 opacity-60 grayscale mt-4">
                  <div className="flex items-center gap-2"><Smartphone className="w-5 h-5 shrink-0" /> M-Pesa</div>
                  <div className="flex items-center gap-2"><Globe className="w-5 h-5 shrink-0" /> Valora</div>
                  <div className="flex items-center gap-2"><Lock className="w-5 h-5 shrink-0" /> Cardano</div>
                  <div className="flex items-center gap-2"><Network className="w-5 h-5 shrink-0" /> Stellar</div>
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
              How Jasiri Works
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
                Brave Security
              </h2>
              <p className={`text-lg mb-8 leading-relaxed ${current.textMuted}`}>
                Jasiri means brave. We protect your assets with the courage of a warrior and the precision of a bank.
              </p>

              <div className="space-y-4">
                <div className="flex items-center">
                  <CheckCircle2 className="text-amber-500 w-5 h-5 mr-3 shrink-0" />
                  <span className="font-semibold">Bank-Grade Encryption & Cold Storage</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="text-amber-500 w-5 h-5 mr-3 shrink-0" />
                  <span className="font-semibold">KYC Verified & AML Compliant</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="text-amber-500 w-5 h-5 mr-3 shrink-0" />
                  <span className="font-semibold">Immutable Audit Trail & 2FA</span>
                </div>
              </div>
            </div>

            <div className={`p-8 rounded-[2rem] border transition-colors duration-300 ${current.card}`}>
              <div className="mb-6 flex items-center justify-center">
                <span className={`text-xs font-bold tracking-widest uppercase ${current.textMuted}`}>Platform Status</span>
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
            <button onClick={handleSwapAction} className="inline-flex items-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              Create your free account <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
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
              <div className="flex space-x-4">
                <a href="#" className={`${current.textMuted} hover:text-emerald-500 transition-colors`}><Twitter className="w-5 h-5" /></a>
                <a href="#" className={`${current.textMuted} hover:text-emerald-500 transition-colors`}><Github className="w-5 h-5" /></a>
                <a href="#" className={`${current.textMuted} hover:text-emerald-500 transition-colors`}><Linkedin className="w-5 h-5" /></a>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-xs tracking-widest uppercase mb-6">Products</h4>
              <ul className={`space-y-4 text-sm ${current.textMuted}`}>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Retail Swap</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">OTC Desk</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Liquidity API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-xs tracking-widest uppercase mb-6">Resources</h4>
              <ul className={`space-y-4 text-sm ${current.textMuted}`}>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Fees & Limits</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-xs tracking-widest uppercase mb-6">Company</h4>
              <ul className={`space-y-4 text-sm ${current.textMuted}`}>
                <li><a href="#" className="hover:text-amber-500 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className={`pt-8 border-t flex flex-col md:flex-row justify-between items-center text-xs ${current.textMuted} ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
            <p>© 2026 Jasiri Capital Ltd. All rights reserved.</p>
            <div className="flex items-center mt-4 md:mt-0 text-emerald-500 font-medium">
              <ShieldCheck className="w-4 h-4 mr-2" />
              <span>Regulated and fully compliant.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}