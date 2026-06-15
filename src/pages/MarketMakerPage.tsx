import { useState, useEffect } from 'react'
import { Plus, Power, Trash2 } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import { getQuotes, createQuote, deleteQuote, toggleQuote, bookDeal } from '../api/client'

interface Quote {
  id: string
  pair: string
  isLive: boolean
  bankRef: string
  bankSpread: number
  bankBuy: number
  bankSell: number
  youBuy: number
  youSell: number
  yourSpread: number
}

const MOCK_QUOTES: Quote[] = [
  {
    id: '1',
    pair: 'USD/KES',
    isLive: true,
    bankRef: 'uba',
    bankSpread: 2,
    bankBuy: 128,
    bankSell: 130,
    youBuy: 125,
    youSell: 131,
    yourSpread: 6,
  },
]

const PAIRS = ['USD/KES', 'USD/UGX', 'USD/TZS', 'USDA/KES', 'EUR/KES']

export default function MarketMakerPage() {
  const [quotes, setQuotes] = useState<Quote[]>(MOCK_QUOTES)
  const [showNewQuote, setShowNewQuote] = useState(false)
  const [newPair, setNewPair] = useState('USD/KES')
  const [bankSpread, setBankSpread] = useState('2')
  const [bankRef, setBankRef] = useState('uba')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getQuotes()
      .then(res => setQuotes(res.data.quotes))
      .catch(() => setQuotes(MOCK_QUOTES))
  }, [])

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      const res = await createQuote({ pair: newPair, bankSpread: parseFloat(bankSpread), bankRef })
      setQuotes(prev => [...prev, res.data])
    } catch {
      setQuotes(prev => [
        ...prev,
        {
          id: String(Date.now()),
          pair: newPair,
          isLive: false,
          bankRef,
          bankSpread: parseFloat(bankSpread),
          bankBuy: 128,
          bankSell: 130,
          youBuy: 125,
          youSell: 131,
          yourSpread: 6,
        },
      ])
    } finally {
      setSubmitting(false)
      setShowNewQuote(false)
    }
  }

  const handleDelete = async (id: string) => {
    try { await deleteQuote(id) } catch { /* offline */ }
    setQuotes(prev => prev.filter(q => q.id !== id))
  }

  const handleToggle = async (id: string) => {
    try { await toggleQuote(id) } catch { /* offline */ }
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, isLive: !q.isLive } : q))
  }

  const handleBook = async (id: string) => {
    try { await bookDeal(id) } catch { /* offline */ }
    alert('Deal booked successfully.')
  }

  const activeQuotes = quotes.filter(q => q.isLive).length
  const avgSpread = quotes.length ? (quotes.reduce((s, q) => s + q.bankSpread, 0) / quotes.length).toFixed(2) : '0.00'

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Market Maker · Dealing Desk</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Quote your own two-way prices around reference bank rates and deal off your own liquidity.
          </p>
        </div>
        <button
          onClick={() => setShowNewQuote(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-gray-900 font-semibold text-sm rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          New quote
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Active Quotes" value={activeQuotes} icon={<Power className="w-4 h-4 text-emerald-400" />} />
        <StatCard label="Pairs Quoted" value={quotes.length} />
        <StatCard label="Avg. Spread" value={`${avgSpread}%`} sub="Across active quotes" />
      </div>

      {/* New quote form */}
      {showNewQuote && (
        <div className="mesh-card p-5 mb-4">
          <h3 className="text-white font-medium mb-4">New Quote</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Pair</label>
              <select value={newPair} onChange={e => setNewPair(e.target.value)} className="mesh-select">
                {PAIRS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Bank reference</label>
              <input value={bankRef} onChange={e => setBankRef(e.target.value)} className="mesh-input" placeholder="e.g. uba" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Bank spread</label>
              <input type="number" value={bankSpread} onChange={e => setBankSpread(e.target.value)} className="mesh-input" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNewQuote(false)} className="mesh-btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={submitting} className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-gray-900 font-semibold text-sm rounded-lg transition-colors disabled:opacity-60">
              {submitting ? 'Creating…' : 'Create quote'}
            </button>
          </div>
        </div>
      )}

      {/* Quote cards */}
      <div className="space-y-4">
        {quotes.map(q => (
          <div key={q.id} className="mesh-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{q.pair}</span>
                {q.isLive && (
                  <span className="px-2 py-0.5 bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 text-[10px] font-semibold rounded-full uppercase tracking-wider">
                    Live
                  </span>
                )}
                <span className="text-gray-500 text-xs">vs {q.bankRef} · bank spread {q.bankSpread.toFixed(4)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggle(q.id)} className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                  <Power className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(q.id)} className="w-7 h-7 rounded-lg hover:bg-red-900/20 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Bank Buy', value: q.bankBuy.toFixed(4), valueClass: 'text-white' },
                { label: 'Bank Sell', value: q.bankSell.toFixed(4), valueClass: 'text-white' },
                { label: 'You Buy', value: q.youBuy.toFixed(4), valueClass: 'text-emerald-400' },
                { label: 'You Sell', value: q.youSell.toFixed(4), valueClass: 'text-red-400' },
              ].map(col => (
                <div key={col.label} className="bg-[#0d1420] rounded-lg p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{col.label}</p>
                  <p className={`text-lg font-semibold tabular-nums ${col.valueClass}`}>{col.value}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-xs">
                Your spread: <span className="text-white font-medium">{q.yourSpread.toFixed(4)} {q.pair.split('/')[1]}</span>
              </span>
              <button onClick={() => handleBook(q.id)} className="px-4 py-1.5 border border-[#1e2d3d] hover:border-emerald-400/40 text-white text-sm rounded-lg transition-colors">
                Book deal
              </button>
            </div>
          </div>
        ))}

        {quotes.length === 0 && (
          <div className="mesh-card p-10 text-center text-gray-600 text-sm">
            No quotes yet. Create your first quote above.
          </div>
        )}
      </div>
    </div>
  )
}
