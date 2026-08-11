// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import logo from '../pages/assets/jasiri-icon.png';

export default function Signup() {
    const navigate = useNavigate();
    const { requestSignupOtp, verifySignupOtp, resendSignupOtp } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [otpSessionId, setOtpSessionId] = useState('');
    const [otpStep, setOtpStep] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = window.setInterval(() => {
            setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [resendCooldown]);

    const validateForm = () => {
        // Enforce First and Last Name
        const nameParts = name.trim().split(' ');
        if (nameParts.length < 2) {
            setError('Please enter your full legal name (First and Last name).');
            return false;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return false;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        setLoading(true);

        try {
            if (!otpStep) {
                if (!validateForm()) {
                    setLoading(false);
                    return;
                }
                const result = await requestSignupOtp(name, email, password);
                setOtpSessionId(result.otpSessionId);
                setOtpStep(true);
                setResendCooldown(30);
                setSuccessMessage(`We sent a verification code to ${email}. It expires in ${result.expiresInMinutes} minutes.`);
            } else {
                if (!otpCode || otpCode.trim().length < 4) {
                    setError('Please enter the OTP code sent to your email.');
                    setLoading(false);
                    return;
                }
                await verifySignupOtp(otpSessionId, otpCode.trim());
                navigate('/kyc');
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to create account.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (!otpSessionId || resendCooldown > 0) return;
        setError('');
        setSuccessMessage('');
        setLoading(true);
        try {
            const result = await resendSignupOtp(otpSessionId);
            setResendCooldown(result.cooldownSeconds || 30);
            setSuccessMessage(`A new code was sent to ${email}. It expires in ${result.expiresInMinutes} minutes.`);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to resend OTP.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 py-12">
            {/* Background Image with Overlay */}
            <div
                className="fixed inset-0 z-0"
                style={{
                    backgroundImage: "url('/image_aaeaf7.jpg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            />
            <div className="fixed inset-0 z-0 bg-[#0a0f1a]/85 backdrop-blur-sm" />

            {/* Signup Card */}
            <div className="relative z-10 w-full max-w-[420px] bg-[#0b101a]/80 backdrop-blur-xl border border-[#1e2d3d] rounded-3xl p-8 shadow-2xl my-8">

                {/* Logo Header with iOS App Icon Wrapper */}
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-white p-3 rounded-3xl shadow-[0_0_30px_rgba(0,210,130,0.15)] mb-4 border border-gray-100 flex items-center justify-center">
                        <img
                            src={logo}
                            alt="Jasiri Capital Logo"
                            className="h-20 md:h-24 w-auto object-contain"
                        />
                    </div>

                    <h2 className="text-2xl font-extrabold text-white tracking-tight mt-2">Create Account</h2>
                    <p className="text-sm text-gray-400 mt-1"></p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {successMessage && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-sm font-medium">
                        <p>{successMessage}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!otpStep ? (
                        <>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Full Legal Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-[#111827]/80 border border-[#1e2d3d] focus:border-emerald-500/50 outline-none rounded-xl py-3.5 px-4 text-white transition-all placeholder-gray-600 shadow-inner"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Password</label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-[#111827]/80 border border-[#1e2d3d] focus:border-emerald-500/50 outline-none rounded-xl py-3.5 px-4 text-white transition-all placeholder-gray-600 shadow-inner"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Confirm</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-[#111827]/80 border border-[#1e2d3d] focus:border-emerald-500/50 outline-none rounded-xl py-3.5 pl-4 pr-10 text-white transition-all placeholder-gray-600 shadow-inner"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 mt-4">
                                <input type="checkbox" required className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900" />
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    By creating an account, you agree to Jasiri's <a href="#" className="text-emerald-400 hover:underline">Terms of Service</a> and acknowledge our <a href="#" className="text-emerald-400 hover:underline">Privacy Policy</a>.
                                </p>
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Email OTP Code</label>
                            <input
                                type="text"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full bg-[#111827]/80 border border-[#1e2d3d] focus:border-emerald-500/50 outline-none rounded-xl py-3.5 px-4 text-white transition-all placeholder-gray-600 shadow-inner tracking-[0.4em] text-center text-lg"
                                placeholder="------"
                                required
                            />
                            <p className="text-xs text-gray-400 mt-2">Enter the 6-digit code sent to your email.</p>
                            <div className="mt-3 flex items-center justify-between text-xs">
                                <span className="text-gray-400">
                                    {resendCooldown > 0 ? `You can resend in ${resendCooldown}s` : 'Did not receive the code?'}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={loading || resendCooldown > 0}
                                    className="font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Resend OTP
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm transition-all active:scale-[0.98] flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 mt-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (otpStep ? 'Verify OTP & Continue' : 'Create Account')}
                    </button>
                </form>

                <div className="mt-8 text-center border-t border-[#1e2d3d] pt-6">
                    <p className="text-sm text-gray-400">
                        Already have an account?{' '}
                        <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
                            Log in instead
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}