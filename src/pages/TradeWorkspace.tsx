// @ts-nocheck
import { useState, useEffect } from 'react'
import {
    ArrowRightLeft, History, ArrowDownRight, ArrowUpRight,
    Wallet, CheckCircle2, Clock, XCircle, CreditCard
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getRetailWallet, getRampHistory } from '../api/client'

export default function TraderWorkspace() {
    const navigate = useNavigate()
    const [balances, setBalances] = useState({ USDA: 0, KES: 0, IMP: 0 })
    const [history, setHistory] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    // In production, these rates should be fetched from the Oracle/Spread Engine
    const ratesToUsd = {
        USDA: 1.00,
        KES: 1 / 130.50, // Approx CBK rate
        IMP: 1.00
    }

    const fetchData = async () => {
        try {
            // Fetch live wallet balances & transaction history concurrently
            const [walletRes, historyRes] = await Promise.allSettled([
                getRetailWallet(),
                getRampHistory()
            ]);

            if (walletRes.status === 'fulfilled') {
                const data = walletRes.value.data;
                if (data && data.balances) setBalances(data.balances);
            }

            if (historyRes.status === 'fulfilled') {
                const data = historyRes.value.data;
                if (data && data.entries) setHistory(data.entries.slice(0, 5)); // Get top 5
            }
        } catch (error) {
            console.error("Failed to fetch retail data:", error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Live poll every 5s
        return () => clearInterval(interval);
    }, []);

    const totalUsdValue =
        (balances.USDA * ratesToUsd.USDA) +
        (balances.KES * ratesToUsd.KES) +
        (balances.IMP * ratesToUsd.IMP);

    const ASSET_CARDS = [
        { id: 'USDA', name: 'USDA Stablecoin', balance: balances.USDA, usdValue: balances.USDA * ratesToUsd.USDA, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
        { id: 'KES', name: 'Kenya Shillings', balance: balances.KES, usdValue: balances.KES * ratesToUsd.KES, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        { id: 'IMP', name: 'Impala Coin', balance: balances.IMP, usdValue: balances.IMP * ratesToUsd.IMP, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' }
    ];

    return (
        <div className={`max-w-6xl mx-auto animate-in fade-in duration-500 p-4 md:p-6 text-gray-200 transition-opacity ${isLoading ? 'opacity-50' : 'opacity-100'}`}>

            {/* 1. Header & Total Balance */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">My Wallet</h1>
                    <p className="text-slate-400 text-sm mt-1">Manage your balances and recent activity.</p>
                </div>

                <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 shadow-lg flex items-center gap-5 min-w-[280px]">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                        <Wallet className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Balance (USD)</p>
                        <p className="text-3xl font-bold text-white font-mono">${totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </div>

            {/* 2. Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button
                    onClick={() => navigate('/ramp?tab=deposit')}
                    className="bg-[#111827] hover:bg-[#1a2638] border border-[#1e2d3d] hover:border-emerald-500/50 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group"
                >
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowDownRight className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-white">Deposit</span>
                </button>

                <button
                    onClick={() => navigate('/trade')}
                    className="bg-blue-600 hover:bg-blue-500 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all shadow-lg shadow-blue-900/20 group border border-blue-500"
                >
                    <div className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowRightLeft className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-white">Quick Swap</span>
                </button>

                <button
                    onClick={() => navigate('/ramp?tab=withdraw')}
                    className="bg-[#111827] hover:bg-[#1a2638] border border-[#1e2d3d] hover:border-blue-500/50 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group"
                >
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowUpRight className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-white">Withdraw</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* 3. Asset Balances Grid */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-indigo-400" /> My Assets
                    </h2>

                    <div className="space-y-3">
                        {ASSET_CARDS.map((asset) => (
                            <div key={asset.id} className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 flex items-center justify-between hover:border-slate-600 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${asset.bg}`}>
                                        <span className={`text-xs font-bold ${asset.color}`}>{asset.id}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{asset.id}</p>
                                        <p className="text-[10px] text-slate-500">{asset.name}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-white font-mono">
                                        {asset.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-mono">≈ ${asset.usdValue.toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. Transaction History */}
                <div className="lg:col-span-2">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <History className="w-5 h-5 text-emerald-400" /> Recent Activity
                    </h2>

                    <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl overflow-hidden shadow-xl">
                        <div className="divide-y divide-[#1e2d3d]/50">
                            {history.map((tx: any) => {
                                const isCompleted = tx.status?.toLowerCase() === 'completed';
                                const isFailed = tx.status?.toLowerCase() === 'failed';
                                const isProcessing = tx.status?.toLowerCase() === 'processing' || (!isCompleted && !isFailed);

                                // Determine icon based on direction
                                let Icon = ArrowRightLeft;
                                let iconColor = 'text-orange-400';
                                let iconBg = 'bg-orange-500/10 border-orange-500/20';
                                let title = 'Swap';

                                if (tx.direction === 'on') {
                                    Icon = ArrowDownRight;
                                    iconColor = 'text-emerald-400';
                                    iconBg = 'bg-emerald-500/10 border-emerald-500/20';
                                    title = 'Deposit';
                                } else if (tx.direction === 'off') {
                                    Icon = ArrowUpRight;
                                    iconColor = 'text-blue-400';
                                    iconBg = 'bg-blue-500/10 border-blue-500/20';
                                    title = 'Withdraw';
                                }

                                return (
                                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-[#0d1420]/50 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${iconBg}`}>
                                                <Icon className={`w-5 h-5 ${iconColor}`} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{title}</p>
                                                <p className="text-xs font-mono text-gray-400 mt-0.5">
                                                    {tx.direction === 'swap'
                                                        ? `${tx.fromAmount} ${tx.fromAsset} → ${tx.toAmount.toFixed(2)} ${tx.toAsset}`
                                                        : tx.direction === 'on'
                                                            ? `+ ${tx.fromAmount} ${tx.fromAsset}`
                                                            : `- ${tx.fromAmount} ${tx.fromAsset}`
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right flex flex-col items-end">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider mb-1.5 ${isCompleted ? 'bg-emerald-500/10 text-emerald-400' :
                                                    isProcessing ? 'bg-yellow-500/10 text-yellow-400 animate-pulse' :
                                                        'bg-red-500/10 text-red-400'
                                                }`}>
                                                {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                                                {isProcessing && <Clock className="w-3 h-3" />}
                                                {isFailed && <XCircle className="w-3 h-3" />}
                                                {isProcessing ? 'PROCESSING' : tx.status}
                                            </span>
                                            <p className="text-[10px] text-slate-500">{tx.date || 'Today'} · {tx.timeAgo || 'Just now'}</p>
                                        </div>
                                    </div>
                                )
                            })}

                            {history.length === 0 && (
                                <div className="text-center py-12">
                                    <ArrowRightLeft className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-400 text-sm font-medium">No recent activity.</p>
                                </div>
                            )}
                        </div>

                        <button onClick={() => navigate('/trade')} className="w-full p-4 text-xs font-bold text-slate-400 hover:text-white bg-[#0d1420] hover:bg-[#1a2638] transition-colors border-t border-[#1e2d3d]">
                            View All Transactions →
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}