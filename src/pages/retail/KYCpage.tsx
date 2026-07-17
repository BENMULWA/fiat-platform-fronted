// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, Upload, Loader2, AlertCircle, Lock, X, ArrowRight } from 'lucide-react';
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
    fileName: ''
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
      // If they are verified, auto-redirect them away from this page after 3 seconds!
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

    if (!form.fileName) {
      setToast({ type: 'error', message: 'You must upload an ID document!' });
      return false;
    }

    const fileExt = form.fileName.split('.').pop()?.toLowerCase();
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];

    if (!fileExt || !validExtensions.includes(fileExt)) {
      setToast({ type: 'error', message: 'Invalid file! Only PDF, JPG, or PNG images are allowed.' });
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

  // 🟢 IF VERIFIED: SHOW SUCCESS SCREEN ONLY (NO FORM)
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

  // 🔴 IF UNVERIFIED: SHOW THE FORM
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 animate-in fade-in duration-500 relative">

      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl animate-in slide-in-from-top-4 font-bold border ${toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-6 md:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">KYC Verification</h1>
            <p className="text-sm text-gray-400">Verify your identity before using deposits, withdrawals, or swaps.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Full name (As it appears on ID)</label>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full rounded-xl border border-[#1E2533] bg-[#0F1520] px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">ID / Passport number</label>
            <input
              value={form.idNumber}
              onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
              className="w-full rounded-xl border border-[#1E2533] bg-[#0F1520] px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Email address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-[#1E2533] bg-[#0F1520] px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Phone number</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g. 0712345678"
              className="w-full rounded-xl border border-[#1E2533] bg-[#0F1520] px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors font-mono"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Upload ID document (PDF, JPG, PNG)</label>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-[#2A3A4F] bg-[#0F1520] px-4 py-4 text-sm text-gray-400 transition-colors hover:border-emerald-500/50">
              <span>{form.fileName || 'Click to select a valid document'}</span>
              <span className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-bold bg-[#122033] text-emerald-400">
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

          <div className="md:col-span-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3.5 font-bold text-black transition hover:bg-emerald-400 disabled:bg-[#1E2533] disabled:text-gray-500 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              {loading ? 'Submitting Documents...' : 'Submit KYC & Unlock Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}