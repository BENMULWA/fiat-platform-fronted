// @ts-nocheck
import { useState, useEffect } from 'react'
import { Radio, Lock, Unlock, CheckCircle2, Phone, AlertCircle, ChevronDown, ArrowUpRight } from 'lucide-react'
import { mintAirt, redeemAirt, getAirtimeHistory, getAirtimeSummary } from '../api/client'

const NETWORKS = ['Airtel', 'Safaricom', 'Telkom']
const COUNTRIES = [{ name: 'Kenya', code: 'KE', flag: '🇰🇪' }]

export default function AirtimeLedgerPage() {
  const [activeTab, setActiveTab] = useState<'mint' | 'redeem'>('mint')
  const [amount, setAmount] = useState('')
  const [network, setNetwork] = useState('Airtel')
  const [country, setCountry] = useState('Kenya')
  const [phone, setPhone] = useState('')

  const [isProcessing, setIsProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [history, setHistory] = useState<any[]>([])
  const [liveBalance, setLiveBalance] = useState(0.0)

  const numericAmount = parseFloat(amount) || 0

  const fetchData = async () => {
    try {
      const [histRes, sumRes] = await Promise.allSettled([getAirtimeHistory(), getAirtimeSummary()]);
      if (histRes.status === 'fulfilled' && histRes.value.data?.history) setHistory(histRes.value.data.history);
      if (sumRes.status === 'fulfilled' && sumRes.value.data) setLiveBalance(sumRes.value.data.live_artm_balance || 0.0);
    } catch (err) {
      console.error("Failed to fetch airtime data", err)
    }
  }

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 10000); return () => clearInterval(t); }, [])

  const handleExecute = async () => {
    if (numericAmount <= 0) return
    if (activeTab === 'redeem' && !phone) { setErrorMsg('Please enter a destination phone number.'); return }

    setIsProcessing(true); setErrorMsg(''); setSuccess(false);

    try {
      if (activeTab === 'mint') {
        await mintAirt({ amount: numericAmount, network, country })
      } else {
        await redeemAirt({ amount: numericAmount, phone, provider: network.toUpperCase() })
      }
      setSuccess(true)
      await fetchData()
      setTimeout(() => { setSuccess(false); setAmount(''); setPhone(''); }, 4000)
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.message || "Transaction failed. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 p-4 md:p-6 text-gray-200">

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <Radio className="w-6 h-6 text-emerald-400" /> Airtime Tokenization
        </h1>
        <p className="text-slate-400 text-sm mt-1">Lock physical airtime to mint synthetic Impala Coin (IMP), or redeem directly from your live float.</p>
      </div>

      {errorMsg && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" /> {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT: ENGINE */}
        <div className="lg:col-span-7 bg-[#0b0f19] border border-[#1e2d3d] rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />

          <div className="flex mb-8 rounded-xl overflow-hidden bg-[#111827] p-1 border border-[#1e2d3d] relative z-10 w-full max-w-sm">
            <button onClick={() => setActiveTab('mint')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'mint' ? 'bg-[#1e2d3d] text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
              <Lock className="w-4 h-4" /> Mint IMP
            </button>
            <button onClick={() => setActiveTab('redeem')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'redeem' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
              <Unlock className="w-4 h-4" /> Redeem Airtime
            </button>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 focus-within:border-emerald-500/50 transition-colors">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{activeTab === 'mint' ? 'Amount to Mint' : 'Amount to Send'}</span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Live API Float: {liveBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="bg-transparent text-4xl font-bold w-full outline-none text-white placeholder-gray-700" />
                <div className="flex items-center gap-2 bg-[#1e2d3d] px-4 py-2.5 rounded-xl shrink-0">
                  <Radio className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-white">KES</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">Network</label>
                <div className="relative">
                  <select value={network} onChange={(e) => setNetwork(e.target.value)} className="w-full bg-[#111827] border border-[#1e2d3d] rounded-xl py-3.5 pl-4 pr-10 text-white text-sm outline-none appearance-none cursor-pointer">
                    {NETWORKS.map(net => <option key={net} value={net}>{net}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">Country</label>
                <div className="relative">
                  <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full bg-[#111827] border border-[#1e2d3d] rounded-xl py-3.5 pl-4 pr-10 text-white text-sm outline-none appearance-none cursor-pointer">
                    {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {activeTab === 'redeem' && (
              <div className="bg-[#111827] border border-[#1e2d3d] rounded-xl p-4 flex items-center gap-3 focus-within:border-blue-500/50 transition-colors animate-in fade-in slide-in-from-top-2">
                <Phone className="w-5 h-5 text-gray-500" />
                <div className="flex-1">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Destination Phone</span>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-transparent w-full outline-none text-sm text-gray-200 font-mono" placeholder="2547XXXXXXXX" />
                </div>
              </div>
            )}

            <button onClick={handleExecute} disabled={isProcessing || success || numericAmount <= 0} className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 mt-4 ${success ? 'bg-emerald-500 text-[#111827]' : isProcessing ? 'bg-blue-600/50 text-blue-200 cursor-wait' : numericAmount > 0 ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg' : 'bg-[#1e2d3d] text-gray-500 cursor-not-allowed'}`}>
              {success ? <><CheckCircle2 className="w-6 h-6" /> Success</> : isProcessing ? 'Processing...' : activeTab === 'mint' ? 'Mint IMP Token' : 'Withdraw Airtime'}
            </button>
          </div>
        </div>

        {/* RIGHT: HISTORY */}
        <div className="lg:col-span-5 bg-[#0b0f19] border border-[#1e2d3d] rounded-3xl p-6 shadow-xl h-fit min-h-[500px]">
          <h3 className="text-white font-bold text-lg mb-6">Withdrawal history</h3>
          <div className="space-y-4">
            {history.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between py-3 border-b border-[#1e2d3d]/50 last:border-0 hover:border-[#1e2d3d] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center border bg-blue-500/10 border-blue-500/20 text-blue-400 shrink-0">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-200 font-mono">{item.amount.toFixed(2)} KES</p>
                    <p className="text-xs text-gray-500">{item.network} · {item.time}</p>
                  </div>
                </div>
              </div>
            ))}
            {history.length === 0 && <p className="text-sm text-slate-500 text-center py-10">No recent activity.</p>}
          </div>
        </div>

      </div>
    </div>
  )
}