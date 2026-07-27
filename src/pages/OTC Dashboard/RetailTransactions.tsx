//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { getOtcRetailTransactions, updateOtcRetailTransactionStatus } from '../../api/client'; // 🟢 USING NEW API CLIENT

interface RetailTransaction {
    id: string;
    createdAt: string;
    customerName: string;
    direction: string; // 'on', 'off', 'swap', 'airtime'
    fromAmount: number;
    fromAsset: string;
    toAmount?: number;
    toAsset?: string;
    status: string; // 'completed', 'pending', 'failed'
}

export const RetailTransactionsPage = () => {
    const [activeTab, setActiveTab] = useState('All');
    const [transactions, setTransactions] = useState<RetailTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      // 🟢 FIX: Pass an empty object to satisfy TypeScript's parameter requirement
      const res = await getOtcRetailTransactions({});
      setTransactions(res.data.entries || []);
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setIsLoading(false);
    }
  };

    useEffect(() => {
        fetchTransactions();
        const interval = setInterval(fetchTransactions, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleAction = async (txId: string, action: 'approve' | 'reject' | 'retry') => {
        try {
            // 🟢 USING NEW API CLIENT (Maps button clicks to string statuses)
            const newStatus = action === 'approve' ? 'completed' : action === 'reject' ? 'failed' : 'processing';
            await updateOtcRetailTransactionStatus(txId, newStatus);
            fetchTransactions(); // Refresh instantly after action
        } catch (err) {
            alert(`Action failed for ${txId}`);
        }
    };

    // Highly precise EAT formatter ported from Retail view
    const formatToEAT = (dateInput: any) => {
        if (!dateInput) return 'N/A';
        try {
            const dateStr = String(dateInput);
            let date = new Date(dateStr);

            // Handle DD/MM/YYYY format if Date() gets confused
            if (isNaN(date.getTime()) && dateStr.includes('/')) {
                const [datePart, timePart] = dateStr.split(' ');
                if (datePart) {
                    const [dd, mm, yyyy] = datePart.split('/');
                    if (dd && mm && yyyy) {
                        date = new Date(`${yyyy}-${mm}-${dd}T${timePart || '00:00'}:00`);
                    }
                }
            }

            // If it's a valid date, format it with SECONDS!
            if (!isNaN(date.getTime())) {
                return new Intl.DateTimeFormat('en-GB', {
                    timeZone: 'Africa/Nairobi',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).format(date).replace(',', '');
            }
            return dateStr;
        } catch (e) {
            return String(dateInput);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">completed</span>;
            case 'pending':
            case 'processing': return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">pending</span>;
            case 'failed': return <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">failed</span>;
            default: return null;
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type.toLowerCase()) {
            case 'on':
            case 'deposit': return <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Deposit</span>;
            case 'off':
            case 'withdrawal': return <span className="bg-red-500/10 text-red-400 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Withdrawal</span>;
            case 'swap': return <span className="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Swap</span>;
            case 'airtime': return <span className="bg-orange-500/10 text-orange-400 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Airtime</span>;
            default: return <span className="bg-gray-500/10 text-gray-400 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">{type}</span>;
        }
    };

    const filteredTxs = transactions.filter(tx => {
        if (activeTab === 'All') return true;
        if (activeTab === 'Deposits' && (tx.direction === 'on' || tx.direction === 'deposit')) return true;
        if (activeTab === 'Withdrawals' && (tx.direction === 'off' || tx.direction === 'withdrawal')) return true;
        if (activeTab === 'Swaps' && tx.direction === 'swap') return true;
        if (activeTab === 'Airtime' && tx.direction === 'airtime') return true;
        return false;
    });

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 text-gray-200 animate-in fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white tracking-tight">Retail Transactions</h1>
            </div>

            <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl overflow-hidden shadow-xl">

                {/* Tabs */}
                <div className="flex items-center gap-2 p-4 border-b border-[#1e2d3d] overflow-x-auto custom-scrollbar">
                    {['All', 'Deposits', 'Withdrawals', 'Swaps', 'Airtime'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === tab ? 'bg-[#1e2d3d] text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a2a40]'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0a0e17] border-b border-[#1e2d3d]">
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">TIME</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">CUSTOMER</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">TYPE</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">AMOUNT</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">ASSET</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">STATUS</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e2d3d]/50">

                            {isLoading && transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-3" />
                                        <p className="text-sm text-gray-500">Loading ledger...</p>
                                    </td>
                                </tr>
                            ) : filteredTxs.length > 0 ? (
                                filteredTxs.map((tx) => {
                                    const assetFlow = tx.direction === 'swap' ? `${tx.fromAsset} → ${tx.toAsset}` : tx.fromAsset;

                                    return (
                                        <tr key={tx.id} className="hover:bg-[#1a2a40]/30 transition-colors">
                                            <td className="py-4 px-6 text-sm text-gray-400 font-mono">{formatToEAT(tx.createdAt)}</td>
                                            <td className="py-4 px-6 text-sm font-semibold text-white">{tx.customerName}</td>
                                            <td className="py-4 px-6">{getTypeBadge(tx.direction)}</td>
                                            <td className="py-4 px-6 text-sm font-bold font-mono text-white text-right">
                                                {Number(tx.fromAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-400 font-mono font-medium">{assetFlow}</td>
                                            <td className="py-4 px-6 text-center">{getStatusBadge(tx.status)}</td>
                                            <td className="py-4 px-6 text-right">
                                                {tx.status.toLowerCase() === 'pending' || tx.status.toLowerCase() === 'processing' ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => handleAction(tx.id, 'approve')} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Approve</button>
                                                        <button onClick={() => handleAction(tx.id, 'reject')} className="bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Reject</button>
                                                    </div>
                                                ) : tx.status.toLowerCase() === 'failed' ? (
                                                    <button onClick={() => handleAction(tx.id, 'retry')} className="bg-[#1e2d3d] text-gray-300 hover:text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors">Retry</button>
                                                ) : (
                                                    <span className="text-xs text-gray-600 font-medium">No action</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center text-sm text-gray-500">
                                        No transactions found.
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