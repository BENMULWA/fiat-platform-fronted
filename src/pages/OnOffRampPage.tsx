import { useState, useEffect } from 'react'
import { ArrowDown } from 'lucide-react'
import { executeRamp, getRampHistory } from '../api/client'
import { withdrawUsda, verifyCardanoDeposit, getCardanoWallet, getCardanoTxHistory, estimateCardanoFee } from '../api/client'

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
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null)
  const [showWalletBalance, setShowWalletBalance] = useState(false)
  const [walletBalances, setWalletBalances] = useState<{ ada?: number | null; usda?: number | null } | null>(null)
  const [estimatedFeeUsd, setEstimatedFeeUsd] = useState<number | null>(null)
  const [counterparty, setCounterparty] = useState('')
  const [history, setHistory] = useState<RampEntry[]>(MOCK_HISTORY)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')
  const [cardanoAddress, setCardanoAddress] = useState('')
  const [cardanoLoading, setCardanoLoading] = useState(false)
  const [txHashInput, setTxHashInput] = useState('')
  const [cardanoTxs, setCardanoTxs] = useState<any[]>([])

  useEffect(() => {
    getRampHistory().then((r: any) => setHistory(r.data?.entries)).catch(() => setHistory(MOCK_HISTORY))
  }, [])

  useEffect(() => {
    if (channel === 'Cardano Blockchain' && direction === 'on') {
      fetchDepositAddress()
    }
    if (channel === 'Cardano Blockchain') fetchRecentCardanoTxs()
    // When Cardano channel selected, force destination asset to USDA
    if (channel === 'Cardano Blockchain') {
      setTo('USDA')
    }
  }, [channel, direction])

  const fetchRecentCardanoTxs = async () => {
    try {
      const res: any = await getCardanoTxHistory(10)
      const txs = res?.data?.transactions || res?.transactions || []
      setCardanoTxs(txs)
    } catch (err) {
      const e: any = err
      console.debug('Cardano tx fetch failed', e)
      setCardanoTxs([])
    }
  }

  const fetchDepositAddress = async () => {
    setCardanoLoading(true)
    try {
      const res: any = await getCardanoWallet()
      const payload = res?.data || res
      if (payload?.address) setCardanoAddress(payload.address)
      else if (payload?.address_str) setCardanoAddress(payload.address_str)
      else if (payload?.address_str) setCardanoAddress(payload.address_str)
      else setCardanoAddress('addr_demo_placeholder_active')

      // pick up estimated fee and balances if returned
      if (typeof payload?.estimated_fee_ada === 'number') setEstimatedFee(payload.estimated_fee_ada)
      if (typeof payload?.estimated_fee_usd === 'number') setEstimatedFeeUsd(payload.estimated_fee_usd)
      if (payload?.ada_balance !== undefined || payload?.usda_balance !== undefined) {
        setWalletBalances({ ada: payload?.ada_balance ?? null, usda: payload?.usda_balance ?? null })
      }
    } catch (err) {
      console.error(err)
      const e: any = err
      const msg = e?.response?.data?.detail || e?.message || 'Failed to fetch deposit address.'
      setToast(msg)
      setCardanoAddress('addr_error_failed_to_load_backend')
    } finally {
      setCardanoLoading(false)
    }
  }

  // estimate fee when amount or recipient changes for Cardano operations
  useEffect(() => {
    const estimate = async () => {
      if (channel !== 'Cardano Blockchain') return
      if (!amount || parseFloat(amount) <= 0) return

      const toAddr = direction === 'on' ? cardanoAddress : counterparty
      if (!toAddr) return

      try {
        const res: any = await estimateCardanoFee({ to_address: toAddr, amount: parseFloat(amount), asset: 'USDA' })
        const data = res?.data || res
        if (typeof data?.estimated_fee_ada === 'number') setEstimatedFee(data.estimated_fee_ada)
        if (typeof data?.estimated_fee_usd === 'number') setEstimatedFeeUsd(data.estimated_fee_usd)
      } catch (err) {
        console.debug('Fee estimate failed', err)
        setEstimatedFee(null)
        setEstimatedFeeUsd(null)
      }
    }

    const t = setTimeout(estimate, 350)
    return () => clearTimeout(t)
  }, [amount, counterparty, cardanoAddress, channel, direction])

  const receive = (parseFloat(amount) || 0) * (parseFloat(rate) || 0) - (parseFloat(fee) || 0)

  const handleExecute = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    setSubmitting(true)
    setToast('Processing network transaction...')

    try {
      if (channel === 'Cardano Blockchain') {
        if (direction === 'off') {
          // Basic address validation
          const addr = counterparty
          const valid = addr && (addr.startsWith('addr') || addr.startsWith('Ae2'))
          if (!valid) {
            setToast('Invalid Cardano address. Please check and try again.')
            setSubmitting(false)
            return
          }

          const confirmMsg = `Confirm withdraw ${parseFloat(amount)} ${to} to ${addr}?`
          if (!window.confirm(confirmMsg)) {
            setToast('Withdrawal cancelled.')
            setSubmitting(false)
            return
          }

          const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`
          await withdrawUsda({
            amount: parseFloat(amount),
            to_address: addr,
            asset: to,
            idempotency_key: idempotencyKey,
            counterparty: 'Cardano off-ramp Vault',
          })
          setToast('Cardano block submission success! Off-ramp broadcasted.')
        } else {
          // verify deposit by tx hash (user can paste hash) or prompt to fetch address
          const tx = txHashInput || counterparty
          if (!tx) {
            setToast('No tx hash provided — fetch deposit address or paste tx hash to verify.')
          } else {
            await verifyCardanoDeposit({ amount: parseFloat(amount), tx_hash: tx, counterparty: 'Cardano On Chain' })
            setToast('Cardano deposit verified successfully!')
          }
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
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="mesh-input"
                placeholder={channel === 'Cardano Blockchain' ? 'Enter amount to swap → you will receive USDA' : '0.00'}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Rate</label>
                <input type="number" value={rate} onChange={e => setRate(e.target.value)} className="mesh-input" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Fee ({to})</label>
                <input type="number" value={fee} onChange={e => setFee(e.target.value)} className="mesh-input" />
                {channel === 'Cardano Blockchain' && (
                  <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-[#071226] to-[#0b1a2b] border border-[#1e2d3d]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-400">Network fee</div>
                        <div className="text-white font-mono text-lg font-medium">{estimatedFee !== null ? `${estimatedFee.toFixed(6)} ADA` : '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Approx. USD</div>
                        <div className="text-emerald-400 font-medium">{estimatedFeeUsd !== null ? `$${estimatedFeeUsd.toFixed(4)}` : '—'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Wallet balance check */}
            {channel === 'Cardano Blockchain' && (
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-400">
                  <input type="checkbox" checked={showWalletBalance} onChange={e => { setShowWalletBalance(e.target.checked); if (e.target.checked) fetchDepositAddress() }} />
                  Show my wallet balance
                </label>
                {showWalletBalance && walletBalances && (
                  <div className="text-sm text-gray-300">
                    <div>ADA: {walletBalances.ada ?? '—'}</div>
                    <div>USDA: {walletBalances.usda ?? '—'}</div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">
                {channel === 'Cardano Blockchain' ? (direction === 'on' ? 'Cardano deposit address / tx hash' : 'Destination Cardano address') : 'Counterparty (optional)'}
              </label>
              {channel === 'Cardano Blockchain' && direction === 'on' ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button type="button" onClick={fetchDepositAddress} className="mesh-btn-ghost">
                      {cardanoLoading ? 'Fetching…' : 'Get deposit address'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (cardanoAddress) navigator.clipboard.writeText(cardanoAddress)
                        setToast('Address copied to clipboard.')
                        setTimeout(() => setToast(''), 2000)
                      }}
                      className="mesh-btn-ghost"
                    >
                      Copy
                    </button>
                  </div>
                  {cardanoAddress && (
                    <input value={cardanoAddress} readOnly className="mesh-input" />
                  )}
                  <input value={txHashInput} onChange={e => setTxHashInput(e.target.value)} className="mesh-input" placeholder="Paste tx hash here to verify" />

                  {cardanoTxs.length > 0 && (
                    <div className="mt-3">
                      <h3 className="text-sm font-medium text-white mb-2">Recent Cardano activity</h3>
                      <div className="space-y-2 text-sm">
                        {cardanoTxs.map((t, i) => (
                          <div key={i} className="flex items-center justify-between bg-[#0d1420] p-2 rounded">
                            <div>
                              <div className="text-white">{t.tx_hash?.slice(0, 16) || t.txHash?.slice(0,16)}…</div>
                              <div className="text-gray-500 text-xs">{t.block_time || t.block_time || t.block_time}</div>
                            </div>
                            <div className="text-emerald-400 font-mono">{t.usda_amount ?? t.usda_amount}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <input value={counterparty} onChange={e => setCounterparty(e.target.value)} className="mesh-input" placeholder={channel === 'Cardano Blockchain' ? 'addr1...' : 'Business / wallet ref'} />
              )}
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
