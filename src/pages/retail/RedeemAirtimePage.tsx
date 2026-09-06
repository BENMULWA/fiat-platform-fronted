// IMPORTANT: Python backend filters must fetch history by userId! 
// See the explanation above to fix the data leak.
import React, { useState, useEffect } from 'react';
import {
    Phone, CheckCircle2, AlertCircle, Loader2, ArrowUpRight, Radio, XCircle,
    Shield, Fingerprint, BadgeCheck, Zap, X, Info
} from 'lucide-react';
import { redeemAirt, getAirtimeHistory, getRetailWallet } from '../../api/client';

// Used to sanity-check the `network` field on history rows before displaying
// it — see the comment at the render site below for why this exists.
const TELCO_NETWORKS = ['Safaricom', 'Airtel', 'Telkom', 'MTN', 'Equitel'];

export const RedeemAirtimePage = () => {
    const [selectedCountry, setSelectedCountry] = useState('KE');
    const [selectedNetwork, setSelectedNetwork] = useState('Airtel');
    const [phone, setPhone] = useState('');
    const [amount, setAmount] = useState('');

    const [isProcessing, setIsProcessing] = useState(false);
    const [toastSuccess, setToastSuccess] = useState('');
    const [toastError, setToastError] = useState('');

    const [history, setHistory] = useState<any[]>([]);
    const [historyPage, setHistoryPage] = useState(0);
    const HISTORY_PAGE_SIZE = 10;
    const [airtBalance, setAirtBalance] = useState(0.0);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const numericAmount = parseFloat(amount) || 0;

    const countries = [
        { code: 'KE', name: 'Kenya', active: true },
        { code: 'TZ', name: 'Tanzania', active: false },
        { code: 'UG', name: 'Uganda', active: false },
        { code: 'RW', name: 'Rwanda', active: false },
    ];
    const activeCountries = countries.filter(c => c.active);
    // The country picker only matters once there's more than one real choice.
    // With a single active country, a grid of mostly-disabled "SOON" buttons
    // is something a new user has to read and dismiss before finding the
    // field that actually matters — so it's collapsed to a plain statement
    // below instead of an interactive control.
    const showCountryPicker = activeCountries.length > 1;

    // `status` distinguishes two different reasons a network can't be picked:
    // 'paused' = it worked before and will again, just not through the current
    // gateway (Safaricom/Telkom) — 'comingSoon' = never built yet (MTN/Equitel).
    // Conflating the two under one "SOON" badge told Safaricom/Telkom users
    // something false: that support was still pending, not paused.
    const networks: { id: string; name: string; active: boolean; status?: 'paused' | 'comingSoon' }[] = [
        { id: 'Airtel', name: 'Airtel', active: true },
        { id: 'Safaricom', name: 'Safaricom', active: false, status: 'paused' },
        { id: 'Telkom', name: 'Telkom', active: false, status: 'paused' },
        { id: 'MTN', name: 'MTN', active: false, status: 'comingSoon' },
        { id: 'Equitel', name: 'Equitel', active: false, status: 'comingSoon' },
    ];

    const fetchData = async () => {
        try {
            const [histRes, walletRes] = await Promise.allSettled([
                getAirtimeHistory(),
                getRetailWallet()
            ]);
            if (histRes.status === 'fulfilled' && histRes.value.data?.history) {
                setHistory(histRes.value.data.history);
            }
            if (walletRes.status === 'fulfilled' && walletRes.value.data?.balances) {
                setAirtBalance(Number(walletRes.value.data.balances.AIRT || 0));
            }
        } catch (err) {
            console.error("Failed to fetch airtime data", err);
        }
    };

    useEffect(() => {
        // Keeps the current page from pointing past the end when a poll
        // refresh shrinks the list.
        setHistoryPage(p => Math.min(p, Math.max(0, Math.ceil(history.length / HISTORY_PAGE_SIZE) - 1)));
    }, [history.length]);

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
        if (numericAmount > airtBalance) { setToastError(`Insufficient AIRT balance. You have ${airtBalance.toLocaleString()} AIRT.`); return; }
        if (numericAmount < 1) { setToastError('Minimum airtime purchase is 1 KES.'); return; }
        // Backend requires a whole-number KES amount (see airtime_ledger.py redeem_airtime) —
        // catch fractional entries here instead of letting them round-trip to a 502.
        if (!Number.isInteger(numericAmount)) { setToastError('Amount must be a whole number of KES (no decimals).'); return; }

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
                        <p className="text-gray-400 mt-1 text-[15px]">Redeem your tokenized airtime balance to any supported phone.</p>
                    </div>
                </div>

                {/* Live Float Pill */}
                <div className="flex items-center gap-3 bg-[#111827] border border-[#1E2533] rounded-full px-5 py-2.5">
                    <span className="text-xs text-gray-500">AIRT balance</span>
                    <span className="text-sm font-bold text-blue-400">{airtBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} AIRT</span>
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

                    {/* LEFT: FORM ENGINE — broken into numbered steps with real dividers
                        between them, instead of identically-styled sections stacked
                        back to back with no visual break. */}
                    <div className="lg:col-span-7 bg-[#111827] border-r border-[#1E2533] p-6 md:p-8">
                        <form onSubmit={handleExecute} className="space-y-7">

                            {/* Step 1: Amount */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                                    <label className="text-sm font-bold text-gray-300">How much airtime?</label>
                                </div>
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
                                {/* AIRT and KES are pegged 1:1 for this redemption, but the balance
                                    pill up top reads in AIRT while this field reads in KES — spelling
                                    out the equivalence here removes the need to do that math mentally. */}
                                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5 shrink-0" />
                                    {numericAmount > 0
                                        ? `This uses ${numericAmount.toFixed(2)} AIRT from your balance (1 AIRT = 1 KES).`
                                        : '1 AIRT is worth 1 KES of airtime.'}
                                </p>
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

                            <div className="border-t border-[#1E2533]" />

                            {/* Step 2: Network. Country is folded in here as a plain statement,
                                not a picker — see showCountryPicker above for why. */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                                    <label className="text-sm font-bold text-gray-300">Which network?</label>
                                    {!showCountryPicker && (
                                        <span className="text-xs text-gray-500">— for phones in {activeCountries[0]?.name || 'Kenya'}</span>
                                    )}
                                </div>

                                {showCountryPicker && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
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
                                )}

                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    {networks.map((net) => (
                                        <button key={net.id} type="button" disabled={!net.active} onClick={() => setSelectedNetwork(net.id)}
                                            className={`p-3 rounded-xl border text-xs font-bold transition-all relative ${!net.active ? 'bg-[#0B0E14]/30 border-[#1E2533]/30 text-gray-600 cursor-not-allowed opacity-60' : selectedNetwork === net.id ? 'bg-blue-500/10 text-blue-400 border-blue-500/40 shadow-md' : 'bg-[#0B0E14] text-gray-400 border-[#1E2533] hover:border-gray-500'}`}
                                        >
                                            {net.name}
                                            {net.status === 'paused' && (
                                                <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-bold tracking-wider border border-amber-500/20">PAUSED</span>
                                            )}
                                            {net.status === 'comingSoon' && (
                                                <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded font-bold tracking-wider border border-cyan-500/20">SOON</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-600 mt-2">
                                    Safaricom and Telkom top-ups are temporarily paused — Airtel numbers only for now.
                                </p>
                                {!showCountryPicker && (
                                    <p className="text-xs text-gray-600 mt-1">More countries are on the way — Tanzania, Uganda and Rwanda aren't live yet.</p>
                                )}
                            </div>

                            <div className="border-t border-[#1E2533]" />

                            {/* Step 3: Phone number */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
                                    <label className="text-sm font-bold text-gray-300">Whose phone gets it?</label>
                                </div>
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
                                <p className="text-xs text-gray-600 mt-2">Can be your own number or someone else's — airtime lands on whatever number you enter.</p>
                            </div>

                            {/* Submit Button */}
                            <button type="submit" disabled={isProcessing || numericAmount <= 0}
                                className="w-full py-4 px-4 rounded-xl font-extrabold text-[15px] tracking-wide transition-all duration-300 flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-[0_0_30px_rgba(59,130,246,0.2)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none mt-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
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
                                {history.length > 0 ? history.slice(historyPage * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE + HISTORY_PAGE_SIZE).map((item: any) => {
                                    const isFailed = item.status?.toLowerCase() === 'failed';
                                    // Bug fix: some rows were showing values like "Cardano" here —
                                    // that's a blockchain, not a telco carrier. It looks like
                                    // `item.network` is sometimes populated with the chain that
                                    // funded the AIRT balance rather than the phone network the
                                    // airtime was redeemed to. Displaying that as-is tells a user
                                    // their Safaricom top-up went out over "Cardano," which is
                                    // simply wrong information. Until the backend separates
                                    // "funding source" from "redemption carrier" (see the header
                                    // comment on data scoping), only show the network when it's a
                                    // real telco; otherwise fall back to a neutral label.
                                    const displayNetwork = TELCO_NETWORKS.includes(item.network) ? item.network : 'Airtime top-up';
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
                                                    <p className="text-[11px] text-gray-500 mt-0.5">{displayNetwork} · {item.time}</p>
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

                            {history.length > HISTORY_PAGE_SIZE && (
                                <div className="px-5 py-3 border-t border-[#1E2533] bg-[#0B0E14]/50 flex items-center justify-between">
                                    <button
                                        onClick={() => setHistoryPage(p => Math.max(0, p - 1))}
                                        disabled={historyPage === 0}
                                        className="text-xs font-bold text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-[11px] text-gray-500 font-mono">
                                        Page {historyPage + 1} of {Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE))}
                                    </span>
                                    <button
                                        onClick={() => setHistoryPage(p => Math.min(Math.ceil(history.length / HISTORY_PAGE_SIZE) - 1, p + 1))}
                                        disabled={historyPage >= Math.ceil(history.length / HISTORY_PAGE_SIZE) - 1}
                                        className="text-xs font-bold text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
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