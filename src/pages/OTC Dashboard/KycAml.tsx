//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { getAdminKycQueue, approveAdminKyc, rejectAdminKyc } from '../../api/client';

export default function KycAmlPage() {
    const [activeTab, setActiveTab] = useState('KYC Queue');
    const [data, setData] = useState<any>({ kpis: {}, queue: [] });
    const [isLoading, setIsLoading] = useState(true);

    const fetchQueue = async () => {
        try {
            const res = await getAdminKycQueue();
            setData(res.data);
        } catch (err) {
            console.error("Failed to load KYC queue", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            if (action === 'approve') await approveAdminKyc(id);
            if (action === 'reject') await rejectAdminKyc(id);
            fetchQueue();
        } catch (e) {
            alert(`Failed to ${action} KYC.`);
        }
    };

    const DocStatus = ({ label, passed }: { label: string, passed: boolean }) => (
        <div className="flex items-center gap-1.5 text-xs">
            <span className={passed ? "text-emerald-400" : "text-red-400"}>{label}</span>
            {passed ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
        </div>
    );

    return (
        <div className="max-w-[1600px] mx-auto animate-in fade-in duration-300">
            <div className="flex items-center gap-3 mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight">KYC / AML / Risk</h1>
                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">ADMIN</span>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-[#111827] border border-amber-500/30 rounded-xl p-5 border-l-4 border-l-amber-500">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">PENDING KYC</p>
                    <p className="text-3xl font-bold text-amber-500 font-mono">{data.kpis?.pendingKyc || 0}</p>
                </div>
                <div className="bg-[#111827] border border-red-500/30 rounded-xl p-5 border-l-4 border-l-red-500">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">AML FLAGS</p>
                    <p className="text-2xl font-bold text-red-500 font-mono">{data.kpis?.amlFlags || 0} High</p>
                </div>
                <div className="bg-[#111827] border border-blue-500/30 rounded-xl p-5 border-l-4 border-l-blue-500">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">PEP MATCHES</p>
                    <p className="text-3xl font-bold text-white font-mono">{data.kpis?.pepMatches || 0}</p>
                </div>
                <div className="bg-[#111827] border border-emerald-500/30 rounded-xl p-5 border-l-4 border-l-emerald-500">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">SANCTIONS</p>
                    <p className="text-3xl font-bold text-emerald-500 font-mono">{data.kpis?.sanctions || 0}</p>
                </div>
                <div className="bg-[#111827] border border-red-500/30 rounded-xl p-5 border-l-4 border-l-red-500">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">RISK ALERTS</p>
                    <p className="text-2xl font-bold text-red-500 font-mono">{data.kpis?.riskAlerts || 0} High</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 border-b border-[#1e2d3d] pb-2">
                {['KYC Queue', 'AML Flags', 'Risk Alerts'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === tab ? 'bg-[#1e2d3d] text-white' : 'text-gray-500 hover:text-white'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Queue List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="py-20 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-3" /></div>
                ) : data.queue?.length > 0 ? (
                    data.queue.map((user: any) => (
                        <div key={user.id} className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-6 shadow-lg">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{user.name}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">{user.email} · {user.timeAgo}</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${user.riskLevel === 'high' ? 'bg-red-500/10 text-red-400' :
                                            user.riskLevel === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                                        }`}>
                                        Risk: {user.riskLevel}
                                    </span>
                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-600/20 text-blue-400">
                                        {user.kycLevel}
                                    </span>
                                </div>
                            </div>

                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">DOCUMENTS SUBMITTED</p>
                            <div className="flex gap-4 mb-6">
                                <div className="w-16 h-16 rounded-xl border-2 border-emerald-500/30 bg-[#0a0e17]" />
                                <div className="w-16 h-16 rounded-xl border-2 border-red-500/30 bg-[#0a0e17]" />
                                <div className="w-16 h-16 rounded-xl border border-[#1e2d3d] bg-[#0a0e17]" />
                                <div className="w-16 h-16 rounded-xl border border-[#1e2d3d] bg-[#0a0e17]" />
                            </div>
                            <div className="flex gap-4 mb-6">
                                <DocStatus label="ID" passed={user.docs?.id} />
                                <DocStatus label="Selfie" passed={user.docs?.selfie} />
                                <DocStatus label="Address" passed={user.docs?.address} />
                                <DocStatus label="Source" passed={user.docs?.source} />
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => handleAction(user.id, 'approve')} className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2 rounded-xl text-sm font-bold transition">Approve KYC</button>
                                <button className="bg-[#1e2d3d] hover:bg-gray-700 text-white px-6 py-2 rounded-xl text-sm font-bold transition">Request Info</button>
                                <button onClick={() => handleAction(user.id, 'reject')} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 px-6 py-2 rounded-xl text-sm font-bold transition">Reject</button>
                                {user.riskLevel === 'high' && (
                                    <button className="bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-2 rounded-xl text-sm font-bold ml-auto">File STR</button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 text-gray-500">No pending KYC applications.</div>
                )}
            </div>
        </div>
    );
}