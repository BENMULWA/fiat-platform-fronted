import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getOtcOnboarding } from '../../api/client';
import { Building2, Lock } from 'lucide-react';
import useWebsocket from '../../hooks/useWebsocket';
import { fireEventNotification } from '../../utils/pushNotifications';

// Merchant-portal equivalent of AppLayout's websocket listener: this guard
// wraps every /otc/* page (Overview, RequestSettlement, RfqDetail), so
// mounting the listener here — once, at the guard level — means a
// settlement/RFQ notify_user() event pops a toast/OS notification no matter
// which merchant page is currently open, without each page duplicating the
// connection the way RfqDetail.tsx already does for its own chat messages.
function MerchantNotificationBridge({ userId }: { userId: string | null }) {
    useWebsocket('/ws/dashboard', userId, (msg: any) => {
        if (!msg || msg.type !== 'notification') return;
        fireEventNotification({ title: msg.title, message: msg.message, category: msg.category, severity: msg.severity });
    });
    return null;
}

interface InstitutionalRouteProps {
    children: React.ReactNode;
    // Onboarding pages themselves must stay reachable before approval --
    // mirrors how KycProtectedRoute still lets an unverified retail user
    // reach /kyc. Everything else (wallet, RFQs) requires approval.
    requireApproved?: boolean;
}

export default function InstitutionalRoute({ children, requireApproved = true }: InstitutionalRouteProps) {
    const { user, isLoading: authLoading } = useAuth();
    const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        if (!user || user.role !== 'institutional') {
            setChecking(false);
            return;
        }
        getOtcOnboarding()
            .then(res => setOnboardingStatus(res.data?.profile?.onboardingStatus || 'not_started'))
            .catch(() => setOnboardingStatus('not_started'))
            .finally(() => setChecking(false));
    }, [user?.id]);

    if (authLoading || checking) {
        return (
            <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role !== 'institutional') {
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

    if (requireApproved && onboardingStatus !== 'approved') {
        return (
            <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Onboarding required</h2>
                    <p className="text-gray-400 mb-6 max-w-md">
                        {onboardingStatus === 'under_review'
                            ? 'Your onboarding is under review. This usually takes 1-2 business days.'
                            : onboardingStatus === 'rejected'
                                ? 'Your onboarding was rejected. Please review and resubmit.'
                                : 'Complete onboarding before accessing OTC settlement.'}
                    </p>
                    <button onClick={() => (window.location.href = '/otc/onboarding')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold">
                        Go to onboarding
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <MerchantNotificationBridge userId={user?.id || null} />
            {children}
        </>
    );
}
