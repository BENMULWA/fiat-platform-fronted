import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowDown, ArrowUp, RefreshCw, Phone,
    DollarSign, Bitcoin, Hexagon, CircleDollarSign,
    ArrowRightLeft, ArrowDownRight, ArrowUpRight
} from 'lucide-react';


import { useAuth } from '../../contexts/AuthContext';
import { getRetailWallet, getRampHistory } from '../../api/client';

interface Balances {
    KES: number; USDA: number; USDT: number; USDC: number; BTC: number; ETH: number;
}

export default function RetailDashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [balances, setBalances] = useState<Balances>({
        KES: 0, USDA: 0, USDT: 0, USDC: 0, BTC: 0, ETH: 0
    });
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [walletRes, historyRes] = await Promise.allSettled([
                    getRetailWallet(),
                    getRampHistory()
                ]);

                if (walletRes.status === 'fulfilled' && walletRes.value.data?.balances) {
                    setBalances(prev => ({ ...prev, ...walletRes.value.data.balances }));
                }

                if (historyRes.status === 'fulfilled' && historyRes.value.data?.entries) {
                    setHistory(historyRes.value.data.entries.slice(0, 5));
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 10000);
        return () => clearInterval(interval);
    }, []);

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
        <div className={`max-w-7xl mx-auto space-y-8 transition-opacity duration-500 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>

            {/* Welcome & Portfolio */}
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                        Welcome, {user?.name?.split(' ')[0] || 'Trader'}
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Here's your portfolio overview</p>
                </div>

                <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-6 md:p-8 max-w-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Portfolio Value</p>
                    <div className="flex items-end gap-4 relative z-10">
                        <h2 className="text-4xl md:text-5xl font-extrabold text-amber-500 font-mono tracking-tight">
                            <span className="text-2xl mr-2 text-amber-500/80">KES</span>
                            {totalPortfolioKES.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                    </div>
                </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <button onClick={() => navigate('/deposit')} className="flex items-center justify-center gap-2 py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-amber-500/10">
                    <ArrowDown className="w-4 h-4" /> Deposit
                </button>
                <button onClick={() => navigate('/withdraw')} className="flex items-center justify-center gap-2 py-4 bg-[#0F1520] border border-[#1E2533] hover:bg-[#172130] hover:border-amber-500/30 text-gray-300 hover:text-white font-bold rounded-xl transition-all">
                    <ArrowUp className="w-4 h-4" /> Withdraw
                </button>
                <button onClick={() => navigate('/swap')} className="flex items-center justify-center gap-2 py-4 bg-[#0F1520] border border-[#1E2533] hover:bg-[#172130] hover:border-amber-500/30 text-gray-300 hover:text-white font-bold rounded-xl transition-all">
                    <RefreshCw className="w-4 h-4" /> Swap
                </button>
                <button onClick={() => navigate('/redeem-airtime')} className="flex items-center justify-center gap-2 py-4 bg-[#0F1520] border border-[#1E2533] hover:bg-[#172130] hover:border-amber-500/30 text-gray-300 hover:text-white font-bold rounded-xl transition-all">
                    <Phone className="w-4 h-4" /> Redeem Airtime
                </button>
            </div>

            {/* Wallets Grid */}
            <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Your Wallets</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {walletCards.map((w) => (
                        <div key={w.id} className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-5 hover:border-amber-500/30 transition-colors group">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${w.color}`}>
                                    {w.icon ? <w.icon className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full bg-emerald-500" />}
                                </div>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{w.id}</span>
                            </div>
                            <p className="text-xs text-gray-400 font-medium mb-1">{w.name}</p>
                            <p className="text-2xl font-bold text-white font-mono group-hover:text-amber-500 transition-colors">
                                {w.balance.toLocaleString(undefined, { minimumFractionDigits: w.id === 'BTC' || w.id === 'ETH' ? 4 : 0 })}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Activity */}
            <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Recent Activity</h3>
                <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl overflow-hidden shadow-lg">
                    <div className="divide-y divide-[#1E2533]/50">
                        {history.length > 0 ? history.map((tx: any) => (
                            <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-[#0F1520] transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${tx.direction === 'swap' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                            tx.direction === 'on' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                        }`}>
                                        {tx.direction === 'swap' ? <ArrowRightLeft className="w-4 h-4" /> :
                                            tx.direction === 'on' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white capitalize">{tx.direction === 'on' ? 'Deposit' : tx.direction === 'off' ? 'Withdrawal' : 'Swap'}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{tx.timeAgo || 'Recently'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-white font-mono">
                                        {tx.direction === 'swap'
                                            ? `${tx.fromAmount} ${tx.fromAsset} → ${tx.toAmount} ${tx.toAsset}`
                                            : `${tx.direction === 'on' ? '+' : '-'}${tx.fromAmount} ${tx.fromAsset}`
                                        }
                                    </p>
                                </div>
                            </div>
                        )) : (
                            <div className="p-8 text-center text-gray-500 text-sm font-medium">No recent activity detected.</div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}