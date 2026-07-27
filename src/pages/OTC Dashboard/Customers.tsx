//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { getAdminCustomers, freezeAdminCustomer, unfreezeAdminCustomer } from '../../api/client';

export default function Customers() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchCustomers = async () => {
        try {
            const res = await getAdminCustomers();
            setCustomers(res.data.customers || []);
        } catch (err) {
            console.error("Failed to load customers", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleToggleFreeze = async (id: string, currentStatus: string) => {
        try {
            if (currentStatus === 'active') await freezeAdminCustomer(id);
            else await unfreezeAdminCustomer(id);
            fetchCustomers();
        } catch (e) {
            alert("Action failed.");
        }
    };

    // 🟢 BULLETPROOF FILTER: Won't crash if a user is missing a name or email
    const filtered = customers.filter(c => {
        const safeName = c?.name || '';
        const safeEmail = c?.email || '';
        const search = searchTerm?.toLowerCase() || '';

        return safeName.toLowerCase().includes(search) ||
            safeEmail.toLowerCase().includes(search);
    });

    return (
        <div className="max-w-[1600px] mx-auto animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Customers</h1>
                    <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">ADMIN</span>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-[#111827] border border-[#1e2d3d] rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                    />
                </div>
            </div>

            <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl overflow-hidden shadow-xl min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#0a0e17] border-b border-[#1e2d3d] text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                <th className="py-4 px-6">NAME</th>
                                <th className="py-4 px-6">EMAIL</th>
                                <th className="py-4 px-6">KYC</th>
                                <th className="py-4 px-6">RISK</th>
                                <th className="py-4 px-6">TOTAL VOLUME</th>
                                <th className="py-4 px-6">STATUS</th>
                                <th className="py-4 px-6 text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e2d3d]/50">
                            {isLoading ? (
                                <tr><td colSpan={7} className="py-20 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-3" /></td></tr>
                            ) : filtered.map((c) => (
                                <tr key={c.id} className="hover:bg-[#1a2a40]/30 transition-colors text-sm">
                                    {/* 🟢 Safely rendering missing data */}
                                    <td className="py-4 px-6 font-bold text-white">{c?.name || 'Unknown User'}</td>
                                    <td className="py-4 px-6 text-gray-400">{c?.email || 'N/A'}</td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${c?.kyc === 'verified' ? 'text-emerald-400 border border-emerald-500/20 bg-emerald-500/10' :
                                                c?.kyc === 'rejected' ? 'text-red-400 border border-red-500/20 bg-red-500/10' :
                                                    'text-amber-400 border border-amber-500/20 bg-amber-500/10'
                                            }`}>{c?.kyc || 'unverified'}</span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${c?.risk === 'high' ? 'text-red-400 bg-red-500/10' :
                                                c?.risk === 'medium' ? 'text-amber-400 bg-amber-500/10' :
                                                    'text-emerald-400 bg-emerald-500/10'
                                            }`}>{c?.risk || 'low'}</span>
                                    </td>
                                    <td className="py-4 px-6 font-mono text-gray-300">{c?.volume || 'KES 0'}</td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${c?.status === 'active' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                                            }`}>{c?.status || 'active'}</span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <button
                                            onClick={() => handleToggleFreeze(c.id, c.status || 'active')}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${c?.status === 'active' ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20' :
                                                    'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/20'
                                                }`}
                                        >
                                            {c?.status === 'active' ? 'Freeze' : 'Unfreeze'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && !isLoading && (
                                <tr><td colSpan={7} className="py-16 text-center text-gray-500">No customers found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}