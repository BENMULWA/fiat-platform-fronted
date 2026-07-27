//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { getAdminLiquidity } from '../../api/client';

export default function LiquidityPage() {
    const [data, setData] = useState<any>({ kpis: {}, rails: [] });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLiquidity = async () => {
            try {
                const res = await getAdminLiquidity();
                setData(res.data);
            } catch (err) {
                console.error("Failed to load liquidity data", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLiquidity();
    }, []);

    return (
        <div className="max-w-[1600px] mx-auto animate-in fade-in duration-300">
            <div className="flex items-center gap-3 mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight">Liquidity</h1>
                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">ADMIN</span>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#111827] border border-[#1e2d3d] rounded-xl p-5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">M-PESA FLOAT</p>
                    <p className="text-3xl font-bold text-white font-mono mb-1">{data.kpis?.mpesa?.value || 'KES 0'}</p>
                    <p className={`text-xs font-medium text-${data.kpis?.mpesa?.color}-400`}>{data.kpis?.mpesa?.status || 'Loading...'}</p>
                </div>
                <div className="bg-[#111827] border border-[#1e2d3d] rounded-xl p-5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">CELO LIQUIDITY</p>
                    <p className="text-3xl font-bold text-white font-mono mb-1">{data.kpis?.celo?.value || '0 USDA'}</p>
                    <p className={`text-xs font-medium text-${data.kpis?.celo?.color}-400`}>{data.kpis?.celo?.status || 'Loading...'}</p>
                </div>
                <div className="bg-[#111827] border border-[#1e2d3d] rounded-xl p-5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">CARDANO LIQUIDITY</p>
                    <p className="text-3xl font-bold text-white font-mono mb-1">{data.kpis?.cardano?.value || '0 ADA'}</p>
                    <p className={`text-xs font-medium text-${data.kpis?.cardano?.color}-400`}>{data.kpis?.cardano?.status || 'Loading...'}</p>
                </div>
            </div>

            {/* Rails Table */}
            <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#0a0e17] border-b border-[#1e2d3d] text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                <th className="py-4 px-6">RAIL</th>
                                <th className="py-4 px-6">INCOMING</th>
                                <th className="py-4 px-6">OUTGOING</th>
                                <th className="py-4 px-6">NET FLOW (24H)</th>
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
        </div>
    );
}