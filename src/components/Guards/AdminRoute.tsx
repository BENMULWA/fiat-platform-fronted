import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldX, Lock } from 'lucide-react';

interface AdminRouteProps {
    children: React.ReactNode;
    requiredPermissions?: string[];
}

// DEFAULT EXPORT - This is what was missing!
export default function AdminRoute({ children, requiredPermissions }: AdminRouteProps) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    // Safe role check using optional chaining and type assertion
    const userRole = (user as any).role?.toString().toLowerCase() || '';
    const viewAsAdmin = (user as any).viewAsAdmin === true;

    const isAdmin = userRole === 'super_admin' || userRole === 'admin' || viewAsAdmin;

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                        <ShieldX className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-gray-400 mb-6 max-w-md">
                        You don't have permission to access the administration panel.
                        This area is restricted to authorized staff only.
                    </p>
                    <button
                        onClick={() => (window.location.href = '/dashboard')}
                        className="bg-[#EAB308] hover:bg-[#D97706] text-black px-6 py-2.5 rounded-lg text-sm font-bold transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
        const userPermissions: string[] = (user as any).permissions || [];
        const hasPermission = requiredPermissions.some((perm) =>
            userPermissions.includes(perm)
        );

        if (!hasPermission && userRole !== 'super_admin') {
            return (
                <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <Lock className="w-8 h-8 text-amber-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Insufficient Permissions</h2>
                        <p className="text-gray-400 mb-6 max-w-md">
                            You need specific permissions to access this section.
                            Contact your Super Admin for access.
                        </p>
                        <button
                            onClick={() => (window.location.href = '/vault')}
                            className="bg-[#EAB308] hover:bg-[#D97706] text-black px-6 py-2.5 rounded-lg text-sm font-bold transition-colors"
                        >
                            Return to Admin Dashboard
                        </button>
                    </div>
                </div>
            );
        }
    }

    return <>{children}</>;
}