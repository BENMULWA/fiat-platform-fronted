//@ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, ArrowRight, LineChart, LockKeyhole } from 'lucide-react';
import logo from './assets/jasiri-icon.png';

// Reserved for internal Jasiri staff only. Institutional/OTC partners are
// external customers, not staff, so that audience now has its own gateway
// at /otc (see OtcGatewayPage.tsx) instead of sharing a card on this page.
// Retail users never see this page either -- they use the plain /login and
// /signup CTAs on the landing page. Login below goes to the same shared
// /login as everyone else: the backend already resolves the account's role,
// and AuthContext.tsx auto-activates admin view for any non-end-user role
// the instant they authenticate (see isEndUserRole) -- there's no separate
// staff-specific auth flow to build, this page's only job is wayfinding.
export default function StaffPortalPage() {
    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 py-16">
            {/* Background — same visual family as Login.tsx/Signup.tsx */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: "url('/image_aaeaf7.jpg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            <div className="absolute inset-0 z-0 bg-[#0a0f1a]/90 backdrop-blur-sm" />

            <div className="relative z-10 w-full max-w-lg">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors mb-8"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Jasiri
                </Link>

                <div className="relative bg-[#0b101a]/80 backdrop-blur-xl border border-[#1e2d3d] rounded-3xl p-8 sm:p-10 shadow-2xl">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="bg-white p-3 rounded-3xl shadow-[0_0_30px_rgba(0,210,130,0.15)] mb-4 border border-gray-100">
                            <img src={logo} alt="Jasiri Capital Logo" className="h-20 md:h-24 w-auto object-contain" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight mt-2">Staff Access</h1>
                        <p className="text-sm text-gray-400 mt-1">Reserved for authorized Jasiri staff</p>
                    </div>

                    <p className="text-sm text-gray-400 leading-relaxed mb-8 text-center">
                        For Jasiri Capital staff — treasury, compliance, and operations — managing the platform's
                        liquidity, rates, KYC/AML review, and settlements.
                    </p>

                    <ul className="space-y-3 mb-9">
                        {[
                            { icon: LockKeyhole, label: 'Treasury & market maker controls' },
                            { icon: ShieldCheck, label: 'KYC / AML Compliance Review' },
                            { icon: LineChart, label: 'General ledger & reporting' },
                        ].map(({ icon: Icon, label }) => (
                            <li key={label} className="flex items-center gap-3 text-sm text-gray-300">
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                    <Icon className="w-3.5 h-3.5 text-emerald-400" />
                                </div>
                                {label}
                            </li>
                        ))}
                    </ul>

                    <Link
                        to="/login?portal=admin"
                        className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold py-3.5 rounded-xl transition-all"
                    >
                        Staff login <ArrowRight className="w-4 h-4" />
                    </Link>
                    <p className="text-xs text-center text-gray-600 mt-3">
                        Restricted Logins
                        
                    </p>
                </div>

                <p className="text-center text-xs text-gray-600 mt-8">
                    Looking for institutional or OTC access instead?{' '}
                    <Link to="/otc" className="text-emerald-400 hover:text-emerald-300 font-semibold">
                        Visit the OTC Desk
                    </Link>
                </p>
            </div>
        </div>
    );
}
