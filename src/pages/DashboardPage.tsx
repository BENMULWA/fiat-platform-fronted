import { useEffect, useState } from 'react'
import { Wallet, Link2, Layers, TrendingUp, ArrowRight } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import { useAuth } from '../contexts/AuthContext'
import { getDashboard } from '../api/client'

interface DashboardData {
  portfolioValue: number
  airtHeld: number
  usdaHeld: number
  openOrders: number
  balances: Array<{ asset: string; label: string; amount: number; usdEquivalent: number }>
  recentRampActivity: Array<{ id: string; from: string; to: string; fromAmount: number; toAmount: number; fromAsset: string; toAsset: string; status: string; timeAgo: string }>
  airtimePeg: { collateralization: number; airtMinted: number; usdaReserve: number }
}

const MOCK: DashboardData = {
  portfolioValue: 92.68,
  airtHeld: -88,
  usdaHeld: 191,
  openOrders: 1,
  balances: [
    { asset: 'USDA', label: 'USDA', amount: 191, usdEquivalent: 191 },
    { asset: 'USD', label: 'USD', amount: 3, usdEquivalent: 3 },
    { asset: 'KES', label: 'KES', amount: -1718, usdEquivalent: -13.32 },
    { asset: 'AIRT', label: 'AIRT', amount: -88, usdEquivalent: -88 },
  ],
  recentRampActivity: [
    { id: '1', from: 'KES', to: 'USDA', fromAmount: 3, toAmount: 3, fromAsset: 'KES', toAsset: 'USDA', status: 'completed', timeAgo: '2d ago' },
    { id: '2', from: 'USD', to: 'KES', fromAmount: 10, toAmount: 10, fromAsset: 'USD', toAsset: 'KES', status: 'completed', timeAgo: '3d ago' },
    { id: '3', from: 'KES', to: 'USDA', fromAmount: 100, toAmount: 100, fromAsset: 'KES', toAsset: 'USDA', status: 'completed', timeAgo: '4d ago' },
  ],
  airtimePeg: { collateralization: -78.6, airtMinted: 112, usdaReserve: -88 },
}

export default function DashboardPage() {
  const { viewAsAdmin } = useAuth()
  const [data, setData] = useState<DashboardData>(MOCK)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getDashboard()
      .then(res => setData(res.data))
      .catch(() => setData(MOCK))
      .finally(() => setLoading(false))
  }, [viewAsAdmin])

  const fmt = (n: number, dp = 4) =>
    (n >= 0 ? '' : '') + n.toFixed(dp).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return (
    <div className={`transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`}>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Live snapshot of your arbitrage desk across airtime, stablecoins and fiat.
        </p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Portfolio Value"
          value={`$${data.portfolioValue.toFixed(2)}`}
          sub="USD equivalent"
          icon={<Wallet className="w-4 h-4 text-yellow-400" />}
        />
        <StatCard
          label="AIRT Held"
          value={fmt(data.airtHeld)}
          sub="Tokenized airtime"
          icon={<Link2 className="w-4 h-4 text-emerald-400" />}
          valueClass={data.airtHeld < 0 ? 'text-white' : 'text-emerald-400'}
        />
        <StatCard
          label="USDA Held"
          value={fmt(data.usdaHeld, 2)}
          sub="Stablecoin float"
          icon={<Layers className="w-4 h-4 text-blue-400" />}
        />
        <StatCard
          label="Open Orders"
          value={data.openOrders}
          sub="On the book"
          icon={<TrendingUp className="w-4 h-4 text-orange-400" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Balances */}
        <div className="lg:col-span-2 mesh-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-medium">Balances</h2>
            <button className="text-emerald-400 text-xs hover:text-emerald-300 flex items-center gap-1">
              Move funds <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {data.balances.map(b => (
              <div key={b.asset} className="flex items-center justify-between py-2 border-b border-[#1e2d3d] last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#1a2640] flex items-center justify-center">
                    <span className="text-[10px] font-bold text-emerald-400">{b.asset}</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{b.label}</p>
                    <p className="text-gray-500 text-[11px]">
                      ≈ ${b.usdEquivalent.toFixed(2)}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-mono font-medium tabular-nums ${b.amount < 0 ? 'text-white' : 'text-white'}`}>
                  {fmt(b.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Airtime token peg */}
        <div className="mesh-card p-5">
          <h2 className="text-white font-medium mb-4">Airtime token peg</h2>
          <p className="text-gray-500 text-xs mb-2">Collateralization</p>
          <p className={`text-3xl font-semibold mb-5 ${data.airtimePeg.collateralization < 0 ? 'text-white' : 'text-emerald-400'}`}>
            {data.airtimePeg.collateralization.toFixed(1)}%
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">AIRT minted</span>
              <span className="text-white font-mono">{data.airtimePeg.airtMinted.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">USDA reserve</span>
              <span className="text-white font-mono">{data.airtimePeg.usdaReserve.toFixed(2)} USDA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Peg target</span>
              <span className="text-gray-400">1 AIRT = 1 USDA</span>
            </div>
          </div>
          <button className="text-emerald-400 text-xs hover:text-emerald-300 mt-4 flex items-center gap-1">
            Manage reserve <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Recent ramp activity */}
      <div className="mesh-card p-5 mt-4">
        <h2 className="text-white font-medium mb-4">Recent ramp activity</h2>
        <div className="space-y-0">
          {data.recentRampActivity.map(r => (
            <div key={r.id} className="flex items-center justify-between py-3 border-b border-[#1e2d3d] last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-400/10 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400 rotate-45" />
                </div>
                <div>
                  <p className="text-white text-sm">
                    {r.fromAmount.toFixed(2)} {r.fromAsset} → {r.toAmount.toFixed(2)} {r.toAsset}
                  </p>
                  <p className="text-gray-500 text-xs">{r.timeAgo}</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 uppercase tracking-wider">
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
