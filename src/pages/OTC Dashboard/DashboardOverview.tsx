// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, TrendingUp, Activity, DollarSign, Users, ArrowRightLeft, Calendar, ChevronDown } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../api/client';

interface OperationsKPIs {
    volumeToday: number; volumeTrend: number; revenueToday: number; revenueTrend: number;
    pendingTrades: number; pendingWithdrawalsCount: number; pendingWithdrawalsValue: number;
    pendingKyc: number; unmatchedPayments: number; amlFlags: number;
}

export default function DashboardOverview() {
    const [kpis, setKpis] = useState<OperationsKPIs | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [recentActions, setRecentActions] = useState<any[]>([]);
    const [riskAlerts, setRiskAlerts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 🟢 Timeframe State for Dynamic Filtering
    const [timeframe, setTimeframe] = useState<number>(7);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const [overviewRes, chartRes] = await Promise.all([
                api.get('/api/admin/operations-overview'),
                api.get(`/api/admin/analytics/chart-data?days=${timeframe}`)
            ]);
            setKpis(overviewRes.data.kpis);
            setChartData(chartRes.data.chartData);
            setRecentActions(overviewRes.data.actions || []);
            setRiskAlerts(overviewRes.data.alerts || []);
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

    const StatCard = ({ title, value, icon: Icon, trend, color, subtext }: any) => {
        const styles: Record<string, any> = {
            blue: { icon: 'text-blue-400', bg: 'from-blue-500/20 to-blue-500/5 border-blue-500/20', glow: 'bg-blue-500' },
            emerald: { icon: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20', glow: 'bg-emerald-500' },
            amber: { icon: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5 border-amber-500/20', glow: 'bg-amber-500' },
            purple: { icon: 'text-purple-400', bg: 'from-purple-500/20 to-purple-500/5 border-purple-500/20', glow: 'bg-purple-500' }
        };
        const theme = styles[color] || styles.blue;

        return (
            <div className="relative overflow-hidden bg-[#111827] border border-[#1e2533] rounded-2xl p-5 hover:border-gray-500/30 transition-all shadow-lg flex flex-col justify-between group">
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 ${theme.glow} group-hover:opacity-20 transition-opacity`} />

                <div>
                    <div className="flex items-start justify-between mb-4 relative z-10">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${theme.bg} border shadow-inner`}>
                            <Icon className={`w-5 h-5 ${theme.icon}`} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-3xl font-extrabold text-white font-mono tracking-tight">{value}</h3>
                        <p className="text-xs text-gray-500 mt-1 font-medium">{title}</p>
                    </div>
                </div>

                <div className="mt-5 relative z-10">
                    {trend !== undefined ? (
                        <p className={`text-[11px] font-bold flex items-center gap-1 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% <span className="text-gray-500 font-medium">{subtext}</span>
                        </p>
                    ) : (
                        <p className={`text-[11px] font-bold flex items-center gap-1.5 ${color === 'amber' && value > 0 ? 'text-amber-500' : 'text-gray-500 font-medium'}`}>
                            {color === 'amber' && value > 0 ? <><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {subtext}</> : subtext}
                        </p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">LIVE</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Real-time analytics and platform health</p>
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
                        <StatCard title="Today's Volume" value={formatCurrency(kpis?.volumeToday || 0)} icon={Activity} trend={kpis?.volumeTrend} color="blue" subtext="vs yesterday" />
                        <StatCard title="Today's Revenue" value={formatCurrency(kpis?.revenueToday || 0)} icon={DollarSign} trend={kpis?.revenueTrend} color="emerald" subtext="vs yesterday" />
                        <StatCard title="Pending Trades" value={kpis?.pendingTrades || 0} icon={ArrowRightLeft} color="amber" subtext={kpis?.pendingTrades > 0 ? "Requires attention" : "All clear"} />
                        <StatCard title="Pending KYC" value={kpis?.pendingKyc || 0} icon={Users} color="purple" subtext="Awaiting review" />
                    </div>

                    {/* CHARTS SECTION */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="bg-[#111827] border border-[#1e2533] rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-400" />
                                {timeframe === 1 ? "24-Hour" : `${timeframe}-Day`} Volume Trend
                            </h3>
                            <div className="h-[250px] w-full">
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
                                {timeframe === 1 ? "24-Hour" : `${timeframe}-Day`} Revenue Captured
                            </h3>
                            <div className="h-[250px] w-full">
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

                    {/* Bottom Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-[#111827] border border-[#1e2533] rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-white mb-6">Recent Dealer Actions</h3>
                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {recentActions.map((action) => (
                                    <div key={action.id} className="flex justify-between items-center pb-4 border-b border-[#1e2533]/50 last:border-0">
                                        <div>
                                            <p className="text-sm font-bold text-white">{action.type}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{action.details}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400">{action.user}</p>
                                            <p className="text-[10px] text-gray-600">{action.timeAgo}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-[#111827] border border-[#1e2533] rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-white mb-6">Risk Alerts</h3>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {riskAlerts.map((alert) => (
                                    <div key={alert.id} className={`p-4 bg-[#0a0e17] rounded-xl border-l-4 ${alert.level === 'high' ? 'border-red-500' : alert.level === 'medium' ? 'border-amber-500' : 'border-emerald-500'}`}>
                                        <p className="text-xs font-bold text-white leading-relaxed">{alert.message}</p>
                                        <p className="text-[10px] text-gray-500 mt-2">{alert.timeAgo}</p>
                                    </div>
                                ))}
                            </div>
                        </div>


                        <div>
                            <p className="text-md text-white mt-4"> @ 2026 All Rights Reserved</p>
                        </div>

                    </div>
                </>
            )}
        </div>
    );
}