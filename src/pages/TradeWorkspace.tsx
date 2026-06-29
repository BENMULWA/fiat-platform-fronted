
import {
    ArrowRightLeft, History, ArrowDownRight, ArrowUpRight,
    Wallet, CheckCircle2, Clock, XCircle, CreditCard,
    
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// MOCK RETAIL USER DATA
const PERSONAL_BALANCES = [
    { id: 'USDA', name: 'USDA Stablecoin', balance: 1250.50, usdValue: 1250.50, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { id: 'KES', name: 'Kenya Shillings', balance: 45000.00, usdValue: 346.15, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { id: 'IMP', name: 'Impala Coin', balance: 0.00, usdValue: 0.00, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' }
]

const RECENT_TRANSACTIONS = [
    { id: 'tx-1', type: 'Swap', details: '100 USDA → 12,800 KES', status: 'Completed', date: 'Today, 10:45 AM', icon: ArrowRightLeft, iconColor: 'text-orange-400', iconBg: 'bg-orange-500/10' },
    { id: 'tx-2', type: 'Deposit', details: '+ 50,000 KES', status: 'Completed', date: 'Yesterday, 2:30 PM', icon: ArrowDownRight, iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10' },
    { id: 'tx-3', type: 'Withdraw', details: '- 50 USDA', status: 'Processing', date: 'Yesterday, 9:15 AM', icon: ArrowUpRight, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10' },
]

export default function TraderWorkspace() {
    const navigate = useNavigate()

    // Calculate total portfolio value for the user
    const totalUsdValue = PERSONAL_BALANCES.reduce((sum, asset) => sum + asset.usdValue, 0)

    return (
        <div className="max-w-5xl mx-auto animate-in fade-in duration-500 p-4 md:p-6 text-gray-200">

            {/* 1. Header & Total Balance */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">My Wallet</h1>
                    <p className="text-slate-400 text-sm mt-1">Manage your balances and recent activity.</p>
                </div>

                <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 shadow-lg flex items-center gap-6 min-w-[300px]">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                        <Wallet className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Balance (USD)</p>
                        <p className="text-3xl font-bold text-white font-mono">${totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </div>

            {/* 2. Quick Actions */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <button
                    onClick={() => navigate('/ramp?tab=deposit')}
                    className="bg-[#111827] hover:bg-[#1a2638] border border-[#1e2d3d] hover:border-emerald-500/50 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group"
                >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowDownRight className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold text-white">Deposit</span>
                </button>

                <button
                    onClick={() => navigate('/trade')}
                    className="bg-blue-600 hover:bg-blue-500 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all shadow-lg shadow-blue-900/20 group"
                >
                    <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowRightLeft className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold text-white">Quick Swap</span>
                </button>

                <button
                    onClick={() => navigate('/ramp?tab=withdraw')}
                    className="bg-[#111827] hover:bg-[#1a2638] border border-[#1e2d3d] hover:border-blue-500/50 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group"
                >
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold text-white">Withdraw</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* 3. Asset Balances Grid */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-indigo-400" /> My Assets
                    </h2>

                    <div className="space-y-3">
                        {PERSONAL_BALANCES.map((asset) => (
                            <div key={asset.id} className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-4 flex items-center justify-between hover:border-slate-600 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${asset.bg}`}>
                                        <span className={`text-xs font-bold ${asset.color}`}>{asset.id}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{asset.id}</p>
                                        <p className="text-[10px] text-slate-500">{asset.name}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-white font-mono">
                                        {asset.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-mono">≈ ${asset.usdValue.toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. Transaction History */}
                <div className="lg:col-span-2">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <History className="w-5 h-5 text-emerald-400" /> Recent Activity
                    </h2>

                    <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl overflow-hidden shadow-xl">
                        <div className="divide-y divide-[#1e2d3d]/50">
                            {RECENT_TRANSACTIONS.map(tx => (
                                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-[#0d1420]/50 transition-colors group">

                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.iconBg}`}>
                                            <tx.icon className={`w-5 h-5 ${tx.iconColor}`} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{tx.type}</p>
                                            <p className="text-xs font-mono text-gray-400 mt-0.5">{tx.details}</p>
                                        </div>
                                    </div>

                                    <div className="text-right flex flex-col items-end">
                                        {/* Dynamic Status Badge */}
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${tx.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' :
                                                tx.status === 'Processing' ? 'bg-yellow-500/10 text-yellow-400 animate-pulse' :
                                                    'bg-red-500/10 text-red-400'
                                            }`}>
                                            {tx.status === 'Completed' && <CheckCircle2 className="w-3 h-3" />}
                                            {tx.status === 'Processing' && <Clock className="w-3 h-3" />}
                                            {tx.status === 'Failed' && <XCircle className="w-3 h-3" />}
                                            {tx.status}
                                        </span>
                                        <p className="text-[10px] text-slate-500">{tx.date}</p>
                                    </div>

                                </div>
                            ))}
                        </div>

                        <button className="w-full p-3 text-xs font-bold text-slate-400 hover:text-white bg-[#0d1420] hover:bg-[#1a2638] transition-colors">
                            View All Transactions →
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}