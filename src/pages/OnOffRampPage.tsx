import { useState, useEffect } from 'react'
import { ArrowDown, CheckCircle2, AlertCircle, Copy, RefreshCw, Smartphone, Hexagon, Wifi, ShieldCheck } from 'lucide-react'
import { verifyCardanoDeposit, getCardanoWallet, executeRamp } from '../api/client'

const CHANNELS = [
  { id: 'Mobile Money', name: 'Mobile Money (M-Pesa)', icon: Smartphone },
  { id: 'Cardano Blockchain', name: 'Cardano Native Wallet', icon: Hexagon },
  { id: 'Valora Wallet', name: 'Valora (Celo cUSD)', icon: Wifi }
]

export default function DepositPage() {
  const [channel, setChannel] = useState('Mobile Money')
  const [amount, setAmount] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [txHashInput, setTxHashInput] = useState('')

  const [cardanoAddress, setCardanoAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [toastError, setToastError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const activeAsset = channel === 'Cardano Blockchain' ? 'USDA' : channel === 'Valora Wallet' ? 'cUSD' : 'KES'

  useEffect(() => {
    if (channel === 'Cardano Blockchain') {
      setLoading(true)
      getCardanoWallet().then((res: any) => {
        setCardanoAddress(res?.data?.address || res?.address || 'addr_standby_placeholder')
      }).catch(() => setToastError('Failed to fetch deposit address.')).finally(() => setLoading(false))
    }
  }, [channel])

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    setToastError(''); setSuccessMsg(''); setLoading(true)
    const numAmt = parseFloat(amount)

    try {
      if (channel === 'Mobile Money') {
        if (!counterparty) throw new Error("M-Pesa Phone Number required.")
        await executeRamp({ direction: 'on', channel, from_asset: 'KES', to_asset: 'KES', amount: numAmt, rate: 1, fee: 0, counterparty })
        setSuccessMsg("STK Push initiated! Please check your phone to enter your M-Pesa PIN.")
      } else if (channel === 'Cardano Blockchain') {
        if (!txHashInput) throw new Error("Please paste your Cardano Transaction Hash.")
        await verifyCardanoDeposit({ amount: numAmt, tx_hash: txHashInput, counterparty: 'Cardano On Chain' })
        setSuccessMsg("Blockchain deposit verified successfully!")
      } else if (channel === 'Valora Wallet') {
        if (!txHashInput) throw new Error("Please paste your Celo Transaction Hash.")
        await verifyCardanoDeposit({ amount: numAmt, tx_hash: txHashInput, counterparty: 'Valora On Chain' })
        setSuccessMsg("cUSD deposit verified successfully!")
      }
      setAmount(''); setTxHashInput(''); setCounterparty('');
    } catch (err: any) {
      setToastError(err.message || err.response?.data?.detail || "Transaction failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="mesh-card p-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
          <ArrowDown className="w-5 h-5 text-emerald-400" /> Fund Your Wallet
        </h2>

        {toastError && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{toastError}</div>}
        {successMsg && <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{successMsg}</div>}

        <form onSubmit={handleDeposit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CHANNELS.map(c => (
              <button type="button" key={c.id} onClick={() => setChannel(c.id)} className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all ${channel === c.id ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-md' : 'bg-[#111827] border-[#1e2d3d] text-gray-400 hover:border-gray-600'}`}>
                <c.icon className={`w-6 h-6 ${channel === c.id ? 'text-emerald-400' : 'text-gray-500'}`} />
                <span className="text-sm font-semibold text-center">{c.name}</span>
              </button>
            ))}
          </div>

          <div className="bg-[#111827] border border-[#1e2d3d] rounded-xl p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Amount to Deposit</label>
              <div className="relative">
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="mesh-input text-xl font-mono py-4" required />
                <span className="absolute right-4 top-4 font-bold text-emerald-400">{activeAsset}</span>
              </div>
            </div>

            {channel === 'Mobile Money' ? (
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">M-Pesa Phone Number</label>
                <input type="text" value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="2547XXXXXXXX" className="mesh-input font-mono" required />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                  <p className="text-xs text-orange-400 font-bold mb-2 uppercase">1. Send {activeAsset} to Treasury</p>
                  <div className="flex gap-2">
                    <input readOnly value={channel === 'Cardano Blockchain' ? cardanoAddress : '0x6f7BeAb48EAfC47B89041899a35a0525a6A60F59'} className="mesh-input bg-[#0d1420] text-gray-300 font-mono text-xs" />
                    <button type="button" onClick={() => navigator.clipboard.writeText(channel === 'Cardano Blockchain' ? cardanoAddress : '0x6f7BeAb48EAfC47B89041899a35a0525a6A60F59')} className="px-4 bg-[#1e2d3d] rounded-xl hover:bg-gray-700 transition-colors"><Copy className="w-4 h-4 text-white" /></button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-blue-400 font-bold mb-2 uppercase">2. Verify Transaction Hash</p>
                  <input type="text" value={txHashInput} onChange={e => setTxHashInput(e.target.value)} placeholder="Paste TxHash from your wallet here..." className="mesh-input font-mono" required />
                </div>
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="mesh-btn-primary py-4 text-lg shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2">
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
            Confirm Secure Deposit
          </button>
        </form>
      </div>
    </div>
  )
}