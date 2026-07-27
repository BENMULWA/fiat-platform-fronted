// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    ArrowDown, ArrowUp, RefreshCw, Phone,
    DollarSign, Bitcoin, Hexagon, CircleDollarSign, Banknote, Coins, Radio
} from 'lucide-react';
import { getRetailWallet, getRampHistory } from '../../api/client';

// Shared Interface for all 15 supported assets
interface Balances {
    KES: number; USDA: number; USDT: number; USDC: number; USD: number;
    UGX: number; TZS: number; RWF: number; BIF: number; XAF: number; XOF: number;
    AIRT: number; IMP: number; BTC: number; ETH: number;
}

// 🟢 Flag helper function using a highly reliable open-source CDN
const getFlagUrl = (assetCode: string) => {
    const codeToIso: Record<string, string> = {
        'KES': 'ke',
        'UGX': 'ug',
        'TZS': 'tz',
        'RWF': 'rw',
        'BIF': 'bi',
        'XAF': 'cm', // Using Cameroon as representation for Central African CFA
        'XOF': 'sn', // Using Senegal as representation for West African CFA
        'USD': 'us'
    };
    const isoCode = codeToIso[assetCode];
    if (isoCode) {
        return `https://flagcdn.com/w40/${isoCode}.png`;
    }
    return null;
};

