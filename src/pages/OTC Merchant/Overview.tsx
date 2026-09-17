import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, RefreshCw, Bell, BellRing, LogOut } from 'lucide-react';
import { getOtcWallet, listOtcRfqs } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { getNotificationPermission, requestNotificationPermission } from '../../utils/pushNotifications';

export default function OtcOverview() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [balances, setBalances] = useState<Record<string, { available: number; locked: number }>>({});
    const [rfqs, setRfqs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notifPermission, setNotifPermission] = useState(getNotificationPermission());

    const load = () => {
        Promise.all([getOtcWallet(), listOtcRfqs()])
            .then(([wRes, rRes]) => {
                setBalances(wRes.data.balances || {});
                setRfqs(rRes.data.rfqs || []);
            })
            .catch(() => {})
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        load();
        const t = setInterval(load, 15000);
        return () => clearInterval(t);
    }, []);

    const assetRows = Object.entries(balances).filter(([k]) => k !== 'updatedAt');
    const activeRfqs = rfqs.filter(r => !['reconciled', 'failed', 'reservation_released', 'blocked'].includes(r.status));

    return (
        <div className="min-h-screen bg-[#070B14] text-gray-200">
            <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#1E2D3D] bg-[#0A0D14]">
                <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-white font-semibold text-sm">{(user as any)?.businessName || user?.name || 'OTC Portal'}</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={async () => setNotifPermission(await requestNotificationPermission())}
                        title={notifPermission === 'granted' ? 'Notifications enabled' : 'Enable settlement/RFQ notifications'}
                        className={notifPermission === 'granted' ? 'text-emerald-400 cursor-default' : 'text-gray-500 hover:text-gray-300 cursor-pointer'}
                        disabled={notifPermission === 'granted'}
                    >
                        {notifPermission === 'granted' ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </button>
                    <button onClick={logout} className="text-gray-500 hover:text-gray-300"><LogOut className="w-4 h-4" /></button>
                </div>
            </header>

            <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-white">Overview</h1>
                        <p className="text-xs text-gray-500 mt-1">Your balances and settlement requests.</p>
                    </div>
                    <button onClick={() => navigate('/otc/request')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5" /> Request settlement
                    </button>
                </div>

                <div>
                    <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Balances</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {assetRows.length === 0 && !isLoading && (
                            <div className="col-span-full bg-[#0F1520] border border-[#1E2D3D] rounded-md p-4 text-xs text-gray-500">
                                No balances yet. Contact your dealer to arrange a deposit.
                            </div>
                        )}
                        {assetRows.map(([asset, bal]) => (
                            <div key={asset} className="bg-[#0F1520] border border-[#1E2D3D] rounded-md p-3.5">
                                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mb-1">{asset}</p>
                                <p className="text-xl font-semibold text-white font-mono">{bal.available.toLocaleString()}</p>
                                <p className="text-[10px] text-gray-600 mt-1">available{bal.locked > 0 ? ` · ${bal.locked.toLocaleString()} locked` : ''}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Active requests</h2>
                    <div className="bg-[#0F1520] border border-[#1E2D3D] rounded-md overflow-hidden">
                        {isLoading ? (
                            <div className="p-10 text-center"><RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mx-auto" /></div>
                        ) : activeRfqs.length === 0 ? (
                            <div className="p-10 text-center text-xs text-gray-500">No active settlement requests.</div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-[#1E2D3D] text-[9.5px] font-semibold text-gray-500 uppercase tracking-wider bg-[#0A0D14]">
                                        <th className="px-4 py-2">RFQ</th>
                                        <th className="px-4 py-2">Pair</th>
                                        <th className="px-4 py-2 text-right">Amount</th>
                                        <th className="px-4 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1E2D3D]/50">
                                    {activeRfqs.map(r => (
                                        <tr key={r.id} onClick={() => navigate(`/otc/rfqs/${r.id}`)} className="cursor-pointer hover:bg-[#111827]">
                                            <td className="px-4 py-2.5 font-mono text-[11px] text-gray-400">{r.id}</td>
                                            <td className="px-4 py-2.5 text-xs text-gray-300 font-mono">{r.fromAsset}<span className="text-gray-600">/</span>{r.toAsset}</td>
                                            <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-200">{Number(r.amount).toLocaleString()}</td>
                                            <td className="px-4 py-2.5 text-[10px] text-gray-400 uppercase">{String(r.status).replace(/_/g, ' ')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
