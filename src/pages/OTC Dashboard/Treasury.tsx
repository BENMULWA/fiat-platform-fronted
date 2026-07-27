
//@ts-nocheck 

import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { getAdminTreasury } from '../../api/client';


// function for the  to check balances  for the available asset Vaults
export const TreasuryPage = () =>{
    const [balances, setBalances] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTreasury = async () => {
            try {
                const res = await getAdminTreasury();
                setBalances(res.data.balances || []);
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

    return (
        <div className="max-w-[1600px] mx-auto animate-in fade-in duration-300">
            <div className="flex items-center gap-3 mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight">Treasury</h1>
                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">ADMIN</span>
            </div>

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