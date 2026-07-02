import { useState, useEffect, useMemo } from 'react'
import { ArrowDown, ArrowRightLeft, Clock, CheckCircle2, XCircle, AlertCircle, Wallet, Zap } from 'lucide-react'
import { executeRamp, getRampHistory } from '../api/client'

const ASSETS = ['USDA', 'KES', 'AIRT', 'IMP', 'USD', 'UGX', 'USDT']

interface SwapEntry {
  id: string
  fromAmount: number
  toAmount: number
  fromAsset: string
  toAsset: string
  timeAgo: string
  date?: string
  status: string
  direction: string
}

export default function TradePage() {
  const [from, setFrom] = useState('KES')
  const [to, setTo] = useState('USDA')
  const [amount, setAmount] = useState('')
  const [history, setHistory] = useState<SwapEntry[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [toastError, setToastError] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // 1. DYNAMIC RATE CALCULATOR
  // In Phase 2, this will read from the Redis Cache powered by the Admin Spread Engine!
  const rate = useMemo(() => {
    if (from === to) return 1;
    if (from === 'USDA' && to === 'KES') return 128.00; // We buy USDA at 128
    if (from === 'KES' && to === 'USDA') return 1 / 132.00; // We sell USDA at 132
    if (from === 'AIRT' && to === 'IMP') return 1.00; // Pegged 1:1
    if (from === 'IMP' && to === 'AIRT') return 1.00; // Pegged 1:1
    if (from === 'AIRT' && to === 'USDA') return 1 / 130.00; 
    if (from === 'USDA' && to === 'AIRT') return 130.00;
    if (from === 'XLM' && to === 'USD') return 0.098;
    if (from === 'USD' && to === 'XLM') return 1 / 0.102;
    return 1; // Fallback
  }, [from, to])

  const receiveAmount = (parseFloat(amount) || 0) * rate

  const loadHistory = async () => {
    try {
      const r: any = await getRampHistory()
      if (r.data?.entries) {
        // Filter to show ONLY internal swaps
        const swapsOnly = r.data.entries.filter((e: any) => e.direction === 'swap')
        setHistory(swapsOnly)
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

  const handleSwap = async () => {
    const numericAmount = parseFloat(amount)
    if (!amount || numericAmount <= 0) return

    setSubmitting(true)
    setToastError('')

    try {
      await executeRamp({
        direction: 'swap',
        channel: 'Internal Ledger',
        from_asset: from,
        to_asset: to,
        amount: numericAmount,
        rate,
        fee: 0,
        counterparty: 'Self' // Signifies to backend this is an internal atomic swap
      })
      
      setShowSuccessModal(true)
      setAmount('')
      loadHistory()
    } catch (error: any) {
      console.error(error)
      setToastError(error.response?.data?.detail || 'Swap failed. Please try again.')
    } finally {
      setSubmitting(false)
      setTimeout(() => setToastError(''), 5000)
    }
  }

  const handleFlip = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  }

  return (
    <div className="animate-in fade-in duration-300 relative p-4 md:p-6 text-gray-200 max-w-7xl mx-auto">
      
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Swap Successful!</h3>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">Your assets have been instantly exchanged and settled via the Treasury Hub.</p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-900/20"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Quick Swap</h1>
            <p className="text-gray-500 text-sm mt-1">Instantly exchange assets within your secure wallet with zero network fees.</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Zap className="w-4 h-4" /> Instant Settlement
        </div>
      </div>

      {toastError && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {toastError}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* LEFT: SWAP ENGINE */}
        <div className="bg-[#0b0f19] border border-[#1e2d3d] rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />

          <div className="space-y-4 relative z-10">
            
            {/* FROM ASSET */}
            <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 transition-colors focus-within:border-blue-500/50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">You Pay</span>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-transparent text-4xl font-bold w-full outline-none text-white placeholder-gray-700"
                />
                <select 
                  value={from} 
                  onChange={e => setFrom(e.target.value)} 
                  className="bg-[#1e2d3d] text-white font-bold px-4 py-2 rounded-xl outline-none cursor-pointer appearance-none text-center min-w-[100px]"
                >
                  {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* FLIP BUTTON */}
            <div className="flex justify-center -my-6 relative z-20">
              <button 
                onClick={handleFlip}
                className="bg-[#111827] border-4 border-[#0b0f19] p-2.5 rounded-full hover:bg-[#1e2d3d] transition-colors"
              >
                <ArrowDown className="w-5 h-5 text-blue-400" />
              </button>
            </div>

            {/* TO ASSET */}
            <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">You Receive</span>
                <span className="text-xs text-blue-400 font-mono">
                  Rate: {rate < 1 ? rate.toFixed(4) : rate.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="text"
                  readOnly
                  value={receiveAmount > 0 ? receiveAmount.toFixed(2) : '0.00'}
                  className="bg-transparent text-4xl font-bold w-full outline-none text-emerald-400"
                />
                <select 
                  value={to} 
                  onChange={e => setTo(e.target.value)} 
                  className="bg-[#1e2d3d] text-white font-bold px-4 py-2 rounded-xl outline-none cursor-pointer appearance-none text-center min-w-[100px]"
                >
                  {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* INFO PANEL */}
            <div className="bg-[#111827] border border-[#1e2d3d] rounded-xl p-4 flex items-center justify-between mt-2">
               <div className="flex items-center gap-2 text-gray-400">
                  <Wallet className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-medium">Internal Ledger Transfer</span>
               </div>
               <span className="text-xs text-emerald-400 font-mono font-bold tracking-wide">0 Network Fees</span>
            </div>

            <button 
              onClick={handleSwap}
              disabled={submitting || parseFloat(amount) <= 0 || !amount}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold text-lg rounded-xl transition-colors shadow-lg shadow-blue-900/20 mt-4"
            >
              {submitting ? 'Processing...' : 'Confirm Swap'}
            </button>
          </div>
        </div>

        {/* RIGHT: SWAP HISTORY */}
        <div className="bg-[#0b0f19] border border-[#1e2d3d] rounded-3xl p-6 shadow-xl flex flex-col h-[600px]">
          <h2 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Swap History
          </h2>

          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {history.map(r => (
              <div key={r.id} className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-gray-600 transition-colors">
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                      <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-white font-bold text-sm font-mono flex flex-wrap items-center gap-1">
                      {r.fromAmount} {r.fromAsset} <span className="text-gray-500">→</span> {r.toAmount.toFixed(2)} {r.toAsset}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium ml-10">
                    <span>{r.date || 'Today'}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                    <span>{r.timeAgo || 'Just now'}</span>
                  </div>
                </div>
                <div className="sm:text-right pl-10 sm:pl-0">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${r.status.toLowerCase() === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {r.status.toLowerCase() === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
            
            {history.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-[#1e2d3d] rounded-2xl flex flex-col items-center justify-center h-48">
                <ArrowRightLeft className="w-8 h-8 text-gray-600 mb-3" />
                <p className="text-gray-400 text-sm font-medium">No swaps yet.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}