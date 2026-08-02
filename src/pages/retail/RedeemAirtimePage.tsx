// IMPORTANT: Python backend filters must fetch history by userId! 
// See the explanation above to fix the data leak.
import React, { useState, useEffect } from 'react';
import {
    Phone, CheckCircle2, AlertCircle, Loader2, ArrowUpRight, Radio, XCircle,
    Shield, Fingerprint, BadgeCheck, Zap, X
} from 'lucide-react';
import { redeemAirt, getAirtimeHistory, getAirtimeSummary } from '../../api/client';

export const RedeemAirtimePage = () => {
    const [selectedCountry, setSelectedCountry] = useState('KE');
    const [selectedNetwork, setSelectedNetwork] = useState('Safaricom');
    const [phone, setPhone] = useState('');
    const [amount, setAmount] = useState('');

    const [isProcessing, setIsProcessing] = useState(false);
    const [toastSuccess, setToastSuccess] = useState('');
    const [toastError, setToastError] = useState('');

    const [history, setHistory] = useState<any[]>([]);
    const [liveBalance, setLiveBalance] = useState(0.0);
    const [focusedField, setFocusedField] = useState<string | null>(null);

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

    const validatePhoneForNetwork = (phoneNumber: string, network: string, country: string) => {
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        if (country === 'KE') {
            if (cleanPhone.length !== 10 && cleanPhone.length !== 12) {
                return { valid: false, msg: "Kenyan phone numbers must be 10 or 12 digits.", formatted: "" };
            }
            const normalized = cleanPhone.length === 12 ? '0' + cleanPhone.slice(3) : cleanPhone;
            const apiFormatted = cleanPhone.length === 10 ? '254' + cleanPhone.slice(1) : cleanPhone;

            const safaricomRegex = /^0(7([01249][0-9]|5[7-9]|6[8-9])|11[0-5])[0-9]{6}$/;
            const airtelRegex = /^0(7(3[0-9]|5[0-6]|8[0-9])|10[0-2])[0-9]{6}$/;
            const telkomRegex = /^077[0-9]{7}$/;

            if (network === 'Safaricom' && !safaricomRegex.test(normalized)) return { valid: false, msg: "Invalid Safaricom prefix.", formatted: "" };
            if (network === 'Airtel' && !airtelRegex.test(normalized)) return { valid: false, msg: "Invalid Airtel prefix.", formatted: "" };
            if (network === 'Telkom' && !telkomRegex.test(normalized)) return { valid: false, msg: "Invalid Telkom prefix.", formatted: "" };
            return { valid: true, msg: "", formatted: apiFormatted };
        }
        return { valid: true, msg: "", formatted: cleanPhone };
    };

    const handleExecute = async (e: React.FormEvent) => {
        e.preventDefault();
        setToastError(''); setToastSuccess('');
        if (numericAmount <= 0 || !phone) { setToastError('Enter a valid amount and phone number.'); return; }
        if (numericAmount < 1) { setToastError('Minimum airtime purchase is 1.00 KES.'); return; }

        const validation = validatePhoneForNetwork(phone, selectedNetwork, selectedCountry);
        if (!validation.valid) { setToastError(validation.msg); return; }

        setIsProcessing(true);
        try {
            await redeemAirt({ amount: numericAmount, phone: validation.formatted, provider: selectedNetwork.toUpperCase() });
            setToastSuccess(`Successfully redeemed ${numericAmount.toFixed(2)} KES to ${validation.formatted}!`);
            setHistory(prev => [{ id: `TXN_${Date.now()}`, amount: numericAmount, network: selectedNetwork, time: 'Just now', status: 'Completed' }, ...prev]);
            await fetchData();
            setTimeout(() => { setToastSuccess(''); setAmount(''); setPhone(''); }, 5000);
        } catch (err: any) {
            const errorDetail = err.response?.data?.detail || err.response?.data?.message || "Transaction failed at the telecom level.";
            setToastError(errorDetail);
            setHistory(prev => [{ id: `TXN_FAIL_${Date.now()}`, amount: numericAmount, network: selectedNetwork, time: 'Just now', status: 'Failed' }, ...prev]);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-[1200px] mx-auto animate-in fade-in zoom-in-95 duration-300 pt-4 px-4 md:px-0 text-gray-200">

            {/* Header Section */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20">
                        <Zap className="w-7 h-7 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            Airtime Redemption
                        </h2>
                        <p className="text-gray-400 mt-1 text-[15px]">Instantly liquidate prepaid airtime to wallet cash.</p>
                    </div>
                </div>

                {/* Live Float Pill */}
                <div className="flex items-center gap-3 bg-[#111827] border border-[#1E2533] rounded-full px-5 py-2.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-xs text-gray-500">API Float</span>
                    <span className="text-sm font-bold text-blue-400">{liveBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} KES</span>
                </div>
            </div>

            {/* Toast Notifications (Added Dismiss Buttons) */}
            <div className="space-y-3 mb-6">
                {toastError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span className="flex-1">{toastError}</span>
                        <button onClick={() => setToastError('')} className="text-red-400/50 hover:text-red-400 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                )}
                {toastSuccess && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span className="flex-1">{toastSuccess}</span>
                        <button onClick={() => setToastSuccess('')} className="text-emerald-400/50 hover:text-emerald-400 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                )}
            </div>

            <div className="bg-[#0F1520] border border-[#1E2533] shadow-2xl rounded-3xl overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">

                    {/* LEFT: FORM ENGINE */}
                    <div className="lg:col-span-7 bg-[#111827] border-r border-[#1E2533] p-6 md:p-8">
                        <form onSubmit={handleExecute} className="space-y-6">

                            {/* Amount Input */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Amount to Redeem</label>
                                <div className={`relative transition-all duration-200 rounded-xl ${focusedField === 'amount' ? 'ring-2 ring-blue-500/20' : ''}`}>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        onFocus={() => setFocusedField('amount')}
                                        onBlur={() => setFocusedField(null)}
                                        placeholder="0.00"
                                        className="w-full bg-[#0B0E14] border border-[#1E2533] focus:border-blue-500/50 outline-none rounded-xl py-4 pl-5 pr-20 text-xl font-bold text-white transition-all font-mono placeholder-gray-600"
                                        required
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <span className="font-bold text-blue-400">KES</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-3">
                                    {[50, 100, 200, 500, 1000].map(preset => (
                                        <button
                                            key={preset} type="button"
                                            onClick={() => setAmount(preset.toString())}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${numericAmount === preset ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-[#0B0E14] text-gray-500 border-[#1E2533] hover:border-gray-500 hover:text-gray-400'}`}
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Country Selector */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Target Jurisdiction</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {countries.map((c) => (
                                        <button key={c.code} type="button" disabled={!c.active} onClick={() => setSelectedCountry(c.code)}
                                            className={`p-3 rounded-xl border text-sm font-medium transition-all relative ${!c.active ? 'bg-[#0B0E14]/30 border-[#1E2533]/30 text-gray-600 cursor-not-allowed opacity-60' : selectedCountry === c.code ? 'bg-blue-500/10 text-blue-400 border-blue-500/40 shadow-md' : 'bg-[#0B0E14] text-gray-400 border-[#1E2533] hover:border-gray-500'}`}
                                        >
                                            {c.name}
                                            {!c.active && (
                                                <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded font-bold tracking-wider border border-cyan-500/20">SOON</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Network Selector */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Carrier Network</label>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    {networks.map((net) => (
                                        <button key={net.id} type="button" disabled={!net.active} onClick={() => setSelectedNetwork(net.id)}
                                            className={`p-3 rounded-xl border text-xs font-bold transition-all relative ${!net.active ? 'bg-[#0B0E14]/30 border-[#1E2533]/30 text-gray-600 cursor-not-allowed opacity-60' : selectedNetwork === net.id ? 'bg-blue-500/10 text-blue-400 border-blue-500/40 shadow-md' : 'bg-[#0B0E14] text-gray-400 border-[#1E2533] hover:border-gray-500'}`}
                                        >
                                            {net.name}
                                            {!net.active && (
                                                <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded font-bold tracking-wider border border-cyan-500/20">SOON</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Phone Number Input */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Destination Phone Number</label>
                                <div className={`relative transition-all duration-200 rounded-xl ${focusedField === 'phone' ? 'ring-2 ring-blue-500/20' : ''}`}>
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                                        onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)}
                                        placeholder="e.g. 07XXXXXXXX or 2547XXXXXXXX"
                                        className="w-full bg-[#0B0E14] border border-[#1E2533] focus:border-blue-500/50 outline-none rounded-xl py-3.5 pl-11 pr-12 text-sm text-white transition-all font-mono placeholder-gray-600"
                                        required
                                    />
                                    {phone && <button type="button" onClick={() => setPhone('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">✕</button>}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button type="submit" disabled={isProcessing || numericAmount <= 0}
                                className="w-full py-4 px-4 rounded-xl font-extrabold text-[15px] tracking-wide transition-all duration-300 flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-[0_0_30px_rgba(59,130,246,0.2)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none mt-4"
                            >
                                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radio className="w-5 h-5" />}
                                {isProcessing ? 'Processing Network Request...' : 'Submit Airtime Redemption'}
                            </button>
                        </form>
                    </div>

                    {/* RIGHT: HISTORY PANEL */}
                    <div className="lg:col-span-5 bg-[#0F1520] p-6 md:p-8 space-y-5">
                        <div className="bg-[#111827] border border-[#1E2533] rounded-2xl overflow-hidden flex flex-col h-full min-h-[500px]">
                            <div className="px-5 py-3 border-b border-[#1E2533] bg-[#0B0E14]/50">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <ArrowUpRight className="w-3.5 h-3.5" /> Recent Redemptions
                                </h3>
                            </div>

                            <div className="p-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                                {history.length > 0 ? history.map((item: any) => {
                                    const isFailed = item.status?.toLowerCase() === 'failed';
                                    return (
                                        <div key={item.id} className="flex items-center justify-between p-3.5 bg-[#0B0E14] border border-[#1E2533] rounded-xl hover:border-gray-600/50 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 transition-colors ${isFailed ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                                                    {isFailed ? <XCircle className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-bold font-mono ${isFailed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                                        {(parseFloat(item.amount) || 0).toFixed(2)} KES
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 mt-0.5">{item.network} · {item.time}</p>
                                                </div>
                                            </div>
                                            <span className={`text-[9px] font-bold px-2 py-1 rounded-md border uppercase tracking-wider ${isFailed ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                                {item.status || 'Completed'}
                                            </span>
                                        </div>
                                    );
                                }) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-16 border-2 border-dashed border-[#1E2533] rounded-2xl">
                                        <Phone className="w-8 h-8 text-gray-600 mb-3" />
                                        <p className="text-sm text-gray-500 font-medium">No recent activity.</p>
                                        <p className="text-xs text-gray-600 mt-1">Completed redemptions will appear here.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Trust Footer */}
                        <div className="flex items-center justify-center gap-4 pt-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-600"><Shield className="w-3 h-3" /> 256-bit SSL</div>
                            <div className="w-1 h-1 rounded-full bg-gray-700" />
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-600"><Fingerprint className="w-3 h-3" /> 2FA Protected</div>
                            <div className="w-1 h-1 rounded-full bg-gray-700" />
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-600"><BadgeCheck className="w-3 h-3" /> Telco Verified</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};