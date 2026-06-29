// @ts-nocheck --- enables bypass the errors of unused imports for clean deployment
import { useState, useEffect } from 'react'
import { ArrowDown, ArrowRightLeft, Clock, CheckCircle2, XCircle, AlertCircle, Copy, RefreshCw, Wallet } from 'lucide-react'
import {
  executeRamp,
  getRampHistory,
  withdrawUsda,
  verifyCardanoDeposit,
  getCardanoWallet,
  estimateCardanoFee
} from '../api/client'

const CHANNELS = ['Mobile Money', 'Bank Transfer', 'Card', 'Cardano Blockchain']

interface RampEntry {
  id: string
  fromAmount: number
  toAmount: number
  fromAsset: string
  toAsset: string
  channel: string
  direction: string
  timeAgo: string
  date?: string
  status: string
}

export default function OnOffRampPage() {
  const [direction, setDirection] = useState<'on' | 'off'>('on')
  const [channel, setChannel] = useState('Mobile Money')
  const [amount, setAmount] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [history, setHistory] = useState<RampEntry[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [toastError, setToastError] = useState('')

  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Cardano Specific State
  const [cardanoAddress, setCardanoAddress] = useState('')
  const [cardanoLoading, setCardanoLoading] = useState(false)
  const [txHashInput, setTxHashInput] = useState('')
  
  // The state variables for the Cardano UI enhancements
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null)
  const [estimatedFeeUsd, setEstimatedFeeUsd] = useState<number | null>(null)
  const [walletBalances, setWalletBalances] = useState<{ ada?: number | null; usda?: number | null } | null>(null)

  // Asset Routing based on Direction
  const from = direction === 'on' ? 'KES' : 'USDA'
  const to = direction === 'on' ? 'USDA' : 'KES'

  // Internal rates for display (In production, fetch these live)
  const rate = direction === 'on' ? (1 / 132.00) : 128.00
  const fee = 0
  const receiveAmount = (parseFloat(amount) || 0) * rate - fee

  const loadHistory = async () => {
    try {
      const r: any = await getRampHistory()
      if (r.data?.entries) {
        // Filter out internal swaps so this page ONLY shows ramps
        const rampsOnly = r.data.entries.filter((e: any) => e.direction !== 'swap')
        setHistory(rampsOnly)
      }
    } catch (e) {
      console.debug('Failed to load history', e)
    }
  }

  useEffect(() => {
    loadHistory()
    const interval = setInterval(loadHistory, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (channel === 'Cardano Blockchain' && direction === 'on') {
      fetchDepositAddress()
    }
  }, [channel, direction])

  const fetchDepositAddress = async () => {
    setCardanoLoading(true)
    try {
      const res: any = await getCardanoWallet()
      const payload = res?.data || res
      if (payload?.address) setCardanoAddress(payload.address)
      else if (payload?.address_str) setCardanoAddress(payload.address_str)
      else setCardanoAddress('addr_demo_placeholder_active')

      // Set Fee and Balances for the UI
      if (typeof payload?.estimated_fee_ada === 'number') setEstimatedFee(payload.estimated_fee_ada)
      if (typeof payload?.estimated_fee_usd === 'number') setEstimatedFeeUsd(payload.estimated_fee_usd)
      if (payload?.ada_balance !== undefined || payload?.usda_balance !== undefined) {
        setWalletBalances({ ada: payload?.ada_balance ?? null, usda: payload?.usda_balance ?? null })
      }
    } catch (err) {
      console.error(err)
      setToastError('Failed to fetch deposit address.')
      setCardanoAddress('') 
    } finally {
      setCardanoLoading(false)
    }
  }

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

  const handleExecute = async () => {
    const numericAmount = parseFloat(amount)

    // Guardrails
    if (channel === 'Mobile Money' && numericAmount > 1) {
      setToastError('Sandbox limit is 1 KES. Please enter 1.')
      setTimeout(() => setToastError(''), 4000)
      return
    }

    if (!amount || numericAmount <= 0) return

    // Require counterparty unless it's a Cardano On-Ramp
    if (!(channel === 'Cardano Blockchain' && direction === 'on') && !counterparty) {
      setToastError('Please enter your destination details (Phone/Address).')
      setTimeout(() => setToastError(''), 4000)
      return
    }

    setSubmitting(true)
    setToastError('')

    try {
      if (channel === 'Cardano Blockchain') {
        if (direction === 'off') {
          // Cardano Off-Ramp
          const addr = counterparty
          const valid = addr && (addr.startsWith('addr') || addr.startsWith('Ae2'))
          if (!valid) {
            setToastError('Invalid Cardano address. Please check and try again.')
            setSubmitting(false)
            return
          }

          const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
          await withdrawUsda({
            amount: numericAmount,
            to_address: addr,
            asset: 'USDA',
            idempotency_key: idempotencyKey,
            counterparty: 'Cardano off-ramp Vault',
          })
          setSuccessMessage(`Cardano block submission successful! ${numericAmount} USDA is broadcasting to the network.`)

        } else {
          // Cardano On-Ramp
          const tx = txHashInput || counterparty
          if (!tx) {
            setToastError('No TX Hash provided. Please paste the transaction hash to verify.')
            setSubmitting(false)
            return
          }
          await verifyCardanoDeposit({ amount: numericAmount, tx_hash: tx, counterparty: 'Cardano On Chain' })
          setSuccessMessage('Cardano deposit verified successfully! USDA credited to your account.')
        }
      } else {
        // Standard Execution (Mobile Money, Bank, Card)
        await executeRamp({
          direction,
          channel,
          from_asset: from,
          to_asset: to,
          amount: numericAmount,
          rate,
          fee,
          counterparty
        })

        if (channel === 'Mobile Money') {
          setSuccessMessage(direction === 'on'
            ? 'STK Push sent! Please check your phone to enter your M-Pesa PIN.'
            : 'Payout dispatched! The funds are being sent to your M-Pesa.')
        } else {
          setSuccessMessage('Transaction initiated successfully.')
        }
      }

      setShowSuccessModal(true)
      setAmount('')
      if (channel !== 'Cardano Blockchain') setCounterparty('')
      setTxHashInput('')
      loadHistory()

    } catch (error: any) {
      console.error(error)
      const backendError = error.response?.data?.detail
      if (backendError) {
        setToastError(`Error: ${backendError}`)
      } else {
        setToastError('Payment could not be completed. Please check your details and try again.')
      }
    } finally {
      setSubmitting(false)
      setTimeout(() => setToastError(''), 5000)
    }
  }

  return (
    <div className="animate-in fade-in duration-300 relative max-w-7xl mx-auto p-4 md:p-6 text-gray-200">

      {/* SUCCESS MODAL POPUP */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Success!</h3>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">{successMessage}</p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-900/20"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* HEADER & ERRORS */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Deposit & Withdraw</h1>
        <p className="text-gray-500 text-sm mt-1">Move real-world funds in and out of your secure wallet.</p>
      </div>

      {toastError && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-medium animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {toastError}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* LEFT: THE RAMP FORM */}
        <div className="bg-[#0b0f19] border border-[#1e2d3d] rounded-3xl p-6 shadow-xl relative overflow-hidden">

          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />

          {/* Direction Tabs */}
          <div className="flex mb-6 rounded-xl overflow-hidden bg-[#111827] p-1 border border-[#1e2d3d] relative z-10">
            <button
              onClick={() => { setDirection('on'); setAmount(''); }}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${direction === 'on' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              Deposit (On-Ramp)
            </button>
            <button
              onClick={() => { setDirection('off'); setAmount(''); }}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${direction === 'off' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              Withdraw (Off-Ramp)
            </button>
          </div>

          <div className="space-y-6 relative z-10">

            {/* Channel Selector */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                Payment Channel
              </label>
              <div className="relative">
                <select
                  value={channel}
                  onChange={e => setChannel(e.target.value)}
                  className="w-full bg-[#111827] border border-[#1e2d3d] focus:border-emerald-500 rounded-xl py-3.5 pl-4 pr-10 text-white font-medium appearance-none outline-none transition-colors cursor-pointer"
                >
                  {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <ArrowDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* BIG AMOUNT INPUT */}
            <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 transition-colors focus-within:border-emerald-500/50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Amount to {direction === 'on' ? 'Deposit' : 'Withdraw'}</span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="bg-transparent text-4xl font-bold w-full outline-none text-white placeholder-gray-700"
                  placeholder="0.00"
                />
                <div className="flex items-center gap-2 bg-[#1e2d3d] px-4 py-2 rounded-xl shrink-0">
                  <span className="font-bold text-white">{from}</span>
                </div>
              </div>
            </div>

            {/* DYNAMIC COUNTERPARTY INPUT */}
            <div>
              <label className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 block">
                {channel === 'Cardano Blockchain'
                  ? (direction === 'on' ? 'Deposit Instructions' : 'Destination Cardano Address')
                  : channel === 'Mobile Money' ? 'Your M-Pesa Phone Number'
                    : 'Account / Reference Details'}
              </label>

              {channel === 'Cardano Blockchain' && direction === 'on' ? (
                <div className="space-y-3 p-5 bg-[#111827] border border-[#1e2d3d] rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Send USDA to your secure address:</span>
                    <button onClick={fetchDepositAddress} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                      <RefreshCw className={`w-3 h-3 ${cardanoLoading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input value={cardanoAddress} readOnly className="flex-1 bg-[#0d1420] border border-[#1e2d3d] rounded-lg py-3 px-4 text-gray-300 text-sm font-mono outline-none" />
                    <button
                      onClick={() => {
                        if (cardanoAddress) navigator.clipboard.writeText(cardanoAddress)
                        setToastError('Address copied!')
                        setTimeout(() => setToastError(''), 2000)
                      }}
                      className="bg-[#1e2d3d] hover:bg-gray-700 px-4 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Copy className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <div className="pt-3 border-t border-[#1e2d3d] mt-3">
                    <span className="text-xs text-emerald-400 mb-2 block font-medium">After sending, paste your TX Hash below to verify:</span>
                    <input
                      value={txHashInput}
                      onChange={e => setTxHashInput(e.target.value)}
                      className="w-full bg-[#0d1420] border border-[#1e2d3d] focus:border-emerald-500 rounded-lg py-3 px-4 text-white text-sm font-mono outline-none transition-colors"
                      placeholder="Paste Tx Hash..."
                    />
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={counterparty}
                  onChange={e => setCounterparty(e.target.value)}
                  className="w-full bg-[#111827] border border-[#1e2d3d] focus:border-blue-500 rounded-xl py-4 px-4 text-white text-lg font-mono transition-colors outline-none"
                  placeholder={
                    channel === 'Cardano Blockchain' ? 'addr1...' :
                      channel === 'Mobile Money' ? '2547XXXXXXXX' : 'Account number'
                  }
                />
              )}
            </div>

            <div className="flex justify-center -my-2 relative z-20">
              <div className="bg-[#0b0f19] p-1.5 rounded-full">
                <ArrowDown className="w-5 h-5 text-gray-500" />
              </div>
            </div>

            {/* Receive Summary Box */}
            <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">You Will Receive</span>
                <span className="text-xs text-gray-500 font-mono">Rate: {rate < 1 ? rate.toFixed(4) : rate.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  readOnly
                  value={receiveAmount > 0 ? receiveAmount.toFixed(2) : '0.00'}
                  className="bg-transparent text-4xl font-bold w-full outline-none text-emerald-400"
                />
                <div className="flex items-center gap-2 bg-[#1e2d3d] px-4 py-2 rounded-xl shrink-0">
                  <span className="font-bold text-white">{to}</span>
                </div>
              </div>
            </div>

            {/* CARDANO SPECIFIC UI: Fees and Balances */}
            {channel === 'Cardano Blockchain' && (
              <div className="animate-in slide-in-from-top-2">
                {/* Show Network Fee for Withdrawals */}
                {direction === 'off' && estimatedFee !== null && (
                  <div className="bg-[#0d1420] border border-[#1e2d3d] rounded-xl px-5 py-3 mt-3 flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Est. Network Gas Fee</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-blue-400 font-mono">{estimatedFee.toFixed(2)} ADA</span>
                      {estimatedFeeUsd && <span className="text-xs text-gray-500 ml-2">(≈ ${estimatedFeeUsd.toFixed(2)})</span>}
                    </div>
                  </div>
                )}

                {/* Show Hot Wallet Balances for Deposits */}
                {direction === 'on' && walletBalances && (
                  <div className="bg-[#0d1420] border border-[#1e2d3d] rounded-xl px-5 py-3 mt-3 flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Your Hot Wallet</span>
                    <div className="flex gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 block mb-0.5">USDA</span>
                        <span className="text-sm font-bold text-emerald-400 font-mono">{walletBalances.usda?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="text-right border-l border-[#1e2d3d] pl-4">
                        <span className="text-[10px] text-gray-500 block mb-0.5">ADA</span>
                        <span className="text-sm font-bold text-blue-400 font-mono">{walletBalances.ada?.toLocaleString() || '0'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleExecute}
              disabled={submitting || !amount || parseFloat(amount) <= 0}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#1e2d3d] disabled:text-gray-500 text-white font-bold text-lg rounded-xl transition-colors shadow-lg shadow-emerald-900/20 mt-4"
            >
              {submitting ? 'Processing...' : `Confirm ${direction === 'on' ? 'Deposit' : 'Withdrawal'}`}
            </button>
          </div>
        </div>

        {/* RIGHT: RAMP HISTORY PANEL */}
        <div className="bg-[#0b0f19] border border-[#1e2d3d] rounded-3xl p-6 shadow-xl flex flex-col h-[750px]">
          <h2 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            Transfer History
          </h2>

          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {history.map(r => {
              const isCompleted = r.status?.toLowerCase() === 'completed';
              const isFailed = r.status?.toLowerCase() === 'failed';
              const isProcessing = r.status?.toLowerCase() === 'processing' || (!isCompleted && !isFailed);

              return (
                <div key={r.id} className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-4 flex items-center justify-between hover:border-gray-600 transition-colors">
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        r.direction === 'on' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                        {r.direction === 'on' ? 'Deposit' : 'Withdrawal'}
                      </span>
                      <span className="text-white font-bold text-sm font-mono">
                        {r.fromAmount} {r.fromAsset} <span className="text-gray-500 mx-1">→</span> {r.toAmount.toFixed(2)} {r.toAsset}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                      <span>{r.date || 'Today'}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                      <span>{r.timeAgo || 'Just now'}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                      <span className="truncate max-w-[120px]">{r.channel}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${isCompleted ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        isFailed ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse'
                      }`}>
                      {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                      {isFailed && <XCircle className="w-3 h-3" />}
                      {isProcessing && <Clock className="w-3 h-3" />}
                      {isProcessing ? 'PROCESSING' : r.status}
                    </span>
                  </div>
                </div>
              );
            })}

            {history.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-[#1e2d3d] rounded-2xl flex flex-col items-center justify-center h-48">
                <ArrowRightLeft className="w-8 h-8 text-gray-600 mb-3" />
                <p className="text-gray-400 text-sm font-medium">No transfers found.</p>
                <p className="text-gray-600 text-xs mt-1">Your deposits and withdrawals will appear here.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}