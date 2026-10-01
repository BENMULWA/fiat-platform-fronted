import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { InstitutionalProvider } from '../../contexts/InstitutionalContext';
import { Building2 } from 'lucide-react';

// Pure auth/role gate for the whole /otc/* portal. Approval is no longer
// enforced here -- every institutional user can browse the full portal
// immediately after login; InstitutionalLayout's banner and
// useRequireOnboarding() gate individual actions instead (mirroring the
// backend, which only enforces get_verified_institutional_user on RFQ
// create/accept, not on browsing). This also wraps children in
// InstitutionalProvider so onboarding status is fetched once for the whole
// nested route subtree instead of per-page.
export default function InstitutionalRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading: authLoading } = useAuth();

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role !== 'institutional' && user.role !== 'merchant') {
        return (
            <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Institutional accounts only</h2>
                    <p className="text-gray-400 mb-6 max-w-md">This area is for OTC merchant accounts. Your account is a different type.</p>
                    <button onClick={() => (window.location.href = '/')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold">
                        Go back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <InstitutionalProvider>
            {children}
        </InstitutionalProvider>
    );
}
