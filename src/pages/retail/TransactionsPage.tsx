import { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, RefreshCw, Search } from 'lucide-react';
import { getRampHistory } from '../../api/client';

export const TransactionsPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getRampHistory().then((res: any) => {
            setTransactions(res.data?.entries || []);
        }).catch(err => console.error(err)).finally(() => setLoading(false));
    }, []);

    const formatToEAT = (utcString: string) => {
        if (!utcString) return '';
        if (!utcString.includes('T')) return utcString + ' EAT';
        const date = new Date(utcString);
        return new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Africa/Nairobi',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
        }).format(date).replace(',', '') + ' EAT';
    };

    const getTypeBadge = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'on': return <span className="flex items-center w-fit gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-emerald-500/20 uppercase"><ArrowDown className="w-3 h-3" /> Deposit</span>;
            case 'off': return <span className="flex items-center w-fit gap-1.5 text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-orange-500/20 uppercase"><ArrowUp className="w-3 h-3" /> Withdraw</span>;
            case 'swap': return <span className="flex items-center w-fit gap-1.5 text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-blue-500/20 uppercase"><RefreshCw className="w-3 h-3" /> Swap</span>;
            default: return <span className="text-[10px] font-bold text-gray-500 uppercase">{type}</span>;
        }
    };

    const filtered = transactions.filter(t => t.id?.toLowerCase().includes(searchTerm.toLowerCase()) || t.channel?.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl overflow-hidden max-w-7xl mx-auto shadow-2xl">
            <div className="p-6 border-b border-[#1E2533] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-base font-bold text-white tracking-wide">General Ledger</h2>
                <div className="relative">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                    <input type="text" placeholder="Search reference..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-[#0F1520] border border-[#1E2533] focus:border-emerald-500 focus:outline-none rounded-xl py-2 pl-9 pr-4 text-xs font-medium text-white w-full md:w-64" />
                </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[#1E2533] bg-[#0F1520]/50">
                            <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                            <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tx Type</th>
                            <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                            <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ledger Reference</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E2533]/40">
                        {loading ? <tr><td colSpan={5} className="py-20 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500" /></td></tr> :
                            filtered.length > 0 ? filtered.map((tx: any) => (
                                <tr key={tx.id} className="hover:bg-[#0F1520]/60 transition-all">
                                    <td className="py-4 px-6 text-xs text-gray-300 font-mono">{formatToEAT(tx.date || tx.createdAt)}</td>
                                    <td className="py-4 px-6">{getTypeBadge(tx.direction)}</td>
                                    <td className="py-4 px-6 text-right font-extrabold text-sm text-white font-mono">{tx.fromAmount}</td>
                                    <td className="py-4 px-6 text-xs text-emerald-500 font-bold">{tx.status}</td>
                                    <td className="py-4 px-6 text-xs text-gray-500 font-mono font-semibold">{tx.id}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={5} className="py-20 text-center text-sm text-gray-500">No transaction records found.</td></tr>
                            )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};