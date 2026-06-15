import { useState, useEffect, useRef } from 'react'
import { Search, BookOpen, ArrowLeftRight, DollarSign, ChevronDown, Check } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import { getLedgerSummary, getLedgerEntries } from '../api/client'

interface LedgerEntry {
  id: string
  date: string
  flow: string
  description: string
  debitWallet: string
  creditWallet: string
  debitAmount?: number
  creditAmount?: number
  debitAsset?: string
  creditAsset?: string
  counterparty?: string
}

interface Summary { totalEntries: number; distinctFlows: number; grossValueBooked: number }

const MOCK_SUMMARY: Summary = { totalEntries: 2, distinctFlows: 1, grossValueBooked: 13 }
const MOCK_ENTRIES: LedgerEntry[] = [
  { id: '1', date: 'Jun 12, 03:32 PM', flow: 'FX Deal', description: 'Bought 3.00 USD @ 125.0000 USD/KES', debitWallet: 'USD Wallet', creditWallet: 'KES Wallet', counterparty: 'Abc' },
  { id: '2', date: 'Jun 12, 12:00 PM', flow: 'FX Deal', description: 'Bought 10.00 USD @ 125.0000 USD/KES', debitWallet: 'USD Wallet', creditWallet: 'KES Wallet', debitAmount: 10, creditAmount: 10, debitAsset: 'USD', creditAsset: 'USD', counterparty: 'test' },
]
const ALL_FLOWS = ['All flows', 'FX Deal', 'Ramp', 'Trade', 'Mint', 'Redeem']

export default function GeneralLedgerPage() {
  const [summary, setSummary] = useState<Summary>(MOCK_SUMMARY)
  const [entries, setEntries] = useState<LedgerEntry[]>(MOCK_ENTRIES)
  const [search, setSearch] = useState('')
  const [flow, setFlow] = useState('All flows')
  const [showFlowMenu, setShowFlowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getLedgerSummary().then(r => setSummary(r.data)).catch(() => setSummary(MOCK_SUMMARY))
  }, [])

  useEffect(() => {
    getLedgerEntries(flow === 'All flows' ? undefined : flow, search || undefined)
      .then(r => setEntries(r.data.entries))
      .catch(() => {
        const filtered = MOCK_ENTRIES.filter(e => {
          const matchFlow = flow === 'All flows' || e.flow === flow
          const matchSearch = !search || e.description.toLowerCase().includes(search.toLowerCase()) || e.counterparty?.toLowerCase().includes(search.toLowerCase())
          return matchFlow && matchSearch
        })
        setEntries(filtered)
      })
  }, [flow, search])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowFlowMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">General Ledger</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Every value movement across the desk — trades, FX deals, ramps and mints — captured in one book.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Entries" value={summary.totalEntries} icon={<BookOpen className="w-4 h-4 text-blue-400" />} />
        <StatCard label="Distinct Flows" value={summary.distinctFlows} icon={<ArrowLeftRight className="w-4 h-4 text-orange-400" />} />
        <StatCard label="Gross Value Booked" value={`$${summary.grossValueBooked.toFixed(2)}`} sub="USD equivalent" icon={<DollarSign className="w-4 h-4 text-yellow-400" />} />
      </div>

      <div className="mesh-card p-5">
        {/* Search & filter bar */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search description, counterparty, asset..."
              className="mesh-input pl-9"
            />
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowFlowMenu(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0d1420] border border-[#1e2d3d] rounded-lg text-sm text-white hover:border-emerald-400/30 transition-colors"
            >
              {flow}
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            {showFlowMenu && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-[#1a2332] border border-[#1e2d3d] rounded-lg shadow-xl overflow-hidden min-w-[130px]">
                {ALL_FLOWS.map(f => (
                  <button
                    key={f}
                    onClick={() => { setFlow(f); setShowFlowMenu(false) }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-white/5 transition-colors"
                  >
                    <span className={flow === f ? 'text-white font-medium' : 'text-gray-400'}>{f}</span>
                    {flow === f && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e2d3d]">
                {['Date', 'Flow', 'Description', 'Debit → Credit', 'Counterparty'].map(col => (
                  <th key={col} className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest pb-3 pr-4">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-b border-[#1e2d3d] last:border-0 hover:bg-white/2">
                  <td className="py-3 pr-4 text-gray-400 text-xs whitespace-nowrap">{e.date}</td>
                  <td className="py-3 pr-4">
                    <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 border border-blue-800/30 rounded text-[10px] font-semibold">
                      {e.flow}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-white">{e.description}</td>
                  <td className="py-3 pr-4 text-gray-400 text-xs whitespace-nowrap">
                    {e.debitWallet} → {e.creditWallet}
                    {e.debitAmount != null && (
                      <span className="ml-2 font-mono text-white">
                        {e.debitAmount.toFixed(2)} {e.debitAsset} ${e.creditAmount?.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-gray-400">{e.counterparty || '—'}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-600">No entries match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
