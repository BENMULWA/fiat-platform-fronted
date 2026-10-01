import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RefreshCw, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthBackdrop, AuthBrand } from '../../components/auth/AuthShell';

const COUNTRIES: { name: string; dial: string }[] = [
    { name: 'Kenya', dial: '+254' }, { name: 'Uganda', dial: '+256' }, { name: 'Tanzania', dial: '+255' }, { name: 'Rwanda', dial: '+250' },
    { name: 'Burundi', dial: '+257' }, { name: 'Nigeria', dial: '+234' }, { name: 'Ghana', dial: '+233' }, { name: 'South Africa', dial: '+27' },
    { name: 'Ethiopia', dial: '+251' }, { name: 'Zambia', dial: '+260' }, { name: 'Malawi', dial: '+265' }, { name: 'Senegal', dial: '+221' },
    { name: "Cote d'Ivoire", dial: '+225' }, { name: 'Cameroon', dial: '+237' }, { name: 'Egypt', dial: '+20' }, { name: 'Morocco', dial: '+212' },
    { name: 'Zimbabwe', dial: '+263' }, { name: 'Mozambique', dial: '+258' }, { name: 'DR Congo', dial: '+243' },
    { name: 'United Kingdom', dial: '+44' }, { name: 'Germany', dial: '+49' }, { name: 'France', dial: '+33' }, { name: 'United Arab Emirates', dial: '+971' },
    { name: 'United States', dial: '+1' }, { name: 'Canada', dial: '+1' }, { name: 'China', dial: '+86' }, { name: 'Hong Kong', dial: '+852' },
    { name: 'India', dial: '+91' }, { name: 'Singapore', dial: '+65' }, { name: 'Australia', dial: '+61' },
];
const BUSINESS_TYPES = [
    'Fintech / Payments', 'Crypto / Digital assets', 'Logistics & freight', 'Import / Export & trading', 'Remittance / Money transfer',
    'E-commerce / Retail', 'Manufacturing', 'Agriculture', 'Professional services', 'Other',
];
const VOLUMES = ['Under $50,000', '$50,000 - $250,000', '$250,000 - $1 million', '$1 million - $5 million', 'Above $5 million'];
const HEARD = ['Search engine', 'Social media', 'Friend or colleague', 'Event or conference', 'Email', 'Other'];

const BENEFITS = [
    'An institutional OTC desk with a dedicated dealer, quoting from live market and central bank rates.',
    'Multi-currency wallets across Kenya, Uganda, Nigeria and more, in one place.',
    'Settle conversions into your Jasiri wallet, a bank account, or your own crypto wallet on the network you choose.',
    'Pay your beneficiaries and suppliers from your balance, with every payout tracked.',
    'Two-person treasury approvals and a full audit trail on every settlement.',
];

