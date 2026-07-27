// @ts-nocheck
import { useState, useEffect, useMemo } from 'react'
import { ArrowDown, ArrowRightLeft, Clock, CheckCircle2, XCircle, AlertCircle, Wallet, Zap, RefreshCw } from 'lucide-react'
import { executeRamp, getRampHistory, api } from '../../api/client'

// 🌍 UPDATED: Full East & West African Currency Support
const ASSETS = [
    'USDA', 'USDC', 'USDT', 'USD',   // Stablecoins / Fiat
    'KES', 'UGX', 'TZS', 'RWF', 'BIF', // East Africa
    'XAF', 'XOF',                      // Central & West Africa (CFA Francs)
    'AIRT', 'IMP'                      // Synthetics
];

export default function TradePage() {
    const [from, setFrom] = useState('KES')
    const [to, setTo] = useState('USDA')
    const [amount, setAmount] = useState('')
    const [history, setHistory] = useState([])

    const [submitting, setSubmitting] = useState(false)
    const [toastError, setToastError] = useState('')
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    // --- LIVE SPREAD ENGINE STATE ---
    const [liveRates, setLiveRates] = useState({ bid: 128.00, ask: 132.00, active: true });
    const [ratesLoading, setRatesLoading] = useState(true);

    const fetchLiveRates = async () => {
        try {
            setRatesLoading(true);
            const res = await api.get('/api/market-maker/spread');
            if (res.data) {
                setLiveRates({
                    bid: res.data.bid,
                    ask: res.data.ask,
                    active: res.data.active
                });
            }
        } catch (err) {
            console.error("Failed to fetch live rates", err);
        } finally {
            setRatesLoading(false);
        }
    };

    useEffect(() => {
        fetchLiveRates();
        const rateInterval = setInterval(fetchLiveRates, 10000);
        return () => clearInterval(rateInterval);
    }, []);

    // 🧮 DYNAMIC CROSS-CURRENCY CALCULATOR
    const rate = useMemo(() => {
        if (from === to) return 1;

        // Core USDA/KES Route (From Market Maker Desk)
        if (from === 'USDA' && to === 'KES') return liveRates.bid;
        if (from === 'KES' && to === 'USDA') return 1 / liveRates.ask;

        // Base USD approximate values for testing (In production, these come from Redis/Binance)
        const usdBaseRates: Record<string, number> = {
            USDA: 1, USDC: 1, USDT: 1, USD: 1, IMP: 1,
            KES: 130.50,
            UGX: 3750.00,
            TZS: 2580.00,
            RWF: 1320.00,
            BIF: 2850.00,
            XAF: 605.00, // Central African CFA
            XOF: 605.00, // West African CFA
            AIRT: 130.50 // Same as KES for Airtime baseline
        };

        // Calculate Cross-Rate (e.g. UGX to XOF)
        const fromUsd = usdBaseRates[from] || 1;
        const toUsd = usdBaseRates[to] || 1;

        // Spread injection (Simulating a 2% spread for non-KES pairs)
        const rawRate = fromUsd / toUsd;
        return rawRate * 0.98; // User gets slightly less due to spread

    }, [from, to, liveRates]);

    const receiveAmount = (parseFloat(amount) || 0) * rate;

    const loadHistory = async () => {
        try {
            const r = await getRampHistory()
            if (r.data?.entries) {
                const swapsOnly = r.data.entries.filter((e: any) => e.direction === 'swap')
                setHistory(swapsOnly)
            }
        } catch (e) {
            console.debug('Failed to load history', e)
        }
    }

    useEffect(() => {
        loadHistory()
        const interval = setInterval(loadHistory, 5000)
        return () => clearInterval(interval)
    }, [])

    const handleSwap = async () => {
        if (!liveRates.active) {
            setToastError("Trading is currently paused by the Dealing Desk.");
            return;
        }

        const numericAmount = parseFloat(amount)
        if (!amount || numericAmount <= 0) return

        setSubmitting(true)
        setToastError('')

        try {
            await executeRamp({
                direction: 'swap',
                channel: 'Internal Ledger',
                from_asset: from,
                to_asset: to,
                amount: numericAmount,
                rate,
                fee: 0,
                counterparty: 'Self'
            })

            setShowSuccessModal(true)
            setAmount('')
            loadHistory()
        } catch (error: any) {
            setToastError(error.response?.data?.detail || 'Swap failed. Please try again.')
        } finally {
            setSubmitting(false)
            setTimeout(() => setToastError(''), 5000)
        }
    }

    const handleFlip = () => {
        setFrom(to);
        setTo(from);
        setAmount('');
    }

    return (
        <div className="animate-in fade-in duration-300 relative p-4 md:p-6 text-gray-200 max-w-6xl mx-auto">

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                    <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
                            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Swap Successful!</h3>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">Your assets have been instantly exchanged and settled via the Treasury Hub.</p>
                        <button onClick={() => setShowSuccessModal(false)} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-900/20">
                            Done
                        </button>
                    </div>
                </div>
            )}

            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Quick Swap</h1>
                    <p className="text-gray-500 text-sm mt-1">Instantly exchange assets within your secure wallet with zero network fees.</p>
                </div>
                <div className="flex items-center gap-2 bg-[#111827] border border-[#1e2d3d] px-4 py-2 rounded-xl text-blue-400 text-xs font-bold uppercase tracking-wider shadow-sm">
                    <Zap className="w-4 h-4 text-blue-500 fill-blue-500" /> Instant Settlement
                </div>
            </div>

            {toastError && (
                <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-medium">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {toastError}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT: SWAP ENGINE */}
                <div className="lg:col-span-5 bg-[#0b0f19] border border-[#1e2d3d] rounded-3xl p-6 shadow-xl relative overflow-hidden h-fit">
                    <div className="space-y-4 relative z-10">

                        {/* FROM ASSET */}
                        <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 transition-colors focus-within:border-blue-500/50">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">You Pay</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    disabled={!liveRates.active}
                                    className="bg-transparent text-4xl font-bold w-full outline-none text-white placeholder-gray-700 disabled:opacity-50"
                                />
                                <select
                                    value={from}
                                    onChange={e => { setFrom(e.target.value); setAmount(''); }}
                                    className="bg-[#1e2d3d] text-white font-bold px-4 py-2.5 rounded-xl outline-none cursor-pointer appearance-none text-center min-w-[90px]"
                                >
                                    {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* FLIP BUTTON */}
                        <div className="flex justify-center -my-6 relative z-20">
                            <button
                                onClick={handleFlip}
                                className="bg-[#0b0f19] border border-[#1e2d3d] p-2 rounded-full hover:bg-[#1e2d3d] transition-colors shadow-lg"
                            >
                                <ArrowDown className="w-5 h-5 text-blue-400" />
                            </button>
                        </div>

                        {/* TO ASSET */}
                        <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">You Receive</span>
                                <span className="text-[10px] text-blue-400 font-mono font-medium bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                                    Rate: {rate < 1 ? rate.toFixed(4) : rate.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <input
                                    type="text"
                                    readOnly
                                    value={receiveAmount > 0 ? receiveAmount.toFixed(2) : '0.00'}
                                    className="bg-transparent text-4xl font-bold w-full outline-none text-emerald-400"
                                />
                                <select
                                    value={to}
                                    onChange={e => { setTo(e.target.value); setAmount(''); }}
                                    className="bg-[#1e2d3d] text-white font-bold px-4 py-2.5 rounded-xl outline-none cursor-pointer appearance-none text-center min-w-[90px]"
                                >
                                    {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* INFO PANEL */}
                        <div className="bg-transparent border border-[#1e2d3d] rounded-xl p-4 flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2 text-gray-400">
                                <Wallet className="w-4 h-4 text-slate-500" />
                                <span className="text-xs font-medium text-slate-400">Internal Ledger Transfer</span>
                            </div>
                            <span className="text-xs text-emerald-400 font-mono font-bold tracking-wide">0 Network Fees</span>
                        </div>

                        <button
                            onClick={handleSwap}
                            disabled={submitting || parseFloat(amount) <= 0 || !amount || !liveRates.active}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold text-lg rounded-xl transition-colors shadow-lg shadow-blue-900/20 mt-4"
                        >
                            {submitting ? 'Processing...' : !liveRates.active ? 'Trading Halted' : 'Confirm Swap'}
                        </button>
                    </div>
                </div>

                {/* RIGHT: SWAP HISTORY */}
                <div className="lg:col-span-7 bg-[#0b0f19] border border-[#1e2d3d] rounded-3xl p-6 shadow-xl flex flex-col min-h-[500px]">
                    <h2 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-slate-400" />
                        Swap History
                    </h2>

                    <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {history.map((r: any) => (
                            <div key={r.id} className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-600 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2.5 mb-1.5">
                                        <div className="w-8 h-8 rounded-full bg-[#1e2d3d] flex items-center justify-center shrink-0">
                                            <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <span className="text-white font-bold text-sm font-mono flex flex-wrap items-center gap-1.5">
                                            {r.fromAmount} {r.fromAsset} <ArrowRightLeft className="w-3 h-3 text-slate-500" /> {r.toAmount.toFixed(2)} {r.toAsset}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium ml-10">
                                        <span>{r.date || 'Today'}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                        <span>{r.timeAgo || 'Just now'}</span>
                                    </div>
                                </div>
                                <div className="sm:text-right pl-10 sm:pl-0">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border ${r.status.toLowerCase() === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                        {r.status.toLowerCase() === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                        {r.status}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {history.length === 0 && (
                            <div className="text-center py-10 border-2 border-dashed border-[#1e2d3d] rounded-2xl flex flex-col items-center justify-center h-48">
                                <ArrowRightLeft className="w-8 h-8 text-gray-600 mb-3" />
                                <p className="text-gray-400 text-sm font-medium">No swaps yet.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}