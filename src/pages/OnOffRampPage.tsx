// @ts-nocheck
import { useState, useEffect } from 'react'
import {
  ArrowDown, ArrowRightLeft, Clock, CheckCircle2, XCircle,
  AlertCircle, Copy, RefreshCw, Smartphone, Building2, CreditCard, Lock, Hexagon, Wifi
} from 'lucide-react'
import {
  executeRamp,
  getRampHistory,
  withdrawUsda,
  verifyCardanoDeposit,
  getCardanoWallet,
  getCardanoTxHistory,
  estimateCardanoFee,
  executeValoraWithdraw
} from '../api/client'

// Custom Dropdown Data with Icons
const CHANNELS = [
  { id: 'Mobile Money', name: 'Mobile Money', icon: Smartphone, active: true },
  { id: 'Cardano Blockchain', name: 'Cardano Blockchain', icon: Hexagon, active: true },
  { id: 'Valora Wallet', name: 'Valora Wallet (Celo)', icon: Wifi, active: true },
  { id: 'Bank Transfer', name: 'Bank Transfer', icon: Building2, active: false },
  { id: 'Card', name: 'Card', icon: CreditCard, active: false }
]

interface RampEntry {
  id: string;
  direction: string;
  channel: string;
  fromAsset: string;
  toAsset: string;
  fromAmount: number;
  toAmount: number;
  status: string;
  date?: string;
  timeAgo?: string;
}

