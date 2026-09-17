//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Clock, Eye, ArrowUpRight } from 'lucide-react';
import { getAdminKycQueue, approveAdminKyc, rejectAdminKyc, getAdminKycDetail, getAdminComplianceMonitoring, updateAdminRiskAlertStatus, releaseRampComplianceHold, releaseDealerRfqComplianceHold, getInstitutionalOnboardingQueue, getInstitutionalOnboardingDetail, approveInstitutionalOnboarding, rejectInstitutionalOnboarding } from '../../api/client';

export default function KycRiskPage() {
    const [activeTab, setActiveTab] = useState<'kyc' | 'aml' | 'alerts' | 'zigram' | 'institutional'>('kyc');
    const [data, setData] = useState<any>({ kpis: {}, queue: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedKyc, setSelectedKyc] = useState<any | null>(null);
    const [previousPendingCount, setPreviousPendingCount] = useState<number>(0);
    const [hasNewKyc, setHasNewKyc] = useState(false);
    const [monitoring, setMonitoring] = useState<any>({ kpis: {}, amlFlags: [], riskAlerts: [], zigramHolds: [] });
    const [releaseLoadingId, setReleaseLoadingId] = useState<string | null>(null);
    const [institutionalQueue, setInstitutionalQueue] = useState<any[]>([]);
    const [institutionalActionLoading, setInstitutionalActionLoading] = useState<string | null>(null);
    const [selectedInstitutional, setSelectedInstitutional] = useState<any | null>(null);
    const [institutionalDetailLoading, setInstitutionalDetailLoading] = useState(false);

    const amlFlags = monitoring.amlFlags || [];
    const riskAlerts = monitoring.riskAlerts || [];
    const zigramHolds = monitoring.zigramHolds || [];

    const fetchKycQueue = async () => {
        try {
            const res = await getAdminKycQueue();
            const nextData = res.data;
            const nextPendingCount = Number(nextData?.kpis?.pendingKyc || 0);

            setData(nextData);
            if (previousPendingCount > 0 && nextPendingCount > previousPendingCount) {
                setHasNewKyc(true);
            }
            setPreviousPendingCount(nextPendingCount);
        } catch (err) {
            console.error("Failed to load KYC queue", err);
        }
    };

    const fetchMonitoring = async () => {
        try {
            const res = await getAdminComplianceMonitoring();
            setMonitoring(res.data || { kpis: {}, amlFlags: [], riskAlerts: [], zigramHolds: [] });
        } catch (err) {
            console.error("Failed to load compliance monitoring", err);
        }
    };

    const fetchInstitutionalQueue = async () => {
        try {
            const res = await getInstitutionalOnboardingQueue();
            setInstitutionalQueue(res.data?.queue || []);
        } catch (err) {
            console.error("Failed to load institutional onboarding queue", err);
        }
    };

    const fetchComplianceData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([fetchKycQueue(), fetchMonitoring(), fetchInstitutionalQueue()]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchComplianceData();
        const timer = window.setInterval(fetchComplianceData, 30000);
        return () => window.clearInterval(timer);
    }, []);

    const handleKycAction = async (id: string, action: 'approve' | 'reject') => {
        setActionLoading(id);
        try {
            if (action === 'approve') await approveAdminKyc(id);
            else await rejectAdminKyc(id);
            fetchComplianceData();
        } catch (err) { alert(`Failed to ${action} KYC`); }
        finally { setActionLoading(null); }
    };

    const handleRiskAlertStatus = async (id: string, status: 'acknowledged' | 'escalated') => {
        try {
            await updateAdminRiskAlertStatus(id, status);
            fetchMonitoring();
        } catch (err) {
            alert(`Failed to update alert status to ${status}`);
        }
    };

    const handleReleaseHold = async (hold: any) => {
        const confirmMsg = hold.type === 'dealer_rfq'
            ? `Release compliance hold on RFQ ${hold.id}? This resets it to "quote ready" -- a fresh quote must be pulled before it can be accepted again.`
            : `Release compliance hold on ${hold.id}? This does NOT move funds automatically -- the customer must retry the same transaction from the app, and their next attempt will skip screening once.`;
        if (!window.confirm(confirmMsg)) return;

        setReleaseLoadingId(hold.id);
        try {
            if (hold.type === 'dealer_rfq') {
                await releaseDealerRfqComplianceHold(hold.id);
            } else {
                await releaseRampComplianceHold(hold.id);
            }
            fetchMonitoring();
        } catch (err) {
            alert('Failed to release compliance hold');
        } finally {
            setReleaseLoadingId(null);
        }
    };

    const handleViewInstitutional = async (userId: string) => {
        setInstitutionalDetailLoading(true);
        try {
            const res = await getInstitutionalOnboardingDetail(userId);
            setSelectedInstitutional(res.data?.profile || null);
        } catch (err) {
            alert('Failed to load onboarding details');
        } finally {
            setInstitutionalDetailLoading(false);
        }
    };

    const closeInstitutionalModal = () => setSelectedInstitutional(null);

    const handleInstitutionalAction = async (userId: string, action: 'approve' | 'reject') => {
        if (action === 'reject') {
            const reason = window.prompt('Reason for rejection (shown to the merchant):');
            if (reason === null) return;
            setInstitutionalActionLoading(userId);
            try {
                await rejectInstitutionalOnboarding(userId, reason || undefined);
                closeInstitutionalModal();
                fetchInstitutionalQueue();
            } catch (err) { alert('Failed to reject onboarding'); }
            finally { setInstitutionalActionLoading(null); }
            return;
        }
        setInstitutionalActionLoading(userId);
        try {
            await approveInstitutionalOnboarding(userId);
            closeInstitutionalModal();
            fetchInstitutionalQueue();
        } catch (err) { alert('Failed to approve onboarding'); }
        finally { setInstitutionalActionLoading(null); }
    };

    const handleViewKyc = async (id: string) => {
        setDetailLoading(true);
        try {
            const res = await getAdminKycDetail(id);
            setSelectedKyc(res.data?.kyc || null);
            setHasNewKyc(false);
        } catch (err) {
            alert('Failed to load KYC details');
        } finally {
            setDetailLoading(false);
        }
    };

    const closeKycModal = () => setSelectedKyc(null);

    const formatBytes = (bytes?: number) => {
        if (!bytes || bytes <= 0) return 'N/A';
        const units = ['B', 'KB', 'MB', 'GB'];
        let value = bytes;
        let index = 0;
        while (value >= 1024 && index < units.length - 1) {
            value /= 1024;
            index += 1;
        }
        return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
    };

    const formatDateTime = (value?: string) => {
        if (!value) return 'N/A';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'N/A';
        return date.toLocaleString();
    };

    const DocBadge = ({ label, hasDoc }: { label: string, hasDoc: boolean }) => (
        <div className="flex flex-col items-center gap-1.5 text-[10px] font-semibold">
            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${hasDoc ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-[#0a0e17] border-[#1e2d3d] text-gray-600'}`}>
                {hasDoc ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            </div>
            <span className={hasDoc ? 'text-gray-300' : 'text-gray-600'}>{label}</span>
        </div>
    );

    const RiskBadge = ({ level }: { level: string }) => {
        const styles: Record<string, string> = { low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20', high: 'bg-red-500/10 text-red-400 border-red-500/20' };
        return <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${styles[level] || styles.low}`}>{level} risk</span>;
    };

    
    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 text-gray-200 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight">KYC / AML / Risk</h1>
                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">ADMIN</span>
                {hasNewKyc && (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" /> New KYC Submitted
                    </span>
                )}
            </div>

            {/* KPIs Row - Exact Match to Screenshot */}
            <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8">
                <button type="button" onClick={() => setActiveTab('institutional')} className="text-left bg-[#111827] border border-[#1e2d3d] rounded-xl p-5 hover:border-cyan-500/40 transition-colors cursor-pointer">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">INSTITUTIONAL</p>
                    <h3 className="text-3xl font-bold text-cyan-400 font-mono">{institutionalQueue.length}</h3>
                </button>
                <button type="button" onClick={() => setActiveTab('zigram')} className="text-left bg-[#111827] border border-[#1e2d3d] rounded-xl p-5 hover:border-purple-500/40 transition-colors cursor-pointer">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">ZIGRAM HOLDS</p>
                    <h3 className="text-3xl font-bold text-purple-400 font-mono">{zigramHolds.length}</h3>
                </button>
                <button type="button" onClick={() => setActiveTab('kyc')} className="text-left bg-[#111827] border border-[#1e2d3d] rounded-xl p-5 hover:border-amber-500/40 transition-colors cursor-pointer">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">PENDING KYC</p>
                    <h3 className="text-3xl font-bold text-amber-500 font-mono">{data.kpis?.pendingKyc || 0}</h3>
                </button>
                <button type="button" onClick={() => setActiveTab('aml')} className="text-left bg-[#111827] border border-[#1e2d3d] rounded-xl p-5 hover:border-red-500/40 transition-colors cursor-pointer">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">AML FLAGS</p>
                    <h3 className="text-3xl font-bold text-red-500 font-mono">{amlFlags.length} <span className="text-xs text-red-400/70">High</span></h3>
                </button>
                <button type="button" onClick={() => setActiveTab('aml')} className="text-left bg-[#111827] border border-[#1e2d3d] rounded-xl p-5 hover:border-blue-500/40 transition-colors cursor-pointer">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">PEP MATCHES</p>
                    <h3 className="text-3xl font-bold text-white font-mono">{monitoring.kpis?.pepMatches || 0}</h3>
                </button>
                <button type="button" onClick={() => setActiveTab('aml')} className="text-left bg-[#111827] border border-[#1e2d3d] rounded-xl p-5 hover:border-blue-500/40 transition-colors cursor-pointer">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">SANCTIONS</p>
                    <h3 className="text-3xl font-bold text-white font-mono">{monitoring.kpis?.sanctions || 0}</h3>
                </button>
                <button type="button" onClick={() => setActiveTab('alerts')} className="text-left bg-[#111827] border border-[#1e2d3d] rounded-xl p-5 hover:border-red-500/40 transition-colors cursor-pointer">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">RISK ALERTS</p>
                    <h3 className="text-3xl font-bold text-red-500 font-mono">{monitoring.kpis?.highRiskAlerts || 0} <span className="text-xs text-red-400/70">High</span></h3>
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-[#0a0e17] border border-[#1e2d3d] rounded-xl p-1.5 mb-6 w-fit">
                {[
                    { id: 'kyc', label: 'KYC Queue' },
                    { id: 'aml', label: 'AML Flags' },
                    { id: 'alerts', label: 'Risk Alerts' },
                    { id: 'zigram', label: 'ZIGRAM Holds' },
                    { id: 'institutional', label: 'Institutional Onboarding' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-[#1e2d3d] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        {tab.label}
                        {tab.id === 'aml' && <span className="ml-2 bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded-md">{amlFlags.length}</span>}
                        {tab.id === 'alerts' && <span className="ml-2 bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded-md">{riskAlerts.length}</span>}
                        {tab.id === 'zigram' && <span className="ml-2 bg-purple-500/20 text-purple-400 text-[10px] px-1.5 py-0.5 rounded-md">{zigramHolds.length}</span>}
                        {tab.id === 'institutional' && <span className="ml-2 bg-cyan-500/20 text-cyan-400 text-[10px] px-1.5 py-0.5 rounded-md">{institutionalQueue.length}</span>}
                    </button>
                ))}
            </div>

            {/* Tab Content Container */}
            <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl overflow-hidden shadow-xl min-h-[500px]">

                {/* TAB 1: KYC QUEUE */}
                {activeTab === 'kyc' && (
                    <div className="p-6 space-y-4">
                        {isLoading ? (
                            <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 animate-spin text-emerald-500" /></div>
                        ) : data.queue && data.queue.length > 0 ? (
                            data.queue.map((user: any) => (
                                <div key={user.id} className="flex flex-col lg:flex-row lg:items-center gap-6 p-5 bg-[#0a0e17] rounded-xl border border-[#1e2d3d] hover:border-gray-600/30 transition-all">

                                    <div className="lg:w-48 shrink-0">
                                        <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1"><Clock className="w-3.5 h-3.5" /> Submitted</div>
                                        <p className="text-sm text-gray-300 font-medium">{user.timeAgo}</p>
                                        <p className="text-[11px] text-gray-500 mt-1">{user.realTimestamp}</p>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-bold text-base truncate">{user.name}</h3>
                                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                    </div>

                                    <div className="flex items-center gap-5 bg-[#111827] rounded-xl px-6 py-3 border border-[#1e2d3d]">
                                        <DocBadge label="ID Doc" hasDoc={user.docs?.id} />
                                        <DocBadge label="Selfie" hasDoc={user.docs?.selfie} />
                                        <DocBadge label="Address" hasDoc={user.docs?.address} />
                                        <DocBadge label="Source" hasDoc={user.docs?.source} />
                                    </div>

                                    <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 lg:w-28 shrink-0">
                                        <RiskBadge level={user.riskLevel || 'low'} />
                                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">{user.kycLevel || 'Tier 1'}</span>
                                    </div>

                                    <div className="flex items-center gap-2 lg:w-72 shrink-0">
                                        {actionLoading === user.id ? (
                                            <RefreshCw className="w-5 h-5 animate-spin text-emerald-500 mx-auto" />
                                        ) : (
                                            <>
                                                <button onClick={() => handleKycAction(user.id, 'approve')} className="flex-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black px-4 py-2.5 rounded-lg text-xs font-bold transition-colors">Approve KYC</button>
                                                <button onClick={() => handleViewKyc(user.id)} className="px-3 py-2.5 rounded-lg text-xs font-bold bg-[#1e2d3d] text-gray-300 hover:bg-[#2a3a4f] border border-transparent hover:border-gray-500 transition-colors inline-flex items-center gap-1">
                                                    <Eye className="w-3.5 h-3.5" /> View
                                                </button>
                                                <button onClick={() => handleKycAction(user.id, 'reject')} className="px-3 py-2.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors">Reject</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <ShieldCheck className="w-12 h-12 text-emerald-500/30 mb-4" />
                                <h3 className="text-white font-bold text-lg mb-1">All Clear!</h3>
                                <p className="text-gray-500 text-sm">No pending KYC applications.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: AML FLAGS (Screenshot 3 Layout) */}
                {activeTab === 'aml' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#0a0e17] border-b border-[#1e2d3d] text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    <th className="py-4 px-6">Entity</th>
                                    <th className="py-4 px-6">Type</th>
                                    <th className="py-4 px-6">Details</th>
                                    <th className="py-4 px-6 text-center">Severity</th>
                                    <th className="py-4 px-6">Date</th>
                                    <th className="py-4 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e2d3d]/50">
                                {amlFlags.length > 0 ? amlFlags.map(flag => (
                                    <tr key={flag.id} className="hover:bg-[#1a2a40]/30 transition-colors">
                                        <td className="py-4 px-6 text-sm font-bold text-white">{flag.entity}</td>
                                        <td className="py-4 px-6 text-sm text-blue-400 font-medium">{flag.type}</td>
                                        <td className="py-4 px-6 text-sm text-gray-400 max-w-xs truncate">{flag.details}</td>
                                        <td className="py-4 px-6 text-center"><RiskBadge level={flag.severity} /></td>
                                        <td className="py-4 px-6 text-sm text-gray-500">{flag.date}</td>
                                        <td className="py-4 px-6 text-right">
                                            <button className="text-blue-400 hover:text-blue-300 font-bold text-xs flex items-center gap-1 ml-auto">
                                                Review Case <ArrowUpRight className="w-3 h-3" />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="py-16 px-6 text-center text-sm text-gray-500">No AML flags detected from current system activity.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* TAB 3: RISK ALERTS (Screenshot 4 Layout) */}
                {activeTab === 'alerts' && (
                    <div className="p-6 space-y-4">
                        {riskAlerts.length > 0 ? riskAlerts.map(alert => (
                            <div key={alert.id} className={`flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-xl border-l-4 bg-[#0a0e17] transition-all ${alert.severity === 'high' ? 'border-red-500' : alert.severity === 'medium' ? 'border-amber-500' : 'border-gray-500'}`}>

                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white leading-relaxed">{alert.message}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{alert.timeAgo}</span>
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${alert.status === 'active' ? 'bg-red-500/10 text-red-400' : alert.status === 'investigating' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'}`}>
                                            {alert.status}
                                        </span>
                                    </div>
                                </div>

                                {alert.status !== 'acknowledged' && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => handleRiskAlertStatus(alert.id, 'acknowledged')} className="px-4 py-2 rounded-lg text-xs font-bold bg-[#1e2d3d] text-gray-300 hover:bg-[#2a3a4f] border border-transparent hover:border-gray-500 transition-colors">
                                            Acknowledge
                                        </button>
                                        <button onClick={() => handleRiskAlertStatus(alert.id, 'escalated')} className="px-4 py-2 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors">
                                            Escalate
                                        </button>
                                    </div>
                                )}
                                

                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <AlertTriangle className="w-12 h-12 text-emerald-500/30 mb-4" />
                                <h3 className="text-white font-bold text-lg mb-1">No Active Risk Alerts</h3>
                                <p className="text-gray-500 text-sm">System operations currently look stable from the available live signals.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: ZIGRAM COMPLIANCE HOLDS */}
                {activeTab === 'zigram' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#0a0e17] border-b border-[#1e2d3d] text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    <th className="py-4 px-6">Type</th>
                                    <th className="py-4 px-6">Reference</th>
                                    <th className="py-4 px-6">Customer</th>
                                    <th className="py-4 px-6">Amount</th>
                                    <th className="py-4 px-6">Held Since</th>
                                    <th className="py-4 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e2d3d]/50">
                                {zigramHolds.length > 0 ? zigramHolds.map((hold: any) => (
                                    <tr key={hold.id} className="hover:bg-[#1a2a40]/30 transition-colors">
                                        <td className="py-4 px-6">
                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                {hold.type === 'dealer_rfq' ? 'OTC / Dealer' : hold.type === 'swap' ? 'Swap' : 'Ramp'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-sm font-mono text-white">{hold.id}</td>
                                        <td className="py-4 px-6 text-sm text-gray-400">{hold.customer || hold.userId || 'N/A'}</td>
                                        <td className="py-4 px-6 text-sm text-gray-300">{hold.amount ?? 'N/A'} {hold.fromAsset || ''}{hold.toAsset ? ` → ${hold.toAsset}` : ''}</td>
                                        <td className="py-4 px-6 text-sm text-gray-500">{formatDateTime(hold.createdAt)}</td>
                                        <td className="py-4 px-6 text-right">
                                            {releaseLoadingId === hold.id ? (
                                                <RefreshCw className="w-4 h-4 animate-spin text-purple-400 ml-auto" />
                                            ) : (
                                                <button onClick={() => handleReleaseHold(hold)} className="px-4 py-2 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500 hover:text-white transition-colors">
                                                    Release
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="py-16 px-6 text-center text-sm text-gray-500">No transactions currently held for ZIGRAM compliance review.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {monitoring.kpis?.zigramErrors24h > 0 && (
                            <div className="px-6 py-4 bg-amber-500/5 border-t border-amber-500/20 text-xs text-amber-400">
                                {monitoring.kpis.zigramErrors24h} ZIGRAM screening error(s) in the last 24h -- check API credentials/connectivity if this keeps growing.
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 5: INSTITUTIONAL ONBOARDING */}
                {activeTab === 'institutional' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#0a0e17] border-b border-[#1e2d3d] text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    <th className="py-4 px-6">Business</th>
                                    <th className="py-4 px-6">Submitted</th>
                                    <th className="py-4 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e2d3d]/50">
                                {institutionalQueue.length > 0 ? institutionalQueue.map((profile: any) => (
                                    <tr key={profile.userId} className="hover:bg-[#1a2a40]/30 transition-colors">
                                        <td className="py-4 px-6">
                                            <p className="text-sm font-bold text-white">{profile.legalName || profile.businessName || 'Unknown business'}</p>
                                            <p className="text-[11px] text-gray-500 mt-0.5">{profile.userId}</p>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-500">{formatDateTime(profile.submittedAt)}</td>
                                        <td className="py-4 px-6 text-right">
                                            {institutionalActionLoading === profile.userId ? (
                                                <RefreshCw className="w-5 h-5 animate-spin text-cyan-500 ml-auto" />
                                            ) : (
                                                <div className="flex items-center gap-2 justify-end">
                                                    <button onClick={() => handleViewInstitutional(profile.userId)} className="px-3 py-2 rounded-lg text-xs font-bold bg-[#1e2d3d] text-gray-300 hover:bg-[#2a3a4f] inline-flex items-center gap-1">
                                                        <Eye className="w-3.5 h-3.5" /> Review
                                                    </button>
                                                    <button onClick={() => handleInstitutionalAction(profile.userId, 'approve')} className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black transition-colors">Approve</button>
                                                    <button onClick={() => handleInstitutionalAction(profile.userId, 'reject')} className="px-3 py-2 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors">Reject</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="py-16 px-6 text-center text-sm text-gray-500">No institutional onboarding submissions awaiting review.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

            </div>
            <div>
                <p className="text-md text-white mt-4"> @ 2026 All Rights Reserved</p>
            </div>

            {(selectedKyc || detailLoading) && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0f1724] border border-[#1e2d3d] rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-xl font-bold text-white">KYC Submission Details</h3>
                            <button onClick={closeKycModal} className="px-3 py-1.5 rounded-lg bg-[#1e2d3d] text-gray-300 hover:bg-[#2a3a4f]">Close</button>
                        </div>

                        {detailLoading ? (
                            <div className="py-12 flex items-center justify-center">
                                <RefreshCw className="w-7 h-7 animate-spin text-emerald-500" />
                            </div>
                        ) : selectedKyc ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="p-3 rounded-lg bg-[#111827] border border-[#1e2d3d]"><p className="text-xs text-gray-500 uppercase">User</p><p className="text-sm font-semibold text-white">{selectedKyc.name || 'N/A'}</p></div>
                                    <div className="p-3 rounded-lg bg-[#111827] border border-[#1e2d3d]"><p className="text-xs text-gray-500 uppercase">Email</p><p className="text-sm font-semibold text-white">{selectedKyc.email || 'N/A'}</p></div>
                                    <div className="p-3 rounded-lg bg-[#111827] border border-[#1e2d3d]"><p className="text-xs text-gray-500 uppercase">Phone</p><p className="text-sm font-semibold text-white">{selectedKyc.phone || 'N/A'}</p></div>
                                    <div className="p-3 rounded-lg bg-[#111827] border border-[#1e2d3d]"><p className="text-xs text-gray-500 uppercase">ID/Passport</p><p className="text-sm font-semibold text-white">{selectedKyc.idNumber || 'N/A'}</p></div>
                                    <div className="p-3 rounded-lg bg-[#111827] border border-[#1e2d3d]"><p className="text-xs text-gray-500 uppercase">Account Created</p><p className="text-sm font-semibold text-white">{formatDateTime(selectedKyc.accountCreatedAt)}</p></div>
                                    <div className="p-3 rounded-lg bg-[#111827] border border-[#1e2d3d]"><p className="text-xs text-gray-500 uppercase">KYC Submitted</p><p className="text-sm font-semibold text-white">{formatDateTime(selectedKyc.kycSubmittedAt)}</p></div>
                                    <div className="p-3 rounded-lg bg-[#111827] border border-[#1e2d3d]"><p className="text-xs text-gray-500 uppercase">Status</p><p className="text-sm font-semibold text-emerald-400 uppercase">{selectedKyc.kycStatus || 'N/A'}</p></div>
                                    <div className="p-3 rounded-lg bg-[#111827] border border-[#1e2d3d]"><p className="text-xs text-gray-500 uppercase">Document</p><p className="text-sm font-semibold text-white">{selectedKyc.document?.name || 'N/A'} ({formatBytes(selectedKyc.document?.size)})</p></div>
                                </div>

                                {selectedKyc.document?.dataUrl ? (
                                    <div className="p-4 rounded-xl bg-[#111827] border border-[#1e2d3d]">
                                        <p className="text-xs text-gray-500 uppercase mb-2">Uploaded ID Document</p>
                                        <div className="flex items-center gap-3 mb-3">
                                            <a href={selectedKyc.document.dataUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">Open Full Document</a>
                                        </div>
                                        {(selectedKyc.document.mimeType || '').includes('pdf') ? (
                                            <iframe src={selectedKyc.document.dataUrl} title="KYC Document" className="w-full h-[420px] rounded-lg border border-[#1e2d3d]" />
                                        ) : (
                                            <img src={selectedKyc.document.dataUrl} alt="KYC Document" className="max-h-[420px] w-auto rounded-lg border border-[#1e2d3d]" />
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl bg-[#111827] border border-[#1e2d3d] text-sm text-gray-400">No uploaded ID document data available.</div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {(selectedInstitutional || institutionalDetailLoading) && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0f1724] border border-[#1e2d3d] rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-xl font-bold text-white">Institutional Onboarding Review</h3>
                            <button onClick={closeInstitutionalModal} className="px-3 py-1.5 rounded-lg bg-[#1e2d3d] text-gray-300 hover:bg-[#2a3a4f]">Close</button>
                        </div>

                        {institutionalDetailLoading ? (
                            <div className="py-12 flex items-center justify-center">
                                <RefreshCw className="w-7 h-7 animate-spin text-cyan-500" />
                            </div>
                        ) : selectedInstitutional ? (
                            <div className="space-y-5">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wide mb-2">Business Overview</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {[
                                            ['Legal name', selectedInstitutional.legalName || selectedInstitutional.businessName],
                                            ['Company type', selectedInstitutional.companyType],
                                            ['Business model', selectedInstitutional.businessModel],
                                            ['Incorporation number', selectedInstitutional.incorporationNumber],
                                            ['Date of incorporation', selectedInstitutional.dateOfIncorporation],
                                            ['Country of incorporation', selectedInstitutional.countryOfIncorporation],
                                            ['Tax number', selectedInstitutional.taxNumber],
                                            ['Website', selectedInstitutional.companyWebsite],
                                            ['Address', selectedInstitutional.companyAddress],
                                        ].map(([label, value]) => (
                                            <div key={label} className="p-3 rounded-lg bg-[#111827] border border-[#1e2d3d]">
                                                <p className="text-xs text-gray-500 uppercase">{label}</p>
                                                <p className="text-sm font-semibold text-white">{value || 'N/A'}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {selectedInstitutional.businessDescription && (
                                        <p className="text-sm text-gray-400 mt-3">{selectedInstitutional.businessDescription}</p>
                                    )}
                                </div>

                                {[
                                    ['Directors', selectedInstitutional.directors],
                                    ['Shareholders', selectedInstitutional.shareholders],
                                    ['Politically Exposed Persons', selectedInstitutional.peps],
                                ].map(([label, list]: [string, any[]]) => (
                                    <div key={label}>
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wide mb-2">{label} ({(list || []).length})</p>
                                        {(list || []).length > 0 ? (
                                            <div className="space-y-2">
                                                {list.map((p: any, i: number) => (
                                                    <div key={i} className="p-3 rounded-lg bg-[#111827] border border-[#1e2d3d] flex flex-wrap gap-x-6 gap-y-1 text-sm">
                                                        <span className="text-white font-semibold">{p.name || 'Unnamed'}</span>
                                                        <span className="text-gray-400">{p.nationality || 'N/A'}</span>
                                                        <span className="text-gray-500 font-mono text-xs">{p.idNumber || 'No ID on file'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <p className="text-sm text-gray-500">None listed.</p>}
                                    </div>
                                ))}

                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wide mb-2">Documents ({(selectedInstitutional.documents || []).length})</p>
                                    {(selectedInstitutional.documents || []).length > 0 ? (
                                        <div className="space-y-2">
                                            {selectedInstitutional.documents.map((d: any, i: number) => (
                                                <div key={i} className="p-3 rounded-lg bg-[#111827] border border-[#1e2d3d] flex flex-wrap gap-x-6 gap-y-1 text-sm">
                                                    <span className="text-white font-semibold">{d.name || 'Unnamed document'}</span>
                                                    <span className="text-gray-400">{d.type || 'N/A'}</span>
                                                    {d.reference && <a href={d.reference} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 text-xs">View</a>}
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-sm text-gray-500">No documents submitted.</p>}
                                </div>

                                <div className="flex items-center gap-3 pt-2 border-t border-[#1e2d3d]">
                                    <button
                                        onClick={() => handleInstitutionalAction(selectedInstitutional.userId, 'approve')}
                                        disabled={institutionalActionLoading === selectedInstitutional.userId}
                                        className="flex-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black px-4 py-2.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleInstitutionalAction(selectedInstitutional.userId, 'reject')}
                                        disabled={institutionalActionLoading === selectedInstitutional.userId}
                                        className="flex-1 bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}