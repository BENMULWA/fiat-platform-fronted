//@ts-nocheck

import { useEffect, useState } from 'react';
import { Activity, RefreshCw, WalletCards } from 'lucide-react';
import { getTreasuryPositions } from '../../api/client';

export const TreasuryPage = () => {
    const [positions, setPositions] = useState<any>({ fiat: [], stablecoins: [], kpis: {} });
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState('');
    const [error, setError] = useState('');

    const fetchPositions = async () => {
        try {
            const response = await getTreasuryPositions();
            setPositions(response.data || { fiat: [], stablecoins: [], kpis: {} });
            setLastUpdated(new Date().toLocaleTimeString());
            setError('');
        } catch {
            setError('Live treasury positions are temporarily unavailable.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPositions();
        const timer = window.setInterval(fetchPositions, 10000);
        return () => window.clearInterval(timer);
    }, []);

    const formatMoney = (value: number) => `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    const formatPercent = (value: number | null) => value === null || value === undefined ? '—' : `${Number(value).toFixed(0)}%`;
    const formatAsset = (value: number, asset: string) => Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: ['BTC', 'ETH'].includes(asset) ? 3 : 0,
        maximumFractionDigits: ['BTC', 'ETH'].includes(asset) ? 6 : 2,
    });

    const Section = ({ title, subtitle, rows, fallback }: any) => (
        <section className="bg-[#0F1520] border border-[#182536] rounded-md overflow-hidden shadow-lg">
            <div className="px-5 py-4 border-b border-[#182536] bg-[#111827]/60 flex items-center justify-between">
                <div><h2 className="text-sm font-bold text-white">{title}</h2><p className="text-[11px] text-gray-500 mt-1">{subtitle}</p></div>
                <span className="text-[10px] uppercase tracking-widest text-gray-500">{rows.length} assets</span>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-[1220px] w-full text-left">
                    <thead className="bg-[#0A0D14] border-b border-[#182536] text-[10px] uppercase tracking-widest text-gray-500"><tr><th className="px-5 py-3">Asset / wallet</th><th className="px-5 py-3 text-right">Available</th><th className="px-5 py-3 text-right">Reserved</th><th className="px-5 py-3 text-right">Pending in</th><th className="px-5 py-3 text-right">Pending out</th><th className="px-5 py-3 text-right">Net position</th><th className="px-5 py-3 text-right">Limit</th><th className="px-5 py-3 text-right">Utilization</th><th className="px-5 py-3 text-right">USD equiv.</th></tr></thead>
                    <tbody>
                        {isLoading ? <tr><td colSpan={9} className="py-16 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400" /></td></tr> : rows.length ? rows.map((row: any) => (
                            <tr key={row.asset} className="border-b border-[#182536]/70 last:border-b-0 hover:bg-[#111827] transition-colors"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className="w-8 h-8 rounded bg-[#182233] border border-[#26364B] flex items-center justify-center text-[10px] font-bold text-white">{row.asset.slice(0, 2)}</span><div><p className="text-sm font-bold text-white">{row.asset}</p><p className="text-[10px] text-gray-500">{row.source}{row.live ? ' · live' : ' · ledger'}</p></div></div></td><td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-white">{formatAsset(row.available, row.asset)}</td><td className="px-5 py-3.5 text-right font-mono text-xs text-gray-300">{formatAsset(row.reserved, row.asset)}</td><td className="px-5 py-3.5 text-right font-mono text-xs text-emerald-400">+{formatAsset(row.pendingIn, row.asset)}</td><td className="px-5 py-3.5 text-right font-mono text-xs text-red-400">-{formatAsset(row.pendingOut, row.asset)}</td><td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-white">{formatAsset(row.netPosition, row.asset)}</td><td className="px-5 py-3.5 text-right font-mono text-xs text-gray-300">{row.limit ? formatAsset(row.limit, row.asset) : '—'}</td><td className="px-5 py-3.5 text-right text-xs text-gray-300"><span className="inline-block w-12 h-1 bg-[#182536] rounded mr-2 align-middle"><span className="block h-1 bg-sky-400 rounded" style={{ width: `${Math.min(row.utilization || 0, 100)}%` }} /></span>{formatPercent(row.utilization)}</td><td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-white">{formatMoney(row.usdEquivalent)}</td></tr>
                        )) : <tr><td colSpan={9} className="py-16 text-center text-xs text-gray-500">No {fallback} balances reported by the treasury sources.</td></tr>}
                    </tbody>
                </table>
            </div>
        </section>
    );

    const cards = [['Total liquidity', positions.kpis.totalLiquidityUsd, 'All held fiat and stablecoin assets', 'text-white'], ['Fiat liquidity', positions.kpis.fiatLiquidityUsd, 'Wallet-backed supporting fiat', 'text-sky-300'], ['Stablecoin liquidity', positions.kpis.stablecoinLiquidityUsd, 'Wallet-backed supporting stablecoins', 'text-emerald-300']];
    return (
        <div className="max-w-[1600px] mx-auto p-3 sm:p-5 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5"><div><div className="flex items-center gap-3"><h1 className="text-xl font-semibold text-white">Treasury Positions</h1><span className="px-2 py-1 rounded text-[9px] uppercase tracking-widest font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20">Live liquidity</span></div><p className="text-xs text-gray-500 mt-1">Wallet-held liquidity available to finance quotes and settlement obligations.</p></div><div className="flex items-center gap-3"><span className="text-[10px] text-gray-500 font-mono">Updated {lastUpdated || '...'}</span><button onClick={fetchPositions} className="p-2 rounded border border-[#1E2D3D] text-gray-400 hover:text-white" title="Refresh positions"><RefreshCw className="w-4 h-4" /></button></div></div>
            {error && <div className="mb-4 border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs px-4 py-3 rounded-md">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">{cards.map(([label, value, detail, color]) => <div key={label} className="bg-[#0F1520] border border-[#1E2D3D] rounded-md p-4"><p className="text-[10px] uppercase tracking-widest text-gray-500">{label}</p><p className={`text-2xl font-semibold font-mono mt-2 ${color}`}>{isLoading ? '...' : formatMoney(value)}</p><p className="text-[11px] text-gray-500 mt-2">{detail}</p></div>)}</div>
            <div className="flex items-center gap-2 mb-4 text-[10px] text-gray-500"><Activity className="w-3.5 h-3.5 text-emerald-400" /> Refreshes every 10 seconds · <WalletCards className="w-3.5 h-3.5" /> Wallet sources are marked live; ledger balances are marked separately.</div>
            <div className="space-y-5"><Section title="Supporting Fiat Wallet Assets" subtitle="Fiat liquidity available for customer collections and settlement funding." rows={positions.fiat} fallback="fiat" /><Section title="Supporting Stablecoins" subtitle="Digital asset liquidity available for quotes and wallet settlement." rows={positions.stablecoins} fallback="stablecoin" /></div>
        </div>
    );
};
