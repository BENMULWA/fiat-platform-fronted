//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { RefreshCw, Activity } from 'lucide-react';
import { getAdminPayments, matchAdminPayment } from '../../api/client';

export default function PaymentsPage() {
    const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
    const [data, setData] = useState<any>({ kpis: {}, incoming: [], outgoing: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchData = async () => {
        try {
            const res = await getAdminPayments();
            setData(res.data);
            setLastUpdated(new Date());
        } catch (error) { console.error("Failed to fetch", error); }
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleMatch = async (id: string) => {
        await matchAdminPayment(id);
        fetchData();
    };

    const getTimeAgo = (date: Date | null) => !date ? "Connecting..." : Math.floor((new Date().getTime() - date.getTime()) / 1000) < 5 ? "Live" : `${Math.floor((new Date().getTime() - date.getTime()) / 1000)}s ago`;

    return (
        <div className="max-w-[1600px] mx-auto animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Payments</h1>
                    <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">ADMIN</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                    <span>Last synced: {getTimeAgo(lastUpdated)}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: "UNMATCHED INBOUND", val: data.kpis?.unmatched_inbound || 0, color: "text-amber-500" },
                    { label: "MATCHED TODAY", val: data.kpis?.matched_today || 0, color: "text-emerald-400" },
                    { label: "OUTBOUND SENT", val: data.kpis?.outbound_sent || 0, color: "text-white" },
                    { label: "OUTBOUND PENDING", val: data.kpis?.outbound_pending || 0, color: "text-red-400" }
                ].map((kpi, i) => (
                    <div key={i} className="bg-[#111827] border border-[#1e2d3d] rounded-xl p-5">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{kpi.label}</p>
                        <p className={`text-3xl font-bold font-mono ${kpi.color}`}>{kpi.val}</p>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2 mb-4 border-b border-[#1e2d3d] pb-2">
                {['incoming', 'outgoing'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${activeTab === tab ? 'bg-[#1e2d3d] text-white' : 'text-gray-500 hover:text-white'}`}>{tab} Payments</button>
                ))}
            </div>

            <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl overflow-hidden shadow-xl min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#0a0e17] border-b border-[#1e2d3d] text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                <th className="py-4 px-6 text-left">ID</th>
                                <th className="py-4 px-6 text-left">TIME</th>
                                <th className="py-4 px-6 text-left">{activeTab === 'incoming' ? 'FROM' : 'TO'}</th>
                                <th className="py-4 px-6 text-left">TYPE</th>
                                <th className="py-4 px-6 text-right">AMOUNT</th>
                                <th className="py-4 px-6 text-right">REFERENCE</th>
                                <th className="py-4 px-6 text-center">STATUS</th>
                                <th className="py-4 px-6 text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e2d3d]/50">
                            {isLoading ? (
                                <tr><td colSpan={8} className="py-20 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500" /></td></tr>
                            ) : data[activeTab]?.map((row: any) => (
                                <tr key={row.id} className="hover:bg-[#1a2a40]/30 transition-colors text-sm">
                                    <td className="py-4 px-6 text-gray-500 font-mono text-xs">{row.id}</td>
                                    <td className="py-4 px-6 text-gray-400">{row.time}</td>
                                    <td className="py-4 px-6 font-semibold text-white">{row.party}</td>
                                    <td className="py-4 px-6 text-gray-300">{row.type}</td>
                                    <td className="py-4 px-6 font-bold text-white font-mono text-right">{row.amount}</td>
                                    <td className="py-4 px-6 text-gray-500 text-xs font-mono text-right">{row.reference}</td>
                                    <td className="py-4 px-6 text-center">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${row.status === 'unmatched' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-400'}`}>{row.status}</span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        {activeTab === 'incoming' && row.status === 'unmatched' && (
                                            <button onClick={() => handleMatch(row.id)} className="bg-amber-500 text-black px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-400 transition">Match</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}