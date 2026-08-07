// @ts-nocheck
import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setLoading(true);

        try {
            // API call to confirm new password using the URL token
            // await api.post('/api/auth/reset-password', { token, newPassword: password });

            // Simulate API response
            await new Promise(resolve => setTimeout(resolve, 1500));

            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);

        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to reset password. The link may have expired.');
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

                {/* Logo Header */}
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] mb-4">
                        <Shield className="w-8 h-8 text-[#0a0f1a]" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">Create New Password</h2>
                    <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                        Please enter your new secure password below.
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
                        <h3 className="text-lg font-bold text-white mb-2">Password Updated!</h3>
                        <p className="text-sm text-emerald-400/80 leading-relaxed mb-6">
                            Your Jasiri account is secure. Redirecting you to login...
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">New Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#111827]/80 border border-[#1e2d3d] focus:border-emerald-500/50 outline-none rounded-xl py-3.5 pl-4 pr-12 text-white transition-all placeholder-gray-600 shadow-inner"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-[#111827]/80 border border-[#1e2d3d] focus:border-emerald-500/50 outline-none rounded-xl py-3.5 pl-4 pr-12 text-white transition-all placeholder-gray-600 shadow-inner"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !password || !confirmPassword}
                            className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm transition-all active:scale-[0.98] flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 mt-4"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Secure Account'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}