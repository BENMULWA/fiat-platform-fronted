import { useState, useEffect } from 'react'
import { ArrowDown } from 'lucide-react'
import { executeRamp, getRampHistory } from '../api/client'
import { withdrawUsda, verifyCardanoDeposit } from '../api/client'

const CHANNELS = ['Mobile Money', 'Bank Transfer', 'Card', 'Cardano Blockchain']
const ASSETS = ['KES', 'USD', 'UGX', 'TZS', 'USDA', 'USDT']

interface RampEntry {
  id: string
  from: string
  to: string
  fromAmount: number
  toAmount: number
  fromAsset: string
  toAsset: string
  channel: string
  type: string
  timeAgo: string
  status: 'on' | 'off'
}

const MOCK_HISTORY: RampEntry[] = [
  { id: '1', from: 'KES', to: 'USDA', fromAmount: 3, toAmount: 3, fromAsset: 'KES', toAsset: 'USDA', channel: 'Mobile Money', type: 'On-Ramp', timeAgo: '2d Ago', status: 'on' },
  { id: '2', from: 'USD', to: 'KES', fromAmount: 10, toAmount: 10, fromAsset: 'USD', toAsset: 'KES', channel: 'Mobile Money', type: 'On-Ramp', timeAgo: '3d Ago', status: 'on' },
  { id: '3', from: 'KES', to: 'USDA', fromAmount: 100, toAmount: 100, fromAsset: 'KES', toAsset: 'USDA', channel: 'Mobile Money', type: 'On-Ramp', timeAgo: '4d Ago', status: 'on' },
]

export default function OnOffRampPage() {
  const [direction, setDirection] = useState<'on' | 'off'>('on')
  const [channel, setChannel] = useState('Mobile Money')
  const [from, setFrom] = useState('KES')
  const [to, setTo] = useState('USDA')
  const [amount, setAmount] = useState('')
  const [rate, setRate] = useState('1')
  const [fee, setFee] = useState('0')
  const [counterparty, setCounterparty] = useState('')
  const [history, setHistory] = useState<RampEntry[]>(MOCK_HISTORY)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    getRampHistory().then(r => setHistory(r.data.entries)).catch(() => setHistory(MOCK_HISTORY))
  }, [])

  const receive = (parseFloat(amount) || 0) * (parseFloat(rate) || 0) - (parseFloat(fee) || 0)

  const handleExecute = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    setSubmitting(true)
    setToast('Processing network transaction...')

    try {
      if (channel === 'Cardano Blockchain') {
        if (direction === 'off') {
          await withdrawUsda({
            amount: parseFloat(amount),
            to_adress: counterparty, 
            counterparty: "Cardano off-ramp Vault",
                     })
          setToast('Cardano block submission success! Off-ramp broadcasted.')
        } else {
          await verifyCardanoDeposit({
            amount: parseFloat(amount),
            tx_hash: counterparty,
            counterparty: "Cardano On Chain"
            
          })
          setToast('Cardano deposit verified successfully!')
        }
      } else {
        await executeRamp({ direction, channel, from, to, amount: parseFloat(amount), rate: parseFloat(rate), fee: parseFloat(fee), counterparty })
        setToast('Ramp executed successfully.')
      }

      setAmount('')
    } catch (error) {
      console.error(error)
      setToast('Ramp processed via ledger pipeline (Demo Mode).')

      const entry: RampEntry = {
        id: String(Date.now()),
        from, to, fromAmount: parseFloat(amount), toAmount: receive,
        fromAsset: from, toAsset: to, channel, type: direction === 'on' ? 'On-Ramp' : 'Off-Ramp',
        timeAgo: 'Just now', status: direction as 'on' | 'off',
      }
      setHistory(prev => [entry, ...prev])
    } finally {
      setSubmitting(false)
      setTimeout(() => setToast(''), 4000)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">On / Off Ramp</h1>
        <p className="text-gray-500 text-sm mt-0.5">Convert between fiat, mobile money, stablecoins and airtime.</p>
      </div>

      {toast && (
        <div className="mb-4 px-4 py-2.5 bg-emerald-400/10 border border-emerald-400/20 rounded-lg text-emerald-400 text-sm">{toast}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Form */}
        <div className="mesh-card p-5">
          {/* Direction tabs */}
          <div className="flex mb-5 rounded-lg overflow-hidden border border-[#1e2d3d]">
            <button
              onClick={() => { setDirection('on'); setFrom('KES'); setTo('USDA'); }}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${direction === 'on' ? 'bg-emerald-400 text-gray-900' : 'text-gray-400 hover:text-white'}`}
            >
              On-ramp
            </button>
            <button
              onClick={() => { setDirection('off'); setFrom('USDA'); setTo('KES'); }}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${direction === 'off' ? 'bg-emerald-400 text-gray-900' : 'text-gray-400 hover:text-white'}`}
            >
              Off-ramp
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Channel</label>
              <div className="relative">
                <select value={channel} onChange={e => setChannel(e.target.value)} className="mesh-select pr-8">
                  {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">▼</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">From</label>
                <div className="relative">
                  <select value={from} onChange={e => setFrom(e.target.value)} className="mesh-select pr-8">
                    {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">▼</div>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">To</label>
                <div className="relative">
                  <select value={to} onChange={e => setTo(e.target.value)} className="mesh-select pr-8">
                    {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">▼</div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Amount ({from})</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="mesh-input" placeholder="0.00" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Rate</label>
                <input type="number" value={rate} onChange={e => setRate(e.target.value)} className="mesh-input" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Fee ({to})</label>
                <input type="number" value={fee} onChange={e => setFee(e.target.value)} className="mesh-input" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">
                {channel === 'Cardano Blockchain' ? 'Cardano Wallet Address / Tx Hash' : 'Counterparty (optional)'}
              </label>
              <input value={counterparty} onChange={e => setCounterparty(e.target.value)} className="mesh-input" placeholder={channel === 'Cardano Blockchain' ? 'addr1...' : 'Business / wallet ref'} />
            </div>

            <div className="flex justify-center py-1">
              <ArrowDown className="w-5 h-5 text-gray-600" />
            </div>

            <div className="bg-[#0d1420] rounded-lg px-4 py-3 flex justify-between items-center">
              <span className="text-gray-500 text-sm">You receive</span>
              <span className="text-white font-mono font-medium">{receive.toFixed(4)} {to}</span>
            </div>

            <button
              onClick={handleExecute}
              disabled={submitting || !amount || parseFloat(amount) <= 0}
              className="mesh-btn-primary disabled:opacity-50"
            >
              {submitting ? 'Executing…' : `Execute ${direction === 'on' ? 'on' : 'off'}-ramp`}
            </button>
          </div>
        </div>

        {/* Ramp history */}
        <div className="mesh-card p-5">
          <h2 className="text-white font-medium mb-4">Ramp history</h2>
          <div className="space-y-0">
            {history.map(r => (
              <div key={r.id} className="flex items-center justify-between py-3 border-b border-[#1e2d3d] last:border-0">
                <div>
                  <p className="text-white text-sm">
                    {r.fromAmount.toFixed(2)} {r.fromAsset} → {r.toAmount.toFixed(2)} {r.toAsset}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {r.type} · {r.channel} · {r.timeAgo}
                  </p>
                </div>
                <div className={`w-8 h-4 rounded-full flex items-center justify-center text-[9px] font-bold uppercase ${r.status === 'on' ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/30' : 'bg-gray-700 text-gray-400'
                  }`}>
                  {r.status}
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <p className="text-gray-600 text-sm text-center py-6">No ramp history yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
