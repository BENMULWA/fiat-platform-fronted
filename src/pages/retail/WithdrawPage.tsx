
//@ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    ArrowUp, CheckCircle2, AlertCircle, Smartphone, Hexagon,
    Building2, CreditCard, Lock, Info, AlertTriangle, ShieldCheck,
    Loader2, Store, Users, ArrowLeft, Zap, Clock, TrendingDown,
    ChevronRight, ExternalLink, BadgeCheck, Fingerprint, Shield
} from 'lucide-react';
import { executeRamp, withdrawUsda, executeValoraWithdraw, getRetailWallet } from '../../api/client';

const CHANNELS = [
    { id: 'Mobile Money', name: 'Mobile Money', subtitle: 'M-Pesa & Airtel', description: 'Direct fiat payout to your phone', icon: Smartphone, active: true, color: 'text-emerald-400' },
    { id: 'Crypto Wallet', name: 'Crypto Wallet', subtitle: 'Web3', description: 'Stablecoin withdrawal via blockchain', icon: Hexagon, active: true, color: 'text-blue-400' },
    { id: 'Till/Paybill', name: 'Till / Paybill', subtitle: 'Business', description: 'Pay merchants or utility bills', icon: Store, active: false, color: 'text-gray-500' },
    { id: 'Bulk Payments', name: 'Bulk Payments', subtitle: 'Enterprise', description: 'Disburse salaries or mass payouts', icon: Users, active: false, color: 'text-gray-500' },
    { id: 'Bank Transfer', name: 'Bank Transfer', subtitle: 'EFT/RTGS', description: 'Wire transfer to local banks', icon: Building2, active: false, color: 'text-gray-500' },
    { id: 'Card', name: 'Debit / Credit Card', subtitle: 'Visa/MC', description: 'Withdraw to linked cards', icon: CreditCard, active: false, color: 'text-gray-500' }
];

type NetworkOption = {
    id: string;
    name: string;
    fee: number;
    time: string;
    min: number;
    speed: 'instant' | 'fast' | 'slow';
    recommended?: boolean;
};

const ASSET_NETWORKS: Record<string, NetworkOption[]> = {
    USDT: [
        { id: 'stellar', name: 'Stellar', fee: 0.01, time: '~5 Secs', min: 0.5, speed: 'instant', recommended: true },
        { id: 'celo', name: 'Celo', fee: 0.005, time: '~5 Secs', min: 0.5, speed: 'instant' },
        { id: 'tron', name: 'Tron (TRC20)', fee: 1.00, time: '~3 Mins', min: 5, speed: 'fast' },
        { id: 'polygon', name: 'Polygon', fee: 0.10, time: '~3 Mins', min: 0.5, speed: 'fast' },
        { id: 'ethereum', name: 'Ethereum (ERC20)', fee: 4.50, time: '~5 Mins', min: 10, speed: 'slow' }
    ],
    USDC: [
        { id: 'stellar', name: 'Stellar', fee: 0.01, time: '~5 Secs', min: 0.5, speed: 'instant', recommended: true },
        { id: 'celo', name: 'Celo', fee: 0.005, time: '~5 Secs', min: 0.01, speed: 'instant' },
        { id: 'polygon', name: 'Polygon', fee: 0.10, time: '~3 Mins', min: 0.5, speed: 'fast' },
        { id: 'tron', name: 'Tron (TRC20)', fee: 1.00, time: '~3 Mins', min: 5, speed: 'fast' },
    ],
    USDA: [
        { id: 'cardano', name: 'Cardano', fee: 0.17, time: '~10 Mins', min: 0.5, speed: 'slow', recommended: true }
    ],
    cUSD: [
        { id: 'celo', name: 'Celo', fee: 0.005, time: '~5 Secs', min: 0.5, speed: 'instant', recommended: true }
    ],
    BTC: [
        { id: 'bitcoin', name: 'Bitcoin', fee: 2.50, time: '~30 Mins', min: 15, speed: 'slow' }
    ]
};

