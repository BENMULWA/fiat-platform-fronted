import { useEffect, useState } from 'react';
import { Users, ArrowRightLeft, Clock3, HandCoins, RefreshCw } from 'lucide-react';
import { getOtcAnalyticsOverview } from '../../api/client';

// Dealer/treasury-side rollup, self-contained so it can drop into
// DealerWorkspaceLive (the existing RFQ-queue workspace) without touching
// its own fetchWorkspace()/polling logic. Reads
// GET /api/admin/otc/analytics-overview -- separate from the retail-only
// /operations-overview DashboardOverview.tsx already uses.

interface AnalyticsOverview {
    kpis: {
        activeMerchants: number; totalMerchants: number; totalRfqs: number;
        acceptedVolumeCount: number; pendingComplianceReview: number;
        activeSettlements: number; reconciledSettlements: number; avgSettlementMinutes: number | null;
    };
    rfqFunnel: { status: string; count: number }[];
    topMerchants: { name: string; volume: number }[];
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
    return (
        <div className="bg-[#0F1520] border border-[#1E2D3D] rounded-md p-3.5">
            <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">{label}</p>
                <Icon className="w-3.5 h-3.5 text-gray-600" />
            </div>
            <p className="text-xl font-semibold text-white font-mono">{value}</p>
        </div>
    );
}

export default function OtcAnalyticsStrip() {
    const [data, setData] = useState<AnalyticsOverview | null>(null);
    const [days, setDays] = useState(30);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        getOtcAnalyticsOverview(days)
            .then(res => setData(res.data))
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, [days]);

    if (isLoading && !data) {
        return <div className="mb-5 p-6 flex justify-center"><RefreshCw className="w-5 h-5 animate-spin text-emerald-500" /></div>;
    }
    if (!data) return null;

    const { kpis, topMerchants } = data;
    const maxVolume = Math.max(1, ...topMerchants.map(m => m.volume));

    return (
        <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">OTC desk overview</p>
                <select value={days} onChange={e => setDays(Number(e.target.value))} className="bg-[#111827] border border-[#1E2D3D] text-[11px] text-gray-300 rounded-md px-2 py-1 outline-none">
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-3">
                <Kpi label="Active merchants" value={`${kpis.activeMerchants}`} icon={Users} />
                <Kpi label="RFQs" value={`${kpis.totalRfqs}`} icon={ArrowRightLeft} />
                <Kpi label="Active settlements" value={`${kpis.activeSettlements}`} icon={HandCoins} />
                <Kpi label="Reconciled" value={`${kpis.reconciledSettlements}`} icon={HandCoins} />
                <Kpi label="Avg settlement time" value={kpis.avgSettlementMinutes != null ? `${kpis.avgSettlementMinutes}m` : '—'} icon={Clock3} />
                <Kpi label="Compliance holds" value={`${kpis.pendingComplianceReview}`} icon={Clock3} />
            </div>

            {topMerchants.length > 0 && (
                <div className="bg-[#0F1520] border border-[#1E2D3D] rounded-md p-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Top merchants by volume &middot; {days}d</p>
                    <div className="space-y-2">
                        {topMerchants.map(m => (
                            <div key={m.name} className="flex items-center gap-3">
                                <span className="text-[11px] text-gray-300 w-40 truncate shrink-0">{m.name}</span>
                                <div className="flex-1 h-2 rounded-full bg-[#1E2D3D] overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${(m.volume / maxVolume) * 100}%` }} />
                                </div>
                                <span className="text-[11px] font-mono text-gray-400 w-24 text-right shrink-0">{m.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
