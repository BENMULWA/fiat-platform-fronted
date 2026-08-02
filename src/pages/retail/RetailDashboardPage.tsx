// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown, ArrowUp, RefreshCw, Phone,
  DollarSign, Bitcoin, Hexagon, CircleDollarSign,
  ArrowRightLeft, ArrowDownRight, ArrowUpRight, CheckCircle2,
  Wallet, Radio
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getRetailWallet, getRampHistory } from '../../api/client';

interface Balances {
  KES: number; USDA: number; USDT: number; USDC: number; cUSD: number; USD: number;
  UGX: number; TZS: number; RWF: number; BIF: number; XAF: number; XOF: number;
  AIRT: number; IMP: number; BTC: number; ETH: number;
}

const getFlagUrl = (assetCode: string) => {
  const codeToIso: Record<string, string> = {
    'KES': 'ke', 'UGX': 'ug', 'TZS': 'tz', 'RWF': 'rw',
    'BIF': 'bi', 'XAF': 'cm', 'XOF': 'sn', 'USD': 'us'
  };
  const isoCode = codeToIso[assetCode];
  if (isoCode) return `https://flagcdn.com/w40/${isoCode}.png`;
  return null;
};

export default function RetailDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [anchorCurrency, setAnchorCurrency] = useState<'KES' | 'USD'>('KES');
  const [balances, setBalances] = useState<Balances>({
    KES: 0, USDA: 0, USDT: 0, USDC: 0, cUSD: 0, USD: 0,
    UGX: 0, TZS: 0, RWF: 0, BIF: 0, XAF: 0, XOF: 0,
    AIRT: 0, IMP: 0, BTC: 0, ETH: 0
  });
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [webhookToast, setWebhookToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      try {
        const [walletRes, historyRes] = await Promise.allSettled([
          getRetailWallet(),
          getRampHistory()
        ]);

        if (!isMounted) return;

        if (walletRes.status === 'fulfilled' && walletRes.value.data?.balances) {
          setBalances(prev => ({ ...prev, ...walletRes.value.data.balances }));
        }

        if (historyRes.status === 'fulfilled' && historyRes.value.data?.entries) {
          const newEntries = historyRes.value.data.entries.slice(0, 5);
          setHistory(newEntries);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const usdBaseRates: Record<string, number> = {
    USDA: 1, USDC: 1, USDT: 1, cUSD: 1, USD: 1, IMP: 1,
    KES: 130.50, UGX: 3750.00, TZS: 2580.00, RWF: 1320.00,
    BIF: 2850.00, XAF: 605.00, XOF: 605.00, AIRT: 130.50,
    BTC: 1 / 64000, ETH: 1 / 3500
  };

  const totalPortfolioValue = useMemo(() => {
    let totalUsd = 0;
    Object.keys(balances).forEach((key) => {
      const balance = balances[key as keyof Balances] || 0;
      const rateToUsd = usdBaseRates[key] || 1;
      totalUsd += (balance / rateToUsd);
    });
    return anchorCurrency === 'KES' ? totalUsd * usdBaseRates.KES : totalUsd;
  }, [balances, anchorCurrency]);

  const sortedWalletCards = useMemo(() => {
    const cards = [
      { id: 'KES', name: 'Kenyan Shilling', balance: balances.KES, gradient: 'from-emerald-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-emerald-500/30', text: 'text-emerald-400' },
      { id: 'USDA', name: 'USDA Stablecoin', balance: balances.USDA, icon: DollarSign, gradient: 'from-amber-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-amber-500/30', text: 'text-amber-400' },
      { id: 'USDT', name: 'Tether (USDT)', balance: balances.USDT, icon: CircleDollarSign, gradient: 'from-blue-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-blue-500/30', text: 'text-blue-400' },
      { id: 'USDC', name: 'USD Coin (USDC)', balance: balances.USDC, icon: CircleDollarSign, gradient: 'from-indigo-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-indigo-500/30', text: 'text-indigo-400' },
      { id: 'cUSD', name: 'Celo Dollar (cUSD)', balance: balances.cUSD, icon: CircleDollarSign, gradient: 'from-green-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-green-500/30', text: 'text-green-400' },
      { id: 'UGX', name: 'Ugandan Shilling', balance: balances.UGX, gradient: 'from-yellow-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-yellow-500/30', text: 'text-yellow-400' },
      { id: 'AIRT', name: 'Tokenized Airtime', balance: balances.AIRT, icon: Radio, gradient: 'from-rose-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-rose-500/30', text: 'text-rose-400' },
      { id: 'BTC', name: 'Bitcoin', balance: balances.BTC, icon: Bitcoin, gradient: 'from-orange-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-orange-500/30', text: 'text-orange-400' },
    ];

    // Auto-sort by highest USD equivalent value
    return cards.map(card => ({
      ...card,
      usdValue: card.balance / (usdBaseRates[card.id] || 1)
    })).sort((a, b) => b.usdValue - a.usdValue).slice(0, 6); // Take top 6 for preview
  }, [balances]);

  const formatTimeEAT = (isoDate: string | null | undefined, fallbackAgo: string) => {
    if (!isoDate) return fallbackAgo || 'Recently';
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return fallbackAgo || 'Recently';
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }).format(d).replace(',', ' ·');
  };

  return (
    <div className={`max-w-7xl mx-auto space-y-8 animate-in fade-in transition-opacity duration-500 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>

      {webhookToast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 font-bold border ${webhookToast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${webhookToast.type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span>{webhookToast.message}</span>
        </div>
      )}

      {/* Welcome & Portfolio */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Welcome, {user?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">Here's your portfolio overview</p>
        </div>

        {/* ANCHOR CURRENCY TOGGLE IN PORTFOLIO CARD */}
        <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-6 shadow-xl min-w-[300px]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Portfolio Value</p>
            <div className="flex bg-[#111827] border border-[#1E2533] p-1 rounded-lg">
              <button onClick={() => setAnchorCurrency('KES')} className={`text-[10px] font-bold px-3 py-1 rounded transition-colors ${anchorCurrency === 'KES' ? 'bg-[#1E2533] text-white' : 'text-gray-500 hover:text-gray-300'}`}>KES</button>
              <button onClick={() => setAnchorCurrency('USD')} className={`text-[10px] font-bold px-3 py-1 rounded transition-colors ${anchorCurrency === 'USD' ? 'bg-[#1E2533] text-white' : 'text-gray-500 hover:text-gray-300'}`}>USD</button>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <h2 className="text-4xl font-extrabold text-amber-500 font-mono tracking-tight flex items-baseline gap-2">
              <span className="text-xl text-amber-500/80 mb-1">{anchorCurrency}</span>
              {totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <button onClick={() => navigate('/deposit')} className="flex items-center justify-center gap-2 py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-amber-500/10 active:scale-[0.98]">
          <ArrowDown className="w-4 h-4" /> Deposit
        </button>
        <button onClick={() => navigate('/withdraw')} className="flex items-center justify-center gap-2 py-4 bg-[#0F1520] border border-[#1E2533] hover:bg-[#172130] hover:border-amber-500/30 text-gray-300 hover:text-white font-bold rounded-xl transition-all active:scale-[0.98]">
          <ArrowUp className="w-4 h-4" /> Withdraw
        </button>
        <button onClick={() => navigate('/swap')} className="flex items-center justify-center gap-2 py-4 bg-[#0F1520] border border-[#1E2533] hover:bg-[#172130] hover:border-amber-500/30 text-gray-300 hover:text-white font-bold rounded-xl transition-all active:scale-[0.98]">
          <RefreshCw className="w-4 h-4" /> Swap
        </button>
        <button onClick={() => navigate('/redeem-airtime')} className="flex items-center justify-center gap-2 py-4 bg-[#0F1520] border border-[#1E2533] hover:bg-[#172130] hover:border-amber-500/30 text-gray-300 hover:text-white font-bold rounded-xl transition-all active:scale-[0.98]">
          <Phone className="w-4 h-4" /> Redeem Airtime
        </button>
      </div>

      {/* Wallets Grid Preview (Auto-Sorted) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Your Active Wallets</h3>
          <button onClick={() => navigate('/wallets')} className="text-xs font-bold text-amber-500 hover:text-amber-400">View All →</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedWalletCards.map((w) => {
            const flagUrl = getFlagUrl(w.id);
            const IconComponent = w.icon;

            return (
              <div key={w.id} className={`bg-gradient-to-br ${w.gradient} border ${w.border} hover:border-opacity-60 rounded-2xl p-6 transition-all shadow-xl backdrop-blur-md group hover:-translate-y-0.5 duration-300`}>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#0F1520]/80 border border-[#1E2533] shadow-inner overflow-hidden p-2">
                    {flagUrl ? (
                      <img src={flagUrl} alt={`${w.id} flag`} className="w-8 h-6 object-cover rounded shadow" />
                    ) : IconComponent ? (
                      <IconComponent className={`w-6 h-6 ${w.text}`} />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 shadow-md" />
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-white uppercase tracking-widest bg-[#0F1520] px-2.5 py-1 rounded-lg border border-[#1E2533]">
                      {w.id}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 font-semibold tracking-wide mb-1">{w.name}</p>
                <p className="text-3xl font-extrabold text-white font-mono tracking-tight group-hover:text-amber-400 transition-colors">
                  {w.balance.toLocaleString(undefined, {
                    minimumFractionDigits: w.id === 'BTC' || w.id === 'ETH' ? 4 : 2,
                    maximumFractionDigits: w.id === 'BTC' || w.id === 'ETH' ? 4 : 2
                  })}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recent Activity</h3>
          <button onClick={() => navigate('/transactions')} className="text-xs font-bold text-amber-500 hover:text-amber-400">Ledger →</button>
        </div>
        <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl overflow-hidden shadow-xl">
          <div className="divide-y divide-[#1E2533]/50">
            {history.length > 0 ? history.map((tx: any) => (
              <div key={tx.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-[#0F1520] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${tx.direction === 'swap' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      tx.direction === 'on' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                    }`}>
                    {tx.direction === 'swap' ? <ArrowRightLeft className="w-4 h-4" /> :
                      tx.direction === 'on' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white capitalize">{tx.direction === 'on' ? 'Deposit' : tx.direction === 'off' ? 'Withdrawal' : 'Swap'}</p>
                    <p className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">
                      {formatTimeEAT(tx.createdAt, tx.timeAgo)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white font-mono">
                    {tx.direction === 'swap'
                      ? `${tx.fromAmount} ${tx.fromAsset} → ${tx.toAmount} ${tx.toAsset}`
                      : `${tx.direction === 'on' ? '+' : '-'}${tx.fromAmount} ${tx.fromAsset}`
                    }
                  </p>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${tx.status?.toLowerCase() === 'failed' ? 'text-red-400' : tx.status?.toLowerCase() === 'pending' || tx.status?.toLowerCase() === 'processing' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {tx.status || 'Completed'}
                  </p>
                </div>
              </div>
            )) : (
              <div className="p-10 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-[#0F1520] flex items-center justify-center mb-3">
                  <RefreshCw className="w-5 h-5 text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-400">No recent activity detected.</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}