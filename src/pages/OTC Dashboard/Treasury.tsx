
//@ts-nocheck 

import React, { useState, useEffect } from 'react';
import { RefreshCw, Save, Activity } from 'lucide-react';
import { getTreasuryDashboard, getTreasuryRateBook, updateTreasuryRateBook } from '../../api/client';


// function for the  to check balances  for the available asset Vaults
export const TreasuryPage = () =>{
    const [balances, setBalances] = useState<any[]>([]);
    const [rateBook, setRateBook] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const RATE_ASSETS = ['USD', 'USDA', 'USDT', 'USDC', 'cUSD', 'KES', 'UGX', 'TZS', 'RWF', 'BIF', 'XAF', 'XOF', 'AIRT', 'IMP'];

    useEffect(() => {
        const fetchTreasury = async () => {
            try {
                const [dashboardRes, rateBookRes] = await Promise.all([
                    getTreasuryDashboard(),
                    getTreasuryRateBook(),
                ]);

                const vaults = dashboardRes.data?.vaults || {};
                const rows = Object.entries(vaults).map(([asset, value]) => ({
                    asset,
                    available: Number(value || 0),
                    reserved: 0,
                    pending: 0,
                    total: Number(value || 0),
                }));
                setBalances(rows);
                setRateBook(rateBookRes.data?.rateBook || null);
            } catch (err) {
                console.error("Failed to load treasury balances", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTreasury();
    }, []);

    const formatNumber = (num: number, asset: string) => {
        const decimals = ['BTC', 'ETH'].includes(asset) ? 3 : 0;
        return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    };

    const updateRateField = (asset: string, value: string) => {
        setRateBook((prev: any) => ({
            ...prev,
            usdBaseRates: {
                ...(prev?.usdBaseRates || {}),
                [asset]: value === '' ? '' : Number(value),
            },
        }));
    };

    const handleSaveRateBook = async () => {
        if (!rateBook) return;
        setSaving(true);
        try {
            const payload = {
                active: !!rateBook.active,
                reference_source: rateBook.referenceSource || 'CBK',
                refresh_interval_hours: Number(rateBook.refreshIntervalHours || 3),
                spread_bps: Number(rateBook.spreadBps || 0),
                notes: rateBook.notes || '',
                usd_base_rates: rateBook.usdBaseRates || {},
            };
            const res = await updateTreasuryRateBook(payload);
            setRateBook(res.data?.rateBook || rateBook);
        } catch (err) {
            console.error('Failed to save rate book', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto animate-in fade-in duration-300">
            <div className="flex items-center gap-3 mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight">Treasury</h1>
                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">ADMIN</span>
            </div>

            {rateBook && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                    <div className="xl:col-span-2 bg-[#111827] border border-[#1e2d3d] rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-lg font-bold text-white tracking-wide">Swap Rate Book</h2>
                                <p className="text-sm text-gray-500 mt-1">Finance sets the base rates here. Retail users only receive the final execution quote.</p>
                            </div>
                            <button onClick={handleSaveRateBook} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black transition-colors disabled:opacity-50">
                                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Rates'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <label className="text-sm text-gray-400">Reference Source
                                <input value={rateBook.referenceSource || ''} onChange={(e) => setRateBook((prev: any) => ({ ...prev, referenceSource: e.target.value }))} className="mt-1 w-full bg-[#0a0e17] border border-[#1e2d3d] rounded-xl px-3 py-2.5 text-white" placeholder="CBK / Reuters / Treasury Desk" />
                            </label>
                            <label className="text-sm text-gray-400">Refresh Interval (Hours)
                                <input type="number" min="1" value={rateBook.refreshIntervalHours || 3} onChange={(e) => setRateBook((prev: any) => ({ ...prev, refreshIntervalHours: Number(e.target.value) }))} className="mt-1 w-full bg-[#0a0e17] border border-[#1e2d3d] rounded-xl px-3 py-2.5 text-white" />
                            </label>
                            <label className="text-sm text-gray-400">Spread (Bps)
                                <input type="number" min="0" step="1" value={rateBook.spreadBps || 0} onChange={(e) => setRateBook((prev: any) => ({ ...prev, spreadBps: Number(e.target.value) }))} className="mt-1 w-full bg-[#0a0e17] border border-[#1e2d3d] rounded-xl px-3 py-2.5 text-white" />
                            </label>
                            <label className="text-sm text-gray-400 flex items-end gap-3">
                                <input type="checkbox" checked={!!rateBook.active} onChange={(e) => setRateBook((prev: any) => ({ ...prev, active: e.target.checked }))} className="w-4 h-4 mb-3" />
                                <span className="mb-2 text-white font-medium">Trading Active</span>
                            </label>
                        </div>

                        <label className="text-sm text-gray-400 block mb-4">Notes
                            <textarea value={rateBook.notes || ''} onChange={(e) => setRateBook((prev: any) => ({ ...prev, notes: e.target.value }))} className="mt-1 w-full bg-[#0a0e17] border border-[#1e2d3d] rounded-xl px-3 py-2.5 text-white min-h-[90px]" placeholder="Example: Rates reviewed against CBK every 3 hours and adjusted manually by Treasury." />
                        </label>

                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                            {RATE_ASSETS.map((asset) => (
                                <label key={asset} className="text-xs text-gray-500 uppercase tracking-wider">
                                    {asset} per USD
                                    <input
                                        type="number"
                                        step="0.0001"
                                        min="0"
                                        value={rateBook.usdBaseRates?.[asset] ?? ''}
                                        onChange={(e) => updateRateField(asset, e.target.value)}
                                        className="mt-1 w-full bg-[#0a0e17] border border-[#1e2d3d] rounded-xl px-3 py-2.5 text-white text-sm normal-case tracking-normal"
                                    />
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-6 shadow-xl">
                        <h2 className="text-lg font-bold text-white tracking-wide mb-5">Rate Governance</h2>
                        <div className="space-y-4 text-sm text-gray-400">
                            <div className="p-4 rounded-xl bg-[#0a0e17] border border-[#1e2d3d]">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Current Source</p>
                                <p className="text-white font-semibold">{rateBook.referenceSource || 'CBK'}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-[#0a0e17] border border-[#1e2d3d]">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Refresh Policy</p>
                                <p className="text-white font-semibold">Every {rateBook.refreshIntervalHours || 3} hours</p>
                            </div>
                            <div className="p-4 rounded-xl bg-[#0a0e17] border border-[#1e2d3d]">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Applied Spread</p>
                                <p className="text-white font-semibold">{((rateBook.spreadBps || 0) / 100).toFixed(2)}%</p>
                            </div>
                            <div className="p-4 rounded-xl bg-[#0a0e17] border border-[#1e2d3d]">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Last Update</p>
                                <p className="text-white font-semibold">{rateBook.updatedAt ? new Date(rateBook.updatedAt).toLocaleString() : 'Not yet updated'}</p>
                                <p className="text-xs text-gray-500 mt-2">Next review: {rateBook.nextRefreshAt ? new Date(rateBook.nextRefreshAt).toLocaleString() : 'N/A'}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300">
                                <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4" /> Treasury controls the executable rate</div>
                                <p className="text-xs leading-relaxed">Retail swap quotes and backend settlement now consume this rate book directly, so finance can adjust rates in one place without exposing the internal rate table to end users.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl overflow-hidden shadow-xl min-h-[400px]">
                <div className="p-6 border-b border-[#1e2d3d]">
                    <h2 className="text-lg font-bold text-white tracking-wide">Treasury Balances</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#0a0e17] border-b border-[#1e2d3d] text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                <th className="py-4 px-6">ASSET</th>
                                <th className="py-4 px-6">AVAILABLE</th>
                                <th className="py-4 px-6">RESERVED</th>
                                <th className="py-4 px-6">PENDING</th>
                                <th className="py-4 px-6">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e2d3d]/50">
                            {isLoading ? (
                                <tr><td colSpan={5} className="py-20 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-3" /></td></tr>
                            ) : balances.map((row, i) => (
                                <tr key={i} className="hover:bg-[#1a2a40]/30 transition-colors text-sm">
                                    <td className="py-4 px-6 font-bold text-white">{row.asset}</td>
                                    <td className="py-4 px-6 font-mono text-gray-300">{formatNumber(row.available, row.asset)}</td>
                                    <td className="py-4 px-6 font-mono text-gray-300">{formatNumber(row.reserved, row.asset)}</td>
                                    <td className="py-4 px-6 font-mono text-gray-300">{formatNumber(row.pending, row.asset)}</td>
                                    <td className="py-4 px-6 font-mono font-bold text-white">{formatNumber(row.total, row.asset)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}