export default function WalletsPage() {
    const [balances, setBalances] = useState<Balances>({
        KES: 0, USDA: 0, USDT: 0, USDC: 0, USD: 0,
        UGX: 0, TZS: 0, RWF: 0, BIF: 0, XAF: 0, XOF: 0,
        AIRT: 0, IMP: 0, BTC: 0, ETH: 0
    });
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchWalletData = async () => {
            try {
                const [walletRes, txRes] = await Promise.allSettled([
                    getRetailWallet(),
                    getRampHistory()
                ]);

                if (!isMounted) return;

                if (walletRes.status === 'fulfilled' && walletRes.value.data?.balances) {
                    setBalances(prev => ({ ...prev, ...walletRes.value.data.balances }));
                }
                if (txRes.status === 'fulfilled' && txRes.value.data?.entries) {
                    setTransactions(txRes.value.data.entries);
                }
            } catch (error) {
                console.error("Fetch failed", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchWalletData();
        const interval = setInterval(fetchWalletData, 10000);
        return () => { isMounted = false; clearInterval(interval); };
    }, []);

    // 🟢 PROFESSIONAL ASSET DEFINITIONS WITH GRADIENTS
    const walletCards = [
        { id: 'KES', name: 'Kenyan Shilling', balance: balances.KES, type: 'fiat', gradient: 'from-emerald-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-emerald-500/30 hover:border-emerald-500/60', text: 'text-emerald-400' },
        { id: 'USDA', name: 'USDA Stablecoin', balance: balances.USDA, icon: DollarSign, type: 'crypto', gradient: 'from-amber-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-amber-500/30 hover:border-amber-500/60', text: 'text-amber-400' },
        { id: 'USDT', name: 'Tether (USDT)', balance: balances.USDT, icon: CircleDollarSign, type: 'crypto', gradient: 'from-blue-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-blue-500/30 hover:border-blue-500/60', text: 'text-blue-400' },
        { id: 'USDC', name: 'USD Coin (USDC)', balance: balances.USDC, icon: CircleDollarSign, type: 'crypto', gradient: 'from-indigo-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-indigo-500/30 hover:border-indigo-500/60', text: 'text-indigo-400' },
        { id: 'USD', name: 'US Dollar', balance: balances.USD, type: 'fiat', gradient: 'from-green-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-green-500/30 hover:border-green-500/60', text: 'text-green-400' },
        { id: 'UGX', name: 'Ugandan Shilling', balance: balances.UGX, type: 'fiat', gradient: 'from-yellow-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-yellow-500/30 hover:border-yellow-500/60', text: 'text-yellow-400' },
        { id: 'TZS', name: 'Tanzanian Shilling', balance: balances.TZS, type: 'fiat', gradient: 'from-sky-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-sky-500/30 hover:border-sky-500/60', text: 'text-sky-400' },
        { id: 'RWF', name: 'Rwandan Franc', balance: balances.RWF, type: 'fiat', gradient: 'from-teal-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-teal-500/30 hover:border-teal-500/60', text: 'text-teal-400' },
        { id: 'BIF', name: 'Burundian Franc', balance: balances.BIF, type: 'fiat', gradient: 'from-pink-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-pink-500/30 hover:border-pink-500/60', text: 'text-pink-400' },
        { id: 'XAF', name: 'Central African CFA', balance: balances.XAF, type: 'fiat', gradient: 'from-fuchsia-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-fuchsia-500/30 hover:border-fuchsia-500/60', text: 'text-fuchsia-400' },
        { id: 'XOF', name: 'West African CFA', balance: balances.XOF, type: 'fiat', gradient: 'from-cyan-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-cyan-500/30 hover:border-cyan-500/60', text: 'text-cyan-400' },
        { id: 'AIRT', name: 'Tokenized Airtime', balance: balances.AIRT, icon: Radio, type: 'synthetic', gradient: 'from-rose-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-rose-500/30 hover:border-rose-500/60', text: 'text-rose-400' },
        { id: 'IMP', name: 'Impala Coin', balance: balances.IMP, icon: Coins, type: 'synthetic', gradient: 'from-purple-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-purple-500/30 hover:border-purple-500/60', text: 'text-purple-400' },
        { id: 'BTC', name: 'Bitcoin', balance: balances.BTC, icon: Bitcoin, type: 'crypto', gradient: 'from-orange-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-orange-500/30 hover:border-orange-500/60', text: 'text-orange-400' },
        { id: 'ETH', name: 'Ethereum', balance: balances.ETH, icon: Hexagon, type: 'crypto', gradient: 'from-purple-400/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-purple-400/30 hover:border-purple-400/60', text: 'text-purple-300' },
    ];

    // --- Real-time EAT Timestamp Formatter ---
    const formatTimeEAT = (isoDate: string | null | undefined, fallbackAgo: string) => {
        if (!isoDate) return fallbackAgo || 'Recently';
        const d = new Date(isoDate);
        if (isNaN(d.getTime())) return fallbackAgo || 'Recently';

        return new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Africa/Nairobi',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }).format(d).replace(',', ' ·');
    };

    return (
        <div className={`max-w-7xl mx-auto space-y-8 transition-opacity duration-500 animate-in fade-in ${isLoading ? 'opacity-50' : 'opacity-100'}`}>

            {/* Page Title & Subtitle */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Your Multi-Currency Wallets</h1>
                    <p className="text-gray-400 text-sm mt-0.5">Track fiat balances, stablecoins, and synthetics across African corridors</p>
                </div>
            </div>

            {/* Professional Cards Grid with Gradients & Flags */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {walletCards.map((w) => {
                    const flagUrl = getFlagUrl(w.id);
                    const IconComponent = w.icon;

                    return (
                        <div key={w.id} className={`bg-gradient-to-br ${w.gradient} border ${w.border} rounded-2xl p-6 transition-all shadow-xl backdrop-blur-md group hover:-translate-y-0.5 duration-300`}>
                            <div className="flex justify-between items-start mb-6">

                                {/* ICON / FLAG RENDERING */}
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

            {/* Transaction History Sub-Panel */}
            <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl overflow-hidden mt-8 shadow-2xl">
                <div className="p-6 border-b border-[#1E2533] flex items-center justify-between">
                    <h2 className="text-base font-bold text-white tracking-wide">Multi-Asset Transaction History</h2>
                    <span className="text-xs text-gray-500 font-mono">Real-time ledger sync</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#1E2533] bg-[#0F1520]/60">
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-12"></th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E2533]/40">
                            {transactions.map((tx: any) => (
                                <tr key={tx.id} className="hover:bg-[#0F1520]/80 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${tx.direction === 'swap' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                            tx.direction === 'on' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                            }`}>
                                            {tx.direction === 'swap' ? <RefreshCw className="w-3.5 h-3.5" /> :
                                                tx.direction === 'on' ? <ArrowDown className="w-3.5 h-3.5" /> :
                                                    <ArrowUp className="w-3.5 h-3.5" />}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-sm font-bold text-white capitalize">
                                        {tx.direction === 'swap' ? 'Swap' : tx.direction === 'on' ? 'Deposit' : 'Withdrawal'}
                                    </td>
                                    <td className="py-4 px-6 text-xs text-gray-400 font-mono whitespace-nowrap">
                                        {/* 🟢 Apply precise EAT formatter here */}
                                        {formatTimeEAT(tx.createdAt, tx.timeAgo)}
                                    </td>
                                    <td className="py-4 px-6 text-right font-bold text-sm text-white font-mono">
                                        {tx.direction === 'swap'
                                            ? `${tx.fromAmount} ${tx.fromAsset} → ${tx.toAmount} ${tx.toAsset}`
                                            : `${tx.fromAmount} ${tx.fromAsset}`}
                                    </td>
                                    <td className="py-4 px-6 text-right flex justify-end">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide border ${tx.status?.toLowerCase() === 'pending' ? 'text-orange-500 bg-orange-500/10 border-orange-500/20' :
                                            tx.status?.toLowerCase() === 'failed' ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                            }`}>
                                            {tx.status || 'Completed'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center text-sm text-gray-500">
                                        No transactions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}