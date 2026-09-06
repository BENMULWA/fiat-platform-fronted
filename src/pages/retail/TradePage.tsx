// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
    ArrowUpDown, CheckCircle2, XCircle, AlertCircle, Wallet, Zap,
    Clock, ArrowRightLeft, ChevronDown, ChevronsUpDown, Shield, Info, TrendingUp, X, Search
} from 'lucide-react'
import { executeRamp, getRampHistory, getRetailWallet, getTreasurySwapQuote } from '../../api/client'
import AssetIcon from '../../components/AssetIcon'

// `active: false` assets have no real settlement path anywhere in the platform
// yet — no deposit channel to legitimately acquire them, no withdrawal channel
// to cash them back out, and (for IMP/USD/the extra fiat currencies) no on-chain
// or provider integration backing a swap into them at all. Swapping into one of
// these would strand the user with a balance that's real in the DB but nowhere
// else. Kept visible-but-disabled (matching Deposit/WithdrawPage's pattern)
// rather than removed, so users can see what's coming without being misled
// into thinking it works today. See docs/RETAIL_GO_LIVE_CHECKLIST.md.
const ASSETS = [
    { id: 'USDT', name: 'Tether', type: 'crypto', active: true },
    { id: 'USDC', name: 'USD Coin', type: 'crypto', active: true },
    { id: 'USDA', name: 'Cardano USD', type: 'crypto', active: true },
    { id: 'cUSD', name: 'Celo Dollar', type: 'crypto', active: true },
    { id: 'KES', name: 'Kenyan Shilling', type: 'fiat', active: true },
    { id: 'AIRT', name: 'Airtime Token', type: 'telco', active: true },
    { id: 'USD', name: 'US Dollar', type: 'fiat', active: true },
    { id: 'UGX', name: 'Ugandan Shilling', type: 'fiat', active: false },
    { id: 'TZS', name: 'Tanzanian Shilling', type: 'fiat', active: false },
    { id: 'RWF', name: 'Rwandan Franc', type: 'fiat', active: false },
    { id: 'BIF', name: 'Burundian Franc', type: 'fiat', active: false },
    { id: 'XAF', name: 'CFA Franc (BEAC)', type: 'fiat', active: false },
    { id: 'XOF', name: 'CFA Franc (BCEAO)', type: 'fiat', active: false },
    { id: 'IMP', name: 'Impact Token', type: 'telco', active: false },
]

const isAssetActive = (id: string) => ASSETS.find(a => a.id === id)?.active ?? false;

// How long a quote is trusted before the UI tells the user it's about to
// refresh (matches the 15s poll in the quote effect below). Platforms like
// Binance Convert show this so a rate never changes on someone mid-decision
// without warning.
const QUOTE_REFRESH_SECONDS = 15;

// Defined at module scope, not inside TradePage, so it keeps a stable component
// identity across re-renders. Previously this was declared inside TradePage's
// body, so every poll-triggered re-render (wallet/quote/history all refresh on
// their own intervals) created a brand-new function reference for it — React
// treats that as a different component type and force-remounts it, which
// slams shut the native <select> the instant a user opened it. Fixed 2026-09-04.
//
// Replaced the invisible-<select>-over-a-div pattern with a proper searchable
// modal (Uniswap/Binance/Coinstore convention): it can show a balance per
// token, group active vs. "coming soon" assets clearly, and supports typing
// to filter, none of which a native <select> can do.
const TokenButton = ({ value, onOpen }: { value: string, onOpen: () => void }) => {
    return (
        <button
            type="button"
            onClick={onOpen}
            className="bg-[#0B0E14] border border-[#1E2533] rounded-xl h-[50px] flex items-center px-3 gap-2 min-w-[140px] hover:border-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500 focus-visible:outline-offset-2 transition-colors"
        >
            <AssetIcon asset={value} size="md" />
            <span className="text-white font-bold text-sm flex-1 text-left">{value}</span>
            <ChevronsUpDown className="w-4 h-4 text-gray-500" />
        </button>
    )
}

