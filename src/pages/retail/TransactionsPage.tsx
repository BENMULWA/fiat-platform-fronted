
//@ts-nocheck
import { useState, useEffect } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { getRampHistory } from '../../api/client';

export const TransactionsPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('All');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // --- AUTO-POLLING LOGIC ---
    // Fetches history immediately, then checks every 5 seconds 
    // so webhook updates (Processing -> Completed) show instantly!
    useEffect(() => {
        let isMounted = true;

        const fetchLedger = () => {
            getRampHistory()
                .then((res: any) => {
                    if (isMounted) setTransactions(res.data?.entries || []);
                })
                .catch(err => console.error("History fetch error:", err))
                .finally(() => {
                    if (isMounted) setLoading(false);
                });
        };

        fetchLedger();
        const interval = setInterval(fetchLedger, 5000);

        return () => { 
            isMounted = false; 
            clearInterval(interval); 
        };
    }, []);

    // --- BULLETPROOF DATE FORMATTER ---
    const formatToEAT = (dateInput: any) => {
        if (!dateInput) return 'N/A';
        try {
            const dateStr = String(dateInput);
            
            // If the backend sends friendly text, just return it
            if (['today', 'just now', 'recently'].includes(dateStr.toLowerCase())) {
                return dateStr;
            }

            let date = new Date(dateStr);

            // FIX: Handle "DD/MM/YYYY" format (like "17/07/2026 00:00")
            // JS Date parser gets confused by DD/MM/YYYY and creates an Invalid Date.
            if (isNaN(date.getTime()) && dateStr.includes('/')) {
                const [datePart, timePart] = dateStr.split(' ');
                if (datePart) {
                    const [dd, mm, yyyy] = datePart.split('/');
                    if (dd && mm && yyyy) {
                        // Reconstruct as standard ISO YYYY-MM-DD
                        date = new Date(`${yyyy}-${mm}-${dd}T${timePart || '00:00'}:00`);
                    }
                }
            }

            // If JS STILL cannot parse the date, fallback to returning the raw string
            if (isNaN(date.getTime())) return dateStr;

            return new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Africa/Nairobi',
                year: 'numeric',
                month: 'short', // e.g. "Jul"
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(date).replace(',', '');
        } catch (e) {
            return String(dateInput); // Absolute fallback to prevent crashes
        }
    };

    // --- TYPE BADGE GENERATOR ---
    const getTypeBadge = (dir: string) => {
        const typeMap: Record<string, { label: string, style: string }> = {
            'on': { label: 'deposit', style: 'bg-emerald-500/10 text-emerald-400' },
            'off': { label: 'withdrawal', style: 'bg-red-500/10 text-red-400' },
            'swap': { label: 'swap', style: 'bg-blue-500/10 text-blue-400' },
            'airtime': { label: 'airtime', style: 'bg-amber-500/10 text-amber-400' }
        };

        // Auto-detect type
        const mapped = typeMap[dir?.toLowerCase()] || typeMap['swap'];

        return (
            <span className={`px-2.5 py-1 rounded border border-transparent font-medium text-[11px] capitalize tracking-wide ${mapped.style}`}>
                {mapped.label}
            </span>
        );
    };

    // --- STATUS BADGE GENERATOR ---
    const getStatusBadge = (status: string) => {
        const s = status?.toLowerCase() || 'completed';
        let style = 'bg-emerald-500/10 text-emerald-400';

        if (s.includes('fail') || s.includes('error')) style = 'bg-red-500/10 text-red-400';
        if (s.includes('pend') || s.includes('process')) style = 'bg-amber-500/10 text-amber-400';

        return (
            <span className={`px-2.5 py-1 rounded border border-transparent font-medium text-[11px] capitalize tracking-wide ${style}`}>
                {status || 'Completed'}
            </span>
        );
    };

    // --- FILTERING LOGIC ---
    const filtered = transactions.filter(tx => {
        const matchesSearch =
            tx.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.fromAsset?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.toAsset?.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;
        if (filter === 'All') return true;
        if (filter === 'Deposits' && tx.direction === 'on') return true;
        if (filter === 'Withdrawals' && tx.direction === 'off') return true;
        if (filter === 'Swaps' && tx.direction === 'swap') return true;
        if (filter === 'Airtime' && (tx.channel?.toLowerCase().includes('airtime') || tx.fromAsset === 'AIRT')) return true;
        return false;
    });

    const filterTabs = ['All', 'Deposits', 'Withdrawals', 'Swaps', 'Airtime'];

    return (
        <div className="max-w-7xl mx-auto animate-in fade-in duration-500 p-4 md:p-6 text-gray-200">

            {/* PAGE HEADER */}
            <div className="flex items-center gap-3 mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight">Transactions</h1>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    Retail
                </span>
            </div>

            <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl overflow-hidden shadow-xl relative">

                {/* TABLE HEADER & CONTROLS */}
                <div className="p-6 border-b border-[#1E2533] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-white tracking-wide">Transaction History</h2>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        {/* Search Box */}
                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                placeholder="Search reference..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-[#0F1520] border border-[#1E2533] focus:border-blue-500 focus:outline-none rounded-xl py-2 pl-9 pr-4 text-sm font-medium text-white w-full transition-colors"
                            />
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex items-center bg-[#0F1520] border border-[#1E2533] p-1 rounded-xl w-full sm:w-auto overflow-x-auto custom-scrollbar">
                            {filterTabs.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setFilter(tab)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${filter === tab
                                            ? 'bg-[#1e2d3d] text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-300 hover:bg-[#1e2d3d]/50'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* TABLE */}
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#1E2533] bg-[#0F1520]/50">
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest w-48">Date</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest w-32">Type</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Asset</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E2533]/40">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-3" />
                                        <p className="text-sm text-gray-500">Loading ledger...</p>
                                    </td>
                                </tr>
                            ) : filtered.length > 0 ? (
                                filtered.map((tx: any) => {

                                    // Construct the Asset label (e.g. KES -> USDA)
                                    const assetLabel = tx.direction === 'swap'
                                        ? `${tx.fromAsset} → ${tx.toAsset}`
                                        : tx.fromAsset;

                                    return (
                                        <tr key={tx.id} className="hover:bg-[#0F1520] transition-colors group">
                                            {/* Date */}
                                            <td className="py-4 px-6 text-xs text-gray-400 font-mono">
                                                {formatToEAT(tx.date || tx.createdAt)}
                                            </td>

                                            {/* Type Badge */}
                                            <td className="py-4 px-6">
                                                {getTypeBadge(tx.direction)}
                                            </td>

                                            {/* Amount */}
                                            <td className="py-4 px-6 text-sm font-bold text-white font-mono">
                                                {tx.fromAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>

                                            {/* Asset Flow */}
                                            <td className="py-4 px-6 text-xs text-gray-300 font-medium">
                                                {assetLabel}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-4 px-6">
                                                {getStatusBadge(tx.status)}
                                            </td>

                                            {/* Reference ID */}
                                            <td className="py-4 px-6 text-xs text-gray-600 font-mono text-right group-hover:text-gray-400 transition-colors">
                                                {tx.id}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="w-12 h-12 bg-[#0F1520] rounded-full flex items-center justify-center mx-auto mb-3 border border-[#1E2533]">
                                            <Search className="w-5 h-5 text-gray-600" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-400">No transactions found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};