// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RefreshCw, Search, Download, Filter, ChevronDown, FileText, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { getOtcRetailTransactions, updateOtcRetailTransactionStatus } from '../../api/client';
import useWebsocket from '../../hooks/useWebsocket';
import SimpleToast from '../../components/ui/SimpleToast';

// 🟢 FIX: Exported exactly as 'RetailTransactionsPage' so App.tsx doesn't crash!
export const RetailTransactionsPage = () => {
    const [allTransactions, setAllTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [activeTab, setActiveTab] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [refSearch, setRefSearch] = useState('');
    const [selectedMerchant, setSelectedMerchant] = useState('All');

    const [showExportMenu, setShowExportMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [toasts, setToasts] = useState<any[]>([]);

    const addToast = (title: string | undefined, body: string) => {
        const id = `t_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
        setToasts(t => [...t, { id, title, body }]);
    };
    const removeToast = (id: string) => setToasts(t => t.filter(x => x.id !== id));

    const currentUser = (() => {
        try { return JSON.parse(localStorage.getItem('meshex_user') || 'null'); } catch { return null; }
    })();
    const currentUserId = currentUser ? (currentUser._id || currentUser.id || null) : null;

    useWebsocket('/ws/dashboard', currentUserId, (msg: any) => {
        if (!msg) return;
        try {
            if (msg.type === 'wallet_update' || msg.type === 'stk_success') {
                addToast('Wallet updated', `Credited ${msg.amount} ${msg.asset} to user ${msg.userId}`);
                fetchTransactions();
            } else if (msg.type === 'withdrawal_success') {
                addToast('Withdrawal completed', `Withdrawal ${msg.entryId} completed for ${msg.userId}`);
                fetchTransactions();
            } else if (msg.type === 'withdrawal_failed_refund') {
                addToast('Withdrawal failed - refunded', `Refunded ${msg.amount} ${msg.asset} to ${msg.userId}. Reason: ${msg.reason || 'unknown'}`);
                fetchTransactions();
            }
        } catch (e) {
            addToast('Realtime', JSON.stringify(msg));
        }
    });

    const fetchTransactions = async () => {
        setIsLoading(true);
        try {
            const res = await getOtcRetailTransactions({ page, limit });
            setAllTransactions(res.data.entries || []);
        } catch (err) {
            console.error("Failed to load transactions", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
        const interval = setInterval(fetchTransactions, 30000);    // refreshes every 30s (UI shows 30s)
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const merchantList = useMemo(() => {
        const merchants = new Set(allTransactions.map(tx => tx.customerName).filter(Boolean));
        return ['All', ...Array.from(merchants).sort()];
    }, [allTransactions]);

    const filteredTxs = useMemo(() => {
        return allTransactions.filter(tx => {
            if (activeTab === 'Deposits' && !['on', 'deposit'].includes(tx.direction)) return false;
            if (activeTab === 'Withdrawals' && !['off', 'withdrawal'].includes(tx.direction)) return false;
            if (activeTab === 'Swaps' && tx.direction !== 'swap') return false;
            if (selectedMerchant !== 'All' && tx.customerName !== selectedMerchant) return false;
            if (searchTerm && !tx.customerName?.toLowerCase().includes(searchTerm.toLowerCase())) return false;

            // Standardized 6-character search that understands the "TXN-" prefix
            if (refSearch) {
                const formattedRef = `TXN-${(tx.id || '').slice(-6).toUpperCase()}`;
                if (!formattedRef.includes(refSearch.toUpperCase().trim())) return false;
            }

            return true;
        });
    }, [allTransactions, activeTab, searchTerm, refSearch, selectedMerchant]);

    const handleExportCSV = () => {
        setShowExportMenu(false);
        const headers = ["Reference", "Time", "Customer", "Type", "Amount", "Asset", "Status"];
        const csvRows = filteredTxs.map(tx => [
            `TXN-${(tx.id || '').slice(-6).toUpperCase()}`,
            tx.createdAt,
            tx.customerName,
            tx.direction,
            tx.fromAmount,
            tx.direction === 'swap' ? `${tx.fromAsset} → ${tx.toAsset}` : tx.fromAsset,
            tx.status
        ]);
        const csvContent = [headers, ...csvRows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Jasiri_Ledger_${selectedMerchant !== 'All' ? selectedMerchant : 'All'}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    const handleExportPDF = () => {
        setShowExportMenu(false);
        const tableRows = filteredTxs.map(tx => {
            const displayType = tx.direction === 'swap' ? 'Swap' : tx.direction === 'on' || tx.direction === 'deposit' ? 'Deposit' : 'Withdrawal';
            const typeColor = displayType === 'Deposit' ? '#00d282' : displayType === 'Withdrawal' ? '#dc2626' : '#2563eb';
            const amountPrefix = displayType === 'Deposit' ? '+' : displayType === 'Withdrawal' ? '-' : '';
            const amountColor = displayType === 'Deposit' ? '#00d282' : displayType === 'Withdrawal' ? '#dc2626' : '#111827';
            const status = (tx.status || 'completed').toUpperCase();
            const statusBg = status === 'COMPLETED' ? '#d1fae5' : status === 'FAILED' ? '#fee2e2' : '#fef3c7';
            const statusText = status === 'COMPLETED' ? '#16a34a' : status === 'FAILED' ? '#dc2626' : '#d97706';

            return `
            <tr>
                <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; color:#374151; font-family:monospace; font-size:11px;">TXN-${(tx.id || '').slice(-6).toUpperCase()}</td>
                <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; color:#374151; font-size:11px;">${formatToEAT(tx.createdAt)}</td>
                <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; font-weight:bold; color:#111827; font-size:11px;">${tx.customerName}</td>
                <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; font-weight:bold; color:${typeColor}; font-size:11px;">${displayType}</td>
                <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; color:#374151; font-weight:500; font-size:11px;">${tx.direction === 'swap' ? `${tx.fromAsset} → ${tx.toAsset}` : tx.fromAsset}</td>
                <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; text-align:right; font-family:monospace; font-weight:bold; color:${amountColor}; font-size:11px;">${amountPrefix}${Number(tx.fromAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; text-align:right;">
                    <span style="background:${statusBg}; color:${statusText}; padding:4px 8px; border-radius:4px; font-size:9px; font-weight:bold; letter-spacing: 0.5px;">${status}</span>
                </td>
            </tr>`;
        }).join("");

        // 🟢 SCROLL FIX: Save the user's scroll position and lock to top
        const originalScrollY = window.scrollY;
        window.scrollTo(0, 0);

        const containerWrapper = document.createElement('div');
        containerWrapper.style.position = 'absolute';
        containerWrapper.style.top = '0';
        containerWrapper.style.left = '0';
        containerWrapper.style.width = '800px';
        containerWrapper.style.backgroundColor = '#ffffff';
        containerWrapper.style.zIndex = '9999999';

        containerWrapper.innerHTML = `
            <div style="width: 800px; background: #fff; font-family: Helvetica, Arial, sans-serif; box-sizing: border-box; margin: 0; padding: 0;">
                <table style="width: 100%; background-color: #000; color: #fff; border-collapse: collapse; margin: 0; padding: 0;">
                    <tr>
                        <td style="padding: 40px; vertical-align: top; width: 50%;">
                            <h1 style="margin:0; font-size:26px; font-weight: 800; letter-spacing: 1px; color: #00d282;">JASIRI CAPITAL</h1>
                            <p style="margin: 5px 0 0 0; font-size: 16px;">Master Ledger Export</p>
                        </td>
                        <td style="padding: 40px; vertical-align: top; text-align: right; width: 50%;">
                            <p style="margin:0; color:#00d282; font-weight:bold; font-size:12px; letter-spacing:1px; text-transform:uppercase;">JASIRI CAPITAL LTD COMPANY.</p>
                            <p style="margin:8px 0 0 0; color:#9ca3af; font-size:11px;">Generated: ${new Date().toLocaleString()}</p>
                            <p style="margin:4px 0 0 0; color:#9ca3af; font-size:11px; letter-spacing: 1px;">CONFIDENTIAL</p>
                        </td>
                    </tr>
                </table>
                <div style="padding: 40px; width: 100%; box-sizing: border-box;">
                    <p style="margin:0 0 20px 0; font-size:12px; color:#6b7280; font-weight:bold; letter-spacing:1px; text-transform: uppercase;">
                        Filtered By: <span style="color:#111827;">${selectedMerchant !== 'All' ? selectedMerchant : 'All Records'}</span>
                    </p>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="padding:10px 0; text-align:left; color:#6b7280; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #00d282;">Reference</th>
                                <th style="padding:10px 0; text-align:left; color:#6b7280; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #00d282;">Time</th>
                                <th style="padding:10px 0; text-align:left; color:#6b7280; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #00d282;">Customer</th>
                                <th style="padding:10px 0; text-align:left; color:#6b7280; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #00d282;">Type</th>
                                <th style="padding:10px 0; text-align:left; color:#6b7280; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #00d282;">Asset</th>
                                <th style="padding:10px 0; text-align:right; color:#6b7280; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #00d282;">Amount</th>
                                <th style="padding:10px 0; text-align:right; color:#6b7280; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #00d282;">Status</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            </div>
        `;

        document.body.appendChild(containerWrapper);

        const generate = () => {
            const opt = {
                margin: 0,
                filename: `Jasiri_Ledger_${selectedMerchant !== 'All' ? selectedMerchant : 'All'}.pdf`,
                image: { type: 'jpeg', quality: 1 },
                html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 800 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            setTimeout(() => {
                // @ts-ignore
                window.html2pdf().set(opt).from(containerWrapper).save().then(() => {
                    document.body.removeChild(containerWrapper);
                    window.scrollTo(0, originalScrollY);
                });
            }, 300);
        };

        if (!(window as any).html2pdf) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = generate;
            document.head.appendChild(script);
        } else {
            generate();
        }
    };

    const handleAction = async (txId: string, action: 'approve' | 'reject' | 'retry') => {
        try {
            const newStatus = action === 'approve' ? 'completed' : action === 'reject' ? 'failed' : 'processing';
            const res = await updateOtcRetailTransactionStatus(txId, newStatus);
            // Refresh
            fetchTransactions();
            // Prefer server-provided message when available
            const serverMsg = res?.data?.message || res?.data?.detail || `${action === 'approve' ? 'Approved' : 'Updated'} successfully.`;
            addToast(action === 'approve' ? 'Approved' : 'Status updated', serverMsg);
        } catch (err: any) {
            const msg = err?.response?.data?.detail || err?.message || 'Action failed';
            addToast('Action failed', `ID ${txId}: ${msg}`);
        }
    };

    const formatToEAT = (dateInput: any) => {
        if (!dateInput) return 'N/A';
        try {
            let date = new Date(dateInput);
            if (!isNaN(date.getTime())) {
                return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date);
            }
            return String(dateInput);
        } catch (e) { return String(dateInput); }
    };

    const getStatusBadge = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'completed') return (
            <div className="flex items-center justify-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
            </div>
        );
        if (s === 'pending' || s === 'processing') return (
            <div className="flex items-center justify-center gap-1.5 text-amber-500">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_5px_#f59e0b]" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Pending</span>
            </div>
        );
        return (
            <div className="flex items-center justify-center gap-1.5 text-red-500">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444]" />
                <span className="text-[11px] font-bold uppercase tracking-wider">{status}</span>
            </div>
        );
    };

    const getTypeBadge = (type: string) => {
        const t = type.toLowerCase();
        if (t === 'on' || t === 'deposit') return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">Deposit</span>;
        if (t === 'off' || t === 'withdrawal') return <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">Withdrawal</span>;
        if (t === 'swap') return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">Swap</span>;
        return <span className="bg-gray-500/10 text-gray-400 border border-gray-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">{type}</span>;
    };

    const getInitials = (name: string) => {
        if (!name || name === 'Unknown User') return <User className="w-3.5 h-3.5" />;
        const parts = name.split(' ');
        if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 text-gray-200 animate-in fade-in">
            <SimpleToast toasts={toasts} onRemove={removeToast} />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Retail Transactions</h1>
                    <p className="text-xs text-gray-500 mt-1">Real-time ledger of all customer activity</p>
                </div>

                <div className="flex" ref={menuRef}>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-bold px-5 py-2.5 rounded-l-xl text-sm transition-all shadow-lg shadow-emerald-900/20 border-r border-emerald-700 active:scale-[0.98]"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-black font-bold px-3 py-2.5 rounded-r-xl text-sm transition-all h-full flex items-center shadow-lg shadow-emerald-900/20 active:scale-[0.98]"
                        >
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showExportMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-[#111827] border border-[#1e2d3d] rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                <button
                                    onClick={handleExportCSV}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:bg-[#1a2638] hover:text-white transition-colors text-left"
                                >
                                    <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400"><Download className="w-3.5 h-3.5" /></div>
                                    Download as .CSV
                                </button>
                                <button
                                    onClick={handleExportPDF}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:bg-[#1a2638] hover:text-white transition-colors border-t border-[#1e2d3d] text-left"
                                >
                                    <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400"><FileText className="w-3.5 h-3.5" /></div>
                                    Print / Save as .PDF
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-[#0b0f19] border border-[#1e2d3d] rounded-3xl overflow-hidden shadow-2xl">

                <div className="p-5 bg-[#111827] border-b border-[#1e2d3d] space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type="text" placeholder="Search customer name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-[#0a0e17] border border-[#1e2d3d] rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all shadow-inner placeholder-gray-600"
                            />
                        </div>
                        <div className="relative w-full md:w-64">
                            <Filter className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <select
                                value={selectedMerchant} onChange={e => setSelectedMerchant(e.target.value)}
                                className="w-full bg-[#0a0e17] border border-[#1e2d3d] rounded-xl py-3 pl-11 pr-10 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none appearance-none cursor-pointer transition-all shadow-inner font-medium"
                            >
                                {merchantList.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        <div className="relative w-full md:w-56">
                            <span className="text-gray-500 text-xs absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold uppercase">Ref:</span>
                            <input
                                type="text" placeholder="TXN-XXXXXX" value={refSearch} onChange={e => setRefSearch(e.target.value)}
                                className="w-full bg-[#0a0e17] border border-[#1e2d3d] rounded-xl py-3 pl-14 pr-4 text-sm text-white font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none uppercase transition-all shadow-inner placeholder-gray-700"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                        {['All', 'Deposits', 'Withdrawals', 'Swaps'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${activeTab === tab
                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                                        : 'bg-[#0a0e17] text-gray-500 border-[#1e2d3d] hover:text-white hover:border-gray-600 hover:bg-[#1a2638]'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[450px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#111827] border-b border-[#1e2d3d]">
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">TIME</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">CUSTOMER</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">TYPE</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] text-right">AMOUNT</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">ASSET</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">REFERENCE</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] text-center">STATUS</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e2d3d]/50">
                            {isLoading ? (
                                <tr><td colSpan={8} className="py-24 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-4" /><p className="text-gray-500 text-sm font-medium">Syncing Ledger...</p></td></tr>
                            ) : filteredTxs.length > 0 ? (
                                filteredTxs.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-[#151e2e] transition-colors group">
                                        <td className="py-4 px-6 text-xs text-gray-400 font-mono tracking-tight">{formatToEAT(tx.createdAt)}</td>

                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
                                                    {getInitials(tx.customerName)}
                                                </div>
                                                <span className="text-sm font-bold text-white tracking-wide">{tx.customerName}</span>
                                            </div>
                                        </td>

                                        <td className="py-4 px-6">{getTypeBadge(tx.direction)}</td>

                                        <td className="py-4 px-6 text-[15px] font-extrabold font-mono text-white text-right tracking-tight">
                                            {Number(tx.fromAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>

                                        <td className="py-4 px-6 text-sm text-gray-400 font-mono font-medium">{tx.direction === 'swap' ? `${tx.fromAsset} → ${tx.toAsset}` : tx.fromAsset}</td>

                                        <td className="py-4 px-6">
                                            <span className="text-xs text-gray-400 font-mono font-bold bg-[#111827] border border-[#1e2d3d] px-2 py-1 rounded">
                                                TXN-{(tx.id || '').slice(-6).toUpperCase()}
                                            </span>
                                        </td>

                                        <td className="py-4 px-6">{getStatusBadge(tx.status)}</td>

                                        <td className="py-4 px-6 text-right">
                                            {tx.status.toLowerCase() === 'pending' || tx.status.toLowerCase() === 'processing' ? (
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleAction(tx.id, 'approve')} className="bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button>
                                                    <button onClick={() => handleAction(tx.id, 'reject')} className="bg-[#1e2d3d] hover:bg-red-500 hover:text-white text-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95">Reject</button>
                                                </div>
                                            ) : tx.status.toLowerCase() === 'failed' ? (
                                                <button onClick={() => handleAction(tx.id, 'retry')} className="bg-[#1e2d3d] hover:bg-[#2a3a50] text-gray-300 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors">Retry</button>
                                            ) : (
                                                <span className="text-xs text-gray-600 font-medium">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-20 text-center">
                                        <div className="w-16 h-16 bg-[#111827] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#1e2d3d]">
                                            <Search className="w-6 h-6 text-gray-600" />
                                        </div>
                                        <p className="text-sm font-bold text-white mb-1">No transactions found</p>
                                        <p className="text-xs text-gray-500">Try adjusting your filters or search term.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-[#1e2d3d] bg-[#111827] flex items-center justify-between text-xs text-gray-500 font-medium">
                    <span>Showing <strong className="text-white">{filteredTxs.length}</strong> of {allTransactions.length} transactions <span className="text-gray-600 ml-2 border-l border-gray-700 pl-2">Auto-refreshes every 30s</span></span>
                    {selectedMerchant !== 'All' && <span className="text-blue-400 font-bold bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">Filtered by: {selectedMerchant}</span>}
                </div>
            </div>
        </div>
    );
};