// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, AlertCircle, TrendingUp, Activity, DollarSign, Users, ArrowRightLeft, Calendar, ChevronDown } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../api/client';
import CompanyRevenue from './CompanyRevenue';

interface OperationsKPIs {
    volumeToday: number; volumeTrend: number; revenueToday: number; revenueTrend: number;
    pendingTrades: number; pendingWithdrawalsCount: number; pendingWithdrawalsValue: number;
    pendingKyc: number; unmatchedPayments: number; amlFlags: number;
}

export default function DashboardOverview() {
    const [kpis, setKpis] = useState<OperationsKPIs | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [volumeSources, setVolumeSources] = useState<any[]>([]);
    const [assetTotals, setAssetTotals] = useState<Record<string, any>>({});
    const [valueBasis, setValueBasis] = useState('');
    const [excludedFromVolume, setExcludedFromVolume] = useState('');
    const [recentActions, setRecentActions] = useState<any[]>([]);
    const [riskAlerts, setRiskAlerts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [openCompanyRevenue, setOpenCompanyRevenue] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const navigate = useNavigate();

    // 🟢 Timeframe State for Dynamic Filtering
    const [timeframe, setTimeframe] = useState<number>(7);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const [overviewRes, chartRes] = await Promise.all([
                api.get(`/api/admin/operations-overview?days=${timeframe}&scope=retail`),
                api.get(`/api/admin/analytics/chart-data?days=${timeframe}&scope=retail`)
            ]);
            setKpis(overviewRes.data.kpis);
            setVolumeSources(overviewRes.data.volumeSources || []);
            setChartData(chartRes.data.chartData);
            setAssetTotals(chartRes.data.assetTotals || {});
            setValueBasis(chartRes.data.valueBasis || '');
            setExcludedFromVolume(chartRes.data.excludedFromVolume || '');
            setRecentActions(overviewRes.data.actions || []);
            setRiskAlerts(overviewRes.data.alerts || []);
            setLastUpdated(new Date(overviewRes.data.asOf || Date.now()));
            setErrorMsg(null);
        } catch (error: any) {
            setErrorMsg(error.response?.status === 404 ? "Error 404: Route not found." : "Backend connection failed.");
        } finally {
            setIsLoading(false);
        }
    };

    // Re-fetch automatically whenever the timeframe changes
    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 15000);
        return () => clearInterval(interval);
    }, [timeframe]);

    const formatCurrency = (val: number) => val >= 1000000 ? `KES ${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `KES ${(val / 1000).toFixed(1)}K` : `KES ${val.toFixed(0)}`;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#1e2329] border border-gray-600 p-3 rounded-xl shadow-xl text-xs">
                    <p className="text-gray-400 mb-1 font-bold">{label}</p>
                    {payload.map((pl: any, index: number) => (
                        <p key={index} style={{ color: pl.color }} className="font-mono font-bold">
                            {pl.name}: KES {pl.value.toLocaleString()}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const StatCard = ({ title, value, icon: Icon, trend, color, subtext, onClick }: any) => {
        const styles: Record<string, any> = {
            blue: { icon: 'text-blue-300', accent: 'from-blue-600 to-indigo-600', stripe: 'bg-gradient-to-br from-blue-600 to-indigo-600' },
            emerald: { icon: 'text-emerald-300', accent: 'from-emerald-500 to-teal-400', stripe: 'bg-gradient-to-br from-emerald-500 to-teal-400' },
            amber: { icon: 'text-amber-300', accent: 'from-amber-500 to-orange-400', stripe: 'bg-gradient-to-br from-amber-500 to-orange-400' },
            purple: { icon: 'text-purple-300', accent: 'from-purple-600 to-pink-500', stripe: 'bg-gradient-to-br from-purple-600 to-pink-500' }
        };
        const theme = styles[color] || styles.blue;

        return (
            <button type="button" onClick={onClick} className={`w-full text-left relative overflow-hidden rounded-3xl p-5 transition-all bg-gradient-to-b from-[#081025]/60 via-transparent to-[#071019]/40 border border-[rgba(255,255,255,0.03)] shadow-2xl backdrop-blur-sm ${onClick ? 'hover:border-emerald-500/30 cursor-pointer' : 'cursor-default'}`}>
                <div className={`absolute -left-8 -top-10 w-48 h-48 rounded-full opacity-20 blur-3xl ${theme.stripe}`} />

                <div className="flex items-start justify-between mb-4 z-10 relative">
                    <div className={`p-3 rounded-xl border border-[rgba(255,255,255,0.04)] bg-gradient-to-br ${theme.accent} bg-opacity-10 shadow-inner flex items-center justify-center`}> 
                        <Icon className={`w-5 h-5 ${theme.icon}`} />
                    </div>
                    <div className="text-xs text-slate-400 uppercase font-bold tracking-wide">{title}</div>
                </div>

                <div className="z-10 relative">
                    <h3 className="text-3xl font-extrabold text-white font-mono tracking-tight">{value}</h3>
                </div>

                <div className="mt-4 z-10">
                    {trend !== undefined ? (
                        <p className={`text-[12px] font-bold flex items-center gap-2 ${trend >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            <span className={`inline-block w-2 h-2 rounded-full ${trend >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} /> {trend >= 0 ? `+${trend}%` : `${trend}%`} <span className="text-gray-400 font-medium ml-2">{subtext} • {timeframe === 1 ? '24h' : `${timeframe}d`}</span>
                        </p>
                    ) : (
                        <p className="text-[11px] text-gray-500 font-medium">{subtext}</p>
                    )}
                </div>
            </button>
        );
    };

    return (
        <>
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">LIVE</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Real-Time analytics and platform health {lastUpdated ? `· Updated ${lastUpdated.toLocaleTimeString()}` : ''}</p>
                </div>

                {/* 🟢 Smart Filter Dropdown & Refresh Row */}
                <div className="flex items-center gap-2">
                    <div className="relative flex items-center bg-[#111827] border border-[#1e2533] rounded-xl px-3 py-2 hover:border-gray-500 transition-colors shadow-sm">
                        <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                        <select
                            value={timeframe}
                            onChange={(e) => setTimeframe(Number(e.target.value))}
                            className="bg-transparent text-sm text-white font-bold outline-none cursor-pointer appearance-none pr-6 z-10 w-full"
                        >
                            <option value={1} className="bg-[#111827]">Today (24h)</option>
                            <option value={7} className="bg-[#111827]">Last 7 Days</option>
                            <option value={30} className="bg-[#111827]">Last 30 Days</option>
                            <option value={90} className="bg-[#111827]">Last 90 Days</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 pointer-events-none" />
                    </div>
                    <button onClick={fetchDashboardData} className="p-2.5 bg-[#111827] border border-[#1e2533] rounded-xl text-gray-400 hover:text-white hover:border-gray-500 transition-all shadow-sm">
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => setOpenCompanyRevenue(true)} className="ml-2 px-3 py-2 bg-emerald-600 text-black rounded-xl font-semibold">Company Revenue</button>
                </div>
            </div>

            {errorMsg && (
                <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5 shrink-0" /><p className="text-sm">{errorMsg}</p>
                </div>
            )}

            {isLoading && !kpis ? <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 animate-spin text-emerald-500" /></div> : (
                <>
                    {/* KPI Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                        <StatCard title="Retail Volume · KES equivalent" value={formatCurrency(kpis?.volumeToday || 0)} icon={Activity} trend={kpis?.volumeTrend} color="blue" subtext="completed external retail records" onClick={() => navigate('/admin/retail-transactions')} />
                        <StatCard title="Retail Revenue · KES equivalent" value={formatCurrency(kpis?.revenueToday || 0)} icon={DollarSign} trend={kpis?.revenueTrend} color="emerald" subtext="recorded retail P&L capture" onClick={() => navigate('/admin/company-revenue')} />
                        <StatCard title="Pending Trades" value={kpis?.pendingTrades || 0} icon={ArrowRightLeft} color="amber" subtext={kpis?.pendingTrades > 0 ? "Requires attention" : "All clear"} onClick={() => navigate('/admin/retail-orders')} />
                        <StatCard title="Pending KYC" value={kpis?.pendingKyc || 0} icon={Users} color="purple" subtext="Awaiting review" onClick={() => navigate('/admin/compliance')} />
                    </div>

                    {/* CHARTS SECTION */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="bg-[#111827] border border-[#1e2533] rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-400" />
                                {timeframe === 1 ? "24-Hour" : `${timeframe}-Day`} Volume Trend · KES equivalent
                            </h3>
                            <div className="h-[250px] w-full rounded-xl overflow-hidden bg-gradient-to-b from-[#071025] to-transparent p-3">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2533" />
                                        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="volume" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorVol)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-[#111827] border border-[#1e2533] rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                                {timeframe === 1 ? "24-Hour" : `${timeframe}-Day`} Revenue Captured · KES equivalent
                            </h3>
                            <div className="h-[250px] w-full rounded-xl overflow-hidden bg-gradient-to-b from-[#071025] to-transparent p-3">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2533" />
                                        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} barSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="mb-8 bg-[#111827] border border-[#1e2533] rounded-2xl p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                            <h3 className="text-sm font-bold text-white">Master wallet and paybill asset flows</h3>
                            <span className="text-[11px] text-gray-500">Native amounts from OTC retail and dealer records</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {Object.entries(assetTotals).length ? Object.entries(assetTotals).map(([asset, total]: any) => (
                                <div key={asset} className="px-3 py-2 rounded-lg bg-[#0a0e17] border border-[#1e2533]">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">{asset}</span>
                                    <p className="text-sm text-white font-mono">{Number(total.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 8 })}</p>
                                    <p className="text-[10px] text-emerald-400">KES {Number(total.kesEquivalent || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} equivalent</p>
                                </div>
                            )) : <p className="text-sm text-gray-500">No master-wallet or paybill flows recorded for this period.</p>}
                        </div>
                        {(valueBasis || excludedFromVolume) && <p className="text-[10px] text-gray-600 mt-4">{valueBasis}; native asset amounts remain available above. {excludedFromVolume} are shown separately and excluded from business volume.</p>}
                    </div>

                    <div className="mb-8 bg-[#111827] border border-[#1e2533] rounded-2xl p-5">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-white">Today&apos;s volume sources</h3>
                                <p className="text-[11px] text-gray-500 mt-1">Completed external retail rows add up to the retail volume KPI.</p>
                            </div>
                            <button type="button" onClick={() => navigate('/admin/retail-transactions')} className="text-xs font-bold text-blue-400 hover:text-blue-300">Open OTC records</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="text-[10px] text-gray-500 uppercase tracking-wider border-b border-[#1e2533]"><tr><th className="py-2 pr-4">Time</th><th className="py-2 pr-4">OTC ID</th><th className="py-2 pr-4">Flow</th><th className="py-2 pr-4">Amount</th><th className="py-2 pr-4 text-right">Volume KES</th><th className="py-2 text-right">Revenue KES</th></tr></thead>
                                <tbody className="divide-y divide-[#1e2533]/50">
                                    {volumeSources.length ? volumeSources.slice(0, 10).map(source => <tr key={`${source.transactionId}-${source.timestamp}`} onClick={() => navigate(`/admin/retail-transactions?search=${encodeURIComponent(source.transactionId)}`)} className="cursor-pointer hover:bg-white/[0.03]"><td className="py-2 pr-4 text-gray-500 font-mono">{source.timestamp ? new Date(source.timestamp).toLocaleTimeString() : 'N/A'}</td><td className="py-2 pr-4 text-gray-400 font-mono">{source.transactionId}</td><td className="py-2 pr-4 text-blue-400">{source.type}</td><td className="py-2 pr-4 text-white font-mono">{Number(source.amount).toLocaleString(undefined, { maximumFractionDigits: 8 })} {source.asset}</td><td className="py-2 pr-4 text-right text-emerald-400 font-mono">KES {Number(source.kesEquivalent).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td><td className="py-2 text-right text-amber-400 font-mono">KES {Number(source.revenueKes || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td></tr>) : <tr><td colSpan={6} className="py-6 text-center text-gray-500">No OTC retail or dealer volume recorded today.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-gradient-to-br from-[#071025] via-[#071428] to-[#071019] border border-[rgba(255,255,255,0.03)] rounded-3xl p-6 shadow-2xl">
                            <h3 className="text-sm font-bold text-white mb-6">Recent Dealer Actions</h3>
                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {recentActions.length ? recentActions.map((action) => (
                                    <button type="button" key={action.id} onClick={() => navigate(`/admin/retail-transactions?search=${encodeURIComponent(action.transactionId || action.id)}`)} className="w-full text-left flex justify-between items-center pb-4 border-b border-[#1e2533]/50 last:border-0 hover:bg-white/[0.02]">
                                        <div>
                                            <p className="text-sm font-bold text-white">{action.type}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{action.details}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400">{action.user}</p>
                                            <p className="text-[10px] text-gray-600">{action.timeAgo}</p>
                                        </div>
                                    </button>
                                )) : <p className="text-sm text-gray-500">No recent dealer actions.</p>}
                            </div>
                        </div>
                        <div className="bg-[#111827] border border-[#1e2533] rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-white mb-6">Risk Alerts</h3>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {riskAlerts.length ? riskAlerts.map((alert) => (
                                    <div key={alert.id} className={`p-4 rounded-xl border-l-4 ${alert.severity === 'high' ? 'border-red-500/80 bg-[#2b0f12]' : alert.severity === 'medium' ? 'border-amber-500/80 bg-[#2b2010]' : 'border-emerald-500/80 bg-[#0f2a1e]'}`}>
                                        <p className="text-sm font-bold text-white leading-relaxed">{alert.message}</p>
                                        <p className="text-[11px] text-gray-400 mt-2">{alert.timeAgo}</p>
                                    </div>
                                )) : <p className="text-sm text-gray-500">No active risk alerts.</p>}
                            </div>
                        </div>


                        <div>
                            <p className="text-md text-white mt-4"> @ 2026 All Rights Reserved</p>
                        </div>

                    </div>
                </>
            )}
        </div>
            {openCompanyRevenue && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setOpenCompanyRevenue(false)} />
                    <div className="relative w-full max-w-4xl mx-auto p-6">
                        <div className="bg-[#071025] border border-[#1e2d3d] rounded-2xl p-4">
                            <div className="flex justify-end">
                                <button onClick={() => setOpenCompanyRevenue(false)} className="text-gray-400 hover:text-white">Close</button>
                            </div>
                            <CompanyRevenue />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}