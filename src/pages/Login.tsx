//@ts-nocheck
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { getFriendlyErrorMessage } from '../utils/errorMessages';
import AuthShell, { AuthAside, ASIDE_ITEMS, StaffNotice, authStyles } from '../components/auth/AuthShell';

export default function Login() {
    const { requestLoginOtp, verifyLoginOtp, resendLoginOtp } = useAuth();

    // One shared /login for every audience: the backend resolves the account's role and
    // App.tsx redirects to the right home. The ?portal= value only changes the look and
    // the links shown. Reached via /staff ("Staff login" -> ?portal=admin) and the OTC
    // pages (?portal=otc). Admin accounts are provisioned internally -- no signup link.
    const [searchParams] = useSearchParams();
    const portal = searchParams.get('portal');
    const variant = portal === 'admin' ? 'staff' : portal === 'otc' ? 'otc' : 'retail';
    const isAdminPortal = variant === 'staff';
    const st = authStyles(variant);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [otpStep, setOtpStep] = useState(false);
    const [otpSessionId, setOtpSessionId] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = window.setInterval(() => {
            setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [resendCooldown]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        try {
            if (!otpStep) {
                const result = await requestLoginOtp(email, password);
                setOtpSessionId(result.otpSessionId);
                setOtpStep(true);
                setResendCooldown(30);
                setSuccessMessage(`OTP sent to ${email}. It expires in ${result.expiresInMinutes} minutes.`);
            } else {
                if (!otpCode || otpCode.trim().length < 4) {
                    setError('Please enter the OTP code sent to your email.');
                    setLoading(false);
                    return;
                }
                await verifyLoginOtp(otpSessionId, otpCode.trim());
                // No navigate() here: the wrapping <Route path="/login"> in App.tsx redirects to
                // the right destination (/dashboard, /admin/dashboard, /otc/overview) as soon as
                // `user` updates -- one source of truth for where each role goes.
            }
        } catch (err: any) {
            setError(getFriendlyErrorMessage(err, { fallback: 'Login failed. Please verify your credentials.' }));
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
            const result = await resendLoginOtp(otpSessionId);
            setResendCooldown(result.cooldownSeconds || 30);
            setSuccessMessage(`A new OTP was sent to ${email}. It expires in ${result.expiresInMinutes} minutes.`);
        } catch (err: any) {
            setError(getFriendlyErrorMessage(err, { fallback: 'Failed to resend OTP.' }));
        } finally {
            setLoading(false);
        }
    };

    const heading = isAdminPortal ? 'Staff sign-in' : variant === 'otc' ? 'Sign in to Jasiri OTC' : 'Welcome back';
    const sub = isAdminPortal ? 'Reserved for authorised Jasiri staff.' : variant === 'otc' ? 'Access your institutional desk, wallets and settlements.' : 'Log in to your Jasiri account.';

    const aside = isAdminPortal ? null : variant === 'otc'
        ? <AuthAside title="Your Jasiri OTC desk" items={ASIDE_ITEMS.otc} emblem />
        : <AuthAside title="Welcome back to Jasiri" items={ASIDE_ITEMS.retail} />;

    return (
        <AuthShell variant={variant} aside={aside} narrow backTo={{ to: '/', label: 'Back to Jasiri' }}>
            <h1 className={`text-2xl font-bold ${st.title}`}>{heading}</h1>
            <p className={`mt-1.5 text-sm ${st.muted}`}>{sub}</p>

            {error && (
                <div className={`mt-5 flex items-start gap-2.5 ${st.error}`}>
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{error}</p>
                </div>
            )}
            {successMessage && <div className={`mt-5 ${st.success}`}><p>{successMessage}</p></div>}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {!otpStep ? (
                    <>
                        <div>
                            <label className={st.label}>Email address</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={st.input} placeholder="name@company.com" autoComplete="email" required />
                        </div>
                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <label className={`${st.label} !mb-0`}>Password</label>
                                <Link to="/forgot-password" className={`text-xs ${st.link}`}>Forgot password?</Link>
                            </div>
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={`${st.input} pr-11`} placeholder="Your password" autoComplete="current-password" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${st.eye}`} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div>
                        <label className={st.label}>Email OTP code</label>
                        <input type="text" inputMode="numeric" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className={`${st.input} py-3.5 text-center text-xl font-semibold tracking-[0.5em]`} placeholder="------" required />
                        <p className={`mt-2 text-xs ${st.muted}`}>Enter the 6-digit verification code sent to your email.</p>
                        <div className="mt-3 flex items-center justify-between text-xs">
                            <span className={st.muted}>{resendCooldown > 0 ? `You can resend in ${resendCooldown}s` : 'Did not receive the code?'}</span>
                            <button type="button" onClick={handleResendOtp} disabled={loading || resendCooldown > 0} className={`${st.link} disabled:cursor-not-allowed disabled:opacity-50`}>Resend OTP</button>
                        </div>
                    </div>
                )}

                <button type="submit" disabled={loading} className={st.button}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (otpStep ? 'Verify OTP and sign in' : 'Sign in securely')}
                </button>
            </form>

            {isAdminPortal ? (
                <StaffNotice />
            ) : (
                <div className={`mt-7 space-y-2 border-t pt-5 text-center text-sm ${st.dark ? 'border-[#1e2d3d]' : 'border-slate-100'}`}>
                    {variant === 'otc' ? (
                        <>
                            <p className={st.muted}>New to Jasiri OTC? <Link to="/otc/signup" className={st.link}>Open an institutional account</Link></p>
                            <p className={`text-xs ${st.muted}`}>Looking for personal use? <Link to="/login" className={st.link}>Retail sign-in</Link></p>
                        </>
                    ) : (
                        <>
                            <p className={st.muted}>Don't have an account? <Link to="/signup" className={st.link}>Create one now</Link></p>
                            <p className={`text-xs ${st.muted}`}>Signing in for your business? <Link to="/login?portal=otc" className={st.link}>OTC desk sign-in</Link></p>
                        </>
                    )}
                </div>
            )}
        </AuthShell>
    );
}
