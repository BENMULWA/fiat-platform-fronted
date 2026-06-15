import { useState, useEffect } from 'react'
import { Link2, Layers, RefreshCw } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import { getAirtimeSummary, getAirtimeHistory, mintAirt, redeemAirt } from '../api/client'

const NETWORKS = ['Telkom', 'Safaricom', 'Airtel', 'MTN', 'Orange', 'Vodacom']
const COUNTRIES = [
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
]

interface LedgerEntry { id: string; type: 'mint' | 'redeem'; amount: number; network: string; country: string; usdaAmount: number; timeAgo: string }
interface Summary { airtInCirculation: number; usdaReserve: number; collateralRatio: number }

const MOCK_SUMMARY: Summary = { airtInCirculation: 112, usdaReserve: -88, collateralRatio: -78.6 }
const MOCK_HISTORY: LedgerEntry[] = [
  { id: '1', type: 'redeem', amount: 10, network: 'Telkom', country: 'KE', usdaAmount: -10, timeAgo: '2d ago' },
  { id: '2', type: 'mint', amount: 12, network: 'Telkom', country: 'KE', usdaAmount: 12, timeAgo: '2d ago' },
  { id: '3', type: 'redeem', amount: 90, network: 'Telkom', country: 'KE', usdaAmount: -90, timeAgo: '4d ago' },
]

export default function AirtimeLedgerPage() {
  const [tab, setTab] = useState<'mint' | 'redeem'>('mint')
  const [amount, setAmount] = useState('')
  const [network, setNetwork] = useState('Telkom')
  const [country, setCountry] = useState('KE')
  const [note, setNote] = useState('')
  const [summary, setSummary] = useState<Summary>(MOCK_SUMMARY)
  const [history, setHistory] = useState<LedgerEntry[]>(MOCK_HISTORY)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    getAirtimeSummary().then(r => setSummary(r.data)).catch(() => setSummary(MOCK_SUMMARY))
    getAirtimeHistory().then(r => setHistory(r.data.entries)).catch(() => setHistory(MOCK_HISTORY))
  }, [])

  const handleAction = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    setSubmitting(true)
    const payload = { amount: parseFloat(amount), network, country, note }
    try {
      if (tab === 'mint') await mintAirt(payload)
      else await redeemAirt(payload)
      setToast(`${tab === 'mint' ? 'Minted' : 'Redeemed'} ${parseFloat(amount).toFixed(4)} AIRT successfully.`)
      setAmount('')
    } catch {
      setToast(`${tab === 'mint' ? 'Mint' : 'Redeem'} recorded (demo mode).`)
      const entry: LedgerEntry = {
        id: String(Date.now()),
        type: tab,
        amount: parseFloat(amount),
        network,
        country,
        usdaAmount: tab === 'mint' ? parseFloat(amount) : -parseFloat(amount),
        timeAgo: 'Just now',
      }
      setHistory(prev => [entry, ...prev])
    } finally {
      setSubmitting(false)
      setTimeout(() => setToast(''), 3000)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Tokenized Airtime Ledger</h1>
        <p className="text-gray-500 text-sm mt-0.5">Mint and redeem AIRT, pegged 1:1 to USDA and backed by airtime reserves.</p>
      </div>

      {toast && (
        <div className="mb-4 px-4 py-2.5 bg-emerald-400/10 border border-emerald-400/20 rounded-lg text-emerald-400 text-sm">{toast}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="AIRT in Circulation" value={summary.airtInCirculation.toFixed(4)} icon={<Link2 className="w-4 h-4 text-emerald-400" />} />
        <StatCard
          label="USDA Reserve"
          value={`${summary.usdaReserve.toFixed(2)} USDA`}
          icon={<Layers className="w-4 h-4 text-blue-400" />}
          valueClass={summary.usdaReserve < 0 ? 'text-white' : 'text-emerald-400'}
        />
        <StatCard
          label="Collateral Ratio"
          value={`${summary.collateralRatio.toFixed(1)}%`}
          sub="Target ≥ 100%"
          icon={<RefreshCw className="w-4 h-4 text-orange-400" />}
          valueClass={summary.collateralRatio < 100 ? 'text-white' : 'text-emerald-400'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mint / Redeem form */}
        <div className="mesh-card p-5">
          <div className="flex mb-5 rounded-lg overflow-hidden border border-[#1e2d3d]">
            <button
              onClick={() => setTab('mint')}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${tab === 'mint' ? 'bg-emerald-400 text-gray-900' : 'text-gray-400 hover:text-white'}`}
            >
              Mint
            </button>
            <button
              onClick={() => setTab('redeem')}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${tab === 'redeem' ? 'bg-emerald-400 text-gray-900' : 'text-gray-400 hover:text-white'}`}
            >
              Redeem
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Amount (AIRT)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="mesh-input" placeholder="0.00" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Network</label>
                <div className="relative">
                  <select value={network} onChange={e => setNetwork(e.target.value)} className="mesh-select pr-8">
                    {NETWORKS.map(n => <option key={n}>{n}</option>)}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">▾</div>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Country</label>
                <div className="relative">
                  <select value={country} onChange={e => setCountry(e.target.value)} className="mesh-select pr-8">
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">▾</div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Note (optional)</label>
              <input value={note} onChange={e => setNote(e.target.value)} className="mesh-input" placeholder="Reserve source / reference" />
            </div>

            <p className="text-[11px] text-gray-600">
              {tab === 'mint' ? 'Locks USDA reserve and issues AIRT 1:1.' : 'Burns AIRT and releases USDA reserve 1:1.'}
            </p>

            <button onClick={handleAction} disabled={submitting || !amount || parseFloat(amount) <= 0} className="mesh-btn-primary disabled:opacity-50">
              {submitting ? 'Processing…' : `${tab === 'mint' ? 'Mint' : 'Redeem'} AIRT`}
            </button>
          </div>
        </div>

        {/* Ledger history */}
        <div className="mesh-card p-5">
          <h2 className="text-white font-medium mb-4">Ledger history</h2>
          <div className="space-y-0">
            {history.map(e => (
              <div key={e.id} className="flex items-center gap-3 py-3 border-b border-[#1e2d3d] last:border-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${e.type === 'mint' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'
                  }`}>
                  {e.type === 'mint' ? '+' : '−'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm capitalize">
                    {e.type} · {e.amount.toFixed(4)} AIRT
                  </p>
                  <p className="text-gray-500 text-xs">{e.network} · {e.country} · {e.timeAgo}</p>
                </div>
                <span className={`text-sm font-mono font-medium ${e.usdaAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {e.usdaAmount >= 0 ? '+' : ''}{e.usdaAmount.toFixed(2)} USDA
                </span>
              </div>
            ))}
            {history.length === 0 && <p className="text-gray-600 text-sm text-center py-6">No ledger entries yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
