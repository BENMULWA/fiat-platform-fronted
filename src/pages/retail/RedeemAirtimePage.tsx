import React, { useState, useEffect } from 'react';
import { Phone, CheckCircle2, AlertCircle, Loader2, ArrowUpRight, Radio, XCircle } from 'lucide-react';
import { redeemAirt, getAirtimeHistory, getAirtimeSummary } from '../../api/client';

export const RedeemAirtimePage = () => {
    // --- Form State ---
    const [selectedCountry, setSelectedCountry] = useState('KE');
    const [selectedNetwork, setSelectedNetwork] = useState('Safaricom');
    const [phone, setPhone] = useState('');
    const [amount, setAmount] = useState('');

    // --- Execution & Toast State ---
    const [isProcessing, setIsProcessing] = useState(false);
    const [toastSuccess, setToastSuccess] = useState('');
    const [toastError, setToastError] = useState('');

    // --- Live Data State ---
    const [history, setHistory] = useState<any[]>([]);
    const [liveBalance, setLiveBalance] = useState(0.0);

    const numericAmount = parseFloat(amount) || 0;

    const countries = [
        { code: 'KE', name: 'Kenya', active: true },
        { code: 'TZ', name: 'Tanzania', active: false },
        { code: 'UG', name: 'Uganda', active: false },
        { code: 'RW', name: 'Rwanda', active: false },
    ];

    const networks = [
        { id: 'Safaricom', name: 'Safaricom', active: true },
        { id: 'Airtel', name: 'Airtel', active: true },
        { id: 'Telkom', name: 'Telkom', active: true },
        { id: 'MTN', name: 'MTN', active: false },
        { id: 'Equitel', name: 'Equitel', active: false },
    ];

    const fetchData = async () => {
        try {
            const [histRes, sumRes] = await Promise.allSettled([
                getAirtimeHistory(),
                getAirtimeSummary()
            ]);
            if (histRes.status === 'fulfilled' && histRes.value.data?.history) {
                setHistory(histRes.value.data.history);
            }
            if (sumRes.status === 'fulfilled' && sumRes.value.data) {
                setLiveBalance(sumRes.value.data.live_artm_balance || 0.0);
            }
        } catch (err) {
            console.error("Failed to fetch airtime data", err);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    // --- Strict Network & Format Validator ---
    const validatePhoneForNetwork = (phoneNumber: string, network: string, country: string) => {
        // Strip everything except numbers
        const cleanPhone = phoneNumber.replace(/\D/g, '');

        if (country === 'KE') {
            // Must be exactly 10 digits (07...) or 12 digits (2547...)
            if (cleanPhone.length !== 10 && cleanPhone.length !== 12) {
                return { valid: false, msg: "Kenyan phone numbers must be 10 or 12 digits.", formatted: "" };
            }

            // Normalize to 10-digit format (07...) just for validation
            const normalized = cleanPhone.length === 12 ? '0' + cleanPhone.slice(3) : cleanPhone;
            // The format the API actually wants (2547...)
            const apiFormatted = cleanPhone.length === 10 ? '254' + cleanPhone.slice(1) : cleanPhone;

            // Strict Prefix Checkers
            const safaricomRegex = /^0(7([01249][0-9]|5[7-9]|6[8-9])|11[0-5])[0-9]{6}$/;
            const airtelRegex = /^0(7(3[0-9]|5[0-6]|8[0-9])|10[0-2])[0-9]{6}$/;
            const telkomRegex = /^077[0-9]{7}$/;

            if (network === 'Safaricom' && !safaricomRegex.test(normalized)) {
                return { valid: false, msg: "This phone number does not match Safaricom's network prefixes.", formatted: "" };
            }
            if (network === 'Airtel' && !airtelRegex.test(normalized)) {
                return { valid: false, msg: "This phone number does not match Airtel's network prefixes.", formatted: "" };
            }
            if (network === 'Telkom' && !telkomRegex.test(normalized)) {
                return { valid: false, msg: "This phone number does not match Telkom's network prefixes.", formatted: "" };
            }

            return { valid: true, msg: "", formatted: apiFormatted };
        }

        return { valid: true, msg: "", formatted: cleanPhone };
    };

    const handleExecute = async (e: React.FormEvent) => {
        e.preventDefault();
        setToastError('');
        setToastSuccess('');

        // 1. Basic Checks
        if (numericAmount <= 0 || !phone) {
            setToastError('Please enter a valid amount and phone number.');
            setTimeout(() => setToastError(''), 4000);
            return;
        }

        // Minimum Telecom Value limits
        if (numericAmount < 1) {
            setToastError('Most telecom providers require a minimum airtime purchase of 1.00 KES.');
            setTimeout(() => setToastError(''), 5000);
            return;
        }

        // 2. Strict Network Validation
        const validation = validatePhoneForNetwork(phone, selectedNetwork, selectedCountry);
        if (!validation.valid) {
            setToastError(validation.msg);
            setTimeout(() => setToastError(''), 5000);
            return;
        }

        setIsProcessing(true);

        try {
            // 3. Fire the API with the auto-formatted number (e.g. 2547...)
            await redeemAirt({
                amount: numericAmount,
                phone: validation.formatted,
                provider: selectedNetwork.toUpperCase()
            });

            // 4. Handle Success
            setToastSuccess(`Successfully disbursed ${numericAmount.toFixed(2)} KES Airtime to ${validation.formatted}!`);

            // Optimistically insert a "Completed" record into the history immediately
            const newHistoryItem = {
                id: `TXN_${Date.now()}`,
                amount: numericAmount,
                network: selectedNetwork,
                time: 'Just now',
                status: 'Completed'
            };
            setHistory(prev => [newHistoryItem, ...prev]);

            await fetchData(); // Sync true state in background

            setTimeout(() => {
                setToastSuccess('');
                setAmount('');
                setPhone('');
            }, 5000);

        } catch (err: any) {
            // 5. Handle Failure
            const errorDetail = err.response?.data?.detail || err.response?.data?.message || "Transaction failed at the telecom level.";
            setToastError(errorDetail);

            // Optimistically insert a "Failed" record so user knows it dropped
            const failedHistoryItem = {
                id: `TXN_FAIL_${Date.now()}`,
                amount: numericAmount,
                network: selectedNetwork,
                time: 'Just now',
                status: 'Failed',
                reason: errorDetail
            };
            setHistory(prev => [failedHistoryItem, ...prev]);

            setTimeout(() => setToastError(''), 6000);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto animate-in fade-in duration-500 p-4 md:p-6 text-gray-200">

            {/* Header Section */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Phone className="w-6 h-6 text-blue-400" /> Convert Airtime to Cash
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Instantly liquidate your prepaid mobile airtime into your digital wallet or mobile money.
                    </p>
                </div>
            </div>

            {/* TOAST NOTIFICATIONS */}
            {toastError && (
                <div className="mb-6 px-4 py-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-sm font-bold shadow-lg animate-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 shrink-0" /> {toastError}
                </div>
            )}
            {toastSuccess && (
                <div className="mb-6 px-4 py-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-400 text-sm font-bold shadow-lg animate-in slide-in-from-top-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0" /> {toastSuccess}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT COLUMN: ACTION ENGINE */}
                <div className="lg:col-span-7 bg-[#0B0E14] border border-[#1E2533] rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />

                    <form onSubmit={handleExecute} className="space-y-6 relative z-10">

                        {/* Amount Input with Live Float */}
                        <div className="bg-[#0F1520] border border-[#1E2533] rounded-2xl p-5 focus-within:border-blue-500/50 transition-colors">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Amount to Redeem</span>
                                <span className="text-[10px] text-blue-400 font-mono font-bold bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 flex items-center gap-1.5 shadow-sm">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                                    Live API Float: {liveBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="bg-transparent text-4xl font-bold w-full outline-none text-white placeholder-gray-700"
                                    required
                                />
                                <div className="flex items-center gap-2 bg-[#172130] px-4 py-2.5 rounded-xl shrink-0 border border-[#1E2533]">
                                    <Radio className="w-5 h-5 text-blue-400" />
                                    <span className="font-bold text-white">KES</span>
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Country Selector Grid */}
                        <div className="pt-2">
                            <label className="block text-[11px] font-bold text-gray-500 mb-3 uppercase tracking-wider">
                                Target Jurisdiction
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {countries.map((c) => (
                                    <button
                                        key={c.code}
                                        type="button"
                                        disabled={!c.active}
                                        onClick={() => setSelectedCountry(c.code)}
                                        className={`p-3 rounded-xl border flex flex-col items-center justify-center relative transition-all ${!c.active
                                                ? 'bg-[#06090F]/50 border-dashed border-[#1E2533] text-gray-600 cursor-not-allowed'
                                                : selectedCountry === c.code
                                                    ? 'bg-[#172130] border-blue-500 text-white font-bold shadow-lg shadow-blue-900/10'
                                                    : 'bg-[#0F1520] border-[#1E2533] text-gray-400 hover:border-gray-500'
                                            }`}
                                    >
                                        <span className="text-sm">{c.name}</span>
                                        {!c.active && (
                                            <span className="absolute top-1 right-1 text-[8px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                                                Soon
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dynamic Network Selector Grid */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-3 uppercase tracking-wider">
                                Carrier Networks
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {networks.map((net) => (
                                    <button
                                        key={net.id}
                                        type="button"
                                        disabled={!net.active}
                                        onClick={() => setSelectedNetwork(net.id)}
                                        className={`p-3 rounded-xl border flex flex-col items-center justify-center relative transition-all ${!net.active
                                                ? 'bg-[#06090F]/50 border-dashed border-[#1E2533] text-gray-600 cursor-not-allowed'
                                                : selectedNetwork === net.id
                                                    ? 'bg-[#172130] border-blue-500 text-white font-bold shadow-lg shadow-blue-900/10'
                                                    : 'bg-[#0F1520] border-[#1E2533] text-gray-400 hover:border-gray-500'
                                            }`}
                                    >
                                        <span className="text-xs">{net.name}</span>
                                        {!net.active && (
                                            <span className="absolute top-1 right-1 text-[8px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                                                Soon
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Phone Number Input */}
                        <div className="bg-[#0F1520] border border-[#1E2533] rounded-xl p-4 flex items-center gap-3 focus-within:border-blue-500/50 transition-colors pt-4 mt-6">
                            <Phone className="w-5 h-5 text-gray-500" />
                            <div className="flex-1">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">
                                    Destination Phone Number
                                </span>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="bg-transparent w-full outline-none text-sm text-gray-200 font-mono"
                                    placeholder="e.g. 07XXXXXXXX or 2547XXXXXXXX"
                                    required
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isProcessing || numericAmount <= 0}
                            className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 mt-4 
                ${isProcessing
                                    ? 'bg-[#172130] text-gray-400 cursor-wait border border-[#1E2533]'
                                    : numericAmount > 0
                                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 active:scale-[0.98]'
                                        : 'bg-[#0F1520] text-gray-500 border border-[#1E2533] cursor-not-allowed'
                                }`}
                        >
                            {isProcessing ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Processing Network Request...</>
                            ) : (
                                'Submit Airtime Redemption'
                            )}
                        </button>
                    </form>
                </div>

                {/* RIGHT COLUMN: HISTORY PANEL */}
                <div className="lg:col-span-5 bg-[#0B0E14] border border-[#1E2533] rounded-3xl p-6 shadow-xl flex flex-col h-fit min-h-[500px]">
                    <h3 className="text-white font-bold text-lg mb-6 border-b border-[#1E2533] pb-4">Withdrawal history</h3>
                    <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {history.map((item: any) => {
                            const isFailed = item.status === 'Failed' || item.status?.toLowerCase() === 'failed';
                            const isProcessing = item.status === 'Processing';

                            return (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-[#0F1520] border border-[#1E2533] rounded-2xl hover:border-gray-600 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 ${isFailed ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                                            {isFailed ? <XCircle className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold font-mono ${isFailed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                                {item.amount.toFixed(2)} KES
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">{item.network} · {item.time}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${isFailed ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                isProcessing ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            }`}>
                                            {item.status || 'Completed'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        {history.length === 0 && (
                            <div className="text-center py-16 border-2 border-dashed border-[#1E2533] rounded-2xl flex flex-col items-center justify-center">
                                <Phone className="w-8 h-8 text-gray-600 mb-3" />
                                <p className="text-sm text-slate-500 font-medium">No recent activity.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};