const TokenSelectModal = ({
    isOpen, onClose, onSelect, balances, excludeId,
}: {
    isOpen: boolean
    onClose: () => void
    onSelect: (id: string) => void
    balances: Record<string, number>
    excludeId?: string
}) => {
    const [query, setQuery] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            setQuery('')
            // Focus the search box the moment the modal opens, same as Uniswap's token modal.
            setTimeout(() => inputRef.current?.focus(), 0)
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const filtered = ASSETS.filter(a =>
        a.id !== excludeId &&
        (a.id.toLowerCase().includes(query.toLowerCase()) || a.name.toLowerCase().includes(query.toLowerCase()))
    )
    const activeAssets = filtered.filter(a => a.active)
    const comingSoon = filtered.filter(a => !a.active)

    const renderRow = (a: typeof ASSETS[number]) => {
        const balance = balances[a.id]
        return (
            <button
                key={a.id}
                type="button"
                disabled={!a.active}
                onClick={() => { if (a.active) { onSelect(a.id); onClose(); } }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                    a.active ? 'hover:bg-white/5 cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
            >
                <AssetIcon asset={a.id} size="md" />
                <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">{a.id}</p>
                    <p className="text-gray-500 text-xs truncate">{a.name}</p>
                </div>
                {!a.active ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-white/5 px-2 py-1 rounded-md shrink-0">Coming soon</span>
                ) : typeof balance === 'number' ? (
                    <span className="text-gray-400 text-xs font-mono shrink-0">{balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                ) : null}
            </button>
        )
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 animate-in fade-in duration-150" onClick={onClose}>
            <div
                className="bg-[#111827] border border-[#1E2533] rounded-3xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 fade-in duration-150"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Select an asset"
            >
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <h3 className="text-white font-bold text-base">Select an asset</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500 rounded" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="px-5 pb-3">
                    <div className="flex items-center gap-2 bg-[#0B0E14] border border-[#1E2533] rounded-xl px-3 py-2.5 focus-within:border-purple-500/50">
                        <Search className="w-4 h-4 text-gray-500 shrink-0" />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search name or symbol"
                            className="bg-transparent text-sm text-white placeholder-gray-600 outline-none w-full"
                        />
                    </div>
                </div>
                <div className="overflow-y-auto custom-scrollbar px-2 pb-4 flex-1">
                    {activeAssets.length > 0 && (
                        <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Available now</div>
                    )}
                    {activeAssets.map(renderRow)}
                    {comingSoon.length > 0 && (
                        <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Coming soon</div>
                    )}
                    {comingSoon.map(renderRow)}
                    {filtered.length === 0 && (
                        <p className="text-center text-gray-500 text-sm py-10">No assets match "{query}"</p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function TradePage() {
    const [from, setFrom] = useState('KES')
    const [to, setTo] = useState('USDT')
    const [amount, setAmount] = useState('')
    const [history, setHistory] = useState<any[]>([])
    const [historyPage, setHistoryPage] = useState(0)
    const HISTORY_PAGE_SIZE = 10
    const [balances, setBalances] = useState<Record<string, number>>({})
    const [selectorFor, setSelectorFor] = useState<'from' | 'to' | null>(null)
    const [showDetails, setShowDetails] = useState(false)

    const [submitting, setSubmitting] = useState(false)
    const [toastError, setToastError] = useState('')
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [quote, setQuote] = useState<any>({
        active: true,
        referenceSource: 'CBK',
        executionRate: 1,
        marketRate: 1,
        receiveAmount: 0,
        marketReceiveAmount: 0,
        feeAmount: 0,
        spreadBps: 0,
        updatedAt: null,
    })
    // Counts down between quote refetches so the rate never changes on the
    // user without warning — same idea as Binance Convert's refresh ring.
    const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(QUOTE_REFRESH_SECONDS)

    const historyTotalPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
    const pagedHistory = history.slice(historyPage * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE + HISTORY_PAGE_SIZE);

    const parsedAmount = parseFloat(amount) || 0;
    const rate = quote.executionRate || 1;
    const receiveAmount = parsedAmount > 0 ? Number(quote.receiveAmount || 0) : 0;
    const pureMarketRate = quote.marketRate || 1;
    // Gated by parsedAmount, same as receiveAmount above: the quote fetch
    // falls back to amount=1 when the input is empty (see the quote effect),
    // so showing quote.feeAmount unconditionally displayed "fee on 1 KES"
    // rounded to 0.0000 — reading as a zero-fee trade before anything was
    // even typed. Now it shows "—" until there's a real amount to quote.
    const feeCaptured = parsedAmount > 0 ? Number(quote.feeAmount || 0) : 0;
    const debitAmount = Number(quote.debitAmount || parsedAmount);
    const availableBalance = Number(balances[from] || 0);
    const hasInsufficientBalance = parsedAmount > 0 && debitAmount > availableBalance;
    const marketReceiveAmount = parsedAmount > 0 ? Number(quote.marketReceiveAmount || 0) : 0;
    const userValueDifference = Math.max(marketReceiveAmount - receiveAmount, 0);
    const routeLabel = quote.route || `${from} -> USD liquidity -> ${to}`;
    const settlementMinutes = Number(quote.estimatedSettlementMinutes || 1);

    const loadHistory = async () => {
        try {
            const r = await getRampHistory()
            if (r.data?.entries) {
                const swapsOnly = r.data.entries.filter((e: any) => e.direction === 'swap')
                setHistory(swapsOnly.slice(0, 20)) // Limit UI load
            }
        } catch (e) { console.debug('Failed to load history', e) }
    }

    const loadWallet = async () => {
        try {
            const response = await getRetailWallet()
            if (response.data?.balances) setBalances(response.data.balances)
        } catch (error) {
            console.debug('Failed to load wallet balance', error)
        }
    }

    useEffect(() => {
        // Poll refreshes can shrink the list (e.g. a stale entry drops off);
        // keep the current page from pointing past the new last page.
        setHistoryPage(p => Math.min(p, Math.max(0, Math.ceil(history.length / HISTORY_PAGE_SIZE) - 1)))
    }, [history.length])

    useEffect(() => {
        loadHistory()
        const interval = setInterval(loadHistory, 10000) // Poll every 10s
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        loadWallet()
        const interval = setInterval(loadWallet, 15000) // Poll wallet every 15s
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        let cancelled = false

        const fetchQuote = async () => {
            try {
                const res = await getTreasurySwapQuote({ from_asset: from, to_asset: to, amount: parsedAmount > 0 ? parsedAmount : 1 })
                if (!cancelled) {
                    setQuote(res.data || {})
                    setSecondsUntilRefresh(QUOTE_REFRESH_SECONDS)
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Failed to fetch treasury quote', error)
                }
            }
        }

        fetchQuote()
        const timer = setInterval(fetchQuote, QUOTE_REFRESH_SECONDS * 1000)
        return () => {
            cancelled = true
            clearInterval(timer)
        }
    }, [from, to, parsedAmount])

    // Drives the countdown display only — the actual refetch above runs on
    // its own interval regardless of whether this tick is running.
    useEffect(() => {
        const tick = setInterval(() => {
            setSecondsUntilRefresh((s) => (s > 0 ? s - 1 : 0))
        }, 1000)
        return () => clearInterval(tick)
    }, [])

    const handleSwap = async () => {
        if (!amount || parsedAmount <= 0) return
        if (hasInsufficientBalance) {
            setToastError(`Insufficient ${from} balance. You need ${debitAmount.toFixed(4)} ${from}.`)
            return
        }
        setSubmitting(true); setToastError('')

        try {
            await executeRamp({
                direction: 'swap', channel: 'Internal Ledger', from_asset: from, to_asset: to,
                amount: parsedAmount, rate, fee: feeCaptured, counterparty: 'Internal Wallet',
            })
            setShowSuccessModal(true); setAmount(''); loadHistory(); loadWallet()
        } catch (error: any) {
            setToastError(error.response?.data?.detail || 'Swap failed. Insufficient balance or market halted.')
        } finally {
            setSubmitting(false)
            setTimeout(() => setToastError(''), 6000)
        }
    }

    const handleFlip = () => { setFrom(to); setTo(from); setAmount('') }

    const handleSelectAsset = (id: string) => {
        if (selectorFor === 'from') { setFrom(id); setAmount(''); }
        else if (selectorFor === 'to') { setTo(id); setAmount(''); }
    }

    // Button label reflects exactly what's blocking the swap, the way
    // Uniswap's swap button does, instead of just going grey with no
    // explanation of which condition needs to change.
    const buttonLabel = useMemo(() => {
        if (submitting) return 'Executing trade...'
        if (from === to) return 'Choose two different assets'
        if (!isAssetActive(from) || !isAssetActive(to)) return 'Asset not yet available'
        if (!quote.active) return 'Markets paused'
        if (parsedAmount <= 0) return 'Enter an amount'
        if (hasInsufficientBalance) return `Insufficient ${from} balance`
        return 'Confirm Swap'
    }, [submitting, from, to, quote.active, parsedAmount, hasInsufficientBalance])

    const buttonDisabled = submitting || parsedAmount <= 0 || from === to || hasInsufficientBalance || !quote.active || !isAssetActive(from) || !isAssetActive(to)

    return (
        <div className="max-w-[1200px] mx-auto animate-in fade-in zoom-in-95 duration-300 pt-4 px-4 md:px-0 text-gray-200">

            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/10 border border-purple-500/20">
                        <ArrowRightLeft className="w-7 h-7 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Instant Swap</h2>
                        <p className="text-gray-400 mt-1 text-[15px]">Trade assets internally with zero gas fees and tight spreads.</p>
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toastError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span className="flex-1">{toastError}</span>
                    <button onClick={() => setToastError('')} className="text-red-400/50 hover:text-red-400"><X className="w-4 h-4" /></button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT: SWAP ENGINE */}
                <div className="lg:col-span-5 space-y-4">

                    {/* Main Swap Card */}
                    <div className="bg-[#111827] border border-[#1E2533] rounded-2xl p-6 relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

                        {/* From Section */}
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">You Pay</span>
                                <span className={`text-[10px] font-mono ${hasInsufficientBalance ? 'text-red-400' : 'text-gray-400'}`}>
                                    Balance: {availableBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {from}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 bg-[#0B0E14] border border-[#1E2533] rounded-xl p-1 focus-within:border-purple-500/50 transition-all">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="bg-transparent text-3xl font-bold w-full outline-none text-white placeholder-gray-700 p-3 pl-4"
                                />
                                {availableBalance > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setAmount(String(availableBalance))}
                                        className="text-[10px] font-bold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-1 rounded-md shrink-0 transition-colors"
                                    >
                                        MAX
                                    </button>
                                )}
                                <TokenButton value={from} onOpen={() => setSelectorFor('from')} />
                            </div>
                        </div>

                        {/* Flip Button */}
                        <div className="flex justify-center -my-5 relative z-20">
                            <button
                                onClick={handleFlip}
                                className="bg-[#0F1520] border-4 border-[#111827] p-2.5 rounded-xl hover:bg-purple-500/10 hover:border-purple-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500 transition-all shadow-lg group"
                                aria-label="Swap direction"
                            >
                                <ArrowUpDown className="w-5 h-5 text-purple-400 group-hover:rotate-180 transition-transform duration-300" />
                            </button>
                        </div>

                        {/* To Section */}
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">You Receive</span>
                                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    Rate: {rate < 1 ? rate.toFixed(4) : rate.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 bg-[#0B0E14] border border-[#1E2533] rounded-xl p-1">
                                <input
                                    type="text"
                                    readOnly
                                    value={receiveAmount > 0 ? receiveAmount.toFixed(4) : '0.00'}
                                    className="bg-transparent text-3xl font-bold w-full outline-none text-emerald-400 p-3 pl-4"
                                />
                                <TokenButton value={to} onOpen={() => setSelectorFor('to')} />
                            </div>
                        </div>

                        {/* Quote refresh countdown — tells the user the rate above is about
                            to update, instead of it silently changing underneath them. */}
                        <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] text-gray-600">
                            <Clock className="w-3 h-3" />
                            Rate refreshes in {secondsUntilRefresh}s
                        </div>

                        {/* Execute Button */}
                        <button
                            onClick={handleSwap}
                            disabled={buttonDisabled}
                            className="w-full mt-4 py-4 px-4 rounded-xl font-extrabold text-[15px] tracking-wide transition-all duration-300 flex items-center justify-center gap-2.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white shadow-[0_0_30px_rgba(168,85,247,0.2)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
                        >
                            {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-5 h-5" />}
                            {buttonLabel}
                        </button>
                    </div>

                    {/* Rate Transparency — collapsed to one summary line by default so a
                        new user isn't shown a wall of monospace figures before they've
                        even entered an amount; the full breakdown is one tap away
                        (Uniswap's expandable swap-details row does the same). */}
                    <div className="bg-[#111827] border border-[#1E2533] rounded-2xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowDetails((s) => !s)}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500"
                        >
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Info className="w-3.5 h-3.5" /> Rate & fee breakdown
                            </span>
                            <span className="flex items-center gap-2 text-xs font-mono text-gray-300">
                                1 {from} = {pureMarketRate < 1 ? pureMarketRate.toFixed(4) : pureMarketRate.toFixed(2)} {to}
                                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                            </span>
                        </button>
                        {showDetails && (
                            <div className="px-5 pb-5 space-y-3 font-mono text-sm border-t border-[#1E2533] pt-4">
                                <div className="flex justify-between items-center text-gray-400">
                                    <span>Market Rate</span>
                                    <span>{pureMarketRate === 1 ? `1 ${from} = 1 ${to}` : `1 ${from} = ${pureMarketRate < 1 ? pureMarketRate.toFixed(4) : pureMarketRate.toFixed(2)} ${to}`}</span>
                                </div>
                                <div className="flex justify-between items-center text-purple-400">
                                    <span className="flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> Spread ({((quote.spreadBps || 0) / 100).toFixed(2)}%)</span>
                                    <span>{parsedAmount > 0 ? `- ${feeCaptured.toFixed(4)} ${quote.feeCurrency || to}` : '—'}</span>
                                </div>
                                {from === 'KES' && to === 'AIRT' && feeCaptured > 0 && (
                                    <div className="flex justify-between items-center text-gray-400">
                                        <span>Total debited</span>
                                        <span>{debitAmount.toFixed(4)} KES</span>
                                    </div>
                                )}
                                <div className="border-t border-[#1E2533] my-3 pt-3 flex justify-between items-center text-white font-bold">
                                    <span>Your Execution Rate</span>
                                    <span className="text-emerald-400">1 {from} = {rate < 1 ? rate.toFixed(6) : rate.toFixed(4)} {to}</span>
                                </div>
                                <div className="flex justify-between items-center text-gray-400 text-xs">
                                    <span>Estimated company spread</span>
                                    <span>{parsedAmount > 0 ? `${feeCaptured.toFixed(4)} ${quote.feeCurrency || to}` : '—'}</span>
                                </div>
                                <div className="flex justify-between items-center text-gray-500 text-xs">
                                    <span>Rate Source</span>
                                    <span>{quote.referenceSource || 'Treasury Desk'} · Refresh {quote.refreshIntervalHours || 3}h</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
                        <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <TrendingUp className="w-3.5 h-3.5" /> Your Value Before Confirmation
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-gray-500 text-xs">You receive</p>
                                <p className="text-white font-bold">{receiveAmount.toFixed(4)} {to}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">Market reference amount</p>
                                <p className="text-gray-300 font-bold">{marketReceiveAmount.toFixed(4)} {to}</p>
                            </div>
                        </div>
                        <p className="text-gray-400 text-xs mt-4 leading-relaxed">
                            The difference of {userValueDifference.toFixed(4)} {to} is the disclosed spread used to operate the conversion. This quote is indicative until you confirm.
                        </p>
                        <div className="mt-4 pt-3 border-t border-emerald-500/10 flex flex-col sm:flex-row sm:justify-between gap-2 text-xs">
                            <span className="text-gray-500">Route: <span className="text-gray-300">{routeLabel}</span></span>
                            <span className="text-gray-500">Estimated settlement: <span className="text-gray-300">{settlementMinutes} sec </span></span>
                        </div>
                    </div>

                    {/* Trust Footer */}
                    <div className="bg-[#0B0E14] border border-[#1E2533] rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-500" /> Ledger Secured</div>
                            <div className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5 text-blue-500" /> 0 Gas Fees</div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock className="w-3.5 h-3.5" /> 1 Sec Execution
                        </div>
                    </div>
                </div>

                {/* RIGHT: HISTORY PANEL */}
                <div className="lg:col-span-7 bg-[#0F1520] border border-[#1E2533] shadow-2xl rounded-3xl overflow-hidden flex flex-col min-h-[600px]">
                    <div className="px-6 py-4 border-b border-[#1E2533] bg-[#0B0E14]/30 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" /> Trade History
                        </h3>
                        <span className="text-[10px] text-gray-500 font-mono">{history.length} records</span>
                    </div>

                    <div className="p-5 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                        {pagedHistory.map((r: any) => {
                            const isSuccess = r.status?.toLowerCase() === 'completed';
                            const fromAmt = parseFloat(r.fromAmount || 0);
                            const toAmt = parseFloat(r.toAmount || 0);
                            // Bug fix: r.rate was undefined for every row from the API, so
                            // every entry displayed "Rate: N/A" regardless of the actual
                            // trade. Fall back to computing it from the two amounts, which
                            // the row already has, before giving up and showing N/A.
                            const displayRate = typeof r.rate === 'number'
                                ? r.rate
                                : (fromAmt > 0 ? toAmt / fromAmt : null);
                            return (
                                <div key={r.id} className="bg-[#111827] border border-[#1E2533] rounded-xl p-4 hover:border-gray-600/50 transition-all group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 transition-colors ${isSuccess ? 'bg-purple-500/10 border-purple-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                                <ArrowRightLeft className={`w-5 h-5 ${isSuccess ? 'text-purple-400' : 'text-red-400'}`} />
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm font-mono flex items-center gap-2">
                                                    <AssetIcon asset={r.fromAsset} size="sm" /> {fromAmt.toFixed(2)} {r.fromAsset}
                                                    <span className="text-gray-600 mx-1">→</span>
                                                    <AssetIcon asset={r.toAsset} size="sm" /> {toAmt.toFixed(2)} {r.toAsset}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5 font-sans flex items-center gap-2">
                                                    <Clock className="w-3 h-3" />
                                                    {r.date || r.createdAt ? new Date(r.date || r.createdAt).toLocaleDateString() : 'Today'}
                                                    <span className="text-gray-700">•</span>
                                                    Rate: {displayRate !== null ? displayRate.toFixed(4) : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${isSuccess ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                {isSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                {r.status || 'Completed'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {history.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center py-20 border-2 border-dashed border-[#1E2533] rounded-2xl">
                                <ArrowRightLeft className="w-10 h-10 text-gray-600 mb-4" />
                                <p className="text-gray-400 text-sm font-medium mb-1">No swap history yet</p>
                                <p className="text-xs text-gray-600">Completed trades will appear here instantly.</p>
                            </div>
                        )}
                    </div>

                    {history.length > HISTORY_PAGE_SIZE && (
                        <div className="px-6 py-3 border-t border-[#1E2533] bg-[#0B0E14]/30 flex items-center justify-between">
                            <button
                                onClick={() => setHistoryPage(p => Math.max(0, p - 1))}
                                disabled={historyPage === 0}
                                className="text-xs font-bold text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                            >
                                Previous
                            </button>
                            <span className="text-[11px] text-gray-500 font-mono">
                                Page {historyPage + 1} of {historyTotalPages}
                            </span>
                            <button
                                onClick={() => setHistoryPage(p => Math.min(historyTotalPages - 1, p + 1))}
                                disabled={historyPage >= historyTotalPages - 1}
                                className="text-xs font-bold text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

            </div>

            {/* Token select modal — shared between the "You Pay" and "You Receive" buttons */}
            <TokenSelectModal
                isOpen={selectorFor !== null}
                onClose={() => setSelectorFor(null)}
                onSelect={handleSelectAsset}
                balances={balances}
                excludeId={selectorFor === 'from' ? to : selectorFor === 'to' ? from : undefined}
            />

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                    <div className="bg-[#111827] border border-[#1E2533] rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 fade-in duration-300 text-center">
                        <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Swap Executed!</h3>
                        <p className="text-gray-400 text-sm mb-2">Assets exchanged instantly via internal ledger.</p>

                        {/* Mini Summary in Modal */}
                        <div className="bg-[#0B0E14] rounded-xl p-4 mb-6 text-left text-sm space-y-2 border border-[#1E2533]">
                            <div className="flex justify-between text-gray-400"><span>Traded</span><span className="text-white font-mono">{parsedAmount} {from}</span></div>
                            <div className="flex justify-between text-gray-400"><span>Received</span><span className="text-emerald-400 font-mono font-bold">{receiveAmount.toFixed(4)} {to}</span></div>
                            <div className="flex justify-between text-gray-400"><span>Fee Captured</span><span className="text-purple-400 font-mono">{feeCaptured.toFixed(4)} {to}</span></div>
                        </div>

                        <button onClick={() => setShowSuccessModal(false)} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white font-bold text-sm transition-all shadow-lg">
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}