// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowDown, ArrowUp, ArrowRight, RefreshCw,
    DollarSign, Bitcoin, Hexagon, CircleDollarSign, Coins, Radio, Eye, EyeOff, ChevronDown
} from 'lucide-react';
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

// Mirrors the active/coming-soon distinction TradePage's ASSETS list already
// makes (USDT/USDC/USDA/cUSD/KES/AIRT/USD are live; UGX/TZS/RWF/BIF/XAF/XOF/
// IMP are not). BTC and ETH aren't in that list at all — there's no deposit,
// swap, or withdraw path for them anywhere in the app — so they're treated
// as unsupported here too rather than shown as if they were real holdings.
// Ideally this list is defined once and imported wherever it's needed
// instead of duplicated per page; duplicating it is how the two pages drift
// out of sync with each other in the first place.
const SUPPORTED_ASSETS = new Set(['KES', 'USDT', 'USDC', 'USDA', 'cUSD', 'AIRT', 'USD']);

export default function WalletsPage() {
    const navigate = useNavigate();
    const [anchorCurrency, setAnchorCurrency] = useState<'KES' | 'USD'>('KES');
    const [hideBalances, setHideBalances] = useState(false);
    const [showAllAssets, setShowAllAssets] = useState(false);
    const [balances, setBalances] = useState<Balances>({
        KES: 0, USDA: 0, USDT: 0, USDC: 0, cUSD: 0, USD: 0,
        UGX: 0, TZS: 0, RWF: 0, BIF: 0, XAF: 0, XOF: 0,
        AIRT: 0, IMP: 0, BTC: 0, ETH: 0
    });
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // Full search/filter/pagination already lives on TransactionsPage — this
    // page only needs a teaser so it doesn't duplicate that page's job.
    const RECENT_ACTIVITY_COUNT = 5;

    useEffect(() => {
        let isMounted = true;
        const fetchWalletData = async () => {
            try {
                const [walletRes, txRes] = await Promise.allSettled([getRetailWallet(), getRampHistory()]);
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

    const usdBaseRates: Record<string, number> = {
        USDA: 1, USDC: 1, USDT: 1, cUSD: 1, USD: 1, IMP: 1,
        KES: 130.50, UGX: 3750.00, TZS: 2580.00, RWF: 1320.00,
        BIF: 2850.00, XAF: 605.00, XOF: 605.00, AIRT: 130.50,
        BTC: 1 / 64000, ETH: 1 / 3500
    };
    // Same rate table, just used to convert the USD total into KES for the
    // header toggle below — this is the piece that was missing before.
    const kesPerUsd = usdBaseRates.KES;

    const sortedWalletCards = useMemo(() => {
        // Per-currency color restored (this is what you originally had) —
        // each supported asset keeps its own identity color for the card
        // background/border/icon. Unsupported ("coming soon") assets stay
        // neutral regardless of the color assigned here, so a currency with
        // no real deposit/swap path still doesn't look as "live" as one you
        // actually hold — see the `supported` check at render time below.
        const cards = [
            { id: 'KES', name: 'Kenyan Shilling', balance: balances.KES, gradient: 'from-emerald-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-emerald-500/30 hover:border-emerald-500/60', text: 'text-emerald-400' },
            { id: 'USDA', name: 'USDA Stablecoin', balance: balances.USDA, icon: DollarSign, gradient: 'from-amber-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-amber-500/30 hover:border-amber-500/60', text: 'text-amber-400' },
            { id: 'USDT', name: 'Tether (USDT)', balance: balances.USDT, icon: CircleDollarSign, gradient: 'from-blue-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-blue-500/30 hover:border-blue-500/60', text: 'text-blue-400' },
            { id: 'USDC', name: 'USD Coin (USDC)', balance: balances.USDC, icon: CircleDollarSign, gradient: 'from-indigo-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-indigo-500/30 hover:border-indigo-500/60', text: 'text-indigo-400' },
            { id: 'cUSD', name: 'Celo Dollar', balance: balances.cUSD, icon: CircleDollarSign, gradient: 'from-green-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-green-500/30 hover:border-green-500/60', text: 'text-green-400' },
            { id: 'USD', name: 'US Dollar', balance: balances.USD, gradient: 'from-green-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-green-500/30 hover:border-green-500/60', text: 'text-green-400' },
            { id: 'UGX', name: 'Ugandan Shilling', balance: balances.UGX, gradient: 'from-yellow-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-yellow-500/30 hover:border-yellow-500/60', text: 'text-yellow-400' },
            { id: 'TZS', name: 'Tanzanian Shilling', balance: balances.TZS, gradient: 'from-sky-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-sky-500/30 hover:border-sky-500/60', text: 'text-sky-400' },
            { id: 'RWF', name: 'Rwandan Franc', balance: balances.RWF, gradient: 'from-teal-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-teal-500/30 hover:border-teal-500/60', text: 'text-teal-400' },
            { id: 'BIF', name: 'Burundian Franc', balance: balances.BIF, gradient: 'from-pink-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-pink-500/30 hover:border-pink-500/60', text: 'text-pink-400' },
            { id: 'XAF', name: 'Central African CFA', balance: balances.XAF, gradient: 'from-fuchsia-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-fuchsia-500/30 hover:border-fuchsia-500/60', text: 'text-fuchsia-400' },
            { id: 'XOF', name: 'West African CFA', balance: balances.XOF, gradient: 'from-cyan-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-cyan-500/30 hover:border-cyan-500/60', text: 'text-cyan-400' },
            { id: 'AIRT', name: 'Tokenized Airtime', balance: balances.AIRT, icon: Radio, gradient: 'from-rose-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-rose-500/30 hover:border-rose-500/60', text: 'text-rose-400' },
            { id: 'IMP', name: 'Impala Coin', balance: balances.IMP, icon: Coins, gradient: 'from-purple-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-purple-500/30 hover:border-purple-500/60', text: 'text-purple-400' },
            { id: 'BTC', name: 'Bitcoin', balance: balances.BTC, icon: Bitcoin, gradient: 'from-orange-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-orange-500/30 hover:border-orange-500/60', text: 'text-orange-400' },
            { id: 'ETH', name: 'Ethereum', balance: balances.ETH, icon: Hexagon, gradient: 'from-indigo-400/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-indigo-400/30 hover:border-indigo-400/60', text: 'text-indigo-300' },
        ];

        return cards
            .map(card => ({
                ...card,
                usdValue: card.balance / (usdBaseRates[card.id] || 1),
                supported: SUPPORTED_ASSETS.has(card.id),
            }))
            .sort((a, b) => b.usdValue - a.usdValue);
    }, [balances]);

    // Assets you actually hold surface first and always show; zero-balance
    // and not-yet-supported assets are tucked behind a toggle instead of
    // filling the grid at equal weight — a new user with two currencies
    // shouldn't have to scan past fourteen empty cards to find them.
    const heldCards = sortedWalletCards.filter(c => c.balance > 0);
    const otherCards = sortedWalletCards.filter(c => c.balance <= 0);
    const cardsToShow = heldCards.length > 0 ? (showAllAssets ? sortedWalletCards : heldCards) : sortedWalletCards;

    const totalUsdValue = useMemo(() => sortedWalletCards.reduce((sum, c) => sum + c.usdValue, 0), [sortedWalletCards]);
    const totalDisplayValue = anchorCurrency === 'USD' ? totalUsdValue : totalUsdValue * kesPerUsd;

    const formatTimeEAT = (isoDate: string | null | undefined, fallbackAgo: string) => {
        if (!isoDate) return fallbackAgo || 'Recently';
        const d = new Date(isoDate);
        if (isNaN(d.getTime())) return fallbackAgo || 'Recently';
        return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }).format(d).replace(',', ' ·');
    };

    return (
        <div className={`max-w-7xl mx-auto space-y-8 transition-opacity duration-500 animate-in fade-in ${isLoading ? 'opacity-50' : 'opacity-100'}`}>

            {/* Page Title */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Your Wallets</h1>
                    <p className="text-gray-400 text-sm mt-0.5">Track fiat balances, stablecoins, and synthetics across African corridors</p>
                </div>
            </div>

            {/* Total Balance header — anchors the page the way Binance/Coinbase lead
                with a single portfolio figure. The KES/USD toggle now actually does
                something; previously `anchorCurrency` was set once and never used. */}
            <div className="bg-gradient-to-br from-emerald-500/10 via-[#0B0E14] to-[#0B0E14] border border-emerald-500/20 rounded-2xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total balance</span>
                            <button
                                onClick={() => setHideBalances(h => !h)}
                                className="text-gray-500 hover:text-gray-300 transition-colors"
                                aria-label={hideBalances ? 'Show balances' : 'Hide balances'}
                            >
                                {hideBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        <p className="text-4xl font-extrabold text-white font-mono tracking-tight">
                            {hideBalances
                                ? '***'
                                : anchorCurrency === 'USD'
                                    ? `$${totalDisplayValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    : `KES ${totalDisplayValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Across {sortedWalletCards.filter(c => c.supported).length} supported assets</p>
                    </div>

                    <div className="flex items-center gap-1 bg-[#0B0E14] border border-[#1E2533] rounded-lg p-1 shrink-0">
                        {(['KES', 'USD'] as const).map(cur => (
                            <button
                                key={cur}
                                onClick={() => setAnchorCurrency(cur)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${anchorCurrency === cur ? 'bg-emerald-500 text-slate-950' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                {cur}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Asset Cards — single accent (emerald) for supported assets you hold,
                neutral slate for everything else, differentiated by icon/flag and
                name rather than by a different border hue per currency. */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                        {heldCards.length > 0 && !showAllAssets ? 'Your assets' : 'All assets'}
                    </h2>
                    {heldCards.length > 0 && (
                        <button
                            onClick={() => setShowAllAssets(s => !s)}
                            className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            {showAllAssets ? 'Show only assets I hold' : `Show ${otherCards.length} more assets`}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllAssets ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {cardsToShow.map((w) => {
                        const flagUrl = getFlagUrl(w.id);
                        const IconComponent = w.icon;
                        const isCrypto = ['BTC', 'ETH', 'USDC', 'USDT', 'cUSD', 'USDA', 'IMP'].includes(w.id);
                        const isEmpty = w.balance <= 0;

                        return (
                            <div
                                key={w.id}
                                className={`relative rounded-2xl p-6 transition-all duration-300 border ${
                                    w.supported
                                        ? `bg-gradient-to-br ${w.gradient} ${w.border} shadow-xl`
                                        : 'bg-[#0B0E14]/60 border-[#1E2533]/60'
                                } ${isEmpty ? 'opacity-70' : ''} group hover:-translate-y-0.5`}
                            >
                                {!w.supported && (
                                    <span className="absolute top-4 right-4 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/5 px-2 py-0.5 rounded-md">
                                        Coming soon
                                    </span>
                                )}
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#0F1520]/80 border border-[#1E2533] shadow-inner overflow-hidden p-2">
                                        {flagUrl ? (
                                            <img src={flagUrl} alt={`${w.id} flag`} className="w-8 h-6 object-cover rounded shadow" />
                                        ) : IconComponent ? (
                                            <IconComponent className={`w-6 h-6 ${w.supported ? w.text : 'text-gray-500'}`} />
                                        ) : (
                                            <div className={`w-6 h-6 rounded-full ${w.supported ? 'bg-emerald-500' : 'bg-gray-600'} shadow-md`} />
                                        )}
                                    </div>
                                    {w.supported && (
                                        <span className="text-xs font-extrabold text-white uppercase tracking-widest bg-[#0F1520] px-2.5 py-1 rounded-lg border border-[#1E2533]">
                                            {w.id}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 font-semibold tracking-wide mb-1">{w.name}</p>
                                <p className={`text-3xl font-extrabold text-white font-mono tracking-tight transition-colors ${w.supported ? `group-hover:${w.text}` : ''}`}>
                                    {hideBalances ? '***' : w.balance.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: isCrypto ? 4 : 2
                                    })}
                                </p>
                                <p className="text-[10px] text-gray-500 font-mono mt-1">
                                    {hideBalances ? '≈ ***' : `≈ $${w.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Recent Activity teaser — the full searchable/filterable/paginated
                ledger already lives on TransactionsPage; duplicating that here
                added nothing but a second, less capable copy of the same data.
                This stays scoped to what a wallets page should show: a quick
                glance at what just happened, with a link to the real thing. */}
            <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl overflow-hidden mt-8 shadow-2xl">
                <div className="p-6 border-b border-[#1E2533] flex items-center justify-between">
                    <h2 className="text-base font-bold text-white tracking-wide">Recent Activity</h2>
                    <button
                        onClick={() => navigate('/transactions')}
                        className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        View all <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
                <div className="divide-y divide-[#1E2533]/40">
                    {transactions.slice(0, RECENT_ACTIVITY_COUNT).map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#0F1520]/80 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 ${tx.direction === 'swap' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                    tx.direction === 'on' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                    }`}>
                                    {tx.direction === 'swap' ? <RefreshCw className="w-3.5 h-3.5" /> :
                                        tx.direction === 'on' ? <ArrowDown className="w-3.5 h-3.5" /> :
                                            <ArrowUp className="w-3.5 h-3.5" />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">
                                        {tx.direction === 'swap' ? 'Swap' : tx.direction === 'on' ? 'Deposit' : 'Withdrawal'}
                                    </p>
                                    <p className="text-[11px] text-gray-500 font-mono">{formatTimeEAT(tx.createdAt, tx.timeAgo)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-white font-mono">
                                    {tx.direction === 'swap'
                                        ? `${tx.fromAmount} ${tx.fromAsset} → ${tx.toAmount} ${tx.toAsset}`
                                        : `${tx.fromAmount} ${tx.fromAsset}`}
                                </p>
                                <span className={`text-[10px] font-bold uppercase tracking-wide ${tx.status?.toLowerCase() === 'pending' ? 'text-orange-500' :
                                    tx.status?.toLowerCase() === 'failed' ? 'text-red-400' : 'text-emerald-400'
                                    }`}>
                                    {tx.status || 'Completed'}
                                </span>
                            </div>
                        </div>
                    ))}
                    {transactions.length === 0 && (
                        <div className="py-16 text-center text-sm text-gray-500">No transactions found.</div>
                    )}
                </div>
            </div>
        </div>
    );
}