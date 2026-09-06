import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { forgotPassword } from '../api/client';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await forgotPassword({ email });
            setSubmitted(true);
        } catch (err: any) {
            // Even on error, we show a generic message to prevent email enumeration
            setSubmitted(true);
            console.error("Forgot password error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#06090F] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white tracking-tight">Forgot Password</h1>
                    <p className="text-gray-400 mt-2">Enter your email to receive a reset link.</p>
                </div>

                <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-8 shadow-2xl">
                    {submitted ? (
                        <div className="text-center animate-in fade-in">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-emerald-500/20">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Check Your Email</h2>
                            <p className="text-gray-400 mt-3">
                                If an account exists for <span className="font-bold text-white">{email}</span>, you will receive an email with instructions on how to reset your password.
                            </p>
                            <Link to="/login" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
                                <ArrowLeft className="w-4 h-4" />
                                Back to Log In
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full bg-[#111827] border border-[#1E2533] focus:border-emerald-500/50 outline-none rounded-xl py-3.5 pl-12 pr-4 text-sm text-white transition-all font-mono placeholder-gray-600"
                                        required
                                    />
                                </div>
                            </div>
                            {error && <p className="text-sm text-red-400">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
                            </button>
                        </form>
                    )}
                </div>
                {!submitted && (
                    <div className="text-center mt-6">
                        <Link to="/login" className="text-sm font-medium text-gray-400 hover:text-emerald-400 transition-colors">
                            Remember your password? Log in
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}