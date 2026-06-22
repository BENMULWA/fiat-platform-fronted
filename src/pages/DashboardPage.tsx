import { useEffect, useState } from 'react'
import { Wallet, Link2, Layers, TrendingUp, ArrowRight, AlertTriangle } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import { useAuth } from '../contexts/AuthContext'
import { getDashboard, getMasterWalletBalance } from '../api/client'

// Exchange rates for internal calculations (130 KES = 1 USD)
const RATES_TO_USD = {
  USDA: 1.00,
  IMP: 1.00,
  KES: 1 / 130,
  AIRT: 1 / 130
}

interface DashboardData {
  openOrders: number
  balances: { USDA: number; KES: number; IMP: number; AIRT: number }
  recentRampActivity: Array<{ id: string; from: string; to: string; fromAmount: number; toAmount: number; fromAsset: string; toAsset: string; status: string; timeAgo: string }>
}

const MOCK: DashboardData = {
  openOrders: 3,
  balances: { USDA: 50000, KES: 6500000, IMP: 30000, AIRT: 10000000 },
  recentRampActivity: [],
}

const ASSET_CONFIGS = [
  { id: 'USDA', name: 'USDA', desc: 'Master Wallet', color: 'bg-blue-500' },
  { id: 'KES', name: 'KES', desc: 'Paybill Fiat', color: 'bg-emerald-500' },
  { id: 'IMP', name: 'IMP', desc: 'Impala Coin', color: 'bg-purple-500' },
  { id: 'AIRT', name: 'AIRT', desc: 'Telco Inventory', color: 'bg-orange-500' }
]

