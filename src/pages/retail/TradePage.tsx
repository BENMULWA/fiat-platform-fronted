// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react'
import {
    ArrowUpDown, CheckCircle2, XCircle, AlertCircle, Wallet, Zap,
    Clock, ArrowRightLeft, ChevronsUpDown, Shield, Info, TrendingUp, X
} from 'lucide-react'
import { executeRamp, getRampHistory } from '../../api/client'

const ASSETS = [
    { id: 'USDT', name: 'Tether', type: 'crypto' },
    { id: 'USDC', name: 'USD Coin', type: 'crypto' },
    { id: 'USDA', name: 'Avalanche USD', type: 'crypto' },
    { id: 'cUSD', name: 'Celo Dollar', type: 'crypto' },
    { id: 'USD', name: 'US Dollar', type: 'fiat' },
    { id: 'KES', name: 'Kenyan Shilling', type: 'fiat' },
    { id: 'UGX', name: 'Ugandan Shilling', type: 'fiat' },
    { id: 'TZS', name: 'Tanzanian Shilling', type: 'fiat' },
    { id: 'RWF', name: 'Rwandan Franc', type: 'fiat' },
    { id: 'BIF', name: 'Burundian Franc', type: 'fiat' },
    { id: 'XAF', name: 'CFA Franc (BEAC)', type: 'fiat' },
    { id: 'XOF', name: 'CFA Franc (BCEAO)', type: 'fiat' },
    { id: 'AIRT', name: 'Airtime Token', type: 'telco' },
    { id: 'IMP', name: 'Impact Token', type: 'telco' },
]

const getAssetMeta = (id: string) => ASSETS.find(a => a.id === id) || { id, name: id, type: 'fiat' };

