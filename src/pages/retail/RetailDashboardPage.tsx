import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowDown, ArrowUp, RefreshCw, Phone,
    DollarSign, Bitcoin, Hexagon, CircleDollarSign,
    ArrowRightLeft, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Balances {
    KES: number;
    USDA: number;
    USDT: number;
    USDC: number;
    BTC: number;
    ETH: number;
}

export default function RetailDashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate(); // Enables instant button routing

    const { walletBalances = {}, rampHistory = [] } = useAuth();
    const [isLoading] = useState(false);

    const balances = {
        KES: walletBalances?.KES || 0,
        USDA: walletBalances?.USDA || 0,
        USDT: walletBalances?.USDT || 0,
        USDC: walletBalances?.USDC || 0,
        BTC: walletBalances?.BTC || 0,
        ETH: walletBalances?.ETH || 0,
    } as Balances;
    const history = rampHistory || [];

    // Real-time updates are provided by AuthContext websocket; no polling necessary

    const totalPortfolioKES = (
        (balances.KES) +
        (balances.USDA * 130.50) +
        (balances.USDT * 130.50) +
        (balances.USDC * 130.50) +
        (balances.BTC * 64000 * 130.50) +
        (balances.ETH * 3500 * 130.50)
    );

    const walletCards = [
        { id: 'KES', name: 'KES Wallet', balance: balances.KES, icon: null, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
        { id: 'USDA', name: 'USDA Wallet', balance: balances.USDA, icon: DollarSign, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
        { id: 'USDT', name: 'USDT Wallet', balance: balances.USDT, icon: CircleDollarSign, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
        { id: 'USDC', name: 'USDC Wallet', balance: balances.USDC, icon: CircleDollarSign, color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
        { id: 'BTC', name: 'Bitcoin', balance: balances.BTC, icon: Bitcoin, color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
        { id: 'ETH', name: 'Ethereum', balance: balances.ETH, icon: Hexagon, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    ];

    return (
        <div className={`max-w-7xl mx-auto space-y-8 animate-in fade-in transition-opacity duration-500 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>

            {/* Welcome & Portfolio */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                        Welcome, {user?.name?.split(' ')[0] || 'Trader'}
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Here's your portfolio overview</p>
                </div>

                <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-6 shadow-xl min-w-[300px]">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Total Portfolio Value</p>
                    <div className="flex items-end gap-3">
                        <h2 className="text-4xl font-extrabold text-amber-500 font-mono tracking-tight flex items-baseline gap-2">
                            <span className="text-xl text-amber-500/80 mb-1">KES</span>
                            {totalPortfolioKES.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                    </div>
                </div>
            </div>

            {/* QUICK ACTIONS BAR (WITH REDIRECTS) */}
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

            {/* Wallets Grid */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Your Active Wallets</h3>
                    <button onClick={() => navigate('/wallets')} className="text-xs font-bold text-amber-500 hover:text-amber-400">View All →</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {walletCards.map((w) => (
                        <div key={w.id} className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-6 hover:border-gray-600 transition-colors shadow-lg">
                            <div className="flex justify-between items-start mb-5">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${w.color}`}>
                                    {w.icon ? <w.icon className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full bg-emerald-500" />}
                                </div>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{w.id}</span>
                            </div>
                            <p className="text-xs text-gray-400 font-medium mb-1">{w.name}</p>
                            <p className="text-2xl font-bold text-white font-mono">
                                {w.balance.toLocaleString(undefined, { minimumFractionDigits: w.id === 'BTC' || w.id === 'ETH' ? 4 : 2 })}
                                <span className="text-sm text-gray-500 ml-1.5">{w.id}</span>
                            </p>
                        </div>
                    ))}
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
                                        <p className="text-xs text-gray-500 mt-0.5">{tx.date || 'Today'} · {tx.timeAgo || 'Recently'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-white font-mono">
                                        {tx.direction === 'swap'
                                            ? `${tx.fromAmount} ${tx.fromAsset} → ${tx.toAmount} ${tx.toAsset}`
                                            : `${tx.direction === 'on' ? '+' : '-'}${tx.fromAmount} ${tx.fromAsset}`
                                        }
                                    </p>
                                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${tx.status?.toLowerCase() === 'failed' ? 'text-red-400' : tx.status?.toLowerCase() === 'pending' ? 'text-amber-400' : 'text-emerald-400'}`}>
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