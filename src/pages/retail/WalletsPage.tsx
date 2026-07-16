import { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, RefreshCw, DollarSign, Bitcoin, Hexagon, CircleDollarSign } from 'lucide-react';
import { getRetailWallet, getRampHistory } from '../../api/client';

export default function WalletsPage() {
    const [balances, setBalances] = useState({ KES: 0, USDA: 0, USDT: 0, USDC: 0, BTC: 0, ETH: 0 });
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchWalletData = async () => {
            try {
                const [walletRes, txRes] = await Promise.allSettled([getRetailWallet(), getRampHistory()]);
                if (!isMounted) return;

                if (walletRes.status === 'fulfilled' && walletRes.value.data?.balances) {
                    setBalances(prev => ({ ...prev, ...walletRes.value.data.balances }));
                }
                if (txRes.status === 'fulfilled' && txRes.value.data?.entries) {
                    setTransactions(txRes.value.data.entries);
                }
            } catch (error) {
                console.error("Fetch failed", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchWalletData();
        const interval = setInterval(fetchWalletData, 10000);
        return () => { isMounted = false; clearInterval(interval); };
    }, []);

    const walletCards = [
        { id: 'KES', name: 'KES Wallet', balance: balances.KES, icon: null, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
        { id: 'USDA', name: 'USDA Wallet', balance: balances.USDA, icon: DollarSign, color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
        { id: 'USDT', name: 'USDT Wallet', balance: balances.USDT, icon: CircleDollarSign, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
        { id: 'USDC', name: 'USDC Wallet', balance: balances.USDC, icon: CircleDollarSign, color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
        { id: 'BTC', name: 'Bitcoin', balance: balances.BTC, icon: Bitcoin, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
        { id: 'ETH', name: 'Ethereum', balance: balances.ETH, icon: Hexagon, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    ];

    return (
        <div className={`max-w-7xl mx-auto space-y-8 transition-opacity duration-500 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            <div className="mb-6"><h1 className="text-2xl font-bold text-white tracking-tight">Wallets</h1></div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {walletCards.map((w) => (
                    <div key={w.id} className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-6 hover:border-emerald-500/30 transition-all shadow-lg">
                        <div className="flex justify-between items-start mb-6">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${w.color}`}>
                                {w.icon ? <w.icon className="w-6 h-6" /> : <div className="w-6 h-6 rounded-full bg-emerald-500" />}
                            </div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{w.id}</span>
                        </div>
                        <p className="text-sm text-gray-400 font-medium mb-1">{w.name}</p>
                        <p className="text-3xl font-bold text-white font-mono">
                            {w.balance.toLocaleString(undefined, { minimumFractionDigits: w.id === 'BTC' || w.id === 'ETH' ? 4 : 0 })}
                        </p>
                    </div>
                ))}
            </div>

            <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl overflow-hidden mt-8 shadow-xl">
                <div className="p-6 border-b border-[#1E2533]"><h2 className="text-base font-bold text-white tracking-wide">Transaction History</h2></div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#1E2533] bg-[#0F1520]/50">
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-12"></th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E2533]/40">
                            {transactions.map((tx: any) => (
                                <tr key={tx.id} className="hover:bg-[#0F1520] transition-colors">
                                    <td className="py-4 px-6">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${tx.direction === 'swap' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                tx.direction === 'on' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                            }`}>
                                            {tx.direction === 'swap' ? <RefreshCw className="w-3.5 h-3.5" /> : tx.direction === 'on' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-sm font-bold text-white capitalize">{tx.direction === 'swap' ? 'Swap' : tx.direction === 'on' ? 'Deposit' : 'Withdrawal'}</td>
                                    <td className="py-4 px-6 text-xs text-gray-400 font-mono">{tx.date || 'Today'} <span className="mx-1">•</span> {tx.timeAgo || ''}</td>
                                    <td className="py-4 px-6 text-right font-bold text-sm text-white font-mono">
                                        {tx.direction === 'swap' ? `${tx.fromAmount} ${tx.fromAsset} → ${tx.toAmount} ${tx.toAsset}` : `${tx.fromAmount} ${tx.fromAsset}`}
                                    </td>
                                    <td className="py-4 px-6 text-right flex justify-end">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide border ${tx.status?.toLowerCase() === 'pending' ? 'text-orange-500 bg-orange-500/10 border-orange-500/20' :
                                                tx.status?.toLowerCase() === 'failed' ? 'text-red-500 bg-red-500/10 border-red-500/20' : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                                            }`}>{tx.status || 'Completed'}</span>
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr><td colSpan={5} className="py-16 text-center text-sm text-gray-500">No transactions found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}