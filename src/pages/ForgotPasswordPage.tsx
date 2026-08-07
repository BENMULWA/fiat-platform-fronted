// @ts-nocheck
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // API call to trigger reset email
            // await api.post('/api/auth/forgot-password', { email });

            // Simulating API delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to send reset link. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4">
            {/* Background Image with Overlay */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: "url('/image_aaeaf7.jpg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            />
            <div className="absolute inset-0 z-0 bg-[#0a0f1a]/85 backdrop-blur-sm" />

            {/* Card */}
            <div className="relative z-10 w-full max-w-[420px] bg-[#0b101a]/80 backdrop-blur-xl border border-[#1e2d3d] rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">

                {/* Back Button */}
                <Link to="/login" className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors mb-6">
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                </Link>

                {/* Logo Header */}
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] mb-4">
                        <Shield className="w-8 h-8 text-[#0a0f1a]" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">Reset Password</h2>
                    <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                        Enter the email address associated with your Jasiri account and we'll send you a secure link to reset your password.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {success ? (
                    <div className="text-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-in fade-in">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Check your email</h3>
                        <p className="text-sm text-emerald-400/80 leading-relaxed mb-6">
                            We've sent a password reset link to <strong className="text-emerald-400">{email}</strong>.
                        </p>
                        <Link to="/login" className="w-full block py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                            Return to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#111827]/80 border border-[#1e2d3d] focus:border-emerald-500/50 outline-none rounded-xl py-3.5 px-4 text-white transition-all placeholder-gray-600 shadow-inner"
                                placeholder="name@company.com"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm transition-all active:scale-[0.98] flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 mt-4"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}