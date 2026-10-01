// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { getFriendlyErrorMessage } from '../utils/errorMessages';
import AuthShell, { AuthAside, ASIDE_ITEMS, authStyles } from '../components/auth/AuthShell';

export default function Signup() {
    const navigate = useNavigate();
    const { requestSignupOtp, verifySignupOtp, resendSignupOtp } = useAuth();
    const st = authStyles('retail');

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

    const pwScore = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
    const pwLabel = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][pwScore];

    const validateForm = () => {
        const nameParts = name.trim().split(' ');
        if (nameParts.length < 2) { setError('Please enter your full legal name (First and Last name).'); return false; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return false; }
        if (password.length < 8) { setError('Password must be at least 8 characters long.'); return false; }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);
        try {
            if (!otpStep) {
                if (!validateForm()) { setLoading(false); return; }
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
            setError(getFriendlyErrorMessage(err, { fallback: 'Failed to create account.' }));
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
            setError(getFriendlyErrorMessage(err, { fallback: 'Failed to resend OTP.' }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell variant="retail" narrow backTo={{ to: '/', label: 'Back to Jasiri' }}
            aside={<AuthAside title="Your Jasiri account gives you:" items={ASIDE_ITEMS.retail}
                footer={<><p className="font-semibold text-amber-300">What happens after you sign up</p>
                    <ol className="mt-3 space-y-2"><li><b>1.</b> Verify your email with a one-time code.</li><li><b>2.</b> Complete a quick identity check (KYC).</li><li><b>3.</b> Fund your wallet and start swapping.</li></ol></>} />}>
            {otpStep && (
                <button type="button" onClick={() => { setOtpStep(false); setError(''); setSuccessMessage(''); }} className={`mb-4 inline-flex items-center gap-1 text-xs font-semibold ${st.muted} hover:opacity-80`}>
                    <ArrowLeft className="h-3.5 w-3.5" /> Edit details
                </button>
            )}
            <h1 className={`text-2xl font-bold ${st.title}`}>{otpStep ? 'Verify your email' : 'Create your Jasiri account'}</h1>
            <p className={`mt-1.5 text-sm ${st.muted}`}>{otpStep ? 'Enter the 6-digit code we emailed you.' : 'Start in minutes. Identity verification follows signup.'}</p>

            {error && <div className={`mt-5 flex items-start gap-2.5 ${st.error}`}><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{error}</p></div>}
            {successMessage && <div className={`mt-5 ${st.success}`}><p>{successMessage}</p></div>}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {!otpStep ? (
                    <>
                        <div>
                            <label className={st.label}>Full legal name <span className="text-rose-500">*</span></label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={st.input} placeholder="First and last name" autoComplete="name" required />
                        </div>
                        <div>
                            <label className={st.label}>Email address <span className="text-rose-500">*</span></label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={st.input} placeholder="name@email.com" autoComplete="email" required />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className={st.label}>Password <span className="text-rose-500">*</span></label>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={`${st.input} pr-10`} placeholder="At least 8 characters" autoComplete="new-password" required />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${st.eye}`} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={st.label}>Confirm password <span className="text-rose-500">*</span></label>
                                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={st.input} placeholder="Repeat password" autoComplete="new-password" required />
                            </div>
                        </div>
                        {password && (
                            <div className="flex items-center gap-2">
                                <div className="flex flex-1 gap-1">{[1, 2, 3, 4].map(i => <span key={i} className={`h-1 flex-1 rounded-full ${pwScore >= i ? (pwScore >= 3 ? 'bg-emerald-500' : 'bg-amber-400') : 'bg-slate-200'}`} />)}</div>
                                <span className="text-[11px] text-slate-500">{pwLabel}</span>
                            </div>
                        )}
                    </>
                ) : (
                    <div>
                        <input type="text" inputMode="numeric" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className={`${st.input} py-3.5 text-center text-xl font-semibold tracking-[0.5em]`} placeholder="------" required />
                        <div className="mt-3 flex items-center justify-between text-xs">
                            <span className={st.muted}>{resendCooldown > 0 ? `You can resend in ${resendCooldown}s` : 'Did not receive the code?'}</span>
                            <button type="button" onClick={handleResendOtp} disabled={loading || resendCooldown > 0} className={`${st.link} disabled:cursor-not-allowed disabled:opacity-50`}>Resend OTP</button>
                        </div>
                    </div>
                )}

                <button type="submit" disabled={loading} className={st.button}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (otpStep ? 'Verify and create account' : 'Create account')}
                </button>
                {!otpStep && (
                    <p className={`text-center text-xs leading-relaxed ${st.muted}`}>
                        By creating an account, you agree to Jasiri's <a href="#" className={st.link}>Terms of Service</a> and acknowledge our <a href="#" className={st.link}>Privacy Policy</a>.
                    </p>
                )}
            </form>

            <div className="mt-7 space-y-2 border-t border-slate-100 pt-5 text-center text-sm">
                <p className={st.muted}>Already have an account? <Link to="/login" className={st.link}>Sign in</Link></p>
                <p className={`text-xs ${st.muted}`}>Opening an account for your business? <Link to="/otc/signup" className={st.link}>Institutional signup</Link></p>
            </div>
        </AuthShell>
    );
}
