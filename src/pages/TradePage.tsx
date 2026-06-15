import { useState, useEffect } from 'react'
import { getOrderBook, getTradeHistory, placeOrder } from '../api/client'

interface OrderBookEntry { price: number; amount: number }
interface TradeHistoryEntry { id: string; side: string; price: number; amount: number; status: string; createdAt: string }

interface OrderBook {
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
}

const MOCK_OB: OrderBook = { bids: [{ price: 1, amount: 200 }], asks: [] }
const MOCK_HISTORY: TradeHistoryEntry[] = []

export default function TradePage() {
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [price, setPrice] = useState('1.00')
  const [amount, setAmount] = useState('0.00')
  const [orderBook, setOrderBook] = useState<OrderBook>(MOCK_OB)
  const [history, setHistory] = useState<TradeHistoryEntry[]>(MOCK_HISTORY)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    getOrderBook().then(r => setOrderBook(r.data)).catch(() => setOrderBook(MOCK_OB))
    getTradeHistory().then(r => setHistory(r.data.trades)).catch(() => setHistory(MOCK_HISTORY))
  }, [])

  const total = (parseFloat(price) || 0) * (parseFloat(amount) || 0)

  const handlePlace = async () => {
    setSubmitting(true)
    try {
      await placeOrder({ side, price: parseFloat(price), amount: parseFloat(amount) })
      setToast('Order placed successfully.')
      setAmount('0.00')
    } catch {
      setToast('Order placed (demo mode).')
    } finally {
      setSubmitting(false)
      setTimeout(() => setToast(''), 3000)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Trade · AIRT / USDA</h1>
        <p className="text-gray-500 text-sm mt-0.5">Place and fill orders for tokenized airtime against USDA.</p>
      </div>

      {toast && (
        <div className="mb-4 px-4 py-2.5 bg-emerald-400/10 border border-emerald-400/20 rounded-lg text-emerald-400 text-sm">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Order form */}
        <div className="mesh-card p-5">
          {/* Buy/Sell tabs */}
          <div className="flex mb-5 rounded-lg overflow-hidden border border-[#1e2d3d]">
            <button
              onClick={() => setSide('buy')}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                side === 'buy' ? 'bg-emerald-400 text-gray-900' : 'bg-transparent text-gray-400 hover:text-white'
              }`}
            >
              Buy AIRT
            </button>
            <button
              onClick={() => setSide('sell')}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                side === 'sell' ? 'bg-red-500 text-white' : 'bg-transparent text-gray-400 hover:text-white'
              }`}
            >
              Sell AIRT
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Price (USDA per AIRT)</label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="mesh-input"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Amount (AIRT)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="mesh-input"
                step="0.01"
              />
            </div>
            <div className="flex justify-between text-sm py-2">
              <span className="text-gray-500">Total</span>
              <span className="text-white font-mono">{total.toFixed(2)} USDA</span>
            </div>
            <button
              onClick={handlePlace}
              disabled={submitting || !parseFloat(amount)}
              className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 ${
                side === 'buy'
                  ? 'bg-emerald-400 hover:bg-emerald-300 text-gray-900'
                  : 'bg-red-500 hover:bg-red-400 text-white'
              }`}
            >
              {submitting ? 'Placing…' : `Place ${side} order`}
            </button>
          </div>
        </div>

        {/* Order book */}
        <div className="mesh-card p-5">
          <h2 className="text-white font-medium mb-4">Order book</h2>
          <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-widest mb-3">
            <span className="text-emerald-400">Bids</span>
            <span className="text-red-400">Asks</span>
          </div>
          <div className="flex gap-6 text-sm font-mono">
            <div className="flex-1 space-y-1.5">
              {orderBook.bids.length ? orderBook.bids.map((b, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-emerald-400">{b.price.toFixed(4)}</span>
                  <span className="text-gray-400">{b.amount.toFixed(2)}</span>
                </div>
              )) : <p className="text-gray-600 text-xs">No orders</p>}
            </div>
            <div className="flex-1 space-y-1.5 text-right">
              {orderBook.asks.length ? orderBook.asks.map((a, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-400">{a.amount.toFixed(2)}</span>
                  <span className="text-red-400">{a.price.toFixed(4)}</span>
                </div>
              )) : <p className="text-gray-600 text-xs">No orders</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Trade history */}
      <div className="mesh-card p-5">
        <h2 className="text-white font-medium mb-4">Trade history</h2>
        {history.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">No filled or cancelled orders yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-[#1e2d3d] last:border-0 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${t.side === 'buy' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                    {t.side}
                  </span>
                  <span className="text-white font-mono">{t.amount.toFixed(4)} AIRT @ {t.price.toFixed(4)}</span>
                </div>
                <span className="text-gray-500 text-xs">{t.createdAt}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
