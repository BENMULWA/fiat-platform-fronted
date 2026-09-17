//@ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight, LineChart, Users } from 'lucide-react';
import logo from './assets/jasiri-icon.png';

// Landing point for the "Business (OTC)" entry on the public landing page
// (the Quick Swap widget's second tab, and the footer's "OTC Desk" link —
// both used to jump a logged-out visitor straight to the generic /login
// with zero context on what institutional/OTC access even is). This is
// explicitly NOT staff/admin — institutional partners are external
// customers, not Jasiri staff, so this stays a separate page from
// StaffPortalPage.tsx rather than being folded into it. Both buttons below
// route to the pages that already exist: /login (shared, role-resolved by
// the backend) and /otc/signup (OtcSignup.tsx).
export default function OtcGatewayPage() {
    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 py-16">
            {/* Background — same visual family as Login.tsx/StaffPortalPage.tsx */}
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
                        <h1 className="text-2xl font-extrabold text-white tracking-tight mt-2">Business Settlements</h1>
                        <p className="text-sm text-gray-400 mt-1">Institutional &amp; OTC Desk access</p>
                    </div>

                    <p className="text-sm text-gray-400 leading-relaxed mb-8 text-center">
                        For registered institutional partners and OTC merchants settling bulk fiat-crypto trades,
                        managing RFQs, and reviewing settlement history — a separate workspace from the retail app.
                    </p>

                    <ul className="space-y-3 mb-9">
                        {[
                            { icon: LineChart, label: 'Live RFQs and dealer quotes' },
                            { icon: ArrowUpRight, label: 'Bulk settlement requests' },
                            { icon: Users, label: 'Business onboarding & KYB' },
                        ].map(({ icon: Icon, label }) => (
                            <li key={label} className="flex items-center gap-3 text-sm text-gray-300">
                                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                    <Icon className="w-3.5 h-3.5 text-blue-400" />
                                </div>
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
                            className="w-full flex items-center justify-center gap-2 border border-[#1e2d3d] hover:border-blue-500/40 text-white text-sm font-bold py-3.5 rounded-xl transition-all"
                        >
                            Create an institutional account
                        </Link>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-600 mt-8">
                    Looking for personal use instead?{' '}
                    <Link to="/signup" className="text-emerald-400 hover:text-emerald-300 font-semibold">
                        Create a retail account
                    </Link>
                    
                </p>
            </div>
        </div>
    );
}
