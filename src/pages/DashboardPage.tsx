import { useEffect, useState } from 'react';
import {
  Wallet, TrendingUp, Layers, Server, Smartphone,
  Radio, Coins, Network, CreditCard,
  Link2, AlertTriangle, ArrowRight, CheckCircle2, Clock,
  
} from 'lucide-react';
import { getMasterWalletBalance } from '../api/client';

// --- MOCK DATA ---
// Added 'balance' and 'currency' to prepare for backend API integration
const INFRASTRUCTURE_NODES = [
  { id: 'N1', name: 'Telkom Kenya Airtime Inflow', desc: '10% Discount Rate', category: 'Airtime', icon: Radio, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', balance: 0, currency: 'KES' },
  { id: 'N2', name: 'Airtel Kenya Airtime Inflow', desc: '6% Discount Rate', category: 'Airtime', icon: Radio, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', balance: 0, currency: 'KES' },
  { id: 'N3', name: 'Safaricom Airtime Inflow', desc: '4% Discount Rate', category: 'Airtime', icon: Radio, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', balance: 0, currency: 'KES' },
  { id: 'N4', name: 'M-Pesa Super Agent Node', desc: 'B2C & C2B Liquidity', category: 'Mobile Money', icon: Smartphone, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', balance: 0, currency: 'KES' },
  { id: 'N5', name: 'Airtel Money Super Agent Node', desc: 'B2C & C2B Liquidity', category: 'Mobile Money', icon: Smartphone, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20', balance: 0, currency: 'KES' },
  { id: 'N6', name: 'T-Kash Super Agent Node', desc: 'B2C & C2B Liquidity', category: 'Mobile Money', icon: Smartphone, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20', balance: 0, currency: 'KES' },
  { id: 'N7', name: 'USDA Stablecoin Mint', desc: 'Cardano Native Token', category: 'Web3', icon: Coins, color: 'text-indigo-400', bg: 'bg-indigo-400/10 border-indigo-400/20', balance: 0, currency: 'USDA' },
  { id: 'N8', name: 'Impalacoin Treasury Engine', desc: 'Collateral & Reserve Mgr', category: 'Web3', icon: Layers, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', balance: 0, currency: 'IMP' },
  { id: 'N9', name: 'Multi-Chain Router', desc: 'Stellar / Midnight Network', category: 'Web3', icon: Network, color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/20', balance: 0, currency: 'XLM' },
  { id: 'N10', name: 'PSP & Virtual Card Engine', desc: 'Global Card Settlement', category: 'Payments', icon: CreditCard, color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', balance: 0, currency: 'USD' },
];

const SETTLEMENTS = [
  { id: 'tx-1', desc: '3 KES → 3 USDA', time: '2d ago', status: 'COMPLETED' },
  { id: 'tx-2', desc: '150 USDA → 19,500 KES', time: '3d ago', status: 'COMPLETED' },
];

export default function DashboardPage() {
  const [masterUSDA, setMasterUSDA] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);

  useEffect(() => {
    // Fetch live Master Wallet balance on load from your ACTUAL backend
    getMasterWalletBalance()
      .then((res: any) => {
        setMasterUSDA(res?.data?.balance || res?.balance || 0);
      })
      .catch((err: any) => {
        console.error("Balance fetch failed", err);
        setMasterUSDA(0); // Set to 0 if the backend fails, no fake data!
      })
      .finally(() => setLoading(false));
  }, []);

  // --- DERIVED CALCULATIONS ---
  const totalPortfolioUSD = masterUSDA;

  const VAULTS = [
    { id: 'USDA', name: 'USDA', desc: 'Master Wallet', balance: masterUSDA, usdValue: masterUSDA, color: 'bg-blue-500', isCrypto: true },
    { id: 'KES', name: 'KES', desc: 'Paybill Fiat', balance: 0, usdValue: 0, color: 'bg-red-500', isCrypto: false },
    { id: 'IMP', name: 'IMP', desc: 'Impala Coin', balance: 0, usdValue: 0, color: 'bg-red-500', isCrypto: true },
    { id: 'AIRT', name: 'AIRT', desc: 'Telco Inventory', balance: 0, usdValue: 0, color: 'bg-red-500', isCrypto: false },
  ];

  return (
    <div className={`transition-opacity duration-500 ${loading ? 'opacity-60' : 'opacity-100'} p-4 md:p-6 max-w-[1600px] mx-auto min-h-screen bg-[#0b0f19] text-gray-200 font-sans space-y-6`}>

      {/* HEADER */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">Vault Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Live snapshot of corporate vaults, system infrastructure, and oracle collateral ratios.</p>
      </div>

      {/* ROW 1: TOP KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Portfolio Value</span>
          </div>
          <p className="text-3xl font-bold text-white font-mono">
            ${totalPortfolioUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-slate-500 text-xs mt-1">USD equivalent</p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Link2 className="w-4 h-4 text-orange-400" />
            <span className="text-[10px] uppercase font-bold tracking-wider">AIRT Inventory</span>
          </div>
          <p className="text-3xl font-bold text-white font-mono">0.00</p>
          <p className="text-slate-500 text-xs mt-1">Tokenized airtime</p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] uppercase font-bold tracking-wider">USDA Float</span>
          </div>
          <p className="text-3xl font-bold text-white font-mono">
            {masterUSDA.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-slate-500 text-xs mt-1">Master Wallet</p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Open Routes</span>
          </div>
          <p className="text-3xl font-bold text-white font-mono">1</p>
          <p className="text-slate-500 text-xs mt-1">Active MM Quotes</p>
        </div>
      </div>

      {/* ROW 2: PANELS (VAULTS & ORACLE) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* PANEL 1: LIVE VAULT ALLOCATION */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">Panel 1: Live Vault Allocation</h2>
            <button className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors">
              Rebalance funds <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-0">
            {VAULTS.map((vault) => {
              const pct = totalPortfolioUSD > 0 ? (vault.usdValue / totalPortfolioUSD) * 100 : 0;
              const isWarning = pct < 15; // 15% Liquidity Warning Threshold

              return (
                <div key={vault.id} className={`flex flex-col sm:flex-row sm:items-center gap-4 py-4 border-b border-slate-800/60 last:border-0 ${isWarning ? 'bg-red-500/5 -mx-4 px-4 rounded-lg' : ''}`}>

                  {/* Asset Icon & Name */}
                  <div className="w-40 shrink-0 flex items-center gap-3">
                    <div className="px-2 py-1 rounded bg-[#1e293b] border border-slate-700 text-[10px] font-bold text-slate-300">
                      {vault.id}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                        {vault.name}
                        {isWarning && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                      </h3>
                      <p className="text-xs text-slate-500">{vault.desc}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex-1 flex items-center gap-3">
                    <div className="h-2 flex-1 bg-[#1e293b] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${isWarning ? 'bg-red-500' : vault.color}`}
                        style={{ width: `${Math.max(pct, 1)}%` }} // Force min 1% width for visibility if > 0
                      />
                    </div>
                    <span className={`text-xs font-mono font-medium w-12 text-right ${isWarning ? 'text-red-400' : 'text-slate-400'}`}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>

                  {/* Balances */}
                  <div className="w-24 shrink-0 text-right">
                    <p className={`font-mono font-bold text-sm ${isWarning ? 'text-red-400' : 'text-white'}`}>
                      {vault.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">≈ ${vault.usdValue.toFixed(2)}</p>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL 2: ORACLE SYNC */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col">
          <h2 className="text-lg font-bold text-white mb-6">Panel 2: Oracle Sync</h2>

          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">System Collateralization</p>
            <p className="text-5xl font-bold text-emerald-400 tracking-tighter">100.0%</p>
          </div>

          <div className="space-y-4 mb-8 flex-1">
            <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
              <span className="text-xs text-slate-400">Airtime Reserve (96% Haircut)</span>
              <span className="text-sm text-white font-mono font-medium">$0.00</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
              <span className="text-xs text-slate-400">IMP Minted (Circulation)</span>
              <span className="text-sm text-white font-mono font-medium">$0.00</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-slate-400">Oracle Status</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold tracking-wider">
                SYNCED (1m)
              </span>
            </div>
          </div>

          <button
            onClick={async () => {
              setIsAuditing(true);
              await new Promise(r => setTimeout(r, 2000));
              setIsAuditing(false);
            }}
            disabled={isAuditing}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all border ${isAuditing
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse cursor-wait'
                : 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
              }`}
          >
            {isAuditing ? 'Auditing On-Chain...' : 'Audit Smart Contract'}
          </button>
        </div>
      </div>

      {/* ROW 3: SYSTEM INFRASTRUCTURE NODES GRID */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-400" />
          Active Infrastructure Nodes
        </h2>

        {/* Adjusted grid to lg:grid-cols-3 to give cards more width and prevent truncation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
          {INFRASTRUCTURE_NODES.map((node) => {
            const Icon = node.icon;

            // Inject the live API balance into the USDA Stablecoin node (N7)
            const liveBalance = node.id === 'N7' ? masterUSDA : node.balance;

            // DYNAMIC STATUS: If the node has money, it is online. If it hits 0, it goes offline.
            const isOnline = liveBalance > 0;

            return (
              <div
                key={node.id}
                className={`bg-[#111827]/80 backdrop-blur-sm border rounded-xl p-5 flex items-start gap-4 transition-all group ${isOnline
                    ? 'border-slate-700 hover:border-slate-500 hover:shadow-lg hover:shadow-black/20'
                    : 'border-slate-800/80 opacity-50 grayscale-[40%]'
                  }`}
              >
                <div className={`p-3 rounded-xl border ${node.bg} transition-transform group-hover:scale-110 shrink-0`}>
                  <Icon className={`w-5 h-5 ${node.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      {node.id} • {node.category}
                    </span>

                    {/* DYNAMIC STATUS BADGE */}
                    {isOnline ? (
                      <span className="flex items-center gap-1 text-[8px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[8px] text-slate-400 bg-slate-500/10 border border-slate-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        <div className="w-1 h-1 rounded-full bg-slate-500" />
                        Offline
                      </span>
                    )}
                  </div>

                  <h3 className={`font-semibold text-sm leading-tight pr-2 ${isOnline ? 'text-white' : 'text-slate-300'}`} title={node.name}>
                    {node.name}
                  </h3>
                  <p className="text-slate-500 text-[11px] mt-1">
                    {node.desc}
                  </p>
                </div>

                {/* LIQUIDITY DISPLAY PER NODE */}
                <div className="shrink-0 text-right ml-2 border-l border-slate-800/60 pl-4 flex flex-col justify-center min-w-[80px]">
                  <p className={`font-mono font-bold text-sm ${isOnline ? 'text-white' : 'text-slate-500'}`}>
                    {liveBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${isOnline ? node.color : 'text-slate-600'}`}>
                    {node.currency}
                  </p>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* ROW 4: SETTLEMENT LOG */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-4">Settlement Log (Realized P&L)</h2>

        <div className="space-y-2">
          {SETTLEMENTS.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-slate-800/30 rounded-xl transition-colors border border-transparent hover:border-slate-700/50">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white font-mono">{tx.desc}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> {tx.time}
                  </p>
                </div>
              </div>

              <div className="text-[10px] font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                {tx.status} <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}

          {SETTLEMENTS.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No recent settlements.</p>
          )}
        </div>
      </div>

    </div>
  );
}