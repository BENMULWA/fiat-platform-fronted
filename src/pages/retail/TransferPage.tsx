//@ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Send, ArrowRight, CheckCircle2, AlertCircle, Loader2, ShieldCheck,
    Fingerprint, Lock, KeyRound, Users, Shield, Zap, Ban, Clock,
    ArrowDownLeft, ArrowUpRight, ExternalLink, Mail
} from 'lucide-react';
import {
    getRetailWallet, lookupTransferRecipient, transferToUser, getInternalTransferHistory,
    requestWithdrawalOtp, getTwoFactorStatus,
} from '../../api/client';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import { useTheme } from '../../contexts/ThemeContext';

type LookupState = 'idle' | 'checking' | 'found' | 'not_found' | 'self';

// Hoisted to module scope on purpose: defining this inside TransferPage's
// render body used to make React treat it as a brand-new component type on
// every re-render (e.g. every keystroke in either code field), force-
// remounting the whole modal and re-firing the email code input's
// `autoFocus` — yanking focus back to that field away from wherever the
// user was actually typing (e.g. the TOTP field). A stable component
// reference across renders fixes that.
const TransferConfirmModal = ({
    isLight, verifyStep, parsedAmount, asset, recipientName, recipientEmail, note,
    verifyError, sendingOtp, onCancel, onRequestOtp,
    emailCode, setEmailCode, totpEnabled, totpCode, setTotpCode, loading, onConfirm,
}: any) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className={`border rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 fade-in duration-300 ${isLight ? 'bg-white border-slate-200' : 'bg-[#111827] border-[#1E2533]'}`}>

            {verifyStep === 'review' ? (
                <>
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center mx-auto mb-4">
                            <Send className="w-7 h-7 text-blue-500" />
                        </div>
                        <h3 className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Confirm Transfer</h3>
                        <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Please verify the details below</p>
                    </div>

                    <div className={`rounded-2xl p-5 space-y-4 mb-6 ${isLight ? 'bg-slate-50' : 'bg-[#0B0E14]'}`}>
                        <div className="flex justify-between text-sm">
                            <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Amount</span>
                            <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{parsedAmount.toFixed(4)} {asset}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Transfer fee</span>
                            <span className="text-emerald-500 font-bold flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> FREE</span>
                        </div>
                        <div className={`border-t pt-4 flex justify-between ${isLight ? 'border-slate-200' : 'border-[#1E2533]'}`}>
                            <span className={`font-medium ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Recipient receives</span>
                            <span className="text-emerald-500 font-bold text-lg">{parsedAmount.toFixed(4)} {asset}</span>
                        </div>
                        <div className={`border-t pt-4 ${isLight ? 'border-slate-200' : 'border-[#1E2533]'}`}>
                            <span className={`text-[10px] uppercase tracking-wider block mb-1 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>To</span>
                            <span className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{recipientName}</span>
                            <span className={`block font-mono text-xs mt-0.5 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{recipientEmail}</span>
                            {note && (
                                <div className="mt-2">
                                    <span className={`text-[10px] uppercase tracking-wider block mb-1 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Reference</span>
                                    <span className={`text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{note}</span>
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
                            className="flex-1 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /> Verify & Send</>}
                        </button>
                    </div>
                </>
            )}
        </div>
    </div>
);

export default function TransferPage() {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const navigate = useNavigate();

    const [balances, setBalances] = useState<Record<string, number>>({});
    const [history, setHistory] = useState<any[]>([]);
    const [totpEnabled, setTotpEnabled] = useState(false);

    const [recipientEmail, setRecipientEmail] = useState('');
    const [lookupState, setLookupState] = useState<LookupState>('idle');
    const [recipientName, setRecipientName] = useState('');
    const [asset, setAsset] = useState('KES');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    const [toastError, setToastError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [verifyStep, setVerifyStep] = useState<'review' | 'verify'>('review');
    const [otpSessionId, setOtpSessionId] = useState('');
    const [emailCode, setEmailCode] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [sendingOtp, setSendingOtp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verifyError, setVerifyError] = useState('');

    const loadBalances = () => {
        getRetailWallet().then(res => {
            if (res.data?.balances) setBalances(res.data.balances);
            else if (res.data) setBalances(res.data);
        }).catch(err => console.error("Failed to load balances", err));
    };

    const loadHistory = () => {
        getInternalTransferHistory().then(res => {
            setHistory(res.data?.transfers || []);
        }).catch(() => {});
    };

    useEffect(() => {
        loadBalances();
        loadHistory();
        getTwoFactorStatus().then(res => setTotpEnabled(!!res.data?.totpEnabled)).catch(() => {});
    }, []);

    useEffect(() => {
        if (successMsg) {
            const timer = setTimeout(() => setSuccessMsg(''), 6000);
            return () => clearTimeout(timer);
        }
    }, [successMsg]);

    // Live recipient verification — debounced lookup as the sender types,
    // same "confirm this is who you think it is" step a bank shows before
    // you commit to an own-bank transfer, just keyed by email instead of
    // an account number.
    useEffect(() => {
        const trimmed = recipientEmail.trim().toLowerCase();
        if (!trimmed || !trimmed.includes('@')) {
            setLookupState('idle');
            setRecipientName('');
            return;
        }
        setLookupState('checking');
        const handle = setTimeout(async () => {
            try {
                const res = await lookupTransferRecipient(trimmed);
                if (res.data?.isSelf) {
                    setLookupState('self');
                } else if (res.data?.found) {
                    setLookupState('found');
                    setRecipientName(res.data.displayName || 'Jasiri User');
                } else {
                    setLookupState('not_found');
                }
            } catch {
                setLookupState('idle');
            }
        }, 500);
        return () => clearTimeout(handle);
    }, [recipientEmail]);

    const transferableAssets = useMemo(
        () => Object.entries(balances).filter(([, bal]) => (bal || 0) > 0).map(([id]) => id),
        [balances]
    );

    const parsedAmount = parseFloat(amount) || 0;
    const availableBalance = balances[asset] || 0;
    const canSubmit = lookupState === 'found' && parsedAmount > 0 && parsedAmount <= availableBalance;

    const handleSubmitForConfirmation = (e: React.FormEvent) => {
        e.preventDefault();
        setToastError('');
        // Mandatory authenticator app, exactly like a real withdrawal — a
        // P2P transfer moves funds out of the sender's account just as
        // irreversibly, even though nothing touches a chain (see
        // backend/routes/retail.py's transfer_to_user).
        if (!totpEnabled) {
            navigate('/profile', { state: { reason: 'withdrawal_requires_2fa' } });
            return;
        }
        if (lookupState !== 'found') {
            setToastError("Enter a recipient email with an active Jasiri account.");
            return;
        }
        if (parsedAmount <= 0) {
            setToastError("Enter an amount greater than zero.");
            return;
        }
        if (parsedAmount > availableBalance) {
            setToastError(`Insufficient balance. You have ${availableBalance} ${asset}.`);
            return;
        }
        setVerifyStep('review');
        setEmailCode(''); setTotpCode(''); setVerifyError(''); setOtpSessionId('');
        setShowConfirmModal(true);
    };

    const handleRequestOtp = async () => {
        setVerifyError(''); setSendingOtp(true);
        try {
            const res = await requestWithdrawalOtp();
            setOtpSessionId(res.data?.otp_session_id || '');
            setVerifyStep('verify');
        } catch (err: any) {
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

    const handleConfirmTransfer = async () => {
        if (!emailCode) { setVerifyError('Enter the code sent to your email.'); return; }
        if (totpEnabled && !totpCode) { setVerifyError('Enter your authenticator app code.'); return; }

        setVerifyError(''); setToastError(''); setSuccessMsg(''); setLoading(true);
        try {
            const res = await transferToUser({
                recipient_email: recipientEmail.trim().toLowerCase(),
                asset,
                amount: parsedAmount,
                otp_session_id: otpSessionId,
                otp_code: emailCode,
                totp_code: totpCode,
                note: note.trim() || undefined,
            });
            setSuccessMsg(res.data?.message || `Sent ${parsedAmount} ${asset} to ${recipientEmail}.`);
            setShowConfirmModal(false);
            setRecipientEmail(''); setAmount(''); setNote('');
            setLookupState('idle'); setRecipientName('');
            loadBalances();
            loadHistory();
        } catch (err: any) {
            if (err.response?.status === 428) {
                setShowConfirmModal(false);
                navigate('/profile', { state: { reason: 'withdrawal_requires_2fa' } });
                return;
            }
            setVerifyError(getFriendlyErrorMessage(err, { fallback: 'Transfer failed. Please try again.' }));
        } finally {
            setLoading(false);
        }
    };

    const RecipientStatus = () => {
        if (lookupState === 'checking') {
            return (
                <div className={`flex items-center gap-2 mt-2 text-xs font-medium ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking Jasiri accounts…
                </div>
            );
        }
        if (lookupState === 'found') {
            return (
                <div className="flex items-center gap-2 mt-2 text-xs font-bold text-emerald-500">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sending to {recipientName}
                </div>
            );
        }
        if (lookupState === 'not_found') {
            return (
                <div className="flex items-center gap-2 mt-2 text-xs font-bold text-red-500">
                    <Ban className="w-3.5 h-3.5" /> No Jasiri account found with that email
                </div>
            );
        }
        if (lookupState === 'self') {
            return (
                <div className="flex items-center gap-2 mt-2 text-xs font-bold text-amber-500">
                    <AlertCircle className="w-3.5 h-3.5" /> You can't transfer to your own account
                </div>
            );
        }
        return null;
    };
    return (
        <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300 pt-4 px-4 md:px-0">
            {showConfirmModal && (
                <TransferConfirmModal
                    isLight={isLight}
                    verifyStep={verifyStep}
                    parsedAmount={parsedAmount}
                    asset={asset}
                    recipientName={recipientName}
                    recipientEmail={recipientEmail}
                    note={note}
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
                    onConfirm={handleConfirmTransfer}
                />
            )}

            <div className="mb-2">
                <h2 className={`text-3xl font-bold flex items-center gap-3 tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <div className={`p-3 rounded-2xl bg-gradient-to-br border ${isLight ? 'from-blue-50 to-white border-blue-200' : 'from-blue-500/20 to-blue-500/5 border-blue-500/20'}`}>
                        <Send className="w-7 h-7 text-blue-500" />
                    </div>
                    Send to Jasiri User
                </h2>
                <p className={`mt-3 text-[15px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    Instant, zero-fee transfers to another Jasiri account — like an internal bank-to-bank transfer, just between Jasiri users.
                </p>
            </div>

            <div className={`flex items-center gap-6 text-xs flex-wrap ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
                <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Always free, no fee deducted</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>Settles instantly</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-purple-500" />
                    <span>Protected by email + authenticator verification</span>
                </div>
            </div>

            <div className="space-y-3">
                {!totpEnabled && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                        <KeyRound className="w-5 h-5 shrink-0" />
                        <span className="flex-1">An authenticator app is required before you can send funds.</span>
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

                            <div>
                                <label className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                                    Recipient's Jasiri Email
                                </label>
                                <div className="relative">
                                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-slate-400' : 'text-gray-600'}`} />
                                    <input
                                        type="email"
                                        value={recipientEmail}
                                        onChange={e => setRecipientEmail(e.target.value)}
                                        placeholder="friend@example.com"
                                        className={`w-full border focus:border-blue-500/50 outline-none rounded-xl py-3.5 pl-11 pr-4 text-sm transition-all font-mono ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400' : 'bg-[#0B0E14] border-[#1E2533] text-white placeholder-gray-600'}`}
                                        required
                                    />
                                </div>
                                <RecipientStatus />
                            </div>

                            <div>
                                <label className={`block text-[11px] font-bold uppercase tracking-widest mb-3 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                                    Select Asset
                                </label>
                                {transferableAssets.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {transferableAssets.map(a => (
                                            <button
                                                key={a} type="button"
                                                onClick={() => setAsset(a)}
                                                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border ${asset === a
                                                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                                    : isLight ? 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700' : 'bg-[#0B0E14] text-gray-400 border-[#1E2533] hover:border-gray-500 hover:text-gray-300'
                                                    }`}
                                            >{a}</button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>No funded wallets yet — deposit first to send a transfer.</p>
                                )}
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className={`block text-[11px] font-bold uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                                        Amount ({asset})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setAmount(availableBalance.toString())}
                                        className="text-[11px] text-blue-500 hover:text-blue-400 font-bold transition-colors flex items-center gap-1"
                                    >
                                        Use max balance
                                        <ExternalLink className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="any"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className={`w-full border focus:border-blue-500/50 outline-none rounded-xl py-4 pl-5 pr-32 text-xl font-bold transition-all font-mono ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400' : 'bg-[#0B0E14] border-[#1E2533] text-white placeholder-gray-600'}`}
                                        required
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <span className={`font-bold text-sm ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{asset}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                                    Reference <span className="normal-case font-medium opacity-70">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={e => setNote(e.target.value.slice(0, 280))}
                                    placeholder="e.g. Rent contribution, lunch split..."
                                    className={`w-full border focus:border-blue-500/50 outline-none rounded-xl py-3.5 px-4 text-sm transition-all ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400' : 'bg-[#0B0E14] border-[#1E2533] text-white placeholder-gray-600'}`}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className="w-full py-4 px-4 rounded-xl font-extrabold text-[15px] tracking-wide transition-all duration-300 flex items-center justify-center gap-2.5
                                    bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500
                                    text-white shadow-[0_0_30px_rgba(59,130,246,0.2)] hover:shadow-[0_0_40px_rgba(59,130,246,0.3)]
                                    active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                                <Send className="w-5 h-5" /> Review Transfer {parsedAmount > 0 ? `· ${parsedAmount.toFixed(2)} ${asset}` : ''}
                            </button>
                        </form>
                    </div>

                    {/* RIGHT: SUMMARY & RECENT TRANSFERS */}
                    <div className={`lg:col-span-5 p-6 md:p-8 space-y-5 ${isLight ? 'bg-slate-50' : 'bg-[#0F1520]'}`}>
                        <div className={`rounded-2xl overflow-hidden border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111827] border-[#1E2533]'}`}>
                            <div className={`px-5 py-3 border-b ${isLight ? 'border-slate-200 bg-slate-50/60' : 'border-[#1E2533] bg-[#0B0E14]/50'}`}>
                                <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                                    <Zap className="w-3.5 h-3.5 text-emerald-500" /> Why It's Free
                                </h3>
                            </div>
                            <div className="p-5">
                                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                                    A Jasiri-to-Jasiri transfer never touches a blockchain, mobile money switch, or bank rail — it's a direct ledger move between two accounts on the same platform, exactly like a bank's own "internal" transfer between two of its own customers. No liquidity rail is used, so there's no cost to pass on.
                                </p>
                            </div>
                        </div>

                        <div className={`rounded-2xl overflow-hidden border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111827] border-[#1E2533]'}`}>
                            <div className={`px-5 py-3 border-b ${isLight ? 'border-slate-200 bg-slate-50/60' : 'border-[#1E2533] bg-[#0B0E14]/50'}`}>
                                <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                                    <Users className="w-3.5 h-3.5" /> Recent Transfers
                                </h3>
                            </div>
                            <div className="max-h-[280px] overflow-y-auto">
                                {history.length > 0 ? history.slice(0, 6).map((t: any) => (
                                    <div key={t.id} className={`px-5 py-3 flex items-center justify-between border-b last:border-b-0 ${isLight ? 'border-slate-100' : 'border-[#1E2533]/50'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${t.direction === 'sent' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                                                {t.direction === 'sent' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{t.direction === 'sent' ? 'Sent' : 'Received'}</p>
                                                <p className={`text-[10px] font-mono truncate max-w-[140px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{t.counterparty}</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-bold font-mono ${t.direction === 'sent' ? 'text-orange-500' : 'text-emerald-500'}`}>
                                            {t.direction === 'sent' ? '-' : '+'}{t.amount} {t.asset}
                                        </span>
                                    </div>
                                )) : (
                                    <div className="p-6 text-center">
                                        <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>No transfers yet.</p>
                                    </div>
                                )}
                            </div>
                            {history.length > 0 && (
                                <button
                                    onClick={() => navigate('/transactions')}
                                    className={`w-full p-3 border-t text-center cursor-pointer transition-colors text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center justify-center gap-1 ${isLight ? 'border-slate-200 bg-slate-50 hover:bg-slate-100' : 'border-[#1E2533] bg-[#0B0E14] hover:bg-[#111827]'}`}
                                >
                                    View all activity <ArrowRight className="w-3 h-3" />
                                </button>
                            )}
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
                                        <span>Only works between two <strong className={isLight ? 'text-slate-900' : 'text-white'}>verified Jasiri accounts</strong></span>
                                    </li>
                                    <li className={`flex items-start gap-2.5 text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500/50 shrink-0 mt-0.5" />
                                        <span>Internal transfers are <strong className={isLight ? 'text-slate-900' : 'text-white'}>instant and irreversible</strong></span>
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
