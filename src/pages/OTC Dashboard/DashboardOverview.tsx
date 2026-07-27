//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';

interface OperationsKPIs {
    volumeToday: number;
    volumeTrend: number;
    revenueToday: number;
    revenueTrend: number;
    pendingTrades: number;
    pendingWithdrawalsCount: number;
    pendingWithdrawalsValue: number;
    pendingKyc: number;
    unmatchedPayments: number;
    amlFlags: number;
}

export default function DashboardOverview() {
    const [kpis, setKpis] = useState<OperationsKPIs | null>(null);
    const [recentActions, setRecentActions] = useState<any[]>([]);
    const [riskAlerts, setRiskAlerts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const fetchDashboardData = async () => {
        try {
            const res = await api.get('/api/admin/operations-overview');
            setKpis(res.data.kpis);
            setRecentActions(res.data.actions || []);
            setRiskAlerts(res.data.alerts || []);
            setErrorMsg(null); // Clear errors on success
        } catch (error: any) {
            console.error("Failed to load operations data:", error);

            // Check if it's a 404 (Route not found) or 500 (Backend Crash)
            if (error.response?.status === 404) {
                setErrorMsg("Error 404: Route not found. Did you completely restart the Python server?");
            } else if (error.response?.status === 500) {
                setErrorMsg("Error 500: Python Backend crashed. Please check your terminal for the exact error line.");
            } else {
                setErrorMsg(error.message || "Failed to connect to backend API.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 15000); // Live poll every 15s
        return () => clearInterval(interval);
    }, []);

    const formatCurrency = (val: number) => {
        if (val >= 1000000) return `KES ${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `KES ${(val / 1000).toFixed(0)}K`;
        return `KES ${val.toFixed(0)}`;
    };

    return (
        <div className={`max-w-[1600px] mx-auto p-4 md:p-6 animate-in fade-in transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
                        <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">ADMIN</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Real-time snapshot of platform activity</p>
                </div>
            </div>

            {/* 🔴 NEW ERROR BANNER */}
            {errorMsg && (
                <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400">
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <div>
                        <p className="text-sm font-bold">API Connection Failed</p>
                        <p className="text-xs">{errorMsg}</p>
                    </div>
                </div>
            )}

            {isLoading && !kpis ? (
                <div className="flex items-center justify-center py-20">
                    <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
            ) : (
                <>
                    {/* KPI Grid Top Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 shadow-lg">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">TODAY'S VOLUME</p>
                            <h3 className="text-3xl font-bold text-white font-mono mb-2">{formatCurrency(kpis?.volumeToday || 0)}</h3>
                            <p className={`text-xs font-medium ${kpis && kpis.volumeTrend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {kpis && kpis.volumeTrend >= 0 ? '↑' : '↓'} {Math.abs(kpis?.volumeTrend || 0)}% vs yesterday
                            </p>
                        </div>
                        <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 shadow-lg">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">TODAY'S REVENUE</p>
                            <h3 className="text-3xl font-bold text-white font-mono mb-2">{formatCurrency(kpis?.revenueToday || 0)}</h3>
                            <p className={`text-xs font-medium ${kpis && kpis.revenueTrend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {kpis && kpis.revenueTrend >= 0 ? '↑' : '↓'} {Math.abs(kpis?.revenueTrend || 0)}% vs yesterday
                            </p>
                        </div>
                        <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 shadow-lg">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">PENDING TRADES</p>
                            <h3 className="text-3xl font-bold text-white font-mono mb-2">{kpis?.pendingTrades || 0}</h3>
                            <p className="text-xs text-amber-500 font-medium flex items-center gap-1.5">
                                {kpis && kpis.pendingTrades > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />} Requires attention
                            </p>
                        </div>
                        <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 shadow-lg">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">PENDING WITHDRAWALS</p>
                            <h3 className="text-3xl font-bold text-white font-mono mb-2">{kpis?.pendingWithdrawalsCount || 0}</h3>
                            <p className="text-xs text-gray-500 font-medium">{formatCurrency(kpis?.pendingWithdrawalsValue || 0)} total</p>
                        </div>
                    </div>

                    {/* KPI Grid Bottom Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 shadow-lg">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">PENDING KYC</p>
                            <h3 className="text-3xl font-bold text-amber-500 font-mono mb-2">{kpis?.pendingKyc || 0}</h3>
                            <p className="text-xs text-gray-500 font-medium">Awaiting review</p>
                        </div>
                        <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 shadow-lg">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">UNMATCHED PAYMENTS</p>
                            <h3 className="text-3xl font-bold text-blue-400 font-mono mb-2">{kpis?.unmatchedPayments || 0}</h3>
                            <p className="text-xs text-gray-500 font-medium">Need manual matching</p>
                        </div>
                        <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 shadow-lg">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">AML FLAGS</p>
                            <h3 className="text-3xl font-bold text-red-500 font-mono mb-2">{kpis?.amlFlags || 0}</h3>
                            <p className="text-xs text-gray-500 font-medium">Active alerts</p>
                        </div>
                    </div>

                    {/* Bottom Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Recent Actions List */}
                        <div className="lg:col-span-2 bg-[#111827] border border-[#1e2d3d] rounded-2xl p-6 shadow-lg">
                            <h3 className="text-sm font-bold text-white mb-6">Recent Dealer Actions</h3>
                            <div className="space-y-4">
                                {recentActions.length > 0 ? recentActions.map((action) => (
                                    <div key={action.id} className="flex justify-between items-center pb-4 border-b border-[#1e2d3d]/50 last:border-0">
                                        <div>
                                            <p className="text-sm font-bold text-white">{action.type}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{action.details}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400">{action.user}</p>
                                            <p className="text-[10px] text-gray-500">{action.timeAgo}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-sm text-gray-500 italic">No recent actions found.</p>
                                )}
                            </div>
                        </div>

                        {/* Risk Alerts */}
                        <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-6 shadow-lg">
                            <h3 className="text-sm font-bold text-white mb-6">Risk Alerts</h3>
                            <div className="space-y-3">
                                {riskAlerts.length > 0 ? riskAlerts.map((alert) => (
                                    <div key={alert.id} className={`p-4 bg-[#0a0e17] rounded-xl border-l-2 ${alert.level === 'high' ? 'border-red-500' : 'border-amber-500'}`}>
                                        <p className="text-xs font-bold text-white leading-relaxed">{alert.message}</p>
                                        <p className="text-[10px] text-gray-500 mt-2">{alert.timeAgo}</p>
                                    </div>
                                )) : (
                                    <p className="text-sm text-gray-500 italic">No active risk alerts.</p>
                                )}
                            </div>
                        </div>

                    </div>
                </>
            )}
        </div>
    );
}
