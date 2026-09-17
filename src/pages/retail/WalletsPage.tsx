// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowDown, ArrowUp, ArrowRight, RefreshCw,
    DollarSign, Bitcoin, Hexagon, CircleDollarSign, Coins, Radio, Eye, EyeOff, ChevronDown
} from 'lucide-react';
import { getRetailWallet, getRampHistory } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';

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
    const { theme } = useTheme();
    const isLight = theme === 'light';
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
        // Tailwind's JIT scanner needs full literal class strings, so every
        // color gets both a dark and a light variant spelled out here rather
        // than built with template interpolation.
        const walletColors = isLight ? {
            emerald: { gradient: 'from-emerald-50 via-white to-white', border: 'border-emerald-200 hover:border-emerald-300', text: 'text-emerald-600' },
            amber: { gradient: 'from-amber-50 via-white to-white', border: 'border-amber-200 hover:border-amber-300', text: 'text-amber-600' },
            blue: { gradient: 'from-blue-50 via-white to-white', border: 'border-blue-200 hover:border-blue-300', text: 'text-blue-600' },
            indigo: { gradient: 'from-indigo-50 via-white to-white', border: 'border-indigo-200 hover:border-indigo-300', text: 'text-indigo-600' },
            green: { gradient: 'from-green-50 via-white to-white', border: 'border-green-200 hover:border-green-300', text: 'text-green-600' },
            yellow: { gradient: 'from-yellow-50 via-white to-white', border: 'border-yellow-200 hover:border-yellow-300', text: 'text-yellow-600' },
            sky: { gradient: 'from-sky-50 via-white to-white', border: 'border-sky-200 hover:border-sky-300', text: 'text-sky-600' },
            teal: { gradient: 'from-teal-50 via-white to-white', border: 'border-teal-200 hover:border-teal-300', text: 'text-teal-600' },
            pink: { gradient: 'from-pink-50 via-white to-white', border: 'border-pink-200 hover:border-pink-300', text: 'text-pink-600' },
            fuchsia: { gradient: 'from-fuchsia-50 via-white to-white', border: 'border-fuchsia-200 hover:border-fuchsia-300', text: 'text-fuchsia-600' },
            cyan: { gradient: 'from-cyan-50 via-white to-white', border: 'border-cyan-200 hover:border-cyan-300', text: 'text-cyan-600' },
            rose: { gradient: 'from-rose-50 via-white to-white', border: 'border-rose-200 hover:border-rose-300', text: 'text-rose-600' },
            purple: { gradient: 'from-purple-50 via-white to-white', border: 'border-purple-200 hover:border-purple-300', text: 'text-purple-600' },
            orange: { gradient: 'from-orange-50 via-white to-white', border: 'border-orange-200 hover:border-orange-300', text: 'text-orange-600' },
            indigoLight: { gradient: 'from-indigo-50 via-white to-white', border: 'border-indigo-100 hover:border-indigo-200', text: 'text-indigo-500' },
        } : {
            emerald: { gradient: 'from-emerald-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-emerald-500/30 hover:border-emerald-500/60', text: 'text-emerald-400' },
            amber: { gradient: 'from-amber-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-amber-500/30 hover:border-amber-500/60', text: 'text-amber-400' },
            blue: { gradient: 'from-blue-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-blue-500/30 hover:border-blue-500/60', text: 'text-blue-400' },
            indigo: { gradient: 'from-indigo-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-indigo-500/30 hover:border-indigo-500/60', text: 'text-indigo-400' },
            green: { gradient: 'from-green-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-green-500/30 hover:border-green-500/60', text: 'text-green-400' },
            yellow: { gradient: 'from-yellow-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-yellow-500/30 hover:border-yellow-500/60', text: 'text-yellow-400' },
            sky: { gradient: 'from-sky-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-sky-500/30 hover:border-sky-500/60', text: 'text-sky-400' },
            teal: { gradient: 'from-teal-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-teal-500/30 hover:border-teal-500/60', text: 'text-teal-400' },
            pink: { gradient: 'from-pink-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-pink-500/30 hover:border-pink-500/60', text: 'text-pink-400' },
            fuchsia: { gradient: 'from-fuchsia-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-fuchsia-500/30 hover:border-fuchsia-500/60', text: 'text-fuchsia-400' },
            cyan: { gradient: 'from-cyan-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-cyan-500/30 hover:border-cyan-500/60', text: 'text-cyan-400' },
            rose: { gradient: 'from-rose-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-rose-500/30 hover:border-rose-500/60', text: 'text-rose-400' },
            purple: { gradient: 'from-purple-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-purple-500/30 hover:border-purple-500/60', text: 'text-purple-400' },
            orange: { gradient: 'from-orange-500/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-orange-500/30 hover:border-orange-500/60', text: 'text-orange-400' },
            indigoLight: { gradient: 'from-indigo-400/10 via-[#0B0E14] to-[#0B0E14]', border: 'border-indigo-400/30 hover:border-indigo-400/60', text: 'text-indigo-300' },
        };

        const cards = [
            { id: 'KES', name: 'Kenyan Shilling', balance: balances.KES, ...walletColors.emerald },
            { id: 'USDA', name: 'USDA Stablecoin', balance: balances.USDA, icon: DollarSign, ...walletColors.amber },
            { id: 'USDT', name: 'Tether (USDT)', balance: balances.USDT, icon: CircleDollarSign, ...walletColors.blue },
            { id: 'USDC', name: 'USD Coin (USDC)', balance: balances.USDC, icon: CircleDollarSign, ...walletColors.indigo },
            { id: 'cUSD', name: 'Celo Dollar', balance: balances.cUSD, icon: CircleDollarSign, ...walletColors.green },
            { id: 'USD', name: 'US Dollar', balance: balances.USD, ...walletColors.green },
            { id: 'UGX', name: 'Ugandan Shilling', balance: balances.UGX, ...walletColors.yellow },
            { id: 'TZS', name: 'Tanzanian Shilling', balance: balances.TZS, ...walletColors.sky },
            { id: 'RWF', name: 'Rwandan Franc', balance: balances.RWF, ...walletColors.teal },
            { id: 'BIF', name: 'Burundian Franc', balance: balances.BIF, ...walletColors.pink },
            { id: 'XAF', name: 'Central African CFA', balance: balances.XAF, ...walletColors.fuchsia },
            { id: 'XOF', name: 'West African CFA', balance: balances.XOF, ...walletColors.cyan },
            { id: 'AIRT', name: 'Tokenized Airtime', balance: balances.AIRT, icon: Radio, ...walletColors.rose },
            { id: 'IMP', name: 'Impala Coin', balance: balances.IMP, icon: Coins, ...walletColors.purple },
            { id: 'BTC', name: 'Bitcoin', balance: balances.BTC, icon: Bitcoin, ...walletColors.orange },
            { id: 'ETH', name: 'Ethereum', balance: balances.ETH, icon: Hexagon, ...walletColors.indigoLight },
        ];

        return cards
            .map(card => ({
                ...card,
                usdValue: card.balance / (usdBaseRates[card.id] || 1),
                supported: SUPPORTED_ASSETS.has(card.id),
            }))
            .sort((a, b) => b.usdValue - a.usdValue);
    }, [balances, isLight]);

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
                    <h1 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Your Wallets</h1>
                    <p className={`text-sm mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Track fiat balances, stablecoins, and synthetics across African corridors</p>
                </div>
            </div>

            {/* Total Balance header — anchors the page the way Binance/Coinbase lead
                with a single portfolio figure. The KES/USD toggle now actually does
                something; previously `anchorCurrency` was set once and never used. */}
            <div className={`bg-gradient-to-br border rounded-2xl p-6 sm:p-8 ${isLight ? 'from-emerald-50 via-white to-white border-emerald-200' : 'from-emerald-500/10 via-[#0B0E14] to-[#0B0E14] border-emerald-500/20'}`}>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-bold uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Total balance</span>
                            <button
                                onClick={() => setHideBalances(h => !h)}
                                className={`transition-colors ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-gray-500 hover:text-gray-300'}`}
                                aria-label={hideBalances ? 'Show balances' : 'Hide balances'}
                            >
                                {hideBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        <p className={`text-4xl font-extrabold font-mono tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {hideBalances
                                ? '***'
                                : anchorCurrency === 'USD'
                                    ? `$${totalDisplayValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    : `KES ${totalDisplayValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </p>
                        <p className={`text-xs mt-1 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Across {sortedWalletCards.filter(c => c.supported).length} supported assets</p>
                    </div>

                    <div className={`flex items-center gap-1 border rounded-lg p-1 shrink-0 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0B0E14] border-[#1E2533]'}`}>
                        {(['KES', 'USD'] as const).map(cur => (
                            <button
                                key={cur}
                                onClick={() => setAnchorCurrency(cur)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${anchorCurrency === cur ? 'bg-emerald-500 text-slate-950' : isLight ? 'text-slate-500 hover:text-slate-700' : 'text-gray-400 hover:text-gray-200'}`}
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
                    <h2 className={`text-sm font-bold uppercase tracking-wide ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                        {heldCards.length > 0 && !showAllAssets ? 'Your assets' : 'All assets'}
                    </h2>
                    {heldCards.length > 0 && (
                        <button
                            onClick={() => setShowAllAssets(s => !s)}
                            className="flex items-center gap-1 text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors"
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
                                        : isLight ? 'bg-slate-50/60 border-slate-200/80' : 'bg-[#0B0E14]/60 border-[#1E2533]/60'
                                } ${isEmpty ? 'opacity-70' : ''} group hover:-translate-y-0.5`}
                            >
                                {!w.supported && (
                                    <span className={`absolute top-4 right-4 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${isLight ? 'text-slate-400 bg-slate-900/5' : 'text-gray-500 bg-white/5'}`}>
                                        Coming soon
                                    </span>
                                )}
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner overflow-hidden p-2 border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520]/80 border-[#1E2533]'}`}>
                                        {flagUrl ? (
                                            <img src={flagUrl} alt={`${w.id} flag`} className="w-8 h-6 object-cover rounded shadow" />
                                        ) : IconComponent ? (
                                            <IconComponent className={`w-6 h-6 ${w.supported ? w.text : isLight ? 'text-slate-400' : 'text-gray-500'}`} />
                                        ) : (
                                            <div className={`w-6 h-6 rounded-full ${w.supported ? 'bg-emerald-500' : isLight ? 'bg-slate-300' : 'bg-gray-600'} shadow-md`} />
                                        )}
                                    </div>
                                    {w.supported && (
                                        <span className={`text-xs font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${isLight ? 'text-slate-900 bg-white border-slate-200' : 'text-white bg-[#0F1520] border-[#1E2533]'}`}>
                                            {w.id}
                                        </span>
                                    )}
                                </div>
                                <p className={`text-xs font-semibold tracking-wide mb-1 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{w.name}</p>
                                <p className={`text-3xl font-extrabold font-mono tracking-tight transition-colors ${isLight ? 'text-slate-900' : 'text-white'} ${w.supported ? `group-hover:${w.text}` : ''}`}>
                                    {hideBalances ? '***' : w.balance.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: isCrypto ? 4 : 2
                                    })}
                                </p>
                                <p className={`text-[10px] font-mono mt-1 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
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
            <div className={`border rounded-2xl overflow-hidden mt-8 shadow-2xl ${isLight ? 'bg-white border-slate-200' : 'bg-[#0B0E14] border-[#1E2533]'}`}>
                <div className={`p-6 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-[#1E2533]'}`}>
                    <h2 className={`text-base font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>Recent Activity</h2>
                    <button
                        onClick={() => navigate('/transactions')}
                        className="flex items-center gap-1 text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors"
                    >
                        View all <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
                <div className={isLight ? 'divide-y divide-slate-100' : 'divide-y divide-[#1E2533]/40'}>
                    {transactions.slice(0, RECENT_ACTIVITY_COUNT).map((tx: any) => (
                        <div key={tx.id} className={`flex items-center justify-between px-6 py-4 transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-[#0F1520]/80'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 ${tx.direction === 'swap' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                    tx.direction === 'on' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                    }`}>
                                    {tx.direction === 'swap' ? <RefreshCw className="w-3.5 h-3.5" /> :
                                        tx.direction === 'on' ? <ArrowDown className="w-3.5 h-3.5" /> :
                                            <ArrowUp className="w-3.5 h-3.5" />}
                                </div>
                                <div>
                                    <p className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                        {tx.direction === 'swap' ? 'Swap' : tx.direction === 'on' ? 'Deposit' : 'Withdrawal'}
                                    </p>
                                    <p className={`text-[11px] font-mono ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{formatTimeEAT(tx.createdAt, tx.timeAgo)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-sm font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
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
                        <div className={`py-16 text-center text-sm ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>No transactions found.</div>
                    )}
                </div>
            </div>
        </div>
    );
}