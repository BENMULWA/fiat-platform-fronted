import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { subscribeToasts, ToastEvent } from '../utils/notificationBus';
import { useTheme } from '../contexts/ThemeContext';

const AUTO_DISMISS_MS = 6000;

const SEVERITY_CONFIG = {
    success: { Icon: CheckCircle2, color: 'text-emerald-500', ring: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
    error: { Icon: XCircle, color: 'text-red-500', ring: 'border-red-500/30', bg: 'bg-red-500/10' },
    warning: { Icon: AlertTriangle, color: 'text-amber-500', ring: 'border-amber-500/30', bg: 'bg-amber-500/10' },
    info: { Icon: Info, color: 'text-blue-500', ring: 'border-blue-500/30', bg: 'bg-blue-500/10' },
} as const;

// Mounted once at the app root (see App.tsx) so a deposit/withdrawal/RFQ
// event popping up over the /ws/dashboard websocket — from retail's
// AppLayout or the OTC merchant portal's InstitutionalRoute — has a single
// place to render into, regardless of which page is currently open.
export default function NotificationToastHost() {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const [toasts, setToasts] = useState<ToastEvent[]>([]);

    useEffect(() => {
        return subscribeToasts(toast => {
            setToasts(prev => [...prev, toast]);
            window.setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== toast.id));
            }, AUTO_DISMISS_MS);
        });
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 w-[calc(100vw-2rem)] max-w-sm pointer-events-none">
            {toasts.map(toast => {
                const { Icon, color, ring, bg } = SEVERITY_CONFIG[toast.severity];
                return (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300 ${isLight ? 'bg-white border-slate-200' : 'bg-[#111827] border-[#1E2533]'}`}
                    >
                        <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${bg} ${ring}`}>
                            <Icon className={`w-4 h-4 ${color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{toast.title}</p>
                            <p className={`text-xs mt-0.5 leading-relaxed ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{toast.message}</p>
                        </div>
                        <button
                            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                            className={`shrink-0 transition-colors ${isLight ? 'text-slate-300 hover:text-slate-500' : 'text-gray-600 hover:text-gray-400'}`}
                            aria-label="Dismiss notification"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
