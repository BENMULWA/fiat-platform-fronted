import { useEffect, useState } from 'react';
import { Search, Bell, Zap, RefreshCw, ArrowRight, ShieldCheck, CheckCircle2, AlertTriangle, Clock3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, getTreasuryPositions, quoteDealerRfq } from '../../api/client';

interface WorkspaceData {
    rates: any[];
    rfqs: any[];
    inventory: any[];
    recentExecutions: any[];
    pnlToday: number;
    ticker: any[];
}

export default function InstitutionalRFQsPage() {
    const navigate = useNavigate();

    const [workspaceData, setWorkspaceData] = useState<WorkspaceData>({
        rates: [],
        rfqs: [],
        inventory: [],
        recentExecutions: [],
        pnlToday: 0,
        ticker: []
    });
    const [isLoading, setIsLoading] = useState(true);
    
    // UI States
    const [selectedRfq, setSelectedRfq] = useState<any | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisData, setAnalysisData] = useState<any | null>(null);
    const [queueSearch, setQueueSearch] = useState('');
    const [dealerOverride, setDealerOverride] = useState('50');
    const [quoteSaving, setQuoteSaving] = useState(false);
    const [now, setNow] = useState(new Date());

    // Fetch live workspace data from backend
    const fetchWorkspace = async () => {
        try {
            const [rfqRes, rateBookRes, revenueRes, positionsRes] = await Promise.all([
                api.get('/api/admin/dealer/rfqs'),
                api.get('/api/treasury/rate-book'),
                api.get('/api/admin/company-revenue'),
                getTreasuryPositions(),
            ]);
            const rateBook = rateBookRes.data.rateBook || {};
            const baseRates = rateBook.usdBaseRates || {};
            const kesRate = Number(baseRates.KES);
            const spread = Number(rateBook.spreadBps || 0);
            const rates = ['USD', 'EUR', 'USDT', 'USDC'].filter(asset => Number(baseRates[asset]) > 0 && Number.isFinite(kesRate)).map(asset => ({ pair: `${asset}/KES`, price: kesRate / Number(baseRates[asset]), spread }));
            const rfqs = (rfqRes.data.rfqs || []).map((rfq: any) => ({ ...rfq, customer: rfq.customerName, sellAsset: rfq.fromAsset, buyAsset: rfq.toAsset, settlement: String(rfq.settlementChannel || 'BANK_TO_WALLET').split('_').join(' '), channel: rfq.channel || 'DEALER', country: 'KE', timeAgo: rfq.createdAt ? new Date(rfq.createdAt).toLocaleString() : '' }));
            const revenue = revenueRes.data.revenue || {};
            const positions = positionsRes.data || {};
            const positionRows = [...(positions.fiat || []), ...(positions.stablecoins || [])];
            const inventory = positionRows.filter((row: any) => ['KES', 'USD', 'USDT', 'USDC', 'BTC'].includes(row.asset)).map((row: any) => ({ asset: row.asset, available: Number(row.available || 0), source: row.source }));
            const ticker = positionRows.filter((row: any) => ['KES', 'USD', 'EUR', 'USDC', 'USDA'].includes(row.asset)).map((row: any) => ({ asset: row.asset, value: Number(row.available || 0) }));
            setWorkspaceData({
                rates,
                rfqs,
                inventory,
                recentExecutions: rfqs.filter((rfq: any) => rfq.status === 'executed').map((rfq: any) => ({ trade_id: rfq.settlementId || rfq.id, customer: rfq.customerName, buy_amount: rfq.amount, buy_asset: rfq.fromAsset })),
                pnlToday: Number(revenue.pnlToday || 0),
                ticker
            });
        } catch (err) {
            console.error("Failed to fetch workspace data", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkspace();
        const interval = setInterval(fetchWorkspace, 10000); // Live poll every 10s
        const clock = setInterval(() => setNow(new Date()), 1000);
        return () => { clearInterval(interval); clearInterval(clock); };
    }, []);

    // Handle clicking a specific RFQ in the table
    const handleSelectRfq = async (rfq: any) => {
        setSelectedRfq(rfq);
        setIsAnalyzing(true);
        setAnalysisData(null);
        
        try {
            // Trigger backend to run the 3-pillar pre-trade checks
            const res = await api.get(`/api/admin/dealer/rfqs/${rfq.id}/analysis`);
            setAnalysisData(res.data.analysis || res.data.data || null);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const generateQuote = async () => {
        if (!selectedRfq) return;
        setQuoteSaving(true);
        try {
            const response = await quoteDealerRfq(selectedRfq.id, Number(dealerOverride));
            setSelectedRfq({ ...selectedRfq, ...response.data.rfq, status: 'quoted' });
            await fetchWorkspace();
        } catch (error) {
            console.error('Failed to create dealer quote', error);
        } finally {
            setQuoteSaving(false);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const s = status.toLowerCase();
        if (s === 'pending') return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border text-amber-400 bg-amber-400/10 border-amber-400/20">{status}</span>;
        if (s === 'quoted') return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border text-blue-400 bg-blue-400/10 border-blue-400/20">{status}</span>;
        if (s === 'executed') return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border text-emerald-400 bg-emerald-400/10 border-emerald-400/20">{status}</span>;
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border text-red-400 bg-red-400/10 border-red-400/20">{status}</span>;
    };

    const fmt = (num: number, dec=2) => num.toLocaleString('en-US', {minimumFractionDigits: dec, maximumFractionDigits: dec});
    const visibleRfqs = workspaceData.rfqs.filter((rfq) => {
        const query = queueSearch.trim().toLowerCase();
        return !query || [rfq.id, rfq.rfq_display, rfq.customer, rfq.sellAsset, rfq.buyAsset].some(value => String(value || '').toLowerCase().includes(query));
    });
    const formatMetric = (value: number) => Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : 'N/A';
    const findCheck = (group: any[] | undefined, key: string) => group?.find((check: any) => check.key === key)?.value || 'N/A';
    const marketRate = selectedRfq ? workspaceData.rates.find(rate => rate.pair === `${selectedRfq.sellAsset}/${selectedRfq.buyAsset}`)?.price : undefined;

    return (
        <div className="min-h-screen bg-[#070B14] text-gray-200 font-sans flex flex-col">
            
            {/* The Wizard Modal Overlay */}

            {/* TOP TICKER & NAV BAR (Assuming Sidebar is handled in Layout) */}
            <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 sm:px-6 py-3 border-b border-[#1E2D3D] bg-[#0A0D14] shrink-0">
                <div className="flex items-center gap-4 overflow-hidden min-w-0">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest shrink-0 flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> LIVE TREASURY
                    </span>
                    <div className="hidden sm:flex items-center gap-4 text-[11px] font-mono font-medium whitespace-nowrap overflow-hidden text-gray-400">
                        {workspaceData.ticker.map((item, index) => <span key={item.asset}><span className="text-gray-600">{item.asset}</span> {formatMetric(item.value)}{index < workspaceData.ticker.length - 1 ? ' ·' : ''}</span>)}
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto">
                    <div className="relative flex-1 lg:flex-none">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" value={queueSearch} onChange={e => setQueueSearch(e.target.value)} placeholder="Search customers, trades..." className="bg-[#111827] border border-[#1E2D3D] rounded-md py-2 pl-9 pr-4 text-xs text-white outline-none w-full lg:w-64 focus:border-blue-500" />
                    </div>
                    <Bell className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
                    <span className="text-xs font-mono text-gray-400 border-l border-[#1E2D3D] pl-4">{now.toLocaleTimeString()} EAT</span>
                </div>
            </header>

            <div className="p-3 sm:p-5 lg:p-6 flex-1 overflow-y-auto custom-scrollbar">
                
                {/* PAGE HEADER */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-semibold text-white tracking-tight">Institutional RFQs</h1>
                            <span className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded">Live queue</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Manage customer requests, pricing and execution from one dealing desk.</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="bg-[#111827] border border-[#1E2D3D] px-3 py-2 rounded-md flex items-center gap-2 shadow-inner">
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">P&L today:</span>
                            <span className="text-sm text-emerald-400 font-bold font-mono">
                                +${workspaceData.pnlToday.toLocaleString(undefined, {minimumFractionDigits: 0})}
                            </span>
                        </div>
                        <button onClick={() => navigate('/admin/institutional-rfqs/new')} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-md text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] whitespace-nowrap">
                            <Zap className="w-4 h-4" /> New RFQ
                        </button>
                    </div>
                </div>

                <nav className="flex items-center gap-1 border-b border-[#1E2D3D] mb-5 overflow-x-auto" aria-label="Dealer workspace">
                    {[['/admin/institutional-rfqs', 'RFQ queue'], ['/admin/quotes', 'Quotes'], ['/admin/trades', 'Trades'], ['/admin/institutional-settlements', 'Settlement']].map(([path, label]) => (
                        <button key={path} onClick={() => navigate(path)} className={`px-3 py-2.5 text-[11px] font-semibold whitespace-nowrap border-b-2 ${path.endsWith('institutional-rfqs') ? 'text-white border-emerald-400' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
                            {label}
                        </button>
                    ))}
                </nav>

                {/* RATE CARDS (Dynamic from Backend) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
                    {workspaceData.rates.map((r, i) => (
                        <div key={i} className="bg-[#0F1520] border border-[#1E2D3D] rounded-xl p-4 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{r.pair}</p>
                            <p className="text-2xl font-bold text-white mb-2">{r.price}</p>
                            <div className="flex items-center gap-2 text-[10px] font-bold">
                                <span className="text-gray-500">spread {r.spread}</span>
                                <span className="text-emerald-400">LIVE</span>
                            </div>
                        </div>
                    ))}
                    {workspaceData.rates.length === 0 && isLoading && (
                        Array(4).fill(0).map((_, i) => <div key={i} className="bg-[#0F1520] border border-[#1E2D3D] rounded-xl p-4 h-24 animate-pulse" />)
                    )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-5 pb-6">
                    
                    {/* LEFT COLUMN: TABLES */}
                    <div className="xl:col-span-8 min-w-0 space-y-4 lg:space-y-5">
                        
                        {/* RFQ TABLE */}
                        <div className="bg-[#0F1520] border border-[#1E2D3D] rounded-md overflow-hidden shadow-lg">
                            <div className="px-4 py-3 border-b border-[#1E2D3D] bg-[#111827]/50">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm font-bold text-white">Customer RFQs</h2>
                                        <span className="text-[10px] text-gray-500 font-mono">{visibleRfqs.length} of {workspaceData.rfqs.length}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                            <input value={queueSearch} onChange={e => setQueueSearch(e.target.value)} placeholder="Filter queue" className="w-full md:w-44 bg-[#0A0D14] border border-[#1E2D3D] rounded py-1.5 pl-8 pr-2 text-[11px] text-white outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto min-h-[250px]">
                                <table className="min-w-[760px] w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-[#1E2D3D] text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-[#0A0D14]">
                                            <th className="px-5 py-3">RFQ</th>
                                            <th className="px-5 py-3">CUSTOMER</th>
                                            <th className="px-5 py-3">CHANNEL</th>
                                            <th className="px-5 py-3">TRADE</th>
                                            <th className="px-5 py-3 text-right">SELL AMOUNT</th>
                                            <th className="px-5 py-3">SETTLEMENT</th>
                                            <th className="px-5 py-3">STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#1E2D3D]/50">
                                        {visibleRfqs.map(r => (
                                            <tr 
                                                key={r.id} 
                                                onClick={() => handleSelectRfq(r)}
                                                className={`cursor-pointer transition-colors ${selectedRfq?.id === r.id ? 'bg-[#1E2D3D]/50' : 'hover:bg-[#111827]'}`}
                                            >
                                                <td className="px-5 py-4 text-gray-400 font-mono text-xs">{r.rfq_display || r.id}</td>
                                                <td className="px-5 py-4">
                                                    <p className="font-bold text-white text-xs">{r.customer}</p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5">{r.channel} · {r.country}</p>
                                                </td>
                                                <td className="px-5 py-4 text-gray-400 text-xs">{r.channel}</td>
                                                <td className="px-5 py-4 font-bold text-gray-300 text-xs">{r.sellAsset} <ArrowRight className="inline w-3 h-3 text-gray-500 mx-1" /> {r.buyAsset}</td>
                                                <td className="px-5 py-4 text-right font-mono font-bold text-white text-xs">
                                                    {fmt(r.amount, r.sellAsset === 'BTC' ? 4 : 2)} <span className="text-[10px] text-gray-500">{r.sellAsset}</span>
                                                </td>
                                                <td className="px-5 py-4 text-gray-400 text-xs">{r.settlement}</td>
                                                <td className="px-5 py-4 flex items-center justify-between min-w-[140px]">
                                                    <StatusBadge status={r.status} />
                                                    <span className="text-[10px] text-gray-500">{r.timeAgo}</span>
                                                </td>
                                            </tr>
                                        ))}
                                        {visibleRfqs.length === 0 && !isLoading && (
                                            <tr>
                                                <td colSpan={7} className="py-20 text-center text-gray-500 text-xs">
                                                    <Clock3 className="w-5 h-5 mx-auto mb-2 text-gray-600" />
                                                    {workspaceData.rfqs.length === 0 ? 'No active RFQs in this category.' : 'No RFQs match the current filter.'}
                                                </td>
                                            </tr>
                                        )}
                                        {isLoading && workspaceData.rfqs.length === 0 && (
                                            <tr><td colSpan={7} className="py-20 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" /></td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* LOWER SPLIT PANELS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                            {/* Inventory */}
                            <div className="bg-[#0F1520] border border-[#1E2D3D] rounded-xl overflow-hidden shadow-lg">
                                <div className="px-5 py-3 border-b border-[#1E2D3D] flex justify-between items-center bg-[#111827]/50">
                                    <h2 className="text-sm font-bold text-white">Internal Treasury Inventory</h2>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Available Now</span>
                                </div>
                                <div className="p-5 space-y-4">
                                    {workspaceData.inventory.length > 0 ? workspaceData.inventory.map(inv => (
                                        <div key={inv.asset} className="flex justify-between items-center text-sm">
                                            <span className="font-bold text-gray-300">{inv.asset}</span>
                                            <span className="font-mono text-white text-right">
                                                {fmt(inv.available, inv.asset === 'BTC' ? 4 : 0)} <span className="text-[10px] text-gray-500 font-sans ml-2">available</span>
                                            </span>
                                        </div>
                                    )) : (
                                        <div className="py-5 text-center text-xs text-gray-500">Inventory snapshot unavailable.</div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Executions */}
                            <div className="bg-[#0F1520] border border-[#1E2D3D] rounded-xl overflow-hidden shadow-lg flex flex-col">
                                <div className="px-5 py-3 border-b border-[#1E2D3D] flex justify-between items-center bg-[#111827]/50 shrink-0">
                                    <h2 className="text-sm font-bold text-white">Recent Executions</h2>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">This session</span>
                                </div>
                                <div className="p-5 flex-1 overflow-y-auto">
                                    {workspaceData.recentExecutions.length > 0 ? workspaceData.recentExecutions.map(ex => (
                                        <div key={ex.trade_id} className="flex justify-between items-center text-xs py-2 border-b border-[#1E2D3D]/50 last:border-0">
                                            <span className="text-gray-400 font-mono">{ex.trade_id}</span>
                                            <span className="text-white font-bold">{ex.customer}</span>
                                            <span className="text-gray-300 font-mono text-right">{fmt(ex.buy_amount)} {ex.buy_asset}</span>
                                        </div>
                                    )) : (
                                        <div className="py-5 text-center text-xs text-gray-500">No executions recorded this session.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT ACTION PANEL */}
                    <div className="xl:col-span-4 min-w-0 min-h-[300px] xl:min-h-[450px] bg-[#0F1520] border border-[#1E2D3D] rounded-xl overflow-hidden shadow-xl flex flex-col">
                        {!selectedRfq ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-gray-500">
                                <Zap className="w-12 h-12 mb-4 text-[#1E2D3D]" />
                                <p className="text-sm">Select an RFQ from the queue to view customer detail, check treasury inventory, and generate a dealer quote.</p>
                            </div>
                        ) : isAnalyzing ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                                <p className="text-sm text-gray-400 font-bold">Running Execution Engine...</p>
                                <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-wider">Checking Limits, Compliance & Liquidity</p>
                            </div>
                        ) : analysisData ? (
                            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="p-5 border-b border-[#1E2D3D] bg-[#111827]/50 shrink-0">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Execution Analysis</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-mono text-gray-400">{selectedRfq.rfq_display || selectedRfq.id}</span>
                                            <button onClick={() => navigate(`/admin/institutional-rfqs/new?rfqId=${encodeURIComponent(selectedRfq.id)}`)} className="text-[10px] font-bold text-blue-400 hover:text-blue-300">Open workflow</button>
                                        </div>
                                    </div>
                                    <h2 className="text-lg font-bold text-white">{selectedRfq.customer}</h2>
                                    <p className="text-xs font-bold text-gray-400 mt-1">
                                        {selectedRfq.sellAsset} <ArrowRight className="inline w-3 h-3 mx-1" /> {selectedRfq.buyAsset} · {fmt(selectedRfq.amount, 0)} {selectedRfq.sellAsset}
                                    </p>
                                </div>

                                <div className="p-5 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                                    {/* Abstracted View of Engine Checks */}
                                    <div>
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                                            Pre-Trade Compliance {analysisData.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                                        </h3>
                                        <div className="bg-[#0A0D14] rounded-lg p-3 space-y-2 text-xs border border-[#1E2D3D]">
                                            <div className="flex justify-between"><span className="text-gray-500">KYC / KYB</span><span className={`font-bold ${analysisData.passed ? 'text-emerald-400' : 'text-red-400'}`}>{analysisData.passed ? 'PASSED' : 'REVIEW'}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Daily limit</span><span className="text-gray-300 font-mono">{findCheck(analysisData.customer, 'daily_limit')}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Remaining</span><span className="text-white font-mono font-bold">{findCheck(analysisData.customer, 'remaining_limit')}</span></div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                                            Pricing Engine <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                                        </h3>
                                        <div className="bg-[#111827] border border-blue-500/30 rounded-lg p-4 space-y-3">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-400">Market Rate (Live)</span>
                                                <span className="font-mono text-gray-300">{marketRate ?? 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-[#1E2D3D] pt-3">
                                                <span className="text-xs font-bold text-white">Spread (bps)</span>
                                                <input 
                                                    type="number" 
                                                    value={dealerOverride}
                                                    onChange={e => setDealerOverride(e.target.value)}
                                                    className="bg-[#0A0D14] border border-[#232D39] rounded px-3 py-1.5 text-right font-mono font-bold text-blue-400 w-28 outline-none focus:border-blue-500"
                                                />
                                            </div>
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span className="text-gray-500 uppercase">Expected P&L</span>
                                                <span className="text-emerald-400 font-mono tracking-wider">
                                                    N/A
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 border-t border-[#1E2D3D] bg-[#0A0D14] shrink-0">
                                    <button
                                        onClick={generateQuote}
                                        disabled={quoteSaving || selectedRfq.status === 'quoted' || selectedRfq.status === 'executed'}
                                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-lg shadow-lg transition-all active:scale-[0.98] text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                                    >
                                        <Zap className="w-4 h-4" /> {quoteSaving ? 'Generating...' : selectedRfq.status === 'quoted' ? 'Quote Created' : 'Generate Quote'}
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>

                </div>
            </div>
        </div>
    );
}