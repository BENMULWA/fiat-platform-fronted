import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function OtcSignup() {
    const navigate = useNavigate();
    const { requestSignupOtp, verifySignupOtp, resendSignupOtp } = useAuth();

    const [step, setStep] = useState<'form' | 'otp'>('form');
    const [businessName, setBusinessName] = useState('');
    const [contactName, setContactName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otpSessionId, setOtpSessionId] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submitDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!businessName.trim()) return setError('Business name is required.');
        if (password.length < 8) return setError('Password must be at least 8 characters.');
        setLoading(true);
        try {
            const result = await requestSignupOtp(contactName || businessName, email, password, 'institutional', businessName);
            setOtpSessionId(result.otpSessionId);
            setStep('otp');
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Could not start signup. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const submitOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await verifySignupOtp(otpSessionId, otpCode.trim());
            navigate('/otc/onboarding');
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Invalid or expired code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#070B14] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="flex items-center gap-2 justify-center mb-8">
                    <Building2 className="w-6 h-6 text-emerald-400" />
                    <span className="text-white font-semibold tracking-tight">Jasiri OTC</span>
                </div>
                <div className="bg-[#0F1520] border border-[#1E2D3D] rounded-lg p-6">
                    {step === 'form' ? (
                        <>
                            <h1 className="text-lg font-semibold text-white mb-1">Create your institutional account</h1>
                            <p className="text-xs text-gray-500 mb-6">For businesses settling bulk crypto/fiat trades. Deep KYB onboarding follows signup.</p>
                            {error && <p className="text-xs text-red-400 mb-4">{error}</p>}
                            <form onSubmit={submitDetails} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Registered business name</label>
                                    <input value={businessName} onChange={e => setBusinessName(e.target.value)} required className="w-full bg-[#0A0D14] border border-[#1E2D3D] rounded px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Contact person's name</label>
                                    <input value={contactName} onChange={e => setContactName(e.target.value)} className="w-full bg-[#0A0D14] border border-[#1E2D3D] rounded px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Business email</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-[#0A0D14] border border-[#1E2D3D] rounded px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Password</label>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="w-full bg-[#0A0D14] border border-[#1E2D3D] rounded px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500" />
                                </div>
                                <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded text-sm flex items-center justify-center gap-2">
                                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null} Continue
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <h1 className="text-lg font-semibold text-white mb-1">Verify your email</h1>
                            <p className="text-xs text-gray-500 mb-6">Enter the code sent to {email}.</p>
                            {error && <p className="text-xs text-red-400 mb-4">{error}</p>}
                            <form onSubmit={submitOtp} className="space-y-4">
                                <input value={otpCode} onChange={e => setOtpCode(e.target.value)} required className="w-full bg-[#0A0D14] border border-[#1E2D3D] rounded px-3 py-2.5 text-sm text-white text-center tracking-[0.3em] outline-none focus:border-emerald-500" placeholder="000000" maxLength={6} />
                                <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded text-sm flex items-center justify-center gap-2">
                                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null} Verify &amp; create account
                                </button>
                                <button type="button" onClick={() => resendSignupOtp(otpSessionId).then(r => setOtpSessionId(r.otpSessionId)).catch(() => {})} className="w-full text-xs text-gray-500 hover:text-gray-300">
                                    Resend code
                                </button>
                            </form>
                        </>
                    )}
                </div>
                <p className="text-center text-xs text-gray-500 mt-4">
                    Already have an account? <Link to="/login" className="text-emerald-400 hover:text-emerald-300">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
