// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle2, Search, ShieldAlert, Moon, Sun, AlertTriangle } from 'lucide-react';

const MOCK_RFQS = [
    { id: 'RFQ-1182', customer: 'Savanna Payments Ltd', pair: 'USDT/KES', side: 'SELL', asset: 'USDT', size: 38000, channel: 'PORTAL', timeRemaining: 1581 },
    { id: 'RFQ-1170', customer: 'Tembo Logistics', pair: 'ETH/USDT', side: 'BUY', asset: 'ETH', size: 147, channel: 'API', timeRemaining: 1797 },
    { id: 'RFQ-1186', customer: 'Nyota Holdings SACCO', pair: 'USDA/KES', side: 'SELL', asset: 'USDA', size: 139000, channel: 'RM', timeRemaining: 2656 },
    { id: 'RFQ-1181', customer: 'Savanna Payments Ltd', pair: 'USDA/KES', side: 'BUY', asset: 'USDA', size: 150000, channel: 'API', timeRemaining: 2746 },
];

const MARKET_RATES = {
    'USDA/KES': { bid: 129.45, ask: 129.55, sprd: 0.10 },
    'USDT/KES': { bid: 129.35, ask: 129.45, sprd: 0.10 },
    'USDC/KES': { bid: 129.30, ask: 129.42, sprd: 0.12 },
    'BTC/USDT': { bid: 67250.00, ask: 67320.00, sprd: 70.00 },
    'ETH/USDT': { bid: 3480.00, ask: 3485.50, sprd: 5.50 },
};

const CLIENT_LIMITS = {
    'Savanna Payments Ltd': { dailyMax: 300000, dailyUsed: 0, singleMax: 150000, singleUsed: 0, monthlyMax: 3000000, monthlyUsed: 780000, risk: 33, kyc: 'Current', account: 'Approved' },
    'Nyota Holdings SACCO': { dailyMax: 500000, dailyUsed: 450000, singleMax: 200000, singleUsed: 139000, monthlyMax: 5000000, monthlyUsed: 4800000, risk: 85, kyc: 'Review', account: 'Flagged' },
    'Tembo Logistics': { dailyMax: 100000, dailyUsed: 20000, singleMax: 50000, singleUsed: 0, monthlyMax: 1000000, monthlyUsed: 150000, risk: 12, kyc: 'Current', account: 'Approved' },
};

