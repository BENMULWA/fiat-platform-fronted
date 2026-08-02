import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, Upload, Loader2, AlertCircle, Lock, X, ArrowRight, Camera, KeyRound } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getKycStatus, submitKyc } from '../../api/client';
import { useNavigate } from 'react-router-dom';

export default function KYCpage() {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        fullName: user?.name || '',
        idNumber: '',
        email: user?.email || '',
        phone: '',
        pin: '',
        fileName: '',
        selfieName: ''
    });

    const [status, setStatus] = useState<'pending' | 'verified' | 'unverified'>(user?.kycStatus as any || 'unverified');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await getKycStatus();
                if (res.data?.kycStatus) {
                    setStatus(res.data.kycStatus);
                    updateUser({ kycStatus: res.data.kycStatus });
                }
            } catch (err) {
                console.warn('KYC status unavailable', err);
            }
        };
        fetchStatus();
    }, []);

    // --- PERMANENT REDIRECT FOR VERIFIED USERS ---
    useEffect(() => {
        if (status === 'verified') {
            const timer = setTimeout(() => navigate('/dashboard'), 3000);
            return () => clearTimeout(timer);
        }
    }, [status, navigate]);

    const validateForm = () => {
        const phoneRegex = /^(?:\+254|0|254)[17]\d{8}$/;
        if (!phoneRegex.test(form.phone.trim())) {
            setToast({ type: 'error', message: 'Invalid phone format! Use 07..., 01..., or 2547...' });
            return false;
        }

        if (!form.pin || form.pin.length < 4) {
            setToast({ type: 'error', message: 'Please set a secure 4-digit Trading PIN.' });
            return false;
        }

        if (!form.fileName || !form.selfieName) {
            setToast({ type: 'error', message: 'You must upload both an ID document and a Selfie!' });
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setToast(null);

        if (!validateForm()) {
            setTimeout(() => setToast(null), 5000);
            return;
        }

        setLoading(true);

        try {
            await submitKyc({
                fullName: form.fullName,
                idNumber: form.idNumber,
                email: form.email,
                phone: form.phone,
                documentName: form.fileName
            });

            setStatus('verified');
            updateUser({ kycStatus: 'verified' });
            setToast({ type: 'success', message: 'KYC Verified! Redirecting to your dashboard...' });

        } catch (err: any) {
            setToast({ type: 'error', message: err.response?.data?.detail || 'KYC submission failed.' });
            setTimeout(() => setToast(null), 5000);
        } finally {
            setLoading(false);
        }
    };

    // 🟢 IF VERIFIED: SHOW SUCCESS SCREEN ONLY
    if (status === 'verified') {
        return (
            <div className="max-w-2xl mx-auto p-4 md:p-6 mt-10 animate-in fade-in zoom-in duration-500">
                <div className="bg-[#0B0E14] border border-emerald-500/30 rounded-2xl p-10 shadow-2xl shadow-emerald-900/10 text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-3">Identity Verified</h1>
                    <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                        Your identity has been successfully linked to your account. You now have full access to deposits, withdrawals, and trading.
                    </p>
                    <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
                        Enter Dashboard <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    // 🔴 IF UNVERIFIED: SHOW THE MANDATORY GATEWAY FORM
    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 animate-in fade-in duration-500 relative">

            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl animate-in slide-in-from-top-4 font-bold border ${toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
                </div>
            )}

            <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                {/* Gateway Banner */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500" />

                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Lock className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Jasiri Capital Gateway</h1>
                        <p className="text-sm text-gray-400">Please complete identity verification to unlock your dashboard and wallets.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">

                    {/* Section 1: Details */}
                    <div className="md:col-span-2 grid gap-5 md:grid-cols-2 bg-[#111827] p-5 rounded-xl border border-[#1E2533]">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Full name (As it appears on ID)</label>
                            <input
                                value={form.fullName}
                                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                className="w-full rounded-xl border border-[#1E2533] bg-[#0F1520] px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">ID / Passport number</label>
                            <input
                                value={form.idNumber}
                                onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                                className="w-full rounded-xl border border-[#1E2533] bg-[#0F1520] px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Phone number</label>
                            <input
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                placeholder="e.g. 0712345678"
                                className="w-full rounded-xl border border-[#1E2533] bg-[#0F1520] px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors font-mono"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> 4-Digit Trading PIN</label>
                            <input
                                type="password"
                                maxLength={4}
                                value={form.pin}
                                onChange={(e) => setForm({ ...form, pin: e.target.value })}
                                placeholder="••••"
                                className="w-full rounded-xl border border-[#1E2533] bg-[#0F1520] px-4 py-3 text-center text-lg tracking-[0.5em] text-white focus:border-blue-500 outline-none transition-colors font-mono"
                                required
                            />
                        </div>
                    </div>

                    {/* Section 2: Documents (Smile ID Concept) */}
                    <div className="md:col-span-2 grid gap-5 md:grid-cols-2">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">1. Upload ID Document</label>
                            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-[#2A3A4F] bg-[#0F1520] px-4 py-4 text-sm text-gray-400 transition-colors hover:border-blue-500/50">
                                <span className="truncate mr-3">{form.fileName || 'National ID or Passport (PDF/JPG)'}</span>
                                <span className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-bold bg-[#122033] text-blue-400 shrink-0">
                                    <Upload className="w-4 h-4" /> Upload
                                </span>
                                <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    className="hidden"
                                    onChange={(e) => setForm({ ...form, fileName: e.target.files?.[0]?.name || '' })}
                                />
                            </label>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5"><Camera className="w-3.5 h-3.5 text-emerald-400" /> 2. Smile ID (Selfie)</label>
                            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-[#2A3A4F] bg-[#0F1520] px-4 py-4 text-sm text-gray-400 transition-colors hover:border-emerald-500/50">
                                <span className="truncate mr-3">{form.selfieName || 'Take a clear selfie to match ID'}</span>
                                <span className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-bold bg-[#122033] text-emerald-400 shrink-0">
                                    <Camera className="w-4 h-4" /> Capture
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="user"
                                    className="hidden"
                                    onChange={(e) => setForm({ ...form, selfieName: e.target.files?.[0]?.name || '' })}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="md:col-span-2 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-4 font-bold text-white transition hover:bg-blue-500 disabled:bg-[#1E2533] disabled:text-gray-500 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 text-lg"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                            {loading ? 'Verifying Identity...' : 'Submit & Unlock Dashboard'}
                        </button>
                        <p className="text-center text-xs text-gray-500 mt-4">By submitting, you agree to the Jasiri Capital Terms of Service and Privacy Policy.</p>
                    </div>
                </form>
            </div>
        </div>
    );
}