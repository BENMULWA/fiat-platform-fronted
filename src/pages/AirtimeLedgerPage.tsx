// @ts-nocheck
import { useState, useEffect } from 'react'
import { Radio, Coins, ArrowRight, Lock, Unlock, AlertTriangle, CheckCircle2, Phone, AlertCircle, ChevronDown, Plus, Minus, Clock, Loader2 } from 'lucide-react'
import { mintAirt, redeemAirt, getAirtimeHistory } from '../api/client'

const NETWORKS = ['Telkom', 'Safaricom', 'Airtel', 'MTN', 'Orange', 'Vodacom']
const COUNTRIES = [
  { name: 'Kenya', code: 'KE', flag: '🇰🇪' },
  { name: 'Uganda', code: 'UG', flag: '🇺🇬' },
  { name: 'Tanzania', code: 'TZ', flag: '🇹🇿' },
  { name: 'Cameroon', code: 'CM', flag: '🇨🇲' },
  { name: 'United States', code: 'US', flag: '🇺🇸' },
]

export default function AirtimeLedgerPage() {
  const [activeTab, setActiveTab] = useState<'mint' | 'redeem'>('mint')
  const [amount, setAmount] = useState('')
  const [network, setNetwork] = useState('Airtel')
  const [country, setCountry] = useState('Kenya')
  const [note, setNote] = useState('')
  const [phone, setPhone] = useState('')

  const [isProcessing, setIsProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [isQueued, setIsQueued] = useState(false)
  const [queuedInfo, setQueuedInfo] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [history, setHistory] = useState<any[]>([])

  const [userBalances, setUserBalances] = useState({
    airtime: 15000,
    imp: 2500,
    locked: 2500
  })

  const numericAmount = parseFloat(amount) || 0
  const isMinting = activeTab === 'mint'
  const receiveAmount = numericAmount * 1.00

  const fetchHistory = async () => {
    try {
      const res = await getAirtimeHistory()
      if (res.data?.history) {
        setHistory(res.data.history)
      }
    } catch (err) {
      console.error("Failed to fetch airtime history", err)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleExecute = async () => {
    if (numericAmount <= 0) return
    if (!isMinting && !phone) {
      setErrorMsg('Please enter a destination phone number.')
      return
    }

    setIsProcessing(true)
    setErrorMsg('')
    setSuccess(false)
    setIsQueued(false)
    setQueuedInfo(null)

    try {
      if (isMinting) {
        await mintAirt({ amount: numericAmount, network, country, note })
        setUserBalances(prev => ({
          ...prev,
          airtime: prev.airtime - numericAmount,
          imp: prev.imp + receiveAmount,
          locked: prev.locked + numericAmount
        }))
        setSuccessMsg(`Successfully minted ${receiveAmount.toFixed(4)} IMP!`)

      } else {
        const res = await redeemAirt({
          amount: numericAmount,
          phone: phone,
          provider: network.toUpperCase()
        })

        // Only deduct balance if backend didn't throw an error
        setUserBalances(prev => ({
          ...prev,
          imp: prev.imp - numericAmount,
          locked: prev.locked - receiveAmount
        }))

        if (res.data?.status === 'queued') {
          setIsQueued(true)
          setQueuedInfo(res.data)
          setSuccessMsg(`${numericAmount} KES queued! ${res.data.pending_total}/2 accumulated.`)
        } else {
          setSuccessMsg(res.data?.message || `Successfully sent ${numericAmount} KES airtime!`)
        }
      }

      setSuccess(true)

    } catch (err: any) {
      console.error("FULL ERROR:", err)
      const serverError = err.response?.data?.detail || "Transaction failed. Please try again."
      setErrorMsg(serverError)
    } finally {
      // ALWAYS fetch history to show success OR the new "failed" log
      fetchHistory()
      setIsProcessing(false)
    }
  }

  const getHistoryDisplay = (item: any) => {
    const amt = parseFloat(item.amount || 0).toFixed(4)

    if (item.type === 'failed') {
      return `Failed · ${amt} AIRT`
    }
    if (item.type === 'mint') {
      return `Mint · ${amt} AIRT`
    }
    return `Redeem · ${amt} AIRT`
  }

  const getHistoryColor = (item: any) => {
    if (item.type === 'failed') {
      return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', value: 'text-red-400' }
    }
    if (item.type === 'mint') {
      return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', value: 'text-emerald-400' }
    }
    if (item.type === 'redeem') {
      return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', value: 'text-blue-400' }
    }
    return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400', value: 'text-gray-400' }
  }

  const getHistoryIcon = (item: any) => {
    if (item.type === 'failed') return <AlertTriangle className="w-4 h-4" />
    if (item.type === 'mint') return <Plus className="w-4 h-4" />
    if (item.type === 'redeem') return <Minus className="w-4 h-4" />
    return <ArrowRight className="w-4 h-4" />
  }

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 p-4 md:p-6 text-gray-200">

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <Radio className="w-6 h-6 text-emerald-400" />
          Airtime Tokenization
        </h1>
        <p className="text-slate-400 text-sm mt-1">Lock your telecommunications airtime to mint synthetic Impala Coin (IMP).</p>
      </div>

      {errorMsg && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-medium animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-red-400/60 hover:text-red-400">
            <Plus className="w-4 h-4 rotate-45" />
          </button>
        </div>
      )}

      {success && (
        <div className={`mb-6 px-4 py-3 border rounded-xl flex items-center gap-3 text-sm font-medium animate-in slide-in-from-top-2 ${isQueued ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
          {isQueued ? <Loader2 className="w-5 h-5 shrink-0 animate-spin" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <div className="flex-1">
            <p>{successMsg}</p>
            {isQueued && queuedInfo && (
              <div className="mt-2 flex items-center gap-4">
                <div className="flex-1 bg-blue-500/20 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-400 h-full rounded-full transition-all duration-500" style={{ width: `${(queuedInfo.pending_total / 2) * 100}%` }} />
                </div>
                <span className="text-xs font-mono">{queuedInfo.pending_total}/2 KES</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        <div className="lg:col-span-7 bg-[#0b0f19] border border-[#1e2d3d] rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />

          <div className="flex mb-8 rounded-xl overflow-hidden bg-[#111827] p-1 border border-[#1e2d3d] relative z-10 w-full max-w-sm">
            <button
              onClick={() => { setActiveTab('mint'); setAmount(''); setErrorMsg(''); setSuccess(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${isMinting ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              <Lock className="w-4 h-4" /> Mint IMP
            </button>
            <button
              onClick={() => { setActiveTab('redeem'); setAmount(''); setErrorMsg(''); setSuccess(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${!isMinting ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              <Unlock className="w-4 h-4" /> Redeem Airtime
            </button>
          </div>

          <div className="space-y-6 relative z-10">

            <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 transition-colors focus-within:border-emerald-500/50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                  {isMinting ? 'Airtime to Lock' : 'AIRT to Burn'}
                </span>
                <span className="text-xs text-emerald-400 font-mono font-medium bg-emerald-500/10 px-2 py-1 rounded-md">
                  Available: {isMinting ? userBalances.airtime.toLocaleString() : userBalances.imp.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-transparent text-4xl font-bold w-full outline-none text-white placeholder-gray-700"
                />
                <div className="flex items-center gap-2 bg-[#1e2d3d] px-4 py-2 rounded-xl shrink-0">
                  {isMinting ? <Radio className="w-5 h-5 text-emerald-400" /> : <Coins className="w-5 h-5 text-purple-400" />}
                  <span className="font-bold text-white">{isMinting ? 'IMP' : 'AIRT'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">Network</label>
                <div className="relative">
                  <select
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    className="w-full bg-[#111827] border border-[#1e2d3d] focus:border-emerald-500/50 rounded-xl py-3 pl-4 pr-10 text-white text-sm outline-none appearance-none cursor-pointer"
                  >
                    {NETWORKS.map(net => <option key={net} value={net}>{net}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">Country</label>
                <div className="relative">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-[#111827] border border-[#1e2d3d] focus:border-emerald-500/50 rounded-xl py-3 pl-4 pr-10 text-white text-sm outline-none appearance-none cursor-pointer"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {isMinting ? (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reserve source / reference"
                  className="w-full bg-[#111827] border border-[#1e2d3d] focus:border-emerald-500/50 rounded-xl py-3 px-4 text-white text-sm outline-none placeholder-gray-600 transition-colors"
                />
              </div>
            ) : (
              <div className="bg-[#111827] border border-[#1e2d3d] rounded-xl p-4 flex items-center gap-3 focus-within:border-blue-500/50 transition-colors animate-in fade-in slide-in-from-top-2">
                <Phone className="w-5 h-5 text-gray-500" />
                <div className="flex-1">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Destination Phone</span>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-transparent w-full outline-none text-sm text-gray-200 font-mono"
                    placeholder="e.g. 254712345678"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleExecute}
              disabled={isProcessing || success || numericAmount <= 0}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 mt-2
                ${success ? (isQueued ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-[#111827]') :
                  isProcessing ? 'bg-[#1e2d3d] text-emerald-400 cursor-wait' :
                    numericAmount > 0 ? (isMinting ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg') :
                      'bg-[#1e2d3d] text-gray-500 cursor-not-allowed'}
              `}
            >
              {success ? (isQueued ? <><Clock className="w-6 h-6" /> Queued</> : <><CheckCircle2 className="w-6 h-6" /> Success</>) :
                isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> :
                  (isMinting ? 'Lock & Mint' : 'Burn & Redeem')}
            </button>

          </div>
        </div>

        {/* RIGHT: LEDGER HISTORY & STATS */}
        <div className="lg:col-span-5 space-y-6">

          <div className="bg-[#0b0f19] border border-[#1e2d3d] rounded-3xl p-6 shadow-xl">
            <h3 className="text-white font-bold text-lg mb-6">Ledger history</h3>

            <div className="space-y-1">
              {history.map((item) => {
                const colors = getHistoryColor(item)
                const icon = getHistoryIcon(item)
                const usdVal = parseFloat(item.usd || 0)

                return (
                  <div key={item.id} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-white/[0.02] transition-colors border-b border-[#1e2d3d]/30 last:border-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 ${colors.bg} ${colors.border} ${colors.text}`}>
                        {icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-200 truncate">
                          {getHistoryDisplay(item)}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {item.network} · {item.country || 'KE'} · {item.time}
                          {item.error && <span className="text-red-500/80 block truncate">↳ {item.error}</span>}
                        </p>
                      </div>
                    </div>
                    <div className={`text-sm font-mono font-bold shrink-0 ml-3 ${colors.value}`}>
                      {usdVal > 0 ? '+' : ''}{usdVal.toFixed(2)} KES
                    </div>
                  </div>
                )
              })}

              {history.length === 0 && (
                <div className="text-center py-8">
                  <Radio className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No recent ledger activity.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#111827] border border-[#1e2d3d] rounded-3xl p-6 shadow-xl">
            <h3 className="text-white font-bold text-lg mb-6">Your CDP Position</h3>
            <div className="space-y-5">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Airtime Locked</p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-bold text-white font-mono">{userBalances.locked.toLocaleString()}</p>
                  <p className="text-emerald-400 text-sm font-medium mb-1">AIRT</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Debt (Minted)</p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-bold text-white font-mono">{userBalances.imp.toLocaleString()}</p>
                  <p className="text-purple-400 text-sm font-medium mb-1">IMP</p>
                </div>
              </div>
              <div className="pt-3 border-t border-[#1e2d3d]">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Collateral Ratio</p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold text-emerald-400 font-mono">
                    {userBalances.imp > 0 ? ((userBalances.locked / userBalances.imp) * 100).toFixed(0) : '∞'}%
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}