export default function OnOffRampPage() {
  const [direction, setDirection] = useState<'on' | 'off'>('on')
  const [channel, setChannel] = useState('Mobile Money')
  const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false)

  const [amount, setAmount] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [history, setHistory] = useState<RampEntry[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [toastError, setToastError] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const [cardanoAddress, setCardanoAddress] = useState('')
  const [cardanoLoading, setCardanoLoading] = useState(false)
  const [txHashInput, setTxHashInput] = useState('')

  // 🟢 DYNAMIC 1:1 ASSET LOGIC
  const activeAsset = channel === 'Cardano Blockchain' ? 'USDA' :
    channel === 'Valora Wallet' ? 'cUSD' :
      'KES';
  const fromAsset = activeAsset;
  const toAsset = activeAsset;
  const rate = 1;
  const receiveAmount = parseFloat(amount) || 0;

  const loadHistory = async () => {
    try {
      const r: any = await getRampHistory()
      if (r.data?.entries) {
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
    if (channel === 'Cardano Blockchain' && direction === 'on') fetchDepositAddress()
  }, [channel, direction])

  const fetchDepositAddress = async () => {
    setCardanoLoading(true)
    setToastError('') // Clear any existing errors first
    setCardanoAddress('') // Clear the input field while loading

    try {
      // 🚀 REAL BACKEND FETCH: No more dummy data
      const res: any = await getCardanoWallet()

      // Axios puts the response in res.data, and our backend nests it in another 'data' object
      const payload = res?.data?.data || res?.data || res

      if (payload?.address) {
        setCardanoAddress(payload.address)
      } else if (payload?.address_str) {
        setCardanoAddress(payload.address_str)
      } else {
        setToastError('Backend connected, but no address was returned.')
      }
    } catch (err: any) {
      console.error('Real backend fetch failed:', err)
      // Display the actual error so you can troubleshoot the backend
      setToastError(err.response?.data?.detail || 'Failed to fetch real deposit address. Is the Cardano backend route running?')
    } finally {
      setCardanoLoading(false)
    }
  }

  const handleExecute = async () => {
    const numericAmount = parseFloat(amount)

    if (!amount || numericAmount <= 0) return

    if (!(channel === 'Cardano Blockchain' && direction === 'on') && !counterparty) {
      setToastError('Please enter your destination details.')
      setTimeout(() => setToastError(''), 4000)
      return
    }

    setSubmitting(true)
    setToastError('')

    try {
      // 🚀 VALORA LOGIC
      if (channel === 'Valora Wallet') {
        if (direction === 'off') {
          await executeValoraWithdraw({
            amount: numericAmount,
            identifier: counterparty
          })
          setSuccessMessage(`cUSD is broadcasting to the Celo network! Check your Valora app.`)
        } else {
          setSuccessMessage(`Please send ${numericAmount} cUSD from your Valora app to the platform's Celo Treasury address.`)
        }
      }
      // CARDANO LOGIC
      else if (channel === 'Cardano Blockchain') {
        if (direction === 'off') {
          const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
          await withdrawUsda({ amount: numericAmount, to_address: counterparty, asset: 'USDA', idempotency_key: idempotencyKey, counterparty: 'Cardano off-ramp' })
          setSuccessMessage(`Cardano block submission successful!`)
        } else {
          if (!txHashInput) { setToastError('No TX Hash provided.'); setSubmitting(false); return }
          await verifyCardanoDeposit({ amount: numericAmount, tx_hash: txHashInput, counterparty: 'Cardano On Chain' })
          setSuccessMessage('Cardano deposit verified successfully!')
        }
      }
      // MOBILE MONEY LOGIC
      else {
        await executeRamp({ direction, channel, from_asset: fromAsset, to_asset: toAsset, amount: numericAmount, rate: rate, fee: 0, counterparty })
        setSuccessMessage(direction === 'on' ? 'STK Push sent! Check your phone.' : 'Payout dispatched to M-Pesa.')
      }

      setShowSuccessModal(true)
      setAmount('')
      if (channel !== 'Cardano Blockchain') setCounterparty('')
      setTxHashInput('')
      loadHistory()
    } catch (error: any) {
      setToastError(error.response?.data?.detail || 'Transaction failed.')
    } finally {
      setSubmitting(false)
      setTimeout(() => setToastError(''), 5000)
    }
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-300 relative p-4 md:p-6 text-gray-200">
      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Success!</h3>
            <p className="text-gray-400 text-sm mb-8">{successMessage}</p>
            <button onClick={() => setShowSuccessModal(false)} className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg">Done</button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Deposit & Withdraw</h1>
        <p className="text-gray-500 text-sm mt-1">Move real-world funds in and out of your secure wallet.</p>
      </div>

      {toastError && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" /> {toastError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* LEFT: THE FORM */}
        <div className="bg-[#0b0f19] border border-[#1e2d3d] rounded-3xl p-6 shadow-xl relative overflow-hidden h-fit">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />

          {/* Direction Tabs */}
          <div className="flex mb-6 rounded-xl overflow-hidden bg-[#111827] p-1 border border-[#1e2d3d] relative z-10">
            <button onClick={() => { setDirection('on'); setAmount(''); }} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${direction === 'on' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>Deposit (On-Ramp)</button>
            <button onClick={() => { setDirection('off'); setAmount(''); }} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${direction === 'off' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>Withdraw (Off-Ramp)</button>
          </div>

          <div className="space-y-6 relative z-10">

            {/* CHANNEL DROPDOWN */}
            <div className="relative">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Payment Channel</label>
              <button
                type="button"
                onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
                className="w-full bg-[#111827] border-2 border-[#1e2d3d] hover:border-gray-600 focus:border-emerald-500 rounded-xl py-4 pl-4 pr-4 text-white font-medium outline-none transition-all flex items-center justify-between shadow-inner"
              >
                <div className="flex items-center gap-3">
                  {(() => {
                    const activeChannel = CHANNELS.find(c => c.id === channel) || CHANNELS[0];
                    const ActiveIcon = activeChannel.icon;
                    return (
                      <>
                        <div className="p-1.5 rounded-lg bg-[#1e2d3d]">
                          <ActiveIcon className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="text-sm font-bold">{activeChannel.name}</span>
                      </>
                    );
                  })()}
                </div>
                <ArrowDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isChannelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isChannelDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsChannelDropdownOpen(false)} />
                  <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#111827] border border-[#1e2d3d] rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    {CHANNELS.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        disabled={!c.active}
                        onClick={() => { setChannel(c.id); setIsChannelDropdownOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors border-b border-[#1e2d3d]/50 last:border-0 ${c.active ? 'hover:bg-[#1a2638] text-white cursor-pointer' : 'text-slate-500 bg-[#0b0f19]/80 cursor-not-allowed'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${c.active ? 'bg-[#1e2d3d]' : 'bg-[#111827]'}`}>
                            <c.icon className={`w-4 h-4 ${c.active ? 'text-blue-400' : 'text-slate-600'}`} />
                          </div>
                          <span className="font-medium text-sm">{c.name}</span>
                        </div>
                        {!c.active && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#1e2d3d] text-slate-400 text-[9px] font-bold uppercase tracking-wider shadow-inner">
                            <Lock className="w-3 h-3" /> Soon
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* DYNAMIC COUNTERPARTY INPUTS */}
            <div>
              <label className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 block">
                {channel === 'Cardano Blockchain'
                  ? (direction === 'on' ? 'Deposit Details' : 'Destination Cardano Address')
                  : channel === 'Valora Wallet'
                    ? 'Valora Phone or Wallet Address'
                    : channel === 'Mobile Money'
                      ? 'Your M-Pesa Phone Number'
                      : 'Account Details'}
              </label>

              {channel === 'Cardano Blockchain' && direction === 'on' ? (
                <div className="space-y-3 p-4 bg-[#111827] border border-[#1e2d3d] rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400">Send USDA to this address:</span>
                    <button onClick={fetchDepositAddress} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                      <RefreshCw className={`w-3 h-3 ${cardanoLoading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input value={cardanoAddress} readOnly className="flex-1 bg-[#0d1420] border border-[#1e2d3d] rounded-lg py-2.5 px-3 text-gray-300 text-xs font-mono outline-none" />
                    <button onClick={() => { navigator.clipboard.writeText(cardanoAddress); setToastError('Address copied!'); setTimeout(() => setToastError(''), 2000); }} className="bg-[#1e2d3d] hover:bg-gray-700 px-3 rounded-lg flex items-center justify-center transition-colors">
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
              ) : channel === 'Valora Wallet' && direction === 'on' ? (
                // 🟢 VALORA DEPOSIT UI (NEW)
                <div className="space-y-3 p-4 bg-[#111827] border border-blue-500/20 rounded-xl">
                  <span className="text-xs text-blue-400 font-bold uppercase tracking-wider block mb-3">
                    Step 1: Send cUSD/USDC to Treasury
                  </span>

                  {/* Treasury Address Box */}
                  <div className="flex gap-2 mb-3">
                    <input
                      id="valora-treasury-address"
                      value="0x6f7BeAb48EAfC47B89041899a35a0525a6A60F59"
                      readOnly
                      className="flex-1 bg-[#0d1420] border border-[#1e2d3d] rounded-lg py-2.5 px-3 text-blue-300 text-xs font-mono outline-none"
                    />
                    <button
                      onClick={() => {
                        const addr = document.getElementById('valora-treasury-address').value;
                        navigator.clipboard.writeText(addr);
                        setToastError('Treasury address copied!');
                        setTimeout(() => setToastError(''), 2000);
                      }}
                      className="bg-blue-500/20 hover:bg-blue-500/30 px-3 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Copy className="w-4 h-4 text-blue-400" />
                    </button>
                  </div>

                  {/* Memo/Reference Box */}
                  <span className="text-xs text-yellow-400 font-bold uppercase tracking-wider block mb-2">
                    Step 2: Add this EXACT text to Valora Memo/Reference Field
                  </span>

                  <div className="flex gap-2">
                    <input
                      id="valora-memo"
                      value={`MESH-USER_ID-${Math.random().toString(36).slice(2, 10).toUpperCase()}`}
                      readOnly
                      className="flex-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg py-2.5 px-3 text-yellow-300 text-sm font-mono outline-none"
                    />
                    <button
                      onClick={() => {
                        const memo = document.getElementById('valora-memo').value;
                        navigator.clipboard.writeText(memo);
                        setToastError('Memo copied! Do not send without this.');
                        setTimeout(() => setToastError(''), 3000);
                      }}
                      className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 px-3 rounded-lg flex items-center justify-center"
                    >
                      <Copy className="w-4 h-4 text-yellow-400" />
                    </button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#1e2d3d]">
                    <span className="text-[10px] text-gray-500 block">* System will automatically detect your deposit once confirmed on Celo. Do NOT send funds without the memo or they will be stuck.</span>
                  </div>
                </div>
              ) : (
                // STANDARD INPUT (Cardano Withdrawal & Mobile Money)
                <input type="text"
                  value={counterparty}
                  onChange={e => setCounterparty(e.target.value)}
                  className="w-full bg-[#111827] border-2 border-[#1e2d3d] focus:border-blue-500 rounded-xl py-4 px-4 text-white text-lg font-mono transition-colors outline-none shadow-inner"
                  placeholder={
                    channel === 'Valora Wallet'
                      ? '0x... or Registered Phone Number'
                      : channel === 'Cardano Blockchain' ? 'addr1...'
                        : '2547XXXXXXXX'
                  }
                />
              )}
            </div>

            {/* AMOUNT INPUT */}
            <div>
              <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 block">
                Amount to {direction === 'on' ? 'Deposit' : 'Withdraw'} ({activeAsset})
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-[#111827] border-2 border-[#1e2d3d] focus:border-emerald-500 rounded-xl py-4 pl-4 pr-20 text-white text-xl font-mono transition-colors outline-none shadow-inner"
                  placeholder="0.00"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">{activeAsset}</span>
              </div>
            </div>

            <div className="flex justify-center -my-2 relative z-20">
              <div className="bg-[#0b0f19] p-1 rounded-full">
                <div className="bg-[#1e2d3d] p-1.5 rounded-full">
                  <ArrowDown className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* RECEIVE SUMMARY */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl px-5 py-4 flex justify-between items-center">
              <span className="text-emerald-400 font-semibold">You will receive</span>
              <span className="text-white text-xl font-mono font-bold">{receiveAmount > 0 ? receiveAmount.toFixed(2) : '0.00'} {toAsset}</span>
            </div>

            <button
              onClick={handleExecute}
              disabled={submitting || !amount || parseFloat(amount) <= 0}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold text-lg rounded-xl transition-colors shadow-lg shadow-emerald-900/20"
            >
              {submitting ? 'Processing...' : `Confirm ${direction === 'on' ? 'Deposit' : 'Withdrawal'}`}
            </button>

          </div>
        </div>

        {/* RIGHT: HISTORY PANEL */}
        <div className="bg-[#0b0f19] border border-[#1e2d3d] rounded-3xl p-6 shadow-xl flex flex-col h-[700px]">
          <h2 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" /> Transfer History
          </h2>

          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {history.map((r: any) => {
              const isProcessing = r.status?.toLowerCase() === 'processing' || (!r.status?.toLowerCase().includes('completed') && !r.status?.toLowerCase().includes('failed'));
              return (
                <div key={r.id} className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-4 flex items-center justify-between hover:border-gray-600 transition-colors">
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${r.direction === 'on' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                        {r.direction === 'on' ? 'Deposit' : 'Withdrawal'}
                      </span>
                      <span className="text-white font-bold text-sm font-mono">
                        {r.fromAmount} {r.fromAsset} <span className="text-gray-500 mx-1">→</span> {r.toAmount.toFixed(2)} {r.toAsset}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                      <span>{r.date || 'Today'} · {r.timeAgo || 'Just now'}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-600" />
                      <span className="truncate max-w-[120px] text-gray-400">{r.channel}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border ${isProcessing ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse' : r.status?.toLowerCase() === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                      {isProcessing ? <Clock className="w-3 h-3" /> : r.status?.toLowerCase() === 'failed' ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                      {isProcessing ? 'PROCESSING' : r.status}
                    </span>
                  </div>
                </div>
              )
            })}
            {history.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-[#1e2d3d] rounded-2xl flex flex-col items-center justify-center h-48">
                <ArrowRightLeft className="w-8 h-8 text-gray-600 mb-3" />
                <p className="text-gray-400 text-sm font-medium">No transactions found.</p>
                <p className="text-gray-600 text-xs mt-1">Your deposits and withdrawals will appear here.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}