export default function TradePage() {
    const [from, setFrom] = useState('KES')
    const [to, setTo] = useState('USDT')
    const [amount, setAmount] = useState('')
    const [history, setHistory] = useState<any[]>([])

    const [submitting, setSubmitting] = useState(false)
    const [toastError, setToastError] = useState('')
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    // 🟢 LIVE MARKET SIMULATION (Replace with real API later)
    const [marketRates, setMarketRates] = useState({ KES: 130.50, USDT: 1, USDC: 1, USDA: 1, cUSD: 1, USD: 1 });
    const PLATFORM_FEE_PERCENT = 0.5; // 0.5% revenue capture

    const rate = useMemo(() => {
        if (from === to) return 1;
        const fromRate = marketRates[from as keyof typeof marketRates] || 1;
        const toRate = marketRates[to as keyof typeof marketRates] || 1;

        // Calculate pure market rate
        const pureRate = toRate / fromRate;

        // Apply platform spread (You buy at market + fee, you sell at market - fee)
        // For simplicity in UI: we show the final executed rate after spread
        return pureRate * (1 - (PLATFORM_FEE_PERCENT / 100));
    }, [from, to, marketRates]);

    const parsedAmount = parseFloat(amount) || 0;
    const receiveAmount = parsedAmount * rate;

    // Calculate fee captured for UI transparency
    const pureMarketRate = from === to ? 1 : (marketRates[to as keyof typeof marketRates] || 1) / (marketRates[from as keyof typeof marketRates] || 1);
    const feeCaptured = parsedAmount > 0 ? (parsedAmount * pureMarketRate) - receiveAmount : 0;

    const loadHistory = async () => {
        try {
            const r = await getRampHistory()
            if (r.data?.entries) {
                const swapsOnly = r.data.entries.filter((e: any) => e.direction === 'swap')
                setHistory(swapsOnly.slice(0, 20)) // Limit UI load
            }
        } catch (e) { console.debug('Failed to load history', e) }
    }

    useEffect(() => {
        loadHistory()
        const interval = setInterval(loadHistory, 10000) // Poll every 10s
        return () => clearInterval(interval)
    }, [])

    const handleSwap = async () => {
        if (!amount || parsedAmount <= 0) return
        setSubmitting(true); setToastError('')

        try {
            await executeRamp({
                direction: 'swap', channel: 'Internal Ledger', from_asset: from, to_asset: to,
                amount: parsedAmount, rate, fee: feeCaptured, counterparty: 'Internal Wallet'
            })
            setShowSuccessModal(true); setAmount(''); loadHistory()
        } catch (error: any) {
            setToastError(error.response?.data?.detail || 'Swap failed. Insufficient balance or market halted.')
        } finally {
            setSubmitting(false)
            setTimeout(() => setToastError(''), 6000)
        }
    }

    const handleFlip = () => { setFrom(to); setTo(from); setAmount('') }

    // Beautiful hidden select wrapper
    const AssetSelector = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
        const meta = getAssetMeta(value);
        return (
            <div className="relative bg-[#0B0E14] border border-[#1E2533] rounded-xl h-[50px] flex items-center px-3 gap-2 min-w-[140px] cursor-pointer hover:border-gray-500 transition-colors">
                <div className={`w-2 h-2 rounded-full ${meta.type === 'crypto' ? 'bg-blue-400' : meta.type === 'telco' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span className="text-white font-bold text-sm flex-1">{value}</span>
                <ChevronsUpDown className="w-4 h-4 text-gray-500" />
                {/* Invisible native select over the custom div for accessibility */}
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer outline-none"
                >
                    {ASSETS.map(a => <option key={a.id} value={a.id}>{a.name} ({a.id})</option>)}
                </select>
            </div>
        )
    }

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
                <div className="flex items-center gap-3 bg-[#111827] border border-[#1E2533] rounded-full px-5 py-2.5">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs text-gray-500">Markets Open</span>
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
                                <span className="text-[10px] text-gray-600 font-mono">Balance: Available</span> {/* TODO: Map real balance */}
                            </div>
                            <div className="flex items-center gap-3 bg-[#0B0E14] border border-[#1E2533] rounded-xl p-1 focus-within:border-purple-500/50 transition-all">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="bg-transparent text-3xl font-bold w-full outline-none text-white placeholder-gray-700 p-3 pl-4"
                                />
                                <AssetSelector value={from} onChange={(v) => { setFrom(v); setAmount(''); }} />
                            </div>
                        </div>

                        {/* Flip Button */}
                        <div className="flex justify-center -my-5 relative z-20">
                            <button
                                onClick={handleFlip}
                                className="bg-[#0F1520] border-4 border-[#111827] p-2.5 rounded-xl hover:bg-purple-500/10 hover:border-purple-500/30 transition-all shadow-lg group"
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
                                <AssetSelector value={to} onChange={(v) => { setTo(v); setAmount(''); }} />
                            </div>
                        </div>

                        {/* Execute Button */}
                        <button
                            onClick={handleSwap}
                            disabled={submitting || parsedAmount <= 0 || from === to}
                            className="w-full mt-6 py-4 px-4 rounded-xl font-extrabold text-[15px] tracking-wide transition-all duration-300 flex items-center justify-center gap-2.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white shadow-[0_0_30px_rgba(168,85,247,0.2)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            {submitting ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Executing Trade...</> : <Zap className="w-5 h-5" />}
                            Confirm Swap
                        </button>
                    </div>

                    {/* Rate Transparency Box (Crucial for Revenue Capture Trust) */}
                    <div className="bg-[#111827] border border-[#1E2533] rounded-2xl p-5">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Info className="w-3.5 h-3.5" /> Rate & Fee Breakdown
                        </h3>
                        <div className="space-y-3 font-mono text-sm">
                            <div className="flex justify-between items-center text-gray-400">
                                <span>Market Rate</span>
                                <span>1 {from} = {pureMarketRate < 1 ? pureMarketRate.toFixed(4) : pureMarketRate.toFixed(2)} {to}</span>
                            </div>
                            <div className="flex justify-between items-center text-purple-400">
                                <span className="flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> Spread ({PLATFORM_FEE_PERCENT}%)</span>
                                <span>- {feeCaptured.toFixed(4)} {to}</span>
                            </div>
                            <div className="border-t border-[#1E2533] my-3 pt-3 flex justify-between items-center text-white font-bold">
                                <span>Your Execution Rate</span>
                                <span className="text-emerald-400">1 {from} = {rate < 1 ? rate.toFixed(4) : rate.toFixed(2)} {to}</span>
                            </div>
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
                        {history.map((r: any) => {
                            const isSuccess = r.status?.toLowerCase() === 'completed';
                            return (
                                <div key={r.id} className="bg-[#111827] border border-[#1E2533] rounded-xl p-4 hover:border-gray-600/50 transition-all group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 transition-colors ${isSuccess ? 'bg-purple-500/10 border-purple-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                                <ArrowRightLeft className={`w-5 h-5 ${isSuccess ? 'text-purple-400' : 'text-red-400'}`} />
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm font-mono flex items-center gap-2">
                                                    {parseFloat(r.fromAmount || 0).toFixed(2)} {r.fromAsset}
                                                    <span className="text-gray-600 mx-1">→</span>
                                                    {parseFloat(r.toAmount || 0).toFixed(2)} {r.toAsset}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5 font-sans flex items-center gap-2">
                                                    <Clock className="w-3 h-3" />
                                                    {r.date || r.createdAt ? new Date(r.date || r.createdAt).toLocaleDateString() : 'Today'}
                                                    <span className="text-gray-700">•</span>
                                                    Rate: {r.rate?.toFixed(2) || 'N/A'}
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
                </div>

            </div>

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