export default function DealerWorkspace() {
    const [rfqs, setRfqs] = useState(MOCK_RFQS);
    const [selectedRfqId, setSelectedRfqId] = useState<string | null>('RFQ-1182');
    const [channelFilter, setChannelFilter] = useState('ALL');
    const [isDarkMode, setIsDarkMode] = useState(true);

    const [spreadBps, setSpreadBps] = useState<number | string>(20);
    const [quoteState, setQuoteState] = useState<'idle' | 'quoted' | 'accepted' | 'rejected'>('idle');
    const [countdown, setCountdown] = useState(60);
    const [stats, setStats] = useState({ quoted: 3, accepted: 2, rejected: 1, expired: 0, volume: 655000, pnl: 19210247 });

    const selectedRfq = rfqs.find(r => r.id === selectedRfqId) || null;
    const rates = selectedRfq ? MARKET_RATES[selectedRfq.pair as keyof typeof MARKET_RATES] : null;
    const clientData = selectedRfq ? CLIENT_LIMITS[selectedRfq.customer as keyof typeof CLIENT_LIMITS] : null;

    let clientRate = 0;
    let clientPaysBase = 0;
    let revenueKes = 0;

    if (selectedRfq && rates) {
        const spreadDecimal = (Number(spreadBps) || 0) / 10000;

        if (selectedRfq.side === 'BUY') {
            // Client BUYS -> We use ASK price, ADD spread
            clientRate = rates.ask * (1 + spreadDecimal);
            clientPaysBase = selectedRfq.size * clientRate;
            revenueKes = (clientRate - rates.ask) * selectedRfq.size;
        } else {
            // Client SELLS -> We use BID price, SUBTRACT spread
            clientRate = rates.bid * (1 - spreadDecimal);
            clientPaysBase = selectedRfq.size * clientRate;
            revenueKes = (rates.bid - clientRate) * selectedRfq.size;
        }
    }

    useEffect(() => {
        const timer = setInterval(() => {
            setRfqs(prev => prev.map(r => ({ ...r, timeRemaining: Math.max(0, r.timeRemaining - 1) })));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        let int: any;
        if (quoteState === 'quoted' && countdown > 0) {
            int = setInterval(() => setCountdown(c => c - 1), 1000);
        } else if (countdown === 0 && quoteState === 'quoted') {
            setQuoteState('idle');
            setStats(s => ({ ...s, expired: s.expired + 1 }));
        }
        return () => clearInterval(int);
    }, [quoteState, countdown]);

    const handleSendQuote = () => {
        if (!selectedRfq) return;
        setQuoteState('quoted');
        setCountdown(60);
        setStats(s => ({ ...s, quoted: s.quoted + 1 }));
    };

    const handleSimulateClientAction = (action: 'accepted' | 'rejected') => {
        setQuoteState(action);
        setStats(s => ({
            ...s,
            [action]: s[action] + 1,
            volume: action === 'accepted' ? s.volume + selectedRfq!.size : s.volume,
            pnl: action === 'accepted' ? s.pnl + revenueKes : s.pnl
        }));
        if (action === 'accepted') {
            setTimeout(() => {
                setRfqs(prev => prev.filter(r => r.id !== selectedRfqId));
                setSelectedRfqId(null);
                setQuoteState('idle');
            }, 2000);
        }
    };

    const filteredRfqs = channelFilter === 'ALL' ? rfqs : rfqs.filter(r => r.channel === channelFilter);
    const formatNum = (num: number, dec = 2) => num.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
    const formatShortVol = (num: number) => num >= 1000000 ? `${(num / 1000000).toFixed(2)}M` : num >= 1000 ? `${(num / 1000).toFixed(0)}K` : num.toString();

    const theme = isDarkMode
        ? { bg: 'bg-[#0F172A]', panel: 'bg-[#1E293B]', border: 'border-[#334155]', text: 'text-white', subtext: 'text-slate-400', input: 'bg-[#0F172A]', hover: 'hover:bg-[#334155]' }
        : { bg: 'bg-slate-50', panel: 'bg-white', border: 'border-slate-200', text: 'text-slate-900', subtext: 'text-slate-500', input: 'bg-slate-50', hover: 'hover:bg-slate-100' };

    return (
        <div className={`flex flex-col h-[calc(100vh-64px)] ${theme.bg} font-sans transition-colors duration-300`}>

            {/* HEADER WITH THEME TOGGLE */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${theme.border} shrink-0 bg-opacity-50 backdrop-blur-md`}>
                <div className="gap-3">
                    <h1 className={`text-2xl font-bold ${theme.text}`}>JASIRI OTC DESK</h1>
                    <p className={`text-lg mt-2 ${theme.subtext}`}>Dealer Execution Engine</p>
                </div>
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`p-2 rounded-lg border ${theme.border} ${theme.text} hover:opacity-80 transition-opacity ${theme.panel}`}
                >
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
            </div>

            {/* MAIN SCROLLABLE CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">

                {/* ========================================= */}
                {/* ROW 1: QUEUE & QUOTE BUILDER (Top Row)      */}
                {/* ========================================= */}
                <div className="flex flex-col lg:flex-row gap-6 mb-6">

                    {/* COLUMN 1: QUEUE (Responsive width) */}
                    <div className={`w-full lg:w-[320px] xl:w-[380px] ${theme.panel} border ${theme.border} rounded-2xl flex flex-col shrink-0 shadow-lg overflow-hidden lg:h-[580px]`}>

                        {/* Queue Filters */}
                        <div className={`p-4 border-b ${theme.border} flex items-center justify-between`}>
                            <div className="flex bg-[#0F172A] border border-[#334155] rounded-lg overflow-hidden p-1 w-full">
                                {['ALL', 'PORTAL', 'RM', 'API'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setChannelFilter(f)}
                                        className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-md transition-all ${channelFilter === f ? 'bg-[#1E293B] text-emerald-400 shadow-sm' : `${theme.subtext} hover:text-white`}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Queue List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {filteredRfqs.map(rfq => (
                                <div
                                    key={rfq.id}
                                    onClick={() => { setSelectedRfqId(rfq.id); setQuoteState('idle'); }}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedRfqId === rfq.id ? 'bg-[#0F172A] border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : `${theme.panel} ${theme.border} ${theme.hover}`}`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`text-sm font-bold ${selectedRfqId === rfq.id ? theme.text : theme.subtext}`}>{rfq.id}</h3>
                                            <Zap className={`w-3.5 h-3.5 ${selectedRfqId === rfq.id ? 'text-amber-400' : 'text-slate-600'}`} fill="currentColor" />
                                        </div>
                                        <span className="text-xs font-mono font-bold text-red-400">{rfq.timeRemaining}s</span>
                                    </div>
                                    <p className={`text-xs ${theme.text} mb-2 line-clamp-1`}>{rfq.customer}</p>

                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#334155]/50">
                                        <span className={`text-xs font-bold ${theme.text} tracking-wide`}>{rfq.pair}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${rfq.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                                                {rfq.side}
                                            </span>
                                            <span className={`text-[11px] font-mono font-medium ${theme.subtext}`}>{rfq.asset} {formatShortVol(rfq.size)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* COLUMN 2: QUOTE BUILDER */}
                    <div className={`flex-1 ${theme.panel} border ${theme.border} rounded-2xl flex flex-col relative shadow-lg overflow-hidden lg:h-[580px]`}>

                        {/* Quote Lock Overlays */}
                        {quoteState === 'quoted' && (
                            <div className="absolute inset-0 z-50 bg-[#0F172A]/90 backdrop-blur-sm flex flex-col items-center justify-center border-2 border-emerald-500 rounded-2xl animate-in fade-in">
                                <div className="w-28 h-28 rounded-full border-4 border-emerald-500/20 flex items-center justify-center mb-6 relative shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                    <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />
                                    <span className="text-4xl font-extrabold text-white font-mono">{countdown}</span>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">Firm Quote Active</h2>
                                <p className="text-slate-400 text-sm mb-8">Waiting for client execution via {selectedRfq?.channel}...</p>
                                <div className="flex gap-4">
                                    <button onClick={() => handleSimulateClientAction('accepted')} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg transition-all shadow-lg active:scale-95">Simulate Client Accept</button>
                                    <button onClick={() => handleSimulateClientAction('rejected')} className="px-6 py-3 bg-transparent border border-red-500 text-red-500 hover:bg-red-500/10 font-bold rounded-lg transition-all active:scale-95">Simulate Reject</button>
                                </div>
                            </div>
                        )}

                        {quoteState === 'accepted' && (
                            <div className="absolute inset-0 z-50 bg-[#064e3b]/95 backdrop-blur-md flex flex-col items-center justify-center rounded-2xl animate-in zoom-in-95">
                                <CheckCircle2 className="w-24 h-24 text-emerald-400 mb-6 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                                <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Trade Executed</h2>
                                <p className="text-emerald-200 font-medium text-lg">Ticket routed to settlement queue.</p>
                            </div>
                        )}

                        {selectedRfq ? (
                            <div className="p-6 md:p-8 flex flex-col h-full overflow-y-auto custom-scrollbar">

                                {/* Headers */}
                                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                                    <div className={`flex-1 ${theme.input} border ${theme.border} rounded-xl p-4 flex items-center justify-between`}>
                                        <div>
                                            <p className={`text-[10px] font-bold ${theme.subtext} uppercase tracking-widest mb-1`}>Client</p>
                                            <span className={`font-bold text-lg ${theme.text}`}>{selectedRfq.customer}</span>
                                        </div>
                                    </div>
                                    <div className={`sm:w-64 ${theme.input} border ${theme.border} rounded-xl p-4 flex items-center justify-center`}>
                                        <span className={`font-bold text-xl ${selectedRfq.side === 'BUY' ? 'text-emerald-400' : 'text-orange-400'}`}>
                                            {selectedRfq.side} {selectedRfq.asset}
                                        </span>
                                    </div>
                                </div>

                                {/* Pair & Size */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                                    <div>
                                        <label className={`block text-[10px] font-bold ${theme.subtext} uppercase tracking-widest mb-2`}>Currency Pair</label>
                                        <div className={`${theme.input} border ${theme.border} rounded-xl py-3 px-5 text-base font-bold ${theme.text}`}>{selectedRfq.pair}</div>
                                    </div>
                                    <div>
                                        <label className={`block text-[10px] font-bold ${theme.subtext} uppercase tracking-widest mb-2`}>Trade Size</label>
                                        <div className={`${theme.input} border ${theme.border} rounded-xl py-3 px-5 text-base font-bold ${theme.text} font-mono`}>{selectedRfq.asset} {selectedRfq.size.toLocaleString()}</div>
                                    </div>
                                </div>

                                {/* Market Rates */}
                                {rates && (
                                    <div className={`mb-8 grid grid-cols-3 gap-px bg-[#334155] border ${theme.border} rounded-xl overflow-hidden shadow-inner`}>
                                        <div className={`${theme.input} p-5 text-center`}>
                                            <p className={`text-[10px] font-bold ${theme.subtext} uppercase tracking-widest mb-1.5`}>Bid</p>
                                            <p className={`text-2xl font-mono font-bold ${selectedRfq.side === 'SELL' ? 'text-white' : theme.text}`}>{formatNum(rates.bid)}</p>
                                        </div>
                                        <div className={`${theme.input} p-5 text-center`}>
                                            <p className={`text-[10px] font-bold ${theme.subtext} uppercase tracking-widest mb-1.5`}>Ask</p>
                                            <p className={`text-2xl font-mono font-bold ${selectedRfq.side === 'BUY' ? 'text-white' : theme.text}`}>{formatNum(rates.ask)}</p>
                                        </div>
                                        <div className={`${theme.input} p-5 text-center`}>
                                            <p className={`text-[10px] font-bold ${theme.subtext} uppercase tracking-widest mb-1.5`}>Spread</p>
                                            <p className={`text-xl font-mono font-medium ${theme.subtext}`}>{formatNum(rates.ask - rates.bid)}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Spread Override */}
                                <div className="mb-8">
                                    <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-3">
                                        Your Spread (Basis Points) — The only field you adjust
                                    </label>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        <div className="relative w-full sm:w-48 shadow-sm">
                                            <input
                                                type="number" value={spreadBps} onChange={e => setSpreadBps(e.target.value)}
                                                className={`w-full ${theme.input} border ${theme.border} focus:border-emerald-500 outline-none rounded-xl py-3 pl-5 pr-14 text-xl font-mono font-extrabold ${theme.text} transition-colors`}
                                            />
                                            <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${theme.subtext} font-bold text-sm`}>bps</span>
                                        </div>
                                        <span className={`text-sm ${theme.subtext} font-medium`}>Applied {selectedRfq.side === 'BUY' ? 'over Ask' : 'under Bid'}</span>
                                    </div>
                                </div>

                                {/* Calculated Final Quote */}
                                <div className={`mt-auto ${theme.input} border ${theme.border} rounded-2xl p-6 mb-8 shadow-inner relative overflow-hidden`}>
                                    <div className="flex justify-between items-center mb-6 relative z-10">
                                        <span className={`text-xs ${theme.subtext} font-bold uppercase tracking-widest`}>Client Rate</span>
                                        <span className="text-3xl font-mono font-extrabold text-white tracking-tight drop-shadow-sm">{formatNum(clientRate, 4)}</span>
                                    </div>

                                    <div className={`flex justify-between items-center pt-6 border-t ${theme.border} relative z-10`}>
                                        <span className={`text-xs ${theme.subtext} font-bold uppercase tracking-widest`}>Total Value (KES)</span>
                                        <span className={`text-xl font-mono font-bold ${theme.text}`}>{formatNum(clientPaysBase)}</span>
                                    </div>

                                    <div className={`flex justify-between items-center pt-4 mt-4 border-t ${theme.border} relative z-10`}>
                                        <span className={`text-[10px] ${theme.subtext} font-bold uppercase tracking-widest`}>Est. Revenue</span>
                                        <span className="text-sm font-mono font-bold text-emerald-400">+{formatNum(revenueKes, 0)} KES</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row items-center justify-end gap-4 mt-auto">
                                    <button className={`px-6 py-3.5 rounded-xl text-sm font-bold ${theme.subtext} hover:${theme.text} transition-colors w-full sm:w-auto`}>Clear</button>
                                    <button className="px-8 py-3.5 rounded-xl text-sm font-bold text-red-500 border border-red-500/30 hover:bg-red-500/10 transition-colors w-full sm:w-auto">Reject</button>
                                    <button onClick={handleSendQuote} className="px-10 py-3.5 rounded-xl text-sm font-bold bg-emerald-500 text-[#0F172A] hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] w-full sm:w-auto active:scale-95">Send Quote</button>
                                </div>

                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 opacity-40">
                                <div className={`w-20 h-20 rounded-full border ${theme.border} ${theme.input} flex items-center justify-center mb-5`}>
                                    <Search className={`w-8 h-8 ${theme.subtext}`} />
                                </div>
                                <p className={`text-base font-bold ${theme.text} mb-2`}>No RFQ Selected</p>
                                <p className={`text-sm ${theme.subtext} max-w-[250px]`}>Select an incoming request from the queue to start building a firm quote.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ========================================= */}
                {/* ROW 2: LIMITS & RATES (Bottom Row)          */}
                {/* ========================================= */}
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* Limits Panel */}
                    <div className={`flex-1 ${theme.panel} border ${theme.border} rounded-2xl p-6 shadow-lg flex flex-col min-h-[300px]`}>
                        <h3 className={`text-[10px] font-bold ${theme.subtext} uppercase tracking-widest mb-6`}>Client Limits & Risk</h3>
                        {clientData ? (
                            <div className="space-y-6 flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className={`text-[9px] font-bold ${theme.subtext} uppercase tracking-widest border-b ${theme.border}`}>
                                            <th className="pb-3">Type</th>
                                            <th className="pb-3">Max</th>
                                            <th className="pb-3">Used</th>
                                            <th className="pb-3 text-right">Available</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`text-xs font-mono ${theme.text}`}>
                                        <tr className={`border-b ${theme.border}`}>
                                            <td className="py-4 font-sans font-medium text-slate-300">Daily</td>
                                            <td className="py-4">${formatShortVol(clientData.dailyMax)}</td>
                                            <td className="py-4">${formatShortVol(clientData.dailyUsed)}</td>
                                            <td className="py-4 text-right font-bold text-emerald-400">${formatShortVol(clientData.dailyMax - clientData.dailyUsed)}</td>
                                        </tr>
                                        <tr className={`border-b ${theme.border}`}>
                                            <td className="py-4 font-sans font-medium text-slate-300">Single</td>
                                            <td className="py-4">${formatShortVol(clientData.singleMax)}</td>
                                            <td className="py-4">${formatShortVol(clientData.singleUsed)}</td>
                                            <td className="py-4 text-right font-bold text-emerald-400">${formatShortVol(clientData.singleMax - clientData.singleUsed)}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-4 font-sans font-medium text-slate-300">Monthly</td>
                                            <td className="py-4">${formatShortVol(clientData.monthlyMax)}</td>
                                            <td className="py-4">${formatShortVol(clientData.monthlyUsed)}</td>
                                            <td className="py-4 text-right font-bold text-emerald-400">${formatShortVol(clientData.monthlyMax - clientData.monthlyUsed)}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Progress Bar */}
                                <div className={`h-1.5 w-full ${theme.input} rounded-full overflow-hidden border ${theme.border}`}>
                                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(clientData.monthlyUsed / clientData.monthlyMax) * 100}%` }} />
                                </div>

                                <div className={`pt-6 border-t ${theme.border} space-y-4`}>
                                    <div className="flex justify-between items-center">
                                        <span className={`text-xs ${theme.subtext} font-bold`}>Risk Score</span>
                                        <span className={`text-xs font-bold font-mono px-3 py-1 rounded border ${clientData.risk > 50 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>{clientData.risk}/100</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className={`text-xs ${theme.subtext} font-bold`}>KYC Status</span>
                                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> {clientData.kyc}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className={`text-xs ${theme.subtext} font-bold`}>Account</span>
                                        <span className={`text-xs font-bold flex items-center gap-1.5 ${clientData.account === 'Approved' ? 'text-emerald-400' : 'text-red-500'}`}>
                                            {clientData.account === 'Approved' ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />} {clientData.account}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={`flex-1 flex items-center justify-center text-xs ${theme.subtext}`}>Select an RFQ to view client limits</div>
                        )}
                    </div>

                    {/* Rates Panel */}
                    <div className={`flex-1 ${theme.panel} border ${theme.border} rounded-2xl p-6 shadow-lg flex flex-col min-h-[300px]`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`text-[10px] font-bold ${theme.subtext} uppercase tracking-widest`}>Reference Rates</h3>
                            <span className={`text-[9px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5`}><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE</span>
                        </div>
                        <div className="flex-1 overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[300px]">
                                <thead>
                                    <tr className={`text-[9px] font-bold ${theme.subtext} uppercase tracking-widest border-b ${theme.border}`}>
                                        <th className="pb-3">Pair</th>
                                        <th className="pb-3">Bid</th>
                                        <th className="pb-3">Ask</th>
                                        <th className="pb-3 text-right">Sprd</th>
                                    </tr>
                                </thead>
                                <tbody className={`text-[12px] font-mono ${theme.text}`}>
                                    {Object.entries(MARKET_RATES).map(([pair, r]) => (
                                        <tr key={pair} className={`border-b ${theme.border} last:border-0 hover:bg-[#334155]/10 transition-colors cursor-default`}>
                                            <td className="py-4 font-sans font-bold text-slate-300">{pair}</td>
                                            <td className="py-4">{formatNum(r.bid)}</td>
                                            <td className="py-4">{formatNum(r.ask)}</td>
                                            <td className="py-4 text-right text-slate-500">{r.sprd.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>

            {/* FOOTER STATS */}
            <div className={`${theme.panel} border-t ${theme.border} bg-gray-900 shrink-0 py-4 overflow-x-auto custom-scrollbar mt-10`}>
                <div className={`flex items-center justify-between min-w-max px-8 divide-x ${theme.border} text-center`}>
                    <div className="px-8 flex-1"><p className={`text-[9px] font-bold ${theme.subtext} uppercase tracking-widest mb-1`}>Quoted</p><p className="text-lg font-mono font-bold text-blue-500">{stats.quoted}</p></div>
                    <div className="px-8 flex-1"><p className={`text-[9px] font-bold ${theme.subtext} uppercase tracking-widest mb-1`}>Accepted</p><p className="text-lg font-mono font-bold text-emerald-500">{stats.accepted}</p></div>
                    <div className="px-8 flex-1"><p className={`text-[9px] font-bold ${theme.subtext} uppercase tracking-widest mb-1`}>Rejected</p><p className="text-lg font-mono font-bold text-red-500">{stats.rejected}</p></div>
                    <div className="px-8 flex-1"><p className={`text-[9px] font-bold ${theme.subtext} uppercase tracking-widest mb-1`}>Expired</p><p className={`text-lg font-mono font-bold ${theme.subtext}`}>{stats.expired}</p></div>
                    <div className="px-10 flex-1"><p className={`text-[9px] font-bold ${theme.subtext} uppercase tracking-widest mb-1`}>Session Vol</p><p className={`text-lg font-mono font-bold ${theme.text}`}>${formatShortVol(stats.volume)}</p></div>
                    <div className="px-10 flex-1"><p className={`text-[9px] font-bold ${theme.subtext} uppercase tracking-widest mb-1`}>Est. P&L (KES)</p><p className="text-lg font-mono font-extrabold text-emerald-500">+{formatNum(stats.pnl, 0)}</p></div>
                </div>
            </div>

        <div>
            <p className="text-md text-white mt-4"> @ 2026 All Rights Reserved</p>
        </div>

        </div>
    );
}