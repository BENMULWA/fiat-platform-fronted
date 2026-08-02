//@ts-nocheck
import { useState, useEffect } from 'react';
import { RefreshCw, Search, Eye, Download, X, FileText, AlertTriangle } from 'lucide-react';
import { getRampHistory } from '../../api/client';

export const TransactionsPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('All');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // 🟢 NEW STATE FOR ERROR MODAL
    const [errorModalOpen, setErrorModalOpen] = useState(false);
    const [currentErrorTx, setCurrentErrorTx] = useState<any>(null);

    // --- AUTO-POLLING LOGIC ---
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
            const date = new Date(dateInput);
            if (!isNaN(date.getTime())) {
                return new Intl.DateTimeFormat('en-GB', {
                    timeZone: 'Africa/Nairobi',
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).format(date).replace(',', '');
            }
            const dateStr = String(dateInput);
            if (['today', 'just now', 'recently'].includes(dateStr.toLowerCase())) return dateStr;
            return dateStr;
        } catch (e) {
            return String(dateInput);
        }
    };

    // --- ROBUST ERROR EXTRACTOR ---
    const getErrorReason = (tx: any) => {
        // Checks common backend error field names
        return tx.failureReason
            || tx.error
            || tx.metadata?.error
            || tx.callbackMessage
            || tx.responseMessage
            || "Unknown error occurred. If funds were deducted from your side, please contact support with the reference ID.";
    };

    // --- TYPE BADGE GENERATOR ---
    const getTypeBadge = (dir: string) => {
        const typeMap: Record<string, { label: string, style: string }> = {
            'on': { label: 'deposit', style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
            'off': { label: 'withdrawal', style: 'bg-red-500/10 text-red-400 border-red-500/20' },
            'swap': { label: 'swap', style: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
            'airtime': { label: 'airtime', style: 'bg-amber-500/10 text-amber-400 border-amber-500/20' }
        };
        const mapped = typeMap[dir?.toLowerCase()] || typeMap['swap'];
        return (
            <span className={`px-2.5 py-1 rounded-md border font-medium text-[11px] capitalize tracking-wide ${mapped.style}`}>
                {mapped.label}
            </span>
        );
    };

    // --- STATUS BADGE GENERATOR ---
    const getStatusBadge = (status: string) => {
        const s = status?.toLowerCase() || 'completed';
        let style = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        let Icon = null;

        if (s.includes('fail') || s.includes('error')) {
            style = 'bg-red-500/10 text-red-400 border-red-500/20';
            Icon = AlertTriangle;
        }
        if (s.includes('pend') || s.includes('process')) {
            style = 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse';
            Icon = RefreshCw;
        }

        return (
            <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md border font-medium text-[11px] capitalize tracking-wide flex items-center gap-1.5 ${style}`}>
                    {Icon && <Icon className="w-3 h-3" />}
                    {status || 'Completed'}
                </span>
            </div>
        );
    };

    // --- MINI-STATEMENT CSV DOWNLOAD ---
    const handleDownloadStatement = () => {
        if (filtered.length === 0) return;

        const headers = ["Date", "Type", "Amount", "Asset", "Status", "Reference", "Failure Reason"];
        const rows = filtered.map(tx => {
            const assetLabel = tx.direction === 'swap' ? `${tx.fromAsset} → ${tx.toAsset}` : tx.fromAsset;
            return [
                formatToEAT(tx.createdAt || tx.date),
                tx.direction,
                tx.fromAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00',
                assetLabel,
                tx.status,
                tx.id,
                tx.status?.toLowerCase().includes('fail') ? getErrorReason(tx) : "N/A"
            ];
        });

        const csvContent = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Casiri_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- FILTERING LOGIC (Enhanced to search errors) ---
    const filtered = transactions.filter(tx => {
        const errorReason = getErrorReason(tx).toLowerCase();
        const matchesSearch =
            tx.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.fromAsset?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.toAsset?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            errorReason.includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;
        if (filter === 'All') return true;
        if (filter === 'Deposits' && tx.direction === 'on') return true;
        if (filter === 'Withdrawals' && tx.direction === 'off') return true;
        if (filter === 'Swaps' && tx.direction === 'swap') return true;
        if (filter === 'Airtime' && (tx.channel?.toLowerCase().includes('airtime') || tx.fromAsset === 'AIRT')) return true;
        if (filter === 'Failed' && (tx.status?.toLowerCase().includes('fail') || tx.status?.toLowerCase().includes('error'))) return true;
        return false;
    });

    const filterTabs = ['All', 'Deposits', 'Withdrawals', 'Swaps', 'Airtime', 'Failed'];

    // --- ERROR DETAIL MODAL ---
    const ErrorModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#111827] border border-[#1E2533] rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 fade-in duration-300">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" /> Transaction Failed
                    </h3>
                    <button onClick={() => setErrorModalOpen(false)} className="text-gray-500 hover:text-white transition-colors p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="bg-[#0B0E14] rounded-xl p-4 mb-4 space-y-3 border border-[#1E2533]">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Reference</span>
                        <span className="text-white font-mono text-xs">{currentErrorTx?.id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Amount</span>
                        <span className="text-white font-bold">{currentErrorTx?.fromAmount} {currentErrorTx?.fromAsset}</span>
                    </div>
                </div>

                <div className="mb-6">
                    <span className="text-[11px] text-gray-500 uppercase tracking-widest font-bold block mb-2">Root Cause</span>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                        <p className="text-sm text-red-300 leading-relaxed">
                            {getErrorReason(currentErrorTx)}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setErrorModalOpen(false)}
                    className="w-full py-3 rounded-xl bg-[#1E2533] hover:bg-gray-600 text-white font-bold text-sm transition-all"
                >
                    Close
                </button>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto animate-in fade-in duration-500 p-4 md:p-6 text-gray-200">

            {/* PAGE HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20">
                        <FileText className="w-7 h-7 text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            Transactions
                            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                Retail Ledger
                            </span>
                        </h1>
                        <p className="text-gray-500 text-xs mt-1">Complete history of your deposits, withdrawals, and swaps.</p>
                    </div>
                </div>

                {/* MINI-STATEMENT DOWNLOAD BUTTON */}
                <button
                    onClick={handleDownloadStatement}
                    disabled={filtered.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#1E2533] bg-[#111827] hover:bg-[#1a2638] hover:border-gray-500 text-sm font-bold text-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                >
                    <Download className="w-4 h-4 text-emerald-400 group-hover:animate-bounce" />
                    Download Statement
                </button>
            </div>

            <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl overflow-hidden shadow-xl relative">

                {/* TABLE HEADER & CONTROLS */}
                <div className="p-5 border-b border-[#1E2533] flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0F1520]/30">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                        History ({filtered.length} records)
                    </h2>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        {/* Search Box */}
                        <div className="relative w-full sm:w-72">
                            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                placeholder="Search ID, asset, or error..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-[#0B0E14] border border-[#1E2533] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none rounded-xl py-2 pl-9 pr-4 text-sm font-medium text-white w-full transition-all placeholder-gray-600"
                            />
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex items-center bg-[#0B0E14] border border-[#1E2533] p-1 rounded-xl w-full sm:w-auto overflow-x-auto custom-scrollbar">
                            {filterTabs.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setFilter(tab)}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${filter === tab
                                            ? `${tab === 'Failed' ? 'bg-red-500/10 text-red-400' : 'bg-[#1e2d3d] text-white'} shadow-sm`
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
                            <tr className="border-b border-[#1E2533] bg-[#0B0E14]/50">
                                <th className="py-3.5 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest w-44">Date</th>
                                <th className="py-3.5 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest w-28">Type</th>
                                <th className="py-3.5 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Amount</th>
                                <th className="py-3.5 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Asset</th>
                                <th className="py-3.5 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                                <th className="py-3.5 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E2533]/40">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-24 text-center">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-3" />
                                        <p className="text-sm text-gray-500">Syncing ledger...</p>
                                    </td>
                                </tr>
                            ) : filtered.length > 0 ? (
                                filtered.map((tx: any) => {
                                    const assetLabel = tx.direction === 'swap'
                                        ? `${tx.fromAsset} → ${tx.toAsset}`
                                        : tx.fromAsset;

                                    const isFailed = tx.status?.toLowerCase().includes('fail') || tx.status?.toLowerCase().includes('error');

                                    return (
                                        <tr key={tx.id} className="hover:bg-[#0F1520]/50 transition-colors group">
                                            {/* Date */}
                                            <td className="py-4 px-6 text-xs text-gray-400 font-mono whitespace-nowrap">
                                                {formatToEAT(tx.createdAt || tx.date)}
                                            </td>

                                            {/* 🟢 FIXED: Type Badge (Was empty before) */}
                                            <td className="py-4 px-6">
                                                {getTypeBadge(tx.direction)}
                                            </td>

                                            {/* Amount */}
                                            <td className="py-4 px-6 text-sm font-bold text-white font-mono text-right">
                                                {tx.direction === 'off' ? '-' : '+'}{tx.fromAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>

                                            {/* Asset Flow */}
                                            <td className="py-4 px-6 text-xs text-gray-300 font-medium">
                                                {assetLabel}
                                            </td>

                                            {/* Status + 🟢 NEW: Eye Icon for Failures */}
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    {getStatusBadge(tx.status)}
                                                    {isFailed && (
                                                        <button
                                                            onClick={() => {
                                                                setCurrentErrorTx(tx);
                                                                setErrorModalOpen(true);
                                                            }}
                                                            className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                                                            title="View failure reason"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Reference ID */}
                                            <td className="py-4 px-6 text-xs text-gray-600 font-mono text-right group-hover:text-gray-400 transition-colors">
                                                {tx.id?.slice(0, 16)}...
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-24 text-center">
                                        <div className="w-16 h-16 bg-[#0F1520] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#1E2533]">
                                            <Search className="w-7 h-7 text-gray-600" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-400 mb-1">No transactions found.</p>
                                        <p className="text-xs text-gray-600">Try adjusting your search or filter criteria.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Render Error Modal if Open */}
            {errorModalOpen && <ErrorModal />}
        </div>
    );
};