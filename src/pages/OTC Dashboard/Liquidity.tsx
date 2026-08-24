//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { getTreasuryPositions, getTreasuryRateBook, getTreasuryRateBookHistory, updateTreasuryRateBook } from '../../api/client';

export default function LiquidityPage() {
    const [data, setData] = useState<any>({ kpis: {}, rails: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [rateBook, setRateBook] = useState<any>(null);
    const [rateForm, setRateForm] = useState<any>({});
    const [rateSaving, setRateSaving] = useState(false);
    const [rateMessage, setRateMessage] = useState('');
    const [rateHistory, setRateHistory] = useState<any[]>([]);

    useEffect(() => {
        const fetchLiquidity = async () => {
            try {
                const [liquidityResult, rateResult, historyResult] = await Promise.allSettled([getTreasuryPositions(), getTreasuryRateBook(), getTreasuryRateBookHistory()]);
                if (liquidityResult.status === 'fulfilled') {
                    const positions = liquidityResult.value.data || {};
                    const findAsset = (asset: string) => [...(positions.fiat || []), ...(positions.stablecoins || [])].find((row: any) => row.asset === asset);
                    const mpesa = findAsset('KES');
                    const usda = findAsset('USDA');
                    const ada = findAsset('ADA');
                    setData({
                        kpis: {
                            mpesa: { value: mpesa ? `KES ${Number(mpesa.available || 0).toLocaleString()}` : 'KES 0', status: mpesa?.live ? 'Live balance' : 'Ledger balance', color: 'emerald' },
                            celo: { value: usda ? `${Number(usda.available || 0).toLocaleString()} USDA` : '0 USDA', status: usda?.live ? 'Live balance' : 'Ledger balance', color: 'emerald' },
                            cardano: { value: ada ? `${Number(ada.available || 0).toLocaleString()} ADA` : '0 ADA', status: ada?.live ? 'Live balance' : 'Ledger balance', color: 'blue' },
                        },
                        rails: [...(positions.fiat || []), ...(positions.stablecoins || [])].map((row: any) => ({ rail: row.asset, incoming: `+${row.pendingIn || 0}`, outgoing: `-${row.pendingOut || 0}`, net: row.netPosition || 0, netColor: 'emerald', capacity: Math.round(row.utilization || 0) })),
                    });
                }
                if (rateResult.status === 'fulfilled') {
                    setRateBook(rateResult.value.data.rateBook);
                    setRateForm(rateResult.value.data.rateBook);
                }
                if (historyResult.status === 'fulfilled') setRateHistory(historyResult.value.data.history || []);
            } catch (err) {
                console.error("Failed to load liquidity data", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLiquidity();
    }, []);

    const saveRateBook = async () => {
        setRateSaving(true);
        setRateMessage('');
        try {
            const res = await updateTreasuryRateBook({
                active: Boolean(rateForm.active),
                reference_source: rateForm.referenceSource,
                refresh_interval_hours: Number(rateForm.refreshIntervalHours),
                spread_bps: Number(rateForm.spreadBps),
                usd_base_rates: Object.fromEntries(Object.entries(rateForm.usdBaseRates || {}).map(([asset, value]) => [asset, Number(value)])),
                notes: rateForm.notes || '',
            });
            setRateBook(res.data.rateBook);
            setRateForm(res.data.rateBook);
            setRateMessage('Rate book updated. New quotes use these values immediately.');
            const historyRes = await getTreasuryRateBookHistory();
            setRateHistory(historyRes.data.history || []);
        } catch (err: any) {
            setRateMessage(err.response?.data?.detail || 'Unable to update the rate book.');
        } finally { setRateSaving(false); }
    };

    return (
        <div className="liquidity-page max-w-[1600px] mx-auto animate-in fade-in duration-300">
            <div className="flex items-center gap-3 mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight">Liquidity</h1>
                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">ADMIN</span>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="liquidity-kpi-card border-2 border-[#385052] rounded-xl p-5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">M-PESA FLOAT</p>
                    <p className="text-3xl font-bold text-white font-mono mb-1">{data.kpis?.mpesa?.value || 'KES 0'}</p>
                    <p className={`text-xs font-medium text-${data.kpis?.mpesa?.color}-400`}>{data.kpis?.mpesa?.status || 'Loading...'}</p>
                </div>
                <div className="liquidity-kpi-card border-2 border-[#385052] rounded-xl p-5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">CELO LIQUIDITY</p>
                    <p className="text-3xl font-bold text-white font-mono mb-1">{data.kpis?.celo?.value || '0 USDA'}</p>
                    <p className={`text-xs font-medium text-${data.kpis?.celo?.color}-400`}>{data.kpis?.celo?.status || 'Loading...'}</p>
                </div>
                <div className="liquidity-kpi-card border-2 border-[#385052] rounded-xl p-5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">CARDANO LIQUIDITY</p>
                    <p className="text-3xl font-bold text-white font-mono mb-1">{data.kpis?.cardano?.value || '0 ADA'}</p>
                    <p className={`text-xs font-medium text-${data.kpis?.cardano?.color}-400`}>{data.kpis?.cardano?.status || 'Loading...'}</p>
                </div>
            </div>

            {/* Rails Table */}
            <div className="liquidity-table-card rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#0a0e17] border-b border-[#1e2d3d] text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                <th className="py-4 px-6">RAIL</th>
                                <th className="py-4 px-6">PENDING INCOMING</th>
                                <th className="py-4 px-6">PENDING OUTGOING</th>
                                <th className="py-4 px-6">NET POSITION</th>
                                <th className="py-4 px-6">CAPACITY</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e2d3d]/50">
                            {isLoading ? (
                                <tr><td colSpan={5} className="py-20 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-3" /></td></tr>
                            ) : data.rails?.map((rail: any, i: number) => (
                                <tr key={i} className="hover:bg-[#1a2a40]/30 transition-colors text-sm">
                                    <td className="py-4 px-6 font-semibold text-white">{rail.rail}</td>
                                    <td className="py-4 px-6 font-mono text-gray-300">{rail.incoming}</td>
                                    <td className="py-4 px-6 font-mono text-gray-300">{rail.outgoing}</td>
                                    <td className={`py-4 px-6 font-mono font-bold text-${rail.netColor}-400`}>{rail.net}</td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2 bg-[#1e2d3d] rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full bg-${rail.netColor}-500`} style={{ width: `${rail.capacity}%` }} />
                                            </div>
                                            <span className="text-xs text-gray-400 font-mono w-8">{rail.capacity}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

                <section className="liquidity-rate-card mt-8 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-white">OTC Rate Book</h2>
                        <p className="text-xs text-gray-500 mt-1">Finance controls the rates used for retail swaps, dealer quotes, and KES-equivalent reporting.</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded border ${rateBook?.active ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>{rateBook?.active ? 'ACTIVE' : 'PAUSED'}</span>
                </div>
                {rateForm.usdBaseRates ? <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                        {Object.entries(rateForm.usdBaseRates).map(([asset, value]: any) => (
                            <label key={asset} className="text-xs text-gray-500 uppercase tracking-wider font-bold">
                                {asset} per USD
                                <input type="number" step="any" min="0.00000001" value={value} onChange={event => setRateForm((current: any) => ({ ...current, usdBaseRates: { ...current.usdBaseRates, [asset]: event.target.value } }))} className="mt-2 w-full bg-[#0a0e17] border border-[#1e2d3d] rounded-lg px-3 py-2.5 text-sm text-white font-mono outline-none focus:border-emerald-500" />
                            </label>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Reference source<input value={rateForm.referenceSource || ''} onChange={event => setRateForm({ ...rateForm, referenceSource: event.target.value })} className="mt-2 w-full bg-[#0a0e17] border border-[#1e2d3d] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500" /></label>
                        <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Refresh interval (hours)<input type="number" min="1" max="168" value={rateForm.refreshIntervalHours || 1} onChange={event => setRateForm({ ...rateForm, refreshIntervalHours: event.target.value })} className="mt-2 w-full bg-[#0a0e17] border border-[#1e2d3d] rounded-lg px-3 py-2.5 text-sm text-white font-mono outline-none focus:border-emerald-500" /></label>
                        <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Spread (basis points)<input type="number" min="0" max="5000" value={rateForm.spreadBps || 0} onChange={event => setRateForm({ ...rateForm, spreadBps: event.target.value })} className="mt-2 w-full bg-[#0a0e17] border border-[#1e2d3d] rounded-lg px-3 py-2.5 text-sm text-white font-mono outline-none focus:border-emerald-500" /></label>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-10">
                        <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={Boolean(rateForm.active)} onChange={event => setRateForm({ ...rateForm, active: event.target.checked })} className="accent-emerald-500" /> Allow new quotes using this rate book</label>
                        <button onClick={saveRateBook} disabled={rateSaving} className="inline-flex items-center justify-center gap-2 bg-yellow-500 hover:bg-emerald-400 disabled:opacity-50 text-black px-4 py-2.5 rounded-lg text-sm font-bold"><Save className="w-4 h-4" />{rateSaving ? 'Saving...' : 'Save rate book'}</button>
                    </div>
                    <div className="mt-12"> 
                    {rateMessage && <p className={`mt-4 text-xs ${rateMessage.startsWith('Rate book') ? 'text-emerald-400' : 'text-red-400'}`}>{rateMessage}</p>}
                    <p className="text-[11px] text-gray-600 mt-4">Last updated: {rateBook?.updatedAt || 'N/A'} · Next scheduled review: {rateBook?.nextRefreshAt || 'N/A'}</p>
                    <div className="mt-6 border-t border-[#1e2d3d] pt-5">
                        <h3 className="text-sm font-bold text-white mb-3">Rate change history</h3>
                        {rateHistory.length ? <div className="overflow-x-auto rounded-lg border border-[#1e2d3d]"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-[#0a0e17] text-[10px] font-bold uppercase tracking-wider text-gray-500"><tr><th className="px-3 py-3">Previous rate</th><th className="px-3 py-3">New rate</th><th className="px-3 py-3">Previous spread</th><th className="px-3 py-3">New spread</th><th className="px-3 py-3">Finance user</th><th className="px-3 py-3">Date and time</th><th className="px-3 py-3">Reference source</th></tr></thead><tbody className="divide-y divide-[#1e2d3d]">{rateHistory.map(item => { const changes = Object.entries(item.changedRates || {}) as [string, any][]; return <tr key={item.id} className="bg-[#0a0e17]/60 align-top"><td className="px-3 py-3 font-mono text-gray-400">{changes.length ? changes.map(([asset, change]) => <div key={asset}>{asset}: {change.from ?? '—'}</div>) : '—'}</td><td className="px-3 py-3 font-mono text-white">{changes.length ? changes.map(([asset, change]) => <div key={asset}>{asset}: {change.to ?? '—'}</div>) : '—'}</td><td className="px-3 py-3 font-mono text-gray-400">{item.previousSpreadBps ?? '—'} bps</td><td className="px-3 py-3 font-mono text-white">{item.spreadBps ?? '—'} bps</td><td className="px-3 py-3 text-gray-300">{item.updatedByName || item.updatedBy || 'Finance'}</td><td className="px-3 py-3 whitespace-nowrap text-gray-400">{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'N/A'}</td><td className="px-3 py-3 text-gray-300">{item.referenceSource || '—'}</td></tr>; })}</tbody></table></div> : <p className="text-xs text-gray-500">No rate changes have been recorded yet.</p>}
                    </div>

                    </div>
                </> : <div className="py-8 text-center text-sm text-gray-500"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading rate book...</div>}
            </section>
        </div>
    );
}