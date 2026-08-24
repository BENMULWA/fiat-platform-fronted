
//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { resetPassword } from '../api/client';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Invalid or missing reset token. Please request a new link.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }
        if (password.length > 72) {
            setError('Password cannot be longer than 72 characters.');
            return;
        }
        if (!token) {
            setError('Invalid or missing reset token.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // This API call needs to be implemented on the backend
            await resetPassword({ token, new_password: password });
            setSuccess(true);
            setTimeout(() => navigate('/login', { state: { successMessage: 'Password has been reset successfully. You can now log in.' } }), 3000);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to reset password. The link may be expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#06090F] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white tracking-tight">Reset Your Password</h1>
                    <p className="text-gray-400 mt-2">Choose a new, strong password.</p>
                </div>

                <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-8 shadow-2xl">
                    {success ? (
                        <div className="text-center animate-in fade-in">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-emerald-500/20">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Password Reset!</h2>
                            <p className="text-gray-400 mt-3">
                                Your password has been updated. You will be redirected to the login page shortly.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-[#111827] border border-[#1E2533] focus:border-emerald-500/50 outline-none rounded-xl py-3.5 pl-12 pr-4 text-sm text-white transition-all font-mono"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Confirm New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-[#111827] border border-[#1E2533] focus:border-emerald-500/50 outline-none rounded-xl py-3.5 pl-12 pr-4 text-sm text-white transition-all font-mono"
                                        required
                                    />
                                </div>
                            </div>
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={loading || !token || !password || !confirmPassword}
                                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}