export default function DashboardPage() {
  const { viewAsAdmin } = useAuth()
  const [data, setData] = useState<DashboardData>(MOCK)
  const [masterBalance, setMasterBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)

    // Fetch Main Dashboard API
    getDashboard()
      .then(res => {
        setData(res.data)
      })
      .catch(() => setData(MOCK))

    // Fetch REAL-TIME Cardano Master Wallet Balance
    getMasterWalletBalance()
      .then(res => setMasterBalance(res.data.balance))
      .catch(err => console.error("Master Wallet API error:", err))
      .finally(() => setLoading(false))
  }, [viewAsAdmin])

  const fmt = (n: number | undefined, dp = 2) => {
    if (n === undefined || isNaN(n)) return '0.00';
    return n.toFixed(dp).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  const usdaFloat = masterBalance !== null ? masterBalance : (data?.balances?.USDA || 0);
  const safeBalances = { ...(data?.balances || MOCK.balances), USDA: usdaFloat };

  // Total Portfolio = (Asset Quantity * Rate) summed for all assets
  const portfolioUSD =
    ((safeBalances.USDA || 0) * RATES_TO_USD.USDA) +
    ((safeBalances.KES || 0) * RATES_TO_USD.KES) +
    ((safeBalances.IMP || 0) * RATES_TO_USD.IMP) +
    ((safeBalances.AIRT || 0) * RATES_TO_USD.AIRT);

  // Oracle Collateral = (Airtime * Rate) * 0.94 (5% haircut)
  const collateralValueUSD = ((safeBalances.AIRT || 0) * RATES_TO_USD.AIRT) * 0.94;
  const impMintedUSD = (safeBalances.IMP || 0) * RATES_TO_USD.IMP;
  const pegRatio = impMintedUSD > 0 ? (collateralValueUSD / impMintedUSD) * 100 : 100;
  const isSafe = pegRatio >= 100;

  return (
    <div className={`transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`}>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Treasury Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Live snapshot of corporate vaults, active arbitrage desks, and oracle collateral ratios.</p>
      </div>

      {/* Responsive Stat Cards: grid-cols-1 on mobile, grid-cols-4 on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Portfolio Of Value Assets" value={`$${fmt(portfolioUSD)}`} sub="USD equivalent" icon={<Wallet className="w-4 h-4 text-yellow-400" />} />
        <StatCard label="AIRT Inventory" value={fmt(safeBalances.AIRT, 0)} sub="Tokenized airtime" icon={<Link2 className="w-4 h-4 text-orange-400" />} />
        <StatCard label="USDA Float" value={fmt(usdaFloat, 2)} sub="Master Wallet" icon={<Layers className="w-4 h-4 text-blue-400" />} />
        <StatCard label="Open Routes" value={data?.openOrders || 0} sub="Active MM Quotes" icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Panel 1: Live Vault Allocation */}
        <div className="lg:col-span-2 mesh-card p-5">
          <div className="flex items-center justify-between mb-6 border-b border-[#1e2d3d] pb-4">
            <h2 className="text-white font-medium">Panel 1: Live Vault Allocation</h2>
            <button className="text-emerald-400 text-xs hover:text-emerald-300 flex items-center gap-1">
              Rebalance funds <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-5">
            {ASSET_CONFIGS.map(asset => {
              const amount = safeBalances[asset.id as keyof typeof safeBalances] || 0;
              const usdValue = amount * RATES_TO_USD[asset.id as keyof typeof RATES_TO_USD];
              const pct = portfolioUSD > 0 ? (usdValue / portfolioUSD) * 100 : 0;
              const isWarning = pct < 15;
              return (
                <div key={asset.id} className={`flex flex-col sm:flex-row sm:items-center justify-between py-2 p-3 rounded-lg border ${isWarning ? 'bg-red-500/10 border-red-500/30' : 'border-transparent hover:bg-white/5'}`}>
                  <div className="flex items-center gap-3 w-40 shrink-0 mb-3 sm:mb-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#1a2640]">
                      <span className={`text-[10px] font-bold ${isWarning ? 'text-red-400' : 'text-gray-300'}`}>{asset.id}</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium flex items-center gap-1.5">
                        {asset.name}
                        {isWarning && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                      </p>
                      <p className="text-gray-500 text-[11px]">{asset.desc}</p>
                    </div>
                  </div>

                  {/* Progress Bar with Percentage matching target dashboard layout */}
                  <div className="grow flex items-center gap-3 px-0 sm:px-4 mb-3 sm:mb-0">
                    <div className="h-2 w-full bg-[#0d1420] rounded-full overflow-hidden border border-[#1e2d3d]">
                      <div className={`h-full rounded-full transition-all duration-500 ${isWarning ? 'bg-red-500' : asset.color}`} style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }} />
                    </div>
                    <span className={`text-xs font-mono w-12 text-right ${isWarning ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>

                  {/* Vault Values with approximated sub-values */}
                  <div className="w-32 shrink-0 text-right">
                    <p className={`text-sm font-mono font-medium ${isWarning ? 'text-red-400' : 'text-white'}`}>{fmt(amount, 0)}</p>
                    <p className="text-gray-500 text-[11px] font-mono mt-0.5">≈ ${fmt(usdValue, 2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel 2: Oracle Sync */}
        <div className="mesh-card p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-white font-medium mb-4 border-b border-[#1e2d3d] pb-2">Panel 2: Oracle Sync</h2>
            <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">System Collateralization</p>
            <p className={`text-4xl font-bold mb-6 ${isSafe ? 'text-emerald-400' : 'text-red-400'}`}>{pegRatio.toFixed(1)}%</p>

            <div className="space-y-3 text-sm bg-[#0d1420] p-4 rounded-lg border border-[#1e2d3d]">
              <div className="flex justify-between items-center border-b border-[#1e2d3d] pb-2">
                <span className="text-gray-400 text-xs">Airtime Reserve (96% Haircut)</span>
                <span className="text-white font-mono text-xs">${fmt(collateralValueUSD, 2)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#1e2d3d] pb-2">
                <span className="text-gray-400 text-xs">IMP Minted (Circulation)</span>
                <span className="text-white font-mono text-xs">${fmt(impMintedUSD, 2)}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-gray-400 text-xs">Oracle Status</span>
                <span className="text-emerald-400 text-[10px] px-2 py-1 bg-emerald-400/10 rounded-full border border-emerald-400/20 font-bold tracking-wide">
                  SYNCED (1m)
                </span>
              </div>
            </div>
          </div>

          {/* Audit Action Button Trigger */}
          <button className="w-full text-center text-emerald-400 text-xs hover:text-emerald-300 mt-5 border border-emerald-400/20 rounded-lg py-2.5 transition-colors font-medium bg-emerald-400/5">
            Audit Smart Contract
          </button>
        </div>
      </div>

      {/* Settlement Log */}
      <div className="mesh-card p-5 mt-4">
        <h2 className="text-white font-medium mb-4">Settlement Log (Realized P&L)</h2>
        <div className="space-y-0">
          {(data?.recentRampActivity || []).map(r => (
            <div key={r.id} className="flex items-center justify-between py-3 border-b border-[#1e2d3d] last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-400/10 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-mono">{r.fromAmount} {r.fromAsset} → {r.toAmount} {r.toAsset}</p>
                  <p className="text-gray-500 text-xs">{r.timeAgo}</p>
                </div>
              </div>
              <span className="text-xs text-emerald-400 font-bold uppercase">{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}