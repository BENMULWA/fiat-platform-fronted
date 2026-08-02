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



////   LOGIN PAGE SAMPLE  ////


import { useState, FormEvent } from 'react'
import { ShieldCheck, Eye, EyeOff, ArrowRightLeft, Zap, Globe, TrendingUp, Lock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import mamlakaLogo from '../pages/assets/mamlaka-logo.png'
import bgImg from '../pages/public/mamlaka-bg.png'
import phoneImg from '../pages/assets/mamlaka-phone.png'

type Tab = 'signin' | 'create'

// statin the page 
function InputField({
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  children,
}: {
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  autoComplete: string
  children?: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all duration-200"
        style={{
          background: '#071120',
          border: focused ? '1px solid rgba(52,211,153,0.55)' : '1px solid rgba(255,255,255,0.1)',
          boxShadow: focused ? '0 0 0 3px rgba(52,211,153,0.1)' : 'none',
          paddingRight: children ? '2.75rem' : undefined,
        }}
      />
      {children && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{children}</div>
      )}
    </div>
  )
}

export default function LoginPage() {
  const { login, signup } = useAuth()
  const [tab, setTab] = useState<Tab>('signin')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const switchTab = (t: Tab) => { setTab(t); setError('') }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Email and password are required.'); return }
    if (tab === 'create' && !displayName) { setError('Display name is required.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setIsLoading(true)
    try {
      if (tab === 'signin') {
        await login(email, password)
      } else {
        await signup(displayName, email, password)
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Authentication failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row overflow-x-hidden bg-[#020816]"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >

      {/* ══════════════════════════════════════
          LEFT PANEL — Hero Section
      ══════════════════════════════════════ */}
      <div className="relative flex flex-col overflow-hidden w-full lg:w-[58%] shrink-0 min-h-[85dvh] lg:min-h-screen">

        {/* Background image fills entire left panel */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${bgImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
          }}
        />
        {/* Light overlay to keep text readable */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, rgba(2,8,22,0.30) 0%, rgba(4,14,36,0.22) 60%, rgba(2,8,22,0.45) 100%)' }}
        />

        {/* ── PHONE IMAGE — responsive positioning ── */}
        <div className="absolute pointer-events-none select-none top-[52%] lg:top-[46%] -translate-y-1/2 -left-[15%] sm:-left-[5%] lg:left-[6%] w-[60%] sm:w-[45%] lg:w-[40%] max-w-[360px] z-10">
          <img
            src={phoneImg}
            alt=""
            className="w-full h-auto object-contain"
            style={{ filter: 'drop-shadow(0 24px 56px rgba(16,185,129,0.28))' }}
          />
        </div>

        {/* Content layer */}
        <div className="relative z-20 flex flex-col py-4 h-full">

          {/* Navbar */}
          <header className="flex items-center gap-3 px-6 lg:px-10 py-4 lg:py-7">
            <div
              className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              <img src={mamlakaLogo} alt="Mamlaka" className="w-4 h-4 lg:w-5 lg:h-5 object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-xl lg:text-2xl tracking-wide">JASIRI CAPITAL</span>
            </div>
          </header>

          {/* Hero Content — Pushed right to sit alongside the phone */}
          <div className="flex-1 flex flex-col justify-center pb-12 lg:pb-16 pt-6 lg:pt-0 pl-[40%] sm:pl-[42%] lg:pl-[48%] pr-5 lg:pr-[5%]">

            {/* Badge */}
            <div
              className="inline-flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3.5 py-1.5 rounded-full text-[10px] lg:text-xs font-semibold self-start mb-4 lg:mb-6"
              style={{
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.3)',
                color: '#34d399',
              }}
            >
              <Zap className="w-3 h-3 lg:w-4 lg:h-4" />
              <span>B2B Arbitrage Platform</span>
            </div>

            {/* Responsive Heading */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold leading-[1.15] lg:leading-[1.1] tracking-tight text-white">
              Exchange Fiat<br />
              <span className="text-[26px] sm:text-[34px] lg:text-4xl xl:text-[44px]" style={{ color: '#34d399' }}>Currency Instantly</span>
            </h1>

            <p className="mt-3 lg:mt-4 text-sm sm:text-base lg:text-lg xl:text-[16px] leading-[1.6] lg:leading-[1.7]" style={{ color: 'rgba(255,255,255,0.62)' }}>
              <span className="font-semibold text-white/85 text-base sm:text-lg lg:text-xl">
                Easy On-Ramp &amp; Off-Ramp
              </span>{' '}
              for your payments — real-time arbitrage desk.
            </p>

            {/* Feature pills */}
            <div className="flex flex-col gap-2 lg:gap-3 mt-5 lg:mt-6 text-sm">
              {[
                { icon: <Globe className="w-3.5 h-3.5 lg:w-4 lg:h-4" />, label: 'US & Africa Coverage' },
                { icon: <TrendingUp className="w-3.5 h-3.5 lg:w-4 lg:h-4" />, label: 'Live Arbitrage Rates' },
                { icon: <Zap className="w-3.5 h-3.5 lg:w-4 lg:h-4" />, label: 'Airtime Tokens' },
              ].map(({ icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1 lg:py-1.5 rounded-full text-[10px] lg:text-xs font-medium self-start"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.72)',
                  }}
                >
                  {icon}{label}
                </span>
              ))}
            </div>

            {/* Payment badges */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 mt-6 lg:mt-7">
              <span
                className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-1 sm:mb-0"
                style={{ color: 'rgba(255,255,255,0.32)' }}
              >
                Accepted
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="h-8 lg:h-10 px-3 lg:px-5 bg-white rounded-md flex items-center shadow">
                  <span className="font-extrabold text-[#1a1f71] text-xs lg:text-[14px] tracking-tight italic">VISA</span>
                </div>
                <div
                  className="h-8 lg:h-10 px-3 lg:px-5 rounded-md flex items-center"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  <div className="w-[16px] h-[14px] lg:w-[20px] lg:h-[18px] rounded-full bg-[#eb001b]" />
                  <div className="w-[16px] h-[14px] lg:w-[20px] lg:h-[18px] rounded-full bg-[#f79e1b] -ml-2" />
                </div>
                <div
                  className="h-8 lg:h-10 px-3 lg:px-5 rounded-md flex items-center"
                  style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)' }}
                >
                  <span className="text-[#34d399] text-sm lg:text-[16px] font-bold">USDA</span>
                </div>
              </div>
            </div>

            {/* Get Started */}
            <div className="mt-8 lg:mt-9 mb-2 lg:mb-5">
              <button
                onClick={() => {
                  switchTab('create');
                  document.getElementById('auth-form')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="group inline-flex items-center gap-2 px-6 lg:px-8 py-3 lg:py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
                  boxShadow: '0 6px 28px rgba(16,185,129,0.38)',
                }}
              >
                <span>Get Started</span>
                <ArrowRightLeft className="w-3.5 h-3.5 lg:w-4 lg:h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
              <p className="text-[11px] lg:text-[14px] mt-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Powered by Meshex Arbitrage Desk
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          DIVIDER — clean thick solid border
      ══════════════════════════════════════ */}
      <div
        className="hidden lg:block shrink-0"
        style={{ width: '2px', background: '#000000', alignSelf: 'stretch' }}
      />

      {/* ══════════════════════════════════════
          RIGHT PANEL — Login Form
      ══════════════════════════════════════ */}
      <div
        id="auth-form"
        className="w-full lg:w-[42%] flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-14 lg:py-10 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #03111f 0%, #041828 40%, #051e30 70%, #030f1a 100%)',
          minWidth: 0,
        }}
      >
        {/* Decorative background glows */}
        <div className="absolute pointer-events-none -top-[10%] -right-[15%] w-[60%] h-[60%] blur-[50px]" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 65%)' }} />
        <div className="absolute pointer-events-none -bottom-[10%] -left-[10%] w-[55%] h-[55%] blur-[60px]" style={{ background: 'radial-gradient(circle, rgba(6,60,100,0.5) 0%, transparent 65%)' }} />
        <div className="absolute pointer-events-none top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[40%] blur-[40px]" style={{ background: 'radial-gradient(ellipse, rgba(13,148,136,0.07) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="w-full max-w-[390px] relative z-10">

          {/* Heading */}
          <div className="mb-6 ml-2 lg:ml-4 text-center lg:text-left">
            <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-white">
              {tab === 'signin' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="mt-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.38)' }}>
              {tab === 'signin' ? 'Sign in to your arbitrage desk' : 'Set up your workspace account'}
            </p>
          </div>

          {/* Glass card floating over the styled background */}
          <div
            className="rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: 'rgba(8,24,46,0.75)',
              border: '1px solid rgba(52,211,153,0.12)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(52,211,153,0.06) inset',
            }}
          >
            {/* Tab switcher */}
            <div
              className="flex p-1.5 gap-1"
              style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <button
                type="button"
                onClick={() => switchTab('signin')}
                className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-200"
                style={
                  tab === 'signin'
                    ? { background: 'rgba(255,255,255,0.08)', color: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }
                    : { color: 'rgba(255,255,255,0.35)' }
                }
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchTab('create')}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200"
                style={
                  tab === 'create'
                    ? { background: 'linear-gradient(135deg, #10b981, #0d9488)', color: '#ffffff', boxShadow: '0 2px 16px rgba(16,185,129,0.35)' }
                    : { color: 'rgba(255,255,255,0.35)' }
                }
              >
                <span>Create account</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-5 sm:px-6 pt-6 pb-5 space-y-4 sm:space-y-5">

              {tab === 'create' && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Display Name
                  </label>
                  <InputField type="text" value={displayName} onChange={setDisplayName} placeholder="Operator" autoComplete="name" />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Email
                </label>
                <InputField type="email" value={email} onChange={setEmail} placeholder="you@company.com" autoComplete="email" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Password
                  </label>
                  {tab === 'signin' && (
                    <button type="button" className="text-[11px] font-medium transition-opacity hover:opacity-75" style={{ color: '#34d399' }}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <InputField
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  autoComplete={tab === 'create' ? 'new-password' : 'current-password'}
                >
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="transition-opacity hover:opacity-70"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </InputField>
              </div>

              {error && (
                <div
                  className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
                >
                  <span className="mt-px shrink-0">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-55 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
                  boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
                }}
              >
                {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {tab === 'create' ? 'Create account' : 'Sign in to Meshex'}
              </button>
            </form>

            {/* Footer inside card */}
            <div className="px-5 sm:px-6 pb-5 sm:pb-6">
              {tab === 'create' ? (
                <div
                  className="flex items-center gap-2 rounded-xl px-4 py-3 text-[11px]"
                  style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)', color: 'rgba(94,200,182,0.85)' }}
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: '#0d9488' }} />
                  The first account becomes the workspace admin.
                </div>
              ) : (
                <p className="text-center text-[12px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  No account?{' '}
                  <button
                    type="button"
                    onClick={() => switchTab('create')}
                    className="font-semibold transition-opacity hover:opacity-80"
                    style={{ color: '#34d399' }}
                  >
                    Create one free
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Security strip */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.25)' }} />
              <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>256-bit TLS</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>JWT Auth</span>
            <div className="w-px h-3 bg-white/10" />
            <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>SOC 2 Ready</span>
          </div>
        </div>
      </div>

    </div>
  )
}