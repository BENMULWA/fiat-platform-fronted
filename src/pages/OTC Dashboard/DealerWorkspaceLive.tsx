import { useEffect, useState } from 'react';
import { Search, Bell, Zap, RefreshCw, ArrowRight, ShieldCheck, CheckCircle2, AlertTriangle, Clock3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, getTreasuryPositions, quoteDealerRfq, acceptDealerRfq, executeDealerRfq } from '../../api/client';

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
    const [acceptSaving, setAcceptSaving] = useState(false);
    const [acceptError, setAcceptError] = useState('');
    const [now, setNow] = useState(new Date());
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    // Fetch live workspace data from backend
    const fetchWorkspace = async () => {
        try {
            const [rfqResult, rateBookResult, revenueResult, positionsResult] = await Promise.allSettled([
                api.get('/api/admin/dealer/rfqs'),
                api.get('/api/treasury/rate-book'),
                api.get('/api/admin/company-revenue'),
                getTreasuryPositions(),
            ]);
            const rfqRes = rfqResult.status === 'fulfilled' ? rfqResult.value : { data: { rfqs: [] } };
            const rateBookRes = rateBookResult.status === 'fulfilled' ? rateBookResult.value : { data: { rateBook: {} } };
            const revenueRes = revenueResult.status === 'fulfilled' ? revenueResult.value : { data: { revenue: {} } };
            const positionsRes = positionsResult.status === 'fulfilled' ? positionsResult.value : { data: {} };
            const rateBook = rateBookRes.data.rateBook || {};
            const baseRates = rateBook.usdBaseRates || {};
            const kesRate = Number(baseRates.KES);
            const spread = Number(rateBook.spreadBps || 0);
            const rates = ['USD', 'EUR', 'USDT', 'USDC'].filter(asset => Number(baseRates[asset]) > 0 && Number.isFinite(kesRate)).map(asset => ({ pair: `${asset}/KES`, price: kesRate / Number(baseRates[asset]), spread }));
            const rfqs = (rfqRes.data.rfqs || []).map((rfq: any) => ({ ...rfq, customer: rfq.customerName || rfq.clientName || 'Unknown customer', sellAsset: rfq.fromAsset || rfq.asset || 'N/A', buyAsset: rfq.toAsset || 'N/A', amount: Number(rfq.amount ?? rfq.size ?? 0), settlement: String(rfq.settlementChannel || 'BANK_TO_WALLET').split('_').join(' '), channel: rfq.channel || 'DEALER', country: 'KE', timeAgo: rfq.createdAt ? new Date(rfq.createdAt).toLocaleString() : rfq.timeAgo || '' }));
            const revenue = revenueRes.data.revenue || {};
            const positions = positionsRes.data || {};
            const positionRows = [...(positions.fiat || []), ...(positions.stablecoins || [])];
            const inventory = positionRows.filter((row: any) => ['KES', 'USD', 'USDT', 'cUSD', 'USDC', 'USDA', 'BTC'].includes(row.asset)).map((row: any) => ({ asset: row.asset, available: Number(row.available || 0), source: row.source }));
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

    const handleAcceptAndExecute = async () => {
        if (!selectedRfq) return;
        setAcceptSaving(true);
        setAcceptError('');
        try {
            const acceptRes = await acceptDealerRfq(selectedRfq.id);
            if (acceptRes.data?.status === 'pending_compliance_review') {
                setSelectedRfq({ ...selectedRfq, status: 'pending_compliance_review' });
                setAcceptError('Held for compliance review -- see ZIGRAM Holds under KYC/AML/Risk to release it.');
                await fetchWorkspace();
                return;
            }
            const executeRes = await executeDealerRfq(selectedRfq.id);
            setSelectedRfq({ ...selectedRfq, ...executeRes.data.rfq, status: 'executed' });
            await fetchWorkspace();
        } catch (error: any) {
            setAcceptError(error?.response?.data?.detail || 'Failed to accept/execute this RFQ.');
        } finally {
            setAcceptSaving(false);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        // Flat, border-only labels -- a filled saturated pill per row reads as
        // a marketing UI, not a dealing desk. Color carries the signal, the
        // background doesn't need to.
        const s = status.toLowerCase();
        const base = 'inline-block px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide border rounded-sm';
        if (s === 'pending' || s === 'quote_ready') return <span className={`${base} text-amber-500 border-amber-500/30`}>{status.replace('_', ' ')}</span>;
        if (s === 'quoted') return <span className={`${base} text-sky-400 border-sky-400/30`}>{status}</span>;
        if (s === 'accepted') return <span className={`${base} text-cyan-400 border-cyan-400/30`}>{status}</span>;
        if (s === 'executed') return <span className={`${base} text-emerald-400 border-emerald-400/30`}>{status}</span>;
        if (s === 'pending_compliance_review') return <span className={`${base} text-purple-400 border-purple-400/30`}>compliance review</span>;
        if (s === 'blocked') return <span className={`${base} text-red-400 border-red-400/30`}>blocked</span>;
        return <span className={`${base} text-red-400 border-red-400/30`}>{status}</span>;
    };

    const fmt = (num: number, dec=2) => Number(num || 0).toLocaleString('en-US', {minimumFractionDigits: dec, maximumFractionDigits: dec});
    const filteredRfqs = workspaceData.rfqs.filter((rfq) => {
        const query = queueSearch.trim().toLowerCase();
        return !query || [rfq.id, rfq.rfq_display, rfq.customer, rfq.sellAsset, rfq.buyAsset].some(value => String(value || '').toLowerCase().includes(query));
    });
    const totalPages = Math.max(1, Math.ceil(filteredRfqs.length / PAGE_SIZE));
    const clampedPage = Math.min(page, totalPages);
    const visibleRfqs = filteredRfqs.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

    useEffect(() => { setPage(1); }, [queueSearch]);
    const formatMetric = (value: number) => Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 }) : 'N/A';
    const findCheck = (group: any[] | undefined, ...keys: string[]) => group?.find((check: any) => keys.includes(check.key))?.value || 'N/A';
    const findCheckObj = (group: any[] | undefined, ...keys: string[]) => group?.find((check: any) => keys.includes(check.key));
    const marketRate = selectedRfq ? workspaceData.rates.find(rate => rate.pair === `${selectedRfq.sellAsset}/${selectedRfq.buyAsset}`)?.price : undefined;

    return (
        <div className="min-h-screen bg-[#070B14] text-gray-200 font-sans flex flex-col">
            
            {/* The Wizard Modal Overlay */}

            {/* TOP TICKER & NAV BAR (Assuming Sidebar is handled in Layout) */}
            <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 sm:px-6 py-2.5 border-b border-[#1E2D3D] bg-[#0A0D14] shrink-0">
                <div className="flex items-center gap-4 overflow-hidden min-w-0">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest shrink-0 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Treasury live
                    </span>
                    <div className="hidden sm:flex items-center gap-4 text-[11px] font-mono whitespace-nowrap overflow-hidden text-gray-500">
                        {workspaceData.ticker.map((item, index) => <span key={item.asset}><span className="text-gray-600">{item.asset}</span> {formatMetric(item.value)}{index < workspaceData.ticker.length - 1 ? ' ·' : ''}</span>)}
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <Bell className="w-4 h-4 text-gray-500 hover:text-gray-300 cursor-pointer" />
                    <span className="text-xs font-mono text-gray-500 border-l border-[#1E2D3D] pl-3">{now.toLocaleTimeString()} EAT</span>
                </div>
            </header>

            <div className="p-3 sm:p-5 lg:p-6 flex-1 overflow-y-auto custom-scrollbar">

                {/* PAGE HEADER */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-4">
                    <div>
                        <h1 className="text-xl font-semibold text-white tracking-tight">Institutional RFQs</h1>
                        <p className="text-xs text-gray-500 mt-1">Manage customer requests, pricing and execution from one dealing desk.</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="bg-[#111827] border border-[#1E2D3D] px-3 py-2 rounded-md flex items-center gap-2 shadow-inner">
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">P&L today:</span>
                            <span className="text-sm text-emerald-400 font-bold font-mono">
                                +${workspaceData.pnlToday.toLocaleString(undefined, {minimumFractionDigits: 0})}
                            </span>
                        </div>
                        <button onClick={() => navigate('/admin/institutional-rfqs/new')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-2 whitespace-nowrap">
                            <Zap className="w-3.5 h-3.5" /> New RFQ
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
                        <div key={i} className="bg-[#0F1520] border border-[#1E2D3D] rounded-md p-3.5">
                            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mb-1">{r.pair}</p>
                            <p className="text-xl font-semibold text-white font-mono mb-1">{r.price}</p>
                            <div className="text-[10px] text-gray-600 font-mono">spread {r.spread}bps</div>
                        </div>
                    ))}
                    {workspaceData.rates.length === 0 && isLoading && (
                        Array(4).fill(0).map((_, i) => <div key={i} className="bg-[#0F1520] border border-[#1E2D3D] rounded-md p-3.5 h-20 animate-pulse" />)
                    )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-5 pb-6">
                    
                    {/* LEFT COLUMN: TABLES */}
                    <div className="xl:col-span-8 min-w-0 space-y-4 lg:space-y-5">
                        
                        {/* RFQ TABLE */}
                        <div className="bg-[#0F1520] border border-[#1E2D3D] rounded-md overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-[#1E2D3D] bg-[#0A0D14]">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-[12px] font-semibold text-gray-200 uppercase tracking-wide">Customer RFQs</h2>
                                        <span className="text-[10px] text-gray-600 font-mono">{filteredRfqs.length} total</span>
                                    </div>
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-gray-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                        <input value={queueSearch} onChange={e => setQueueSearch(e.target.value)} placeholder="Filter queue" className="w-full md:w-44 bg-[#0A0D14] border border-[#1E2D3D] rounded py-1.5 pl-8 pr-2 text-[11px] text-gray-200 outline-none focus:border-gray-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto min-h-[250px]">
                                <table className="min-w-[720px] w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-[#1E2D3D] text-[9.5px] font-semibold text-gray-500 uppercase tracking-wider bg-[#0A0D14]">
                                            <th className="px-4 py-2">RFQ</th>
                                            <th className="px-4 py-2">Customer</th>
                                            <th className="px-4 py-2">Pair</th>
                                            <th className="px-4 py-2 text-right">Sell amount</th>
                                            <th className="px-4 py-2">Settlement</th>
                                            <th className="px-4 py-2">Status</th>
                                            <th className="px-4 py-2 text-right">Age</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#1E2D3D]/50">
                                        {visibleRfqs.map(r => (
                                            <tr
                                                key={r.id}
                                                onClick={() => handleSelectRfq(r)}
                                                className={`cursor-pointer transition-colors ${selectedRfq?.id === r.id ? 'bg-[#1E2D3D]/50' : 'hover:bg-[#111827]'}`}
                                            >
                                                <td className="px-4 py-2.5 text-gray-500 font-mono text-[11px]">{r.rfq_display || r.id}</td>
                                                <td className="px-4 py-2.5">
                                                    <p className="font-medium text-gray-200 text-xs">{r.customer}</p>
                                                    <p className="text-[10px] text-gray-600">{r.channel} · {r.country}</p>
                                                </td>
                                                <td className="px-4 py-2.5 text-gray-300 text-xs font-mono">{r.sellAsset}<span className="text-gray-600">/</span>{r.buyAsset}</td>
                                                <td className="px-4 py-2.5 text-right font-mono text-gray-200 text-xs">
                                                    {fmt(r.amount, r.sellAsset === 'BTC' ? 4 : 2)} <span className="text-[10px] text-gray-600">{r.sellAsset}</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-gray-500 text-[11px]">{r.settlement}</td>
                                                <td className="px-4 py-2.5">
                                                    <StatusBadge status={r.status} />
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-[10px] text-gray-600 font-mono whitespace-nowrap">{r.timeAgo}</td>
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
                            {filteredRfqs.length > 0 && (
                                <div className="flex items-center justify-between px-4 py-2 border-t border-[#1E2D3D] bg-[#0A0D14] text-[11px] text-gray-500">
                                    <span>
                                        Showing {(clampedPage - 1) * PAGE_SIZE + 1}–{Math.min(clampedPage * PAGE_SIZE, filteredRfqs.length)} of {filteredRfqs.length}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={clampedPage <= 1}
                                            className="px-2.5 py-1 rounded border border-[#1E2D3D] text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            Prev
                                        </button>
                                        <span className="px-2 font-mono text-gray-400">{clampedPage} / {totalPages}</span>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={clampedPage >= totalPages}
                                            className="px-2.5 py-1 rounded border border-[#1E2D3D] text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
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

                                <div className="p-5 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
                                    {/* Real per-check data from AnalysisEngine.analyze() -- previously this
                                        showed one hardcoded PASSED/REVIEW label derived from the overall
                                        pass flag, not the actual ZIGRAM screening result. */}
                                    <div>
                                        <h3 className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                                            Pre-Trade Compliance {analysisData.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                                        </h3>
                                        <div className="bg-[#0A0D14] rounded-md p-3 space-y-1.5 text-xs border border-[#1E2D3D]">
                                            {(() => {
                                                const zigramCheck = findCheckObj(analysisData.compliance, 'zigram_screening');
                                                return (
                                                    <div className="flex justify-between"><span className="text-gray-500">ZIGRAM screening</span><span className={`font-medium ${zigramCheck?.passed ? 'text-emerald-400' : 'text-amber-400'}`}>{zigramCheck?.value || 'N/A'}</span></div>
                                                );
                                            })()}
                                            <div className="flex justify-between"><span className="text-gray-500">KYC/KYB</span><span className="text-gray-300 font-mono">{findCheck(analysisData.customer, 'customer_kyc')}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Today's volume</span><span className="text-gray-300 font-mono">{findCheck(analysisData.customer, 'customer_volume')}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Remaining daily limit</span><span className="text-gray-200 font-mono">{findCheck(analysisData.customer, 'customer_limit')}</span></div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                                            Pricing <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
                                        </h3>
                                        <div className="bg-[#0A0D14] border border-[#1E2D3D] rounded-md p-3.5 space-y-3">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-500">Market rate (live)</span>
                                                <span className="font-mono text-gray-300">{marketRate ?? 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-[#1E2D3D] pt-3">
                                                <span className="text-xs font-medium text-gray-300">Spread (bps)</span>
                                                <input
                                                    type="number"
                                                    value={dealerOverride}
                                                    onChange={e => setDealerOverride(e.target.value)}
                                                    className="bg-[#070B14] border border-[#232D39] rounded px-3 py-1.5 text-right font-mono font-medium text-gray-200 w-24 outline-none focus:border-gray-500"
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-600">Expected P&amp;L is shown once a quote is generated.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 border-t border-[#1E2D3D] bg-[#0A0D14] shrink-0 space-y-3">
                                    {acceptError && <p className="text-[11px] text-amber-400">{acceptError}</p>}
                                    <button
                                        onClick={generateQuote}
                                        disabled={quoteSaving || selectedRfq.status === 'quoted' || selectedRfq.status === 'accepted' || selectedRfq.status === 'executed'}
                                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-lg shadow-lg transition-all active:scale-[0.98] text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                                    >
                                        <Zap className="w-4 h-4" /> {quoteSaving ? 'Generating...' : selectedRfq.status === 'quoted' ? 'Quote Created' : 'Generate Quote'}
                                    </button>
                                    {selectedRfq.status === 'quoted' && (
                                        <button
                                            onClick={handleAcceptAndExecute}
                                            disabled={acceptSaving}
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-lg shadow-lg transition-all active:scale-[0.98] text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="w-4 h-4" /> {acceptSaving ? 'Accepting...' : 'Accept & Send to Treasury'}
                                        </button>
                                    )}
                                    {selectedRfq.status === 'executed' && (
                                        <button
                                            onClick={() => navigate('/admin/institutional-settlements')}
                                            className="w-full bg-[#1e2d3d] hover:bg-[#2a3a4f] text-gray-200 font-bold py-3.5 rounded-lg transition-all active:scale-[0.98] text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                                        >
                                            View in Treasury Settlement Queue
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>

                </div>
            </div>
        </div>
    );
}