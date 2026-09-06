// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Download, FileText, XCircle, Eye, CheckCircle2 } from 'lucide-react';
import { getAdminCustomers, freezeAdminCustomer, unfreezeAdminCustomer, getOtcRetailTransactions } from '../../api/client';

export default function Customers() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

    const [kycFilter, setKycFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isExporting, setIsExporting] = useState(false);

    const fetchCustomers = async () => {
        try {
            const res = await getAdminCustomers();
            setCustomers(res.data.customers || []);
        } catch (err) {
            console.error("Failed to load customers", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleToggleFreeze = async (id: string, currentStatus: string) => {
        try {
            if (currentStatus === 'active') await freezeAdminCustomer(id);
            else await unfreezeAdminCustomer(id);
            fetchCustomers();
        } catch (e) {
            alert("Action failed.");
        }
    };

    const handleViewDocs = (kycDetails?: any) => {
        const docName = kycDetails?.documentName;
        const documentDataUrl = kycDetails?.documentDataUrl;
        if (!docName || !documentDataUrl) {
            alert("No documents are on file for this user.");
            return;
        }
        const documentWindow = window.open(documentDataUrl, '_blank', 'noopener,noreferrer');
        if (!documentWindow) alert('Your browser blocked the document window. Allow pop-ups and try again.');
    };

    const exportStatementCSV = async (customer: any) => {
        setIsExporting(true);
        try {
            const res = await getOtcRetailTransactions({ userId: customer.id, limit: 100 });
            const txs = res.data.entries || [];

            if (txs.length === 0) {
                alert(`No transaction history available to export for ${customer.name}.`);
                setIsExporting(false);
                return;
            }

            const headers = ["Date", "Reference", "Type", "Asset", "Amount", "Status"];
            const csvRows = txs.map((tx: any) => [
                new Date(tx.createdAt).toLocaleDateString(),
                `TXN-${(tx.id || '').slice(-6).toUpperCase()}`,
                tx.direction === 'swap' ? 'Swap' : tx.direction === 'on' || tx.direction === 'deposit' ? 'Deposit' : 'Withdrawal',
                tx.direction === 'swap' ? `${tx.fromAsset} -> ${tx.toAsset}` : tx.fromAsset,
                tx.fromAmount,
                (tx.status || 'completed').toUpperCase()
            ]);

            const csvContent = [headers, ...csvRows].map(e => e.join(",")).join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `Jasiri_Statement_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
        } catch (e) {
            alert("Failed to generate CSV.");
            console.error(e);
        } finally {
            setIsExporting(false);
        }
    };

    const exportStatementPDF = async (customer: any) => {
        setIsExporting(true);
        try {
            const res = await getOtcRetailTransactions({ userId: customer.id, limit: 100 });
            const txs = res.data.entries || [];

            // 🟢 If the backend found exactly 0 transactions, alert and stop. No blank pages!
            if (txs.length === 0) {
                alert(`No transaction history available to generate a statement for ${customer.name}.`);
                setIsExporting(false);
                return;
            }

            let totalDeposits = 0;
            let totalWithdrawals = 0;
            let totalSwapsIn = 0;
            let totalSwapsOut = 0;

            const tableRows = txs.map((tx: any) => {
                const isDeposit = tx.direction === 'deposit' || tx.direction === 'on';
                const isWithdraw = tx.direction === 'withdrawal' || tx.direction === 'off';
                const isSwap = tx.direction === 'swap';
                const status = (tx.status || 'completed').toUpperCase();

                let amount = parseFloat(tx.fromAmount || 0);

                if (isDeposit && status !== 'FAILED') totalDeposits += amount;
                if (isWithdraw && status !== 'FAILED') totalWithdrawals += amount;
                if (isSwap && status !== 'FAILED') {
                    if (tx.fromAsset === 'KES') totalSwapsOut += amount;
                    else totalSwapsIn += parseFloat(tx.toAmount || amount);
                }

                const displayType = isSwap ? 'Swap' : isDeposit ? 'Deposit' : isWithdraw ? 'Withdrawal' : tx.direction;
                const typeColor = displayType === 'Deposit' ? '#00d282' : displayType === 'Withdrawal' ? '#dc2626' : '#2563eb';
                const amountPrefix = displayType === 'Deposit' ? '+' : displayType === 'Withdrawal' ? '-' : '';
                const amountColor = displayType === 'Deposit' ? '#00d282' : displayType === 'Withdrawal' ? '#dc2626' : '#111827';
                const assetStr = isSwap ? `${tx.fromAsset} → ${tx.toAsset}` : tx.fromAsset;

                const statusBg = status === 'COMPLETED' ? '#d1fae5' : status === 'FAILED' ? '#fee2e2' : '#fef3c7';
                const statusText = status === 'COMPLETED' ? '#16a34a' : status === 'FAILED' ? '#dc2626' : '#d97706';

                return `
            <tr>
                <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; color:#374151; font-size:11px;">${new Date(tx.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; color:#374151; font-family:monospace; font-size:11px;">TXN-${(tx.id || '').slice(-6).toUpperCase()}</td>
                <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; font-weight:bold; color:${typeColor}; font-size:11px;">${displayType}</td>
                <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; color:#374151; font-weight:500; font-size:11px;">${assetStr}</td>
                <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; text-align:right; font-family:monospace; font-weight:bold; color:${amountColor}; font-size:11px;">${amountPrefix}${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; color:#374151; text-align:right; font-size:11px;">0.00</td>
                <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; text-align:right;">
                    <span style="background:${statusBg}; color:${statusText}; padding:4px 8px; border-radius:4px; font-size:9px; font-weight:bold; letter-spacing: 0.5px;">${status}</span>
                </td>
            </tr>`;
            }).join('');

            const closingFiat = totalDeposits - totalWithdrawals - totalSwapsOut + totalSwapsIn;

            const containerWrapper = document.createElement('div');
            containerWrapper.style.position = 'absolute';
            // 🟢 FIX: Place it exactly where the user is looking so the screenshot never grabs a blank white area!
            containerWrapper.style.top = `${window.scrollY}px`;
            containerWrapper.style.left = '0';
            containerWrapper.style.width = '800px';
            containerWrapper.style.backgroundColor = '#ffffff';
            containerWrapper.style.zIndex = '9999999';

            containerWrapper.innerHTML = `
            <div style="width: 800px; background: #fff; font-family: Helvetica, Arial, sans-serif; box-sizing: border-box; margin: 0; padding: 0;">
                <!-- Black Header -->
                <table style="width: 100%; background-color: #000; color: #fff; border-collapse: collapse; margin: 0; padding: 0;">
                    <tr>
                        <td style="padding: 40px; vertical-align: top; width: 50%;">
                            <h1 style="margin:0; font-size:26px; font-weight: 800; letter-spacing: 1px; color: #00d282;">JASIRI CAPITAL</h1>
                            <p style="margin: 5px 0 0 0; font-size: 16px;">Client Statement</p>
                        </td>
                        <td style="padding: 40px; vertical-align: top; text-align: right; width: 50%;">
                            <p style="margin:0; color:#00d282; font-weight:bold; font-size:12px; letter-spacing:1px; text-transform:uppercase;">JASIRI CAPITAL LTD COMPANY.</p>
                            <p style="margin:8px 0 0 0; color:#9ca3af; font-size:11px;">Generated: ${new Date().toLocaleString()}</p>
                            <p style="margin:4px 0 0 0; color:#9ca3af; font-size:11px; letter-spacing: 1px;">CONFIDENTIAL</p>
                        </td>
                    </tr>
                </table>

                <div style="padding: 40px; width: 100%; box-sizing: border-box;">
                    <!-- Customer Details -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                        <tr>
                            <td style="width: 50%; vertical-align: top;">
                                <p style="margin:0; font-size:10px; color:#6b7280; font-weight:bold; letter-spacing:1px; text-transform: uppercase;">Customer Name</p>
                                <p style="margin:4px 0 16px 0; font-weight:bold; font-size:15px; color: #111827;">${customer.name}</p>
                                <p style="margin:0; font-size:10px; color:#6b7280; font-weight:bold; letter-spacing:1px; text-transform: uppercase;">Wallet ID</p>
                                <p style="margin:4px 0 0 0; font-weight:bold; font-size:13px; font-family:monospace; color: #111827;">WAL-${customer.id.slice(-6).toUpperCase()}-KES</p>
                            </td>
                            <td style="width: 50%; vertical-align: top;">
                                <p style="margin:0; font-size:10px; color:#6b7280; font-weight:bold; letter-spacing:1px; text-transform: uppercase;">Customer ID</p>
                                <p style="margin:4px 0 16px 0; font-weight:bold; font-size:13px; font-family:monospace; color: #111827;">JAS-RET-${customer.id.slice(0, 4).toUpperCase()}</p>
                                <p style="margin:0; font-size:10px; color:#6b7280; font-weight:bold; letter-spacing:1px; text-transform: uppercase;">Statement Period</p>
                                <p style="margin:4px 0 0 0; font-weight:bold; font-size:13px; color: #111827;">All Time Activity</p>
                            </td>
                        </tr>
                    </table>

                    <!-- Account Summary -->
                    <h3 style="color: #00d282; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #00d282; padding-bottom: 6px; margin: 30px 0 10px 0; font-weight: 800;">Account Summary</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <tr><td style="padding:12px 0; border-bottom:1px solid #e5e7eb; color:#374151; font-weight:600;">Opening Balance</td><td style="padding:12px 0; border-bottom:1px solid #e5e7eb; color:#374151; text-align:right; font-weight:bold;">KES 0.00</td></tr>
                        <tr><td style="padding:12px 0; border-bottom:1px solid #e5e7eb; color:#374151; font-weight:600;">Total Deposits</td><td style="padding:12px 0; border-bottom:1px solid #e5e7eb; color:#00d282; text-align:right; font-weight:bold;">+ KES ${totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                        <tr><td style="padding:12px 0; border-bottom:1px solid #e5e7eb; color:#374151; font-weight:600;">Total Withdrawals</td><td style="padding:12px 0; border-bottom:1px solid #e5e7eb; color:#dc2626; text-align:right; font-weight:bold;">- KES ${totalWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                        <tr><td style="padding:12px 0; border-bottom:1px solid #e5e7eb; color:#374151; font-weight:600;">Swaps Purchased (Fiat → Crypto)</td><td style="padding:12px 0; border-bottom:1px solid #e5e7eb; color:#374151; text-align:right; font-weight:bold;">KES ${totalSwapsOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                        <tr><td style="padding:12px 0; border-bottom:1px solid #e5e7eb; color:#374151; font-weight:600;">Swaps Sold (Crypto → Fiat)</td><td style="padding:12px 0; border-bottom:1px solid #e5e7eb; color:#374151; text-align:right; font-weight:bold;">KES ${totalSwapsIn.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                        <tr><td style="padding:12px 0; border-bottom:1px solid #e5e7eb; color:#374151; font-weight:600;">Total Fees</td><td style="padding:12px 0; border-bottom:1px solid #e5e7eb; color:#dc2626; text-align:right; font-weight:bold;">- KES 0.00</td></tr>
                        <tr><td style="padding:16px 0 10px 0; font-weight:bold; font-size:14px; color:#111827;">Closing Balance</td><td style="padding:16px 0 10px 0; text-align:right; font-weight:bold; font-size:14px; color:#111827;">KES ${closingFiat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                    </table>

                    <!-- Transaction History -->
                    <h3 style="color: #00d282; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #00d282; padding-bottom: 6px; margin: 35px 0 10px 0; font-weight: 800;">Transaction History</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="padding:10px 0; text-align:left; color:#6b7280; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #e5e7eb;">Date</th>
                                <th style="padding:10px 0; text-align:left; color:#6b7280; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #e5e7eb;">Reference</th>
                                <th style="padding:10px 0; text-align:left; color:#6b7280; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #e5e7eb;">Type</th>
                                <th style="padding:10px 0; text-align:left; color:#6b7280; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #e5e7eb;">Asset</th>
                                <th style="padding:10px 0; text-align:right; color:#6b7280; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #e5e7eb;">Amount</th>
                                <th style="padding:10px 0; text-align:right; color:#6b7280; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #e5e7eb;">Fee</th>
                                <th style="padding:10px 0; text-align:right; color:#6b7280; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #e5e7eb;">Status</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>

                    <!-- Footer -->
                    <div style="margin-top: 50px; text-align:center; padding-top:20px; border-top:1px solid #e5e7eb; color:#9ca3af; font-size:10px;">
                        <p style="margin: 0 0 6px 0; font-weight:bold; color:#6b7280;">Jasiri OTC Limited · Registered in Kenya - PSP License No. XXXX</p>
                        <p style="margin: 0 0 10px 0;">This statement is computer generated and does not require a signature. If you believe there is an error, please contact support@jasiri.io within 30 days.</p>
                        <p style="margin: 0; color:#00d282; font-weight:bold; letter-spacing:0.5px;">JASIRI CAPITAL LTD COMPANY.</p>
                    </div>
                </div>
            </div>
        `;

            document.body.appendChild(containerWrapper);

            const generate = () => {
                const opt = {
                    margin: 0,
                    filename: `Jasiri_Statement_${customer.name.replace(/\s+/g, '_')}.pdf`,
                    image: { type: 'jpeg', quality: 1 },
                    html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 800 },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                };

                setTimeout(() => {
                    // @ts-ignore
                    window.html2pdf().set(opt).from(containerWrapper).save().then(() => {
                        document.body.removeChild(containerWrapper);
                        setIsExporting(false);
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

        } catch (e) {
            alert("Failed to generate statement.");
            console.error(e);
            setIsExporting(false);
        }
    };

    const getCustomerDate = (customer: any) => {
        const raw = customer?.joinedAt || customer?.createdAt || customer?.created_at || '';
        const date = new Date(raw);
        return Number.isNaN(date.getTime()) ? null : date;
    };

    const formatDateTime = (raw: string | Date | null | undefined) => {
        if (!raw) return 'Recently';
        const date = typeof raw === 'string' ? new Date(raw) : raw;
        if (Number.isNaN(date.getTime())) return 'Recently';
        return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    };

    const sortedCustomers = [...customers].sort((a, b) => {
        const aDate = getCustomerDate(a)?.getTime() || 0;
        const bDate = getCustomerDate(b)?.getTime() || 0;
        return bDate - aDate;
    });

    const filtered = sortedCustomers.filter(c => {
        const safeName = c?.name || '';
        const safeEmail = c?.email || '';
        const search = searchTerm?.toLowerCase() || '';
        const matchesSearch = safeName.toLowerCase().includes(search) || safeEmail.toLowerCase().includes(search);
        const matchesKyc = kycFilter === 'All' || (c?.kyc || 'unverified').toLowerCase() === kycFilter.toLowerCase();
        const matchesStatus = statusFilter === 'All' || (c?.status || 'active').toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesKyc && matchesStatus;
    });

    return (
        <div className="max-w-[1600px] mx-auto animate-in fade-in duration-300 p-4 md:p-6">

            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Retail Customers</h1>
                    <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">ADMIN</span>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <select
                            value={kycFilter} onChange={(e) => setKycFilter(e.target.value)}
                            className="w-full md:w-auto bg-[#111827] border border-[#1e2d3d] rounded-xl py-2 px-4 text-sm text-gray-300 focus:border-blue-500 outline-none transition-colors cursor-pointer"
                        >
                            <option value="All">All KYC Status</option>
                            <option value="verified">Verified</option>
                            <option value="pending">Pending</option>
                            <option value="unverified">Unverified</option>
                            <option value="rejected">Rejected</option>
                        </select>
                        <select
                            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full md:w-auto bg-[#111827] border border-[#1e2d3d] rounded-xl py-2 px-4 text-sm text-gray-300 focus:border-blue-500 outline-none transition-colors cursor-pointer"
                        >
                            <option value="All">All Accounts</option>
                            <option value="active">Active</option>
                            <option value="frozen">Frozen</option>
                        </select>
                    </div>

                    <div className="relative w-full md:w-64">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text" placeholder="Search name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-[#111827] border border-[#1e2d3d] rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                        />
                    </div>
                </div>
            </div>

            {selectedCustomer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden">

                        <div className="p-6 border-b border-[#1E2533] bg-[#111827] flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xl border border-blue-500/30 uppercase">
                                    {selectedCustomer.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">{selectedCustomer.name}</h2>
                                    <p className="text-sm text-gray-400 font-mono">{selectedCustomer.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedCustomer(null)} className="text-gray-500 hover:text-white transition-colors p-2 bg-[#1E2533] rounded-lg hover:bg-gray-700">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#111827] border border-[#1e2d3d] p-4 rounded-xl">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total Volume</p>
                                    <p className="text-xl font-mono text-white font-bold">{selectedCustomer.volume || 'KES 0'}</p>
                                </div>
                                <div className="bg-[#111827] border border-[#1e2d3d] p-4 rounded-xl">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Risk Profile</p>
                                    <p className={`text-sm font-bold uppercase mt-1 w-fit px-2 py-0.5 rounded ${selectedCustomer.risk === 'high' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                        {selectedCustomer.risk || 'Low'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-[#1e2d3d]">
                                <div className="bg-[#111827] border border-[#1e2d3d] p-4 rounded-xl">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">KYC Status</p>
                                    <p className="text-sm text-white font-bold uppercase">{selectedCustomer.kyc || 'UNVERIFIED'}</p>
                                    <p className="text-[11px] text-gray-400 mt-2">Submitted: {formatDateTime(selectedCustomer.kycSubmittedAt || selectedCustomer.joinedAt)}</p>
                                </div>
                                <div className="bg-[#111827] border border-[#1e2d3d] p-4 rounded-xl">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Joined</p>
                                    <p className="text-sm text-white font-bold">{formatDateTime(selectedCustomer.joinedAt)}</p>
                                    <p className="text-[11px] text-gray-400 mt-2 capitalize">{selectedCustomer.status === 'frozen' ? 'Frozen account' : 'Active account'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 pt-6 border-t border-[#1e2d3d]">
                                <div className="bg-[#111827] border border-[#1e2d3d] p-4 rounded-xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">KYC Details</p>
                                        <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">{selectedCustomer.kycDetails?.documentName ? 'Document on file' : 'No document uploaded'}</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 text-sm text-gray-300">
                                        <div className="flex justify-between gap-4">
                                            <span className="text-gray-500">Legal Name</span>
                                            <span className="font-medium text-white">{selectedCustomer.kycDetails?.fullName || selectedCustomer.name || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="text-gray-500">ID / Passport</span>
                                            <span className="font-medium text-white">{selectedCustomer.kycDetails?.idNumber || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="text-gray-500">Phone</span>
                                            <span className="font-medium text-white">{selectedCustomer.kycDetails?.phone || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="text-gray-500">Email</span>
                                            <span className="font-medium text-white">{selectedCustomer.kycDetails?.email || selectedCustomer.email || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="text-gray-500">Document</span>
                                            <span className="font-medium text-white">{selectedCustomer.kycDetails?.documentName || 'Not uploaded'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-[#1e2d3d]">
                                <button onClick={() => exportStatementCSV(selectedCustomer)} disabled={isExporting} className="flex-1 py-3 bg-[#111827] hover:bg-[#1e2d3d] border border-[#1e2d3d] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                                    <Download className="w-4 h-4 text-emerald-400" /> Export CSV
                                </button>
                                <button onClick={() => exportStatementPDF(selectedCustomer)} disabled={isExporting} className="flex-1 py-3 bg-[#111827] hover:bg-[#1e2d3d] border border-[#1e2d3d] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                                    <FileText className="w-4 h-4 text-blue-400" /> {isExporting ? 'Generating...' : 'Download PDF'}
                                </button>
                                <button onClick={() => handleViewDocs(selectedCustomer.kycDetails)} className="flex-1 py-3 bg-[#111827] hover:bg-[#1e2d3d] border border-[#1e2d3d] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                                    <Eye className="w-4 h-4 text-amber-400" /> View Docs
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl overflow-hidden shadow-xl min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#0a0e17] border-b border-[#1e2d3d] text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                <th className="py-4 px-6">NAME</th>
                                <th className="py-4 px-6">EMAIL</th>
                                <th className="py-4 px-6">JOINED</th>
                                <th className="py-4 px-6">KYC</th>
                                <th className="py-4 px-6">RISK</th>
                                <th className="py-4 px-6">TOTAL VOLUME</th>
                                <th className="py-4 px-6">STATUS</th>
                                <th className="py-4 px-6 text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e2d3d]/50">
                            {isLoading ? (
                                <tr><td colSpan={8} className="py-20 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-3" /></td></tr>
                            ) : filtered.map((c) => (
                                <tr key={c.id} className={`hover:bg-[#1a2a40]/30 transition-colors text-sm ${c?.status === 'frozen' ? 'opacity-50' : ''}`}>
                                    <td className="py-4 px-6 font-bold text-white cursor-pointer hover:text-blue-400 flex items-center gap-2" onClick={() => setSelectedCustomer(c)}>
                                        {c?.name || 'Unknown User'} <Eye className="w-3.5 h-3.5 opacity-50" />
                                    </td>
                                    <td className="py-4 px-6 text-gray-400">{c?.email || 'N/A'}</td>

                                    <td className="py-4 px-6 text-gray-500 font-mono text-xs">{formatDateTime(getCustomerDate(c))}</td>

                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${c?.kyc === 'verified' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' :
                                            c?.kyc === 'rejected' ? 'text-red-400 border-red-500/20 bg-red-500/10' :
                                                c?.kyc === 'pending' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' :
                                                    'text-gray-400 border-gray-500/20 bg-gray-500/10'
                                            }`}>{c?.kyc || 'unverified'}</span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${c?.risk === 'high' ? 'text-red-400 bg-red-500/10 border border-red-500/20' :
                                            c?.risk === 'medium' ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' :
                                                'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                            }`}>{c?.risk || 'low'}</span>
                                    </td>
                                    <td className="py-4 px-6 font-mono text-gray-300">{c?.volume || 'KES 0'}</td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${c?.status === 'active' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                                            }`}>{c?.status || 'active'}</span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <button
                                            onClick={() => handleToggleFreeze(c.id, c.status || 'active')}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${c?.status === 'active' ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20' :
                                                'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/20'
                                                }`}
                                        >
                                            {c?.status === 'active' ? 'Freeze' : 'Unfreeze'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && !isLoading && (
                                <tr><td colSpan={8} className="py-16 text-center text-gray-500">No customers found matching your filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="mt-6 text-center text-gray-500 text-sm">
                Showing {filtered.length} of {customers.length} customers
            </div>
            <div className="mt-6 text-center text-gray-500 text-sm">
                <p className="text-md text-white mt-4"> @ 2026 All Rights Reserved</p>
            </div>
        </div>
    );
}
