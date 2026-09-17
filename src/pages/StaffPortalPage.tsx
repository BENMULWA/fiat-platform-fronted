//@ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, ArrowLeft, ArrowRight, ArrowUpRight, LineChart, LockKeyhole, Users } from 'lucide-react';
import logo from './assets/jasiri-icon.png';

// Gateway page between the public marketing site and the two non-retail
// portals this platform serves (OTC/institutional partners, internal
// admin/treasury staff). Retail users never see this page -- they use the
// plain /login and /signup CTAs on the landing page and hero section. This
// exists because the old landing-page "Staff Portal" nav button was wired
// to handleGetStarted(), which just sent everyone (including staff/
// institutional visitors) to /signup — retail account creation. Both cards
// below route to the SAME /login as retail: the backend already resolves
// the account's role and AuthContext.tsx auto-activates admin view for any
// non-end-user role the instant they authenticate (see isEndUserRole), so
// there's no separate staff-specific auth flow to build — this page's job
// is purely wayfinding: get the right visitor to the right doorway.
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

            <div className="relative z-10 w-full max-w-4xl">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors mb-8"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Jasiri
                </Link>

                {/* Header */}
                <div className="flex flex-col items-center text-center mb-10">
                    <div className="bg-white p-3 rounded-3xl shadow-[0_0_30px_rgba(0,210,130,0.15)] mb-5 border border-gray-100">
                        <img src={logo} alt="Jasiri Capital Logo" className="h-16 w-auto object-contain" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Staff &amp; Partner Access</h1>
                    <p className="text-sm md:text-base text-gray-400 mt-3 max-w-md">
                        This gateway is reserved for verified institutional partners and authorized Jasiri staff. Select your portal to continue.
                    </p>
                </div>

                {/* Two portal cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Institutional / OTC */}
                    <div className="relative bg-[#0b101a]/80 backdrop-blur-xl border border-[#1e2d3d] hover:border-blue-500/40 rounded-3xl p-8 shadow-2xl transition-all duration-300 flex flex-col">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                            <Building2 className="w-7 h-7 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Institutional &amp; OTC Desk</h2>
                        <p className="text-sm text-gray-400 leading-relaxed mb-6 flex-1">
                            For registered institutional partners and OTC merchants settling bulk fiat-crypto trades,
                            managing RFQs, and reviewing settlement history.
                        </p>
                        <ul className="space-y-2.5 mb-8">
                            {[
                                { icon: LineChart, label: 'Live RFQs and dealer quotes' },
                                { icon: ArrowUpRight, label: 'Bulk settlement requests' },
                                { icon: Users, label: 'Business onboarding & KYB' },
                            ].map(({ icon: Icon, label }) => (
                                <li key={label} className="flex items-center gap-2.5 text-xs text-gray-400">
                                    <Icon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                    {label}
                                </li>
                            ))}
                        </ul>
                        <div className="space-y-3">
                            <Link
                                to="/login"
                                className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold py-3.5 rounded-xl transition-all"
                            >
                                Log in <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                to="/otc/signup"
                                className="w-full flex items-center justify-center text-sm font-semibold text-blue-400 hover:text-blue-300 py-2 transition-colors"
                            >
                                Apply for institutional access
                            </Link>
                        </div>
                    </div>

                    {/* Admin / Internal Staff */}
                    <div className="relative bg-[#0b101a]/80 backdrop-blur-xl border border-[#1e2d3d] hover:border-emerald-500/40 rounded-3xl p-8 shadow-2xl transition-all duration-300 flex flex-col">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                            <ShieldCheck className="w-7 h-7 text-emerald-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Admin &amp; Internal Staff</h2>
                        <p className="text-sm text-gray-400 leading-relaxed mb-6 flex-1">
                            For Jasiri Capital Admins — treasury, compliance, and operations — managing the
                            platform's liquidity, rates, KYC/AML review, and settlements.
                        </p>
                        <ul className="space-y-2.5 mb-8">
                            {[
                                { icon: LockKeyhole, label: 'Treasury & market maker controls' },
                                { icon: ShieldCheck, label: 'KYC / AML review queue' },
                                { icon: LineChart, label: 'General ledger & reporting' },
                            ].map(({ icon: Icon, label }) => (
                                <li key={label} className="flex items-center gap-2.5 text-xs text-gray-400">
                                    <Icon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    {label}
                                </li>
                            ))}
                        </ul>
                        <div className="space-y-3">
                            <Link
                                to="/login?portal=admin"
                                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold py-3.5 rounded-xl transition-all"
                            >
                                Staff login <ArrowRight className="w-4 h-4" />
                            </Link>
                            {/* Invisible spacer, same height as the OTC card's
                                "Apply for institutional access" line below its
                                button -- keeps both cards' buttons aligned
                                without showing any text here. */}
                            <div className="w-full text-sm py-2" aria-hidden="true">&nbsp;</div>
                        </div>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-600 mt-10">
                    Looking for your personal wallet instead?{' '}
                    <Link to="/signup" className="text-emerald-400 hover:text-emerald-300 font-semibold">
                        Create a retail account
                    </Link>
                </p>
            </div>
        </div>
    );
}
