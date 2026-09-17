
//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowUp, CheckCircle2, AlertCircle, Smartphone, Hexagon,
    Building2, CreditCard, Lock, Info, AlertTriangle, ShieldCheck,
    Loader2, Store, Users, ArrowLeft, Zap, Clock, TrendingDown,
    ChevronRight, ExternalLink, BadgeCheck, Fingerprint, Shield, KeyRound, Globe2
} from 'lucide-react';
import { executeRamp, withdrawUsda, executeValoraWithdraw, executeStellarWithdraw, getRetailWallet, requestWithdrawalOtp, getTwoFactorStatus } from '../../api/client';
import CrossBorderMomoGrid from '../../components/CrossBorderMomoGrid';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import { useTheme } from '../../contexts/ThemeContext';

// Hoisted to module scope on purpose: defining this as a function *inside*
// WithdrawPage's render body used to make React treat it as a brand-new
// component type on every re-render (e.g. every keystroke in either code
// field), which force-remounted the whole modal and re-fired the email
// code input's `autoFocus` — yanking focus back to that field away from
// wherever the user was actually typing (e.g. the TOTP field). Keeping the
// component reference stable across renders fixes that.
const WithdrawConfirmModal = ({
    isLight, verifyStep, parsedAmount, activeAsset, currentFee, finalPayout,
    counterparty, memo, verifyError, sendingOtp, onCancel, onRequestOtp,
    emailCode, setEmailCode, totpEnabled, totpCode, setTotpCode, loading, onConfirm,
}: any) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className={`border rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 fade-in duration-300 ${isLight ? 'bg-white border-slate-200' : 'bg-[#111827] border-[#1E2533]'}`}>

            {verifyStep === 'review' ? (
                <>
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck className="w-8 h-8 text-orange-500" />
                        </div>
                        <h3 className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Confirm Withdrawal</h3>
                        <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Please verify the details below</p>
                    </div>

                    <div className={`rounded-2xl p-5 space-y-4 mb-6 ${isLight ? 'bg-slate-50' : 'bg-[#0B0E14]'}`}>
                        <div className="flex justify-between text-sm">
                            <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Amount</span>
                            <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{parsedAmount.toFixed(4)} {activeAsset}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Network Fee</span>
                            <span className="text-red-500">- {currentFee.toFixed(4)} {activeAsset}</span>
                        </div>
                        <div className={`border-t pt-4 flex justify-between ${isLight ? 'border-slate-200' : 'border-[#1E2533]'}`}>
                            <span className={`font-medium ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>You Receive</span>
                            <span className="text-emerald-500 font-bold text-lg">{finalPayout.toFixed(4)} {activeAsset}</span>
                        </div>
                        <div className={`border-t pt-4 ${isLight ? 'border-slate-200' : 'border-[#1E2533]'}`}>
                            <span className={`text-[10px] uppercase tracking-wider block mb-1 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Destination</span>
                            <span className={`font-mono text-sm break-all ${isLight ? 'text-slate-900' : 'text-white'}`}>{counterparty.length > 30 ? `${counterparty.slice(0, 16)}...${counterparty.slice(-8)}` : counterparty}</span>
                            {memo && (
                                <div className="mt-2">
                                    <span className={`text-[10px] uppercase tracking-wider block mb-1 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Memo</span>
                                    <span className={`font-mono text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{memo}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {verifyError && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" /> {verifyError}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className={`flex-1 py-3.5 rounded-xl border font-bold text-sm transition-all ${isLight ? 'border-slate-200 text-slate-500 hover:bg-slate-100' : 'border-[#1E2533] text-gray-400 hover:bg-[#1E2533]'}`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onRequestOtp}
                            disabled={sendingOtp}
                            className="flex-1 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {sendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Fingerprint className="w-4 h-4" /> Confirm</>}
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Security Verification</h3>
                        <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>A verification code has been sent to your email.</p>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Email verification code</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                autoFocus
                                value={emailCode}
                                onChange={e => setEmailCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="6-digit code"
                                className={`w-full border focus:border-emerald-500/50 outline-none rounded-xl py-3.5 px-4 text-lg tracking-widest font-mono text-center ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#0B0E14] border-[#1E2533] text-white'}`}
                            />
                        </div>

                        {totpEnabled && (
                            <div>
                                <label className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Authenticator app code</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={totpCode}
                                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="6-digit code"
                                    className={`w-full border focus:border-emerald-500/50 outline-none rounded-xl py-3.5 px-4 text-lg tracking-widest font-mono text-center ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#0B0E14] border-[#1E2533] text-white'}`}
                                />
                            </div>
                        )}

                        {verifyError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-medium flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" /> {verifyError}
                            </div>
                        )}

                        <button type="button" onClick={onRequestOtp} disabled={sendingOtp} className="text-xs font-bold text-blue-500 hover:text-blue-400 disabled:opacity-50">
                            {sendingOtp ? 'Sending...' : "Didn't get a code? Resend"}
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className={`flex-1 py-3.5 rounded-xl border font-bold text-sm transition-all ${isLight ? 'border-slate-200 text-slate-500 hover:bg-slate-100' : 'border-[#1E2533] text-gray-400 hover:bg-[#1E2533]'}`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading || !emailCode || (totpEnabled && !totpCode)}
                            className="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /> Verify & Withdraw</>}
                        </button>
                    </div>
                </>
            )}
        </div>
    </div>
);

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
    active: boolean;
};

// `active: false` networks have no real backend withdrawal endpoint — selecting
// one and confirming used to silently fake a 1.5s "processing" delay and claim
// success with zero real action (no funds ever left, no backend call happened
// at all). Fixed 2026-09-04: Celo (executeValoraWithdraw), Cardano
// (withdrawUsda), and Stellar/USDC (executeStellarWithdraw — see
// POST /api/treasury/stellar/withdraw) actually broadcast a real transaction;
// everything else is disabled here until a real endpoint exists, matching
// DepositPage.tsx's pattern. Stellar only supports USDC — Tether does not
// officially issue USDT on Stellar at all (see docs/RETAIL_GO_LIVE_CHECKLIST.md
// and STELLAR_MNEMONIC design notes), so Stellar/USDT stays inactive.
const ASSET_NETWORKS: Record<string, NetworkOption[]> = {
    USDT: [
        { id: 'celo', name: 'Celo', fee: 0.005, time: '~5 Secs', min: 0.5, speed: 'instant', recommended: true, active: true },
        { id: 'stellar', name: 'Stellar', fee: 0.01, time: '~5 Secs', min: 0.5, speed: 'instant', active: false },
        { id: 'tron', name: 'Tron (TRC20)', fee: 1.00, time: '~3 Mins', min: 5, speed: 'fast', active: false },
        { id: 'polygon', name: 'Polygon', fee: 0.10, time: '~3 Mins', min: 0.5, speed: 'fast', active: false },
        { id: 'ethereum', name: 'Ethereum (ERC20)', fee: 4.50, time: '~5 Mins', min: 10, speed: 'slow', active: false }
    ],
    USDC: [
        { id: 'celo', name: 'Celo', fee: 0.005, time: '~5 Secs', min: 0.01, speed: 'instant', recommended: true, active: true },
        { id: 'stellar', name: 'Stellar', fee: 0.01, time: '~5 Secs', min: 0.5, speed: 'instant', active: true },
        { id: 'polygon', name: 'Polygon', fee: 0.10, time: '~3 Mins', min: 0.5, speed: 'fast', active: false },
        { id: 'tron', name: 'Tron (TRC20)', fee: 1.00, time: '~3 Mins', min: 5, speed: 'fast', active: false },
    ],
    USDA: [
        { id: 'cardano', name: 'Cardano', fee: 0.17, time: '~10 Mins', min: 0.5, speed: 'slow', recommended: true, active: true }
    ],
    cUSD: [
        { id: 'celo', name: 'Celo', fee: 0.005, time: '~5 Secs', min: 0.5, speed: 'instant', recommended: true, active: true }
    ],
    // "USD" is not its own on-chain token — it's a ledger label over a real,
    // fully-backed USDC settlement on Celo (see ONCHAIN_SETTLEMENT_ALIAS in
    // backend/routes/valora.py). A "USD" withdrawal broadcasts real USDC.
    USD: [
        { id: 'celo', name: 'Celo (as USDC)', fee: 0.005, time: '~5 Secs', min: 0.01, speed: 'instant', recommended: true, active: true }
    ],
    BTC: [
        { id: 'bitcoin', name: 'Bitcoin', fee: 2.50, time: '~30 Mins', min: 15, speed: 'slow', active: false }
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
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const navigate = useNavigate();
    const [step, setStep] = useState<'select' | 'form'>('select');
    const [channel, setChannel] = useState('Mobile Money');
    // Kenya's two providers stay the default, always-live tabs; "Cross-Border"
    // is a third tab that reveals CrossBorderMomoGrid instead of a phone-number
    // field — none of those rails have a real backend integration yet (see
    // resolve_momo_provider_and_validate in backend/routes/ramp.py).
    const [momoProvider, setMomoProvider] = useState<'MPESA' | 'AIRTEL' | 'CROSS_BORDER'>('MPESA');
    const isCrossBorderTab = momoProvider === 'CROSS_BORDER';
    const momoProviderLabel = momoProvider === 'AIRTEL' ? 'Airtel' : 'M-Pesa';
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

    // Withdrawal security: an emailed code (always required) plus a TOTP
    // authenticator code (only if the user has one enrolled) — see
    // backend/two_factor.py, checked by every withdrawal endpoint before any
    // funds move. Same two-factor pattern Binance/Bybit/Coinstore use.
    const [verifyStep, setVerifyStep] = useState<'review' | 'verify'>('review');
    const [totpEnabled, setTotpEnabled] = useState(false);
    const [otpSessionId, setOtpSessionId] = useState('');
    const [emailCode, setEmailCode] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyError, setVerifyError] = useState('');

    const loadBalances = () => {
        getRetailWallet().then(res => {
            if (res.data?.balances) setBalances(res.data.balances);
            else if (res.data) setBalances(res.data);
        }).catch(err => console.error("Failed to load balances", err));
    };

    useEffect(() => {
        loadBalances();
        getTwoFactorStatus().then(res => setTotpEnabled(!!res.data?.totpEnabled)).catch(() => {});
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
        // Authenticator app enrollment is mandatory for withdrawals (see
        // backend/two_factor.py) — checked client-side here so the user is
        // redirected to set it up before even reaching the review modal,
        // not just when the server eventually rejects the request.
        if (!totpEnabled) {
            navigate('/profile', { state: { reason: 'withdrawal_requires_2fa' } });
            return;
        }
        if (isCrossBorderTab) return; // no real rail to submit to yet
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
        setVerifyStep('review');
        setEmailCode(''); setTotpCode(''); setVerifyError(''); setOtpSessionId('');
        setShowConfirmModal(true);
    };

    // Step 1 of the modal: user reviews the summary and clicks Confirm, which
    // sends the emailed verification code and advances to the code-entry step
    // — the code isn't requested until the user has actually committed to
    // this specific withdrawal, not just when the form is filled in.
    const handleRequestOtp = async () => {
        setVerifyError(''); setSendingOtp(true);
        try {
            const res = await requestWithdrawalOtp();
            setOtpSessionId(res.data?.otp_session_id || '');
            setVerifyStep('verify');
        } catch (err: any) {
            // 428 = backend's authoritative check found no authenticator app enrolled, even though this page's cached totpEnabled said
         
            if (err.response?.status === 428) {
                setShowConfirmModal(false);
                navigate('/profile', { state: { reason: 'withdrawal_requires_2fa' } });
                return;
            }
            setVerifyError(getFriendlyErrorMessage(err, { fallback: 'Failed to send verification code. Please try again.' }));
        } finally {
            setSendingOtp(false);
        }
    };

    const handleConfirmWithdraw = async () => {
        if (!emailCode) { setVerifyError('Enter the code sent to your email.'); return; }
        if (totpEnabled && !totpCode) { setVerifyError('Enter your authenticator app code.'); return; }

        setVerifyError(''); setToastError(''); setSuccessMsg(''); setLoading(true);
        const otpFields = { otp_session_id: otpSessionId, otp_code: emailCode, totp_code: totpEnabled ? totpCode : undefined };

        try {
            if (channel === 'Crypto Wallet') {
                if (cryptoNetwork === 'celo') {
                    await executeValoraWithdraw({ amount: parsedAmount, identifier: counterparty, asset: cryptoAsset, ...otpFields });
                    setSuccessMsg(`Withdrawal broadcasted to Celo! Please check your wallet.`);
                } else if (cryptoNetwork === 'stellar') {
                    const result = await executeStellarWithdraw({ amount: parsedAmount, to_address: counterparty, asset: cryptoAsset, ...otpFields });
                    setSuccessMsg(result.data?.message || `USDC withdrawal broadcasted to Stellar!`);
                } else if (cryptoNetwork === 'cardano') {
                    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                    await withdrawUsda({
                        amount: parsedAmount,
                        to_address: counterparty,
                        asset: cryptoAsset,
                        idempotency_key: idempotencyKey,
                        counterparty: 'Cardano Vault',
                        ...otpFields,
                    });
                    setSuccessMsg(`Cardano block submission successful! Funds are routing to your wallet.`);
                } else {
                    // No real backend endpoint exists for this network — the submit
                    // button is disabled for inactive networks, so this should be
                    // unreachable, but never fake a success message if it is somehow
                    // reached. A prior version of this code did exactly that (a fake
                    // 1.5s delay + a fabricated "processing" success message with zero
                    // real withdrawal happening) — fixed 2026-09-04.
                    throw new Error(`Withdrawals over ${selectedNetworkDetails?.name || cryptoNetwork} are not available yet.`);
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
                    counterparty,
                    momo_provider: momoProviderLabel,
                    ...otpFields,
                });
                setSuccessMsg(`Payout successfully dispatched to your ${momoProviderLabel === 'Airtel' ? 'Airtel Money' : 'M-Pesa'} number.`);
            }

            setShowConfirmModal(false);
            setAmount(''); setCounterparty(''); setMemo('');
            loadBalances();
        } catch (err: any) {
            if (err.response?.status === 428) {
                setShowConfirmModal(false);
                navigate('/profile', { state: { reason: 'withdrawal_requires_2fa' } });
                return;
            }
            const errorDetail = getFriendlyErrorMessage(err, { fallback: 'Withdrawal failed. Please try again.' });
            setVerifyError(errorDetail);
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
            <div className={`w-8 h-px ${step === 'form' ? 'bg-emerald-500/50' : isLight ? 'bg-slate-200' : 'bg-[#1E2533]'}`} />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ${step === 'form' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' : isLight ? 'bg-slate-100 text-slate-400 border border-slate-200' : 'bg-[#111827] text-gray-600 border border-[#1E2533]'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'form' ? 'bg-orange-500 text-black' : isLight ? 'bg-slate-200 text-slate-500' : 'bg-[#1E2533] text-gray-500'}`}>2</span>
                Details
            </div>
        </div>
    );
    // ==================== CHANNEL SELECTION VIEW ====================
    if (step === 'select') {
        return (
            <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300 pt-4 px-4 md:px-0">
                <StepIndicator />

                <div className="mb-6">
                    <h2 className={`text-3xl font-bold flex items-center gap-3 tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        <div className={`p-3 rounded-2xl bg-gradient-to-br border ${isLight ? 'from-orange-50 to-white border-orange-200' : 'from-orange-500/20 to-orange-500/5 border-orange-500/20'}`}>
                            <ArrowUp className="w-7 h-7 text-orange-500" />
                        </div>
                        Withdraw Funds
                    </h2>
                    <p className={`mt-3 text-[15px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Choose how you'd like to receive your funds</p>
                </div>

                <div className={`flex items-center gap-6 text-xs flex-wrap ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
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
                                    ? isLight ? 'bg-slate-50/60 border-slate-200/60 text-slate-400 cursor-not-allowed opacity-60' : 'bg-[#0B0E14]/30 border-[#1E2533]/30 text-gray-600 cursor-not-allowed opacity-60'
                                    : isLight ? 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 shadow-sm' : 'bg-[#111827] border-[#1E2533] hover:border-gray-500/50 hover:shadow-lg hover:-translate-y-0.5'
                                }`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="flex items-start justify-between w-full relative z-10">
                                <div className={`p-3 rounded-xl border transition-colors ${c.active ? (isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10') : (isLight ? 'bg-slate-100' : 'bg-[#1e2d3d]')}`}>
                                    <c.icon className={`w-6 h-6 ${c.active ? c.color : (isLight ? 'text-slate-400' : 'text-gray-500')}`} />
                                </div>
                                {c.active && <ChevronRight className={`w-5 h-5 group-hover:translate-x-1 transition-all ${isLight ? 'text-slate-400 group-hover:text-slate-600' : 'text-gray-600 group-hover:text-gray-400'}`} />}
                            </div>

                            <div className="relative z-10 mt-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-lg font-bold ${c.active ? (isLight ? 'text-slate-900' : 'text-white') : (isLight ? 'text-slate-400' : 'text-gray-500')}`}>{c.name}</span>
                                    {c.active && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isLight ? 'text-slate-500 bg-slate-100' : 'text-gray-400 bg-white/5'}`}>{c.subtitle}</span>}
                                </div>
                                <span className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>{c.description}</span>
                            </div>

                            {!c.active && (
                                <span className="absolute top-4 right-4 text-[9px] bg-cyan-500/10 text-cyan-500 px-2.5 py-1 rounded-lg font-bold tracking-wider flex items-center gap-1.5 border border-cyan-500/20">
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
            {showConfirmModal && (
                <WithdrawConfirmModal
                    isLight={isLight}
                    verifyStep={verifyStep}
                    parsedAmount={parsedAmount}
                    activeAsset={activeAsset}
                    currentFee={currentFee}
                    finalPayout={finalPayout}
                    counterparty={counterparty}
                    memo={memo}
                    verifyError={verifyError}
                    sendingOtp={sendingOtp}
                    onCancel={() => setShowConfirmModal(false)}
                    onRequestOtp={handleRequestOtp}
                    emailCode={emailCode}
                    setEmailCode={setEmailCode}
                    totpEnabled={totpEnabled}
                    totpCode={totpCode}
                    setTotpCode={setTotpCode}
                    loading={loading}
                    onConfirm={handleConfirmWithdraw}
                />
            )}

            <StepIndicator />

            <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setStep('select')}
                        className={`p-2.5 border rounded-xl transition-all group ${isLight ? 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 text-slate-500 shadow-sm' : 'bg-[#111827] border-[#1E2533] hover:bg-[#1a2638] hover:text-white hover:border-gray-500 text-gray-400'}`}
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h2 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {CHANNELS.find(c => c.id === channel)?.name}
                        </h2>
                        <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{CHANNELS.find(c => c.id === channel)?.description}</p>
                    </div>
                </div>

                <div className={`flex items-center gap-3 border rounded-full px-5 py-2.5 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111827] border-[#1E2533]'}`}>
                    <span className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Available</span>
                    <span className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                    <span className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{activeAsset}</span>
                </div>
            </div>

            <div className="space-y-3">
                {!totpEnabled && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                        <KeyRound className="w-5 h-5 shrink-0" />
                        <span className="flex-1">An authenticator app is required before you can withdraw.</span>
                        <button
                            onClick={() => navigate('/profile', { state: { reason: 'withdrawal_requires_2fa' } })}
                            className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black transition-colors"
                        >
                            Set up now
                        </button>
                    </div>
                )}
                {toastError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span className="flex-1">{toastError}</span>
                        <button onClick={() => setToastError('')} className="text-red-500/50 hover:text-red-500 transition-colors">✕</button>
                    </div>
                )}
                {successMsg && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-500 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span className="flex-1">{successMsg}</span>
                        <button onClick={() => setSuccessMsg('')} className="text-emerald-500/50 hover:text-emerald-500 transition-colors">✕</button>
                    </div>
                )}
            </div>

            <div className={`shadow-2xl rounded-3xl overflow-hidden border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2533]'}`}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">

                    {/* LEFT: FORM */}
                    <div className={`lg:col-span-7 p-6 md:p-8 border-r ${isLight ? 'bg-white border-slate-200' : 'bg-[#111827] border-[#1E2533]'}`}>
                        <form onSubmit={handleSubmitForConfirmation} className="space-y-6">

                            {/* Mobile Money Provider Selector — M-Pesa/Airtel stay the default
                                tabs exactly as before; Cross-Border is a third tab that swaps
                                the phone-number field for CrossBorderMomoGrid instead of being
                                merged into a single dropdown. */}
                            {channel === 'Mobile Money' && (
                                <div className={`space-y-3 pb-6 border-b ${isLight ? 'border-slate-200' : 'border-[#1E2533]'}`}>
                                    <label className={`block text-[11px] font-bold uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                                        Select Mobile Money Provider
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setMomoProvider('MPESA')}
                                            className={`p-3.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                                momoProvider === 'MPESA'
                                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                                                    : isLight ? 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300' : 'bg-[#0B0E14] border-[#1E2533] text-gray-400 hover:border-gray-500'
                                            }`}
                                        >
                                            <Smartphone className="w-4 h-4" /> M-Pesa
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMomoProvider('AIRTEL')}
                                            className={`p-3.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                                momoProvider === 'AIRTEL'
                                                    ? 'bg-rose-500/10 border-rose-500 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                                                    : isLight ? 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300' : 'bg-[#0B0E14] border-[#1E2533] text-gray-400 hover:border-gray-500'
                                            }`}
                                        >
                                            <Smartphone className="w-4 h-4" /> Airtel Money
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMomoProvider('CROSS_BORDER')}
                                            className={`p-3.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                                isCrossBorderTab
                                                    ? 'bg-blue-500/10 border-blue-500 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                                                    : isLight ? 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300' : 'bg-[#0B0E14] border-[#1E2533] text-gray-400 hover:border-gray-500'
                                            }`}
                                        >
                                            <Globe2 className="w-4 h-4" /> Cross-Border
                                        </button>
                                    </div>

                                    {isCrossBorderTab && <CrossBorderMomoGrid />}
                                </div>
                            )}

                            {/* Crypto Selector */}
                            {channel === 'Crypto Wallet' && (
                                <div className={`space-y-6 pb-6 border-b ${isLight ? 'border-slate-200' : 'border-[#1E2533]'}`}>
                                    <div>
                                        <label className={`block text-[11px] font-bold uppercase tracking-widest mb-3 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                                            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-orange-500/10 text-orange-500 text-[9px] font-bold flex items-center justify-center border border-orange-500/20">1</span> Select Asset</span>
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.keys(ASSET_NETWORKS).map(asset => (
                                                <button
                                                    key={asset} type="button"
                                                    onClick={() => {
                                                        setCryptoAsset(asset);
                                                        const defaultNet = ASSET_NETWORKS[asset].find(n => n.active) || ASSET_NETWORKS[asset][0];
                                                        setCryptoNetwork(defaultNet.id);
                                                    }}
                                                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border
                                                        ${cryptoAsset === asset
                                                            ? 'bg-orange-500/10 text-orange-500 border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                                                            : isLight ? 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700' : 'bg-[#0B0E14] text-gray-400 border-[#1E2533] hover:border-gray-500 hover:text-gray-300'
                                                        }`}
                                                >{asset}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className={`block text-[11px] font-bold uppercase tracking-widest mb-3 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                                            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-orange-500/10 text-orange-500 text-[9px] font-bold flex items-center justify-center border border-orange-500/20">2</span> Select Network</span>
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {(ASSET_NETWORKS[cryptoAsset] || []).map(net => (
                                                <button
                                                    key={net.id} type="button"
                                                    disabled={!net.active}
                                                    title={!net.active ? 'Coming soon — no real withdrawal support for this network yet' : undefined}
                                                    onClick={() => net.active && setCryptoNetwork(net.id)}
                                                    className={`p-4 rounded-xl text-left transition-all duration-200 border relative overflow-hidden group
                                                        ${!net.active
                                                            ? isLight ? 'bg-slate-50/60 border-slate-200/60 opacity-50 cursor-not-allowed' : 'bg-[#0B0E14]/30 border-[#1E2533]/30 opacity-50 cursor-not-allowed'
                                                            : cryptoNetwork === net.id
                                                            ? 'bg-blue-500/5 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                                            : isLight ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-[#0B0E14] border-[#1E2533] hover:border-gray-500'
                                                        }`}
                                                >
                                                    {!net.active && (
                                                        <span className="absolute top-2 right-2 text-[8px] bg-cyan-500/10 text-cyan-500 px-2 py-0.5 rounded-lg font-bold tracking-wider flex items-center gap-1 border border-cyan-500/20 z-10">
                                                            <Lock className="w-2.5 h-2.5" /> SOON
                                                        </span>
                                                    )}
                                                    <div className="flex items-start justify-between mb-3">
                                                        <span className={`text-sm font-bold transition-colors ${!net.active ? (isLight ? 'text-slate-400' : 'text-gray-500') : cryptoNetwork === net.id ? (isLight ? 'text-slate-900' : 'text-white') : (isLight ? 'text-slate-600' : 'text-gray-300')}`}>
                                                            {net.name}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            {net.active && net.recommended && <RecommendedBadge />}
                                                            {net.active && <SpeedBadge speed={net.speed} />}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5">
                                                            <TrendingDown className="w-3 h-3 text-red-400/60" />
                                                            <span className={isLight ? 'text-slate-400' : 'text-gray-500'}>Fee:</span>
                                                            <span className="text-red-500 font-bold">{net.fee} {cryptoAsset}</span>
                                                        </div>
                                                        <div className={`flex items-center gap-1.5 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
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

                            {/* Destination Input — hidden on the Cross-Border tab; there's no
                                real destination to enter for a rail that isn't wired up yet. */}
                            {!isCrossBorderTab && (
                            <div>
                                <label className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                                    {channel === 'Mobile Money' ? `${momoProviderLabel === 'Airtel' ? 'Airtel Money' : 'M-Pesa'} Phone Number` : `${selectedNetworkDetails?.name || ''} Wallet Address`}
                                </label>
                                <div className={`relative transition-all duration-200 rounded-xl ${focusedField === 'address' ? 'ring-2 ring-orange-500/20' : ''}`}>
                                    <input
                                        type="text"
                                        value={counterparty}
                                        onChange={e => setCounterparty(e.target.value)}
                                        onFocus={() => setFocusedField('address')}
                                        onBlur={() => setFocusedField(null)}
                                        placeholder={channel === 'Mobile Money' ? "2547XXXXXXXX" : "Paste wallet address here..."}
                                        className={`w-full border focus:border-orange-500/50 outline-none rounded-xl py-3.5 pl-5 pr-12 text-sm transition-all font-mono ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400' : 'bg-[#0B0E14] border-[#1E2533] text-white placeholder-gray-600'}`}
                                        required
                                    />
                                    {counterparty && (
                                        <button type="button" onClick={() => setCounterparty('')} className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-gray-600 hover:text-gray-400'}`}>
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>
                            )}

                            {/* Amount Input */}
                            {!isCrossBorderTab && (
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className={`block text-[11px] font-bold uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                                        Amount ({activeAsset})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setAmount(availableBalance.toString())}
                                        className="text-[11px] text-orange-500 hover:text-orange-400 font-bold transition-colors flex items-center gap-1"
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
                                        className={`w-full border focus:border-orange-500/50 outline-none rounded-xl py-4 pl-5 pr-32 text-xl font-bold transition-all font-mono ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400' : 'bg-[#0B0E14] border-[#1E2533] text-white placeholder-gray-600'}`}
                                        required
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <span className={`font-bold text-sm ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{activeAsset}</span>
                                    </div>
                                </div>
                            </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || isCrossBorderTab || !counterparty || parsedAmount < minWithdrawal || parsedAmount > availableBalance || finalPayout <= 0 || (channel === 'Crypto Wallet' && !selectedNetworkDetails?.active)}
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
                    <div className={`lg:col-span-5 p-6 md:p-8 space-y-5 ${isLight ? 'bg-slate-50' : 'bg-[#0F1520]'}`}>
                        <div className={`rounded-2xl overflow-hidden border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111827] border-[#1E2533]'}`}>
                            <div className={`px-5 py-3 border-b ${isLight ? 'border-slate-200 bg-slate-50/60' : 'border-[#1E2533] bg-[#0B0E14]/50'}`}>
                                <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                                    <Info className="w-3.5 h-3.5" /> Withdrawal Summary
                                </h3>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className={`text-sm ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>You send</span>
                                    <span className={`text-sm font-mono font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                        {parsedAmount > 0 ? parsedAmount.toFixed(4) : '0.0000'}
                                        <span className={`text-xs ml-1 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{activeAsset}</span>
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className={`text-sm ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Network fee</span>
                                    <div className="text-right">
                                        <span className="text-sm text-red-500 font-mono font-medium">
                                            -{currentFee.toFixed(4)}
                                            <span className="text-xs opacity-60 ml-1">{activeAsset}</span>
                                        </span>
                                        <span className={`block text-[10px] ${isLight ? 'text-slate-400' : 'text-gray-600'}`}>({feePercentage}%)</span>
                                    </div>
                                </div>

                                <div className={`border-t border-dashed pt-4 ${isLight ? 'border-slate-200' : 'border-[#1E2533]'}`}>
                                    <div className="flex justify-between items-center">
                                        <span className={`text-sm font-medium ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>You receive</span>
                                        <span className={`text-xl font-bold font-mono transition-colors duration-300 ${finalPayout > 0 ? 'text-emerald-500' : (isLight ? 'text-slate-300' : 'text-gray-600')}`}>
                                            {finalPayout > 0 ? finalPayout.toFixed(4) : '0.0000'}
                                            <span className={`text-xs ml-1 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{activeAsset}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={`rounded-2xl overflow-hidden border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111827] border-[#1E2533]'}`}>
                            <div className={`px-5 py-3 border-b ${isLight ? 'border-slate-200 bg-slate-50/60' : 'border-[#1E2533] bg-[#0B0E14]/50'}`}>
                                <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                                    <Shield className="w-3.5 h-3.5 text-emerald-500" /> Security Notice
                                </h3>
                            </div>
                            <div className="p-5">
                                <ul className="space-y-3">
                                    <li className={`flex items-start gap-2.5 text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500/50 shrink-0 mt-0.5" />
                                        <span>Minimum: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{minWithdrawal} {activeAsset}</strong></span>
                                    </li>
                                    <li className={`flex items-start gap-2.5 text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500/50 shrink-0 mt-0.5" />
                                        <span>Blockchain transactions are <strong className={isLight ? 'text-slate-900' : 'text-white'}>irreversible</strong></span>
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