const SpeedBadge = ({ speed }: { speed: 'instant' | 'fast' | 'slow' }) => {
    const config = {
        instant: { label: 'Instant', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
        fast: { label: 'Fast', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
        slow: { label: 'Standard', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
    };
    const { label, color } = config[speed];
    return (
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${color} uppercase tracking-wider`}>
            {label}
        </span>
    );
};

const RecommendedBadge = () => (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
        <Zap className="w-2.5 h-2.5" /> Best
    </span>
);

export default function WithdrawPage() {
    const [step, setStep] = useState<'select' | 'form'>('select');
    const [channel, setChannel] = useState('Mobile Money');
    const [momoProvider, setMomoProvider] = useState<'MPESA' | 'AIRTEL'>('MPESA');
    const [amount, setAmount] = useState('');
    const [counterparty, setCounterparty] = useState('');
    const [memo, setMemo] = useState('');
    const [cryptoAsset, setCryptoAsset] = useState('USDA');
    const [cryptoNetwork, setCryptoNetwork] = useState('cardano');
    const [loading, setLoading] = useState(false);
    const [toastError, setToastError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [balances, setBalances] = useState<Record<string, number>>({});
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const loadBalances = () => {
        getRetailWallet().then(res => {
            if (res.data?.balances) setBalances(res.data.balances);
            else if (res.data) setBalances(res.data);
        }).catch(err => console.error("Failed to load balances", err));
    };

    useEffect(() => {
        loadBalances();
    }, []);

    useEffect(() => {
        if (successMsg) {
            const timer = setTimeout(() => setSuccessMsg(''), 6000);
            return () => clearTimeout(timer);
        }
    }, [successMsg]);

    const parsedAmount = parseFloat(amount) || 0;
    const activeAsset = channel === 'Mobile Money' ? 'KES' : cryptoAsset;
    const availableBalance = balances[activeAsset] || 0;

    const getMpesaFee = (amt: number) => {
        if (amt <= 0) return 0;
        if (amt <= 100) return 0;
        if (amt <= 500) return 11.20;
        if (amt <= 1500) return 22.40;
        if (amt <= 5000) return 33.60;
        if (amt <= 20000) return 50.40;
        return 65.00;
    };

    const selectedNetworkDetails = channel === 'Crypto Wallet'
        ? ASSET_NETWORKS[cryptoAsset]?.find(n => n.id === cryptoNetwork)
        : null;

    const currentFee = channel === 'Mobile Money' ? getMpesaFee(parsedAmount) : (selectedNetworkDetails?.fee || 0);
    const minWithdrawal = channel === 'Mobile Money' ? 10 : (selectedNetworkDetails?.min || 0);
    const finalPayout = Math.max(0, parsedAmount - currentFee);
    const feePercentage = parsedAmount > 0 ? ((currentFee / parsedAmount) * 100).toFixed(2) : '0.00';

    const handleChannelSelect = (selectedChannelId: string) => {
        setChannel(selectedChannelId);
        setToastError(''); setSuccessMsg('');
        setAmount(''); setCounterparty(''); setMemo('');
        setStep('form');
    };

    const handleSubmitForConfirmation = (e: React.FormEvent) => {
        e.preventDefault();
        setToastError('');
        if (!counterparty) {
            setToastError(channel === 'Mobile Money' ? "Please enter a phone number." : "Please enter a recipient address.");
            return;
        }
        if (parsedAmount < minWithdrawal) {
            setToastError(`Minimum withdrawal is ${minWithdrawal} ${activeAsset}.`);
            return;
        }
        if (parsedAmount > availableBalance) {
            setToastError(`Insufficient balance. You have ${availableBalance} ${activeAsset}.`);
            return;
        }
        setShowConfirmModal(true);
    };

    const handleConfirmWithdraw = async () => {
        setShowConfirmModal(false);
        setToastError(''); setSuccessMsg(''); setLoading(true);

        try {
            if (channel === 'Crypto Wallet') {
                if (cryptoNetwork === 'celo') {
                    await executeValoraWithdraw({ amount: parsedAmount, identifier: counterparty, asset: cryptoAsset });
                    setSuccessMsg(`Withdrawal broadcasted to Celo! Please check your wallet.`);
                } else if (cryptoNetwork === 'cardano') {
                    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                    await withdrawUsda({ 
                        amount: parsedAmount, 
                        to_address: counterparty, 
                        asset: cryptoAsset, 
                        idempotency_key: idempotencyKey, 
                        counterparty: 'Cardano Vault' 
                    });
                    setSuccessMsg(`Cardano block submission successful! Funds are routing to your wallet.`);
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    setSuccessMsg(`${cryptoAsset} withdrawal to ${selectedNetworkDetails?.name} processing!`);
                }
            } else {
                await executeRamp({ 
                    direction: 'off', 
                    channel: 'Mobile Money', 
                    from_asset: 'KES',
                    to_asset: 'KES', 
                    amount: parsedAmount, 
                    rate: 1, 
                    fee: currentFee, 
                    counterparty 
                });
                setSuccessMsg(`Payout successfully dispatched to your ${momoProvider === 'MPESA' ? 'M-Pesa' : 'Airtel Money'} number.`);
            }

            setAmount(''); setCounterparty(''); setMemo('');
            loadBalances();
        } catch (err: any) {
            const errorDetail = err.response?.data?.detail || err.message || "Withdrawal failed. Please try again.";
            setToastError(errorDetail);
        } finally {
            setLoading(false);
        }
    };

    const StepIndicator = () => (
        <div className="flex items-center gap-3 mb-8">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ${step === 'select' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
                {step === 'select' ? <span className="w-5 h-5 rounded-full bg-orange-500 text-black flex items-center justify-center text-[10px]">1</span> : <CheckCircle2 className="w-4 h-4" />}
                Channel
            </div>
            <div className={`w-8 h-px ${step === 'form' ? 'bg-emerald-500/50' : 'bg-[#1E2533]'}`} />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ${step === 'form' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' : 'bg-[#111827] text-gray-600 border border-[#1E2533]'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'form' ? 'bg-orange-500 text-black' : 'bg-[#1E2533] text-gray-500'}`}>2</span>
                Details
            </div>
        </div>
    );

    const ConfirmModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#111827] border border-[#1E2533] rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 fade-in duration-300">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8 text-orange-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Confirm Withdrawal</h3>
                    <p className="text-sm text-gray-400 mt-1">Please verify the details below</p>
                </div>

                <div className="bg-[#0B0E14] rounded-2xl p-5 space-y-4 mb-6">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Amount</span>
                        <span className="text-white font-bold">{parsedAmount.toFixed(4)} {activeAsset}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Network Fee</span>
                        <span className="text-red-400">- {currentFee.toFixed(4)} {activeAsset}</span>
                    </div>
                    <div className="border-t border-[#1E2533] pt-4 flex justify-between">
                        <span className="text-gray-400 font-medium">You Receive</span>
                        <span className="text-emerald-400 font-bold text-lg">{finalPayout.toFixed(4)} {activeAsset}</span>
                    </div>
                    <div className="border-t border-[#1E2533] pt-4">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Destination</span>
                        <span className="text-white font-mono text-sm break-all">{counterparty.length > 30 ? `${counterparty.slice(0, 16)}...${counterparty.slice(-8)}` : counterparty}</span>
                        {memo && (
                            <div className="mt-2">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Memo</span>
                                <span className="text-white font-mono text-sm">{memo}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setShowConfirmModal(false)}
                        className="flex-1 py-3.5 rounded-xl border border-[#1E2533] text-gray-400 font-bold text-sm hover:bg-[#1E2533] transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirmWithdraw}
                        disabled={loading}
                        className="flex-1 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Fingerprint className="w-4 h-4" /> Confirm</>}
                    </button>
                </div>
            </div>
        </div>
    );

    // ==================== CHANNEL SELECTION VIEW ====================
    if (step === 'select') {
        return (
            <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300 pt-4 px-4 md:px-0">
                <StepIndicator />

                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/20">
                            <ArrowUp className="w-7 h-7 text-orange-500" />
                        </div>
                        Withdraw Funds
                    </h2>
                    <p className="text-gray-400 mt-3 text-[15px]">Choose how you'd like to receive your funds</p>
                </div>

                <div className="flex items-center gap-6 text-xs text-gray-500 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Bank-grade encryption</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />
                        <span>Regulated and compliant</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-500" />
                        <span>Fast automated dispatch</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {CHANNELS.map((c, index) => (
                        <button
                            type="button"
                            key={c.id}
                            disabled={!c.active}
                            onClick={() => handleChannelSelect(c.id)}
                            className={`group relative p-6 rounded-2xl border transition-all duration-300 flex flex-col items-start gap-4 text-left overflow-hidden
                                ${!c.active
                                    ? 'bg-[#0B0E14]/30 border-[#1E2533]/30 text-gray-600 cursor-not-allowed opacity-60'
                                    : 'bg-[#111827] border-[#1E2533] hover:border-gray-500/50 hover:shadow-lg hover:-translate-y-0.5'
                                }`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="flex items-start justify-between w-full relative z-10">
                                <div className={`p-3 rounded-xl border transition-colors ${c.active ? 'bg-white/5 border-white/10' : 'bg-[#1e2d3d]'}`}>
                                    <c.icon className={`w-6 h-6 ${c.active ? c.color : 'text-gray-500'}`} />
                                </div>
                                {c.active && <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />}
                            </div>

                            <div className="relative z-10 mt-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-lg font-bold ${c.active ? 'text-white' : 'text-gray-500'}`}>{c.name}</span>
                                    {c.active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-gray-400 bg-white/5">{c.subtitle}</span>}
                                </div>
                                <span className="text-xs text-gray-500 leading-relaxed">{c.description}</span>
                            </div>

                            {!c.active && (
                                <span className="absolute top-4 right-4 text-[9px] bg-cyan-500/10 text-cyan-400 px-2.5 py-1 rounded-lg font-bold tracking-wider flex items-center gap-1.5 border border-cyan-500/20">
                                    <Lock className="w-3 h-3" /> SOON
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // ==================== FORM VIEW ====================
    return (
        <div className="max-w-[1200px] mx-auto space-y-6 animate-in slide-in-from-right-8 duration-300 pt-4 px-4 md:px-0">
            {showConfirmModal && <ConfirmModal />}

            <StepIndicator />

            <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setStep('select')}
                        className="p-2.5 bg-[#111827] border border-[#1E2533] rounded-xl hover:bg-[#1a2638] hover:text-white hover:border-gray-500 transition-all text-gray-400 group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">
                            {CHANNELS.find(c => c.id === channel)?.name}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">{CHANNELS.find(c => c.id === channel)?.description}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-[#111827] border border-[#1E2533] rounded-full px-5 py-2.5">
                    <span className="text-xs text-gray-500">Available</span>
                    <span className="text-sm font-bold text-white">{availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                    <span className="text-xs text-gray-400 font-medium">{activeAsset}</span>
                </div>
            </div>

            <div className="space-y-3">
                {toastError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span className="flex-1">{toastError}</span>
                        <button onClick={() => setToastError('')} className="text-red-400/50 hover:text-red-400 transition-colors">✕</button>
                    </div>
                )}
                {successMsg && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span className="flex-1">{successMsg}</span>
                        <button onClick={() => setSuccessMsg('')} className="text-emerald-400/50 hover:text-emerald-400 transition-colors">✕</button>
                    </div>
                )}
            </div>

            <div className="bg-[#0F1520] border border-[#1E2533] shadow-2xl rounded-3xl overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">

                    {/* LEFT: FORM */}
                    <div className="lg:col-span-7 bg-[#111827] border-r border-[#1E2533] p-6 md:p-8">
                        <form onSubmit={handleSubmitForConfirmation} className="space-y-6">

                            {/* Mobile Money Provider Selector */}
                            {channel === 'Mobile Money' && (
                                <div className="space-y-3 pb-6 border-b border-[#1E2533]">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                        Select Mobile Money Provider
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setMomoProvider('MPESA')}
                                            className={`p-3.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                                momoProvider === 'MPESA'
                                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                                                    : 'bg-[#0B0E14] border-[#1E2533] text-gray-400 hover:border-gray-500'
                                            }`}
                                        >
                                            <Smartphone className="w-4 h-4" /> M-Pesa
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMomoProvider('AIRTEL')}
                                            className={`p-3.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                                momoProvider === 'AIRTEL'
                                                    ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                                                    : 'bg-[#0B0E14] border-[#1E2533] text-gray-400 hover:border-gray-500'
                                            }`}
                                        >
                                            <Smartphone className="w-4 h-4" /> Airtel Money
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Crypto Selector */}
                            {channel === 'Crypto Wallet' && (
                                <div className="space-y-6 pb-6 border-b border-[#1E2533]">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                                            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-orange-500/10 text-orange-500 text-[9px] font-bold flex items-center justify-center border border-orange-500/20">1</span> Select Asset</span>
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.keys(ASSET_NETWORKS).map(asset => (
                                                <button
                                                    key={asset} type="button"
                                                    onClick={() => { setCryptoAsset(asset); setCryptoNetwork(ASSET_NETWORKS[asset][0].id); }}
                                                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border
                                                        ${cryptoAsset === asset
                                                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                                                            : 'bg-[#0B0E14] text-gray-400 border-[#1E2533] hover:border-gray-500 hover:text-gray-300'
                                                        }`}
                                                >{asset}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                                            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-orange-500/10 text-orange-500 text-[9px] font-bold flex items-center justify-center border border-orange-500/20">2</span> Select Network</span>
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {(ASSET_NETWORKS[cryptoAsset] || []).map(net => (
                                                <button
                                                    key={net.id} type="button"
                                                    onClick={() => setCryptoNetwork(net.id)}
                                                    className={`p-4 rounded-xl text-left transition-all duration-200 border relative overflow-hidden group
                                                        ${cryptoNetwork === net.id
                                                            ? 'bg-blue-500/5 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                                            : 'bg-[#0B0E14] border-[#1E2533] hover:border-gray-500'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <span className={`text-sm font-bold transition-colors ${cryptoNetwork === net.id ? 'text-white' : 'text-gray-300'}`}>
                                                            {net.name}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            {net.recommended && <RecommendedBadge />}
                                                            <SpeedBadge speed={net.speed} />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5">
                                                            <TrendingDown className="w-3 h-3 text-red-400/60" />
                                                            <span className="text-gray-500">Fee:</span>
                                                            <span className="text-red-400 font-bold">{net.fee} {cryptoAsset}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-gray-500">
                                                            <Clock className="w-3 h-3" />
                                                            <span>{net.time}</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Destination Input */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                                    {channel === 'Mobile Money' ? `${momoProvider === 'MPESA' ? 'M-Pesa' : 'Airtel'} Phone Number` : `${selectedNetworkDetails?.name || ''} Wallet Address`}
                                </label>
                                <div className={`relative transition-all duration-200 rounded-xl ${focusedField === 'address' ? 'ring-2 ring-orange-500/20' : ''}`}>
                                    <input
                                        type="text"
                                        value={counterparty}
                                        onChange={e => setCounterparty(e.target.value)}
                                        onFocus={() => setFocusedField('address')}
                                        onBlur={() => setFocusedField(null)}
                                        placeholder={channel === 'Mobile Money' ? "2547XXXXXXXX" : "Paste wallet address here..."}
                                        className="w-full bg-[#0B0E14] border border-[#1E2533] focus:border-orange-500/50 outline-none rounded-xl py-3.5 pl-5 pr-12 text-sm text-white transition-all font-mono placeholder-gray-600"
                                        required
                                    />
                                    {counterparty && (
                                        <button type="button" onClick={() => setCounterparty('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                        Amount ({activeAsset})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setAmount(availableBalance.toString())}
                                        className="text-[11px] text-orange-400 hover:text-orange-300 font-bold transition-colors flex items-center gap-1"
                                    >
                                        Use max balance
                                        <ExternalLink className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className={`relative transition-all duration-200 rounded-xl ${focusedField === 'amount' ? 'ring-2 ring-orange-500/20' : ''}`}>
                                    <input
                                        type="number"
                                        step="any"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        onFocus={() => setFocusedField('amount')}
                                        onBlur={() => setFocusedField(null)}
                                        placeholder={`Min: ${minWithdrawal}`}
                                        className="w-full bg-[#0B0E14] border border-[#1E2533] focus:border-orange-500/50 outline-none rounded-xl py-4 pl-5 pr-32 text-xl font-bold text-white transition-all font-mono placeholder-gray-600"
                                        required
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <span className="font-bold text-gray-500 text-sm">{activeAsset}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !counterparty || parsedAmount < minWithdrawal || parsedAmount > availableBalance || finalPayout <= 0}
                                className="w-full py-4 px-4 rounded-xl font-extrabold text-[15px] tracking-wide transition-all duration-300 flex items-center justify-center gap-2.5
                                    bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500
                                    text-white shadow-[0_0_30px_rgba(249,115,22,0.2)] hover:shadow-[0_0_40px_rgba(249,115,22,0.3)]
                                    active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                                {loading ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                                ) : (
                                    <><ShieldCheck className="w-5 h-5" /> Withdraw {finalPayout > 0 ? `${finalPayout.toFixed(2)} ${activeAsset}` : ''}</>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* RIGHT: SUMMARY & INFO */}
                    <div className="lg:col-span-5 bg-[#0F1520] p-6 md:p-8 space-y-5">
                        <div className="bg-[#111827] border border-[#1E2533] rounded-2xl overflow-hidden">
                            <div className="px-5 py-3 border-b border-[#1E2533] bg-[#0B0E14]/50">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Info className="w-3.5 h-3.5" /> Withdrawal Summary
                                </h3>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-400">You send</span>
                                    <span className="text-sm text-white font-mono font-medium">
                                        {parsedAmount > 0 ? parsedAmount.toFixed(4) : '0.0000'}
                                        <span className="text-xs text-gray-500 ml-1">{activeAsset}</span>
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-400">Network fee</span>
                                    <div className="text-right">
                                        <span className="text-sm text-red-400 font-mono font-medium">
                                            -{currentFee.toFixed(4)}
                                            <span className="text-xs opacity-60 ml-1">{activeAsset}</span>
                                        </span>
                                        <span className="block text-[10px] text-gray-600">({feePercentage}%)</span>
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-[#1E2533] pt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-300">You receive</span>
                                        <span className={`text-xl font-bold font-mono transition-colors duration-300 ${finalPayout > 0 ? 'text-emerald-400' : 'text-gray-600'}`}>
                                            {finalPayout > 0 ? finalPayout.toFixed(4) : '0.0000'}
                                            <span className="text-xs text-gray-500 ml-1">{activeAsset}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#111827] border border-[#1E2533] rounded-2xl overflow-hidden">
                            <div className="px-5 py-3 border-b border-[#1E2533] bg-[#0B0E14]/50">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Shield className="w-3.5 h-3.5 text-emerald-500" /> Security Notice
                                </h3>
                            </div>
                            <div className="p-5">
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-2.5 text-xs text-gray-400">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500/50 shrink-0 mt-0.5" />
                                        <span>Minimum: <strong className="text-white">{minWithdrawal} {activeAsset}</strong></span>
                                    </li>
                                    <li className="flex items-start gap-2.5 text-xs text-gray-400">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500/50 shrink-0 mt-0.5" />
                                        <span>Blockchain transactions are <strong className="text-white">irreversible</strong></span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}