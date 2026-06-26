import { useState, useEffect } from 'react'
import { ArrowDown, ArrowRightLeft, Clock, CheckCircle2, XCircle, AlertCircle, Copy, RefreshCw } from 'lucide-react'
import {
  executeRamp,
  executeInternalSwap,
  getRampHistory,
  withdrawUsda,
  verifyCardanoDeposit,
  getCardanoWallet,
  getCardanoTxHistory,
  estimateCardanoFee
} from '../api/client'

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
  date?: string
  status: string
}

export default function OnOffRampPage() {
  const [direction, setDirection] = useState<'on' | 'off' | 'swap'>('on')
  const [channel, setChannel] = useState('Mobile Money')
  const [from, setFrom] = useState('KES')
  const [to, setTo] = useState('USDA')
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
  const [cardanoTxs, setCardanoTxs] = useState<any[]>([])
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null)
  const [estimatedFeeUsd, setEstimatedFeeUsd] = useState<number | null>(null)
  const [showWalletBalance, setShowWalletBalance] = useState(false)
  const [walletBalances, setWalletBalances] = useState<{ ada?: number | null; usda?: number | null } | null>(null)

  // Fixed internal rates for display (hidden from retail user inputs)
  let rate = 1
  if (direction === 'swap') {
    if (from === 'KES' && to === 'USDA') rate = 1 / 130;
    else if (from === 'USDA' && to === 'KES') rate = 130;
    else if (from === 'KES' && to === 'UGX') rate = 28.5;
    else if (from === 'UGX' && to === 'KES') rate = 1 / 28.5;
  }
  const fee = 0
  const receiveAmount = (parseFloat(amount) || 0) * rate - fee

  const loadHistory = async () => {
    try {
      const r: any = await getRampHistory()
      if (r.data?.entries) {
        setHistory(r.data.entries)
      }
    } catch (e) {
      console.debug('Failed to load history', e)
    }
  }

  // Poll history every 5 seconds
  useEffect(() => {
    loadHistory()
    const interval = setInterval(loadHistory, 5000)
    return () => clearInterval(interval)
  }, [])

  // --- CARDANO LOGIC ---
  useEffect(() => {
    if (channel === 'Cardano Blockchain' && direction === 'on') {
      fetchDepositAddress()
    }
    if (channel === 'Cardano Blockchain') {
      fetchRecentCardanoTxs()
      setTo('USDA')
    }
  }, [channel, direction])

  const fetchRecentCardanoTxs = async () => {
    try {
      const res: any = await getCardanoTxHistory(10)
      const txs = res?.data?.transactions || res?.transactions || []
      setCardanoTxs(txs)
    } catch (err) {
      console.debug('Cardano tx fetch failed', err)
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
      else setCardanoAddress('addr_demo_placeholder_active')

      if (typeof payload?.estimated_fee_ada === 'number') setEstimatedFee(payload.estimated_fee_ada)
      if (typeof payload?.estimated_fee_usd === 'number') setEstimatedFeeUsd(payload.estimated_fee_usd)
      if (payload?.ada_balance !== undefined || payload?.usda_balance !== undefined) {
        setWalletBalances({ ada: payload?.ada_balance ?? null, usda: payload?.usda_balance ?? null })
      }
    } catch (err) {
      console.error(err)
      setToastError('Failed to fetch deposit address.')
      setCardanoAddress('addr_error_failed_to_load_backend')
    } finally {
      setCardanoLoading(false)
    }
  }

  // Estimate fee when amount/recipient changes for Cardano operations
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

  // --- EXECUTION LOGIC ---
  const handleExecute = async () => {
    const numericAmount = parseFloat(amount)

    // Sandbox Guardrail for Mobile Money
    if (channel === 'Mobile Money' && numericAmount > 1) {
      setToastError('Sandbox limit is 1 KES. Please enter 1.')
      setTimeout(() => setToastError(''), 4000)
      return
    }

    if (!amount || numericAmount <= 0) return

    // Validate counterparty unless it's a Cardano On-Ramp (which uses txHashInput)
    // AND skip this check entirely if it's an Internal Swap
    if (direction !== 'swap' && !(channel === 'Cardano Blockchain' && direction === 'on') && !counterparty) {
      setToastError('Please enter your destination details (Phone/Address).')
      setTimeout(() => setToastError(''), 4000)
      return
    }

    setSubmitting(true)
    setToastError('')

    try {
      if (direction === 'swap') {
        // --- INTERNAL LEDGER SWAP ---
        const res: any = await executeInternalSwap({
          from_asset: from,
          to_asset: to,
          amount: numericAmount
        });
        setSuccessMessage(res?.data?.message || 'Swap completed instantly.');
      } else if (channel === 'Cardano Blockchain') {
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
            asset: to,
            idempotency_key: idempotencyKey,
            counterparty: 'Cardano off-ramp Vault',
          })
          setSuccessMessage(`Cardano block submission successful! ${numericAmount} ${to} is broadcasting to the network.`)

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
      if (channel !== 'Cardano Blockchain' && direction !== 'swap') setCounterparty('')
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
    <div className="animate-in fade-in duration-300 relative">

      {/* 1. SUCCESS MODAL POPUP */}
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

      {/* 2. HEADER & ERRORS */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Quick Swap</h1>
        <p className="text-gray-500 text-sm mt-1">Convert fiat and crypto securely across multiple channels.</p>
      </div>

      {toastError && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-medium animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {toastError}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* LEFT: THE SWAP FORM */}
        <div className="bg-[#0b0f19] border border-[#1e2d3d] rounded-3xl p-6 shadow-xl relative overflow-hidden">

          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />

          {/* Direction Tabs (Fixed Responsive Spacing) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 relative z-10">
            <button
              onClick={() => { setDirection('on'); setFrom('KES'); setTo('USDA'); setAmount(''); setToastError(''); }}
              className={`py-3.5 px-2 text-sm font-bold rounded-xl border transition-all duration-300 ${direction === 'on'
                  ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-[#111827] border-[#1e2d3d] text-gray-400 hover:text-white hover:border-gray-600'
                }`}
            >
              Deposit (To Crypto)
            </button>
            <button
              onClick={() => { setDirection('swap'); setFrom('KES'); setTo('USDA'); setAmount(''); setToastError(''); }}
              className={`py-3.5 px-2 text-sm font-bold rounded-xl border transition-all duration-300 ${direction === 'swap'
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                  : 'bg-[#111827] border-[#1e2d3d] text-gray-400 hover:text-white hover:border-gray-600'
                }`}
            >
              Internal Swap
            </button>
            <button
              onClick={() => { setDirection('off'); setFrom('USDA'); setTo('KES'); setAmount(''); setToastError(''); }}
              className={`py-3.5 px-2 text-sm font-bold rounded-xl border transition-all duration-300 ${direction === 'off'
                  ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-[#111827] border-[#1e2d3d] text-gray-400 hover:text-white hover:border-gray-600'
                }`}
            >
              Withdraw (To Fiat)
            </button>
          </div>

          <div className="space-y-6 relative z-10">

            {/* Channel Selector */}
            {direction !== 'swap' && (
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                  Payment Channel
                </label>
                <div className="relative">
                  <select
                    value={channel}
                    onChange={e => setChannel(e.target.value)}
                    className="w-full bg-[#111827] border border-[#1e2d3d] focus:border-emerald-500 rounded-xl py-3.5 pl-4 pr-10 text-white font-medium appearance-none outline-none transition-colors"
                  >
                    {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
            )}

            {/* Visual Route Display */}
            {direction === 'swap' && (
              <div className="flex items-center justify-between bg-[#111827] p-4 rounded-xl border border-[#1e2d3d]">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">From Asset</p>
                  <select value={from} onChange={e => setFrom(e.target.value)} className="bg-transparent text-xl font-bold text-white outline-none w-full appearance-none cursor-pointer">
                    {ASSETS.map(a => <option key={a} value={a} className="bg-[#111827]">{a}</option>)}
                  </select>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#1e2d3d] flex items-center justify-center shrink-0 mx-4">
                  <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">To Asset</p>
                  <select value={to} onChange={e => setTo(e.target.value)} className="bg-transparent text-xl font-bold text-white outline-none w-full appearance-none text-right cursor-pointer" dir="rtl">
                    {ASSETS.map(a => <option key={a} value={a} className="bg-[#111827]">{a}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* BIG AMOUNT INPUT */}
            <div>
              <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 block">
                1. Amount to Swap ({from})
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-[#111827] border-2 border-[#1e2d3d] focus:border-emerald-500 rounded-xl py-4 pl-4 pr-20 text-white text-xl font-mono transition-colors outline-none shadow-inner"
                  placeholder="0.00"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">{from}</span>
              </div>
            </div>

            {/* DYNAMIC COUNTERPARTY INPUT (With Internal Swap clarification) */}
            {direction === 'swap' ? (
              <div>
                <label className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 block">
                  2. Destination
                </label>
                <div className="w-full bg-[#111827]/60 border-2 border-[#1e2d3d]/60 rounded-xl py-4 px-4 flex items-center justify-between cursor-not-allowed">
                  <span className="text-gray-400 text-lg font-mono">Your Internal Wallet</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 font-medium">Internal swaps instantly update your dashboard balances without network fees.</p>
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 block">
                  2. {channel === 'Cardano Blockchain'
                    ? (direction === 'on' ? 'Deposit Details' : 'Destination Cardano Address')
                    : channel === 'Mobile Money' ? 'Your M-Pesa Phone Number'
                      : 'Account / Reference Details'}
                </label>

                {channel === 'Cardano Blockchain' && direction === 'on' ? (
                  <div className="space-y-3 p-4 bg-[#111827] border border-[#1e2d3d] rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Send {from} to this address:</span>
                      <button onClick={fetchDepositAddress} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                        <RefreshCw className={`w-3 h-3 ${cardanoLoading ? 'animate-spin' : ''}`} /> Refresh
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input value={cardanoAddress} readOnly className="flex-1 bg-[#0d1420] border border-[#1e2d3d] rounded-lg py-2.5 px-3 text-gray-300 text-xs font-mono outline-none" />
                      <button
                        onClick={() => {
                          if (cardanoAddress) navigator.clipboard.writeText(cardanoAddress)
                          setToastError('Address copied!')
                          setTimeout(() => setToastError(''), 2000)
                        }}
                        className="bg-[#1e2d3d] hover:bg-gray-700 px-3 rounded-lg flex items-center justify-center transition-colors"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    <div className="pt-2 border-t border-[#1e2d3d]">
                      <span className="text-xs text-gray-400 mb-2 block">After sending, paste your TX Hash below:</span>
                      <input
                        value={txHashInput}
                        onChange={e => setTxHashInput(e.target.value)}
                        className="w-full bg-[#0d1420] border border-[#1e2d3d] focus:border-blue-500 rounded-lg py-2.5 px-3 text-white text-sm font-mono outline-none transition-colors"
                        placeholder="Paste Tx Hash..."
                      />
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={counterparty}
                    onChange={e => setCounterparty(e.target.value)}
                    className="w-full bg-[#111827] border-2 border-[#1e2d3d] focus:border-blue-500 rounded-xl py-4 px-4 text-white text-lg font-mono transition-colors outline-none shadow-inner"
                    placeholder={
                      channel === 'Cardano Blockchain' ? 'addr1...' :
                        channel === 'Mobile Money' ? '2547XXXXXXXX' : 'Account number'
                    }
                  />
                )}
              </div>
            )}

            {/* CARDANO EXTRAS (Fees & Balances) */}
            {channel === 'Cardano Blockchain' && direction !== 'swap' && (
              <div className="space-y-3">
                <div className="bg-[#111827] border border-[#1e2d3d] rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Network Fee</p>
                    <p className="text-white font-mono text-sm">{estimatedFee !== null ? `${estimatedFee.toFixed(6)} ADA` : 'Calculating...'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Approx USD</p>
                    <p className="text-emerald-400 text-sm">{estimatedFeeUsd !== null ? `$${estimatedFeeUsd.toFixed(4)}` : '...'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-white transition-colors">
                    <input type="checkbox" className="rounded bg-[#1e2d3d] border-gray-600 text-emerald-500 focus:ring-emerald-500" checked={showWalletBalance} onChange={e => { setShowWalletBalance(e.target.checked); if (e.target.checked) fetchDepositAddress() }} />
                    Show Hot Wallet Balance
                  </label>
                  {showWalletBalance && walletBalances && (
                    <div className="text-xs text-gray-300 font-mono">
                      <span className="mr-3">ADA: {walletBalances.ada ?? '0.00'}</span>
                      <span>USDA: {walletBalances.usda ?? '0.00'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-center -my-2 relative z-20">
              <div className="bg-[#0b0f19] p-1 rounded-full">
                <div className="bg-[#1e2d3d] p-1.5 rounded-full">
                  <ArrowDown className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Receive Summary Box */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl px-5 py-4 flex justify-between items-center">
              <span className="text-emerald-400 font-semibold">You will receive</span>
              <span className="text-white text-xl font-mono font-bold">{receiveAmount > 0 ? receiveAmount.toFixed(2) : '0.00'} {to}</span>
            </div>

            <button
              onClick={handleExecute}
              disabled={submitting || !amount || parseFloat(amount) <= 0}
              className={`w-full py-4 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold text-lg rounded-xl transition-colors shadow-lg ${direction === 'swap' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-900/20'
                }`}
            >
              {submitting ? 'Processing...' : `Confirm ${direction === 'on' ? 'Deposit' : direction === 'swap' ? 'Swap' : 'Withdrawal'}`}
            </button>
          </div>
        </div>

        {/* RIGHT: UPGRADED HISTORY PANEL */}
        <div className="bg-[#0b0f19] border border-[#1e2d3d] rounded-3xl p-6 shadow-xl flex flex-col h-[750px]">
          <h2 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Transaction History
          </h2>

          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {history.map(r => {
              const isCompleted = r.status?.toLowerCase() === 'completed';
              const isFailed = r.status?.toLowerCase() === 'failed';
              const isProcessing = r.status?.toLowerCase() === 'processing' || (!isCompleted && !isFailed);

              return (
                <div key={r.id} className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-4 flex items-center justify-between hover:border-gray-600 transition-colors">
                  <div>
                    {/* TYPE & AMOUNT */}
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${r.type === 'On-Ramp' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                        }`}>
                        {r.type}
                      </span>
                      <span className="text-white font-bold text-sm font-mono">
                        {r.fromAmount} {r.fromAsset} <span className="text-gray-500 mx-1">→</span> {r.toAmount} {r.toAsset}
                      </span>
                    </div>

                    {/* EXACT DATE & TIME & CHANNEL */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                      <span>{r.date || 'Today'}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                      <span>{r.timeAgo || 'Just now'}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                      <span className="truncate max-w-[100px]">{r.channel}</span>
                    </div>
                  </div>

                  {/* STATUS PILL */}
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
                <p className="text-gray-400 text-sm font-medium">No transactions found.</p>
                <p className="text-gray-600 text-xs mt-1">Your swaps will appear here.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}