export default function OtcSignup() {
    const navigate = useNavigate();
    const { requestSignupOtp, verifySignupOtp, resendSignupOtp } = useAuth();

    const [step, setStep] = useState<'form' | 'otp'>('form');
    const [fullName, setFullName] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [email, setEmail] = useState('');
    const [country, setCountry] = useState('Kenya');
    const [dial, setDial] = useState('+254');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [businessType, setBusinessType] = useState('');
    const [monthlyVolume, setMonthlyVolume] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [heard, setHeard] = useState<string[]>([]);
    const [incorporationNumber, setIncorporationNumber] = useState('');
    const [consent, setConsent] = useState(false);
    const [otpSessionId, setOtpSessionId] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);

    const input = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15';
    const label = 'block text-[12.5px] font-semibold text-[#0b2a3b] mb-1';
    const star = <span className="text-rose-500">*</span>;

    const onCountry = (name: string) => {
        setCountry(name);
        const c = COUNTRIES.find(x => x.name === name);
        if (c) setDial(c.dial);
    };

    const pwScore = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
    const pwLabel = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][pwScore];

    const submitDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid business email.');
        if (password.length < 8) return setError('Password must be at least 8 characters.');
        if (!phone.replace(/\D/g, '')) return setError('Enter your phone number.');
        if (heard.length === 0) return setError('Tell us how you heard about Jasiri.');
        if (!consent) return setError('Please accept the Terms of Use and Privacy Policy to continue.');
        setLoading(true);
        try {
            const result = await requestSignupOtp(fullName.trim(), email.trim(), password, 'institutional', businessName.trim(), {
                country, phone: `${dial}${phone.replace(/\D/g, '').replace(/^0+/, '')}`, businessType, monthlyVolume,
                incorporationNumber: incorporationNumber.trim(), referralCode: referralCode.trim() || undefined, heardAbout: heard, consent,
            });
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

    const resend = () => {
        setError(''); setInfo('');
        resendSignupOtp(otpSessionId)
            .then(r => { setOtpSessionId(r.otpSessionId); setInfo('A new code has been sent.'); })
            .catch((err: any) => setError(err?.response?.data?.detail || 'Could not resend the code yet. Please wait a moment.'));
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#04101c] font-sans">
            {/* Jasiri-themed backdrop: deep navy to teal, brand gold band, soft glows and a fine dot grid */}
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#04101c_0%,#06263a_46%,#0a4a5a_100%)]" />
            <AuthBackdrop variant="otc" />

            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-5">
                <AuthBrand variant="otc" />

                <div className="mt-5 grid items-start gap-6 lg:gap-10 lg:grid-cols-[minmax(0,640px)_1fr]">
                    <div className="rounded-2xl bg-white p-5 sm:p-7 shadow-2xl shadow-black/40">
                        {step === 'form' ? (
                            <>
                                <h1 className="text-center text-xl sm:text-[22px] font-bold text-[#0b2a3b]">Create your Jasiri OTC account</h1>
                                <p className="mx-auto mt-1 max-w-md text-center text-[13px] text-slate-500">For businesses settling bulk crypto and fiat trades. Full KYB verification follows signup.</p>
                                {error && <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">{error}</div>}

                                <form onSubmit={submitDetails} className="mt-5 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                                    <div>
                                        <label className={label}>Full name {star}</label>
                                        <input value={fullName} onChange={e => setFullName(e.target.value)} required className={input} placeholder="Enter your full name" autoComplete="name" />
                                    </div>
                                    <div>
                                        <label className={label}>Registered business name {star}</label>
                                        <input value={businessName} onChange={e => setBusinessName(e.target.value)} required className={input} placeholder="Business name as registered" autoComplete="organization" />
                                    </div>

                                    <div>
                                        <label className={label}>Business email {star}</label>
                                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={input} placeholder="name@company.com" autoComplete="email" />
                                    </div>
                                    <div>
                                        <label className={label}>Phone number {star}</label>
                                        <div className="flex gap-2">
                                            <select value={dial} onChange={e => setDial(e.target.value)} className={`${input} !w-[104px] shrink-0 px-2`} aria-label="Country code">
                                                {Array.from(new Set(COUNTRIES.map(c => c.dial))).map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                            <input value={phone} onChange={e => setPhone(e.target.value)} required inputMode="tel" className={input} placeholder="712 345 678" autoComplete="tel-national" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={label}>Country of incorporation {star}</label>
                                        <select value={country} onChange={e => onCountry(e.target.value)} className={input}>
                                            {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={label}>Password {star}</label>
                                        <div className="relative">
                                            <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className={`${input} pr-10`} placeholder="At least 8 characters" autoComplete="new-password" />
                                            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label={showPw ? 'Hide password' : 'Show password'}>
                                                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {password && (
                                            <div className="mt-1.5 flex items-center gap-2">
                                                <div className="flex flex-1 gap-1">{[1, 2, 3, 4].map(i => <span key={i} className={`h-1 flex-1 rounded-full ${pwScore >= i ? (pwScore >= 3 ? 'bg-emerald-500' : 'bg-amber-400') : 'bg-slate-200'}`} />)}</div>
                                                <span className="text-[11px] text-slate-500">{pwLabel}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className={label}>Business type {star}</label>
                                        <select value={businessType} onChange={e => setBusinessType(e.target.value)} required className={input}>
                                            <option value="">Select your business type</option>
                                            {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={label}>Expected monthly volume {star}</label>
                                        <select value={monthlyVolume} onChange={e => setMonthlyVolume(e.target.value)} required className={input}>
                                            <option value="">Select your monthly volume</option>
                                            {VOLUMES.map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className={label}>Incorporation number {star}</label>
                                        <input value={incorporationNumber} onChange={e => setIncorporationNumber(e.target.value)} required className={input} placeholder="e.g. PVT-ABC1234" />
                                    </div>
                                    <div>
                                        <label className={label}>Referral code <span className="font-normal text-slate-400">(optional)</span></label>
                                        <input value={referralCode} onChange={e => setReferralCode(e.target.value)} className={input} placeholder="Enter a referral code if you have one" />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className={label}>How did you hear about Jasiri? {star}</label>
                                        <div className="flex flex-wrap gap-2">
                                            {HEARD.map(h => {
                                                const on = heard.includes(h);
                                                return (
                                                    <button key={h} type="button" onClick={() => setHeard(p => on ? p.filter(x => x !== h) : [...p, h])}
                                                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${on ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-teal-600/50'}`}>
                                                        {h}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <label className="sm:col-span-2 mt-0.5 flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-slate-600">
                                        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-teal-700" />
                                        <span>
                                            I agree to Jasiri's <a href="#" className="font-semibold text-teal-700 underline">Terms of Use</a> and consent to Jasiri processing my data in line with its <a href="#" className="font-semibold text-teal-700 underline">Privacy Policy</a>. I confirm I am authorised by my company to create this account and provide this information.
                                        </span>
                                    </label>

                                    <div className="sm:col-span-2 flex justify-center pt-1">
                                        <button type="submit" disabled={loading || !consent}
                                            className="flex w-full max-w-xs items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-700 to-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                                            {loading && <RefreshCw className="h-4 w-4 animate-spin" />} Create account
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="mx-auto max-w-sm py-4">
                                <button type="button" onClick={() => { setStep('form'); setError(''); setInfo(''); }} className="mb-5 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700"><ArrowLeft className="h-3.5 w-3.5" /> Edit details</button>
                                <h1 className="text-2xl font-bold text-[#0b2a3b]">Verify your email</h1>
                                <p className="mt-1.5 text-sm text-slate-500">Enter the 6-digit code we sent to <b className="text-slate-700">{email}</b>.</p>
                                {error && <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">{error}</div>}
                                {info && <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">{info}</div>}
                                <form onSubmit={submitOtp} className="mt-6 space-y-4">
                                    <input value={otpCode} onChange={e => setOtpCode(e.target.value)} required inputMode="numeric" maxLength={6} placeholder="000000"
                                        className={`${input} py-3.5 text-center text-xl font-semibold tracking-[0.5em]`} />
                                    <button type="submit" disabled={loading}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-700 to-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-teal-900/20 transition hover:brightness-110 disabled:opacity-50">
                                        {loading && <RefreshCw className="h-4 w-4 animate-spin" />} Verify and create account
                                    </button>
                                    <button type="button" onClick={resend} className="w-full text-xs font-semibold text-slate-500 hover:text-teal-700">Resend code</button>
                                </form>
                            </div>
                        )}
                        <p className="mt-5 text-center text-[13px]">
                            <Link to="/login?portal=otc" className="font-bold text-teal-700 hover:text-teal-600">Login to existing account</Link>
                        </p>
                    </div>

                    <aside className="rounded-2xl border border-white/10 bg-[#04101c]/80 p-6 text-white shadow-2xl shadow-black/40 backdrop-blur-md lg:mt-6 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
                        <h2 className="text-lg font-bold">Your Jasiri OTC account gives you:</h2>
                        <ul className="mt-5 space-y-4">
                            {BENEFITS.map(b => (
                                <li key={b} className="flex items-start gap-3 text-sm leading-relaxed text-white/95">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                                    <span>{b}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-7 rounded-xl border border-white/10 bg-black/25 p-4">
                            <p className="text-sm font-semibold text-amber-300">What happens after you sign up</p>
                            <ol className="mt-3 space-y-2 text-sm text-white/90">
                                <li><b>1.</b> Verify your email with a one-time code.</li>
                                <li><b>2.</b> Complete KYB: company documents, directors and shareholders.</li>
                                <li><b>3.</b> Our compliance team reviews and activates your account.</li>
                                <li><b>4.</b> Fund your wallet and request your first quote.</li>
                            </ol>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
